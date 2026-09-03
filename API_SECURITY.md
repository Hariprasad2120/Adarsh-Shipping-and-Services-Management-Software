# API SECURITY — Monolith

> Controls on Monolith's HTTP surface. Cross-reference `SECURITY_ARCHITECTURE.md`,
> `SECURITY_ROUTE_MATRIX.md`, `THREAT_MODEL.md` (Stage 1).

## Authentication & session

- Server-side sessions; org context always from the session, never the request
  (`src/lib/tenant.ts`).
- `/api/*` routes use `getSessionOrUnauth` / `requirePermission`.
- Cron routes: `requireCronSecret` (header-only; 503 in prod if unset).
- Bootstrap: `/api/setup` bootstrap-once + `SETUP_SECRET` header in prod.
- Mobile API: dedicated CORS handling (`src/lib/mobile-cors.ts`).

## Authorization

- Every mutating route calls `requirePermission(userId, key)` against the
  centralised catalogue. No role-name checks.
- Tenant boundary enforced per query (`tenantWhere` / `assertSameOrg`).

## Input handling

- Zod schemas on route bodies; `sanitizedString` for free text.
- File uploads: `src/lib/upload-validation.ts`, `safe-xlsx.ts`.
- SSRF: `src/lib/safe-fetch.ts` / `safe-redirect.ts` for any outbound / redirect.

## Transport & headers

- CSP with per-request nonce (`src/proxy.ts` + `security-headers.ts`).
- HSTS, `no-store` on authenticated responses (Back-button protection).
- `x-request-id` / `x-correlation-id` on every response (Stage 2).

## Rate limiting

- Shared rate-limit store (`src/lib/rate-limit-store.ts`); login rate limiting
  (`login-rate-limit.ts`). **Pending:** apply to bulk / export / provisioning /
  future API-key endpoints.

## Idempotency

- `core/idempotency` `withIdempotency({ orgId, scope, key }, fn)` — apply to
  payment-like, import, provisioning, and inbound-webhook endpoints
  (wiring pending — TASK.md Cluster 11).

## Not yet implemented

- Scoped API keys / tokens (see `INTEGRATION_ARCHITECTURE.md` §API credentials):
  name, scopes, expiry, last-used, revoke, rotate; secret shown once, stored
  hashed; per-key rate limits.
- Service accounts.
- A published, versioned external API surface + its own security matrix.

## Testing

- Stage 1: authentication, authorization, tenant-isolation test targets
  (`SECURITY_TESTING.md`). Stage 2 primitives add unit + E2E coverage
  (`ENTERPRISE_QA.md`). Independent penetration test scope: `PENTEST_SCOPE.md`.
