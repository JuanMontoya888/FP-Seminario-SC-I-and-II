# Back-End Middlewares

## Overview
Express middleware modules enforcing JWT authentication and database-verified administrator authorization for protected Back-End API routes.

## Interface
- `authMiddleware(req, res, next)` (`[auth.middleware.js:authMiddleware]`): Default export. Verifies a signed JWT from the `Authorization: Bearer <token>` or `x-auth-token` header and attaches `decoded.user` to `req.user`.
- `adminMiddleware(req, res, next)` (`[admin.middleware.js:adminMiddleware]`): Default export. Verifies that the authenticated `req.user.id` corresponds to an existing `User` with `role === 'admin'` in MongoDB.

## Invariants
- Required environment secret (`[auth.middleware.js:jwtSecret]`, `[auth.middleware.js:authMiddleware]`): `process.env.JWT_SECRET` is captured at module load time; if missing, every request fails with HTTP `500`.
- Token extraction order (`[auth.middleware.js:authMiddleware]`): Prefers `Authorization` header (stripping literal `'Bearer '`) and falls back to `x-auth-token`; missing or invalid tokens return HTTP `401`.
- Middleware chaining order (`[admin.middleware.js:adminMiddleware]`): `adminMiddleware` must execute after `authMiddleware` so `req.user.id` is populated; otherwise it rejects with HTTP `401`.
- Authoritative role check (`[admin.middleware.js:adminMiddleware]`): Admin privileges are checked directly against the `User` collection rather than trusting claims in the JWT; missing users return HTTP `401` and non-admin roles return HTTP `403`.

## Side Effects
- Mutates `req.user` with the decoded JWT user payload (`[auth.middleware.js:authMiddleware]`) and overwrites `req.user.role` with the value fetched from MongoDB (`[admin.middleware.js:adminMiddleware]`).
- Performs a MongoDB read via `User.findById(req.user.id).select('role')` (`[admin.middleware.js:adminMiddleware]`).
- Writes configuration and runtime failure logs to `stderr` via `console.error` (`[auth.middleware.js:authMiddleware]`, `[admin.middleware.js:adminMiddleware]`).

## Verification
- Run: `npm --prefix Tests test`
