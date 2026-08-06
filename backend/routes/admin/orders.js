const express = require('express');
const router = express.Router();

const { query, transaction } = require('../../db/pool');
const { validate } = require('../../lib/validate');
const { asyncRoute, notFound, badRequest } = require('../../lib/errors');

const STATUSES = ['en_attente', 'confirmee', 'preparation', 'expediee', 'livree', 'annulee'];

const LABELS = {
  en_attente:  'Commande reçue',
  confirmee:   'Commande confirmée',
  preparation: 'En préparation',
  expediee:    'En cours de livraison',
  livree:      'Livrée',
  annulee:     'Annulée',
};

/* ------------------------------------------------------------------- LISTE */
router.get('/', asyncRoute(async (req, res) => {
  const q = validate(req.query, {
    statut: { type: 'string', max: 20 },
    q:      { type: 'string', max: 60 },
    limite: { type: 'int', min: 1, max: 200, default: 60 },
  });

  const where = ['TRUE'];
  const params = [];

  if (q.statut && STATUSES.includes(q.statut)) {
    params.push(q.statut);
    where.push(`o.status = $${params.length}`);
  }
  if (q.q) {
    params.push(`%${q.q}%`);
    where.push(`(o.reference ILIKE $${params.length} OR o.customer_name ILIKE $${params.length} OR o.customer_phone ILIKE $${params.length})`);
  }

  params.push(q.limite);

  const { rows } = await query(
    `SELECT o.id, o.reference, o.customer_name, o.customer_phone, o.city,
            o.total, o.status, o.payment_status, o.payment_method, o.created_at,
            COUNT(i.id)::INT AS item_count
     FROM orders o
     LEFT JOIN order_items i ON i.order_id = o.id
     WHERE ${where.join(' AND ')}
     GROUP BY o.id
     ORDER BY o.created_at DESC
     LIMIT $${params.length}`,
    params
  );

  res.json(rows.map((o) => ({ ...o, statusLabel: LABELS[o.status] })));
}));

/* -------------------------------------------------------------- EXPORT CSV
   Déclaré AVANT `/:id`, sinon « export.csv » serait pris pour un identifiant
   de commande et la route ne répondrait jamais.

   Deux détails qui font la différence à l'ouverture dans Excel en français :
   le point-virgule comme séparateur (la virgule y sépare les décimales) et
   le BOM UTF-8 en tête, sans lequel « Thiès » s'affiche « ThiÃ¨s ». */
router.get('/export.csv', asyncRoute(async (req, res) => {
  const q = validate(req.query, {
    statut: { type: 'string', max: 20 },
    depuis: { type: 'string', max: 20 },
  });

  const where = ['TRUE'];
  const params = [];

  if (q.statut && STATUSES.includes(q.statut)) {
    params.push(q.statut);
    where.push(`o.status = $${params.length}`);
  }
  if (q.depuis && /^\d{4}-\d{2}-\d{2}$/.test(q.depuis)) {
    params.push(q.depuis);
    where.push(`o.created_at >= $${params.length}::date`);
  }

  const { rows } = await query(
    `SELECT o.reference, o.created_at, o.customer_name, o.customer_phone,
            o.customer_email, o.address_line, o.city, o.note,
            o.subtotal, o.shipping, o.discount, o.promo_code, o.total,
            o.status, o.payment_method, o.payment_status,
            string_agg(
              i.name || COALESCE(' (' || NULLIF(concat_ws(' / ', i.size, i.color), '') || ')', '')
                     || ' x' || i.quantity,
              ' | ' ORDER BY i.id
            ) AS articles
     FROM orders o
     LEFT JOIN order_items i ON i.order_id = o.id
     WHERE ${where.join(' AND ')}
     GROUP BY o.id
     ORDER BY o.created_at DESC`,
    params
  );

  /* Une valeur commençant par = + - @ est interprétée comme une formule par
     Excel : on la neutralise avec une apostrophe, sinon un nom de cliente
     malveillant pourrait déclencher quelque chose à l'ouverture du fichier.

     Exception faite des numéros de téléphone : « +221771234567 » ne contient
     que des chiffres après le signe et ne peut donc rien exécuter. Les
     préfixer rendrait toute la colonne illisible. */
  const cell = (value) => {
    if (value === null || value === undefined) return '';
    let s = String(value);
    const risky = /^[=@\t\r]/.test(s) || (/^[+\-]/.test(s) && !/^[+\-][\d\s().]+$/.test(s));
    if (risky) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };

  const header = ['Référence', 'Date', 'Cliente', 'Téléphone', 'Email', 'Adresse',
    'Ville', 'Note', 'Articles', 'Sous-total', 'Livraison', 'Remise',
    'Code promo', 'Total', 'Statut', 'Paiement', 'État du paiement'];

  const lines = rows.map((o) => [
    o.reference,
    new Date(o.created_at).toLocaleString('fr-FR'),
    o.customer_name, o.customer_phone, o.customer_email,
    o.address_line, o.city, o.note, o.articles,
    o.subtotal, o.shipping, o.discount, o.promo_code, o.total,
    LABELS[o.status] || o.status, o.payment_method, o.payment_status,
  ].map(cell).join(';'));

  /* Le BOM est écrit en séquence d'échappement plutôt qu'en caractère
     littéral : invisible dans le code, il disparaîtrait au premier
     copier-coller. Sans lui, Excel affiche « ThiÃ¨s » au lieu de « Thiès ». */
  const BOM = '﻿';
  const csv = `${BOM}${[header.map(cell).join(';'), ...lines].join('\r\n')}\r\n`;
  const today = new Date().toISOString().slice(0, 10);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="commandes-mojo-malado-${today}.csv"`);
  res.send(csv);
}));

/* ------------------------------------------------------------------ DÉTAIL */
router.get('/:id', asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT * FROM orders WHERE id = $1 OR reference = $2', [
    Number(req.params.id) || 0, req.params.id,
  ]);
  const order = rows[0];
  if (!order) throw notFound('Commande introuvable.');

  const [items, events] = await Promise.all([
    query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [order.id]),
    query('SELECT status, message, created_at FROM order_events WHERE order_id = $1 ORDER BY created_at', [order.id]),
  ]);

  res.json({
    ...order,
    statusLabel: LABELS[order.status],
    items: items.rows,
    timeline: events.rows.map((e) => ({ ...e, label: LABELS[e.status] || e.status })),
  });
}));

/* --------------------------------------------------- CHANGEMENT DE STATUT
   Passer une commande en « annulée » remet le stock en rayon. */
router.patch('/:id/status', asyncRoute(async (req, res) => {
  const data = validate(req.body, {
    status:  { type: 'enum', values: STATUSES, required: true },
    message: { type: 'string', max: 300 },
  });

  const result = await transaction(async (client) => {
    const { rows } = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [req.params.id]);
    const order = rows[0];
    if (!order) throw notFound('Commande introuvable.');
    if (order.status === data.status) throw badRequest('La commande est déjà dans cet état.');

    const wasCancelled = order.status === 'annulee';
    const willCancel = data.status === 'annulee';

    if (willCancel && !wasCancelled) {
      const { rows: items } = await client.query(
        'SELECT variant_id, quantity FROM order_items WHERE order_id = $1 AND variant_id IS NOT NULL',
        [order.id]
      );
      for (const item of items) {
        await client.query('UPDATE product_variants SET stock = stock + $1 WHERE id = $2', [
          item.quantity, item.variant_id,
        ]);
      }
    }

    if (!willCancel && wasCancelled) {
      /* Réactivation : on retire à nouveau le stock, en vérifiant qu'il est là. */
      const { rows: items } = await client.query(
        'SELECT variant_id, quantity, name FROM order_items WHERE order_id = $1 AND variant_id IS NOT NULL',
        [order.id]
      );
      for (const item of items) {
        const { rows: [v] } = await client.query(
          'SELECT stock FROM product_variants WHERE id = $1 FOR UPDATE', [item.variant_id]
        );
        if (!v || v.stock < item.quantity) {
          throw badRequest(`Stock insuffisant pour réactiver la commande (« ${item.name} »).`);
        }
        await client.query('UPDATE product_variants SET stock = stock - $1 WHERE id = $2', [
          item.quantity, item.variant_id,
        ]);
      }
    }

    /* Une commande livrée réglée en espèces est considérée payée. */
    const paymentStatus =
      data.status === 'livree' && order.payment_status === 'en_attente' &&
      ['whatsapp', 'livraison'].includes(order.payment_method)
        ? 'paye'
        : order.payment_status;

    const { rows: [updated] } = await client.query(
      'UPDATE orders SET status = $1, payment_status = $2 WHERE id = $3 RETURNING *',
      [data.status, paymentStatus, order.id]
    );

    await client.query(
      'INSERT INTO order_events (order_id, status, message) VALUES ($1,$2,$3)',
      [order.id, data.status, data.message || LABELS[data.status]]
    );

    return updated;
  });

  res.json({ ...result, statusLabel: LABELS[result.status] });
}));

/* ------------------------------------------------------- STATUT DE PAIEMENT */
router.patch('/:id/payment', asyncRoute(async (req, res) => {
  const data = validate(req.body, {
    paymentStatus: { type: 'enum', values: ['en_attente', 'paye', 'echoue', 'rembourse'], required: true },
  });

  const { rows } = await query(
    'UPDATE orders SET payment_status = $1 WHERE id = $2 RETURNING id, payment_status',
    [data.paymentStatus, req.params.id]
  );
  if (!rows[0]) throw notFound('Commande introuvable.');

  await query(
    'INSERT INTO order_events (order_id, status, message) VALUES ($1, $2, $3)',
    [req.params.id, 'paiement', `Paiement marqué : ${data.paymentStatus.replace('_', ' ')}.`]
  );

  res.json(rows[0]);
}));

module.exports = router;
