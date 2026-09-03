# DEPLOYMENT — Monolith (enterprise)

> Production deployment architecture. Platform-provider specifics for the current
> Vercel target are in `VERCEL_DEPLOYMENT.md` and
> `SECURITY_DEPLOYMENT_CHECKLIST.md`; this document is provider-neutral and calls
> out which controls belong to the **application** vs the **infrastructure**.

## Responsibility split

| Concern | Application (Monolith) | Infrastructure / provider |
|---|---|---|
| AuthN / AuthZ / tenant isolation | ✅ | — |
| Migrations (additive, rollback SQL) | ✅ | runs `migrate deploy` |
| Structured logs, health/ready, correlation ids | ✅ emits | log drain / collector, alerting |
| Metrics | ✅ in-process counters | scrape + aggregate + dashboards |
| Background jobs | ✅ queue + runner | cron scheduler hitting `/api/cron/jobs` |
| Secrets | ✅ reads from env | secure secret store, rotation |
| TLS / DNS / CDN / WAF / DDoS | — | ✅ |
| Database HA / PITR / backups | — | ✅ (see `BACKUP_AND_DISASTER_RECOVERY.md`) |
| Object storage durability / replication | — | ✅ |
| Horizontal scaling of web nodes | ✅ stateless design | ✅ provisions instances |

## Environment variables (minimum)

| Var | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection (pooled) |
| `SETUP_SECRET` | gates `POST /api/setup` in production |
| `CRON_SECRET` | gates `/api/cron/*` |
| `LOG_LEVEL` | `debug|info|warn|error` (default `info`) |
| `APP_VERSION` / `VERCEL_GIT_COMMIT_SHA` | surfaced by `/api/health` |
| OAuth client id/secret, mail provider, object storage | per integration |

Full list and per-environment values: `VERCEL_DEPLOYMENT.md`.

## Release steps

1. `npm run build` (`prisma generate` + `next build`).
2. `npm run db:migrate:deploy`.
3. Deploy build; rolling / canary where supported (Rolling Releases).
4. Smoke: `/api/health` 200, `/api/ready` 200, login, one page per module.
5. Watch error rate / latency for the rollout window; roll back on regression.

## Scheduled jobs

- `/api/cron/jobs` — background-job worker tick (register in the cron config).
- Existing: `/api/cron/email-flush`, `leave-accrual`, `crm-reminders`,
  `todo-reminders`, `google-chat-retry`, `justdial-import`, … (all
  `CRON_SECRET`-guarded).

## Zero-downtime migration readiness (spec §24)

- Every Stage 2 migration is **additive**: new tables, new nullable columns,
  backfill in the same file, no drops. Old app instances keep serving during a
  rolling deploy.
- Contract migrations (make NOT NULL, drop `User.orgId`) are **deferred** until
  every reader is migrated, and will be applied as their own release.
- Rollback SQL is in each `prisma/migrations/*/migration.sql` header. A logical
  down-migration is manual.
- **Not yet stress-tested:** large-table `ALTER` lock behaviour at production
  data volumes. Review each migration's SQL before applying (Ops runbook).

## Scaling notes

- Web layer is stateless: sessions in the DB, no critical state in process
  memory. Correlation context is per-request (`AsyncLocalStorage`). Metrics are
  per-process and expected to be aggregated by infra.
- `unstable_cache` is per-instance; cache keys are org-scoped so no cross-tenant
  leak, but a multi-instance deployment should treat cached values as
  best-effort and rely on `revalidateTag` for correctness.
