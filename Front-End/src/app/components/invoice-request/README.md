# Invoice Request Component

## Overview
Allows authenticated patients to check eligibility, submit fiscal receiver data for an approved online appointment payment, and download an uncertified (`SIN_TIMBRAR`) XML or PDF invoice request summary.

## Interface
- `InvoiceRequest` (`[invoice-request.ts:InvoiceRequest]`): Standalone Angular component (`selector: 'app-invoice-request'`) exposing `receiver`, signals (`busy`, `eligible`, `invoice`, `error`), `notice`, `load()`, `submit()`, `downloadXml(record)`, and `downloadPdf(record)`.

## Invariants
- Single-submission guard (`[invoice-request.ts:InvoiceRequest.submit]`): Returns immediately without posting if `busy()`, `!eligible()`, or an `invoice()` record already exists.
- Fiscal input constraints (`[invoice-request.html]`): Template enforces `rfc` (12–13 chars), `name` (max 200), `postalCode` (`[0-9]{5}`), `taxRegime` (`6[0-9]{2}`), and `cfdiUse` (`[A-Za-z][0-9]{2}`) before `submit()`.
- Non-fiscal disclaimer (`[invoice-request.ts:InvoiceRequest.notice]`, `[invoice-request.ts:InvoiceRequest.downloadXml]`): Every UI screen, XML export (`EstadoFiscal = SIN_TIMBRAR`), and PDF header states the document is uncertified and not a valid CFDI.

## Side Effects
- Sends `GET` and `POST` requests to `${environment.apiUrl}/api/user/invoice-request/:id` (`[invoice-request.ts:InvoiceRequest.load]`, `[invoice-request.ts:InvoiceRequest.submit]`).
- Dynamically imports `jspdf` and `jspdf-autotable` and triggers client-side file downloads (`solicitud-factura-${record._id}.xml` via temporary Blob URL revoked after 1000 ms, and `.pdf` via `pdf.save`) (`[invoice-request.ts:InvoiceRequest.downloadXml]`, `[invoice-request.ts:InvoiceRequest.downloadPdf]`).

## Verification
- Run: `npm --prefix Front-End test`
