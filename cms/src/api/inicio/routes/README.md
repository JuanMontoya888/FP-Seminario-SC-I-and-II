# Inicio Routes

## Overview
Registers the default Strapi core REST router for the `api::inicio.inicio` single type (`/api/inicio`).

## Interface
- Default export (`[inicio.ts:default]`): Result of `factories.createCoreRouter('api::inicio.inicio')`.

## Invariants
- UID binding (`[inicio.ts:default]`): Bound strictly to content-type UID `'api::inicio.inicio'` using Strapi's default core route configuration.

## Side Effects
- None (delegates route registration to Strapi's core router factory).

## Verification
- Run: `npm --prefix cms run build`
