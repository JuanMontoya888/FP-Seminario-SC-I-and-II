# Paciente Component

## Overview
Renders the authenticated patient account dashboard with quick-access cards to `/expediente` and `/calendar` plus a chronological list of the patient's recorded dental procedures.

## Interface
- `Paciente` (`[paciente.ts:Paciente]`): Standalone Angular component (`selector: 'app-paciente'`) implementing `OnInit`, exposing `userName`, `userEmail`, `user`, `procedures: Procedure[]`, `loadingProcedures`, `proceduresError`, and methods `ngOnInit()`, `fetchData()`, `fetchProcedures()`, `goToExpediente()`, `goToCalendar()`, and `navigate()`.

## Invariants
- Session fallback defaults (`[paciente.ts:Paciente.fetchData]`): Reads `infLog` from `localStorage`; falls back to `userName = 'Nombre'` and `userEmail = 'email'` if missing, and catches malformed JSON errors without throwing.
- Loading/error state transitions (`[paciente.ts:Paciente.fetchProcedures]`): Resets `loadingProcedures = true` and `proceduresError = false` prior to fetching, and clears `loadingProcedures = false` on both success and failure.

## Side Effects
- Reads `localStorage.getItem('infLog')` (`[paciente.ts:Paciente.fetchData]`).
- Fetches `GET /api/user/procedures` through `ProcedureService.getMyProcedures()` (`[paciente.ts:Paciente.fetchProcedures]`).
- Navigates to `/expediente` or `/calendar` (`goToExpediente()`, `goToCalendar()`, and unbound `navigate()` method) via Angular `Router` and logs errors via `console.error` (`[paciente.ts:Paciente]`).

## Verification
- Run: `npm --prefix Front-End test`
