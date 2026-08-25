require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

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
