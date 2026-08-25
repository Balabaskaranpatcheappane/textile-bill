/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      TEXT        NOT NULL UNIQUE,
      password_hash TEXT        NOT NULL,
      name          TEXT        NOT NULL,
      role          TEXT        NOT NULL DEFAULT 'staff'
                                 CHECK (role IN ('admin', 'staff')),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login    TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_users_username ON users(LOWER(username));

    -- Track which user created an invoice, without breaking existing rows.
    ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE invoices DROP COLUMN IF EXISTS created_by;
    DROP TABLE IF EXISTS users;
  `);
};
