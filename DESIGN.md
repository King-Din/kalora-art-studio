# Design notes

*Written before any test run. Statements about tests describe tests that exist in the repo; none had been executed when this file was written.*

## 1. How login and the two roles work
Signup (`server/src/routes/auth.js`) always creates a `customer`; the zod schema has no `role` field, so a client-supplied role is dropped. The `studio` user exists only because `server/scripts/seed.js` inserts it. Login checks a bcrypt hash (against a dummy hash when the email is unknown), then sets an httpOnly, SameSite=Lax cookie holding a JWT that contains only the user id. On every request `middleware/authenticate.js` verifies the token and reloads the user from MongoDB, so a deleted user or a changed role applies immediately. `requireRole` returns 403 for the wrong role; `findOwned` in `services/common.js` makes another customer's record a 404.

## 2. Why MongoDB Atlas, and the indexes
The data is a handful of document types that are read whole (an order with its history, a booking with its history), so documents with embedded history fit well, and Atlas gives a free hosted replica set, which multi-document transactions need. The important indexes are declared in `server/src/models/`: a unique partial index on `orders.painting` where status is `placed`; a unique partial index on `wallbookings.date` where status is `requested` or `confirmed`; unique `users.email`; and list indexes on customer/status plus `createdAt`. `npm run verify:indexes` reads them back from the live database and fails if one is missing.

## 3. Stopping two people from taking the same painting or date
Buying (`services/orders.js`) runs a transaction: a conditional `findOneAndUpdate` flips the painting from `available` to `sold` only if it is still available; the order is inserted in the same transaction; the unique partial index on `orders.painting` is the final backstop. Losers get 409 `PAINTING_ALREADY_SOLD`. Booking (`services/bookings.js`) simply inserts; the partial unique index on `date` rejects the second insert and the error handler maps duplicate-key errors to 409 `DATE_TAKEN`. Declined or cancelled bookings fall out of the index filter, which frees the date. Tests in `server/tests/concurrency.test.js` and `npm run race` fire 20 simultaneous requests at each; they exist but were not run when this was written.

## 4. What was finished, left out, and next steps
Built: every flow in the brief, server-side RBAC, the error contract, request ids, rate-limited login, origin check, a transition table with one `transition()` helper, an idempotent seed, scripts, tests, and the React client. Not verified by the author: install, tests, build, any Atlas behaviour, browser behaviour. Left out: the `activeDate` fallback index, pagination, `requests.http`, and a browser-driven test. Next: run the suite, do the mutation check described in `notes/INTERVIEW_PREP.md`, then click through the UI.

## Interpretations
- Dates are `YYYY-MM-DD`, validated as real calendar dates. "Today" and day differences use Asia/Kolkata calendar days via Luxon (`rules/dates.js`), never milliseconds / 24h.
- Booking allowed when 7 <= days <= 90; pottery needed-by when days >= 14; booking cancellation when days >= 3, otherwise 409 `CANCELLATION_WINDOW_CLOSED`.
- Money is integer INR; rate and price are snapshots on the booking. Pottery has no price.
- Legal transitions live in one table: `server/src/rules/transitions.js`.
- Concurrent transaction conflicts are retried at most 8 times (`runTx`); if it still conflicts the customer sees 409, never 500.
- Seed text bypasses the model's 200-character title limit on purpose (`updateOne` does not run validators) so the very long seeded title is kept; admin edits go through zod (<= 200).

## CSRF stance
SameSite=Lax cookies plus the Origin check on unsafe methods (`middleware/originCheck.js`) mitigate cross-site requests. They are not an absolute guarantee (for example, a request with no Origin header is allowed so curl and tests work).

## Security limitations
In-memory rate limiter; JWT cannot be revoked before expiry except by deleting the user; no audit log beyond per-record history; no account lockout; `/images` is public static content.

## Known issues
None observed, because nothing has been run yet. Treat the first test run as the discovery of real ones.
