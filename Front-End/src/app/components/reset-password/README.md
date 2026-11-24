# Reset Password

## Overview
Standalone password recovery form component (`selector: 'app-reset-password'`) that reads the `:token` route parameter and submits a validated replacement password through `UserService`.

## Interface
- `passwordsMatchValidator: ValidatorFn` (`[reset-password.ts:passwordsMatchValidator]`): Cross-field validator returning `{ mismatch: true }` when `password` and `confirmpsswd` differ.
- `ResetPassword` (`[reset-password.ts:ResetPassword]`): Standalone Angular component (`selector: 'app-reset-password'`, implements `OnInit`).
  - Public state & getter: `resetForm: FormGroup`, `token: string`, `showPassword: boolean`, `showConfirmPassword: boolean`, `passwordControl` (`[reset-password.ts:ResetPassword]`).
  - Public methods: `ngOnInit()`, `togglePasswordVisibility()`, `toggleConfirmPasswordVisibility()`, `onSubmit()` (`[reset-password.ts:ResetPassword.ngOnInit]`, `[reset-password.ts:ResetPassword.togglePasswordVisibility]`, `[reset-password.ts:ResetPassword.toggleConfirmPasswordVisibility]`, `[reset-password.ts:ResetPassword.onSubmit]`).

## Invariants
- Both `password` and `confirmpsswd` must match `passwordRegex` (8–15 characters with lowercase, uppercase, digit, and special character) and agree under `passwordsMatchValidator` (`[reset-password.ts:passwordRegex]`, `[reset-password.ts:passwordsMatchValidator]`, `[reset-password.ts:ResetPassword.ngOnInit]`).
- `onSubmit()` blocks submission when `resetForm.invalid` (marking all controls touched) or when route parameter `token` is empty (`[reset-password.ts:ResetPassword.onSubmit]`).

## Side Effects
- Shows and hides the global loading modal via `LoaderService.show()` and `LoaderService.close()` (`[reset-password.ts:ResetPassword.onSubmit]`).
- Sends the password reset request via `UserService.resetPassword(this.token, newPassword)` (`[reset-password.ts:ResetPassword.onSubmit]`).
- Displays SweetAlert2 success/error modals and navigates to `/log-in` after a successful reset (`[reset-password.ts:ResetPassword.onSubmit]`).

## Verification
- Run: `npm --prefix Front-End test`
