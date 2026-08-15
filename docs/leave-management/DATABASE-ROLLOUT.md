# Leave Management — Database Rollout & Migration Drift Reconciliation

**Read this before running any Prisma migration command against a persistent
environment for this repo.** This procedure exists because a real,
pre-existing migration-history drift was discovered during this project
(documented in `TASKFILE.md` Blocker #1) — `prisma/migrations/` does not
fully match the actual schema of the configured `DATABASE_URL`, for reasons
unrelated to Leave Management (accounting-module tables `SalesInvoice`,
`Quotation`, `PurchaseInvoiceItem`, `VendorNote`, `Unit` differ from what
the tracked migration history implies).

**Do not run `prisma migrate reset` or `prisma migrate dev` against any
persistent (staging or production) database.** `migrate dev` specifically
was attempted once during this project and its own response was to demand
a full schema reset ("You may use prisma migrate reset... All data will be
lost") rather than proceed — this is the drift symptom, not a fluke.

---

## Step 1 — Full database backup

Before touching anything, take a full backup of the target database.

For Neon (the provider currently configured — see `.env`'s `DATABASE_URL`
host `ep-lucky-paper-ao7k5ek6-pooler...`):
```bash
# Neon supports point-in-time recovery and branch-based backups natively.
# From the Neon console: Branches → create a new branch from the current
# tip of main as an immutable backup point, OR use pg_dump directly:
pg_dump "$DATABASE_URL" -Fc -f leave_management_pre_migration_backup.dump
```

Verify the backup is restorable (on a throwaway database, not production)
before proceeding to Step 2.

## Step 2 — Check migration status

```bash
npx prisma migrate status
```

This compares `prisma/migrations/` against the `_prisma_migrations` table
in the target database. Record the exact output — this is the ground truth
for Step 3.

## Step 3 — Inspect `_prisma_migrations`

```sql
SELECT migration_name, finished_at, applied_steps_count, logs
FROM _prisma_migrations
ORDER BY finished_at DESC
LIMIT 30;
```

Cross-reference every row against `ls prisma/migrations/`. Two failure
modes to look for:
- **Migrations applied to the DB but missing from the repo** (someone ran
  `db push` or a manual `ALTER TABLE` directly against prod without
  committing the corresponding migration file).
- **Migrations in the repo but never applied to this specific database**
  (the migration file exists in git but `finished_at` has no matching row).

## Step 4 — Compare live schema against repo schema

```bash
npx prisma db pull --print > /tmp/live-schema-snapshot.prisma
```

This introspects the actual database and prints what Prisma sees as a
`.prisma` file, without touching `prisma/schema.prisma`. Diff it against
the tracked schema:

```bash
diff prisma/schema.prisma /tmp/live-schema-snapshot.prisma
```

Every difference is either (a) a legitimate divergence from an unapplied
migration (expected, and what this rollout will fix) or (b) drift that
predates this project and needs a decision from whoever owns the
accounting-module migrations, before Leave Management's migration can be
trusted to apply cleanly on top.

## Step 5 — Establish a baseline

If Step 3/4 reveal migrations that were applied directly to the database
outside the tracked history, the standard Prisma remedy is:

```bash
# For each migration that IS correctly reflected in the live schema but
# has no corresponding _prisma_migrations row (i.e., was applied by some
# other means — db push, manual SQL, a different branch's migrate deploy):
npx prisma migrate resolve --applied "<migration_folder_name>"
```

**This step requires a human with full knowledge of what actually happened
to the accounting-module tables** — it is a judgment call about which side
(repo or database) is authoritative for each divergent object, and this
document cannot make that call generically. Do not run `migrate resolve`
speculatively; only for migrations you have manually confirmed are already
correctly represented in the live schema.

## Step 6 — Apply the Leave Management migration to staging first

Once Steps 1–5 confirm the baseline is reconciled (i.e., `prisma migrate
status` reports the database is in a known, up-to-date state relative to
everything EXCEPT the new leave migration):

```bash
# Local staging DB (requires Docker Desktop running):
npm run staging:db:setup
npm run staging:db:migrate   # runs `prisma migrate deploy` against staging
npm run staging:db:verify
```

If a Docker-based local staging environment isn't available, provision a
throwaway Neon branch instead (`Branches → create branch from main`) and
point `DATABASE_URL` at the branch's connection string for this step only.

## Step 7 — Validate

```bash
npx prisma validate
npx prisma generate
npx tsc --noEmit
npm run build
npx vitest run --config <ad-hoc leave-module config>   # 73 tests as of this writing
```

Then manually exercise the app against the staging database: create an
org, employee, leave policy, submit and approve a leave request, confirm
the ledger balance matches expectations.

## Step 8 — Apply to production

Only after Step 7 passes cleanly on staging:

```bash
DATABASE_URL="<production-url>" npx prisma migrate deploy
```

Do this during a maintenance window if the org has one, since `ALTER
COLUMN ... SET DATA TYPE DECIMAL(10,4)` (the Float→Decimal type change —
see `TASKFILE.md` §3) takes a brief `ACCESS EXCLUSIVE` lock on
`LeaveBalance`/`LeaveType` while rewriting the column, proportional to
table size. On the current dataset size (per the audit, this is a young
module with limited historical data) this should be sub-second, but this
should still be verified against the actual row count before assuming
zero-downtime.

## Step 9 — Post-deploy verification

```bash
npx prisma migrate status   # should show "Database schema is up to date"
```

Spot-check a handful of real `LeaveBalance` rows to confirm the Decimal
conversion preserved values exactly (compare `SELECT balance FROM
"LeaveBalance"` before/after using the Step 1 backup vs. the live table).

## Step 10 — Rollback procedure

If Step 9 reveals a problem:

1. **Stop application traffic to the Leave Management routes** if possible
   (feature-flag the `/api/leave/*` and `/attendance/leaves*` routes, or
   put the app in maintenance mode).
2. Restore from the Step 1 backup:
   ```bash
   pg_restore -d "$DATABASE_URL" --clean --if-exists leave_management_pre_migration_backup.dump
   ```
   For Neon: restore by switching the branch pointer back to the
   pre-migration branch created in Step 1, which is typically faster and
   safer than `pg_restore` against a live Neon endpoint.
3. Confirm `prisma migrate status` reflects the pre-migration state.
4. Do not re-attempt the migration until the root cause of the failure is
   understood — re-running the same migration against a database that
   partially applied it can compound the problem.

---

## What this project could NOT verify directly

Per `TASKFILE.md`'s Blocker #0, the only `DATABASE_URL` available in this
development environment is write-denied at the Postgres role level (a
direct `db.organisation.create()` attempt failed with `P1010
DatabaseAccessDenied`). This means Steps 1–9 above are a documented,
reviewed **procedure**, not something this session executed and confirmed
against a real database. Whoever has actual write access to a Neon branch
or staging Postgres instance should run through this document once before
trusting it fully — treat it as a reviewed runbook, not a proven one.
