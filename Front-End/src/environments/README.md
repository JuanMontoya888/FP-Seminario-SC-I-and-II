# Front-End Environments

## Overview
Defines Angular build-time environment configurations for production (`environment.ts`) and local development (`environment.development.ts`), swapped via `fileReplacements` in `Front-End/angular.json`.

## Interface
- `environment` (`[environment.ts:environment]`): Production config object with `production: true`, `apiUrl: 'https://fp-seminario-sc-i-and-ii.onrender.com'`, and `googleClientId`.
- `environment` (`[environment.development.ts:environment]`): Development config object with `production: false`, `apiUrl: 'http://localhost:3000'`, and `googleClientId`.

## Invariants
- Trailing-slash convention (`[environment.ts:environment]`, `[environment.development.ts:environment]`): `apiUrl` must not end with `'/'`, as Angular services concatenate paths such as `${environment.apiUrl}/api/...` directly.
- Structural parity (`[environment.ts:environment]`, `[environment.development.ts:environment]`): Both files export identical keys (`production`, `apiUrl`, `googleClientId`) so Angular `fileReplacements` preserves type compatibility.

## Side Effects
- None.

## Verification
- Run: `npm --prefix Front-End test`
