# CMS Source

## Overview
Root Strapi application source directory defining lifecycle hooks (`register`, `bootstrap`) alongside admin panel configuration examples and content-type APIs.

## Interface
- Application lifecycle hooks (`[index.ts:default]`): Default export object exposing no-op `register()` and `bootstrap()` lifecycle callbacks.
- Subdirectories:
  - [admin](./admin/README.md): Admin panel customization templates and TypeScript config.
  - [api](./api/README.md): Custom Strapi content-type APIs (`inicio`).

## Invariants
- Lifecycle hook shape (`[index.ts:default]`): Exports `register` and `bootstrap` methods matching Strapi's application entrypoint contract (currently empty no-ops).

## Side Effects
- None.

## Verification
- Run: `npm --prefix cms run build`
