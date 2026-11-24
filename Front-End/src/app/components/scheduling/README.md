# Scheduling

## Overview
Standalone appointment booking and checkout component (`selector: 'app-scheduling'`) that loads the backend treatment catalog, enforces patient payment-mode eligibility (`full`, `partial`, or `clinic`), creates appointments, and redirects online checkouts to Mercado Pago.

## Interface
- `TreatmentOption` (`[scheduling.ts:TreatmentOption]`): Exported interface describing a backend treatment option (`reason`, `duration`, `assignDoctor`, `price`, `description?`).
- `Scheduling` (`[scheduling.ts:Scheduling]`): Standalone Angular component (`selector: 'app-scheduling'`, implements `OnInit`).
  - Public state: `patientType: string | null`, `canPayAtClinic: boolean`, `selectedPaymentMode: 'full' | 'partial' | 'clinic'`, `availableHours: string[]`, `schedulForm: FormGroup`, `isFormReady: boolean`, `scheduleStatus`, `reasonSchedule: TreatmentOption[]`, `userService: UserService` (`[scheduling.ts:Scheduling]`).
  - Public methods: `ngOnInit()`, `loadTreatments()`, `fetchPatientDetails()`, `fetchPaymentEligibility()`, `generateTimeSlots()`, `initializeFormSync()`, `changeValue(event)`, `getSelectedTreatment()`, `getAdvanceAmount()`, `getRemainingBalance()`, `selectPaymentMode(mode)`, `submitSchedule()` (`[scheduling.ts:Scheduling]`).

## Invariants
- `availableHours` contains half-hour time slots from `08:00` through `16:00` (`[scheduling.ts:Scheduling.generateTimeSlots]`).
- `isFormReady` becomes `true` only after `GET /api/treatments` yields a non-empty treatment catalog; choosing a treatment synchronizes `durationMinutes`, `reason`, and `providerName` (`[scheduling.ts:Scheduling.loadTreatments]`, `[scheduling.ts:Scheduling.changeValue]`).
- Clinic payment mode (`'clinic'`) is allowed only when `canPayAtClinic === true`; `selectPaymentMode('clinic')` rejects ineligible patients with an info modal and `fetchPaymentEligibility()` reverts `'clinic'` to `'full'` when disallowed (`[scheduling.ts:Scheduling.fetchPaymentEligibility]`, `[scheduling.ts:Scheduling.selectPaymentMode]`).
- `submitSchedule()` rejects invalid forms, dates earlier than local today (`selectedDate < today`), Saturdays/Sundays (`dow === 0 || dow === 6`), and missing treatments before showing checkout confirmation (`[scheduling.ts:Scheduling.submitSchedule]`).
- Partial-payment previews calculate `Math.round(price * 0.5)`, while `payOnline()` overwrites stored receipt totals with server-returned `payRes.amount` and `payRes.total` before redirecting to Mercado Pago (`[scheduling.ts:Scheduling.getAdvanceAmount]`, `[scheduling.ts:Scheduling.payOnline]`).

## Side Effects
- Runs an Angular `effect()` synchronizing `patientName`, `patientId`, `contactNumber`, and `email` from `UserService.userLogged()` (`[scheduling.ts:Scheduling.constructor]`).
- Performs HTTP `GET` requests to `/api/treatments`, `/api/user/profile`, and `/api/get/patientDetails`, and `POST` requests to `/api/register/appointment` (with `status: 'Pending_Clinic_Payment'` for clinic bookings) plus `ScheduleService.processPay(appointmentId, mode)` for online payments (`[scheduling.ts:Scheduling.loadTreatments]`, `[scheduling.ts:Scheduling.fetchPaymentEligibility]`, `[scheduling.ts:Scheduling.fetchPatientDetails]`, `[scheduling.ts:Scheduling.payOnline]`, `[scheduling.ts:Scheduling.payAtClinic]`).
- Reads `localStorage.getItem('cita')` on init, persists `localStorage.setItem('citaPagoInfo', ...)` during online checkout, and deletes `'cita'` upon booking/redirect (`[scheduling.ts:Scheduling.initializeFormSync]`, `[scheduling.ts:Scheduling.payOnline]`, `[scheduling.ts:Scheduling.payAtClinic]`).
- Mutates `window.location.href` to redirect to Mercado Pago `init_point` or navigates to `/calendar` via Angular `Router`, renders SweetAlert2 confirmation/loading/error dialogs, invokes `ChangeDetectorRef.detectChanges()`, and logs failures via `console.error` (`[scheduling.ts:Scheduling]`).

## Verification
- Run: `npm --prefix Front-End test`
