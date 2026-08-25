require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { init } = require('./db');
const products = require('./routes/products');
const customers = require('./routes/customers');
const invoices = require('./routes/invoices');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/products', products);
app.use('/api/customers', customers);
app.use('/api/invoices', invoices);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const port = process.env.PORT || 3000;
init()
  .then(() => {
    app.listen(port, () => {
      console.log(`Textiles billing API listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
