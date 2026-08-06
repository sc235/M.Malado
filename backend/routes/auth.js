const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

const { query } = require('../db/pool');
const { sign } = require('../lib/token');
const { validate } = require('../lib/validate');
const { asyncRoute, conflict, unauthorized, notFound } = require('../lib/errors');
const { requireCustomer } = require('../middleware/auth');

const publicCustomer = (c) => ({
  id: c.id, email: c.email, fullName: c.full_name, phone: c.phone, createdAt: c.created_at,
});

/* ------------------------------------------------------------------ INSCRIPTION */
router.post('/register', asyncRoute(async (req, res) => {
  const data = validate(req.body, {
    fullName: { type: 'string', required: true, min: 3, max: 80 },
    email:    { type: 'email', required: true },
    phone:    { type: 'phone', required: true },
    password: { type: 'string', required: true, min: 8, max: 100 },
  });

  if (data.email.toLowerCase().trim() === 'oumousy@mmalado.com') {
    throw conflict("Création de compte impossible avec cette adresse email.");
  }

  const existing = await query('SELECT id FROM customers WHERE email = $1', [data.email]);
  if (existing.rowCount) throw conflict('Un compte existe déjà avec cette adresse email.');

  const hash = await bcrypt.hash(data.password, 12);
  const { rows } = await query(
    `INSERT INTO customers (email, password_hash, full_name, phone)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.email, hash, data.fullName, data.phone]
  );

  const customer = rows[0];

  /* Les commandes passées en visiteur avec le même téléphone sont rattachées au compte. */
  await query(
    'UPDATE orders SET customer_id = $1 WHERE customer_id IS NULL AND customer_phone = $2',
    [customer.id, data.phone]
  );

  res.status(201).json({
    token: sign({ id: customer.id, email: customer.email }, 'customer'),
    customer: publicCustomer(customer),
  });
}));

/* --------------------------------------------------------------------- CONNEXION */
router.post('/login', asyncRoute(async (req, res) => {
  const data = validate(req.body, {
    email:    { type: 'email', required: true },
    password: { type: 'string', required: true },
  });

  if (data.email.toLowerCase().trim() === 'oumousy@mmalado.com') {
    throw unauthorized('Email ou mot de passe incorrect.');
  }

  const { rows } = await query('SELECT * FROM customers WHERE email = $1', [data.email]);
  const customer = rows[0];

  /* Comparaison systématique, même si le compte n'existe pas : évite de révéler
     par le temps de réponse quelles adresses sont enregistrées. */
  const hash = customer?.password_hash || '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid';
  const ok = await bcrypt.compare(data.password, hash);

  if (!customer || !ok) throw unauthorized('Email ou mot de passe incorrect.');

  res.json({
    token: sign({ id: customer.id, email: customer.email }, 'customer'),
    customer: publicCustomer(customer),
  });
}));

/* ------------------------------------------------------------------------- PROFIL */
router.get('/me', requireCustomer, asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT * FROM customers WHERE id = $1', [req.user.id]);
  if (!rows[0]) throw notFound('Compte introuvable.');

  const addresses = await query(
    'SELECT id, label, line1, city, landmark, is_default FROM addresses WHERE customer_id = $1 ORDER BY is_default DESC, id',
    [req.user.id]
  );

  const stats = await query(
    `SELECT COUNT(*)::INT AS orders, COALESCE(SUM(total), 0)::INT AS spent
     FROM orders WHERE customer_id = $1 AND status <> 'annulee'`,
    [req.user.id]
  );

  res.json({
    customer: publicCustomer(rows[0]),
    addresses: addresses.rows,
    stats: stats.rows[0],
  });
}));

router.patch('/me', requireCustomer, asyncRoute(async (req, res) => {
  const data = validate(req.body, {
    fullName: { type: 'string', min: 3, max: 80 },
    phone:    { type: 'phone' },
  });

  const fields = [];
  const params = [];
  if (data.fullName) { params.push(data.fullName); fields.push(`full_name = $${params.length}`); }
  if (data.phone)    { params.push(data.phone);    fields.push(`phone = $${params.length}`); }
  if (!fields.length) return res.json({ message: 'Rien à modifier.' });

  params.push(req.user.id);
  const { rows } = await query(
    `UPDATE customers SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  res.json({ customer: publicCustomer(rows[0]) });
}));

router.post('/me/password', requireCustomer, asyncRoute(async (req, res) => {
  const data = validate(req.body, {
    current: { type: 'string', required: true },
    next:    { type: 'string', required: true, min: 8, max: 100 },
  });

  const { rows } = await query('SELECT password_hash FROM customers WHERE id = $1', [req.user.id]);
  const ok = await bcrypt.compare(data.current, rows[0].password_hash);
  if (!ok) throw unauthorized('Mot de passe actuel incorrect.');

  await query('UPDATE customers SET password_hash = $1 WHERE id = $2', [
    await bcrypt.hash(data.next, 12), req.user.id,
  ]);
  res.json({ message: 'Mot de passe modifié.' });
}));

/* ------------------------------------------------------------------------ ADRESSES */
router.post('/me/addresses', requireCustomer, asyncRoute(async (req, res) => {
  const data = validate(req.body, {
    label:     { type: 'string', max: 40, default: 'Domicile' },
    line1:     { type: 'string', required: true, min: 5, max: 160 },
    city:      { type: 'string', max: 60, default: 'Dakar' },
    landmark:  { type: 'string', max: 120 },
    isDefault: { type: 'bool', default: false },
  });

  if (data.isDefault) {
    await query('UPDATE addresses SET is_default = FALSE WHERE customer_id = $1', [req.user.id]);
  }

  const { rows } = await query(
    `INSERT INTO addresses (customer_id, label, line1, city, landmark, is_default)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [req.user.id, data.label, data.line1, data.city, data.landmark || null, data.isDefault]
  );
  res.status(201).json(rows[0]);
}));

router.delete('/me/addresses/:id', requireCustomer, asyncRoute(async (req, res) => {
  await query('DELETE FROM addresses WHERE id = $1 AND customer_id = $2', [req.params.id, req.user.id]);
  res.json({ message: 'Adresse supprimée.' });
}));

module.exports = router;
