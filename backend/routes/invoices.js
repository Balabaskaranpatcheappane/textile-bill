const router = require('express').Router();
const { pool } = require('../db');
const { requireRole } = require('../middleware/auth');

// An arbitrary but stable key so concurrent invoice creations serialize on
// their own advisory lock instead of blocking every write in the app.
const INVOICE_NO_LOCK_KEY = 918273;

async function nextInvoiceNo(client) {
  const { rows: cfgRows } = await client.query(
    `SELECT invoice_prefix FROM settings WHERE id = 1`,
  );
  const cfgPrefix = (cfgRows[0] && cfgRows[0].invoice_prefix) || 'INV';
  const year = new Date().getFullYear();
  const prefix = `${cfgPrefix}-${year}-`;
  const { rows } = await client.query(
    `SELECT invoice_no FROM invoices
      WHERE invoice_no LIKE $1
      ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`],
  );
  const nextSeq = rows[0] ? parseInt(rows[0].invoice_no.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

async function hydrate(row) {
  if (!row) return row;
  const { rows: items } = await pool.query(
    'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id',
    [row.id],
  );
  row.items = items;
  return row;
}

router.get('/', async (req, res, next) => {
  try {
    const { q, from, to } = req.query;
    const where = [];
    const args = [];
    if (q) {
      args.push(`%${q}%`);
      where.push(`(invoice_no ILIKE $${args.length}
                   OR customer_name ILIKE $${args.length}
                   OR customer_phone ILIKE $${args.length})`);
    }
    if (from) { args.push(from); where.push(`invoice_date >= $${args.length}`); }
    if (to)   { args.push(to);   where.push(`invoice_date <= $${args.length}`); }
    const sql = `SELECT * FROM invoices
                 ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                 ORDER BY id DESC`;
    const { rows } = await pool.query(sql, args);
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/summary/today', async (_req, res, next) => {
  try {
    const { rows: totalRows } = await pool.query(
      `SELECT COUNT(*)::int AS "invoiceCount",
              COALESCE(SUM(grand_total), 0)::float AS "totalSales"
         FROM invoices
        WHERE invoice_date = CURRENT_DATE`,
    );
    const { rows: lowStock } = await pool.query(
      `SELECT id, name, stock, unit FROM products
        WHERE stock <= 5 ORDER BY stock`,
    );
    const today = new Date().toISOString().slice(0, 10);
    res.json({ today, ...totalRows[0], lowStock });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Invoice not found' });
    res.json(await hydrate(rows[0]));
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
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

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Serialize invoice-number generation without blocking unrelated writes.
    await client.query('SELECT pg_advisory_xact_lock($1)', [INVOICE_NO_LOCK_KEY]);

    const invoice_no = await nextInvoiceNo(client);

    const { rows: headRows } = await client.query(
      `INSERT INTO invoices
        (invoice_no, customer_id, customer_name, customer_gstin, customer_phone,
         customer_address, invoice_date, subtotal, gst_total, discount, grand_total,
         payment_mode, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6, COALESCE($7::date, CURRENT_DATE),
               $8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        invoice_no,
        customer_id || null,
        customer_name,
        customer_gstin || null,
        customer_phone || null,
        customer_address || null,
        invoice_date || null,
        +subtotal.toFixed(2),
        +gst_total.toFixed(2),
        disc,
        grand_total,
        payment_mode || 'CASH',
        notes || null,
        req.user ? req.user.id : null,
      ],
    );
    const invoice = headRows[0];

    for (const it of clean) {
      await client.query(
        `INSERT INTO invoice_items
          (invoice_id, product_id, name, hsn, unit, qty, price, gst, amount)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [invoice.id, it.product_id, it.name, it.hsn, it.unit,
         it.qty, it.price, it.gst, it.amount],
      );
      if (it.product_id) {
        await client.query(
          `UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE id = $2`,
          [it.qty, it.product_id],
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(await hydrate(invoice));
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    next(e);
  } finally {
    client.release();
  }
});

router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM invoices WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Invoice not found' });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
