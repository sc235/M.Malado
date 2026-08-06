const express = require('express');
const router = express.Router();
const { query } = require('../db/pool');
const { asyncRoute } = require('../lib/errors');

/* ============================================================================
   Plan du site et robots.txt.

   Générés à la demande plutôt que déposés en fichiers : le catalogue bouge
   (nouveau produit, article masqué), et un plan de site figé finirait par
   envoyer Google sur des pages disparues.

   Ces deux adresses doivent répondre depuis le domaine de la BOUTIQUE, pas
   depuis celui de l'API. La redirection est faite par vercel.json.
   ========================================================================== */

const SITE_URL = (process.env.SITE_URL || 'https://mojo-malado.vercel.app').replace(/\/$/, '');

/* Une URL invalide (& ou < dans un slug) casse le fichier entier pour Google. */
const escapeXml = (s) => String(s).replace(/[<>&'"]/g, (c) => (
  { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]
));

const urlEntry = ({ loc, lastmod, changefreq, priority }) => [
  '  <url>',
  `    <loc>${escapeXml(SITE_URL + loc)}</loc>`,
  lastmod ? `    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : '',
  changefreq ? `    <changefreq>${changefreq}</changefreq>` : '',
  priority ? `    <priority>${priority}</priority>` : '',
  '  </url>',
].filter(Boolean).join('\n');

router.get('/sitemap.xml', asyncRoute(async (_req, res) => {
  const [products, categories] = await Promise.all([
    query(`SELECT p.slug, p.updated_at
           FROM products p
           WHERE p.is_active AND p.slug IS NOT NULL
           ORDER BY p.updated_at DESC`),
    query(`SELECT c.slug
           FROM categories c
           JOIN products p ON p.category_id = c.id AND p.is_active
           WHERE c.is_active
           GROUP BY c.slug
           ORDER BY c.slug`),
  ]);

  const urls = [
    urlEntry({ loc: '/',          changefreq: 'daily',   priority: '1.0' }),
    urlEntry({ loc: '/boutique',  changefreq: 'daily',   priority: '0.9' }),
    urlEntry({ loc: '/a-propos',  changefreq: 'monthly', priority: '0.5' }),
    urlEntry({ loc: '/contact',   changefreq: 'monthly', priority: '0.5' }),
    urlEntry({ loc: '/suivi',     changefreq: 'yearly',  priority: '0.3' }),
    ...categories.rows.map((c) =>
      urlEntry({ loc: `/boutique?categorie=${c.slug}`, changefreq: 'weekly', priority: '0.8' })),
    ...products.rows.map((p) =>
      urlEntry({ loc: `/produit/${p.slug}`, lastmod: p.updated_at, changefreq: 'weekly', priority: '0.7' })),
  ];

  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + `${urls.join('\n')}\n`
    + `</urlset>\n`
  );
}));

router.get('/robots.txt', (_req, res) => {
  /* Les espaces clientes et l'administration n'ont rien à faire dans un
     index public — et l'adresse du back-office n'a pas à être annoncée. */
  res.type('text/plain').send([
    'User-agent: *',
    'Allow: /',
    'Disallow: /compte',
    'Disallow: /connexion',
    'Disallow: /inscription',
    'Disallow: /suivi',
    'Disallow: /commande/',
    'Disallow: /secret-mojo-gate',
    'Disallow: /gestion-mojo-privee',
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ].join('\n'));
});

module.exports = router;
