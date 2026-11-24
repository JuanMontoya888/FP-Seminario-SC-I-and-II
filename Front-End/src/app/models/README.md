# Front-End Models

## Overview
Defines client-side TypeScript domain classes, interfaces, and static dental service catalog data used across Angular components and services.

## Interface
- `Appointment`, `AppointmentStatus` (`[appointment.ts:Appointment]`, `[appointment.ts:AppointmentStatus]`): Mutable appointment model supporting backend statuses (`'Scheduled' | 'Confirmed' | 'Canceled' | 'Completed' | 'Payment_Pending' | 'Payment_Failed' | 'Pending_Clinic_Payment'`), validated getters/setters (`dateTime`, `hour`, `durationMinutes`, `patientName`, `patientId`, `contactNumber`, `providerName`, `roomId`, `reason`, `status`, `notes`), readonly metadata (`_id`, `paymentMode`, `amountExpected`, `_idUser`), `static fromJSON(json)`, and `toJSON()`.
- `APPOINTMENTS_` (`[appointment.ts:APPOINTMENTS_]`): Static array of 10 sample `Appointment` instances.
- `Day_Cl`, `Month_Cl` (`[calendar.ts:Day_Cl]`, `[calendar.ts:Month_Cl]`): Calendar grid models (`Day_Cl` exposes `startDay = 8`, `endDay = 16`, `formattedDate`, and Spanish `dayString`).
- `Servicios` (`[misServicios.ts:Servicios]`): Static catalog array of 9 `Servicio` items describing Dental One specialties and public image filenames.
- `Procedure`, `PacienteOption` (`[procedure.ts:Procedure]`, `[procedure.ts:PacienteOption]`): Interfaces representing clinical procedures and admin patient selector entries.
- `Servicio` (`[servicio.ts:Servicio]`): Interface `{ nombre: string; descripcion: string; img: string }`.
- `User` (`[user.ts:User]`): Client user model with validated setters, `static fromJSON(json)`, and `toJSON()`, plus `USERS_` empty array (`[user.ts:USERS_]`).

## Invariants
- Appointment setter guards (`[appointment.ts:Appointment]`): Rejects non-`Date`/invalid `dateTime` values (leaving previous value unchanged); coerces `durationMinutes <= 0` to `30`; ignores 1-character non-empty `patientName` values; defaults `providerName` to `'Dr. Asignado'`, `status` to `'Scheduled'`, and `_idUser` to `''` when omitted.
- Calendar formatting (`[calendar.ts:Day_Cl]`): `formattedDate` returns `null` when `dayNumber === ''` and `YYYY-MM-DD` with 1-indexed zero-padded month otherwise; `dayString` maps `0..6` to `'Domingo'..'Sábado'`.
- User validation & hydration (`[user.ts:User]`): `name` and `lastname` setters require `length > 1`; `password` setter requires `length >= 8`; `User.fromJSON(json)` throws on falsy input and computes `isAdmin` from `json.role === 'admin' || json._isAdmin === true`; constructor generates `_idUser` via `crypto.randomUUID()` when omitted.

## Side Effects
- `[appointment.ts:Appointment.dateTime]` logs `'Fecha de cita inválida.'` via `console.error` when passed an invalid date.
- `[user.ts:User]` calls browser `crypto.randomUUID()` when constructed without an explicit `idUser`.

## Verification
- Run: `npm --prefix Front-End test`
