const express = require('express');
const router = express.Router();

const { query, transaction } = require('../../db/pool');
const { validate, slugify } = require('../../lib/validate');
const { asyncRoute, notFound, badRequest } = require('../../lib/errors');

/* -------------------------------------------------------------- LISTE COMPLÈTE
   Contrairement au catalogue public, on renvoie aussi les produits désactivés
   et le stock détaillé — c'est la vue de travail de la boutique. */
router.get('/', asyncRoute(async (req, res) => {
  const q = validate(req.query, {
    q:        { type: 'string', max: 80 },
    statut:   { type: 'enum', values: ['tous', 'actifs', 'inactifs', 'rupture', 'stock-bas'], default: 'tous' },
    limite:   { type: 'int', min: 1, max: 200, default: 100 },
  });

  const where = ['TRUE'];
  const params = [];

  if (q.q) { params.push(`%${q.q}%`); where.push(`p.name ILIKE $${params.length}`); }
  if (q.statut === 'actifs')   where.push('p.is_active');
  if (q.statut === 'inactifs') where.push('NOT p.is_active');
  if (q.statut === 'rupture')  where.push('COALESCE(s.total_stock, 0) = 0');
  if (q.statut === 'stock-bas') where.push('COALESCE(s.total_stock, 0) BETWEEN 1 AND 3');

  params.push(q.limite);

  const { rows } = await query(
    `SELECT p.id, p.name, p.slug, p.base_price, p.compare_at, p.is_active, p.is_featured,
            p.rating, p.created_at,
            c.name AS category, c.id AS category_id,
            COALESCE(s.total_stock, 0) AS stock,
            COALESCE(s.available_variants, 0) AS available_variants,
            (SELECT COUNT(*)::INT FROM product_variants v WHERE v.product_id = p.id) AS variant_count,
            (SELECT url FROM product_images i WHERE i.product_id = p.id ORDER BY i.position, i.id LIMIT 1) AS image
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN product_stock s ON s.product_id = p.id
     WHERE ${where.join(' AND ')}
     ORDER BY p.created_at DESC
     LIMIT $${params.length}`,
    params
  );

  res.json(rows);
}));

/* ---------------------------------------------------------------- DÉTAIL COMPLET */
router.get('/:id', asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT * FROM products WHERE id = $1', [req.params.id]);
  if (!rows[0]) throw notFound('Produit introuvable.');

  const [images, variants] = await Promise.all([
    query('SELECT * FROM product_images WHERE product_id = $1 ORDER BY position, id', [req.params.id]),
    query('SELECT * FROM product_variants WHERE product_id = $1 ORDER BY color NULLS FIRST, size NULLS FIRST, id', [req.params.id]),
  ]);

  res.json({ ...rows[0], images: images.rows, variants: variants.rows });
}));

/* Champs communs à la création et à la modification. */
const productSchema = {
  name:        { type: 'string', required: true, min: 2, max: 120 },
  description: { type: 'string', max: 3000 },
  categoryId:  { type: 'int' },
  basePrice:   { type: 'int', required: true, min: 0 },
  compareAt:   { type: 'int', min: 0 },
  rating:      { type: 'number' },
  isActive:    { type: 'bool', default: true },
  isFeatured:  { type: 'bool', default: false },
};

async function uniqueSlug(name, excludeId = null) {
  const base = slugify(name) || 'produit';
  let slug = base;
  let n = 1;
  /* eslint-disable no-await-in-loop */
  while (true) {
    const { rowCount } = await query(
      `SELECT 1 FROM products WHERE slug = $1 ${excludeId ? 'AND id <> $2' : ''}`,
      excludeId ? [slug, excludeId] : [slug]
    );
    if (!rowCount) return slug;
    slug = `${base}-${++n}`;
  }
}

/* ------------------------------------------------------------------- CRÉATION
   Le corps peut contenir images[] et variants[] : tout est créé d'un bloc. */
router.post('/', asyncRoute(async (req, res) => {
  const data = validate(req.body, productSchema);
  const slug = await uniqueSlug(data.name);

  const created = await transaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO products (name, slug, description, category_id, base_price, compare_at, rating, is_active, is_featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [data.name, slug, data.description || null, data.categoryId || null, data.basePrice,
       data.compareAt || null, data.rating ?? 4.5, data.isActive, data.isFeatured]
    );
    const product = rows[0];

    await replaceImages(client, product.id, req.body.images);
    await replaceVariants(client, product.id, req.body.variants);

    return product;
  });

  res.status(201).json(created);
}));

/* --------------------------------------------------------------- MODIFICATION */
router.put('/:id', asyncRoute(async (req, res) => {
  const data = validate(req.body, productSchema);
  const id = Number(req.params.id);

  const exists = await query('SELECT id FROM products WHERE id = $1', [id]);
  if (!exists.rowCount) throw notFound('Produit introuvable.');

  const slug = await uniqueSlug(data.name, id);

  const updated = await transaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE products SET name=$1, slug=$2, description=$3, category_id=$4, base_price=$5,
              compare_at=$6, rating=$7, is_active=$8, is_featured=$9
       WHERE id=$10 RETURNING *`,
      [data.name, slug, data.description || null, data.categoryId || null, data.basePrice,
       data.compareAt || null, data.rating ?? 4.5, data.isActive, data.isFeatured, id]
    );

    if (Array.isArray(req.body.images))   await replaceImages(client, id, req.body.images);
    if (Array.isArray(req.body.variants)) await replaceVariants(client, id, req.body.variants);

    return rows[0];
  });

  res.json(updated);
}));

/* Désactivation plutôt que suppression si le produit a déjà été vendu :
   supprimer casserait l'historique des commandes. */
router.delete('/:id', asyncRoute(async (req, res) => {
  const { rows } = await query(
    'SELECT COUNT(*)::INT AS n FROM order_items WHERE product_id = $1',
    [req.params.id]
  );

  if (rows[0].n > 0) {
    await query('UPDATE products SET is_active = FALSE WHERE id = $1', [req.params.id]);
    return res.json({
      message: 'Produit retiré de la boutique. Il reste visible dans les commandes passées.',
      archived: true,
    });
  }

  await query('DELETE FROM products WHERE id = $1', [req.params.id]);
  res.json({ message: 'Produit supprimé.', archived: false });
}));

/* --------------------------------------------------- MISE À JOUR RAPIDE DU STOCK */
router.patch('/variants/:variantId/stock', asyncRoute(async (req, res) => {
  const { stock } = validate(req.body, { stock: { type: 'int', required: true, min: 0, max: 99999 } });
  const { rows } = await query(
    'UPDATE product_variants SET stock = $1 WHERE id = $2 RETURNING id, stock',
    [stock, req.params.variantId]
  );
  if (!rows[0]) throw notFound('Déclinaison introuvable.');
  res.json(rows[0]);
}));

/* ------------------------------------------------------------------- HELPERS */

async function replaceImages(client, productId, images) {
  if (!Array.isArray(images)) return;
  if (images.length > 8) throw badRequest('8 photos maximum par produit.');

  await client.query('DELETE FROM product_images WHERE product_id = $1', [productId]);
  for (const [index, img] of images.entries()) {
    const url = typeof img === 'string' ? img : img.url;
    if (!url) continue;
    await client.query(
      'INSERT INTO product_images (product_id, url, alt, position) VALUES ($1,$2,$3,$4)',
      [productId, url, (img.alt || null), index]
    );
  }
}

async function replaceVariants(client, productId, variants) {
  if (!Array.isArray(variants)) return;
  if (!variants.length) throw badRequest('Au moins une déclinaison est nécessaire pour vendre le produit.');
  if (variants.length > 60) throw badRequest('60 déclinaisons maximum.');

  /* On conserve les variantes déjà référencées dans des commandes :
     leur suppression effacerait la taille/couleur des lignes de facture. */
  const { rows: used } = await client.query(
    `SELECT DISTINCT variant_id FROM order_items
     WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id = $1)`,
    [productId]
  );
  const usedIds = new Set(used.map((r) => r.variant_id));

  const { rows: current } = await client.query(
    'SELECT id FROM product_variants WHERE product_id = $1', [productId]
  );
  const keptIds = new Set(variants.map((v) => Number(v.id)).filter(Boolean));

  for (const row of current) {
    if (keptIds.has(row.id)) continue;
    if (usedIds.has(row.id)) {
      await client.query('UPDATE product_variants SET is_active = FALSE WHERE id = $1', [row.id]);
    } else {
      await client.query('DELETE FROM product_variants WHERE id = $1', [row.id]);
    }
  }

  for (const v of variants) {
    const size = v.size ? String(v.size).trim() : null;
    const color = v.color ? String(v.color).trim() : null;
    const stock = Math.max(0, Number(v.stock) || 0);
    const price = v.price ? Math.max(0, Number(v.price)) : null;

    if (v.id) {
      await client.query(
        `UPDATE product_variants SET size=$1, color=$2, stock=$3, price=$4, is_active=TRUE
         WHERE id=$5 AND product_id=$6`,
        [size, color, stock, price, Number(v.id), productId]
      );
    } else {
      await client.query(
        `INSERT INTO product_variants (product_id, size, color, stock, price)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (product_id, size, color)
         DO UPDATE SET stock = EXCLUDED.stock, price = EXCLUDED.price, is_active = TRUE`,
        [productId, size, color, stock, price]
      );
    }
  }
}

module.exports = router;
