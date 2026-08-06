/* eslint-disable no-unused-vars */

function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route inconnue : ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  /* Erreurs Postgres traduites en messages compréhensibles */
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Cette valeur existe déjà.' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Référence invalide.' });
  }
  if (err.code === '23514') {
    return res.status(400).json({ error: 'Valeur hors limites.' });
  }

  const status = err.status || 500;

  if (status >= 500) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    console.error(err.stack || err);
  }

  res.status(status).json({
    error: status >= 500 ? 'Une erreur interne est survenue.' : err.message,
    ...(err.details ? { details: err.details } : {}),
  });
}

module.exports = { notFoundHandler, errorHandler };
