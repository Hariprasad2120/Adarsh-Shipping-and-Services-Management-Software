# Accounting Migration and Reconciliation Design

Status: Phase 2 synthetic-staging rehearsal only. No production, Neon or Zoho migration is authorized.

## Migration strategy

Use expand → migrate/backfill → validate/cut over → contract:

1. **Expand:** add nullable lineage columns, new tables, indexes, constraints and restricted foreign keys without deleting/renaming live data.
2. **Migrate:** profile authorized copies in read-only mode, map canonical IDs, load explicit configuration, backfill in resumable idempotent batches and retain source IDs/hashes.
3. **Validate:** run tenant/orphan/duplicate/balance/subledger/tax/report reconciliations and obtain Finance/CA acceptance.
4. **Cut over:** dual-read/compare where appropriate, stop legacy writers, enable canonical posting only after rollback criteria pass.
5. **Contract:** remove deprecated columns/tables only in a separately reviewed production migration after retention/archive evidence.

Rollback after a migration has been deployed uses a forward fix unless the additive migration transaction itself fails before commit. Posted or migrated financial facts are never rolled back by destructive deletion.

## Current migration sequence

| Migration | Treatment |
|---|---|
| 42 original migrations | Historical checksums remain unchanged |
| Four repair baselines/reconciliation migrations | Required for clean-chain history; clean databases execute them, matching populated databases may baseline only after exact read-only evidence |
| `20260730010000_accounting_phase2_foundations` | Additive tables/enums/indexes/checks/tenant triggers and nullable journal lineage |
| Phase 3 canonical sequence through `20260730051500_accounting_phase3_restore_gl_fk` | Canonical request/source/attempt/payroll evidence, immutable posting guards and schema/FK alignment |
| `20260730110000_accounting_phase3_hardening` | Additive legal-entity account ownership, wider canonical precision, immutable FX evidence, raw-write guards and unique correction lineage |
| `20260730123000_accounting_phase3_contract_guards` | Exact-staging-only fixture policy, independent tenant/legal-entity reference checks, payroll-run tenant guard and canonical child ownership enforcement |

The Phase 2 migration contains no `DROP`, destructive type conversion or required no-default column on a populated legacy table. `JournalEntry.rowVersion` is the only required legacy-table addition and has default `1`.

## Planned additive sequence

1. Foundation now: profile/entities/registrations, periods, currencies, account controls, dimensions, policy definitions, numbering, inbox/outbox and journal lineage.
2. Canonical kernel expansion: approval instances, posting attempts, immutable audit lineage and additional nullable journal currency/dimension/source fields.
3. Party/catalogue expansion: one-to-one customer/vendor finance profiles and versioned service/tax mappings against canonical CRM IDs.
4. AR/AP documents and typed allocations, initially shadowed beside legacy tables.
5. Bank import/match/reconciliation aggregates.
6. Payroll/claims/assets/partner/job financial extensions keyed to canonical source IDs.
7. Read models and reconciliation watermarks.
8. Backfill/cutover only after an authorized populated-data rehearsal.
9. Contract migrations for legacy writers/columns only after signed reconciliation and retention/archive approval.

Every stage has a separately deployable migration, validation query set and forward-fix. No stage combines a destructive contract change with the first release of its replacement.

## `HRLetterRequest.fileKey`

The historical physical `"fileKey"` column is retained and mapped as Prisma `legacyFileKey`. The reconciliation repair no longer drops it. The synthetic fixture stores `legacy/staging/preserved-letter-artifact.pdf`, and verification asserts that the value survives clean migration and reseeding. Any later archive/backfill/removal requires its own data inventory, destination contract, validation and approval.

## Legacy mapping

| Legacy | Target/handling |
|---|---|
| `Organisation` | Retain ID; create explicit Accounting profile only after configuration |
| `FiscalYear` | Retain; create non-overlapping `AccountingPeriod` children |
| `Account` | Retain IDs/codes; attach `AccountingAccountControl`; flag conflicts rather than silently recode |
| `JournalEntry`/`Line` | Retain facts; backfill period/source/currency only from reliable evidence; unresolved lineage becomes an exception |
| `GeneralLedgerEntry` | Validate as a projection; do not treat as a second canonical writer |
| `CrmAccount`/`CrmVendor` | Retain canonical IDs; finance extensions reference them |
| `CrmProduct` | Retain canonical service/item ID; finance/tax mapping is separate |
| `JobCosting` | Map to canonical `ChaJob.id`; do not create a second future job master |
| `TransactionLock` | Translate verified lock date/history into periods; preserve legacy evidence |
| Existing Float money/rates | Profile and convert only with explicit Decimal rules and reconciliation; no blind cast in Phase 2 |

## Data-volume assumptions

No production counts are available. All batch size, index build strategy, lock time and disk estimates remain unknown until an authorized anonymized restore or approved representative dataset is profiled. Production migration must not assume synthetic volumes.

## Preflight validation queries

Read-only examples; replace parameters through safe query binding:

```sql
-- Cross-tenant accounting links
SELECT p.id
FROM "AccountingPeriod" p
JOIN "FiscalYear" fy ON fy.id = p."fiscalYearId"
WHERE p."orgId" <> fy."orgId";

-- Overlapping periods
SELECT a."orgId", a.id, b.id
FROM "AccountingPeriod" a
JOIN "AccountingPeriod" b
  ON a."orgId" = b."orgId" AND a.id < b.id
 AND daterange(a."startDate", a."endDate", '[]')
     && daterange(b."startDate", b."endDate", '[]');

-- Unbalanced journals
SELECT j."orgId", j.id, SUM(l.debit) debit, SUM(l.credit) credit
FROM "JournalEntry" j
JOIN "JournalEntryLine" l ON l."journalEntryId" = j.id
GROUP BY j."orgId", j.id
HAVING SUM(l.debit) <> SUM(l.credit);

-- Duplicate source versions
SELECT "orgId", "sourceSystem", "sourceType", "sourceId", "sourceVersion", COUNT(*)
FROM "JournalEntry"
WHERE "sourceSystem" IS NOT NULL
GROUP BY 1,2,3,4,5
HAVING COUNT(*) > 1;

-- Preserved legacy file references
SELECT COUNT(*) total, COUNT("fileKey") populated
FROM "HRLetterRequest";
```

Additional gates: no orphaned party/account/period/job references; opening trial balance balances; AR/AP/employee subledgers equal control accounts; bank statement closing balances reconcile; tax register totals match source documents/returns; every migrated source ID/hash has one disposition; report totals bridge to journals.

## Zoho cutover scope

Planned detailed history is 2025-04-01 through 2027-03-31 with opening balances at 2025-04-01 and Monolith operational start 2027-04-01. This is planning information only. Required exports include masters, chart of accounts, opening balances, all transaction/document types, allocations, credits, journals/reversals, bank statements/reconciliations, taxes/returns/working papers, attachments, audit/source identifiers and report control totals. Actual export/API coverage is still unverified.

## Rehearsal commands

Only the guarded local target may run these:

```text
npm run staging:db:health
npm run staging:db:recreate
npm run staging:db:migrate
npm run staging:db:seed
npm run staging:db:seed
npm run staging:db:verify
npm run staging:test -- scripts/__tests__/staging-target.test.ts scripts/__tests__/accounting-phase2-foundations.integration.test.ts
```

The wrapper refuses any target other than `127.0.0.1:56432/monolith_accounting_staging`, user `monolith_staging`, with marker `MONOLITH_ACCOUNTING_STAGING_ONLY`.

## Synthetic rehearsal evidence

- Clean database: all 47 migrations applied.
- Prisma datasource-to-schema diff: no difference.
- Seed executed twice without count growth.
- Verifier: 3 fictional users, 2 balanced journals, 12 non-overlapping periods, 1 profile, 1 fictional legal entity, 2 currencies/1 functional, no configured GSTIN and populated legacy `fileKey`.
- 12 targeted tests passed, including cross-tenant, maker-checker, FX, uniqueness and six-worker atomic numbering invariants.
- Full guarded Vitest run: 242/245 tests passed. The three remaining failures are confined to the existing CHA integration suite (mock Google Drive checklist attachment, absent estimated filing date and missing direct-delete audit event); Accounting fixtures still passed verification afterward.

## Production gates

Before any populated deployment:

- authorized anonymized restore or approved representative dataset;
- read-only profiling and exact migration-history/checksum evidence;
- backup plus restore proof and rollback/forward-fix runbook;
- Zoho export coverage and immutable source archive;
- approved legal entities/GSTINs, fiscal/cutover, scales and statutory mappings;
- volume/index/lock rehearsal;
- reconciliation evidence and signed Finance/CA/UAT acceptance;
- explicit production migration authorization and credential handling through approved secret storage.

## Phase 3 rollout and rollback

Phase 3 is expand-only. Its migration sequence adds canonical posting evidence/state, database guards, schema/FK alignment and hardening without removing legacy facts. The hardening migration widens canonical Decimal capacity, adds nullable account/FX evidence links and replaces trigger definitions only to close direct-write gaps. Rollback is operational: disable new request preparation, retain canonical journals/read models, and forward-fix schema or application defects; posted facts are never rolled back by deletion.

Synthetic staging enables canonical bank transfer, manual journal, CRM request and approved HRMS payroll paths. Legacy direct GL/reversal helpers are blocked, while legacy reads and draft data remain. Depreciation, recurring journals, partner postings and other document-specific legacy postings remain gated until their configured canonical adapters pass parity tests; no production bypass flag exists.

Required populated-environment work remains unchanged: authorized restore, source profiling, backfill/reconciliation design, volume/locking evidence, Finance/CA acceptance and explicit production authorization. No Phase 3 test or migration authorizes Neon, Zoho, port 5432, real data or deployment.

## Phase 3 synthetic evidence

- Clean-chain recreation applied all 54 migrations.
- Migration status is current and datasource-to-schema diff reports no difference.
- Synthetic seed ran twice without count growth; verifier reports three fictional users, two balanced journals, 12 non-overlapping periods and preserved legacy `fileKey`.
- Hardened Decimal/architecture/canonical/legacy/Phase 2 target suite: 57/57 passed, including registered rule/source enforcement, tenant/legal-entity adversarial writes, actual duplicate, numbering, period-lock and reversal concurrency, immutable payroll correction rejection and stale-claim recovery.
- Phase 2 Accounting/isolation/security regression selection: 41/41 passed.
- Full guarded suite: 279/282 passed. The only failures are the same three accepted pre-existing CHA cases: mock Google Drive checklist attachment, absent estimated filing date and absent `JOB_DELETED_DIRECT` audit event.
- Production build passed Prisma generation, compilation, TypeScript and all 324 static pages; the existing non-fatal broad customer-portal file-trace warning remains.
- Staging application check returned HTTP 307 from `127.0.0.1:3100`.

## Phase 4 expand-only rollout

Phase 4 adds five forward-only migrations after the Phase 3 chain:

1. canonical document policy/document/line, payment/allocation and scheduled-occurrence tables plus outbox lease/result fields, tenant guards and immutability;
2. partial active-allocation/external-reference indexes, allocation row-lock capacity and correction remaining-capacity enforcement;
3. terminal scheduled-occurrence immutability;
4. a table-safe replacement for the shared Phase 4 tenant trigger discovered by guarded integration testing.
5. an effective-dated customer/vendor-to-legal-entity scope model and database tenant/party guard.

No legacy fields are dropped. Production activation is disabled. Operational rollback stops new preparation/claim entry points and leaves posted canonical facts readable; fixes move forward with additive migrations. Never delete or rewrite posted facts.

The clean guarded database was recreated from empty and the complete 59-migration chain applied. The accepted committed synthetic seed was streamed through the fail-closed staging wrapper so the two protected user-modified files remained untouched and the non-synthetic email edit was not seeded. Status, verifier and datasource-to-schema diff passed. No populated-data rehearsal occurred.

Phase 4 validation evidence:

- Phase 4 focused unit/architecture/integration selection: 39/39.
- Guarded Phase 2/3/4 database selection: 34/34.
- Full guarded suite: 306/309; only the same three accepted CHA failures remain.
- TypeScript and the production build passed; Next generated 328 pages. The unchanged non-fatal customer-portal trace warning remains.
- All Phase 4-created TypeScript files pass focused ESLint. The touched `actions.ts` retains the same 80 pre-existing `no-explicit-any` errors as committed HEAD. The previously documented `service.ts`/`seed.ts` debt remains exactly 36 errors and 23 warnings; no Phase 4 lint failure is hidden in it.
- Product catalogue generation/check passed with 0 errors and 0 warnings.
