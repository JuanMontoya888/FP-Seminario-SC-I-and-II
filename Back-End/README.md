# Back-End

## Overview
Node.js / Express REST API server and CLI utility scripts for Dental One, backed by MongoDB (Mongoose) and integrating Mercado Pago Checkout Pro, Google OAuth/Calendar, Twilio WhatsApp, and multi-provider email notifications.

## Interface
- HTTP Server Entrypoint (`[index.js:app]`): Express application listening on `process.env.PORT || 3000`, exposing:
  - `GET /health` (`[index.js:app.get('/health')]`): Lightweight uptime probe returning `{ status: 'ok' }` without querying MongoDB.
  - `/api` mounts `[routes/auth.routes.js]`, `[routes/patient.routes.js]`, `[routes/appointment.routes.js]`, and `[routes/procedure.routes.js]` (`[index.js:app.use]`).
  - `/mercado-pago` mounts `[routes/mercado_pago.routes.js]` (`[index.js:app.use]`).
  - `/api/contact` mounts `[routes/contact.routes.js]` (`[index.js:app.use]`).
  - `/api/admin/operations` mounts `[routes/operations.routes.js]` (`[index.js:app.use]`).
  - `/api/user/invoice-request` mounts `[routes/invoiceRequest.routes.js]` (`[index.js:app.use]`).
- Operational CLI scripts:
  - `[check-db.js:check]`: Standalone script printing the latest 10 `Appointment` records from MongoDB.
  - `[check-mp.js:checkMP]`: Standalone script querying a hardcoded Mercado Pago payment ID (`166947280360`) via `Payment.get`.
  - `[seed.js]`: Standalone script recreating default development admin (`admin@dentalone.com`) and patient (`usuario@dentalone.com`) accounts in `mongodb://mongodb:27017/Dental-One`.
  - `[seed-admin.js]`: Standalone script recreating a specific admin account (`montoya.martinez.juan.cb284@gmail.com`) in `mongodb://mongodb:27017/Dental-One`.
- Subdirectories:
  - [config](./config/README.md): Server-side treatment catalog (`TREATMENTS`) and payment amount helpers.
  - [controllers](./controllers/README.md): Request handlers for appointments, auth, contact, payments, patient clinical records, and procedures.
  - [middlewares](./middlewares/README.md): JWT authentication (`authMiddleware`) and DB-verified admin authorization (`adminMiddleware`).
  - [models](./models/README.md): Mongoose schemas/models and Mercado Pago Checkout Pro preference client.
  - [routes](./routes/README.md): Express routers mapping API endpoints, ERP operations, and CFDI invoice requests.
  - [services](./services/README.md): Email templates, multi-provider mailer, ERP financial reporting, reservation conflict rules, and WhatsApp reminders.

## Invariants
- Fail-fast database requirement (`[index.js:dbURI]`, `[check-db.js:check]`): `index.js` exits with status `1` if `process.env.MONGODB_URI` is unset or if `mongoose.connect` fails, preventing an unbacked server from accepting traffic; CLI helper `check-db.js` falls back to `'mongodb://127.0.0.1:27017/Dental-One'` when `MONGODB_URI` is unset.
- CORS configuration (`[index.js:corsOrigin]`): Restricts origin to `process.env.CORS_ORIGIN` when defined; allows all origins when unset.
- Reservation expiration lifecycle (`[index.js:cleanupExpiredReservations]`, `[index.js:Appointment]`): Explicitly attempts to drop legacy `expiresAt_1` TTL index at startup and relies on an initial plus 60-second `setInterval` worker running `cleanupExpiredReservations()` to mark expired unpaid reservations as `'Canceled'` rather than deleting documents.
- Health check isolation (`[index.js:app.get('/health')]`): Does not perform database queries.

## Side Effects
- Loads `.env` via `dotenv.config()` (`[index.js:dotenv]`, `[check-db.js:dotenv]`, `[check-mp.js:dotenv]`).
- Opens a MongoDB connection via `mongoose.connect`, binds an HTTP TCP port (`app.listen`), drops legacy `expiresAt_1` index if present, and schedules a 60-second background `setInterval` updating expired `Appointment` documents (`[index.js:mongoose.connect]`).
- CLI utility scripts connect to MongoDB or Mercado Pago, write/delete `User` documents (`[seed.js]`, `[seed-admin.js]`), print to `stdout`/`stderr`, and terminate the process via `process.exit`.

## Verification
- Run: `npm --prefix Tests test`
