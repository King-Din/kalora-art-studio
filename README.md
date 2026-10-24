# Art Studio

A small full-stack site for an art studio: customers buy one-of-a-kind paintings, book wall-painting dates and request pottery; the studio manages everything. Built for the GDGC web-dev recruitment assignment.

> **Status (read this first):** the code was written without network access, so `npm install`, the tests, the build and every MongoDB Atlas check were **NOT executed** by the author of this archive. Server files pass `node --check` (syntax only). Run the commands below and treat the results as the first real verification. `seedData/` now contains the official seed and images.

## Features
- Roles: `customer` (self sign-up) and `studio` (created only by the seed). Roles are enforced by the server on every request.
- Paintings: browse/search/filter, buy once (no double selling), cancel an order to reopen the painting. Studio adds/edits paintings while available.
- Wall painting: date 7-90 days away (IST), 10-500 sq ft, price = sq ft x seeded rate (150 INR), one active booking per date, studio confirms/declines, customer cancels until 3 days before.
- Pottery: seeded items/glazes, quantity 1-12, needed-by at least 14 days away, studio accepts/declines, customer edits/cancels only while `requested`. No price is shown or invented.
- Helpful refusals in the UI (sold painting -> alternatives, taken date -> nearest free dates, stale state -> refetch + explanation).

## Stack
Node >= 20, Express 5, Mongoose 8, zod 3, bcryptjs, jsonwebtoken, luxon, helmet, express-rate-limit; React 18 + Vite + react-router 6 (plain CSS); Vitest + Supertest; MongoDB Atlas.

## Prerequisites
Node 20+ (see `.nvmrc`), npm 10+, a free MongoDB Atlas account.

## Atlas setup
1. Create a free **M0** cluster (MongoDB 6.0+ is needed for the partial index on bookings, and a replica set for transactions; Atlas M0 has both).
2. Database Access: create a database user with read/write on any database.
3. Network Access: allow your current IP (or `0.0.0.0/0` for a throw-away demo).
4. Connect -> Drivers -> copy the connection string. `mongodb+srv://` needs DNS SRV lookups; on restrictive networks use Atlas's *standard* (non-SRV) connection string instead.
5. Pick a database name (e.g. `artstudio`). Tests automatically use `artstudio_test` on the same cluster.

## Environment variables
Copy `.env.example` to `server/.env` and fill it in. Never commit it.

| Variable | Meaning |
|---|---|
| MONGODB_URI | Atlas connection string |
| MONGODB_DB_NAME | database name (tests force `artstudio_test`) |
| JWT_SECRET | random string, min 32 chars |
| JWT_EXPIRES_IN | e.g. `7d` |
| BCRYPT_ROUNDS | default 10 (4 in tests) |
| COOKIE_SECURE | `true` only when served over HTTPS |
| PORT | API port, default 4000 |
| NODE_ENV | development / test / production |

## Install and run
```bash
npm install          # creates package-lock.json the first time; commit it. Afterwards `npm ci` works.
npm run db:check     # connectivity + a committed transaction
npm run seed         # idempotent; safe to run repeatedly
npm run verify:indexes
npm run dev          # API on :4000, client on http://localhost:5173
```
Seeded studio login: the `studioAccount` email/password in `seedData/seed.json` (`studio@artstudio.in` / `Studio@123`).

## Tests and proofs
```bash
npm test                      # Vitest + Supertest against the REAL Atlas database artstudio_test
npm run race -- --n=20        # 20 simultaneous buyers/bookers; prints outcomes computed from real responses + DB state
npm run verify:indexes        # add `-- --test` to check the test database
npm run demo-reset -- --yes --db=<exact MONGODB_DB_NAME>
```
`demo-reset` refuses without both flags, in production, or if the typed name differs from `MONGODB_DB_NAME`. It deletes customers, orders, bookings and pottery requests, keeps the studio user and restores paintings to their seed status.

## Production-style run
```bash
npm run build && npm start    # Express serves client/dist on the API port
```

## Folder map
`server/src/rules` (dates, validation, transition table) · `server/src/services` (business logic) · `server/src/routes` (thin HTTP layer) · `server/src/middleware` (auth, errors, origin check) · `server/scripts` · `server/tests` · `client/src` (pages, components, one `useAsync` hook).

## API
`/api/auth/{signup,login,logout,me}` · `/api/config` · `/api/paintings[/:id[/buy]]` · `/api/orders[/:id[/cancel]]` · `/api/bookings[/availability|/:id[/cancel|/confirm|/decline]]` · `/api/pottery[/options|/:id[/cancel|/accept|/decline]]` · `/api/admin/summary` · `/api/health`.
All errors: `{ "error": { "code", "message", "details", "requestId" } }`.

## RBAC
| Action | Customer | Studio |
|---|---|---|
| Browse paintings | yes | yes |
| Add/edit painting (while available) | 403 | yes |
| Buy / book / request pottery | yes | 403 |
| Read orders, bookings, requests | own only (others 404) | all |
| Confirm/decline booking; accept/decline pottery | 403 | yes |
| Cancel order/booking/request | own only (others 404) | 403 |
Not logged in -> 401.

## Known limitations
- Paintings can be browsed only when logged in (the brief requires 401 when not logged in).
- No password reset, email verification, payments, image uploads.
- Rate limiting is in-memory (single process).
- If the Atlas cluster rejects the `$in` partial index, see DESIGN.md for the `activeDate` fallback (not implemented).
