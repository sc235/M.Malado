const express = require('express');
const router = express.Router();

const { query } = require('../../db/pool');
const { validate, slugify } = require('../../lib/validate');
const { asyncRoute, notFound, badRequest, conflict } = require('../../lib/errors');
const { normalize } = require('../../lib/promo');

/* ======================================================== TABLEAU DE BORD */
router.get('/stats', asyncRoute(async (_req, res) => {
  const [totals, today, month, byStatus, topProducts, lowStock, daily] = await Promise.all([
    query(`SELECT COUNT(*)::INT AS orders,
                  COALESCE(SUM(total) FILTER (WHERE payment_status = 'paye'), 0)::INT AS revenue,
                  COALESCE(SUM(total) FILTER (WHERE status <> 'annulee'), 0)::INT AS pipeline
           FROM orders`),
    query(`SELECT COUNT(*)::INT AS orders, COALESCE(SUM(total), 0)::INT AS revenue
           FROM orders WHERE created_at::date = CURRENT_DATE AND status <> 'annulee'`),
    query(`SELECT COUNT(*)::INT AS orders, COALESCE(SUM(total), 0)::INT AS revenue
           FROM orders WHERE created_at >= date_trunc('month', CURRENT_DATE) AND status <> 'annulee'`),
    query(`SELECT status, COUNT(*)::INT AS n FROM orders GROUP BY status`),
    query(`SELECT i.product_id, i.name,
                  SUM(i.quantity)::INT AS units,
                  SUM(i.quantity * i.unit_price)::INT AS revenue
           FROM order_items i
           JOIN orders o ON o.id = i.order_id
           WHERE o.status <> 'annulee'
           GROUP BY i.product_id, i.name
           ORDER BY units DESC LIMIT 8`),
    query(`SELECT p.id, p.name, v.id AS variant_id, v.size, v.color, v.stock
           FROM product_variants v
           JOIN products p ON p.id = v.product_id
           WHERE v.is_active AND p.is_active AND v.stock <= 3
           ORDER BY v.stock, p.name LIMIT 15`),
    query(`SELECT d::date AS day,
                  COALESCE(SUM(o.total) FILTER (WHERE o.status <> 'annulee'), 0)::INT AS revenue,
                  COUNT(o.id) FILTER (WHERE o.status <> 'annulee')::INT AS orders
           FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day') d
           LEFT JOIN orders o ON o.created_at::date = d::date
           GROUP BY d ORDER BY d`),
  ]);

  const counts = await query(`
    SELECT (SELECT COUNT(*) FROM products WHERE is_active)::INT AS products,
           (SELECT COUNT(*) FROM customers)::INT AS customers,
           (SELECT COUNT(*) FROM reviews WHERE NOT is_published)::INT AS pending_reviews,
           (SELECT COUNT(*) FROM newsletter)::INT AS newsletter
  `);

  res.json({
    totals: totals.rows[0],
    today: today.rows[0],
    month: month.rows[0],
    counts: counts.rows[0],
    byStatus: Object.fromEntries(byStatus.rows.map((r) => [r.status, r.n])),
    topProducts: topProducts.rows,
    lowStock: lowStock.rows,
    daily: daily.rows,
  });
}));

/* ============================================================== CATÉGORIES */
router.get('/categories', asyncRoute(async (_req, res) => {
  const { rows } = await query(`
    SELECT c.*, COUNT(p.id)::INT AS product_count
    FROM categories c LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id ORDER BY c.position, c.name
  `);
  res.json(rows);
}));

router.post('/categories', asyncRoute(async (req, res) => {
  const data = validate(req.body, {
    name:        { type: 'string', required: true, min: 2, max: 60 },
    description: { type: 'string', max: 400 },
    image:       { type: 'string', max: 400 },
    position:    { type: 'int', min: 0, default: 0 },
  });

  const { rows } = await query(
    `INSERT INTO categories (name, slug, description, image, position)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [data.name, slugify(data.name), data.description || null, data.image || null, data.position]
  );
  res.status(201).json(rows[0]);
}));

router.delete('/categories/:id', asyncRoute(async (req, res) => {
  await query('DELETE FROM categories WHERE id = $1', [req.params.id]);
  res.json({ message: 'Catégorie supprimée. Les produits concernés sont désormais sans catégorie.' });
}));

/* ================================================================ CLIENTES */
router.get('/customers', asyncRoute(async (req, res) => {
  const q = validate(req.query, { q: { type: 'string', max: 60 }, limite: { type: 'int', min: 1, max: 200, default: 100 } });

  const params = [];
  let where = 'TRUE';
  if (q.q) { params.push(`%${q.q}%`); where = `(c.full_name ILIKE $1 OR c.email ILIKE $1 OR c.phone ILIKE $1)`; }
  params.push(q.limite);

  const { rows } = await query(
    `SELECT c.id, c.full_name, c.email, c.phone, c.created_at,
            COUNT(o.id)::INT AS orders,
            COALESCE(SUM(o.total) FILTER (WHERE o.status <> 'annulee'), 0)::INT AS spent,
            MAX(o.created_at) AS last_order
     FROM customers c
     LEFT JOIN orders o ON o.customer_id = c.id
     WHERE ${where}
     GROUP BY c.id
     ORDER BY spent DESC, c.created_at DESC
     LIMIT $${params.length}`,
    params
  );
  res.json(rows);
}));

/* ==================================================== MODÉRATION DES AVIS */
router.get('/reviews', asyncRoute(async (req, res) => {
  const q = validate(req.query, { statut: { type: 'enum', values: ['tous', 'attente', 'publies'], default: 'attente' } });

  const filter = q.statut === 'attente' ? 'WHERE NOT r.is_published'
    : q.statut === 'publies' ? 'WHERE r.is_published' : '';

  const { rows } = await query(`
    SELECT r.*, p.name AS product_name
    FROM reviews r LEFT JOIN products p ON p.id = r.product_id
    ${filter}
    ORDER BY r.created_at DESC LIMIT 100
  `);
  res.json(rows);
}));

router.patch('/reviews/:id', asyncRoute(async (req, res) => {
  const data = validate(req.body, { isPublished: { type: 'bool', required: true } });
  const { rows } = await query(
    'UPDATE reviews SET is_published = $1 WHERE id = $2 RETURNING *',
    [data.isPublished, req.params.id]
  );
  if (!rows[0]) throw notFound('Avis introuvable.');

  /* La note du produit est recalculée à partir des seuls avis publiés. */
  if (rows[0].product_id) {
    await query(`
      UPDATE products SET rating = COALESCE((
        SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews
        WHERE product_id = $1 AND is_published
      ), 4.5) WHERE id = $1
    `, [rows[0].product_id]);
  }

  res.json(rows[0]);
}));

router.delete('/reviews/:id', asyncRoute(async (req, res) => {
  await query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
  res.json({ message: 'Avis supprimé.' });
}));

/* ============================================================= CODES PROMO */
router.get('/promos', asyncRoute(async (_req, res) => {
  const { rows } = await query(`
    SELECT pc.*,
           (SELECT COUNT(*) FROM orders o WHERE o.promo_code = pc.code)::INT AS orders,
           (SELECT COALESCE(SUM(o.discount), 0) FROM orders o WHERE o.promo_code = pc.code)::INT AS given
    FROM promo_codes pc
    ORDER BY pc.is_active DESC, pc.created_at DESC
  `);
  res.json(rows);
}));

router.post('/promos', asyncRoute(async (req, res) => {
  const data = validate(req.body, {
    code:        { type: 'string', required: true, min: 3, max: 40 },
    kind:        { type: 'enum', values: ['percent', 'amount', 'shipping'], default: 'percent' },
    value:       { type: 'int', min: 0, default: 0 },
    minSubtotal: { type: 'int', min: 0, default: 0 },
    maxUses:     { type: 'int', min: 1 },
    endsAt:      { type: 'string', max: 40 },
  });

  /* Une remise de 150 % rendrait de l'argent à la cliente. */
  if (data.kind === 'percent' && (data.value < 1 || data.value > 90)) {
    throw badRequest('Un pourcentage de remise doit être compris entre 1 et 90.');
  }
  if (data.kind === 'amount' && data.value < 1) {
    throw badRequest('Indiquez le montant de la remise en FCFA.');
  }

  const code = normalize(data.code);
  const exists = await query('SELECT 1 FROM promo_codes WHERE code = $1', [code]);
  if (exists.rowCount) throw conflict('Ce code existe déjà.');

  const { rows } = await query(
    `INSERT INTO promo_codes (code, kind, value, min_subtotal, max_uses, ends_at)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [code, data.kind, data.kind === 'shipping' ? 0 : data.value,
     data.minSubtotal, data.maxUses ?? null, data.endsAt || null]
  );
  res.status(201).json(rows[0]);
}));

router.patch('/promos/:id', asyncRoute(async (req, res) => {
  const data = validate(req.body, { isActive: { type: 'bool', required: true } });
  const { rows } = await query(
    'UPDATE promo_codes SET is_active = $1 WHERE id = $2 RETURNING *',
    [data.isActive, req.params.id]
  );
  if (!rows[0]) throw notFound('Code promo introuvable.');
  res.json(rows[0]);
}));

router.delete('/promos/:id', asyncRoute(async (req, res) => {
  /* Un code déjà utilisé est désactivé plutôt que supprimé : les commandes
     passées gardent la trace du code appliqué. */
  const used = await query('SELECT 1 FROM orders WHERE promo_code = (SELECT code FROM promo_codes WHERE id = $1)', [req.params.id]);
  if (used.rowCount) {
    await query('UPDATE promo_codes SET is_active = FALSE WHERE id = $1', [req.params.id]);
    return res.json({ message: 'Ce code a déjà servi : il a été désactivé plutôt que supprimé.' });
  }
  await query('DELETE FROM promo_codes WHERE id = $1', [req.params.id]);
  res.json({ message: 'Code promo supprimé.' });
}));

module.exports = router;
