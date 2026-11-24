# Back-End Models

## Overview
Defines the MongoDB/Mongoose persistence schemas for clinical records, scheduling, users, contacts, invoicing, and clinic ERP operations, plus the Mercado Pago Checkout Pro preference client.

## Interface
- `BlockedSlot` (`[blockedSlot.js:blockedSlotSchema]`): Mongoose model for admin-blocked calendar slots (`date`, `hour`, `reason`, `createdBy` ref `User`).
- `Contact` (`[contact.js:ContactSchema]`): Mongoose model for patient contact messages (`user` ref `User`, `nombre`, `email`, `celular`, `asunto`, `mensaje`, `status`).
- `InvoiceRequest` (`[invoiceRequest.js:invoiceRequest]`): Mongoose model keyed by appointment `_id` (ref `Appointment`) storing CFDI invoice request fields (`rfc`, `name`, `postalCode`, `taxRegime`, `cfdiUse`, `concept`, `amount`, `currency`, `createdAt`).
- `MedicalHistory` (`[medicalHistory.js:medicalHistorySchema]`): Mongoose model storing a patient's medical questionnaire linked 1:1 to `User`.
- `crearPreferencia(datos)` (`[mercado_pago.js:crearPreferencia]`): Async function creating a Mercado Pago Checkout Pro preference (`MXN`) and returning `{ id, init_point }`.
- Operations models (`[operations.js:module.exports]`): Exports nine Mongoose models — `Account` (`OperatingAccount`), `Bank` (`BankMovement`), `Item` (`StockItem`), `Lot` (`StockLot`), `Supplier` (`StockSupplier`), `Order` (`StockPurchaseOrder`), `Asset` (`ClinicAsset`), `Invoice` (`FiscalArchive`), and `Journal` (`ClinicJournalEntry`).
- `PatientDetails` (`[patientDetails.js:patientDetailsSchema]`): Mongoose model storing a patient's demographic profile linked 1:1 to `User`.
- `Procedure` (`[procedure.js:procedureSchema]`): Mongoose model recording dental procedures performed for a `patient` (ref `User`) and optional `appointment` (ref `Appointment`).
- `Appointment` (`[scheduling.js:AppointmentSchema]`): Mongoose model for scheduled appointments, payment expectations, and reservation expiration timestamps.
- `User` (`[users.js:userSchema]`): Mongoose model for user accounts, roles, patient onboarding flags, email verification, and password reset tokens.

## Invariants
- Slot uniqueness (`[blockedSlot.js:blockedSlotSchema]`): Compound unique index `{ date: 1, hour: 1 }` prevents duplicate blocked slots.
- Allowed status and type enums:
  - `Contact.status` (`[contact.js:ContactSchema]`): `'Pending' | 'Reviewed' | 'Resolved'` (default `'Pending'`).
  - `Appointment.status` (`[scheduling.js:AppointmentSchema]`): `'Scheduled' | 'Confirmed' | 'Canceled' | 'Completed' | 'Payment_Pending' | 'Payment_Failed' | 'Pending_Clinic_Payment'` (default `'Scheduled'`).
  - `Appointment.paymentMode` (`[scheduling.js:AppointmentSchema]`): `'full' | 'partial' | 'clinic'` (default `null`).
  - `User.role` (`[users.js:userSchema]`): `'user' | 'admin'` (default `'user'`).
  - `User.patientType` (`[users.js:userSchema]`): `'new' | 'returning'` (default `null`).
  - `Account.kind` (`[operations.js:account]`): `'sale' | 'quote' | 'purchase' | 'expense' | 'payroll'`.
- One-to-one user records & clinical fields (`[medicalHistory.js:medicalHistorySchema]`, `[patientDetails.js:patientDetailsSchema]`, `[users.js:userSchema]`): `MedicalHistory.user`, `PatientDetails.user`, and `User.email` enforce unique constraints; `MedicalHistory` includes optional booleans (`renales`, `anemia`, `sangradoAnormal`, `moretones`, `transfusiones`, `problemaHormonal`) and `tratamiendoMedicoActual`.
- Appointment validation, indexes & retention (`[scheduling.js:AppointmentSchema]`): `hour` must match `HH:MM`, `email` is lowercased/trimmed and matched against `/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/`, `durationMinutes >= 1`, `patientName.length >= 2`, `reason.length >= 5`; compound indexes accelerate `{ providerName: 1, dateTime: 1, status: 1 }`, `{ user: 1, dateTime: -1 }`, and `{ status: 1, dateTime: 1 }`; `expiresAt` intentionally has NO MongoDB TTL index so expired reservations are canceled by application logic rather than deleted.
- Operations concurrency and indexes (`[operations.js:options]`, `[operations.js:account]`, `[operations.js:journal]`, `[operations.js:bank]`, `[operations.js:lot]`, `[operations.js:stockItem]`, `[operations.js:asset]`, `[operations.js:invoice]`): All nine operations models enable `optimisticConcurrency: true` and `timestamps: true`; descending `{ date: -1 }` indexes optimize `Account` and `Journal`; unique indexes enforce `(bankAccount, reference)`, sparse `match`, `(item, code)`, `sku`, `serial`, and `uuid`.
- Procedure cost bound (`[procedure.js:procedureSchema]`): `costo` must be `>= 0` when provided; indexed by `{ patient: 1, fecha: -1 }`.
- Password hashing (`[users.js:userSchema]`): The `pre('save')` hook hashes `password` with `bcryptjs` (`genSalt(10)`) whenever `password` is modified.
- Checkout return and webhook rules (`[mercado_pago.js:crearPreferencia]`): Configures `back_urls` (`success`, `failure`, `pending`) to `${FRONTEND_URL}/pago-exitoso` (defaulting to `http://localhost:4200`), sets `auto_return: 'approved'` only when `FRONTEND_URL` does not contain `'localhost'`, sets `notification_url` from `MP_NOTIFICATION_URL` or `${BACKEND_URL}/mercado-pago/webhook` when non-localhost, applies `expires: true` + `expiration_date_to` when `datos.expiresAt` is set and `date_of_expiration` when `datos.offlineDeadline` is set, and formats timestamps with explicit `+00:00` offset (`[mercado_pago.js:toMPDate]`).

## Side Effects
- Registers Mongoose models and indexes on the default `mongoose` connection upon module import across all schema files.
- Loads environment variables via `dotenv.config()` at import time (`[mercado_pago.js:dotenv]`).
- Performs outbound HTTPS calls to the Mercado Pago Preferences API (`preference.create`) and logs errors via `console.error` (`[mercado_pago.js:crearPreferencia]`).
- Mutates `User.password` in place via `bcryptjs` during `save` middleware (`[users.js:userSchema]`).

## Verification
- Run: `npm --prefix Tests test`
