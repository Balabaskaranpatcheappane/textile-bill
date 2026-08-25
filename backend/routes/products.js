const router = require('express').Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { q } = req.query;
  const rows = q
    ? db.prepare(
        `SELECT * FROM products
         WHERE name LIKE ? OR hsn LIKE ?
         ORDER BY name`
      ).all(`%${q}%`, `%${q}%`)
    : db.prepare('SELECT * FROM products ORDER BY name').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Product not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const { name, hsn, unit, price, stock, gst } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const info = db
    .prepare(
      `INSERT INTO products (name, hsn, unit, price, stock, gst)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(name, hsn || null, unit || 'MTR', +price || 0, +stock || 0, +gst || 0);
  res.status(201).json(
    db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid)
  );
});

router.put('/:id', (req, res) => {
  const { name, hsn, unit, price, stock, gst } = req.body || {};
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });
  db.prepare(
    `UPDATE products
     SET name = ?, hsn = ?, unit = ?, price = ?, stock = ?, gst = ?
     WHERE id = ?`
  ).run(
    name ?? existing.name,
    hsn ?? existing.hsn,
    unit ?? existing.unit,
    price !== undefined ? +price : existing.price,
    stock !== undefined ? +stock : existing.stock,
    gst !== undefined ? +gst : existing.gst,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Product not found' });
  res.status(204).end();
});

module.exports = router;
