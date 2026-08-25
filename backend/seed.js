/**
 * Idempotent seed: run after `npm run migrate`.
 *   - Inserts sample products if the table is empty.
 *   - Creates a default admin user (admin / admin123) if no users exist.
 *
 * Both defaults are meant to get you into the UI on a fresh install —
 * change the password immediately.
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('./db');

async function main() {
  const { rows: productRows } = await pool.query('SELECT COUNT(*)::int AS n FROM products');
  if (productRows[0].n === 0) {
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
    console.log(`Seeded ${seed.length} sample products.`);
  } else {
    console.log(`Products table already has ${productRows[0].n} rows — skipping.`);
  }

  const { rows: userRows } = await pool.query('SELECT COUNT(*)::int AS n FROM users');
  if (userRows[0].n === 0) {
    const username = 'admin';
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (username, password_hash, name, role)
       VALUES ($1, $2, $3, 'admin')`,
      [username, hash, 'Administrator'],
    );
    console.log(`Created default admin user — username: ${username}  password: ${password}`);
    console.log('*** Change the password immediately from the UI. ***');
  } else {
    console.log(`Users table already has ${userRows[0].n} rows — skipping.`);
  }
}

main()
  .then(() => pool.end())
  .catch((err) => { console.error(err); pool.end(); process.exit(1); });
