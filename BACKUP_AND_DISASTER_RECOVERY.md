# BACKUP & DISASTER RECOVERY — Monolith

> Recovery must be **verified**, not assumed. A backup that has never been
> restored is not a backup. The numbers below are **deployment decisions** — this
> document defines the mechanism and the drill, not contractual RPO / RTO.

## Scope

| Asset | Store | Backup mechanism |
|---|---|---|
| Application database | PostgreSQL (Neon in the current deployment) | Provider point-in-time recovery + periodic logical dump (`pg_dump`) to object storage |
| Uploaded files | Object storage (Vercel Blob / S3-compatible) | Provider versioning + cross-region replication where available |
| Secrets / env | Deployment provider env store | Recorded in a sealed secrets manager, **not** in backups |
| Migrations | Git (`prisma/migrations/`) | Covered by source control |

## Targets (fill in per deployment)

| Objective | Definition | Value | Owner |
|---|---|---|---|
| **RPO** | Max acceptable data loss | _e.g. 5 min (PITR) / 24 h (dump)_ | Ops |
| **RTO** | Max acceptable downtime to restore | _e.g. 1 h_ | Ops |
| Backup retention | How long backups are kept | _e.g. 30 daily, 12 monthly_ | Ops |
| Offsite | Second region / provider | _yes/no + where_ | Ops |

## Encryption

- Backups encrypted at rest (provider-managed keys minimum; customer-managed
  keys is a deployment decision).
- Logical dumps written to object storage MUST be encrypted before upload.

## Restore procedure (outline — must be drilled)

1. Provision a clean environment (or a scratch database branch).
2. Restore the database: provider PITR to a timestamp, **or** `pg_restore` the
   chosen dump.
3. `npx prisma migrate status` — confirm schema matches the code being deployed.
4. Restore object storage (or re-point to the replicated bucket).
5. Re-inject secrets from the secrets manager.
6. Run smoke tests: `/api/health`, `/api/ready`, login, one read per major
   module, `provisionOrganisation` dry path.
7. Verify row counts on key tables against the last known-good snapshot.
8. Record the drill: date, backup age, wall-clock restore time, issues.

## Restore drills

- **Required cadence:** at least quarterly, and after any change to the backup
  pipeline. (Cadence is a deployment decision.)
- Automate steps 1–3 as a script in CI against a scratch DB branch where the
  provider supports it.
- Status: **no drill has been performed for this codebase yet.** Recovery is
  therefore **unverified** — this is a production blocker (`PRODUCTION_READINESS.md`).

## Application-side facts that help recovery

- All migrations are additive with rollback SQL in the file header; no
  destructive drops in a single deploy (`TENANCY_ARCHITECTURE.md` §4).
- `NumberingSequence` gaps are tolerated, so a restore-to-earlier-point does not
  corrupt document numbering (it may reuse numbers only if rows were lost — the
  unique constraints prevent duplicates going forward).
- `IdempotencyKey` and `BackgroundJob` are safe to replay after a restore.
