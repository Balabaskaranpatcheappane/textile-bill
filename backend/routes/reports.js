const router = require('express').Router();
const { pool } = require('../db');

// SQL fragment producing the bucket label for each period. Postgres
// TO_CHAR / DATE_TRUNC give us stable, comparable bucket keys we can
// sort lexicographically.
const BUCKET_EXPR = {
  daily:   `to_char(invoice_date, 'YYYY-MM-DD')`,
  weekly:  `to_char(date_trunc('week',  invoice_date), 'IYYY-"W"IW')`,
  monthly: `to_char(date_trunc('month', invoice_date), 'YYYY-MM')`,
  yearly:  `to_char(date_trunc('year',  invoice_date), 'YYYY')`,
};

function todayISO() { return new Date().toISOString().slice(0, 10); }

function shiftISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// Default window sizes per period.
const DEFAULT_WINDOW = {
  daily:   14,           // last 14 days
  weekly:  7 * 12,       // last ~12 weeks
  monthly: 30 * 12,      // last ~12 months
  yearly:  365 * 5,      // last ~5 years
};

router.get('/sales', async (req, res, next) => {
  try {
    let { period = 'daily', from, to } = req.query;
    if (!['daily', 'weekly', 'monthly', 'yearly', 'custom'].includes(period)) {
      return res.status(400).json({ error: 'invalid period' });
    }

    // Resolve the date window.
    if (period === 'custom') {
      if (!from || !to) return res.status(400).json({ error: 'from and to required for custom' });
    } else {
      to   = todayISO();
      from = shiftISO(DEFAULT_WINDOW[period]);
    }

    // Custom always buckets by day.
    const bucketSql = BUCKET_EXPR[period] || BUCKET_EXPR.daily;

    const { rows: buckets } = await pool.query(
      `SELECT ${bucketSql} AS bucket,
              COALESCE(SUM(grand_total), 0)::float AS sales,
              COALESCE(SUM(gst_total),   0)::float AS gst,
              COUNT(*)::int AS invoices
         FROM invoices
        WHERE invoice_date BETWEEN $1::date AND $2::date
        GROUP BY bucket
        ORDER BY bucket`,
      [from, to],
    );

    // Grand totals for the summary tiles.
    const { rows: totalRows } = await pool.query(
      `SELECT COALESCE(SUM(grand_total), 0)::float AS sales,
              COALESCE(SUM(gst_total),   0)::float AS gst,
              COUNT(*)::int                          AS invoices
         FROM invoices
        WHERE invoice_date BETWEEN $1::date AND $2::date`,
      [from, to],
    );
    const t = totalRows[0];
    const totals = {
      ...t,
      avg_bill: t.invoices ? t.sales / t.invoices : 0,
    };

    // Top products (limit 5) in the same window.
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

    res.json({ period, from, to, buckets, totals, topProducts });
  } catch (e) { next(e); }
});

router.get('/dashboard-trend', async (_req, res, next) => {
  try {
    const to   = todayISO();
    const from = shiftISO(13); // last 14 days including today
    const { rows } = await pool.query(
      `SELECT to_char(invoice_date, 'YYYY-MM-DD') AS bucket,
              COALESCE(SUM(grand_total), 0)::float AS sales,
              COUNT(*)::int AS invoices
         FROM invoices
        WHERE invoice_date BETWEEN $1::date AND $2::date
        GROUP BY bucket
        ORDER BY bucket`,
      [from, to],
    );

    // Fill in missing days so the chart is continuous.
    const byBucket = new Map(rows.map((r) => [r.bucket, r]));
    const filled = [];
    for (let i = 13; i >= 0; i--) {
      const key = shiftISO(i);
      const r = byBucket.get(key);
      filled.push({ bucket: key, sales: r ? r.sales : 0, invoices: r ? r.invoices : 0 });
    }
    res.json({ from, to, buckets: filled });
  } catch (e) { next(e); }
});

module.exports = router;
