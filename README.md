# Art Studio Website

A full-stack web application for an art studio built for the GDGC web-dev recruitment assignment. Customers browse and purchase one-of-a-kind paintings, book wall-painting dates, and submit custom pottery requests. Studio administrators manage inventory, confirm/decline bookings, and accept/decline pottery requests.

Verified against a real MongoDB Atlas replica set cluster with race-safe concurrency controls, server-enforced RBAC, and centralized error handling.

---

## Features
- **Role-Based Access Control**:
  - `customer`: Self-signup, browse paintings, buy paintings, book wall dates, request pottery, view own activity, cancel eligible orders/bookings/requests.
  - `studio`: Pre-seeded admin account, add/edit available paintings, view all queues, confirm/decline bookings, accept/decline pottery.
  - Server enforces all authorization rules; unauthorized access returns 401/403/404 with zero data leakage.
- **Paintings (S1 Double-Selling Prevention)**:
  - Each painting is one-of-a-kind. Purchases execute inside Mongoose ACID transactions using atomic conditional updates (`findOneAndUpdate({ _id, status: "available" })`) backed by a partial unique index on `orders.painting` where `status: "placed"`.
  - Sold paintings remain visible in the gallery with the Buy action disabled. Customers can cancel their own placed orders, atomically returning the painting to `available`.
- **Wall Bookings (S2 Race-Safe Calendar)**:
  - Customers reserve dates 7 to 90 days away (Asia/Kolkata calendar days). Prices are calculated authoritatively on the server (`wallSqFt * 150`) and stored as a snapshot.
  - Concurrent bookings for the same date collide on a partial unique index (`status in ["requested", "confirmed"]`) and return 409 `DATE_TAKEN`. Declining or cancelling a booking atomically frees the date.
  - Cancellation allowed until 3 days before the booking date; late cancellations are rejected with 409 `CANCELLATION_WINDOW_CLOSED`.
- **Custom Pottery**:
  - Customers select seeded items and glazes with quantities 1 to 12 and needed-by dates at least 14 days away. No pricing is invented.
  - Customers can edit or cancel requests only while in `requested` state.
- **Helpful Refusals & UI States**:
  - React client renders unified `<AsyncState>` (loading, empty, error with Retry) across every data screen.
  - Refusal suggestions: when a painting is sold, the UI suggests 3 available alternatives; when a date is taken, the UI suggests the nearest free dates.
  - CSS line-clamping prevents long content (such as `p-012`) from breaking card grids.

---

## Stack & Versions
- **Runtime**: Node.js >= 20 (ES Modules)
- **Backend**: Express 5, Mongoose 8, Zod 3, bcryptjs, jsonwebtoken, Luxon 3, Helmet, Express-Rate-Limit
- **Frontend**: React 18, React Router v6, Vite 5, plain CSS
- **Testing**: Vitest 2, Supertest 7
- **Database**: MongoDB Atlas (MongoDB 8.0 replica set with transaction & partial index support)

---

## Prerequisites
- Node.js >= 20 (Node 24 tested, see `.nvmrc`)
- npm >= 10
- A MongoDB Atlas account with an M0 or dedicated cluster

---

## MongoDB Atlas Setup Guide
1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create an **M0 Free Cluster**.
2. **Database Access**: Under Security, create a database user (e.g. `artstudio_user`) with read and write permissions.
3. **Network Access**: Add your current IP address (or `0.0.0.0/0` for universal test access).
4. **Connection String**: Click **Connect** -> **Drivers** (Node.js) and copy the connection string.
   - *Note on DNS*: If your local router or network blocks SRV DNS lookups (`querySrv ECONNREFUSED`), the backend automatically falls back to public DNS (`8.8.8.8`, `1.1.1.1`) so standard `mongodb+srv://` URIs work seamlessly.
5. Choose a primary database name (e.g. `artstudio`). Automated tests strictly target `artstudio_test` on the same cluster.

---

## Environment Variables
Create `server/.env` based on `.env.example`:

```ini
MONGODB_URI=mongodb+srv://<db-user>:<db-password>@<cluster-host>/?retryWrites=true&w=majority
MONGODB_DB_NAME=artstudio
JWT_SECRET=replace-with-a-random-string-of-at-least-32-characters
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
COOKIE_SECURE=false
PORT=4000
NODE_ENV=development
```

---

## Quick Start & Verification Commands
All commands run from the repository root:

```bash
# 1. Install dependencies across workspaces
npm install

# 2. Verify database connectivity and session transaction support
npm run db:check

# 3. Seed catalog items, glazes, rate config, studio user, and paintings (idempotent)
npm run seed

# 4. Verify partial unique indexes in Atlas
npm run verify:indexes

# 5. Run development servers (API on :4000, React client on http://localhost:5173)
npm run dev
```

**Default Studio Login Credentials** (from `seedData/seed.json`):
- **Email**: `studio@artstudio.in`
- **Password**: `Studio@123`

---

## Automated Test Suites & Race Stress Runner
All test commands run against the isolated `artstudio_test` database:

```bash
# Run full Vitest suite (6 files, 168 tests)
npm test

# Run 20-client concurrent race runner (tests simultaneous purchases and bookings)
npm run race -- --n=20

# Verify indexes on test database
npm run verify:indexes -- --test

# Safe demo reset (refuses without explicit database name confirmation)
npm run demo-reset -- --yes --db=artstudio
```

---

## Production Build & Start
```bash
# Build React client bundle to client/dist
npm run build

# Start Express server in production mode (serves client/dist and /images on PORT)
npm start
```

---

## Project Structure
```
art-studio/
├── .env.example
├── .gitignore
├── .nvmrc
├── README.md
├── DESIGN.md
├── package.json
├── package-lock.json
├── seedData/
│   ├── seed.json
│   └── images/ (p-001.jpg .. p-012.jpg)
├── server/
│   ├── package.json
│   ├── vitest.config.js
│   ├── scripts/
│   │   ├── db-check.js
│   │   ├── seed.js
│   │   ├── verify-indexes.js
│   │   ├── race-test.js
│   │   └── demo-reset.js
│   ├── src/
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── config/ (db.js, env.js)
│   │   ├── middleware/ (authenticate.js, errorHandler.js, originCheck.js, requestId.js)
│   │   ├── models/ (User.js, Painting.js, Order.js, WallBooking.js, PotteryRequest.js, Catalog.js)
│   │   ├── routes/ (auth.js, paintings.js, orders.js, bookings.js, pottery.js, index.js)
│   │   ├── rules/ (dates.js, transitions.js, validation.js)
│   │   └── services/ (paintings.js, orders.js, bookings.js, pottery.js, common.js, admin.js)
│   └── tests/
│       ├── setup.js, helpers.js
│       ├── rules.test.js
│       ├── rbac.test.js
│       ├── security.test.js
│       ├── lifecycle.test.js
│       ├── concurrency.test.js
│       └── seed.test.js
├── client/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx, main.jsx, auth.jsx, styles.css
│       ├── api/ (client.js, messages.js, format.js)
│       ├── components/ (AsyncState.jsx, ConfirmDialog.jsx, BuyButton.jsx, Common.jsx)
│       ├── hooks/ (useAsync.js)
│       └── pages/ (Gallery.jsx, PaintingDetail.jsx, BookWall.jsx, RequestPottery.jsx, MyActivity.jsx, AdminDashboard.jsx, AdminPaintings.jsx, AdminQueue.jsx, AuthPages.jsx)
└── notes/ (git-ignored)
    ├── IMPLEMENTATION_PLAN.md
    ├── TRACEABILITY.md
    ├── PROGRESS.md
    └── INTERVIEW_PREP.md
```

---

## RBAC Matrix
| Endpoint / Action | Unauthenticated | Customer | Studio Admin |
|---|---|---|---|
| `GET /api/paintings` | 401 | 200 (full catalog) | 200 (full catalog) |
| `POST /api/paintings` | 401 | 403 | 201 (add painting) |
| `PATCH /api/paintings/:id` | 401 | 403 | 200 (available only) / 409 (if sold) |
| `POST /api/paintings/:id/buy` | 401 | 201 (order created) | 403 |
| `GET /api/orders` | 401 | 200 (own orders only) | 200 (all orders + customer info) |
| `POST /api/orders/:id/cancel` | 401 | 200 (own only; other -> 404) | 403 |
| `GET /api/bookings/availability` | 401 | 200 (taken dates only) | 200 (taken dates only) |
| `POST /api/bookings` | 401 | 201 (booking requested) | 403 |
| `POST /api/bookings/:id/confirm` | 401 | 403 | 200 |
| `POST /api/bookings/:id/decline` | 401 | 403 | 200 |
| `POST /api/bookings/:id/cancel` | 401 | 200 (if >= 3 days away; other -> 404) | 403 |
| `POST /api/pottery` | 401 | 201 (request submitted) | 403 |
| `PATCH /api/pottery/:id` | 401 | 200 (if requested; other -> 404) | 403 |
| `POST /api/pottery/:id/accept` | 401 | 403 | 200 |
| `POST /api/pottery/:id/decline` | 401 | 403 | 200 |
| `GET /api/admin/summary` | 401 | 403 | 200 |

---

## Known Scope Exclusions (per Brief Section 13)
- Real payment processing (orders are recorded without transaction gateways).
- Password recovery and email confirmation.
- Social OAuth authentication.
- File and image uploads (admin provides image URLs).
- Animations, 3D libraries, external UI component suites.
