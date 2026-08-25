require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bwipjs = require('bwip-js');

const { pool } = require('./db');
const { requireAuth } = require('./middleware/auth');
const auth = require('./routes/auth');
const products = require('./routes/products');
const customers = require('./routes/customers');
const invoices = require('./routes/invoices');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Copy backend/.env.example to .env and set one.');
  process.exit(1);
}

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Public.
app.use('/api/auth', auth);

// Barcode PNG for a product. Public so <img src="…"> loads without a token
// (the endpoint only reveals a barcode string for a given product id).
app.get('/api/products/:id/barcode.png', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT barcode FROM products WHERE id = $1', [req.params.id],
    );
    if (!rows[0] || !rows[0].barcode) return res.status(404).send('No barcode');
    const png = await bwipjs.toBuffer({
      bcid:        'code128',
      text:        rows[0].barcode,
      scale:       3,
      height:      12,
      includetext: true,
      textxalign:  'center',
    });
    res.set('Cache-Control', 'public, max-age=300').type('png').send(png);
  } catch (e) {
    console.error(e);
    res.status(500).send('Barcode render failed');
  }
});

// Everything else needs a valid JWT.
app.use('/api/products',  requireAuth, products);
app.use('/api/customers', requireAuth, customers);
app.use('/api/invoices',  requireAuth, invoices);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Textiles billing API listening on http://localhost:${port}`);
});
