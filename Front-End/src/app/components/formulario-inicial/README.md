# Formulario Inicial Component

## Overview
Implements step 1 of patient onboarding, prefilling profile and existing demographic details and persisting `PatientDetails` before routing to `/histo` (legacy component; route `/formulario` is currently commented out in `app.routes.ts` in favor of `/expediente`).

## Interface
- `FormularioInicial` (`[formulario-inicial.ts:FormularioInicial]`): Standalone Angular component (`selector: 'app-formulario-inicial'`) exposing `generalForm: FormGroup`, option lists (`escolaridades`, `civil`, `genero`), `ngOnInit()`, `loadUserData()`, `loadPatientDetails()`, and `onSubmit()`.

## Invariants
- Demographic form validators (`[formulario-inicial.ts:FormularioInicial.ngOnInit]`): Requires `nombre`, `apep`, `apem`, `direccion`, `cp` (`^\d{5}$`), `numcel` (`^\d{10}$`), `email` (valid email), `escolaridad`, `edoCivil`, `estatura` (`^\d\.\d+$`), `peso` (`^\d+$`), `nacimiento`, and `genero`; `telCasa` is optional (`^$|^\d{10}?$`).
- Sequential prefill flow (`[formulario-inicial.ts:FormularioInicial.loadUserData]`): Fetches `/api/user/profile`, splits `apellidos` on space into `apep` and `apem`, patches the form, then invokes `loadPatientDetails()` to overlay `/api/get/patientDetails` with `nacimiento` normalized to `YYYY-MM-DD`.

## Side Effects
- Reads `localStorage.getItem('auth_token')` for diagnostics (`[formulario-inicial.ts:FormularioInicial.ngOnInit]`).
- Executes HTTP calls: `GET /api/user/profile`, `GET /api/get/patientDetails`, and `POST /api/register/patientDetails` (`[formulario-inicial.ts:FormularioInicial]`).
- Displays SweetAlert2 warning/success/error dialogs and navigates to `/histo` upon save (`[formulario-inicial.ts:FormularioInicial.onSubmit]`).

## Verification
- Run: `npm --prefix Front-End test`
