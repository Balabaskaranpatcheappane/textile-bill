# Textiles Shop Billing

A simple billing system for a textiles shop, built with:

- **Backend**: Node.js + Express + SQLite (`better-sqlite3`)
- **Frontend**: Angular 17 (standalone components)

Features:

- Product catalog (name, HSN, unit, price, stock, GST%)
- Customer master (name, phone, GSTIN, address)
- Create invoice with multiple line items, automatic sub-total, GST (CGST+SGST) and grand-total
- Invoice list and printable invoice view
- Dashboard with today's sales and stock alerts

## Getting started

### 1. Backend

```bash
cd backend
npm install
npm start        # http://localhost:3000
```

The database file `textiles.db` is created on first run and seeded with a
few sample products.

### 2. Frontend

In another terminal:

```bash
cd frontend
npm install
npm start        # http://localhost:4200
```

The Angular dev server proxies `/api/*` to `http://localhost:3000`
(see `proxy.conf.json`).

## Project layout

```
backend/
  server.js            Express bootstrap
  db.js                SQLite schema + seed
  routes/
    products.js
    customers.js
    invoices.js
frontend/
  angular.json
  src/
    index.html, main.ts, styles.css
    app/
      app.component.ts / .html / .css
      app.routes.ts
      services/api.service.ts
      models.ts
      dashboard/
      products/
      customers/
      invoices/
```
