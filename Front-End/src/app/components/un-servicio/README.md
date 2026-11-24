# Un Servicio

## Overview
Single dental service detail component (`selector: 'app-un-servicio'`) that resolves a service item from `ServicioService` using the `:id` route parameter and provides browser back navigation.

## Interface
- `UnServicio` (`[un-servicio.ts:UnServicio]`): Angular component (`selector: 'app-un-servicio'`) exposing `@Input() servicio!: Servicio`, injected `unservicio: ServicioService`, `activatedRoute: ActivatedRoute`, and `volver(): void` (`[un-servicio.ts:UnServicio.volver]`).

## Invariants
- Subscribes to `activatedRoute.params` in the constructor and resolves `servicio` via `unservicio.getUnServicio(params['id'])`, relying on the `:id` route parameter indexing `ServicioService`'s array (`[un-servicio.ts:UnServicio.constructor]`).

## Side Effects
- Calls browser history back navigation via `this.location.back()` (`[un-servicio.ts:UnServicio.volver]`).

## Verification
- Run: `npm --prefix Front-End test`
