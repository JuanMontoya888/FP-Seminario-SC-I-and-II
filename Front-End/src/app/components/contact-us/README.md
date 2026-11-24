# Contact Us Component

## Overview
Renders a reactive contact form allowing authenticated patients to submit inquiries to Dental One via `ContactService`.

## Interface
- `ContactUs` (`[contact-us.ts:ContactUs]`): Standalone Angular component (`selector: 'app-contact-us'`) exposing `contactoForm: FormGroup`, `submitted: boolean`, getter `f`, and `enviar()`.

## Invariants
- Client-side form validation (`[contact-us.ts:ContactUs]`): Enforces `nombre` (required, `minLength(3)`), `email` (required, email), `celular` (required, `^[0-9]{10}$`), `asunto` (required), and `mensaje` (required, `minLength(10)`).
- Authentication pre-check (`[contact-us.ts:ContactUs.enviar]`): Requires `userService.userLogged()` to be truthy before validating/submitting; unauthenticated users are prompted to navigate to `/log-in`.

## Side Effects
- Submits `POST /api/contact` through `ContactService.submitContactForm` and resets `contactoForm` on success (`[contact-us.ts:ContactUs.enviar]`).
- Displays SweetAlert2 warning, confirmation, loading, success, and error modals (`[contact-us.ts:ContactUs.enviar]`).
- Navigates to `/log-in` when an unauthenticated user confirms the prompt and logs request errors via `console.error` (`[contact-us.ts:ContactUs.enviar]`).

## Verification
- Run: `npm --prefix Front-End test`
