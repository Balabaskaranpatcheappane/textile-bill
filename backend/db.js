require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Fall back to individual PG* env vars if DATABASE_URL is unset —
  // node-postgres already reads PGHOST/PGUSER/PGPASSWORD/PGDATABASE/PGPORT.
  max: Number(process.env.PG_POOL_MAX) || 10,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => console.error('Unexpected PG pool error', err));

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id         SERIAL PRIMARY KEY,
      name       TEXT           NOT NULL,
      hsn        TEXT,
      unit       TEXT           NOT NULL DEFAULT 'MTR',
      price      NUMERIC(12,2)  NOT NULL DEFAULT 0,
      stock      NUMERIC(12,2)  NOT NULL DEFAULT 0,
      gst        NUMERIC(5,2)   NOT NULL DEFAULT 5,
      created_at TIMESTAMPTZ    NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS customers (
      id         SERIAL PRIMARY KEY,
      name       TEXT        NOT NULL,
      phone      TEXT,
      gstin      TEXT,
      address    TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id               SERIAL PRIMARY KEY,
      invoice_no       TEXT           NOT NULL UNIQUE,
      customer_id      INTEGER        REFERENCES customers(id) ON DELETE SET NULL,
      customer_name    TEXT           NOT NULL,
      customer_gstin   TEXT,
      customer_phone   TEXT,
      customer_address TEXT,
      invoice_date     DATE           NOT NULL DEFAULT CURRENT_DATE,
      subtotal         NUMERIC(12,2)  NOT NULL DEFAULT 0,
      gst_total        NUMERIC(12,2)  NOT NULL DEFAULT 0,
      discount         NUMERIC(12,2)  NOT NULL DEFAULT 0,
      grand_total      NUMERIC(12,2)  NOT NULL DEFAULT 0,
      payment_mode     TEXT           NOT NULL DEFAULT 'CASH',
      notes            TEXT,
      created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id         SERIAL PRIMARY KEY,
      invoice_id INTEGER        NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      product_id INTEGER        REFERENCES products(id) ON DELETE SET NULL,
      name       TEXT           NOT NULL,
      hsn        TEXT,
      unit       TEXT,
      qty        NUMERIC(12,3)  NOT NULL,
      price      NUMERIC(12,2)  NOT NULL,
      gst        NUMERIC(5,2)   NOT NULL DEFAULT 0,
      amount     NUMERIC(12,2)  NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
  `);

  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM products');
  if (rows[0].n === 0) {
    const seed = [
      ['Cotton Saree - Red',       '5208', 'PCS', 850,  40, 5],
      ['Silk Saree - Kanchipuram', '5007', 'PCS', 4500, 12, 5],
      ['Men Shirt - Formal White', '6205', 'PCS', 950,  60, 12],
      ['Kids T-shirt',             '6109', 'PCS', 250,  120, 5],
      ['Bedsheet Double',          '6302', 'PCS', 1200, 25, 12],
      ['Cotton Fabric',            '5208', 'MTR', 180,  500, 5],
    ];
    for (const r of seed) {
      await pool.query(
        `INSERT INTO products (name, hsn, unit, price, stock, gst)
         VALUES ($1, $2, $3, $4, $5, $6)`, r,
      );
    }
    console.log('Seeded sample products.');
  }
}

module.exports = { pool, init };
