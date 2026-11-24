# Inicio Controller

## Overview
Registers the default Strapi core controller for the `api::inicio.inicio` single type powering Dental One home page content.

## Interface
- Default export (`[inicio.ts:default]`): Result of `factories.createCoreController('api::inicio.inicio')`.

## Invariants
- UID binding (`[inicio.ts:default]`): Bound strictly to content-type UID `'api::inicio.inicio'` without custom controller overrides.

## Side Effects
- None (delegates runtime persistence and HTTP handling to Strapi's core controller factory).

## Verification
- Run: `npm --prefix cms run build`
