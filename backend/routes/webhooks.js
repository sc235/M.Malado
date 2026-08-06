const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const { query } = require('../db/pool');
const { asyncRoute } = require('../lib/errors');
const { verifyPayment, activeProvider } = require('../services/payments');

/**
 * Notification de paiement envoyée par le prestataire.
 *
 * Règle d'or : on ne fait JAMAIS confiance au contenu du message.
 * On en extrait uniquement la référence, puis on interroge l'API du
 * prestataire pour connaître le vrai statut. Sans cela, n'importe qui
 * pouvant appeler cette URL déclarerait ses commandes payées.
 */
router.post('/payment', asyncRoute(async (req, res) => {
  const payload = req.body || {};

  const reference =
    payload.client_reference || payload.reference || payload.transaction_id ||
    payload.order_id || payload.cpm_trans_id || payload.data?.reference || payload.id;

  if (!reference) {
    console.warn('[webhook] notification sans référence exploitable');
    return res.status(400).json({ error: 'Référence manquante.' });
  }

  /* Signature optionnelle : si le prestataire en fournit une, on la vérifie. */
  const secret = process.env.WEBHOOK_SECRET;
  const signature = req.headers['x-signature'] || req.headers['x-webhook-signature'];
  if (secret && signature) {
    const expected = crypto.createHmac('sha256', secret)
      .update(JSON.stringify(payload)).digest('hex');
    const a = Buffer.from(String(signature));
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      console.warn('[webhook] signature invalide pour', reference);
      return res.status(401).json({ error: 'Signature invalide.' });
    }
  }

  const { rows } = await query(
    'SELECT * FROM orders WHERE reference = $1 OR transaction_id = $1',
    [String(reference)]
  );
  const order = rows[0];
  if (!order) {
    console.warn('[webhook] commande inconnue :', reference);
    return res.status(404).json({ error: 'Commande inconnue.' });
  }

  /* Vérification auprès du prestataire — la source de vérité. */
  let status;
  try {
    status = await verifyPayment(order.transaction_id || order.reference);
  } catch (err) {
    console.error('[webhook] vérification impossible :', err.message);
    return res.status(502).json({ error: 'Vérification impossible auprès du prestataire.' });
  }

  if (status === order.payment_status) {
    return res.json({ ok: true, unchanged: true });
  }

  await query('UPDATE orders SET payment_status = $1 WHERE id = $2', [status, order.id]);

  if (status === 'paye' && order.status === 'en_attente') {
    await query("UPDATE orders SET status = 'confirmee' WHERE id = $1", [order.id]);
    await query(
      `INSERT INTO order_events (order_id, status, message)
       VALUES ($1, 'confirmee', $2)`,
      [order.id, `Paiement reçu (${activeProvider || order.payment_method}). Commande confirmée.`]
    );
  } else {
    await query(
      'INSERT INTO order_events (order_id, status, message) VALUES ($1, $2, $3)',
      [order.id, 'paiement', `Statut du paiement : ${status}.`]
    );
  }

  console.log(`[webhook] ${order.reference} → paiement ${status}`);
  res.json({ ok: true, status });
}));

module.exports = router;
