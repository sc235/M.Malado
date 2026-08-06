require('dotenv').config();

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('./pool');
const { slugify } = require('../lib/validate');

/* ============================================================================
   Importe le catalogue existant (data/products.json) vers le nouveau modèle :
   produits → images → déclinaisons avec stock.
   Relançable sans risque : les produits déjà importés sont mis à jour, pas
   dupliqués, et les stocks saisis à la main ne sont pas écrasés.
   ========================================================================== */

const CATEGORIES = [
  { name: 'Vêtements', description: 'Robes et tenues en tissus africains', image: '/robes.images/robeRouge.jpg', position: 1 },
  { name: 'Sacs',      description: 'Sacs à main et modèles créateurs',    image: '/sac.images/yslBag.jpg',      position: 2 },
  { name: 'Parfums',   description: 'Brumes et fragrances longue tenue',   image: '/parfum.images/victoria.jpg', position: 3 },
  { name: 'Sandales',  description: 'Sandales et chaussures',              image: null,                          position: 4 },
];

/* Déclinaisons générées selon la catégorie. */
const VARIANT_PLAN = {
  'Vêtements': { sizes: ['S', 'M', 'L', 'XL'], stock: [4, 6, 5, 3] },
  'Sandales':  { sizes: ['37', '38', '39', '40', '41'], stock: [2, 3, 3, 2, 1] },
  'Parfums':   { sizes: ['100 ml', '250 ml'], stock: [8, 4] },
  'Sacs':      { sizes: [null], stock: [3] },
};

/* Couleur déduite du nom, quand elle y figure. */
const COLOR_WORDS = [
  ['beige', 'Beige'], ['blanc', 'Blanc'], ['bleu clair', 'Bleu clair'], ['bleu', 'Bleu'],
  ['vert', 'Vert'], ['violet', 'Violet'], ['rouge', 'Rouge'], ['rose', 'Rose'],
  ['jaune', 'Jaune'], ['gris', 'Gris'], ['noir', 'Noir'], ['marron', 'Marron'],
  ['bordeaux', 'Bordeaux'], ['multicolore', 'Multicolore'], ['orange', 'Orange'],
];

function detectColor(name = '') {
  const low = name.toLowerCase();
  for (const [needle, label] of COLOR_WORDS) {
    if (low.includes(needle)) return label;
  }
  return null;
}

function normalizeImage(src) {
  if (!src) return null;
  if (src.startsWith('http') || src.startsWith('/')) return src;
  return `/${src}`;
}

(async () => {
  const file = path.join(__dirname, 'products-legacy.json');
  const legacy = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    /* ---------------------------------------------------------- CATÉGORIES */
    const categoryId = {};
    for (const cat of CATEGORIES) {
      const { rows } = await client.query(
        `INSERT INTO categories (name, slug, description, image, position)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (name) DO UPDATE
           SET description = EXCLUDED.description,
               image = COALESCE(categories.image, EXCLUDED.image),
               position = EXCLUDED.position
         RETURNING id, name`,
        [cat.name, slugify(cat.name), cat.description, cat.image, cat.position]
      );
      categoryId[rows[0].name] = rows[0].id;
    }
    console.log(`✅ ${CATEGORIES.length} catégories`);

    /* ------------------------------------------------------------- PRODUITS */
    let created = 0;
    let updated = 0;

    for (const item of legacy) {
      const slug = slugify(item.name);
      const price = Math.round(Number(item.price) || 0);
      const catId = categoryId[item.category] || null;

      const existing = await client.query('SELECT id FROM products WHERE slug = $1', [slug]);

      let productId;
      if (existing.rowCount) {
        productId = existing.rows[0].id;
        await client.query(
          `UPDATE products SET name=$1, description=$2, category_id=$3, base_price=$4, rating=$5
           WHERE id=$6`,
          [item.name, item.description || null, catId, price, Number(item.rating) || 4.5, productId]
        );
        updated++;
      } else {
        const { rows } = await client.query(
          `INSERT INTO products (name, slug, description, category_id, base_price, rating, is_featured)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [item.name, slug, item.description || null, catId, price,
           Number(item.rating) || 4.5, (item.rating || 0) >= 4.7]
        );
        productId = rows[0].id;
        created++;
      }

      /* --------------------------------------------------------- IMAGE */
      const url = normalizeImage(item.image);
      if (url) {
        const has = await client.query(
          'SELECT 1 FROM product_images WHERE product_id = $1 AND url = $2',
          [productId, url]
        );
        if (!has.rowCount) {
          await client.query(
            'INSERT INTO product_images (product_id, url, alt, position) VALUES ($1,$2,$3,0)',
            [productId, url, item.name]
          );
        }
      }

      /* --------------------------------------------------- DÉCLINAISONS
         ON CONFLICT DO NOTHING : un stock déjà ajusté dans le back-office
         n'est jamais écrasé par une nouvelle exécution du script. */
      const plan = VARIANT_PLAN[item.category] || VARIANT_PLAN.Sacs;
      const color = detectColor(item.name);

      for (const [i, size] of plan.sizes.entries()) {
        await client.query(
          `INSERT INTO product_variants (product_id, size, color, stock, sku)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (product_id, size, color) DO NOTHING`,
          [productId, size, color, plan.stock[i] ?? 2,
           `${slug.slice(0, 20).toUpperCase()}-${size || 'UNI'}-${productId}`.replace(/\s+/g, '')]
        );
      }
    }

    console.log(`✅ Produits : ${created} créés, ${updated} mis à jour`);

    /* ---------------------------------------------------------------- AVIS */
    const seedReviews = [
      { slug: 'robe-beige', author: 'Aminata Diallo', rating: 5, body: "J'ai commandé cette robe pour un mariage. La qualité du tissu est incroyable et la livraison a été très rapide. Je recommande absolument." },
      { slug: 'grand-sac-ysl', author: 'Fatou Ndiaye', rating: 5, body: "Magnifique et très spacieux, exactement ce que je cherchais pour le travail. Le service client est au top." },
    ];

    for (const r of seedReviews) {
      const { rows } = await client.query('SELECT id FROM products WHERE slug = $1', [r.slug]);
      if (!rows[0]) continue;
      const dup = await client.query(
        'SELECT 1 FROM reviews WHERE product_id = $1 AND author = $2', [rows[0].id, r.author]
      );
      if (dup.rowCount) continue;
      await client.query(
        'INSERT INTO reviews (product_id, author, rating, body, is_published) VALUES ($1,$2,$3,$4,TRUE)',
        [rows[0].id, r.author, r.rating, r.body]
      );
    }

    /* --------------------------------------------------------------- ADMIN */
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || '';

    if (!email || password.length < 6) {
      console.warn(
        '⚠️  Compte administrateur non créé : renseignez ADMIN_EMAIL et ADMIN_PASSWORD\n' +
        '    (6 caractères minimum) dans backend/.env, puis relancez `npm run seed`.'
      );
    } else {
      const hash = await bcrypt.hash(password, 12);
      await client.query(
        `INSERT INTO admins (email, password_hash, name)
         VALUES ($1,$2,'Administration Mojo Malado')
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
        [email, hash]
      );
      console.log(`✅ Compte administrateur : ${email}`);
    }

    await client.query('COMMIT');

    const summary = await client.query(`
      SELECT (SELECT COUNT(*) FROM products)::INT AS produits,
             (SELECT COUNT(*) FROM product_variants)::INT AS declinaisons,
             (SELECT COALESCE(SUM(stock),0) FROM product_variants)::INT AS stock_total
    `);
    console.log('\n📦', summary.rows[0]);
    console.log('\nTerminé. Lancez le serveur avec : npm run dev');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Import impossible :', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
