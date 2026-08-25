/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS settings (
      id                  INTEGER PRIMARY KEY CHECK (id = 1),
      shop_name           TEXT        NOT NULL DEFAULT 'My Textiles Shop',
      address             TEXT        NOT NULL DEFAULT '',
      phone               TEXT        NOT NULL DEFAULT '',
      gstin               TEXT        NOT NULL DEFAULT '',
      email               TEXT        NOT NULL DEFAULT '',
      logo                BYTEA,
      logo_mime           TEXT,
      default_paper_size  TEXT        NOT NULL DEFAULT 'a4'
                                       CHECK (default_paper_size IN ('58mm','80mm','a4')),
      footer_text         TEXT        NOT NULL DEFAULT 'Thank you for your purchase!',
      invoice_prefix      TEXT        NOT NULL DEFAULT 'INV',
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS settings;');
};
