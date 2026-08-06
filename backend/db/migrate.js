require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

  try {
    console.log('→ Application du schéma…');
    await pool.query(sql);
    console.log('✅ Schéma à jour.');

    const { rows } = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log('   Tables :', rows.map((r) => r.table_name).join(', '));
  } catch (err) {
    console.error('❌ Migration impossible :', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
