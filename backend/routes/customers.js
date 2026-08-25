const router = require('express').Router();
const { pool } = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const { q } = req.query;
    const sql = q
      ? `SELECT * FROM customers
          WHERE name ILIKE $1 OR phone ILIKE $1 OR gstin ILIKE $1
          ORDER BY name`
      : `SELECT * FROM customers ORDER BY name`;
    const args = q ? [`%${q}%`] : [];
    const { rows } = await pool.query(sql, args);
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Customer not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, phone, gstin, address } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });
    const { rows } = await pool.query(
      `INSERT INTO customers (name, phone, gstin, address)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, phone || null, gstin || null, address || null],
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { rows: existing } = await pool.query(
      'SELECT * FROM customers WHERE id = $1', [req.params.id],
    );
    if (!existing[0]) return res.status(404).json({ error: 'Customer not found' });
    const cur = existing[0];
    const { name, phone, gstin, address } = req.body || {};
    const { rows } = await pool.query(
      `UPDATE customers
          SET name = $1, phone = $2, gstin = $3, address = $4
        WHERE id = $5
        RETURNING *`,
      [
        name ?? cur.name,
        phone ?? cur.phone,
        gstin ?? cur.gstin,
        address ?? cur.address,
        req.params.id,
      ],
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM customers WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Customer not found' });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
