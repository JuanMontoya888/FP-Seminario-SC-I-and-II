# Operations (Clinic ERP) Component

## Overview
Provides the administrator finance and inventory dashboard backed by `/api/admin/operations`, covering accounts receivable/payable, double-entry journal entries, P&L/balance-sheet reporting, CSV bank statement import and reconciliation, CFDI 4.0 XML archiving, stock lots/movements, suppliers, purchase orders, and clinic equipment maintenance.

## Interface
- `Operations` (`[operations.ts:Operations]`): Standalone Angular component (`selector: 'app-operations'`) exposing reactive signals (`busy`, `error`, `status`, `form`, `accounts`, `bank`, `invoices`, `journal`, `stock`, `report`, `openLot`), `today` (`America/Mexico_City` `YYYY-MM-DD`), view/filter state, and methods:
  - Data loading & form lifecycle: `refresh()`, `refreshReport()`, `openView(view)`, `save(form)`, `label(kind)`, `visibleAccounts()`.
  - Accounting & banking: `account()`, `journalEntry()`, `convert(row)`, `payment(row)`, `importBank(event)`, `candidates(movement)`, `match(movement, selected)`.
  - Fiscal archive: `invoice()`, `uploadInvoice(event, form)`, `downloadInvoice(row)`.
  - Inventory & assets: `item()`, `limits(item)`, `lot(item)`, `movement(lot)`, `supplier()`, `order(item)`, `asset()`, `maintenance(row)`, `lots(item)`, `available(item)`, `inventoryValue()`, `inventoryReport()`, `daysTo(date)`, `title(rows, id)`, `lastPrices(item)`, `width(bar, bars)`.

## Invariants
- Serialized action lock (`[operations.ts:Operations.action]`): Ignores concurrent mutations/loads while `busy()` is `true`; always resets `busy` to `false` in `finally`.
- Idempotent submission keys (`[operations.ts:Operations.payment]`, `[operations.ts:Operations.movement]`): Generates a fresh `crypto.randomUUID()` `requestKey` when opening payment and lot movement forms.
- CSV bank import contract (`[operations.ts:Operations.importBank]`): Rejects files larger than `1,000,000` bytes, parses up to `502` rows via `xlsx`, and requires columns `fecha`, `importe`, and `referencia`.
- Bank match candidate filter (`[operations.ts:Operations.candidates]`): Only proposes unmatched `bank` channel payments whose signed amount matches (`sale` positive, expenses negative) within `3` days (`3 * 86400000` ms).
- CFDI 4.0 XML guard (`[operations.ts:Operations.uploadInvoice]`): Rejects XML files `> 65,000` bytes or containing `<!DOCTYPE`, and requires root element `Comprobante` (`Version="4.0"`, namespace `http://www.sat.gob.mx/cfd/4`) with a `TimbreFiscalDigital` `UUID`.
- Monetary cent conversion & stock expiry semantics (`[operations.ts:Operations.available]`, `[operations.ts:Operations.inventoryValue]`, `[operations.html]`): API integer cent values are divided by `100` for `MXN` currency display; `available(item)` excludes expired lots (`!lot.expiry || lot.expiry >= today`), whereas `inventoryValue()` sums all lots regardless of expiry.
- Save refresh scope & UI guards (`[operations.ts:Operations.save]`, `[operations.html]`): Submitting `'/journal'` reloads only `loadReport()` while other mutations reload `load()` (full report updates on `'report'` tab switch or query); purchase-order triggers disable when `stock().suppliers` is empty and bank CSV upload disables while `bankAccount.trim()` is empty.

## Side Effects
- Automatically triggers `refresh()` in the constructor and performs `GET` and `POST` HTTP requests against `${environment.apiUrl}/api/admin/operations/*` (`[operations.ts:Operations]`).
- Reads uploaded CSV/XML files locally via `file.text()`, parses CSV via `xlsx` and XML via browser `DOMParser`, and calls `crypto.randomUUID()` (`[operations.ts:Operations]`).
- Downloads archived XML blobs (`${row.uuid}.xml`) by creating and revoking a temporary Blob object URL (`[operations.ts:Operations.downloadInvoice]`).

## Verification
- Run: `npm --prefix Front-End test`
