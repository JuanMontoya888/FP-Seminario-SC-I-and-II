# Inicio Service

## Overview
Registers the default Strapi core service for the `api::inicio.inicio` single type.

## Interface
- Default export (`[inicio.ts:default]`): Result of `factories.createCoreService('api::inicio.inicio')`.

## Invariants
- UID binding (`[inicio.ts:default]`): Bound strictly to content-type UID `'api::inicio.inicio'` with no custom service logic.

## Side Effects
- None (delegates document queries and mutations to Strapi's core service factory).

## Verification
- Run: `npm --prefix cms run build`
