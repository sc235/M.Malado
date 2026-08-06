const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const { query } = require('../../db/pool');
const { sign } = require('../../lib/token');
const { validate } = require('../../lib/validate');
const { asyncRoute, unauthorized } = require('../../lib/errors');
const { requireAdmin } = require('../../middleware/auth');

/* Cinq tentatives par quart d'heure : bloque les attaques par dictionnaire. */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans un quart d\'heure.' },
});

router.post('/login', loginLimiter, asyncRoute(async (req, res) => {
  const data = validate(req.body, {
    email:    { type: 'email', required: true },
    password: { type: 'string', required: true },
  });

  const { rows } = await query('SELECT * FROM admins WHERE email = $1', [data.email]);
  const admin = rows[0];

  const hash = admin?.password_hash || '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid';
  const ok = await bcrypt.compare(data.password, hash);

  if (!admin || !ok) throw unauthorized('Identifiants incorrects.');

  res.json({
    token: sign({ id: admin.id, email: admin.email }, 'admin'),
    admin: { id: admin.id, email: admin.email, name: admin.name },
  });
}));

router.get('/session', requireAdmin, asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT id, email, name FROM admins WHERE id = $1', [req.admin.id]);
  res.json({ admin: rows[0] });
}));

router.post('/password', requireAdmin, asyncRoute(async (req, res) => {
  const data = validate(req.body, {
    current: { type: 'string', required: true },
    next:    { type: 'string', required: true, min: 10, max: 100 },
  });

  const { rows } = await query('SELECT password_hash FROM admins WHERE id = $1', [req.admin.id]);
  if (!(await bcrypt.compare(data.current, rows[0].password_hash))) {
    throw unauthorized('Mot de passe actuel incorrect.');
  }

  await query('UPDATE admins SET password_hash = $1 WHERE id = $2', [
    await bcrypt.hash(data.next, 12), req.admin.id,
  ]);
  res.json({ message: 'Mot de passe modifié.' });
}));

module.exports = router;
