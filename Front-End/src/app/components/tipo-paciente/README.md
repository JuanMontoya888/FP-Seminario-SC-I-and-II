# Tipo Paciente

## Overview
Patient onboarding component (`selector: 'app-tipo-paciente'`) that lets authenticated users choose whether they are a `'new'` or `'returning'` patient to configure online vs. in-clinic payment eligibility.

## Interface
- `TipoPaciente` (`[tipo-paciente.ts:TipoPaciente]`): Angular component (`selector: 'app-tipo-paciente'`) exposing `saving: boolean` and `select(patientType: 'new' | 'returning'): void` (`[tipo-paciente.ts:TipoPaciente.select]`).

## Invariants
- Re-entrancy guard `if (this.saving) return;` blocks concurrent submissions until an in-flight request completes or fails (`[tipo-paciente.ts:TipoPaciente.select]`).
- Accepted `patientType` values are restricted to `'new'` or `'returning'` (`[tipo-paciente.ts:TipoPaciente.select]`).

## Side Effects
- Sends `POST ${environment.apiUrl}/api/user/patient-type` via `HttpClient` (`[tipo-paciente.ts:TipoPaciente.select]`).
- Displays SweetAlert2 success/error modals, navigates to `'/'` via Angular `Router` on success, invokes `ChangeDetectorRef.detectChanges()` on error, and logs failures via `console.error` (`[tipo-paciente.ts:TipoPaciente.select]`).

## Verification
- Run: `npm --prefix Front-End test`
