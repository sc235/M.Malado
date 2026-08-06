const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const { query, transaction } = require('../db/pool');
const { validate } = require('../lib/validate');
const { asyncRoute, badRequest, notFound, conflict } = require('../lib/errors');
const { optionalAuth, requireCustomer } = require('../middleware/auth');
const { createCheckout } = require('../services/payments');
const { resolvePromo } = require('../lib/promo');

const FREE_SHIPPING_FROM = Number(process.env.FREE_SHIPPING_FROM || 50000);
const SHIPPING_DAKAR = Number(process.env.SHIPPING_DAKAR || 2000);
const SHIPPING_REGIONS = Number(process.env.SHIPPING_REGIONS || 3500);

const STATUS_LABELS = {
  en_attente:  'Commande reçue',
  confirmee:   'Commande confirmée',
  preparation: 'En préparation',
  expediee:    'En cours de livraison',
  livree:      'Livrée',
  annulee:     'Annulée',
};

const reference = () =>
  `MM${new Date().getFullYear().toString().slice(2)}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

function shippingFor(city, subtotal) {
  if (subtotal >= FREE_SHIPPING_FROM) return 0;
  return /dakar|pikine|guediawaye|rufisque|keur massar/i.test(city || '')
    ? SHIPPING_DAKAR
    : SHIPPING_REGIONS;
}

/* ==========================================================================
   POST /orders — créer une commande
   Le prix et le stock sont TOUJOURS relus en base : rien de ce qui vient
   du navigateur n'est utilisé pour calculer le montant.
   ========================================================================== */
router.post('/', optionalAuth, asyncRoute(async (req, res) => {
  const data = validate(req.body, {
    items:         { type: 'array', required: true, min: 1, max: 40 },
    customerName:  { type: 'string', required: true, min: 3, max: 80 },
    customerPhone: { type: 'phone', required: true },
    customerEmail: { type: 'email' },
    addressLine:   { type: 'string', required: true, min: 5, max: 200 },
    city:          { type: 'string', max: 60, default: 'Dakar' },
    note:          { type: 'string', max: 400 },
    promoCode:     { type: 'string', max: 40 },
    paymentMethod: { type: 'enum', values: ['wave', 'orange_money', 'card', 'whatsapp', 'livraison'], default: 'whatsapp' },
  });

  /* Normalisation : une ligne = { variantId, quantity } */
  const lines = data.items.map((item) => ({
    variantId: Number(item.variantId),
    quantity: Math.max(1, Math.min(20, Number(item.quantity) || 1)),
  }));

  if (lines.some((l) => !Number.isInteger(l.variantId))) {
    throw badRequest('Panier invalide : déclinaison manquante sur un article.');
  }

  /* Fusion des doublons éventuels (même variante envoyée deux fois). */
  const merged = new Map();
  for (const line of lines) {
    merged.set(line.variantId, (merged.get(line.variantId) || 0) + line.quantity);
  }

  const order = await transaction(async (client) => {
    /* FOR UPDATE verrouille les lignes de stock jusqu'au COMMIT :
       deux clientes qui achètent le dernier article en même temps ne
       peuvent pas passer toutes les deux. */
    const { rows: variants } = await client.query(
      `SELECT v.id, v.size, v.color, v.stock, v.is_active,
              COALESCE(v.price, p.base_price) AS price,
              p.id AS product_id, p.name, p.is_active AS product_active,
              (SELECT url FROM product_images i WHERE i.product_id = p.id
                ORDER BY i.position, i.id LIMIT 1) AS image
       FROM product_variants v
       JOIN products p ON p.id = v.product_id
       WHERE v.id = ANY($1)
       FOR UPDATE OF v`,
      [[...merged.keys()]]
    );

    const byId = new Map(variants.map((v) => [v.id, v]));
    const items = [];
    let subtotal = 0;

    for (const [variantId, quantity] of merged) {
      const v = byId.get(variantId);
      if (!v || !v.is_active || !v.product_active) {
        throw notFound('Un article de votre panier n\'est plus disponible.');
      }
      if (v.stock < quantity) {
        throw conflict(
          v.stock === 0
            ? `« ${v.name} » (${[v.size, v.color].filter(Boolean).join(' · ') || 'unique'}) est épuisé.`
            : `Il ne reste que ${v.stock} exemplaire(s) de « ${v.name} ».`
        );
      }
      subtotal += v.price * quantity;
      items.push({ ...v, quantity });
    }

    const shipping = shippingFor(data.city, subtotal);

    /* Le code promo est relu et recalculé ici, dans la transaction : entre
       l'aperçu affiché à la cliente et la validation, il a pu expirer ou
       atteindre sa limite. FOR UPDATE empêche par ailleurs deux commandes
       simultanées de consommer la dernière utilisation d'un même code. */
    let discount = 0;
    let promoCode = null;

    if (data.promoCode) {
      const applied = await resolvePromo(client, data.promoCode, subtotal, shipping, { lock: true });
      discount = applied.discount;
      promoCode = applied.promo.code;
      await client.query(
        'UPDATE promo_codes SET used_count = used_count + 1 WHERE id = $1',
        [applied.promo.id]
      );
    }

    const total = subtotal + shipping - discount;
    const ref = reference();

    const { rows: [created] } = await client.query(
      `INSERT INTO orders
         (reference, customer_id, customer_name, customer_phone, customer_email,
          address_line, city, note, subtotal, shipping, discount, promo_code,
          total, payment_method)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [ref, req.user?.id || null, data.customerName, data.customerPhone, data.customerEmail || null,
       data.addressLine, data.city, data.note || null, subtotal, shipping, discount, promoCode,
       total, data.paymentMethod]
    );

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items
           (order_id, product_id, variant_id, name, size, color, image, unit_price, quantity)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [created.id, item.product_id, item.id, item.name, item.size, item.color,
         item.image, item.price, item.quantity]
      );
      await client.query(
        'UPDATE product_variants SET stock = stock - $1 WHERE id = $2',
        [item.quantity, item.id]
      );
    }

    await client.query(
      `INSERT INTO order_events (order_id, status, message)
       VALUES ($1, 'en_attente', 'Commande enregistrée, en attente de confirmation.')`,
      [created.id]
    );

    return { ...created, items };
  });

  res.status(201).json({
    reference: order.reference,
    total: order.total,
    subtotal: order.subtotal,
    shipping: order.shipping,
    discount: order.discount,
    promoCode: order.promo_code,
    status: order.status,
    items: order.items.map((i) => ({
      name: i.name, size: i.size, color: i.color, quantity: i.quantity, price: i.price,
    })),
  });
}));

/* ==========================================================================
   POST /orders/promo — vérifier un code AVANT de valider la commande.
   Ne consomme rien : c'est un simple aperçu. Le montant qui fait foi est
   celui recalculé à la création de la commande.
   ========================================================================== */
router.post('/promo', asyncRoute(async (req, res) => {
  const data = validate(req.body, {
    code:  { type: 'string', required: true, max: 40 },
    items: { type: 'array', required: true, min: 1, max: 40 },
    city:  { type: 'string', max: 60, default: 'Dakar' },
  });

  const wanted = new Map();
  for (const item of data.items) {
    const id = Number(item.variantId);
    if (!Number.isInteger(id)) throw badRequest('Panier invalide.');
    wanted.set(id, (wanted.get(id) || 0) + Math.max(1, Math.min(20, Number(item.quantity) || 1)));
  }

  /* Le sous-total est relu en base : un panier gonflé côté navigateur ne
     doit pas permettre d'atteindre le minimum d'achat d'un code. */
  const { rows } = await query(
    `SELECT v.id, COALESCE(v.price, p.base_price) AS price
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
     WHERE v.id = ANY($1) AND v.is_active AND p.is_active`,
    [[...wanted.keys()]]
  );

  let subtotal = 0;
  for (const row of rows) subtotal += row.price * (wanted.get(row.id) || 0);

  const shipping = shippingFor(data.city, subtotal);
  /* resolvePromo attend un objet muni d'une méthode .query, pour pouvoir
     fonctionner aussi bien hors transaction (ici) que dans une transaction. */
  const { promo, discount, label } = await resolvePromo({ query }, data.code, subtotal, shipping);

  res.json({
    code: promo.code,
    kind: promo.kind,
    value: promo.value,
    label,
    discount,
    subtotal,
    shipping,
    total: subtotal + shipping - discount,
  });
}));

/* ==========================================================================
   POST /orders/:reference/pay — obtenir un lien de paiement
   ========================================================================== */
router.post('/:reference/pay', asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT * FROM orders WHERE reference = $1', [req.params.reference]);
  const order = rows[0];
  if (!order) throw notFound('Commande introuvable.');
  if (order.payment_status === 'paye') throw conflict('Cette commande est déjà réglée.');

  const items = await query(
    'SELECT name, unit_price AS price, quantity FROM order_items WHERE order_id = $1',
    [order.id]
  );

  try {
    const { checkout_url, transaction_id } = await createCheckout({
      provider: order.payment_method,
      items: items.rows,
      total: order.total,
      customerInfo: {
        name: order.customer_name,
        phone: order.customer_phone,
        address: order.address_line,
        city: order.city,
      },
      reference: order.reference,
    });

    await query('UPDATE orders SET transaction_id = $1 WHERE id = $2', [
      transaction_id || order.reference, order.id,
    ]);

    res.json({ checkout_url });
  } catch (err) {
    /* 501 = aucun prestataire configuré. Le site bascule alors sur le
       transfert manuel + confirmation WhatsApp, sans perdre la commande. */
    res.status(err.status || 502).json({ error: err.message, reference: order.reference });
  }
}));

/* ==========================================================================
   GET /orders/mine — commandes de la cliente connectée
   ========================================================================== */
router.get('/mine', requireCustomer, asyncRoute(async (req, res) => {
  const { rows } = await query(
    `SELECT o.id, o.reference, o.status, o.payment_status, o.payment_method,
            o.total, o.created_at,
            COUNT(i.id)::INT AS item_count,
            (SELECT image FROM order_items WHERE order_id = o.id LIMIT 1) AS preview
     FROM orders o
     LEFT JOIN order_items i ON i.order_id = o.id
     WHERE o.customer_id = $1
     GROUP BY o.id
     ORDER BY o.created_at DESC`,
    [req.user.id]
  );
  res.json(rows.map((o) => ({ ...o, statusLabel: STATUS_LABELS[o.status] })));
}));

/* ==========================================================================
   GET /orders/track/:reference?phone=... — suivi public
   La référence seule ne suffit pas : le téléphone sert de second facteur.
   ========================================================================== */
router.get('/track/:reference', optionalAuth, asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT * FROM orders WHERE reference = $1', [req.params.reference]);
  const order = rows[0];
  if (!order) throw notFound('Aucune commande ne correspond à cette référence.');

  const isOwner = req.user && order.customer_id === req.user.id;
  if (!isOwner) {
    const given = String(req.query.phone || '').replace(/\D/g, '').slice(-9);
    const real = String(order.customer_phone || '').replace(/\D/g, '').slice(-9);
    if (!given || given !== real) {
      throw badRequest('Indiquez le numéro de téléphone utilisé lors de la commande.');
    }
  }

  const [items, events] = await Promise.all([
    query('SELECT name, size, color, image, unit_price, quantity FROM order_items WHERE order_id = $1', [order.id]),
    query('SELECT status, message, created_at FROM order_events WHERE order_id = $1 ORDER BY created_at', [order.id]),
  ]);

  res.json({
    reference: order.reference,
    status: order.status,
    statusLabel: STATUS_LABELS[order.status],
    paymentStatus: order.payment_status,
    paymentMethod: order.payment_method,
    customerName: order.customer_name,
    addressLine: order.address_line,
    city: order.city,
    subtotal: order.subtotal,
    shipping: order.shipping,
    discount: order.discount,
    promoCode: order.promo_code,
    total: order.total,
    createdAt: order.created_at,
    items: items.rows,
    timeline: events.rows.map((e) => ({ ...e, label: STATUS_LABELS[e.status] || e.status })),
  });
}));

module.exports = router;
module.exports.STATUS_LABELS = STATUS_LABELS;
