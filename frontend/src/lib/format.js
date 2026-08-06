/** Formatage des prix, images et notes. */

const nf = new Intl.NumberFormat('fr-FR');

/** 15000 → "15 000 FCFA" */
export function formatPrice(value) {
  const n = Number(value) || 0;
  return `${nf.format(n)} FCFA`;
}

/** Normalise un chemin d'image venant de la base ou du JSON local. */
export function imageUrl(src) {
  if (!src) return '/images/logo-modjo.jpg';
  if (src.startsWith('http') || src.startsWith('data:')) return src;
  return src.startsWith('/') ? src : `/${src}`;
}

/** Slug d'URL : "Robe bleu clair" → "robe-bleu-clair" */
export function slugify(text = '') {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Rendu des étoiles sous forme de tableau de classes Font Awesome. */
export function starClasses(rating = 4.5) {
  const out = [];
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  for (let i = 0; i < full; i++) out.push('fas fa-star');
  if (half) out.push('fas fa-star-half-alt');
  while (out.length < 5) out.push('far fa-star');
  return out;
}

/** Mélange déterministe d'un tableau (copie, ne modifie pas l'original). */
export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
