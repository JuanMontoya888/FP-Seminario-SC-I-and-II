# Front-End Application Core (`src/app`)

## Overview
Defines the root Angular standalone component (`App`), global application providers (`appConfig`), client-side routing and role guards (`routes`), and links all feature UI components, guards, HTTP interceptors, domain models, and services.

## Interface
- `App` (`[app.ts:App]`): Root standalone Angular component (`selector: 'app-root'`, implements `OnInit`) rendering the global loader overlay, `<app-nav-bar>`, `<router-outlet>`, and `<app-footer>` (`[app.html]`), exposing `cargando: boolean`, `ngOnInit()`, and `quitarLoader()`.
- `appConfig` (`[app.config.ts:appConfig]`): `ApplicationConfig` registering `provideBrowserGlobalErrorListeners()`, `provideRouter(routes)`, `provideHttpClient(withInterceptors([tokenInterceptor]))`, and `provideZonelessChangeDetection()`.
- `routes` (`[app.routes.ts:routes]`): Top-level Angular `Routes` table mapping:
  - Public routes: `''` (`Home`), `'about-us'`, `'contact-us'`, `'help'`, `'services'`, `'servicio/:id'`, `'log-in'`, `'register'`, `'reset-password/:token'`, `'ayudando-a-sonreir'`, `'pago-exitoso'`.
  - Authenticated (`authGuard`) routes: `'calendar'`, `'histo'`, `'scheduling'`, `'paciente'`, `'expediente'`, `'registrar-procedimiento'`, `'tipo-paciente'`, and lazy `'solicitar-factura/:id'` (`InvoiceRequest`).
  - Admin (`adminOnly`) lazy routes: `'cad-cam'` (`CadCam`) and `'administracion'` (`Operations`).
  - Conditional dev-only route `'cad-cam-demo'` (`CadCam` when `!environment.production`) and wildcard `'**'` redirecting to `''`.
- Subdirectories:
  - [components](./components/README.md) - All 25 Angular UI components (public site, onboarding, clinical records, scheduling, payments, CAD-CAM, and ERP).
  - [guards](./guards/README.md) - Functional route guard (`authGuard`) enforcing client token presence.
  - [interceptors](./interceptors/README.md) - Outbound HTTP interceptor (`tokenInterceptor`) attaching JWT `Authorization` headers.
  - [models](./models/README.md) - Client-side domain classes, interfaces, and static dental specialty catalog.
  - [services](./services/README.md) - Root-injected API, authentication, calendar, Strapi CMS, payment, procedure, and loader services.

## Invariants
- Global HTTP and change-detection wiring (`[app.config.ts:appConfig]`): Every Angular `HttpClient` request passes through `tokenInterceptor`, and the app runs with `provideZonelessChangeDetection()`.
- Admin route authorization (`[app.routes.ts:adminOnly]`, `[app.routes.ts:routes]`): `/cad-cam` and `/administracion` require both `UserService.getToken()` and `UserService.isAdmin`; unauthorized attempts redirect to `'/'` via `Router.createUrlTree(['/'])`.
- Production demo isolation (`[app.routes.ts:routes]`): `/cad-cam-demo` is registered only when `environment.production` is `false`.
- Wildcard fallback (`[app.routes.ts:routes]`): Unmatched paths redirect to `''` (`Home`); `/formulario` is disabled in favor of `/expediente`.
- Loader dismissal failsafe (`[app.ts:App.ngOnInit]`, `[app.ts:App.quitarLoader]`): Sets `cargando = false` immediately on non-browser platforms or when `document.readyState === 'complete'`, on browser `window` `load`, or after a `4000` ms fallback timer, invoking `NgZone.run()` and `ChangeDetectorRef.detectChanges()`.

## Side Effects
- Registers a `window.addEventListener('load', ...)` listener, schedules a `4000` ms `setTimeout`, and logs loader transitions to `console.log` (`[app.ts:App.ngOnInit]`, `[app.ts:App.quitarLoader]`).
- Dynamically lazy-loads `CadCam`, `Operations`, and `InvoiceRequest` chunks upon route navigation (`[app.routes.ts:loadCadCam]`, `[app.routes.ts:routes]`).

## Verification
- Run: `npm --prefix Front-End test`
