const router = require('express').Router();
const { pool } = require('../db');

// Bucket expression per period. Referenced by position in GROUP BY so we
// don't depend on GROUP-BY-alias support.
const BUCKET_EXPR = {
  daily:   `to_char(i.invoice_date, 'YYYY-MM-DD')`,
  weekly:  `to_char(date_trunc('week',  i.invoice_date), 'IYYY-"W"IW')`,
  monthly: `to_char(date_trunc('month', i.invoice_date), 'YYYY-MM')`,
  yearly:  `to_char(date_trunc('year',  i.invoice_date), 'YYYY')`,
};

function todayISO() { return new Date().toISOString().slice(0, 10); }
function shiftISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const DEFAULT_WINDOW = {
  daily:   14,
  weekly:  7 * 12,
  monthly: 30 * 12,
  yearly:  365 * 5,
};

router.get('/sales', async (req, res, next) => {
  try {
    let { period = 'daily', from, to } = req.query;
    if (!['daily', 'weekly', 'monthly', 'yearly', 'custom'].includes(period)) {
      return res.status(400).json({ error: 'invalid period' });
    }
    if (period === 'custom') {
      if (!from || !to) return res.status(400).json({ error: 'from and to required for custom' });
    } else {
      to   = todayISO();
      from = shiftISO(DEFAULT_WINDOW[period]);
    }

    const bucketSql = BUCKET_EXPR[period] || BUCKET_EXPR.daily;

    // Per-bucket totals. items_sold is joined in via a per-invoice aggregate
    // so we don't multiply invoice rows by line-item rows.
    const { rows: buckets } = await pool.query(
      `SELECT ${bucketSql} AS bucket,
              COALESCE(SUM(i.grand_total), 0)::float AS sales,
              COALESCE(SUM(i.gst_total),   0)::float AS gst,
              COUNT(*)::int                          AS invoices,
              COALESCE(SUM(ii_totals.items_sold), 0)::float AS items_sold
         FROM invoices i
         LEFT JOIN (
           SELECT invoice_id, SUM(qty) AS items_sold
             FROM invoice_items
            GROUP BY invoice_id
         ) ii_totals ON ii_totals.invoice_id = i.id
        WHERE i.invoice_date BETWEEN $1::date AND $2::date
        GROUP BY 1
        ORDER BY 1`,
      [from, to],
    );

    const { rows: totalRows } = await pool.query(
      `SELECT COALESCE(SUM(i.grand_total), 0)::float AS sales,
              COALESCE(SUM(i.gst_total),   0)::float AS gst,
              COUNT(*)::int                          AS invoices,
              COALESCE(SUM(ii_totals.items_sold), 0)::float AS items_sold
         FROM invoices i
         LEFT JOIN (
           SELECT invoice_id, SUM(qty) AS items_sold
             FROM invoice_items GROUP BY invoice_id
         ) ii_totals ON ii_totals.invoice_id = i.id
        WHERE i.invoice_date BETWEEN $1::date AND $2::date`,
      [from, to],
    );
    const t = totalRows[0] || { sales: 0, gst: 0, invoices: 0, items_sold: 0 };
    const totals = {
      sales:      +t.sales      || 0,
      gst:        +t.gst        || 0,
      invoices:   +t.invoices   || 0,
      items_sold: +t.items_sold || 0,
      avg_bill:   t.invoices ? (+t.sales || 0) / +t.invoices : 0,
    };

    const { rows: gstByRate } = await pool.query(
      `SELECT ii.gst::float AS rate,
              COALESCE(SUM((ii.qty * ii.price * ii.gst) / 100), 0)::float AS amount,
              COALESCE(SUM(ii.qty * ii.price), 0)::float               AS taxable
         FROM invoice_items ii
         JOIN invoices i ON i.id = ii.invoice_id
        WHERE i.invoice_date BETWEEN $1::date AND $2::date
        GROUP BY ii.gst
        ORDER BY ii.gst`,
      [from, to],
    );

    const { rows: topProducts } = await pool.query(
      `SELECT ii.name,
              SUM(ii.qty)::float    AS qty,
              SUM(ii.amount)::float AS amount
         FROM invoice_items ii
         JOIN invoices i ON i.id = ii.invoice_id
        WHERE i.invoice_date BETWEEN $1::date AND $2::date
        GROUP BY ii.name
        ORDER BY amount DESC
        LIMIT 5`,
      [from, to],
    );

    res.json({ period, from, to, buckets, totals, gstByRate, topProducts });
  } catch (e) {
    console.error('reports/sales failed:', e.message);
    next(e);
  }
});

router.get('/dashboard-trend', async (_req, res, next) => {
  try {
    const to   = todayISO();
    const from = shiftISO(13);
    const { rows } = await pool.query(
      `SELECT to_char(invoice_date, 'YYYY-MM-DD') AS bucket,
              COALESCE(SUM(grand_total), 0)::float AS sales,
              COUNT(*)::int AS invoices
         FROM invoices
        WHERE invoice_date BETWEEN $1::date AND $2::date
        GROUP BY 1
        ORDER BY 1`,
      [from, to],
    );
    const byBucket = new Map(rows.map((r) => [r.bucket, r]));
    const filled = [];
    for (let i = 13; i >= 0; i--) {
      const key = shiftISO(i);
      const r = byBucket.get(key);
      filled.push({ bucket: key, sales: r ? r.sales : 0, invoices: r ? r.invoices : 0 });
    }
    res.json({ from, to, buckets: filled });
  } catch (e) {
    console.error('reports/dashboard-trend failed:', e.message);
    next(e);
  }
});

module.exports = router;
