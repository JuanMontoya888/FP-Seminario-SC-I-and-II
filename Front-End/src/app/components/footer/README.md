# Footer Component

## Overview
Renders Dental One's global site footer with clinic hours, brand highlights, social links, and dynamic copyright year.

## Interface
- `Footer` (`[footer.ts:Footer]`): Standalone Angular component (`selector: 'app-footer'`) exposing `currentYear: number` initialized from `new Date().getFullYear()`.

## Invariants
- None.

## Side Effects
- None.

## Verification
- Run: `npm --prefix Front-End test`
