# Back-End Config

## Overview
Provides the server-side treatment catalog and payment calculation helpers that serve as the single source of truth for appointment duration, assigned specialist, and pricing in the Back-End.

## Interface
- `TREATMENTS` (`[treatments.js:TREATMENTS]`): Array of treatment catalog objects (`{ reason, duration, assignDoctor, price, description? }`) covering 10 clinical services.
- `PARTIAL_PAYMENT_RATE` (`[treatments.js:PARTIAL_PAYMENT_RATE]`): Constant numeric ratio (`0.5`) representing the online deposit percentage.
- `findTreatment(reason)` (`[treatments.js:findTreatment]`): Looks up a treatment entry in `TREATMENTS` by exact `reason` string; returns the matching object or `null`.
- `amountForMode(price, mode)` (`[treatments.js:amountForMode]`): Computes the online amount to charge given a treatment `price` and payment `mode` (`'full'` or `'partial'`).

## Invariants
- Server-side pricing authority (`[treatments.js:TREATMENTS]`): Appointment `price`, `duration`, and `assignDoctor` must be sourced from `TREATMENTS`, never trusted from client payloads.
- Exact catalog matching (`[treatments.js:findTreatment]`): Matching is strictly case- and string-sensitive on `reason`; unknown reasons resolve to `null`.
- Deposit rounding rule (`[treatments.js:amountForMode]`, `[treatments.js:PARTIAL_PAYMENT_RATE]`): When `mode === 'partial'`, the amount is `Math.round(price * 0.5)`; for any other `mode`, the full `price` is returned unchanged.

## Side Effects
- None.

## Verification
- Run: `npm --prefix Tests test`
