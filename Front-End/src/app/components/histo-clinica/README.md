# Histo Clínica Component

## Overview
Implements step 2 of patient onboarding, collecting the patient's medical history questionnaire and submitting it to `/api/register/histo` before transitioning to `/tipo-paciente`.

## Interface
- `HistoClinica` (`[histo-clinica.ts:HistoClinica]`): Standalone Angular component (`selector: 'app-histo-clinica'`) implementing `OnInit`, exposing `histoForm: FormGroup`, option arrays (`padecimientos`, `booleano`, `edoSalud`), `ngOnInit()`, and `onSubmit()`.

## Invariants
- Complete questionnaire validation (`[histo-clinica.ts:HistoClinica.ngOnInit]`, `[histo-clinica.ts:HistoClinica.onSubmit]`): All 24 controls in `histoForm` carry `Validators.required`; submission is blocked with a warning modal when invalid.
- Boolean & field-key mapping (`[histo-clinica.ts:HistoClinica.onSubmit]`): Converts `'si'`/`'no'` radio values to booleans (`=== 'si'`) for all 14 boolean fields (`fiebreReumatica`, `enfermedadesCardiovasculares`, `mareos`, `diabetes`, `hepatitis`, `vih`, `artritis`, `gastritis`, `renales`, `anemia`, `sangradoAnormal`, `moretones`, `transfusiones`, and `problemaHormonal`) and maps `tratamientoMedicoActual` to `tratamiendoMedicoActual` before posting.

## Side Effects
- Sends `POST ${environment.apiUrl}/api/register/histo` (`[histo-clinica.ts:HistoClinica.onSubmit]`).
- Calls `userService.register(data.user)` when the API response contains `data.user` (`[histo-clinica.ts:HistoClinica.onSubmit]`).
- Displays SweetAlert2 alerts and navigates to `/tipo-paciente` on success or `/log-in` on HTTP `401` (`[histo-clinica.ts:HistoClinica.onSubmit]`).

## Verification
- Run: `npm --prefix Front-End test`
