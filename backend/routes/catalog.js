const express = require('express');
const router = express.Router();
const { query } = require('../db/pool');
const { asyncRoute, notFound } = require('../lib/errors');
const { validate } = require('../lib/validate');

/* Ordre d'affichage des tailles : XS → XXL, puis pointures et contenances
   triées numériquement, le reste en fin de liste. */
const SIZE_ORDER = `
  CASE upper(size)
    WHEN 'XS' THEN 1 WHEN 'S' THEN 2 WHEN 'M' THEN 3
    WHEN 'L' THEN 4 WHEN 'XL' THEN 5 WHEN 'XXL' THEN 6
    ELSE 10 + COALESCE(NULLIF(regexp_replace(size, '[^0-9]', '', 'g'), '')::INT, 999)
  END`;

/* Sélection commune : produit + catégorie + image principale + stock agrégé. */
const PRODUCT_SELECT = `
  SELECT p.id, p.name, p.slug, p.description, p.base_price, p.compare_at,
         p.rating, p.is_featured, p.created_at,
         c.name AS category, c.slug AS category_slug,
         COALESCE(s.total_stock, 0) AS stock,
         (SELECT url FROM product_images i WHERE i.product_id = p.id
           ORDER BY i.position, i.id LIMIT 1) AS image
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN product_stock s ON s.product_id = p.id
`;

/* ------------------------------------------------------------------ GET /categories */
router.get('/categories', asyncRoute(async (_req, res) => {
  const { rows } = await query(`
    SELECT c.id, c.name, c.slug, c.description, c.image,
           COUNT(p.id) FILTER (WHERE p.is_active)::INT AS product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    WHERE c.is_active
    GROUP BY c.id
    ORDER BY c.position, c.name
  `);
  res.json(rows);
}));

/* -------------------------------------------------------------------- GET /products
   Filtres : ?categorie=sacs &q=robe &tri=prix-asc &page=1 &limite=24 &enStock=1 */
router.get('/products', asyncRoute(async (req, res) => {
  const q = validate(req.query, {
    categorie: { type: 'string', max: 60 },
    q:         { type: 'string', max: 80 },
    tri:       { type: 'enum', values: ['pertinence', 'nouveautes', 'prix-asc', 'prix-desc', 'note'], default: 'pertinence' },
    page:      { type: 'int', min: 1, default: 1 },
    limite:    { type: 'int', min: 1, max: 60, default: 24 },
    enStock:   { type: 'bool', default: false },
    vedette:   { type: 'bool', default: false },
  });

  const where = ['p.is_active'];
  const params = [];

  if (q.categorie) {
    params.push(q.categorie);
    where.push(`(c.slug = $${params.length} OR c.name ILIKE $${params.length})`);
  }
  if (q.q) {
    params.push(`%${q.q}%`);
    where.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
  }
  if (q.enStock) where.push('COALESCE(s.total_stock, 0) > 0');
  if (q.vedette) where.push('p.is_featured');

  const ORDER = {
    'pertinence': 'p.is_featured DESC, p.created_at DESC',
    'nouveautes': 'p.created_at DESC',
    'prix-asc':   'p.base_price ASC',
    'prix-desc':  'p.base_price DESC',
    'note':       'p.rating DESC',
  }[q.tri];

  const whereSql = `WHERE ${where.join(' AND ')}`;

  const countResult = await query(
    `SELECT COUNT(*)::INT AS total
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN product_stock s ON s.product_id = p.id
     ${whereSql}`,
    params
  );

  params.push(q.limite, (q.page - 1) * q.limite);
  const { rows } = await query(
    `${PRODUCT_SELECT} ${whereSql} ORDER BY ${ORDER} LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({
    items: rows,
    total: countResult.rows[0].total,
    page: q.page,
    pages: Math.max(1, Math.ceil(countResult.rows[0].total / q.limite)),
  });
}));

/* --------------------------------------------------------- GET /products/:idOrSlug */
router.get('/products/:key', asyncRoute(async (req, res) => {
  const key = req.params.key;
  const byId = /^\d+$/.test(key);

  const { rows } = await query(
    `${PRODUCT_SELECT} WHERE p.is_active AND ${byId ? 'p.id = $1' : 'p.slug = $1'}`,
    [byId ? Number(key) : key]
  );

  const product = rows[0];
  if (!product) throw notFound('Ce produit n\'existe pas ou n\'est plus disponible.');

  const [images, variants, reviews] = await Promise.all([
    query('SELECT id, url, alt, position FROM product_images WHERE product_id = $1 ORDER BY position, id', [product.id]),
    /* Les tailles se trient dans l'ordre d'habillage (S, M, L, XL…),
       pas dans l'ordre alphabétique. */
    query(`SELECT id, size, color, sku, COALESCE(price, $2) AS price, stock
           FROM product_variants WHERE product_id = $1 AND is_active
           ORDER BY color NULLS FIRST, ${SIZE_ORDER}, size, id`, [product.id, product.base_price]),
    query(`SELECT id, author, rating, body, created_at
           FROM reviews WHERE product_id = $1 AND is_published
           ORDER BY created_at DESC LIMIT 20`, [product.id]),
  ]);

  const related = await query(
    `${PRODUCT_SELECT}
     WHERE p.is_active AND p.id <> $1 AND p.category_id = (SELECT category_id FROM products WHERE id = $1)
     ORDER BY RANDOM() LIMIT 4`,
    [product.id]
  );

  res.json({
    ...product,
    images: images.rows,
    variants: variants.rows,
    reviews: reviews.rows,
    related: related.rows,
    sizes: [...new Set(variants.rows.map((v) => v.size).filter(Boolean))],
    colors: [...new Set(variants.rows.map((v) => v.color).filter(Boolean))],
  });
}));

/* ----------------------------------------------------- POST /products/:id/reviews
   L'avis est enregistré non publié : c'est l'administration qui le valide. */
router.post('/products/:id/reviews', asyncRoute(async (req, res) => {
  const data = validate(req.body, {
    author: { type: 'string', required: true, min: 2, max: 60 },
    rating: { type: 'int', required: true, min: 1, max: 5 },
    body:   { type: 'string', required: true, min: 10, max: 800 },
  });

  const { rows } = await query(
    `INSERT INTO reviews (product_id, customer_id, author, rating, body)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [req.params.id, req.user?.id || null, data.author, data.rating, data.body]
  );

  res.status(201).json({
    id: rows[0].id,
    message: 'Merci ! Votre avis sera publié après vérification.',
  });
}));

/* ------------------------------------------------------------------ GET /reviews
   Derniers avis validés, toutes catégories confondues. Alimente le bandeau
   de témoignages de l'accueil, qui affichait auparavant des avis écrits en dur
   dans le code — donc invérifiables et jamais renouvelés. */
router.get('/reviews', asyncRoute(async (req, res) => {
  const q = validate(req.query, { limite: { type: 'int', min: 1, max: 12, default: 3 } });

  const { rows } = await query(
    `SELECT r.id, r.author, r.rating, r.body, r.created_at,
            p.name AS product_name, p.slug AS product_slug
     FROM reviews r
     JOIN products p ON p.id = r.product_id
     WHERE r.is_published AND p.is_active
     ORDER BY r.created_at DESC
     LIMIT $1`,
    [q.limite]
  );
  res.json(rows);
}));

/* ----------------------------------------------------------------- newsletter */
router.post('/newsletter', asyncRoute(async (req, res) => {
  const { email } = validate(req.body, { email: { type: 'email', required: true } });
  await query('INSERT INTO newsletter (email) VALUES ($1) ON CONFLICT (email) DO NOTHING', [email]);
  res.status(201).json({ message: 'Inscription enregistrée.' });
}));

module.exports = router;
