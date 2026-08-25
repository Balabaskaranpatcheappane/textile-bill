# Textiles Shop Billing

A simple billing system for a textiles shop, built with:

- **Backend**: Node.js + Express + **PostgreSQL** (via `pg`)
- **Frontend**: Angular 17 (standalone components)

Features:

- Product catalog (name, HSN, unit, price, stock, GST%)
- Customer master (name, phone, GSTIN, address)
- Create invoice with multiple line items, automatic sub-total, GST (CGST+SGST) and grand-total
- Invoice list and printable invoice view
- Dashboard with today's sales and stock alerts

## Getting started

### 1. Start PostgreSQL

Either use the bundled `docker-compose.yml`:

```bash
docker compose up -d db
```

…or run any Postgres 13+ instance and set `DATABASE_URL` yourself.

### 2. Backend

```bash
cd backend
cp .env.example .env    # edit DATABASE_URL if needed
npm install
npm start               # http://localhost:3000
```

On first start the tables are created and a handful of sample products are
seeded so the UI is not empty.

### 3. Frontend

In another terminal:

```bash
cd frontend
npm install
npm start               # http://localhost:4200
```

The Angular dev server proxies `/api/*` to `http://localhost:3000`
(see `proxy.conf.json`).

## Environment variables

| Variable        | Purpose                                                          |
|-----------------|------------------------------------------------------------------|
| `DATABASE_URL`  | `postgres://user:pass@host:5432/db` — preferred                  |
| `PGHOST` etc.   | Standard libpq vars used if `DATABASE_URL` is empty              |
| `PGSSL=true`    | Enable TLS (for Neon / RDS / Supabase style hosts)               |
| `PORT`          | Backend HTTP port (default `3000`)                               |
| `PG_POOL_MAX`   | Max pool connections (default `10`)                              |

## Project layout

```
docker-compose.yml     Optional local Postgres
backend/
  server.js            Express bootstrap
  db.js                pg pool + schema init + seed
  routes/
    products.js
    customers.js
    invoices.js
  .env.example
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

## Notes

- Invoice numbers (`INV-YYYY-NNNN`) are generated inside a transaction that
  holds a Postgres advisory lock, so concurrent invoice creations don't
  collide on the same sequence number.
- Numeric columns (price, stock, totals) are `NUMERIC(12,2/3)` for accurate
  money math. The `pg` driver returns them as strings by default —
  the frontend converts to numbers where needed and formats via
  Angular's `CurrencyPipe`.
