# Inicio API

## Overview
Groups the Strapi single-type API components (`api::inicio.inicio`, collection `inicios`, `draftAndPublish: true`) that manage dynamic copy and media for the Dental One home page. The single-type schema definition resides in `content-types/inicio/schema.json`.

## Subdirectories & Boundaries
- [controllers](./controllers/README.md) - Core Strapi controller for `api::inicio.inicio`.
- [routes](./routes/README.md) - Core Strapi REST router for `api::inicio.inicio`.
- [services](./services/README.md) - Core Strapi service for `api::inicio.inicio`.
- `content-types/inicio/schema.json` (JSON schema asset) - Defines the `Inicio` single type (`frasePrincipal`, `primerSubtituloInicio`, hero/services/about/location text fields, and `imagenSub1` / `imagenSubNosotros` media fields).
