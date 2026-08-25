const router = require('express').Router();
const db = require('../db');

function nextInvoiceNo() {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const row = db
    .prepare(
      `SELECT invoice_no FROM invoices
       WHERE invoice_no LIKE ?
       ORDER BY id DESC LIMIT 1`
    )
    .get(`${prefix}%`);
  const nextSeq = row ? parseInt(row.invoice_no.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

function hydrate(invoice) {
  invoice.items = db
    .prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id')
    .all(invoice.id);
  return invoice;
}

router.get('/', (req, res) => {
  const { q, from, to } = req.query;
  const where = [];
  const args = [];
  if (q) {
    where.push('(invoice_no LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)');
    args.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (from) { where.push('invoice_date >= ?'); args.push(from); }
  if (to)   { where.push('invoice_date <= ?'); args.push(to); }
  const sql = `SELECT * FROM invoices
               ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY id DESC`;
  res.json(db.prepare(sql).all(...args));
});

router.get('/summary/today', (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const row = db
    .prepare(
      `SELECT COUNT(*) AS invoiceCount,
              COALESCE(SUM(grand_total), 0) AS totalSales
         FROM invoices
        WHERE invoice_date = ?`
    )
    .get(today);
  const lowStock = db
    .prepare('SELECT id, name, stock, unit FROM products WHERE stock <= 5 ORDER BY stock')
    .all();
  res.json({ today, ...row, lowStock });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Invoice not found' });
  res.json(hydrate(row));
});

router.post('/', (req, res) => {
  const {
    customer_id, customer_name, customer_gstin, customer_phone, customer_address,
    invoice_date, payment_mode, notes, discount = 0, items = [],
  } = req.body || {};

  if (!customer_name) return res.status(400).json({ error: 'customer_name is required' });
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one line item is required' });
  }

  let subtotal = 0;
  let gst_total = 0;
  const clean = items.map((it) => {
    const qty = +it.qty || 0;
    const price = +it.price || 0;
    const gst = +it.gst || 0;
    const line = qty * price;
    const gstAmt = (line * gst) / 100;
    subtotal += line;
    gst_total += gstAmt;
    return {
      product_id: it.product_id || null,
      name: it.name,
      hsn: it.hsn || null,
      unit: it.unit || null,
      qty, price, gst,
      amount: +(line + gstAmt).toFixed(2),
    };
  });

  const disc = +discount || 0;
  const grand_total = +(subtotal + gst_total - disc).toFixed(2);
  const invoice_no = nextInvoiceNo();

  const tx = db.transaction(() => {
    const info = db.prepare(
      `INSERT INTO invoices
        (invoice_no, customer_id, customer_name, customer_gstin, customer_phone,
         customer_address, invoice_date, subtotal, gst_total, discount, grand_total,
         payment_mode, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      invoice_no,
      customer_id || null,
      customer_name,
      customer_gstin || null,
      customer_phone || null,
      customer_address || null,
      invoice_date || new Date().toISOString().slice(0, 10),
      +subtotal.toFixed(2),
      +gst_total.toFixed(2),
      disc,
      grand_total,
      payment_mode || 'CASH',
      notes || null,
    );

    const insertItem = db.prepare(
      `INSERT INTO invoice_items
        (invoice_id, product_id, name, hsn, unit, qty, price, gst, amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const decStock = db.prepare(
      `UPDATE products SET stock = MAX(stock - ?, 0) WHERE id = ?`
    );
    for (const it of clean) {
      insertItem.run(
        info.lastInsertRowid, it.product_id, it.name, it.hsn, it.unit,
        it.qty, it.price, it.gst, it.amount,
      );
      if (it.product_id) decStock.run(it.qty, it.product_id);
    }

    return info.lastInsertRowid;
  });

  const id = tx();
  res.status(201).json(hydrate(db.prepare('SELECT * FROM invoices WHERE id = ?').get(id)));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Invoice not found' });
  res.status(204).end();
});

module.exports = router;
