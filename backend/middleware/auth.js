const { verify } = require('../lib/token');
const { unauthorized, forbidden } = require('../lib/errors');

function readToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/** Attache req.user si un jeton valide est présent, sans jamais bloquer. */
function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (!token) return next();
  try {
    req.user = verify(token);
  } catch {
    /* jeton invalide → on continue en visiteur anonyme */
  }
  next();
}

/** Exige une cliente connectée. */
function requireCustomer(req, _res, next) {
  const token = readToken(req);
  if (!token) return next(unauthorized());
  try {
    const payload = verify(token);
    if (payload.role !== 'customer') return next(forbidden());
    req.user = payload;
    next();
  } catch (err) {
    next(err);
  }
}

/** Exige un administrateur connecté. */
function requireAdmin(req, _res, next) {
  const token = readToken(req);
  if (!token) return next(unauthorized());
  try {
    const payload = verify(token);
    if (payload.role !== 'admin') return next(forbidden('Réservé à l\'administration.'));
    req.admin = payload;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { optionalAuth, requireCustomer, requireAdmin };
