# Expediente Component

## Overview
Displays and allows authenticated patients to edit their clinical record across three tabs: personal demographics (`datos`), medical history (`medico`), and clinical evolution notes (`evoluciones`).

## Interface
- `Expediente` (`[expediente.ts:Expediente]`): Standalone Angular component (`selector: 'app-expediente'`) implementing `OnInit`, exposing tab state (`activeTab`), reactive forms (`datosForm`, `medicoForm`), edit flags (`editingDatos`, `editingMedico`), and methods `loadAll()`, `setTab(tab)`, `isInvalidField(form, field)`, `startEditDatos()`, `cancelEditDatos()`, `saveDatos()`, `startEditMedico()`, `cancelEditMedico()`, `saveMedico()`, and `goBack()`.

## Invariants
- Form validation rules (`[expediente.ts:Expediente.buildForms]`): `datosForm` validates `nombre`/`apep` (`minLength(2)`), `numcel` (`^[0-9]{10}$`), `telCasa` (`^$|^[0-9]{10}$`), `cp` (`^[0-9]{5}$`), `estatura` (`30..250`), `peso` (`2..300`), plus required fields; `medicoForm` requires `salud` and `presionArterial`.
- Tab switch resets edit modes (`[expediente.ts:Expediente.setTab]`): Switching between `'datos' | 'medico' | 'evoluciones'` sets both `editingDatos` and `editingMedico` to `false`.
- Loading completion latch (`[expediente.ts:Expediente.loadAll]`): Sets `loading = false` after both `GET /api/get/patientDetails` and `GET /api/get/histo` settle (success or error).

## Side Effects
- Executes HTTP calls via `HttpClient` against `${environment.apiUrl}/api`: `GET /get/patientDetails`, `GET /get/histo`, `GET /user/procedures`, `POST /register/patientDetails`, and `POST /register/histo` (`[expediente.ts:Expediente]`).
- Displays SweetAlert2 warning, success, and error modals (`[expediente.ts:Expediente.saveDatos]`, `[expediente.ts:Expediente.saveMedico]`).
- Navigates to `/paciente` via `goBack()` (`[expediente.ts:Expediente.goBack]`).

## Verification
- Run: `npm --prefix Front-End test`
