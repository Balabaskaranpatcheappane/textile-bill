/* eslint-disable camelcase */

// Rename the existing 'staff' role to 'cashier' and allow both roles
// side-by-side for backward compatibility. The CHECK constraint was
// named automatically by Postgres, so we drop it by discovery rather
// than assume a fixed name.

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    DO $$
    DECLARE cn TEXT;
    BEGIN
      SELECT conname INTO cn
        FROM pg_constraint
       WHERE conrelid = 'users'::regclass
         AND contype  = 'c'
         AND pg_get_constraintdef(oid) ILIKE '%role%';
      IF cn IS NOT NULL THEN
        EXECUTE 'ALTER TABLE users DROP CONSTRAINT ' || quote_ident(cn);
      END IF;
    END $$;

    UPDATE users SET role = 'cashier' WHERE role = 'staff';

    ALTER TABLE users
      ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'cashier'));

    ALTER TABLE users ALTER COLUMN role SET DEFAULT 'cashier';
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DO $$
    DECLARE cn TEXT;
    BEGIN
      SELECT conname INTO cn
        FROM pg_constraint
       WHERE conrelid = 'users'::regclass
         AND contype  = 'c'
         AND pg_get_constraintdef(oid) ILIKE '%role%';
      IF cn IS NOT NULL THEN
        EXECUTE 'ALTER TABLE users DROP CONSTRAINT ' || quote_ident(cn);
      END IF;
    END $$;

    UPDATE users SET role = 'staff' WHERE role = 'cashier';

    ALTER TABLE users
      ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'staff'));

    ALTER TABLE users ALTER COLUMN role SET DEFAULT 'staff';
  `);
};
