# Log-In Component

## Overview
Provides email/password login, unverified-email resend prompts, password recovery initiation, and Google Identity Services Sign-In integration.

## Interface
- `LogIn` (`[log-in.ts:LogIn]`): Standalone Angular component (`selector: 'app-log-in'`) implementing `AfterViewInit`, exposing `loginForm: FormGroup`, `showPassword: boolean`, `ngOnInit()`, `ngAfterViewInit()`, `togglePasswordVisibility()`, `logIn()`, `onForgotPassword()`, and `handleCredentialResponse(response)`.

## Invariants
- Credential validation (`[log-in.ts:LogIn.ngOnInit]`, `[log-in.ts:LogIn.logIn]`): Requires valid email in `username` and non-empty `password` before calling `UserService.login`.
- Google Identity Services dependency (`[log-in.ts:LogIn.loadGoogleIdentityServices]`): Rejects initialization if `environment.googleClientId` is empty; reuses existing `google.accounts.id` if already loaded rather than appending duplicate script tags.
- Special error handling (`[log-in.ts:LogIn.logIn]`, `[log-in.ts:LogIn.handleCredentialResponse]`): HTTP `401` with exact message `'Por favor verifica tu correo electrónico antes de iniciar sesión.'` offers email verification resend; HTTP `404` with `needRegister: true` from Google login prompts navigation to `/register`.

## Side Effects
- Injects `<script src="https://accounts.google.com/gsi/client">` into `document.head` and renders the Google Sign-In button into `#google-button-container` (`[log-in.ts:LogIn.ngAfterViewInit]`, `[log-in.ts:LogIn.loadGoogleIdentityServices]`).
- Calls `UserService` (`login`, `resendVerificationEmail`, `forgotPassword`, `loginWithGoogle`) and toggles `LoaderService.show()` / `LoaderService.close()` (`[log-in.ts:LogIn]`).
- Displays SweetAlert2 modals and navigates to `'/'` or `'/register'` (`[log-in.ts:LogIn]`).

## Verification
- Run: `npm --prefix Front-End test`
