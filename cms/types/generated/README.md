# CMS Generated Types

## Overview
Holds Strapi-generated TypeScript declaration files (`components.d.ts`, `contentTypes.d.ts`) augmenting `@strapi/strapi`'s `Public.ContentTypeSchemas` module map with all active admin, plugin, and custom (`api::inicio.inicio`) schemas.

## Interface
- Components declarations (`[components.d.ts]`): Empty placeholder (no Strapi reusable components are currently defined).
- Content-type schema interfaces (`[contentTypes.d.ts]`): Exports 19 TypeScript interfaces (`AdminApiToken`, `AdminApiTokenPermission`, `AdminPermission`, `AdminRole`, `AdminSession`, `AdminTransferToken`, `AdminTransferTokenPermission`, `AdminUser`, `ApiInicioInicio`, `PluginContentReleasesRelease`, `PluginContentReleasesReleaseAction`, `PluginI18NLocale`, `PluginReviewWorkflowsWorkflow`, `PluginReviewWorkflowsWorkflowStage`, `PluginUploadFile`, `PluginUploadFolder`, `PluginUsersPermissionsPermission`, `PluginUsersPermissionsRole`, `PluginUsersPermissionsUser`) and augments `declare module '@strapi/strapi'` -> `Public.ContentTypeSchemas`.

## Invariants
- Generated artifact alignment (`[contentTypes.d.ts:ApiInicioInicio]`): `ApiInicioInicio` must stay synchronized with `cms/src/api/inicio/content-types/inicio/schema.json` (`collectionName: 'inicios'`, `draftAndPublish: true`, `SingleTypeSchema`).
- Type-only declarations (`[components.d.ts]`, `[contentTypes.d.ts]`): Contains exclusively compile-time TypeScript `.d.ts` declarations with no runtime JavaScript output.

## Side Effects
- None.

## Verification
- Run: `npm --prefix cms run build`
