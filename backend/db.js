require('dotenv').config();
const { Pool, types } = require('pg');

// Return NUMERIC (OID 1700) and BIGINT (OID 20) as JS numbers instead of
// strings — safe here because our money/qty columns fit well within
// Number.MAX_SAFE_INTEGER.
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
types.setTypeParser(20,   (v) => (v === null ? null : parseInt(v, 10)));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX) || 10,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => console.error('Unexpected PG pool error', err));

module.exports = { pool };
