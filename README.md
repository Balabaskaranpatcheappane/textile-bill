# Textiles Shop Billing

A simple billing system for a textiles shop, built with:

- **Backend**: Node.js + Express + **PostgreSQL** (`pg`), migrations via
  `node-pg-migrate`, JWT auth with `bcrypt` password hashing
- **Frontend**: Angular 17 (standalone components) with a route guard and
  HTTP interceptor for the JWT

Features:

- Login screen; JWT stored in `localStorage`; auto-logout on 401
- **Shop settings** page (admin-only): shop name, address, phone, email,
  GSTIN, uploadable logo, default paper size, invoice-number prefix,
  footer note
- Product catalog (name, HSN, unit, price, stock, GST%, **barcode**)
- **Barcode scanner** field on the New Invoice screen — scan a code and
  the matching line is added (or its qty bumped)
- Printable **barcode labels** page per product (Code 128, via `bwip-js`)
- Customer master (name, phone, GSTIN, address)
- Invoice creation with multiple line items, live sub-total, GST, discount, grand total
- Printable tax-invoice view — pick **58 mm**, **80 mm** or **A4** and
  print; thermal formats use a compact receipt layout, A4 the full tax
  invoice
- Dashboard with today's sales, invoice count, low-stock alerts

## First-time setup

### 1. PostgreSQL

Either use the bundled `docker-compose.yml`:

```bash
docker compose up -d db
```

…or run any Postgres 13+ instance and set `DATABASE_URL` yourself.

### 2. Backend

```bash
cd backend
cp .env.example .env       # set DATABASE_URL and a JWT_SECRET
npm install
npm run migrate            # apply schema migrations
npm run seed               # sample products + default admin user
npm start                  # http://localhost:3000
```

The `seed` step creates a default admin — **username `admin`, password
`admin123`**. Sign in and change the password immediately from the UI
(or via `POST /api/auth/change-password`).

### 3. Frontend

```bash
cd frontend
npm install
npm start                  # http://localhost:4200
```

The Angular dev server proxies `/api/*` to `http://localhost:3000`.

## Auth API

| Method | Path                          | Auth        | Purpose                                |
|--------|-------------------------------|-------------|----------------------------------------|
| POST   | `/api/auth/login`             | public      | `{ username, password }` → JWT + user  |
| GET    | `/api/auth/me`                | bearer      | Current user info                      |
| POST   | `/api/auth/change-password`   | bearer      | `{ current_password, new_password }`   |
| GET    | `/api/auth/users`             | admin only  | List users                             |
| POST   | `/api/auth/users`             | admin only  | Create user `{username,password,name,role}` |
| DELETE | `/api/auth/users/:id`         | admin only  | Delete user                            |

Everything under `/api/products`, `/api/customers`, `/api/invoices`
requires a valid `Authorization: Bearer <jwt>` header.

## Migrations

Migrations live under `backend/migrations/` and are managed with
`node-pg-migrate`.

```bash
npm run migrate                 # apply all pending
npm run migrate:down            # roll back the most recent one
npm run migrate:create add_x    # scaffold a new migration
```

Applied migrations are tracked in the `pgmigrations` table.

## Environment variables

| Variable        | Purpose                                                          |
|-----------------|------------------------------------------------------------------|
| `DATABASE_URL`  | `postgres://user:pass@host:5432/db` — preferred                  |
| `PGHOST` etc.   | Standard libpq vars used if `DATABASE_URL` is empty              |
| `PGSSL=true`    | Enable TLS (for Neon / RDS / Supabase style hosts)               |
| `PORT`          | Backend HTTP port (default `3000`)                               |
| `PG_POOL_MAX`   | Max pool connections (default `10`)                              |
| `JWT_SECRET`    | **Required.** Signing key for JSON web tokens                    |
| `JWT_TTL`       | Token lifetime (default `12h`)                                   |

## Project layout

```
docker-compose.yml
backend/
  server.js               Express bootstrap (JWT-gated /api/*)
  db.js                   pg pool + NUMERIC-as-number type parser
  seed.js                 Sample products + default admin user
  middleware/auth.js      signToken, requireAuth, requireRole
  migrations/
    1706000000000_initial-schema.js
    1706000000001_users.js
  routes/
    auth.js               login, me, change-password, user CRUD
    products.js
    customers.js
    invoices.js
frontend/
  angular.json
  src/
    index.html, main.ts, styles.css
    app/
      app.component.ts
      app.routes.ts       login (public) + guarded shell + children
      auth.guard.ts
      auth.interceptor.ts
      services/
        auth.service.ts
        api.service.ts
      shell/              Sidebar layout with user chip and logout
      login/
      dashboard/
      products/
      customers/
      invoices/
      models.ts
```

## Design notes

- **Numeric-as-number.** `pg.types.setTypeParser(1700, parseFloat)` is set
  in `db.js` so money/qty columns come back to JS as numbers, not strings.
- **Invoice number generation** runs inside a transaction that takes a
  `pg_advisory_xact_lock`, so two shopkeepers hitting *Save* at the same
  moment can't collide on the same `INV-YYYY-NNNN` sequence.
- **Password hashing** uses `bcrypt` (cost 10).
- **JWTs** are signed HS256 with `JWT_SECRET`; the frontend interceptor
  attaches `Authorization: Bearer …` and auto-logs-out on a 401.
