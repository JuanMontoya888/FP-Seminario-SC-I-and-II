# CMS (`cms-dental`)

## Overview
Strapi v5 headless CMS application (`cms-dental`) serving Dental One's manageable public site content (`api::inicio.inicio` single type) over REST on port `1337` (by default), backed by SQLite, PostgreSQL, or MySQL via `better-sqlite3` / Strapi database configuration.

## Subdirectories & Boundaries
- [config](./config/README.md) - Strapi runtime configuration factories (`admin.ts`, `api.ts`, `database.ts`, `middlewares.ts`, `plugins.ts`, `server.ts`).
- [src](./src/README.md) - Strapi application lifecycle entrypoints (`index.ts`), admin panel customization templates, and custom content-type APIs (`api/inicio`).
- [types](./types/README.md) - Strapi-generated TypeScript schema declarations augmenting `@strapi/strapi`.

## Developer Notes & CLI Usage
Strapi provides a CLI to manage development, builds, and deployment:

- **`develop`**: Start Strapi with autoReload enabled (`npm run develop` / `yarn develop`).
- **`start`**: Start Strapi with autoReload disabled (`npm run start` / `yarn start`).
- **`build`**: Build the Strapi admin panel (`npm run build` / `yarn build`).
- **`deploy`**: Deploy to Strapi Cloud (`yarn strapi deploy`).

### Reference Links
- [Strapi documentation](https://docs.strapi.io)
- [Strapi CLI reference](https://docs.strapi.io/dev-docs/cli)
- [Strapi deployment guide](https://docs.strapi.io/dev-docs/deployment)
