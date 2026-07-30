# Accounting Phase 6 production readiness

Status: implemented for controlled synthetic staging and cutover preparation.
This phase does not authorize production migration, production access, provider
enablement, deployment, or cutover.

Accepted baseline:

- integrated Phase 5 checkpoint:
  `71915c4d559edb5cedbbac5ad15bb2350ba7c426`;
- original Phase 5 implementation:
  `942b332115a6a9a9765f39bb0c0f9d83bcf24896`.

## Architecture

Phase 6 has four boundaries:

1. Source-contract, mapping, dependency, policy and reconciliation modules are
   deterministic and open no database/provider connection.
2. The pipeline defaults to `DRY_RUN`, rejects production, bounds concurrency
   from one to eight, resumes deterministic keys and never reports partial or
   unreconciled success as complete. Certification requires exact source/target
   equality for every applicable total at organization, legal-entity,
   record-type and currency scope.
3. The server-only canonical executor delegates supported financial preparation
   to Phase 4 document/payment adapters. Every call carries the mapped legal
   entity, verifies that it is active in the authorized organization, rejects a
   differently scoped canonical result, has no journal/GL writer and never
   approves for the maker.
4. The repository persists batch, record, mapping, exception, attachment and
   checkpoint evidence only after RBAC and the exact synthetic-staging database
   guard pass. Database constraints preserve the production block, scope,
   immutable success evidence and completion certification.

The previous spreadsheet script with hard-coded identities/path, fuzzy account
creation and direct ledger writes was removed. Its command now invokes the
guarded versioned pipeline.

## Source-data contract

The tracked contract is
`docs/accounting/contracts/accounting-import-v1.schema.json`.

Every record carries source system/type/identifier/version, target organization
and legal-entity references, import batch, dependencies, payload and attachment
metadata. Runtime evidence adds deterministic idempotency key, validation and
reconciliation status, migration timestamp, error classification and canonical
target ID.

Contract types cover organizations, legal entities, periods, accounts,
counterparties, currencies, exchange-rate references, opening balances,
documents/corrections, receipts/payments/allocations, journal references,
recurring templates, depreciation, partner transactions and attachments.
Contract support does not imply mutation support. Masters and policy-gated types
remain dry-run/mapping-only until an accepted canonical mutation service exists.
Secret-like fields are rejected recursively; import files need no credentials.

## Mapping

Mappings are exact and scoped by source system, organization, optional legal
entity, type and source value. Types include organization, legal entity,
account, counterparty, document type/state, currency, number series, tax code,
payment method, audit actor and lineage.

- Missing mappings fail closed.
- Multiple approved matches fail as ambiguous.
- There is no fuzzy match or generic-account fallback.
- Cross-organization/entity matches fail.
- One approved mapping per scope is database-enforced.
- Changes create audited versions with maker/checker separation.
- Execution revalidates the currently approved, maker/checker-separated mapping
  and its configuration hash; a file-supplied forged or stale mapping cannot
  authorize a canonical command.
- Spreadsheet exports must use `safeSpreadsheetCell`.

## Pipeline and batch state

```text
RECEIVED -> VALIDATING -> DRY_RUN_READY -> EXECUTING
         -> RECONCILING -> COMPLETED

Any stage -> FAILED -> resumable retry
Unsafe/policy state -> QUARANTINED -> reviewed retry/authorized pre-effect skip
```

`COMPLETED` requires certification and only `SUCCEEDED`/`SKIPPED` records.
Successful identity, payload hash and target lineage are immutable. A restart
reuses deterministic keys and canonical idempotency. Transactions are
record-bounded; checkpoints follow canonical outcomes.

The stable dependency order is organization, legal entity, currency, periods,
accounts, counterparties, exchange rates, accepted opening state, invoices,
corrections, payments, journals, allocations and attachments. Explicit
dependencies refine the order. Missing nodes and cycles return stable keys.

## Opening balances and history

Opening balances are blocked unless one accepted decision supplies effective
date, historical depth, opening receivable/payable/bank/cash/account treatment,
outstanding allocations, retained earnings, comparative reporting, settled
history, tax/statutory history and foreign-currency treatment. Preview and
reconciliation remain available; Phase 6 chooses no policy values.

## Reconciliation

Reconciliation runs by batch, organization, legal entity, record type and
currency for record counts, document totals, debit/credit, AR/AP evidence,
receipt/payment, allocated and unallocated totals, lineage, duplicates, missing
mappings, orphan allocations, outbox counts and manual review. Every applicable
source and target total must be present, structurally valid and Decimal-safe
equal. Explicit zero and negative values are preserved; equivalent decimal
scales compare exactly. Missing evidence, malformed values, currency mismatch or
the confirmed `100` source versus `999` target case blocks certification with
bounded scope/code evidence. Journal balance is necessary but never sufficient.
Currencies and legal entities are never combined.

## Exceptions, retry and recovery

Exceptions store stable codes and bounded safe messages, not raw payloads.
Authorized operators may retry or skip a pre-effect record with a reason. A
record with a canonical target cannot be skipped. Mapping correction creates a
new audited version.

Dry run invokes no executor. Failed execution is explicit and quarantinable.
Posted effects are never deleted or described as rolled back; correction uses
canonical reversal/cancellation. Only incomplete metadata/unposted prepared
artifacts may be abandoned while audit evidence remains. Database restore is a
separately authorized infrastructure recovery.

## Attachments

PDF/JPEG/PNG/WebP metadata up to 25 MiB is accepted. Paths must be relative and
traversal-free; SHA-256 and scoped deterministic identity are mandatory. The
repository has no approved Accounting malware scanner, so execution remains
`SCAN_REQUIRED`; no storage provider is contacted. Retrieval enablement also
requires canonical owner authorization.

## Providers, outbox and scheduler

No Zoho contract was invented. The generic adapter reports disabled and refuses
authentication/writes. Existing outbox/scheduler workers remain restricted to
the loopback synthetic database on port 56432 with the exact database/user/
marker and `SYNTHETIC_*` destinations. Leases, retry ceilings, dead letter,
manual review, row versions, `SKIP LOCKED` claims and occurrence identity
provide duplicate/crash/poison controls.

Provider enablement and live webhook/provider reconciliation remain blocked
until a separately accepted provider-specific contract exists.

## Observability

Telemetry contains stable event/correlation/batch/record keys,
classifications, bounded durations and counts. Secrets are redacted and
endpoint-looking messages removed. Financial payloads, database URLs and
unnecessary PII are not logged. The health check remains non-mutating.

Operational evidence covers throughput, validation/posting failures,
reconciliation mismatch, manual review, outbox/scheduler state, authorization
failure and idempotency conflict.

## Bounded synthetic performance evidence

The deterministic dry-run benchmark used 2,000 synthetic invoice records across
two currencies with concurrency configured at eight. It completed in 96.39 ms
(20,749.51 records/second), used a 9,646,944-byte observed heap delta, issued
zero database queries and produced no errors. This measures ingest, contract
validation, normalization, exact mapping, dependency order and reconciliation;
it does not claim production import throughput. Canonical-service query counts,
N+1 behavior and posting throughput remain guarded-staging rehearsal evidence.
The benchmark hard-limits input to 10,000 records.

## Deployment and post-cutover readiness

A separately authorized deployment must build and validate, verify backup,
deploy the additive migration as a distinct step, start the application, run
non-mutating health/readiness checks and confirm scheduler ownership. The schema
is expand-only; older code ignores the tables. Production execution remains
hard blocked and providers stay disabled.

Post-cutover verification is read-only: authentication/navigation/RBAC,
representative documents, journal balance, GL access, invoice/payment/
allocation lineage, configuration, migration reconciliation, outbox/scheduler,
disabled provider state and performance baseline.

## Security

- Server RBAC protects migration, mapping, exception and readiness operations.
- Migration preparation cannot self-approve/post.
- Mapping, canonical commands, atomic repository writes and database triggers
  enforce organization/legal-entity scope. Batch/record/mapping/exception writes
  include scope and optimistic state in the mutation predicate and require
  exactly one affected row.
- Migration modules contain no direct journal/line/GL mutations.
- Production and port 5432 fail before connection.
- JSON/files/paths/attachments/reports are bounded and formula-safe.
- No arbitrary SQL or executable serialization is accepted.

## Traceability

| Requirement | Evidence |
|---|---|
| Contract | JSON Schema and `source-contract.ts` |
| Exact mapping | `mapping.ts`, mapping model and approved-scope index |
| Dry-run / production block | pipeline and guarded CLI |
| Idempotency / resume | SHA-256 identity, uniqueness and checkpoints |
| Canonical writes | server executor and architecture test |
| Policy gates | `policy-gates.ts` |
| Reconciliation | `reconciliation.ts` |
| Exceptions / quarantine | migration models and repository |
| Attachments | `security.ts` and attachment model |
| Provider disabled | disabled adapter and static verifier |
| Readiness | evaluator and guarded staging capture |
| Recovery / cutover | this document and cutover runbook |

## Validation evidence

Validation was performed without production, provider or real-data access:

- focused Phase 6: 4 files and 48 tests passed;
- guarded Accounting Phase 2–6: 15 files and 134 tests passed;
- guarded staging identity/login: 3 files and 31 tests passed;
- complete guarded repository suite: 57 files and 390 tests passed, with
  three unchanged CHA failures outside the Phase 6 file set;
- TypeScript, affected-file ESLint, Prisma validation, static architecture
  verification and the production build passed;
- the guarded database has 60 applied migrations and the schema is current;
- the safety scan inspected all Phase 6 changes with no secret-pattern or
  forbidden-artifact findings;
- organization/legal-entity-scoped synthetic readiness reports 12 ready checks,
  seven policy blocks, one
  incomplete backup-evidence check, and no configuration or data blockers;
- deployment verification remains blocked until production backup evidence and
  scheduler ownership are separately accepted;
- all 14 synthetic, read-only post-cutover checks passed.

Repository-wide ESLint is not a Phase 6 regression gate because the accepted
baseline contains extensive legacy lint debt. The Phase 6 affected file set has
zero ESLint findings. The three full-suite failures remain in the unmodified
CHA module: mock Google Drive checklist delivery, an estimated-filing-date
expectation and a direct-delete audit-event expectation.
