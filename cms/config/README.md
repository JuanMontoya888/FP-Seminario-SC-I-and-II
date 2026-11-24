# CMS Config

## Overview
Provides Strapi v5 runtime configuration factories for admin security secrets, REST API pagination limits, database drivers, HTTP middleware stack, plugins, and server host/port bindings.

## Interface
- Admin config (`[admin.ts:default]`): Factory returning `auth.secret` (`ADMIN_JWT_SECRET`), `apiToken.salt` (`API_TOKEN_SALT`), `transfer.token.salt` (`TRANSFER_TOKEN_SALT`), `secrets.encryptionKey` (`ENCRYPTION_KEY`), and feature flags `nps` / `promoteEE`.
- REST API config (`[api.ts:default]`): Static object setting `rest.defaultLimit` (`25`), `rest.maxLimit` (`100`), and `rest.withCount` (`true`).
- Database config (`[database.ts:default]`): Factory selecting `DATABASE_CLIENT` (`'sqlite'` default, `'mysql'`, or `'postgres'`) with driver-specific connection, SSL, pool (`min: 2`, `max: 10`), and `acquireConnectionTimeout` (`60000` ms).
- Middleware stack (`[middlewares.ts:default]`): Ordered array of 10 core Strapi middlewares (`strapi::logger` through `strapi::public`).
- Plugins config (`[plugins.ts:default]`): Factory returning an empty plugin override object (`{}`).
- Server config (`[server.ts:default]`): Factory returning `host` (`HOST`, default `'0.0.0.0'`), `port` (`PORT`, default `1337`), and `app.keys` (`APP_KEYS`).

## Invariants
- Supported database drivers (`[database.ts:default]`): `DATABASE_CLIENT` must match one of the configured keys (`'sqlite'`, `'mysql'`, `'postgres'`); `'sqlite'` resolves `DATABASE_FILENAME` (default `.tmp/data.db`) relative to two levels above `config/` (`cms/`) with `useNullAsDefault: true`.
- REST pagination bounds (`[api.ts:default]`): Default page size is `25`, maximum page size is `100`, and total counts are always included (`withCount: true`).
- Required runtime secrets (`[admin.ts:default]`, `[server.ts:default]`): `ADMIN_JWT_SECRET`, `API_TOKEN_SALT`, `TRANSFER_TOKEN_SALT`, `ENCRYPTION_KEY`, and `APP_KEYS` have no fallback defaults and must be provided via environment variables.
- Middleware execution order (`[middlewares.ts:default]`): `strapi::logger` and `strapi::errors` precede `strapi::security`, `strapi::cors`, and `strapi::body`.

## Side Effects
- None (pure configuration factories/constants evaluated by Strapi at boot time).

## Verification
- Run: `npm --prefix cms run build`
