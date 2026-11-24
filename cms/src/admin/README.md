# CMS Admin Customization Examples

## Overview
Contains Strapi admin panel customization template files (`app.example.tsx`, `vite.config.example.ts`) and the dedicated TypeScript compiler configuration (`tsconfig.json`) for the Strapi admin bundle.

## Interface
- Example admin config (`[app.example.tsx:default]`): Template object exposing `config.locales` (empty array with commented locale codes) and `bootstrap(app: StrapiApp)` hook.
- Example Vite config (`[vite.config.example.ts:default]`): Template function accepting `UserConfig` and returning `mergeConfig(config, { resolve: { alias: { '@': '/src' } } })`.
- Admin TypeScript config (`[tsconfig.json]`): Strict ESNext/Bundler React-JSX compiler settings (`noEmit: true`, `allowJs: false`).

## Invariants
- Non-active example filenames (`[app.example.tsx]`, `[vite.config.example.ts]`): Because both files carry the `.example` suffix, Strapi does not execute them until renamed to `app.tsx` / `vite.config.ts`.
- Vite config return contract (`[vite.config.example.ts:default]`): Must return the merged `UserConfig` object.
- Strict TypeScript mode (`[tsconfig.json]`): Enforces `"strict": true` and `"allowJs": false` over `../plugins/**/admin/src/**/*` and `./`.

## Side Effects
- `[app.example.tsx:bootstrap]` calls `console.log(app)` if activated by renaming to `app.tsx`.

## Verification
- Run: `npm --prefix cms run build`
