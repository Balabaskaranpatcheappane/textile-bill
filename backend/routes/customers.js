const router = require('express').Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { q } = req.query;
  const rows = q
    ? db.prepare(
        `SELECT * FROM customers
         WHERE name LIKE ? OR phone LIKE ? OR gstin LIKE ?
         ORDER BY name`
      ).all(`%${q}%`, `%${q}%`, `%${q}%`)
    : db.prepare('SELECT * FROM customers ORDER BY name').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Customer not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const { name, phone, gstin, address } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const info = db
    .prepare(
      `INSERT INTO customers (name, phone, gstin, address)
       VALUES (?, ?, ?, ?)`
    )
    .run(name, phone || null, gstin || null, address || null);
  res.status(201).json(
    db.prepare('SELECT * FROM customers WHERE id = ?').get(info.lastInsertRowid)
  );
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Customer not found' });
  const { name, phone, gstin, address } = req.body || {};
  db.prepare(
    `UPDATE customers
     SET name = ?, phone = ?, gstin = ?, address = ?
     WHERE id = ?`
  ).run(
    name ?? existing.name,
    phone ?? existing.phone,
    gstin ?? existing.gstin,
    address ?? existing.address,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Customer not found' });
  res.status(204).end();
});

module.exports = router;
