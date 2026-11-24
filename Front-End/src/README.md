# Front-End Source (`src`)

## Overview
Browser bootstrap entrypoint and root HTML document shell for the Dental One Angular SPA, connecting `App` and `appConfig` to the host page and build-time environment definitions.

## Interface
- Application bootstrap (`[main.ts]`): Imports `'zone.js'` and boots `App` with `appConfig` via `bootstrapApplication(App, appConfig)`.
- Host document (`[index.html]`): Defines `<base href="/">`, page title `DentalOne`, favicon `LOGO-DENTAL-ONE.png`, external Font Awesome `6.4.0` and Google Fonts (`Crimson Text`) links, and root host tag `<app-root></app-root>`.
- Subdirectories:
  - [app](./app/README.md) - Root `App` component, `appConfig`, route table, feature components, guards, interceptors, models, and services.
  - [environments](./environments/README.md) - Development and production build-time `environment` objects (`apiUrl`, `googleClientId`).

## Invariants
- Host mount alignment (`[main.ts]`, `[index.html]`): Bootstrapping `App` requires `<app-root></app-root>` in `index.html` to match `App`'s `selector: 'app-root'`.
- SPA base href (`[index.html]`): `<base href="/">` requires deployment hosts (e.g., Netlify/Nginx) to rewrite unknown client routes to `index.html`.

## Side Effects
- Loads `'zone.js'` globally and mounts the Angular application into the DOM, logging uncaught bootstrap errors via `console.error` (`[main.ts]`).
- Requests external CSS assets from `fonts.googleapis.com` and `cdnjs.cloudflare.com` on initial page load (`[index.html]`).

## Verification
- Run: `npm --prefix Front-End test`
