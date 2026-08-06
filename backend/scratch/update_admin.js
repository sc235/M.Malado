require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../db/pool');

(async () => {
  const client = await pool.connect();
  try {
    const email = 'oumousy@mmalado.com';
    const password = 'Dcba4321@';
    const hash = await bcrypt.hash(password, 12);
    
    // Delete any old admin rows if we want, or just insert/update
    await client.query(
      `INSERT INTO admins (email, password_hash, name)
       VALUES ($1, $2, 'Administration')
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [email, hash]
    );
    console.log(`✅ Admin account created/updated with email: ${email}`);
  } catch (err) {
    console.error('❌ Error updating admin:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
})();
