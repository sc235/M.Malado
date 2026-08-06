require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { pool } = require('./db/pool');
const { optionalAuth } = require('./middleware/auth');
const { notFoundHandler, errorHandler } = require('./middleware/error');

const app = express();
const PORT = process.env.PORT || 5000;

/* Render, Vercel et Cloudflare placent l'IP réelle dans X-Forwarded-For :
   sans cette ligne, la limitation de débit compte tout le monde comme une
   seule et même adresse. */
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

/* Liste blanche d'origines : en production, seul le site officiel peut
   appeler l'API depuis un navigateur. */
const allowed = (process.env.CORS_ORIGINS || '')
  .split(',').map((s) => s.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);            // curl, applications mobiles
    if (!allowed.length) return callback(null, true);    // non configuré → tout ouvert (dev)
    if (allowed.includes(origin)) return callback(null, true);
    callback(new Error(`Origine non autorisée : ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '8mb' }));

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes. Réessayez dans quelques minutes.' },
}));

app.use(optionalAuth);

/* ------------------------------------------------------------------ ROUTES */
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'ok', time: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'degraded', db: 'ko', error: err.message });
  }
});

/* Plan du site et robots.txt : servis à la racine, hors /api, car les moteurs
   de recherche les cherchent à un emplacement imposé. */
app.use('/', require('./routes/seo'));

app.use('/api', require('./routes/catalog'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/admin', require('./routes/admin'));

app.use(notFoundHandler);
app.use(errorHandler);

/* ------------------------------------------------------------ DÉMARRAGE */
const server = app.listen(PORT, () => {
  console.log(`✅ API Mojo Malado — port ${PORT}`);
  console.log(`   Prestataire de paiement : ${process.env.PAYMENT_PROVIDER || 'aucun (transfert manuel)'}`);
  console.log(`   Origines autorisées     : ${allowed.length ? allowed.join(', ') : 'toutes (mode développement)'}`);
});

/* Arrêt propre : Render envoie SIGTERM avant de couper le conteneur. */
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`\n${signal} reçu — arrêt en cours…`);
    server.close(() => pool.end().then(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10000).unref();
  });
}

module.exports = app;
