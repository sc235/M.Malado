const jwt = require('jsonwebtoken');
const { unauthorized } = require('./errors');

const SECRET = process.env.JWT_SECRET;

if (!SECRET || SECRET.length < 24) {
  console.error(
    '❌ JWT_SECRET manquant ou trop court (24 caractères minimum).\n' +
    '   Générez-en un avec :  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
  );
  process.exit(1);
}

const TTL = { customer: '30d', admin: '12h' };

/** @param {'customer'|'admin'} role */
function sign(payload, role) {
  return jwt.sign({ ...payload, role }, SECRET, { expiresIn: TTL[role] || '1d' });
}

function verify(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    throw unauthorized('Session expirée, veuillez vous reconnecter.');
  }
}

module.exports = { sign, verify };
