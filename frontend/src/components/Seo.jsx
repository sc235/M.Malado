import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/* ============================================================================
   Référencement : titre, description, canonique, partage social et données
   structurées, gérés page par page.

   Sans cela, Google voyait 26 fiches produit partageant toutes le même titre
   et la même description — c'est-à-dire une seule page à ses yeux.

   Le site est rendu côté navigateur : Google exécute le JavaScript et lit donc
   bien ces balises, mais Facebook et WhatsApp ne le font pas. Les balises
   « og: » de index.html restent donc le repli pour l'aperçu des liens partagés.
   ========================================================================== */

const SITE_NAME = 'Mojo Malado';
const DEFAULT_TITLE = 'Mojo Malado — Mode africaine, sacs & parfums à Dakar';
const DEFAULT_DESCRIPTION =
  "Boutique de mode africaine contemporaine à Dakar (Sandaga, rue Thiong) : robes en tissus d'exception, "
  + 'sacs de créateurs, sandales et parfums. Livraison partout au Sénégal.';
const DEFAULT_IMAGE = '/logo-modjo.jpg';

/** L'adresse publique du site, pour les URL absolues exigées par Google. */
export const siteOrigin = () =>
  (typeof window !== 'undefined' ? window.location.origin : 'https://mojo-malado.vercel.app');

const absolute = (path) => {
  if (!path) return `${siteOrigin()}${DEFAULT_IMAGE}`;
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  return `${siteOrigin()}${path.startsWith('/') ? path : `/${path}`}`;
};

/* Les balises posées ici portent un marqueur : on ne retire jamais celles
   écrites en dur dans index.html, qui servent de valeurs par défaut. */
const MARK = 'data-seo';

function setTag(selector, attrs) {
  let el = document.head.querySelector(`${selector}[${MARK}]`);
  if (!el) {
    el = document.createElement(attrs.rel ? 'link' : 'meta');
    el.setAttribute(MARK, '');
    document.head.appendChild(el);
  }
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
}

function setJsonLd(id, data) {
  const selector = `script[type="application/ld+json"][data-seo="${id}"]`;
  let el = document.head.querySelector(selector);

  if (!data) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute(MARK, id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * @param {string}  title        Titre de la page (le nom du site est ajouté).
 * @param {string}  description  Résumé affiché dans les résultats de recherche.
 * @param {string}  image        Visuel de partage.
 * @param {boolean} noindex      Exclut la page des moteurs (compte, admin…).
 * @param {object}  jsonLd       Données structurées supplémentaires.
 */
export default function Seo({ title, description, image, noindex = false, jsonLd = null }) {
  const { pathname } = useLocation();

  useEffect(() => {
    const fullTitle = title ? `${title} — ${SITE_NAME}` : DEFAULT_TITLE;
    const desc = description || DEFAULT_DESCRIPTION;
    const url = `${siteOrigin()}${pathname}`;

    document.title = fullTitle;

    setTag('meta[name="description"]', { name: 'description', content: desc });
    setTag('link[rel="canonical"]', { rel: 'canonical', href: url });
    setTag('meta[name="robots"]', {
      name: 'robots',
      content: noindex ? 'noindex, nofollow' : 'index, follow',
    });

    setTag('meta[property="og:title"]', { property: 'og:title', content: fullTitle });
    setTag('meta[property="og:description"]', { property: 'og:description', content: desc });
    setTag('meta[property="og:url"]', { property: 'og:url', content: url });
    setTag('meta[property="og:image"]', { property: 'og:image', content: absolute(image) });
    setTag('meta[name="twitter:title"]', { name: 'twitter:title', content: fullTitle });
    setTag('meta[name="twitter:description"]', { name: 'twitter:description', content: desc });
    setTag('meta[name="twitter:image"]', { name: 'twitter:image', content: absolute(image) });

    setJsonLd('page', jsonLd);

    /* Les données structurées sont propres à une page : les laisser en place
       ferait passer une fiche produit pour la suivante. */
    return () => setJsonLd('page', null);
  }, [title, description, image, noindex, jsonLd, pathname]);

  return null;
}

/* ------------------------------------------------------------------ Recettes */

/** Fiche produit : prix, disponibilité et note, pour les résultats enrichis. */
export function productJsonLd(product, price) {
  const inStock = Number(product.stock) > 0;
  const reviewCount = product.reviews?.length || 0;

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || DEFAULT_DESCRIPTION,
    image: (product.images?.length
      ? product.images.map((i) => absolute(i.url))
      : [absolute(product.image)]),
    sku: `MM-${product.id}`,
    category: product.category,
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers: {
      '@type': 'Offer',
      price: String(price ?? product.base_price),
      priceCurrency: 'XOF',
      availability: `https://schema.org/${inStock ? 'InStock' : 'OutOfStock'}`,
      url: `${siteOrigin()}/produit/${product.slug || product.id}`,
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
  };

  /* Une note agrégée sans avis réel est un motif de pénalité chez Google :
     on ne la déclare que si des avis existent vraiment. */
  if (reviewCount > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(Number(product.rating) || 4.5),
      reviewCount: String(reviewCount),
    };
    data.review = product.reviews.slice(0, 5).map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.author },
      reviewRating: { '@type': 'Rating', ratingValue: String(r.rating) },
      reviewBody: r.body,
      datePublished: r.created_at,
    }));
  }

  return data;
}

/** Fil d'Ariane : affiche « Accueil › Boutique › Sacs » sous le lien Google. */
export function breadcrumbJsonLd(trail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: step.name,
      item: `${siteOrigin()}${step.path}`,
    })),
  };
}

/** Page de liste : signale à Google les produits d'une catégorie. */
export function itemListJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: items.length,
    itemListElement: items.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${siteOrigin()}/produit/${p.slug || p.id}`,
      name: p.name,
    })),
  };
}
