# OPERATIONS RUNBOOK — Monolith

> Common operational actions. The product must be operable by someone other than
> its original developer.

## Deploy

1. `npm run build` (runs `prisma generate` + `next build`).
2. Apply migrations: `npm run db:migrate:deploy` (`prisma migrate deploy` —
   never `migrate dev` in production).
3. Deploy the built app (provider-specific).
4. Smoke: `GET /api/health` → 200; `GET /api/ready` → 200; log in; one page per
   major module.

## Rollback

- App: redeploy the previous build / promote the previous deployment.
- Database: migrations are additive with rollback SQL in each
  `prisma/migrations/*/migration.sql` header. Old app instances keep working
  during a rolling deploy because no migration drops a column an old instance
  reads (expand/contract discipline). A true down-migration is manual — apply the
  rollback SQL from the file header.

## Run a migration safely

- Review the generated SQL for table locks, data loss, and old-instance
  compatibility before applying (`ZERO_DOWNTIME_MIGRATION` notes in
  `PRODUCTION_READINESS.md`).
- Prefer additive changes; backfill in a separate step; contract later.

## Backup / restore

- See `BACKUP_AND_DISASTER_RECOVERY.md`. Restore drills are quarterly.

## Background jobs

- Worker tick: `GET /api/cron/jobs` (cron-secret guarded). Register in the
  deployment's cron config.
- Stuck job: inspect `BackgroundJob` where `status='RUNNING'` and `lockedAt` is
  old; a crashed worker leaves it — it becomes claimable again once
  `runAfter` passes (no automatic reaper yet; manual `UPDATE ... SET status='PENDING'`).
- Dead-lettered job: `retryDeadJob(id)` after fixing the cause.

## User lockout recovery

- MFA lost: admin resets MFA for the user (Stage 1 flow); require re-enrolment.
- Password reset stuck: check `password-reset-token` expiry; issue a new token.
- Locked out of the org: another admin sets the membership back to `ACTIVE`.
- Platform admin lockout: DB-level — set `isPlatformAdmin = true` on a trusted
  user, or re-run bootstrap against a fresh DB.

## OAuth / mail / integration failure

- OAuth provider down: local credentials still work; surface a clear message.
- Mail outage: `EmailQueue` retains `pending` rows; `/api/cron/email-flush`
  drains them when the provider recovers.
- Integration failure: it is isolated to its module; check that module's audit
  log and the structured logs by `correlationId`.

## Secret rotation

- `SETUP_SECRET`, `CRON_SECRET`, DB URL, OAuth client secrets, integration
  secrets: rotate at the provider, update the env store, redeploy. Integration
  secrets are write-only in the UI — re-enter to rotate.

## Database incident

- `/api/ready` returns 503 with `database: fail`. Check the provider status and
  connection pool metrics (`getDatabasePoolMetrics()`), then follow the DB
  playbook in `INCIDENT_RESPONSE.md`.

## Compromised account

- See `INCIDENT_RESPONSE.md` → "Suspected account compromise".
