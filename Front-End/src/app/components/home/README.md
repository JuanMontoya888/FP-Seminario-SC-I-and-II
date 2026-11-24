# Home Component

## Overview
Landing page component rendering Dental One's static hero, innovation highlights, services summary, team section, `/calendar` appointment CTA, and embedded Google Maps location while fetching Strapi `inicio` content on initialization.

## Interface
- `Home` (`[home.ts:Home]`): Standalone Angular component (`selector: 'app-home'`) implementing `OnInit`, exposing `strapiData: any`, `bandAnim: Boolean`, `strapiService: Cms`, reactive `userIsLogged: boolean` getter (`UserService.isLoggedIn()`), `ngOnInit()`, and empty `ngAfterViewInit()`.

## Invariants
- Loader termination (`[home.ts:Home.ngOnInit]`): Sets `bandAnim = false` in both the `next` and `error` callbacks of `strapiService.getInicio()` so loading state cannot hang indefinitely.
- Reactive auth state & template boundary (`[home.ts:Home.userIsLogged]`, `[home.html]`): Derives `userIsLogged` directly from `UserService.isLoggedIn()` to toggle the login prompt; stores fetched Strapi `inicio` payload on `strapiData` while rendering static marketing copy and linking the CTA to `/calendar`.

## Side Effects
- Fires `GET ${strapiUrl}/api/inicio?populate=*` via `Cms.getInicio()` on component init (`[home.ts:Home.ngOnInit]`) and logs to `console.log`/`console.error`.
- Embeds a lazy-loaded Google Maps `<iframe>` in the template (`[home.html]`).

## Verification
- Run: `npm --prefix Front-End test`
