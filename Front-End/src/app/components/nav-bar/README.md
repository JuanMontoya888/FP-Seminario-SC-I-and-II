# Nav-Bar Component

## Overview
Renders the responsive top navigation bar and mobile drawer sidebar, exposing public routes, role-conditional patient/admin links, and logout confirmation.

## Interface
- `NavBar` (`[nav-bar.ts:NavBar]`): Standalone Angular component (`selector: 'app-nav-bar'`) exposing `wasOpenMenu: boolean`, `userService: UserService`, `toggleMenu()`, `cerrarMenu()`, and `logOut()`.

## Invariants
- Role-gated navigation visibility (`[nav-bar.html]`): Authenticated non-admin users see `/paciente` and `'Agendar Cita'` (`/calendar`); authenticated admin users see `'Gestionar Citas'` (`/calendar`), `/registrar-procedimiento`, `/cad-cam`, and `/administracion`. Unauthenticated desktop visitors see only `'Iniciar Sesión'` (`/log-in`), while the mobile drawer shows both `'Iniciar Sesión'` (`/log-in`) and `'Registrarse'` (`/register`).
- Body scroll lock symmetry (`[nav-bar.ts:NavBar.toggleBodyScroll]`): `document.body.style.overflow` is set to `'clip'` whenever `wasOpenMenu` is `true` and restored to `'auto'` when closed.

## Side Effects
- Mutates `document.body.style.overflow` when toggling or closing the mobile menu (`[nav-bar.ts:NavBar.toggleBodyScroll]`).
- Displays a SweetAlert2 confirmation modal and invokes `userService.logout()` on confirmation (`[nav-bar.ts:NavBar.logOut]`).

## Verification
- Run: `npm --prefix Front-End test`
