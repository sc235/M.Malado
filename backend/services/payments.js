/**
 * ---------------------------------------------------------------------------
 * MOJO MALADO — Couche d'abstraction des paiements
 * ---------------------------------------------------------------------------
 * Un seul point d'entrée : createCheckout({ provider, ... }).
 * Le prestataire réel est choisi par la variable d'environnement
 * PAYMENT_PROVIDER (paydunya | cinetpay | naboopay | wave).
 *
 * Intérêt : changer d'agrégateur = changer une variable d'environnement,
 * sans toucher au front-end ni au reste du back-end.
 * ---------------------------------------------------------------------------
 */

const PROVIDER = (process.env.PAYMENT_PROVIDER || '').toLowerCase();

const SITE_URL = (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, '');
const API_URL = (process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, '');

/* API_URL sert à construire l'adresse de rappel du prestataire. Une valeur
   par défaut pointant vers un hébergeur abandonné serait pire que rien : les
   paiements aboutiraient, mais les notifications se perdraient en silence et
   les commandes resteraient éternellement « en attente ». */
if (PROVIDER && !process.env.API_URL) {
  console.warn(
    `⚠️  PAYMENT_PROVIDER=${PROVIDER} est actif mais API_URL n'est pas définie.\n`
    + `   Les notifications de paiement seront envoyées à ${API_URL}/api/webhooks/payment,\n`
    + '   inaccessible depuis Internet. Renseignez API_URL avec l\'adresse publique de l\'API.'
  );
}

const urls = {
  success: `${SITE_URL}/?paiement=succes`,
  error: `${SITE_URL}/?paiement=echec`,
  cancel: `${SITE_URL}/?paiement=annule`,
  webhook: `${API_URL}/api/webhooks/payment`,
};

class PaymentNotConfigured extends Error {
  constructor(msg) {
    super(msg || "Aucun prestataire de paiement n'est configuré.");
    this.code = 'PAYMENT_NOT_CONFIGURED';
    this.status = 501;
  }
}

/* -------------------------------------------------------------------------
   PayDunya — https://developers.paydunya.com
   Couvre Wave, Orange Money, Free Money et les cartes bancaires.
   ---------------------------------------------------------------------- */
async function paydunyaCheckout({ items, total, customerInfo, reference }) {
  const { PAYDUNYA_MASTER_KEY, PAYDUNYA_PRIVATE_KEY, PAYDUNYA_TOKEN } = process.env;
  if (!PAYDUNYA_MASTER_KEY || !PAYDUNYA_PRIVATE_KEY || !PAYDUNYA_TOKEN) {
    throw new PaymentNotConfigured('Clés PayDunya manquantes.');
  }

  const mode = process.env.PAYDUNYA_MODE === 'live' ? 'live' : 'test';
  const base = `https://app.paydunya.com/api/v1/checkout-invoice/create`;

  const payload = {
    invoice: {
      items: items.reduce((acc, item, i) => {
        acc[`item_${i}`] = {
          name: item.name,
          quantity: Number(item.quantity) || 1,
          unit_price: String(Number(item.price) || 0),
          total_price: String((Number(item.price) || 0) * (Number(item.quantity) || 1)),
          description: item.description || item.name,
        };
        return acc;
      }, {}),
      total_amount: Number(total),
      description: `Commande Mojo Malado ${reference}`,
    },
    store: {
      name: 'Mojo Malado',
      tagline: 'Own your roots, wear your culture',
      phone: process.env.SHOP_PHONE || '710433624',
      postal_address: 'Marché Sandaga, Rue Thiong, Dakar',
      website_url: SITE_URL,
    },
    actions: {
      cancel_url: urls.cancel,
      return_url: urls.success,
      callback_url: urls.webhook,
    },
    custom_data: {
      reference,
      client_nom: customerInfo.name,
      client_tel: customerInfo.phone,
      client_adresse: `${customerInfo.address}, ${customerInfo.city || 'Dakar'}`,
    },
  };

  const res = await fetch(base, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'PAYDUNYA-MASTER-KEY': PAYDUNYA_MASTER_KEY,
      'PAYDUNYA-PRIVATE-KEY': PAYDUNYA_PRIVATE_KEY,
      'PAYDUNYA-TOKEN': PAYDUNYA_TOKEN,
      'PAYDUNYA-MODE': mode,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (String(data.response_code) !== '00') {
    throw new Error(data.response_text || 'PayDunya a refusé la transaction.');
  }

  return { checkout_url: data.response_text, transaction_id: data.token };
}

/* -------------------------------------------------------------------------
   CinetPay — https://docs.cinetpay.com
   ---------------------------------------------------------------------- */
async function cinetpayCheckout({ total, customerInfo, reference }) {
  const { CINETPAY_API_KEY, CINETPAY_SITE_ID } = process.env;
  if (!CINETPAY_API_KEY || !CINETPAY_SITE_ID) {
    throw new PaymentNotConfigured('Clés CinetPay manquantes.');
  }

  const res = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: CINETPAY_API_KEY,
      site_id: CINETPAY_SITE_ID,
      transaction_id: reference,
      amount: Number(total),
      currency: 'XOF',
      description: `Commande Mojo Malado ${reference}`,
      customer_name: customerInfo.name,
      customer_phone_number: customerInfo.phone,
      notify_url: urls.webhook,
      return_url: urls.success,
      channels: 'ALL',
      lang: 'fr',
    }),
  });

  const data = await res.json();
  if (data.code !== '201' || !data.data?.payment_url) {
    throw new Error(data.description || 'CinetPay a refusé la transaction.');
  }

  return { checkout_url: data.data.payment_url, transaction_id: reference };
}

/* -------------------------------------------------------------------------
   NabooPay — intégration historique du projet
   ---------------------------------------------------------------------- */
async function naboopayCheckout({ items, customerInfo, provider }) {
  const apiKey = process.env.NABOO_API_KEY;
  if (!apiKey) throw new PaymentNotConfigured('Clé NabooPay manquante.');

  const methods =
    provider === 'wave' ? ['wave'] :
    provider === 'orange_money' ? ['orange_money'] :
    ['wave', 'orange_money'];

  const [firstName, ...rest] = (customerInfo.name || 'Client').trim().split(/\s+/);

  const res = await fetch('https://api.naboopay.com/api/v2/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      method_of_payment: methods,
      products: items.map((item) => ({
        name: item.name,
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        description: item.description || item.name,
      })),
      customer: {
        first_name: firstName,
        last_name: rest.join(' ') || 'MojoMalado',
        phone: normalizeSenegalPhone(customerInfo.phone),
      },
      success_url: urls.success,
      error_url: urls.error,
      is_escrow: false,
      fees_customer_side: false,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'NabooPay a refusé la transaction.');

  return {
    checkout_url: data.checkout_url || data.url,
    transaction_id: data.order_id || data.id,
  };
}

/* -------------------------------------------------------------------------
   Wave Business API — https://docs.wave.com/checkout
   Wave seul : ne gère ni Orange Money ni les cartes.
   ---------------------------------------------------------------------- */
async function waveCheckout({ total, reference }) {
  const apiKey = process.env.WAVE_API_KEY;
  if (!apiKey) throw new PaymentNotConfigured('Clé Wave manquante.');

  const res = await fetch('https://api.wave.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      amount: String(Number(total)),
      currency: 'XOF',
      success_url: urls.success,
      error_url: urls.error,
      client_reference: reference,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Wave a refusé la transaction.');

  return { checkout_url: data.wave_launch_url, transaction_id: data.id };
}

/* -------------------------------------------------------------------------
   Paystack — https://paystack.com / https://paystack.com/docs/api/
   Cartes bancaires, Wave, Orange Money, Mobile Money multi-pays.
   ---------------------------------------------------------------------- */
async function paystackCheckout({ total, customerInfo, reference }) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) throw new PaymentNotConfigured('Clé secrète Paystack (PAYSTACK_SECRET_KEY) manquante.');

  const email = (customerInfo.email || '').trim() || `${(customerInfo.phone || 'client').replace(/\D/g, '')}@mojomalado.com`;
  const currency = process.env.PAYSTACK_CURRENCY || 'XOF';

  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secretKey}`,
    },
    body: JSON.stringify({
      email,
      amount: Math.round(Number(total) * 100), // Paystack requiert le montant en sous-unités (1 XOF = 100 sous-unités)
      currency,
      reference,
      callback_url: urls.success,
      metadata: {
        client_name: customerInfo.name,
        client_phone: customerInfo.phone,
        cancel_action: urls.cancel,
      },
    }),
  });

  const data = await res.json();
  if (!data.status || !data.data?.authorization_url) {
    throw new Error(data.message || 'Paystack a refusé l’initialisation de la transaction.');
  }

  return { checkout_url: data.data.authorization_url, transaction_id: reference };
}

/* ---------------------------------------------------------------------- */

function normalizeSenegalPhone(raw = '') {
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('221')) return `+${digits}`;
  return `+221${digits.slice(-9)}`;
}

const ADAPTERS = {
  paydunya: paydunyaCheckout,
  cinetpay: cinetpayCheckout,
  naboopay: naboopayCheckout,
  wave: waveCheckout,
  paystack: paystackCheckout,
};

/**
 * Crée une session de paiement chez le prestataire configuré.
 * @param {object} params
 * @param {string} params.provider  Moyen choisi par le client : wave | orange_money | card
 * @param {Array}  params.items
 * @param {number} params.total
 * @param {object} params.customerInfo
 * @param {string} params.reference  Référence unique de commande
 * @returns {Promise<{checkout_url: string, transaction_id: string}>}
 */
async function createCheckout(params) {
  const adapter = ADAPTERS[PROVIDER];
  if (!adapter) {
    throw new PaymentNotConfigured(
      `PAYMENT_PROVIDER absent ou inconnu ("${PROVIDER || 'non défini'}"). ` +
      `Valeurs acceptées : ${Object.keys(ADAPTERS).join(', ')}.`
    );
  }

  /* Wave seul ne peut pas traiter Orange Money ni les cartes. */
  if (PROVIDER === 'wave' && params.provider !== 'wave') {
    throw new PaymentNotConfigured(
      "Le prestataire Wave ne gère que les paiements Wave. " +
      "Configurez PayDunya ou CinetPay pour Orange Money et les cartes bancaires."
    );
  }

  return adapter(params);
}

/* -------------------------------------------------------------------------
   Vérification d'un paiement auprès du prestataire.
   Utilisée par le webhook : on ne croit jamais la notification sur parole.
   Retourne : 'paye' | 'en_attente' | 'echoue'
   ---------------------------------------------------------------------- */
const VERIFIERS = {
  async paydunya(token) {
    const res = await fetch(`https://app.paydunya.com/api/v1/checkout-invoice/confirm/${token}`, {
      headers: {
        'PAYDUNYA-MASTER-KEY': process.env.PAYDUNYA_MASTER_KEY,
        'PAYDUNYA-PRIVATE-KEY': process.env.PAYDUNYA_PRIVATE_KEY,
        'PAYDUNYA-TOKEN': process.env.PAYDUNYA_TOKEN,
        'PAYDUNYA-MODE': process.env.PAYDUNYA_MODE === 'live' ? 'live' : 'test',
      },
    });
    const data = await res.json();
    if (data.status === 'completed') return 'paye';
    if (data.status === 'cancelled' || data.status === 'failed') return 'echoue';
    return 'en_attente';
  },

  async cinetpay(transactionId) {
    const res = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: process.env.CINETPAY_API_KEY,
        site_id: process.env.CINETPAY_SITE_ID,
        transaction_id: transactionId,
      }),
    });
    const data = await res.json();
    const status = data?.data?.status;
    if (status === 'ACCEPTED') return 'paye';
    if (status === 'REFUSED' || status === 'CANCELED') return 'echoue';
    return 'en_attente';
  },

  async naboopay(transactionId) {
    const res = await fetch(`https://api.naboopay.com/api/v2/transactions/${transactionId}`, {
      headers: { Authorization: `Bearer ${process.env.NABOO_API_KEY}` },
    });
    const data = await res.json();
    if (data.transaction_status === 'paid') return 'paye';
    if (['expired', 'cancelled', 'failed'].includes(data.transaction_status)) return 'echoue';
    return 'en_attente';
  },

  async wave(sessionId) {
    const res = await fetch(`https://api.wave.com/v1/checkout/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${process.env.WAVE_API_KEY}` },
    });
    const data = await res.json();
    if (data.payment_status === 'succeeded') return 'paye';
    if (data.checkout_status === 'expired') return 'echoue';
    return 'en_attente';
  },

  async paystack(reference) {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });
    const data = await res.json();
    const status = data?.data?.status;
    if (status === 'success') return 'paye';
    if (['failed', 'abandoned'].includes(status)) return 'echoue';
    return 'en_attente';
  },
};

async function verifyPayment(transactionId) {
  const verifier = VERIFIERS[PROVIDER];
  if (!verifier) throw new PaymentNotConfigured();
  return verifier(transactionId);
}

module.exports = {
  createCheckout,
  verifyPayment,
  PaymentNotConfigured,
  activeProvider: PROVIDER,
  urls,
};
