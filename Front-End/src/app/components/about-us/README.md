# About Us Component

## Overview
Presents Dental One's history, clinic profile, and interactive Mission / Vision / Values expandable panel.

## Interface
- `AboutUs` (`[about-us.ts:AboutUs]`): Standalone Angular component (`selector: 'app-about-us'`) exposing `seccionActiva: SeccionMVV | null`, static copy properties (`mision`, `vision`, `valores`), and `seleccionar(seccion: SeccionMVV)` to toggle the active MVV panel.

## Invariants
- Toggle exclusivity (`[about-us.ts:AboutUs.seleccionar]`): `seccionActiva` starts as `null` and holds at most one of `'mision' | 'vision' | 'valores'`; selecting the already active section resets `seccionActiva` to `null`.

## Side Effects
- None.

## Verification
- Run: `npm --prefix Front-End test`
