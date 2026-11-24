# Back-End Services

## Overview
Encapsulates reusable Back-End domain services: HTML email template rendering, multi-provider email delivery, financial reporting over clinic ERP ledgers, shared appointment reservation rules, and WhatsApp reminder notifications via Twilio.

## Interface
- Email templates (`[emailTemplates.js:templates]`): Default export object exposing HTML generators `bienvenida(nombre)`, `citaConfirmada(datos)`, `pagoRecibido(nombre, monto, concepto)`, `verificacionCorreo(nombre, verificationUrl)`, `recuperarContrasena(nombre, resetUrl)`, `pagoRechazado(nombre, concepto)`, `citaCancelada(datos)`, `contactoAdmin(datos)`, and `contactoPaciente(nombre)`.
- `enviarCorreoSMTP({ to, subject, html })` (`[mailer.js:enviarCorreoSMTP]`): Dispatches HTML emails through `'resend'`, `'gmail-api'`, or `'smtp'` (selected via `EMAIL_PROVIDER`, defaulting to `'resend'` when `RESEND_API_KEY` is set, else `'smtp'`) and returns `{ ok: true }` or `{ ok: false, message }`.
- `report(accounts, from, to, today, journal)` (`[operationReports.js:report]`): Pure aggregation returning P&L, cash/balance-sheet totals, overdue receivables, monthly `trend`, expense `categories`, and top-10 `debtors`.
- `journalAccounts` (`[operationReports.js:journalAccounts]`): Allowed double-entry ledger account keys (`['cash', 'inventory', 'fixedAssets', 'otherAssets', 'liabilities', 'capital', 'sales', 'costs']`).
- Reservation rules (`[reservations.js:module.exports]`): Exports `RESERVATION_MINUTES` (`15`), `OFFLINE_PAYMENT_HOURS` (`48`), `INACTIVE_STATUSES` (`['Canceled', 'Payment_Failed']`), `findScheduleConflict(cita, excludeId)`, `appointmentStart(cita)`, `pendingPaymentDeadline(cita, fechaMP)`, and `appendNote(notasActuales, nota)`.
- `WhatsAppService` singleton (`[whatsappService.js:WhatsAppService]`, `[whatsappService.js:WhatsAppService.sendAppointmentReminder]`): Default export instance providing `sendAppointmentReminder(to, appointmentDetails)` returning `Promise<boolean>`.

## Invariants
- Non-throwing mail contract (`[mailer.js:enviarCorreoSMTP]`): Never throws or rejects so callers can invoke it fire-and-forget; all provider calls enforce `EMAIL_TIMEOUT_MS` (`10000` ms, SMTP `socketTimeout` `20000` ms) (`[mailer.js:EMAIL_TIMEOUT_MS]`).
- Provider credential guards (`[mailer.js:enviarConResend]`, `[mailer.js:getGmailClient]`, `[mailer.js:getTransporter]`): Resend requires `RESEND_API_KEY`; Gmail API requires `EMAIL_USER`, `GMAIL_OAUTH_CLIENT_ID`, `GMAIL_OAUTH_CLIENT_SECRET`, and `GMAIL_OAUTH_REFRESH_TOKEN`; SMTP strips whitespace from `EMAIL_PASS`.
- Ledger accounting & template link rules (`[operationReports.js:report]`, `[operationReports.js:debitAccounts]`, `[emailTemplates.js:templates.bienvenida]`): Excludes `'quote'` accounts and entries with `date > to`; debit-normal accounts (`cash`, `inventory`, `fixedAssets`, `otherAssets`, `costs`) increase on debit and decrease on credit, while credit-normal accounts (`liabilities`, `capital`, `sales`) use the inverse sign; negative `cash` splits into `cashAsset = Math.max(0, cash)` and `overdraft = Math.max(0, -cash)` (counted under `totalLiabilities`), manual journal `costs` group under `'Asientos contables'`, and `debtors` is capped at the top 10 positive balances; `templates.bienvenida` links to `${(process.env.FRONTEND_URL || 'https://dentalone.mx').replace(/\/$/, '')}/log-in`.
- Conflict and deadline bounds (`[reservations.js:findScheduleConflict]`, `[reservations.js:pendingPaymentDeadline]`): Appointments in `INACTIVE_STATUSES` (`'Canceled'`, `'Payment_Failed'`) do not block slots; `pendingPaymentDeadline` never extends beyond `appointmentStart(cita)`.
- WhatsApp phone normalization (`[whatsappService.js:WhatsAppService.sendAppointmentReminder]`): Destination numbers lacking a leading `'+'` are prefixed with `'+52'`; unconfigured Twilio credentials safely return `false`.

## Side Effects
- Loads `.env` at import time (`[mailer.js:dotenv]`) and lazily caches module-level `transporter` and `gmailClient` singletons (`[mailer.js:getTransporter]`, `[mailer.js:getGmailClient]`).
- Performs outbound network calls to Resend HTTPS API (`https://api.resend.com/emails`), Google Gmail API (`users.messages.send`), or Gmail SMTP via Nodemailer (`[mailer.js:enviarConResend]`, `[mailer.js:enviarConGmailApi]`, `[mailer.js:enviarConSMTP]`).
- Queries MongoDB `Appointment` collection in `[reservations.js:findScheduleConflict]`.
- Instantiates a Twilio SDK client at module load when `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are present and sends WhatsApp messages via `this.client.messages.create` (`[whatsappService.js:WhatsAppService]`, `[whatsappService.js:WhatsAppService.sendAppointmentReminder]`).
- Emits operational logs and warnings to `stdout`/`stderr` via `console.log`, `console.warn`, and `console.error` (`[mailer.js:enviarCorreoSMTP]`, `[whatsappService.js:WhatsAppService.sendAppointmentReminder]`).

## Verification
- Run: `npm --prefix Tests test`
