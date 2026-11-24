# Pago Exitoso

## Overview
Mercado Pago return landing component (`selector: 'app-pago-exitoso'`) that verifies appointment payment confirmation with the backend, polls briefly while the asynchronous webhook settles, exposes invoice-request navigation when eligible, and generates a downloadable PDF payment receipt.

## Interface
- `PagoExitoso` (`[pago-exitoso.ts:PagoExitoso]`): Standalone Angular component (`selector: 'app-pago-exitoso'`, implements `OnInit`, `OnDestroy`).
  - Public state: `status: EstadoPago` (`'approved' | 'pending' | 'failure'`, `[pago-exitoso.ts:EstadoPago]`), `paymentId: string`, `merchantOrderId: string`, `pagoInfo: any`, `verifying: boolean`, `receiptAvailable: boolean`, `invoiceAppointmentId: string`, `estados`, `estadoActual` (`[pago-exitoso.ts:PagoExitoso]`).
  - Public methods: `ngOnInit()`, `ngOnDestroy()`, `downloadReceipt()`, `goToCalendar()`, `retryPayment()` (`[pago-exitoso.ts:PagoExitoso.ngOnInit]`, `[pago-exitoso.ts:PagoExitoso.ngOnDestroy]`, `[pago-exitoso.ts:PagoExitoso.downloadReceipt]`, `[pago-exitoso.ts:PagoExitoso.goToCalendar]`, `[pago-exitoso.ts:PagoExitoso.retryPayment]`).

## Invariants
- Query parameters returned by Mercado Pago (`collection_status`/`status`, `collection_id`/`payment_id`, `merchant_order_id`) are hints only: literal `'null'` payment IDs normalize to `''`, and any status other than `'approved'`, `'pending'`, or `'in_process'` maps to `'failure'` (`[pago-exitoso.ts:PagoExitoso.ngOnInit]`, `[pago-exitoso.ts:PagoExitoso.mapMpStatus]`).
- Payment status is never displayed as `'approved'` without backend confirmation; if `pagoInfo.appointmentId` is absent or verification errors while `status === 'approved'`, status falls back to `'pending'` (`[pago-exitoso.ts:PagoExitoso.ngOnInit]`, `[pago-exitoso.ts:PagoExitoso.verifyWithServer]`).
- `receiptAvailable` becomes `true` and `status` becomes `'approved'` only when the server returns `cita.status === 'Confirmed'` or `'Completed'`; `invoiceAppointmentId` is set only when `cita.paymentMode` is `'full'` or `'partial'` and `cita.amountExpected > 0` (`[pago-exitoso.ts:PagoExitoso.verifyWithServer]`).
- When Mercado Pago reports `'approved'` before the backend transitions to a terminal state (`Confirmed`, `Completed`, `Canceled`, `Payment_Failed`), server polling retries up to `maxVerifyAttempts = 5` times every `verifyDelayMs = 3000` ms (`[pago-exitoso.ts:PagoExitoso.verifyWithServer]`).
- Receipt and summary amounts (`totalPrice`, `paidAmount`, `pendingBalance`, `paymentMode`) are overwritten from server-calculated `cita.price` and `cita.amountExpected` whenever numeric (`[pago-exitoso.ts:PagoExitoso.applyServerAmounts]`).
- `downloadReceipt()` does nothing unless both `receiptAvailable` and `pagoInfo` are truthy (`[pago-exitoso.ts:PagoExitoso.downloadReceipt]`).

## Side Effects
- Reads `localStorage.getItem('citaPagoInfo')` and logs JSON parse failures via `console.error` (`[pago-exitoso.ts:PagoExitoso.ngOnInit]`).
- Polls the backend via `AppointmentsService.getAppointmentById(appointmentId)`, schedules retry timers with `setTimeout`, clears pending timers in `ngOnDestroy()`, logs errors to `console.error`, and invokes `ChangeDetectorRef.detectChanges()` (`[pago-exitoso.ts:PagoExitoso.verifyWithServer]`, `[pago-exitoso.ts:PagoExitoso.ngOnDestroy]`).
- Generates and downloads `Comprobante_Pago_${folio}.pdf` via `jsPDF` and `jspdf-autotable`, then opens a SweetAlert2 success toast (`[pago-exitoso.ts:PagoExitoso.downloadReceipt]`).
- Navigates to `/calendar` or `/scheduling` via Angular `Router` (`[pago-exitoso.ts:PagoExitoso.goToCalendar]`, `[pago-exitoso.ts:PagoExitoso.retryPayment]`).

## Verification
- Run: `npm --prefix Front-End test`
