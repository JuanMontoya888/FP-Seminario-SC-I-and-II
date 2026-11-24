# Front-End Guards

## Overview
Provides functional Angular route guards controlling access to authenticated routes.

## Interface
- `authGuard` (`[auth.guard.ts:authGuard]`): Angular `CanActivateFn` verifying presence of `'auth_token'` in `localStorage`.

## Invariants
- Token presence gate (`[auth.guard.ts:authGuard]`): Returns `true` when `localStorage.getItem('auth_token')` is truthy; otherwise redirects to `'/'` and returns `false` (does not inspect JWT signature or expiration locally).

## Side Effects
- Reads `localStorage.getItem('auth_token')` (`[auth.guard.ts:authGuard]`).
- Triggers Angular router navigation to `'/'` via `router.navigate(['/'])` when unauthenticated (`[auth.guard.ts:authGuard]`).

## Verification
- Run: `npm --prefix Front-End test`
