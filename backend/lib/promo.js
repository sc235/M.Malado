const { badRequest, notFound } = require('./errors');

/* ============================================================================
   Codes promo.

   La réduction est TOUJOURS recalculée ici, à partir de la ligne lue en base.
   Le navigateur ne fait qu'envoyer le code : il ne décide jamais du montant.
   Sans cela, une requête forgée avec « discount: 40000 » viderait la boutique.
   ========================================================================== */

const KIND_LABELS = {
  percent:  (v) => `-${v} %`,
  amount:   (v) => `-${new Intl.NumberFormat('fr-FR').format(v)} FCFA`,
  shipping: () => 'Livraison offerte',
};

/** Normalise la saisie : « bienvenue10 » et « Bienvenue 10 » sont le même code. */
const normalize = (code) => String(code || '').trim().toUpperCase().replace(/\s+/g, '');

/**
 * Lit le code et vérifie qu'il est utilisable maintenant, pour ce panier.
 *
 * @param {object} client   Client PG (permet de participer à une transaction).
 * @param {string} rawCode  Code saisi par la cliente.
 * @param {number} subtotal Sous-total recalculé côté serveur.
 * @param {number} shipping Frais de livraison calculés côté serveur.
 * @param {boolean} lock    Verrouille la ligne (à la validation de commande).
 * @returns {{promo: object, discount: number, label: string}}
 */
async function resolvePromo(client, rawCode, subtotal, shipping, { lock = false } = {}) {
  const code = normalize(rawCode);
  if (!code) throw badRequest('Indiquez un code promo.');

  const { rows } = await client.query(
    `SELECT * FROM promo_codes WHERE code = $1${lock ? ' FOR UPDATE' : ''}`,
    [code]
  );
  const promo = rows[0];

  /* Message volontairement identique pour « inexistant » et « désactivé » :
     inutile de renseigner qui essaie de deviner des codes. */
  if (!promo || !promo.is_active) throw notFound('Ce code promo n\'est pas valide.');

  const now = new Date();
  if (promo.starts_at && new Date(promo.starts_at) > now) {
    throw badRequest('Ce code n\'est pas encore actif.');
  }
  if (promo.ends_at && new Date(promo.ends_at) < now) {
    throw badRequest('Ce code promo a expiré.');
  }
  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    throw badRequest('Ce code promo a atteint sa limite d\'utilisation.');
  }
  if (subtotal < promo.min_subtotal) {
    const manque = new Intl.NumberFormat('fr-FR').format(promo.min_subtotal - subtotal);
    throw badRequest(`Ce code s'applique à partir de ${new Intl.NumberFormat('fr-FR').format(promo.min_subtotal)} FCFA d'achat (il vous manque ${manque} FCFA).`);
  }

  let discount = 0;
  if (promo.kind === 'percent')  discount = Math.round((subtotal * promo.value) / 100);
  if (promo.kind === 'amount')   discount = Math.min(promo.value, subtotal);
  if (promo.kind === 'shipping') discount = shipping;

  /* Garde-fou : une remise ne peut jamais dépasser le montant dû, sinon on
     obtiendrait un total négatif — donc une commande qui « rapporte » à la cliente. */
  discount = Math.max(0, Math.min(discount, subtotal + shipping));

  return {
    promo,
    discount,
    label: (KIND_LABELS[promo.kind] || (() => ''))(promo.value),
  };
}

module.exports = { resolvePromo, normalize, KIND_LABELS };
