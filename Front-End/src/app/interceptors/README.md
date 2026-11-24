# Front-End Interceptors

## Overview
Provides the Angular HTTP interceptor that attaches JWT bearer credentials to outgoing API requests.

## Interface
- `tokenInterceptor` (`[token.interceptor.ts:tokenInterceptor]`): Angular `HttpInterceptorFn` cloning outbound requests with an `Authorization: Bearer <auth_token>` header when a token exists in `localStorage`.

## Invariants
- CMS public bypass (`[token.interceptor.ts:tokenInterceptor]`): Requests whose `req.url` contains `'/api/inicio'` are passed through unmodified without attaching an `Authorization` header.
- Request immutability (`[token.interceptor.ts:tokenInterceptor]`): Attaches headers via `req.clone({ setHeaders: { Authorization: ... } })` rather than mutating the original `HttpRequest`.

## Side Effects
- Reads `localStorage.getItem('auth_token')` on every non-bypassed HTTP request (`[token.interceptor.ts:tokenInterceptor]`).
- Writes diagnostic messages to browser `console.log` (`[token.interceptor.ts:tokenInterceptor]`).

## Verification
- Run: `npm --prefix Front-End test`
