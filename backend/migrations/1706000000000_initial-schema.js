/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE products (
      id         SERIAL PRIMARY KEY,
      name       TEXT           NOT NULL,
      hsn        TEXT,
      unit       TEXT           NOT NULL DEFAULT 'MTR',
      price      NUMERIC(12,2)  NOT NULL DEFAULT 0,
      stock      NUMERIC(12,2)  NOT NULL DEFAULT 0,
      gst        NUMERIC(5,2)   NOT NULL DEFAULT 5,
      created_at TIMESTAMPTZ    NOT NULL DEFAULT NOW()
    );

    CREATE TABLE customers (
      id         SERIAL PRIMARY KEY,
      name       TEXT        NOT NULL,
      phone      TEXT,
      gstin      TEXT,
      address    TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE invoices (
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

    CREATE TABLE invoice_items (
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

    CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
    CREATE INDEX idx_invoices_date         ON invoices(invoice_date);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS invoice_items;
    DROP TABLE IF EXISTS invoices;
    DROP TABLE IF EXISTS customers;
    DROP TABLE IF EXISTS products;
  `);
};
