const { badRequest } = require('./errors');

/**
 * Petit validateur maison — évite une dépendance supplémentaire.
 *
 *   const data = validate(req.body, {
 *     email: { type: 'email', required: true },
 *     age:   { type: 'int', min: 0, max: 120 },
 *   });
 */

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(input = {}, schema) {
  const out = {};
  const errors = {};

  for (const [key, rule] of Object.entries(schema)) {
    let value = input[key];

    if (value === undefined || value === null || value === '') {
      if (rule.required) errors[key] = 'Champ obligatoire.';
      else if (rule.default !== undefined) out[key] = rule.default;
      continue;
    }

    switch (rule.type) {
      case 'string': {
        value = String(value).trim();
        if (rule.min && value.length < rule.min) { errors[key] = `Au moins ${rule.min} caractères.`; continue; }
        if (rule.max && value.length > rule.max) value = value.slice(0, rule.max);
        break;
      }
      case 'email': {
        value = String(value).trim().toLowerCase();
        if (!RE_EMAIL.test(value)) { errors[key] = 'Adresse email invalide.'; continue; }
        break;
      }
      case 'phone': {
        const digits = String(value).replace(/\D/g, '');
        if (digits.length < 9) { errors[key] = 'Numéro de téléphone invalide.'; continue; }
        value = digits.startsWith('221') ? `+${digits}` : `+221${digits.slice(-9)}`;
        break;
      }
      case 'int': {
        const n = Number.parseInt(value, 10);
        if (Number.isNaN(n)) { errors[key] = 'Nombre entier attendu.'; continue; }
        if (rule.min !== undefined && n < rule.min) { errors[key] = `Minimum ${rule.min}.`; continue; }
        if (rule.max !== undefined && n > rule.max) { errors[key] = `Maximum ${rule.max}.`; continue; }
        value = n;
        break;
      }
      case 'number': {
        const n = Number(value);
        if (Number.isNaN(n)) { errors[key] = 'Nombre attendu.'; continue; }
        value = n;
        break;
      }
      case 'bool': {
        value = value === true || value === 'true' || value === 1 || value === '1';
        break;
      }
      case 'enum': {
        value = String(value);
        if (!rule.values.includes(value)) {
          errors[key] = `Valeur attendue : ${rule.values.join(', ')}.`;
          continue;
        }
        break;
      }
      case 'array': {
        if (!Array.isArray(value)) { errors[key] = 'Liste attendue.'; continue; }
        if (rule.min && value.length < rule.min) { errors[key] = `Au moins ${rule.min} élément(s).`; continue; }
        if (rule.max && value.length > rule.max) { errors[key] = `Maximum ${rule.max} éléments.`; continue; }
        break;
      }
      default:
        break;
    }

    out[key] = value;
  }

  if (Object.keys(errors).length) {
    throw badRequest('Certains champs sont invalides.', errors);
  }
  return out;
}

/** "Robe bleu clair" → "robe-bleu-clair" */
function slugify(text = '') {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

module.exports = { validate, slugify };
