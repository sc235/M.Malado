/**
 * Client HTTP unique de la boutique.
 * Gère l'URL de base, le jeton d'authentification, les délais et les erreurs.
 */

const LOCAL = ['localhost', '127.0.0.1', '0.0.0.0'];
const isLocal = LOCAL.includes(window.location.hostname);

/* L'adresse de l'API vient de VITE_API_URL, définie dans les variables
   d'environnement de Vercel. En développement, le serveur local sert de
   valeur par défaut.

   Aucune adresse de production n'est écrite en dur ici : une valeur périmée
   ferait échouer toute la boutique en silence, sans indice à la console. */
export const API_BASE = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '')
  || (isLocal ? 'http://localhost:5000/api' : '');

if (!API_BASE) {
  console.error(
    'VITE_API_URL n\'est pas définie : la boutique ne peut joindre aucune API.\n'
    + 'Renseignez-la dans Vercel › Settings › Environment Variables, par exemple\n'
    + 'https://mojomalado-api.up.railway.app/api — puis redéployez.'
  );
}

/* --------------------------------------------------------------- Coordonnées */
export const SHOP = {
  name: 'Mojo Malado',
  tagline: 'Own your roots, Wear your culture',
  whatsapp: '221710433624',
  whatsappDisplay: '+221 71 043 36 24',
  mobileMoney: '710433624',
  mobileMoneyDisplay: '71 043 36 24',
  email: 'mojomalado@gmail.com',
  address: 'Marché Sandaga, Rue Thiong — Dakar, Sénégal',
  tiktok: 'https://www.tiktok.com/@mojomalado_?lang=fr',
  freeShippingFrom: 50000,
  shippingDakar: 2000,
  shippingRegions: 3500,
};

export const waLink = (message) =>
  `https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(message)}`;

/* ------------------------------------------------------------------- Jetons */
const TOKEN_KEYS = { customer: 'mojo_token', admin: 'mojo_admin_token' };

export const getToken = (scope = 'customer') => localStorage.getItem(TOKEN_KEYS[scope]);
export const setToken = (token, scope = 'customer') =>
  token ? localStorage.setItem(TOKEN_KEYS[scope], token) : localStorage.removeItem(TOKEN_KEYS[scope]);

/* ------------------------------------------------------------------- Erreur */
export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details || null;
  }
}

/**
 * @param {string} path   ex. '/products?limite=12'
 * @param {object} options { method, body, scope, timeout }
 */
export async function api(path, options = {}) {
  const { method = 'GET', body, scope = 'customer', timeout = 20000, headers = {} } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const token = getToken(scope);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    const data = isJson ? await res.json() : null;

    if (!res.ok) {
      /* Jeton expiré : on nettoie pour éviter une boucle de requêtes refusées. */
      if (res.status === 401 && token) setToken(null, scope);
      throw new ApiError(data?.error || `Erreur ${res.status}`, res.status, data?.details);
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError(
        "Le serveur met trop de temps à répondre. Vérifiez votre connexion.", 408
      );
    }
    if (err instanceof ApiError) throw err;
    throw new ApiError("Impossible de joindre le serveur.", 0);
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------- Raccourcis typés */
export const catalog = {
  categories: () => api('/categories'),
  products: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
    );
    return api(`/products?${qs}`);
  },
  product: (key) => api(`/products/${key}`),
  review: (id, body) => api(`/products/${id}/reviews`, { method: 'POST', body }),
  reviews: (limite = 3) => api(`/reviews?limite=${limite}`),
  newsletter: (email) => api('/newsletter', { method: 'POST', body: { email } }),
};

export const ordersApi = {
  create: (body) => api('/orders', { method: 'POST', body }),
  pay: (reference) => api(`/orders/${reference}/pay`, { method: 'POST', body: {} }),
  /* Simple aperçu : la remise qui fait foi est recalculée à la validation. */
  checkPromo: (code, items, city) =>
    api('/orders/promo', { method: 'POST', body: { code, items, city } }),
  mine: () => api('/orders/mine'),
  track: (reference, phone) =>
    api(`/orders/track/${encodeURIComponent(reference)}${phone ? `?phone=${encodeURIComponent(phone)}` : ''}`),
};

export const authApi = {
  register: (body) => api('/auth/register', { method: 'POST', body }),
  login: (body) => api('/auth/login', { method: 'POST', body }),
  me: () => api('/auth/me'),
  update: (body) => api('/auth/me', { method: 'PATCH', body }),
  password: (body) => api('/auth/me/password', { method: 'POST', body }),
  addAddress: (body) => api('/auth/me/addresses', { method: 'POST', body }),
  removeAddress: (id) => api(`/auth/me/addresses/${id}`, { method: 'DELETE' }),
};

const admin = (path, options = {}) => api(`/admin${path}`, { ...options, scope: 'admin' });

/**
 * Télécharge un fichier depuis une route protégée.
 * Un simple <a href> ne transporterait pas le jeton d'administration :
 * on récupère donc le contenu, puis on déclenche l'enregistrement.
 */
async function downloadAdmin(path, fallbackName) {
  const res = await fetch(`${API_BASE}/admin${path}`, {
    headers: { Authorization: `Bearer ${getToken('admin')}` },
  });
  if (!res.ok) {
    if (res.status === 401) setToken(null, 'admin');
    throw new ApiError('Export impossible. Reconnectez-vous et réessayez.', res.status);
  }

  const disposition = res.headers.get('content-disposition') || '';
  const named = /filename="?([^"]+)"?/.exec(disposition);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = named?.[1] || fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  /* Libère la mémoire retenue par le blob une fois le téléchargement lancé. */
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const adminApi = {
  login: (body) => api('/admin/login', { method: 'POST', body }),
  session: () => admin('/session'),
  stats: () => admin('/stats'),
  products: (params = {}) => admin(`/products?${new URLSearchParams(params)}`),
  product: (id) => admin(`/products/${id}`),
  createProduct: (body) => admin('/products', { method: 'POST', body }),
  updateProduct: (id, body) => admin(`/products/${id}`, { method: 'PUT', body }),
  deleteProduct: (id) => admin(`/products/${id}`, { method: 'DELETE' }),
  setStock: (variantId, stock) =>
    admin(`/products/variants/${variantId}/stock`, { method: 'PATCH', body: { stock } }),
  orders: (params = {}) => admin(`/orders?${new URLSearchParams(params)}`),
  order: (id) => admin(`/orders/${id}`),
  exportOrders: (params = {}) =>
    downloadAdmin(`/orders/export.csv?${new URLSearchParams(params)}`, 'commandes.csv'),
  setStatus: (id, status, message) =>
    admin(`/orders/${id}/status`, { method: 'PATCH', body: { status, message } }),
  setPayment: (id, paymentStatus) =>
    admin(`/orders/${id}/payment`, { method: 'PATCH', body: { paymentStatus } }),
  categories: () => admin('/categories'),
  createCategory: (body) => admin('/categories', { method: 'POST', body }),
  deleteCategory: (id) => admin(`/categories/${id}`, { method: 'DELETE' }),
  promos: () => admin('/promos'),
  createPromo: (body) => admin('/promos', { method: 'POST', body }),
  togglePromo: (id, isActive) => admin(`/promos/${id}`, { method: 'PATCH', body: { isActive } }),
  deletePromo: (id) => admin(`/promos/${id}`, { method: 'DELETE' }),
  customers: (params = {}) => admin(`/customers?${new URLSearchParams(params)}`),
  reviews: (statut = 'attente') => admin(`/reviews?statut=${statut}`),
  moderateReview: (id, isPublished) =>
    admin(`/reviews/${id}`, { method: 'PATCH', body: { isPublished } }),
  deleteReview: (id) => admin(`/reviews/${id}`, { method: 'DELETE' }),
};
