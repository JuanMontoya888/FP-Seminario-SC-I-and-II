# Help Component

## Overview
Renders the Dental One help center displaying a 4-step scheduling guide, an interactive FAQ accordion, and contact channel cards.

## Interface
- `Help` (`[help.ts:Help]`): Standalone Angular component (`selector: 'app-help'`) exposing `openIndex: number | null`, static `faqs` list (5 Q&A items), and `toggleAccordion(index: number)`.

## Invariants
- Single-open accordion (`[help.ts:Help]`): Initializes `openIndex` to `0` (first FAQ open); clicking the currently open index collapses it (`null`), while clicking another index opens only that item.

## Side Effects
- None.

## Verification
- Run: `npm --prefix Front-End test`
