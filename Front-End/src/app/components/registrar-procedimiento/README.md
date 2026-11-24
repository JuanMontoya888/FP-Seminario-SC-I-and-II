# Registrar Procedimiento

## Overview
Admin-only clinical procedure logging component (`selector: 'app-registrar-procedimiento'`) that lets dentists select a patient, inspect their prior procedure history, and record newly performed treatments.

## Interface
- `RegistrarProcedimiento` (`[registrar-procedimiento.ts:RegistrarProcedimiento]`): Angular component (`selector: 'app-registrar-procedimiento'`, implements `OnInit`).
  - Public state: `patients: PacienteOption[]`, `patientProcedures: Procedure[]`, `loadingHistory: boolean`, `saving: boolean`, `form` (`patientId`, `fecha`, `dentista`, `procedimientos`, `descripcion`, `indicaciones`, `costo`) (`[registrar-procedimiento.ts:RegistrarProcedimiento]`).
  - Public methods: `ngOnInit()`, `loadPatients()`, `onPatientChange()`, `submit()` (`[registrar-procedimiento.ts:RegistrarProcedimiento.ngOnInit]`, `[registrar-procedimiento.ts:RegistrarProcedimiento.loadPatients]`, `[registrar-procedimiento.ts:RegistrarProcedimiento.onPatientChange]`, `[registrar-procedimiento.ts:RegistrarProcedimiento.submit]`).

## Invariants
- Restricted to administrators: `ngOnInit()` checks `this.userService.userLogged()?.isAdmin` and redirects non-admin users to `'/'` without loading patient data (`[registrar-procedimiento.ts:RegistrarProcedimiento.ngOnInit]`).
- `form.fecha` defaults on initialization and resets after submission to the local date formatted as `YYYY-MM-DD` (`[registrar-procedimiento.ts:RegistrarProcedimiento.todayStr]`).
- `submit()` requires `form.patientId`, non-blank `form.dentista`, and non-blank `form.descripcion`, trimming text fields before submission (`[registrar-procedimiento.ts:RegistrarProcedimiento.submit]`).
- After a successful creation, procedure detail fields reset while retaining the selected `form.patientId`, and the patient's history reloads (`[registrar-procedimiento.ts:RegistrarProcedimiento.submit]`).

## Side Effects
- Performs backend API calls via `ProcedureService.getPatients()`, `ProcedureService.getPatientProcedures(patientId)`, and `ProcedureService.createProcedure(payload)` (`[registrar-procedimiento.ts:RegistrarProcedimiento.loadPatients]`, `[registrar-procedimiento.ts:RegistrarProcedimiento.onPatientChange]`, `[registrar-procedimiento.ts:RegistrarProcedimiento.submit]`).
- Navigates non-admin users to `'/'` via Angular `Router`, opens SweetAlert2 warning/success/error dialogs, invokes `ChangeDetectorRef.detectChanges()` for zoneless updates, and logs errors to `console.error` (`[registrar-procedimiento.ts:RegistrarProcedimiento]`).

## Verification
- Run: `npm --prefix Front-End test`
