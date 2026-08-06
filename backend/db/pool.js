const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL manquant. Copiez backend/.env.example vers backend/.env.');
  process.exit(1);
}

/* ---------------------------------------------------------------------- TLS
   Le chiffrement se règle explicitement avec PGSSL :

     require   TLS activé, certificat non vérifié — hébergeurs gérés (Render,
               Neon, Railway en connexion publique) dont le certificat
               intermédiaire est refusé par Node par défaut.
     disable   aucun TLS — PostgreSQL local, ou Railway via son réseau privé
               (« postgres.railway.internal »), qui ne présente pas de
               certificat : forcer TLS y provoque « server does not support SSL ».

   Sans PGSSL, l'hôte décide. Cette déduction reste un filet de sécurité, pas
   une règle sur laquelle s'appuyer : l'adresse publique de Railway
   (« …proxy.rlwy.net ») ne contient aucun mot reconnaissable. En production,
   posez PGSSL explicitement. */
function sslConfig() {
  const mode = (process.env.PGSSL || '').trim().toLowerCase();
  if (mode === 'require' || mode === 'true')  return { rejectUnauthorized: false };
  if (mode === 'disable' || mode === 'false') return false;

  const host = (() => {
    try { return new URL(connectionString).hostname; } catch { return connectionString; }
  })();

  if (/\.railway\.internal$/.test(host)) return false;         // réseau privé Railway
  if (/^(localhost|127\.0\.0\.1|::1)$/.test(host)) return false;
  if (/render\.com|neon\.tech|rlwy\.net|railway\.app|supabase\.co/.test(host)) {
    return { rejectUnauthorized: false };
  }
  return false;
}

const pool = new Pool({
  connectionString,
  ssl: sslConfig(),
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[pg] erreur inattendue sur un client inactif :', err.message);
});

const query = (text, params) => pool.query(text, params);

/**
 * Exécute plusieurs requêtes dans une transaction.
 * Rollback automatique si le callback lève une erreur.
 *
 *   await transaction(async (client) => {
 *     await client.query(...);
 *   });
 */
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, transaction };
