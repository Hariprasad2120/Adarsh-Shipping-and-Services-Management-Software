# INTEGRATION ARCHITECTURE — Monolith

> Current state and the target framework for external system integrations.

## Today

- **Google Workspace** — OAuth-based: Calendar, Gmail, Drive, Chat
  (`src/lib/google-*-client.ts`, `GoogleWorkspaceConnection`,
  `GoogleChatSpace` / `GoogleChatSubscription` / `GoogleChatDelivery`).
- **Email** — `EmailQueue` + `/api/cron/email-flush`.
- **Accounting integration** — `AccountingIntegrationInbox` /
  `AccountingIntegrationOutbox` with per-message idempotency keys
  (`@@unique([orgId, sourceSystem, idempotencyKey])`).
- **JustDial** — lead import worker.
- Secrets for these live in provider env / connection rows; not rendered back to
  the UI after creation.

Each integration is module-local. There is no centralised registry, no common
webhook platform, no service-account model yet.

## Target framework (spec §12) — PARTIAL

### Centralised integration registry — NOT BUILT
`Integration(orgId, kind, status, config, secretRef, createdBy, lastUsedAt)` +
a per-kind config schema. Secrets stored in a secure store, referenced by
`secretRef`; **never** returned to the UI after creation (write-only rotate).

### Service accounts (spec §9) — NOT BUILT
Non-human access: org-owned, explicit scopes, expiry, secret rotation,
last-used tracking, revocation, audit logging. Not a human admin password.

### API credentials (spec §10) — NOT BUILT
Scoped API keys: name, scopes, created by / date, expiry, last used, revoke,
rotate. Secret shown once; store an irreversible hash. Rate-limited (reuse the
Stage 1 rate-limit store).

### Outbound webhook platform (spec §11) — NOT BUILT
Centralised: event subscriptions, HMAC signatures, timestamp + replay
protection, delivery ids, retry with exponential backoff (reuse
`core/jobs` `backoffDelayMs`), delivery history, manual retry, auto-disable after
sustained failure. **SSRF guard required** — validate destination URLs against
an allowlist / block private ranges (reuse `src/lib/safe-fetch.ts` /
`safe-redirect.ts` patterns).

## Reusable primitives already available

- `core/jobs` — reliable delivery with retry / backoff / dead-letter, org
  context, idempotency.
- `core/idempotency` — `withIdempotency` for inbound webhook processing.
- `core/config-audit` — record integration config changes (secrets redacted).
- `core/observability` — correlation ids + structured logs for integration calls.
- `src/lib/safe-fetch.ts` — SSRF-aware outbound fetch.
