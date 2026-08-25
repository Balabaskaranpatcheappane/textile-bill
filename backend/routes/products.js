const router = require('express').Router();
const { pool } = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const { q } = req.query;
    const sql = q
      ? `SELECT * FROM products
          WHERE name ILIKE $1 OR hsn ILIKE $1
          ORDER BY name`
      : `SELECT * FROM products ORDER BY name`;
    const args = q ? [`%${q}%`] : [];
    const { rows } = await pool.query(sql, args);
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, hsn, unit, price, stock, gst } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });
    const { rows } = await pool.query(
      `INSERT INTO products (name, hsn, unit, price, stock, gst)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, hsn || null, unit || 'MTR', +price || 0, +stock || 0, +gst || 0],
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { rows: existing } = await pool.query(
      'SELECT * FROM products WHERE id = $1', [req.params.id],
    );
    if (!existing[0]) return res.status(404).json({ error: 'Product not found' });
    const cur = existing[0];
    const { name, hsn, unit, price, stock, gst } = req.body || {};
    const { rows } = await pool.query(
      `UPDATE products
          SET name = $1, hsn = $2, unit = $3, price = $4, stock = $5, gst = $6
        WHERE id = $7
        RETURNING *`,
      [
        name ?? cur.name,
        hsn ?? cur.hsn,
        unit ?? cur.unit,
        price !== undefined ? +price : cur.price,
        stock !== undefined ? +stock : cur.stock,
        gst !== undefined ? +gst : cur.gst,
        req.params.id,
      ],
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Product not found' });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
