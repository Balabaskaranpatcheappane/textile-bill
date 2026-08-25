const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'textiles.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    hsn        TEXT,
    unit       TEXT    NOT NULL DEFAULT 'MTR',
    price      REAL    NOT NULL DEFAULT 0,
    stock      REAL    NOT NULL DEFAULT 0,
    gst        REAL    NOT NULL DEFAULT 5,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS customers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    phone      TEXT,
    gstin      TEXT,
    address    TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_no    TEXT    NOT NULL UNIQUE,
    customer_id   INTEGER,
    customer_name TEXT    NOT NULL,
    customer_gstin TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    invoice_date  TEXT    NOT NULL DEFAULT (date('now')),
    subtotal      REAL    NOT NULL DEFAULT 0,
    gst_total     REAL    NOT NULL DEFAULT 0,
    discount      REAL    NOT NULL DEFAULT 0,
    grand_total   REAL    NOT NULL DEFAULT 0,
    payment_mode  TEXT    NOT NULL DEFAULT 'CASH',
    notes         TEXT,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    product_id INTEGER,
    name       TEXT    NOT NULL,
    hsn        TEXT,
    unit       TEXT,
    qty        REAL    NOT NULL,
    price      REAL    NOT NULL,
    gst        REAL    NOT NULL DEFAULT 0,
    amount     REAL    NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
`);

// Seed a handful of sample rows on first run so the UI is not empty.
const productCount = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
if (productCount === 0) {
  const insert = db.prepare(
    `INSERT INTO products (name, hsn, unit, price, stock, gst)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const seed = db.transaction((rows) => rows.forEach((r) => insert.run(...r)));
  seed([
    ['Cotton Saree - Red',       '5208', 'PCS', 850,  40, 5],
    ['Silk Saree - Kanchipuram', '5007', 'PCS', 4500, 12, 5],
    ['Men Shirt - Formal White', '6205', 'PCS', 950,  60, 12],
    ['Kids T-shirt',             '6109', 'PCS', 250,  120, 5],
    ['Bedsheet Double',          '6302', 'PCS', 1200, 25, 12],
    ['Cotton Fabric',            '5208', 'MTR', 180,  500, 5],
  ]);
}

module.exports = db;
