# Services

## Overview
Dental services catalog list component (`selector: 'app-services'`) that loads the static list of clinic offerings from `ServicioService` and renders cards linking to `/servicio/:id`.

## Interface
- `Services` (`[services.ts:Services]`): Angular component (`selector: 'app-services'`) exposing `misServicios: Servicio[]`, `miservicio: ServicioService`, and `ngOnInit()` (`[services.ts:Services.ngOnInit]`).

## Invariants
- None.

## Side Effects
- None.

## Verification
- Run: `npm --prefix Front-End test`
