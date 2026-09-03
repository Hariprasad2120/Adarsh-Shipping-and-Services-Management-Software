# CONCURRENCY & DATABASE REVIEW — Monolith (Stage 2)

> Spec §18 (race conditions) and §19 (Prisma/PostgreSQL model review).
> **Scope:** the twelve Stage 2 core primitives are reviewed definitively; the
> classic business-logic hotspots the spec names are spot-checked; a full
> per-model audit of all 468 models was **not** performed and remains open
> (`PRODUCTION_READINESS.md` blocker list).

Prisma default isolation is **READ COMMITTED**. Findings assume that unless a
`$transaction` or explicit lock is shown.

---

## 1. Stage 2 primitives — concurrency verdicts

| Primitive | Mechanism | Verdict | Evidence |
|---|---|---|---|
| **Numbering** `allocateNumber` | single atomic `UPDATE … RETURNING` with the reset condition evaluated in-SQL under the row's write lock | **SAFE** | 100 parallel allocations → 100 distinct, contiguous 1..100 (`ENTERPRISE_QA.md`) |
| **Jobs** `claimJobs` | `UPDATE … WHERE id IN (SELECT … FOR UPDATE SKIP LOCKED)` | **SAFE** | parallel workers never claim the same job; verified retry → DEAD path |
| **Idempotency** `withIdempotency` | `@@unique([orgId, scope, key])` claim + P2002 catch; replay COMPLETED result | **SAFE** | concurrent callers → exactly one execution; loser gets conflict or replayed result |
| **Approvals** `submitApprovalDecision` | `@@unique([requestId, level, actorUserId])` blocks a double vote; decision write + fold in one `$transaction` | **SAFE for correctness.** Two approvers clearing the same level simultaneously can both write valid decisions and each run `foldChain`; the final `status`/`currentLevel` write is last-writer-wins but both compute the **same** result from the same decision set, so the outcome is deterministic. A rejection racing an approval: whichever transaction commits last wins the status; `foldChain` treats any REJECT at the current level as terminal, so a REJECT that commits after an APPROVE still needs the level re-evaluated — **acceptable** because a decided request refuses further decisions (`status !== "PENDING"` guard). | reasoned; not load-tested |
| **Membership** `setPrimaryMembership` / `setDefaultLegalEntity` | `$transaction([updateMany unset others, update set one])` | **SAFE** — two concurrent "set primary" calls serialise on the row; the last commit wins with exactly one primary |
| **Provisioning** `provisionOrganisation` | upserts + `skipDuplicates`; org create de-dupes slug in a loop | **SAFE for re-runs.** Two *simultaneous* first-time provisions of the same new org name could both pass the slug check and create two orgs with different slugs — acceptable (distinct orgs). Applying a template to the *same existing org* twice concurrently: role/policy/sequence upserts are idempotent; a race can produce a transient unique conflict that surfaces as an error to retry, not a duplicate. |
| **Config audit** `recordConfigChange` | plain insert, append-only, errors swallowed | **SAFE** — no contention; never blocks the audited action |
| **Custom fields** `setFieldValues` | `$transaction` of per-field `upsert` keyed by `@@unique([definitionId, objectId])` | **SAFE** — concurrent writes to the same field on the same object serialise on the unique key; last write wins (expected for a field value) |
| **Regional / module settings** | `upsert` on a natural key + cache `revalidateTag` | **SAFE** — last write wins (config semantics); cache is org-scoped |
| **Legal entity / structure CRUD** | tenant-guarded by-id upserts | **SAFE** — no cross-row invariant beyond "one default", which `setDefaultLegalEntity` handles transactionally |
| **Observability** | `AsyncLocalStorage` (per-request), in-process metric maps | **SAFE** — no shared DB state; metrics are per-process by design |
| **i18n** | in-process catalogue `Map`, populated at import | **SAFE** — read-mostly; `registerCatalogue` merges |

---

## 2. Existing hotspots — spot-check

| Area | Pattern found | Verdict |
|---|---|---|
| **Leave balance** (`leave/ledger.ts`) | `$transaction` + idempotency-key check + **optimistic lock** (`updateMany WHERE version = n` → `version++`, `count === 0` throws `LedgerConcurrencyError`) + **retry loop** (`MAX_RETRIES`) | **GOOD** — textbook optimistic concurrency; concurrent writers to the same balance retry cleanly |
| **Accounting posting** (`accounting/posting-engine.ts`) | idempotency via `AccountingIntegrationInbox @@unique([orgId, sourceSystem, idempotencyKey])`; voucher number via atomic `UPDATE "AccountingNumberSeries" … RETURNING`; posting in `$transaction` | **GOOD** — duplicate posts are absorbed; numbering is atomic |
| **CHA job numbering** (`cha/service.ts` ~2196) | inside `$transaction`: `findFirst` the rule (no `FOR UPDATE`), compute next, `UPDATE SET currentSequence = <absolute>`, then `create` ChaJob | **FINDING (Medium).** Read-then-write race: two concurrent job creations read the same `currentSequence`, both target the same number. `ChaJob @@unique([orgId, jobNumber])` **prevents a duplicate**, but the losing transaction fails with `"Job number '…' already exists"` instead of retrying with the next number. **Fix:** migrate CHA numbering onto `core/numbering` `allocateNumber` (atomic bump), or add `FOR UPDATE` on the rule row + `currentSequence: { increment: 1 }`. Tracked in `TASK.md` Cluster 5 follow-up. |
| **Employee invitations** (`EmployeeInvitation`) | `tokenHash @unique`; no `@@unique` on active `(orgId, email)` | **FINDING (Low).** Multiple concurrent invites for the same email create multiple pending rows. Harmless (any valid token works) but untidy. Consider a partial unique index on unconsumed/unrevoked invitations. |
| **Leave request overlap** (`leave/request.ts`) | no DB-level exclusion constraint found; overlap appears to be an application check | **FINDING (Medium).** Two overlapping leave requests submitted simultaneously can both pass an application-level "no overlap" check. **Fix:** a PostgreSQL `EXCLUDE` constraint using a date range + `btree_gist`, or serialise on the user's balance row (which `postLedgerEntry` already locks on approval). Needs verification of the exact current guard. |
| **Workflow / status transitions** (filing workflows, approval status) | mix of `update` and guarded `updateMany` | **NOT FULLY REVIEWED** — recommend converting each "check status then set status" to `updateMany({ where: { id, status: expected } })` and treating `count === 0` as a lost race. |

---

## 3. Prisma / PostgreSQL model review

### 3.1 Foreign-key indexes

Heuristic scan of `@relation(fields: [x])` targets vs `@@index` / `@@unique`:

- `orgId` (194 relations): indexed on essentially every tenant-scoped table
  (`@@index([orgId])` or a composite leading with `orgId`) — this was Stage 1
  tenant-denormalisation work.
- Stage 2 additions all index their FKs: `legalEntityId` (Branch, BusinessUnit,
  CostCentre, NumberingSequence), `policyId`, `requestId`, `definitionId`,
  `actorUserId`, `orgId`.
- **Method limitation:** the heuristic cannot prove every one of 468 models has
  an index on every FK column. A definitive check needs
  `pg_indexes` vs `information_schema.table_constraints` on a populated database,
  plus `pg_stat_user_tables` seq-scan ratios. **Open.**

### 3.2 Cascade behaviour (Stage 2 models)

| Relation | onDelete | Rationale |
|---|---|---|
| `*.orgId → Organisation` | `Cascade` | deleting a tenant removes its data |
| `Branch.legalEntityId → LegalEntity` | `SetNull` | an entity can be removed without destroying branches (they re-home) |
| `BusinessUnit.parentId` (self) | `SetNull` | removing a parent flattens children, not deletes them |
| `NumberingSequence.legalEntityId` | `Cascade` | a sequence scoped to an entity is meaningless without it |
| `ApprovalDecision.requestId → ApprovalRequest` | `Cascade` | decisions have no meaning without the request |
| `ConfigAuditEntry.actorUserId → User` | `SetNull` | **audit rows survive user deletion** (deliberate) |
| `OrganisationMembership.userId → User` | `Cascade` | membership is meaningless without the user; historical business rows are on other tables |
| `AccountingLegalEntity.orgId` | `Restrict` (pre-existing) | blocks deleting an org with accounting data |

No Stage 2 cascade destroys audit or historical business data.

### 3.3 Unbounded reads / pagination

- Stage 2 list APIs that can grow are paginated: `listConfigAudit` (cursor),
  `listOpenApprovalRequests` (bounded by PENDING), job `claimJobs` (explicit
  `LIMIT`).
- `getFieldValuesForMany` is explicitly batched to avoid N+1.
- **Open:** the broader app has list endpoints without enforced limits (spec
  §19 "unsafe unbounded reads") — not enumerated here.

### 3.4 Soft-delete consistency

- The schema mixes `active` booleans, `status` strings, and `deletedAt`
  timestamps for "not really gone". Not uniform. Documented in
  `DATA_RETENTION.md`; a unifying convention is future work.

---

## 4. Recommendations (priority order)

1. **CHA job numbering → `core/numbering`** (removes the read-then-write race;
   Medium).
2. **Leave-request overlap:** confirm the current guard; add a DB `EXCLUDE`
   constraint or lock-on-balance (Medium).
3. **Full FK-index + seq-scan audit** against a populated DB with `EXPLAIN
   (ANALYZE, BUFFERS)` evidence for the top query patterns (spec §19) — this is
   a dedicated task, not doable from static analysis alone.
4. **Representative-volume load test** (spec §20) to surface lock contention and
   slow plans that static review cannot.
5. **Standardise optimistic locking** (`version` column + guarded `updateMany`)
   for all "check-then-set status" transitions.
6. **Partial unique index** on active `EmployeeInvitation(orgId, email)` (Low).
7. Add a **stuck-job reaper**: a job left `RUNNING` by a crashed worker only
   becomes claimable again once `runAfter` passes; add an explicit sweep that
   resets `RUNNING` jobs whose `lockedAt` is older than a threshold.

No code changes in this review — items 1, 2, 5, 6, 7 are tracked in `TASK.md`.
