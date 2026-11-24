# Calendar Component

## Overview
Provides the weekly/monthly appointment calendar interface for both patients (viewing anonymous availability, selecting slots to schedule, and linking to invoice requests for paid appointments) and administrators (filtering by doctor/status, exporting monthly reports to Excel/PDF, blocking/unblocking single slots or ranges, canceling unpaid appointments, and recording clinical procedures).

## Interface
- `Calendar` (`[calendar.ts:Calendar]`): Standalone Angular component (`selector: 'app-calendar'`) implementing `OnInit`, exposing:
  - Calendar navigation & filtering: `availableDoctors`, `reloadCalendar()`, `applyFilters()`, `changeMonth(next)`, `selectDay(day)`, `sethoursArray(startHour, finishHour)`, `initializeAppointmentsMap()`, `getDayObjectForColumn(indDay)`, `isPastOrWeekend(indDay)`.
  - Scheduling & formatting helpers: `scheduleAppointment(hour, dayObj)`, `handleScheduling(hour, dayObj)`, `formatTime(date)`, `formatFullDateTime(date)`, `getStatusColor(status)`, `statusLabel(status)`.
  - Admin actions & exports: `exportToExcel()`, `exportToPDF()`, `openProcedureModal(appointment)`, `closeProcedureModal()`, `isCancellable(status)`, `cancelSelectedAppointment()`, `isBlocked(hour, indDay)`, `toggleBlockSlot(hour, indDay)`, `openBlockRangeModal()`, `saveProcedure()`.

## Invariants
- Weekday & future-date scheduling guard (`[calendar.ts:Calendar.scheduleAppointment]`, `[calendar.ts:Calendar.isPastOrWeekend]`, `[calendar.ts:Calendar.initializeCalendarData]`, `[calendar.ts:Calendar.selectDay]`): Prevents scheduling on dates earlier than local midnight today or on weekends (`dow === 0 || dow === 6`); builds the half-hour slot grid from `Day_Cl.startDay` (`08:00`) through `Day_Cl.endDay` (`16:00`) on both initial load and day selection.
- Admin cancellation rule (`[calendar.ts:Calendar.isCancellable]`): Only appointments whose `status` is not in `['Confirmed', 'Completed', 'Canceled']` are eligible for admin cancellation.
- Admin filter options (`[calendar.ts:Calendar.ngOnInit]`, `[calendar.ts:Calendar.updateAvailableDoctors]`, `[calendar.html]`): Populates `#doctorFilter` dynamically from `GET /api/treatments` (`assignDoctor`) plus loaded appointments (`providerName`), and exposes all 7 appointment statuses in `#statusFilter`.
- Procedure modal & validation guards (`[calendar.ts:Calendar.openProcedureModal]`, `[calendar.ts:Calendar.saveProcedure]`): Requires `userService.userLogged()?.isAdmin`; rejects procedure submission if `dentista` or `descripcion` is blank; resolves patient via `patientId` first, falling back to sending `appt.email` as `patientEmail`.
- Export non-empty check (`[calendar.ts:Calendar.exportToExcel]`, `[calendar.ts:Calendar.exportToPDF]`): Aborts with a SweetAlert2 warning when `currentMonthAppointments` is empty.
- Invoice link eligibility in template (`[calendar.html]`): Displays `/solicitar-factura/:id` link only for non-admin users when `status` is `'Confirmed'` or `'Completed'`, `paymentMode` is `'full'` or `'partial'`, and `amountExpected > 0`.

## Side Effects
- Invokes `CalendarService` (`getTreatments`, `fetchAppointments`, `blockSlot`, `unblockSlot`, `blockRange`, `unblockRange`, `cancelAppointment`) and `ProcedureService` (`getPatientProcedures`, `createProcedure`) over HTTP (`[calendar.ts:Calendar]`).
- Writes selected slot JSON to `localStorage.setItem('cita', ...)` and navigates to `/scheduling` (`[calendar.ts:Calendar.handleScheduling]`).
- Triggers browser downloads of `Citas_<month>.xlsx` via `xlsx` and `Citas_<month>.pdf` via `jspdf` + `jspdf-autotable` (`[calendar.ts:Calendar.exportToExcel]`, `[calendar.ts:Calendar.exportToPDF]`).
- Displays SweetAlert2 prompts/confirmations/alerts and directly queries DOM inputs (`rng-date`, `rng-start`, `rng-end`) inside `readRangeInputs()` (`[calendar.ts:Calendar.readRangeInputs]`).

## Verification
- Run: `npm --prefix Front-End test`
