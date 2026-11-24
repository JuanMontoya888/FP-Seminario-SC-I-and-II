# Front-End Services

## Overview
Provides root-injected Angular services for user authentication and session lifecycle, appointment synchronization, calendar grid and availability operations, Strapi CMS home content retrieval, contact form submission, Mercado Pago checkout initiation, dental procedures, static specialty catalogs, and SweetAlert2 loading indicators.

## Interface
- `AppointmentsService` (`[appointments.service.ts:AppointmentsService]`): Exposes `appointmentsArray: WritableSignal<Appointment[]>`, `getAppointmentById(id)` (`GET /api/user/appointment/:id`), and `fetchAppointmentsFromBackend()` (`GET /api/user/appointment`).
- `AuthService` (`[auth.service.ts:AuthService]`): Exposes `googleLogin(token)` (`POST ${environment.apiUrl}/api/login`).
- `CalendarService` (`[calendar.service.ts:CalendarService]`): Manages public calendar constants (`DAYS_OF_WEEK`, `FULL_DAYS_OF_WEEK`, `MONTHS_OF_YEAR`, `TOTAL_DAYS_OF_MONTH`), selection/period state (`selectedDay`, `selectedMonth`, `selectedYear`, `startDayOfPeriodSelected`, `endDayOfPeriodSelected`), in-memory `appointmentsUser` and `blockedSlots`, and exposes `getTreatments()` (`GET /api/treatments`), `fetchAppointments(isAdmin)`, `isBlocked(date, hour)`, `blockSlot`, `unblockSlot`, `blockRange`, `unblockRange`, `cancelAppointment`, calendar constant getters (`getDaysOfWeek`, `getFullDaysOfWeek`, `getMonthsOfYear`, `getTotalDaysOfMonth`, `getCurrentDayNumber`, `getCurrentMonthNumber`, `getCurrentYearNumber`), `getNewMonth(month, year)`, `getWeek(day)`, and `getApptBetweenPeriod()`.
- `Cms` (`[cms.ts:Cms]`): Exposes `strapiUrl` (`'https://striking-nurture-14a7abd8eb.strapiapp.com'`) and `getInicio()` (`GET ${strapiUrl}/api/inicio?populate=*`, unwrapping `response.data`).
- `ContactService`, `ContactData` (`[contact.service.ts:ContactService]`, `[contact.service.ts:ContactData]`): Exposes `submitContactForm(data)` (`POST /api/contact`).
- `LoaderService` (`[loader.service.ts:LoaderService]`): Static SweetAlert2 modal helper with `show(mensaje = 'Procesando...')` and `close()`.
- `ProcedureService` (`[procedure.service.ts:ProcedureService]`): Exposes `getMyProcedures()`, `getPatients()`, `getPatientProcedures(patientId)`, and `createProcedure(data)`.
- `ScheduleService` (`[schedule.service.ts:ScheduleService]`): Exposes `processPay(appointmentId, paymentMode: 'full' | 'partial')` (`POST /mercado-pago/proccesPay`).
- `ServicioService` (`[servicio.service.ts:ServicioService]`): Static service catalog accessor (`getServicios()`, `getUnServicio(posicion)` backed by `Servicios`).
- `UserService` (`[user.service.ts:UserService]`): Exposes `isLoggedIn: WritableSignal<boolean>`, `userLogged: WritableSignal<User | null>`, `isAdmin` getter, `getToken()`, `login(credential, password, isEmail)`, `loginWithGoogle(idToken)`, `logout()`, `register(userData)`, `resendVerificationEmail(email)`, `forgotPassword(email)`, `resetPassword(token, password)`, and `checkUserLogged()`.

## Invariants
- Reactive appointment syncing (`[appointments.service.ts:AppointmentsService]`): An Angular `effect()` automatically fetches appointments when `userService.userLogged()` becomes non-null and clears `appointmentsArray` to `[]` on logout; server `dateTime` strings are converted to local `Date` using `YYYY-MM-DD` plus `cita.hour`.
- Admin vs. patient calendar privacy & grid rules (`[calendar.service.ts:CalendarService]`): `fetchAppointments(true)` queries both `/api/admin/appointments` and `/api/availability`; `fetchAppointments(false)` queries only `/api/availability` and labels occupied slots strictly as `'Tu cita'` (`mine === true`) or `'Ocupado'`; `getNewMonth` always pads `daysInMonth` to 42 slots; `getWeek(day)` returns `{ startDay: '01', endDay: '01' }` for empty padding days and clamps periods at month boundaries when a week spans two months.
- User login behavior (`[user.service.ts:UserService]`): `login(credential, password, isEmail)` ignores `isEmail` and always sends `{ email: credential, password }` to `POST /api/user/login`; `loginWithGoogle` throws an `Error` if the response lacks `token` or `user`.
- Payment session gate (`[schedule.service.ts:ScheduleService]`): `processPay` immediately returns an error observable (`'User not logged in'`) if `!this.userService.isLoggedIn()`.
- Client-side session TTL (`[user.service.ts:UserService]`): `checkUserLogged()` enforces `SESSION_LIMIT_HOURS = 1` using `differenceInHours` against `infLog.time`; expired sessions trigger a SweetAlert2 warning and invoke `logout()`.
- Auth header formats (`[appointments.service.ts:AppointmentsService]`, `[contact.service.ts:ContactService]`, `[procedure.service.ts:ProcedureService]`, `[schedule.service.ts:ScheduleService]`): Services attach `x-auth-token` and/or `Authorization: Bearer <token>` headers sourced from `localStorage.getItem('auth_token')` or `UserService.getToken()`.

## Side Effects
- Executes HTTP calls via Angular `HttpClient` against `${environment.apiUrl}` (`/api/*`, `/mercado-pago/proccesPay`) and `${strapiUrl}/api/inicio` (`[cms.ts:Cms]`, `[auth.service.ts:AuthService]`).
- Reads, writes, and clears browser `localStorage` keys `'auth_token'` and `'infLog'` (`[user.service.ts:UserService]`, `[appointments.service.ts:AppointmentsService]`, `[procedure.service.ts:ProcedureService]`).
- Displays/closes SweetAlert2 modals (`[loader.service.ts:LoaderService]`, `[user.service.ts:UserService]`) and writes diagnostic logs via `console.log`/`console.error`.

## Verification
- Run: `npm --prefix Front-End test`
