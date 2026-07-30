# Accounting Phase 7 rollout readiness

Status: preparation implemented; current decision is **NO-GO**. Phase 7 does
not authorize deployment, production access, production migration, database
modification, provider activation, cutover, or go-live.

Starting checkpoint:
`498eb8364858da2c45e2b4c86d09098ae05f2443` on `main`.

Accepted predecessor checkpoints:

- integrated Phase 5:
  `71915c4d559edb5cedbbac5ad15bb2350ba7c426`;
- original Phase 5 implementation:
  `942b332115a6a9a9765f39bb0c0f9d83bcf24896`;
- accepted Phase 6:
  `498eb8364858da2c45e2b4c86d09098ae05f2443`.

## Boundaries

Phase 7 is an additive, database-free rollout layer under
`src/modules/accounting/rollout`. It evaluates contracts and evidence, creates
deterministic synthetic fixtures, runs the accepted Phase 6 pipeline in memory,
and emits redacted summaries. It imports no database client, provider client,
email client, scheduler worker, or external delivery code.

The existing Phase 6 production block, disabled provider adapter, staging
identity guards, port restriction, canonical executor, maker-checker controls,
scoped repository, and Decimal-safe reconciliation remain unchanged.

## Independent Phase 6 verification

The review inspected code rather than copying the Phase 6 completion report.

| Control | Independent evidence |
|---|---|
| Dry-run has no financial effect | `pipeline.ts` takes the dry-run branch before invoking an executor; focused tests assert zero calls. |
| Production execution blocked | `target === "production"` throws `PRODUCTION_BLOCKED`; Phase 7 adds no production executor. |
| Providers disabled | `DisabledAccountingProviderAdapter` has literal `enabled = false`; authentication and send throw. |
| Canonical financial mutation | `canonical-executor.ts` is server-only and delegates invoices, payments, and notes to Phase 4 adapters. |
| No direct journal/ledger insert | Static traversal of migration and rollout modules rejects journal, line, and GL mutations. |
| Deterministic idempotency | Source identity and manifest material use canonical payloads and SHA-256. |
| Resume and replay | Persisted Phase 6 checkpoints plus deterministic keys guard canonical execution; Phase 7 independently rehearses an interruption, resume, and idempotent replay in memory. |
| Decimal safety | Reconciliation uses decimal-string normalization, addition, and comparison and never combines currency scopes. |
| Ambiguous mappings | More than one approved scoped mapping throws and blocks. |
| Scope isolation | Contract, mapping, repository, canonical executor, and database guards all enforce organization and legal entity. |
| Redaction | Secret-like input keys are rejected, output fields are redacted, endpoints are removed, and spreadsheet formulas are neutralized. |
| Policy gates | Opening balances, currency, FX, tax, depreciation, partner, and attachment records fail closed without accepted references. |

At the starting checkpoint the Phase 6 static verifier passed and the four
focused Phase 6 files passed 48 tests. Phase 7 validation reruns those gates.

## Policy-decision register

The structured register is
`contracts/accounting-phase7-policy-register.v1.json`. Its parser requires all
20 stable decision IDs, permissible choices, owner roles, evidence,
implementation impact, verification method, severity, status, approval
reference, and effective date. It does not contain a selected policy.

All decisions intentionally remain `AWAITING_DECISION`; all are rollout
blockers. Missing, duplicate, unknown, malformed, or falsely approved entries
fail closed. An approved or not-applicable decision requires both a stable
approval reference and an effective date.

## Production configuration contract

`production-configuration.ts` defines variable names, purposes, presence,
secret classification, and validation rules without values. Validation returns
only variable names and stable issue codes.

The contract requires:

- explicit production environment and database identity with no staging
  fallback;
- an explicit PostgreSQL URL that matches declared host, port, database, and
  user identity;
- rejection of implicit or explicit port `5432`;
- fixed organization and legal-entity scope;
- disabled provider and outbound delivery modes;
- disabled or single-owner scheduler state;
- declared storage and redacted observability modes;
- backup and restore evidence for a future execution request;
- distinct operator and checker identities;
- technical, business, security, and final production authorization
  references.

Even a structurally complete future authorization shape returns
`PHASE7_PRODUCTION_EXECUTION_DISABLED`. Phase 7 contains no action that consumes
the marker to enable production.

## Deterministic go/no-go model

`go-no-go.ts` requires exactly one gate for every checkpoint, repository,
policy, configuration, backup, manifest, dry-run, rehearsal, reconciliation,
security, performance, staffing, monitoring, business acceptance, and recovery
authority requirement. Any unresolved critical gate returns `NO_GO`.

Current deterministic result:

- decision: `NO_GO`;
- blocked by policy: all 20 tracked decisions, including recovery authority;
- blocked by configuration: no production configuration or authorization
  evidence was accessed or supplied;
- blocked by infrastructure: no accepted production backup or isolated restore
  evidence exists in the repository;
- incomplete: checkpoint review changes are not committed, operational roles
  are not assigned, and business acceptance is not signed;
- production authorization: absent;
- production execution: unavailable.

## Rehearsal framework

`rehearsal.ts` uses only deterministic synthetic records. Its execution guard
requires:

- the exact Phase 7 synthetic marker;
- target `synthetic-staging`;
- ephemeral in-memory storage;
- no database access and no database port;
- disabled providers and outbound delivery;
- explicit synthetic-data classification;
- separate synthetic operator and checker identities;
- no production authorization.

Dry-run remains the default. Controlled execution also requires the explicit
`PHASE7_IN_MEMORY_REHEARSAL_ONLY` proof and an injected in-memory executor.
The framework cannot connect to, modify, or fall back to a database. The
rehearsal script covers clean execution, zero-effect dry-run, interruption,
resume, duplicate replay, reconciliation mismatch, and provider-disabled
behavior. The complete 21-scenario catalogue is tracked in code and the
operational runbook.

Only synthetic pre-posting in-memory artifacts may be discarded by ending the
process. Audit evidence should be retained according to the still-unresolved
operational retention policy. Posted financial records are never cleanup
targets.

## Bounded synthetic profiles

| Profile | Records | Currency distribution | Concurrency | Memory ceiling | Query ceiling |
|---|---:|---|---:|---:|---:|
| small functional | 28 | INR 24, USD 4 | 2 | 128 MiB | 0 |
| medium operational | 1,500 | INR 1,200, USD 240, EUR 60 | 4 | 512 MiB | 0 |
| large bounded | 8,000 | INR 6,400, USD 1,280, EUR 320 | 8 | 1 GiB | 0 |

Profiles contain sales and purchase invoices, receipts, payments, allocations,
credit notes, and debit notes. Dependencies have bounded fan-out; attachments
are metadata-only assumptions and no bytes or storage providers are accessed.
All applicable totals must reconcile by organization, legal entity, record
type, currency, and measure.

## Manifest integrity

`migration-manifest.ts` validates:

- source-contract and mapping versions;
- record counts and source checksums;
- extraction timestamp;
- organization and legal-entity scope;
- dependency graph hash;
- attachment count, bytes, inventory hash, and verification state;
- policy register version and hash;
- passed dry-run evidence;
- passed reconciliation evidence and exception count;
- execution-tool and target-application versions.

The tracked manifest is synthetic evidence only. Any structural, checksum,
scope, version, policy, application, dry-run, or reconciliation mismatch fails
closed. It is not a production manifest and cannot satisfy production data
readiness. The readiness command independently recomputes the record counts,
fixture checksum, dependency graph, attachment inventory, canonical policy-register
hash, dry-run manifest/outcome hashes, and controlled-execution reconciliation
hash before comparing the tracked manifest. The production manifest gate
therefore remains `blocked by data` even when this synthetic integrity check
passes.

## Backup and recovery

`backup-readiness.ts` machine-checks ownership, scope, age, encryption, restore
access, verification evidence, retention, RPO, RTO, isolated restore rehearsal,
database/attachment consistency, and rollback decision authority.

No accepted production backup mechanism or restore evidence exists in the
repository, so both backup and recovery readiness are correctly **blocked by
infrastructure**. Phase 7 did not create, inspect, or restore a backup.

## Operational controls

The machine-readable catalogue contains 14 redacted monitors, 12 disconnected
alert definitions, nine acceptance-owner roles, 17 dependency-ordered
deployment steps, and eight rollback/forward-fix stages. Details are in the
operational runbook.

Alerts are definitions only. They are not connected to email, messaging,
webhooks, or live incident channels.

## Security and adversarial evidence

Focused and static tests cover:

- unauthorized rehearsal execution and self-checking rejection;
- production execution and port `5432` rejection;
- provider and outbound activation rejection;
- incomplete or forged authorization evidence rejection;
- cross-scope mapping and canonical target rejection;
- source identity uniqueness and scope-aware idempotency;
- spreadsheet formula neutralization;
- attachment traversal, type, size, and hash validation;
- absence of arbitrary SQL and database/provider clients in rollout code;
- rejection of executable or secret-bearing source payloads;
- redacted configuration reports and bounded safe errors;
- client isolation from repository, canonical executor, rehearsal, production
  configuration, and cutover internals;
- immutable successful migration evidence and canonical reversal policy;
- independent maker-checker identities.

## Performance evidence

The bounded benchmark uses the 1,500-record medium profile and measures
validation/dry-run, in-memory controlled execution including reconciliation,
heap delta, and zero query count. It never opens a database or provider.

Recorded on the local guarded synthetic in-memory environment:

- validation and dry-run: 93.69 ms, 16,010.76 records/second;
- controlled in-memory import including reconciliation: 96.73 ms, 15,506.63
  records/second;
- observed heap delta: 6,730,688 bytes against a 536,870,912-byte ceiling;
- database queries: zero;
- N+1 signal: none because the rehearsal has no database access;
- threshold: 30,000 ms.

This evidence does not certify canonical database posting, attachments,
networks, authenticated operational pages, or production throughput. Those
remain guarded-staging or future separately authorized evidence.

## Validation evidence

All Node commands used the required 8 GB heap setting.

- Phase 7 focused: 3 files and 38 tests passed.
- Phase 6 independent rerun: 3 core files and 46 tests passed; the independent
  posting-boundary architecture file added four passing tests.
- Accounting Phase 2-7 regressions and guarded synthetic integrations: 18
  files and 172 tests passed.
- Full guarded repository suite: 60 files; 428 tests passed and the same three
  pre-existing CHA expectations failed.
- The three CHA failures remain precisely:
  mock Drive checklist attachment unavailable for customer mail; null
  `estimatedFilingDate`; and absent legacy `JOB_DELETED_DIRECT` alongside the
  current `JOB_DELETE_EXECUTED` event.
- TypeScript passed.
- Affected-file ESLint passed with no findings.
- Repository-wide ESLint was rechecked and retains 1,360 unrelated pre-existing
  errors. `prisma/seed.ts` separately retains four errors and one warning.
- Prisma formatting and schema validation passed using a non-connecting
  synthetic loopback URL on port 6543.
- No schema or migration file changed; migration validation is therefore
  not-applicable beyond confirming the unchanged additive Phase 6 migration.
- Production build passed: 342 static/dynamic pages generated. The pre-existing
  customer-portal NFT tracing warning remains non-fatal.
- Phase 7 static architecture verification passed for all eight rollout
  modules.
- Safety scan passed for all changed files with zero secret-pattern and
  forbidden-artifact findings.
- `git diff --check` passed.

## Remaining blockers before production authorization

Production authorization must not be considered until all of the following are
independently accepted:

1. every critical/high policy decision with approval reference and effective
   date;
2. exact production configuration, database identity, scope, provider-disabled
   startup, scheduler ownership, storage, and observability evidence;
3. an accepted production backup mechanism and isolated restore rehearsal with
   RPO/RTO evidence;
4. a final real-source manifest produced under an approved freeze without
   exposing data to this task;
5. guarded staging database/canonical-service rehearsal evidence, including
   query counts and posting throughput, under separately approved synthetic
   staging access;
6. named role assignments, independent operator/checker, technical, security,
   Finance, business, and recovery approvals;
7. accepted monitoring, alert routing, hypercare staffing, and provider
   authority contract;
8. a separate production authorization that enables future code not present in
   Phase 7.

Nothing in this document is production authorization.
