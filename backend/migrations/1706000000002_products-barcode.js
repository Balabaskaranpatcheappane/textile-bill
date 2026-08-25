/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS barcode TEXT;

    -- Unique per product, but many-null allowed (products without a
    -- barcode yet). A partial unique index gives us both.
    CREATE UNIQUE INDEX IF NOT EXISTS ux_products_barcode
      ON products (barcode) WHERE barcode IS NOT NULL;

    -- Backfill: give every existing product a stable auto barcode.
    UPDATE products
       SET barcode = 'TX' || LPAD(id::text, 8, '0')
     WHERE barcode IS NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS ux_products_barcode;
    ALTER TABLE products DROP COLUMN IF EXISTS barcode;
  `);
};
