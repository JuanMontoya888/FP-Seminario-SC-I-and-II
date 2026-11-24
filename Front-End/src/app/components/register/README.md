# Register

## Overview
Standalone user registration component (`selector: 'app-register'`) that collects personal details and a validated password pair, then creates a patient account through the backend registration endpoint.

## Interface
- `passwordsMatchValidator: ValidatorFn` (`[register.ts:passwordsMatchValidator]`): Cross-field `FormGroup` validator returning `{ mismatch: true }` when `password` and `confirmpsswd` values differ.
- `Register` (`[register.ts:Register]`): Standalone Angular component (`selector: 'app-register'`, implements `OnInit`).
  - Public state & getters: `registerForm: FormGroup`, `showPassword: boolean`, `showConfirmPassword: boolean`, `passwordControl`, `confirmPasswordControl` (`[register.ts:Register]`).
  - Public methods: `ngOnInit()`, `togglePasswordVisibility()`, `toggleConfirmPasswordVisibility()`, `onSubmit()` (`[register.ts:Register.ngOnInit]`, `[register.ts:Register.togglePasswordVisibility]`, `[register.ts:Register.toggleConfirmPasswordVisibility]`, `[register.ts:Register.onSubmit]`).

## Invariants
- `password` and `confirmpsswd` must both satisfy `passwordRegex` (8–15 characters containing lowercase, uppercase, digit, and special character) and agree under `passwordsMatchValidator` (`[register.ts:passwordRegex]`, `[register.ts:passwordsMatchValidator]`, `[register.ts:Register.ngOnInit]`).
- `nombre`, `apellidos`, and a valid `email` are required; `onSubmit()` calls `markAllAsTouched()` and aborts if `registerForm.invalid` (`[register.ts:Register.ngOnInit]`, `[register.ts:Register.onSubmit]`).

## Side Effects
- Sends `POST ${environment.apiUrl}/api/register` via `HttpClient` (`[register.ts:Register.onSubmit]`).
- Displays SweetAlert2 info or error modals and navigates to `/log-in` once the success modal is confirmed or dismissed (`[register.ts:Register.onSubmit]`).
- Logs responses and failures via `console.log` and `console.error` (`[register.ts:Register.onSubmit]`).

## Verification
- Run: `npm --prefix Front-End test`
