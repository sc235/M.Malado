/** Erreur applicative porteuse d'un code HTTP et d'un message destiné au client. */
class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
    this.expected = true;
  }
}

const badRequest   = (msg, details) => new AppError(400, msg, details);
const unauthorized = (msg = 'Connexion requise.') => new AppError(401, msg);
const forbidden    = (msg = 'Accès refusé.') => new AppError(403, msg);
const notFound     = (msg = 'Ressource introuvable.') => new AppError(404, msg);
const conflict     = (msg) => new AppError(409, msg);

/** Enveloppe un handler async : toute erreur part vers le middleware d'erreur. */
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { AppError, badRequest, unauthorized, forbidden, notFound, conflict, asyncRoute };
