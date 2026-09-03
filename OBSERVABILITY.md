# OBSERVABILITY — Monolith

> Source: `src/modules/core/observability/`. Designed for an external
> log / metrics / APM pipeline without coupling to one vendor.

## Correlation

- `AsyncLocalStorage<CorrelationContext>` — `{ correlationId, requestId, route?, orgId?, userId?, source }`.
- `src/proxy.ts` generates / propagates `x-request-id` and `x-correlation-id`
  (echoed on the response) for every matched request.
- Route handlers / server actions / jobs open a scope:
  `runWithCorrelationFromHeaders(req.headers, { route, source }, fn)` or
  `runWithCorrelation(partial, fn)`. `enrichCorrelation({ orgId, userId })`
  merges fields once the session is resolved.
- Present in `/api/cron/jobs`; enqueued `BackgroundJob`s capture the
  `correlationId` at enqueue time.

## Logging

- `logger.{debug,info,warn,error}(msg, fields?)` → one JSON object per line:
  `{ ts, level, msg, correlationId, requestId, route?, orgId?, userId?, ...fields }`.
- Sensitive field names redacted (`password`, `secret`, `token`, `apiKey`,
  `clientSecret`, `cookie`, `authorization`, …); `Error` objects serialised
  (`name`, `message`, `stack`).
- Level gate via `LOG_LEVEL` (default `info`). Swappable sink for tests.
- **Pending:** ~249 raw `console.*` call sites to migrate onto `logger`.

## Metrics

- In-process counters + value summaries: `incr(name, labels?, by?)`,
  `observe(name, value, labels?)`, `timed(name, fn, labels?)`, `snapshot()`.
- Per-process by design; cross-instance roll-up is the infrastructure's job
  (scrape + aggregate). Nothing critical is stored only in process memory.
- Job runner already emits `jobs.succeeded` / `jobs.failed` / `jobs.duration_ms`.
- **Pending:** instrument auth errors, API latency, DB / mail / webhook failures,
  rate limits, security events.

## Health & readiness

- `GET /api/health` — liveness. `{ status, uptimeSeconds, version }`. No
  dependencies, always cheap. `version` from `APP_VERSION` /
  `VERCEL_GIT_COMMIT_SHA`.
- `GET /api/ready` — readiness. Checks the database (`SELECT 1`); `200` when all
  checks pass, `503` otherwise. Each check reports only `ok | fail` + duration —
  no connection strings, no error internals (those go to `logger.error`).
- Add further checks (mail provider, object storage, queue) to the `checks`
  array in `src/app/api/ready/route.ts` as those dependencies are wired.

## External APM / SIEM

- Structured JSON logs → any pipeline (Vercel log drains, OTel collector, …).
- `SecurityEvent` + `ConfigAuditEntry` are the security / config event streams;
  both are append-only and can be exported (see `INCIDENT_RESPONSE.md`).
- No vendor SDK is embedded; correlation ids make request tracing possible once
  a collector is attached.
