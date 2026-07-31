# Accounting Phase 8 production-authorization planning

## Purpose and boundary

Phase 8 supplies fail-closed contracts for production-readiness evidence,
governed policy decisions, responsibility assignments, configuration
declarations, real-source manifest metadata, exceptions, audit records, and
authorization-request preparation.

Phase 8 does **not** grant production authorization. It does not connect to a
production database or evidence store, activate a provider, schedule work,
send external messages, migrate data, execute cutover, deploy a release, write
financial transactions, or begin hypercare. Its only terminal results are
`NOT_READY`, `AUTHORIZATION_REQUEST_READY`, and `INVALIDATED`.
`AUTHORIZATION_REQUEST_READY` means only that an immutable package could be
submitted to a separately controlled human authorization process.

## Evidence intake

The canonical evidence record is scoped to one organization, legal entity,
production environment, and requirement. It carries a version, SHA-256
digest, secure external reference, issuer and owner metadata, validity window,
retention class, verification metadata, review metadata, revocation and
supersession state, and a row version.

Evidence payloads and confidential documents do not belong in this
repository. A future authorized environment must store them in approved
external secure storage. The Phase 8 storage adapter is deliberately
disconnected. Empty, malformed, credential-bearing, loopback, metadata-only,
sample, synthetic, expired, rejected, revoked, superseded, cross-scope, or
digest-mismatched evidence cannot satisfy a gate. Accepted metadata is
revalidated against the current scoped production owner and an active reviewer
with the evidence-review permission; a pre-labelled `ACCEPTED` state is not
trusted. Submitters cannot review their own evidence.

## Policy governance

All 20 Phase 7 policy IDs are carried into a versioned workflow:
`AWAITING_DECISION`, `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `EXPIRED`,
`SUPERSEDED`, and `REVOKED`. The production snapshot leaves every policy at
`AWAITING_DECISION`.

Approval requires a scoped active authoritative owner, a scoped active maker,
a different active checker with the review permission, a decision, rationale,
accepted policy-governance evidence, valid dates, complete approval timestamps,
and an auditable version.
Statutory decisions additionally require jurisdiction and a source-authority
reference. Code defaults never supply a business, accounting, statutory, or
tax decision.

## Responsibilities and separation of duties

The matrix requires executive sponsor, Accounting owner, migration operator,
independent checker, database owner, backup/restore owner, infrastructure
owner, security owner, statutory/tax approver, business acceptance owner,
scheduler owner, provider integration owner, support lead, incident commander,
rollback authority, and communications owner.

Each assignment is scoped, acknowledged, time-bounded, permission-checked,
and row-versioned. Inactive, placeholder, development, staging, test, or
synthetic identities fail closed. Explicit conflicts prevent an operator from
also being the independent checker, restore verifier, rollback authority,
security owner, or statutory approver for the same controlled operation.

## Backup, restoration, and rollback certification

A backup-existence claim is insufficient. Certification requires database and
attachment coverage, encryption and retention evidence, a fresh backup,
integrity verification, an isolated restore, RPO and RTO results, Accounting
and attachment consistency checks, a restore owner, an independent verifier,
and a rollback authority.

Posted financial effects are never deletable rollback material. Corrections
must use canonical reversal, cancellation, or adjustment services. Synthetic
backup or restore evidence cannot satisfy production readiness.

## Value-free production configuration

The declaration contains references and classifications, not real
infrastructure or secret values. It covers database identity and host policy,
the Phase 8 prohibition on port 5432, organization/legal-entity scope,
canonical endpoints, disabled providers, disabled scheduler, disabled outbound
delivery, attachment storage, key management, observability, alerts,
retention, authentication/authorization issuer, deployment identity, release
digest, feature flags, kill switch, and planning-only execution.

Sensitive values must remain external secret references. Inline credentials,
connection strings, loopback or non-production identities, provider
activation, scheduler activation, incomplete attestations, and any single
production-enablement Boolean are rejected.

## Real-source manifest preparation

The future manifest contract records source identity, extraction time and
operator, exact scope, type and dependency counts, exact decimal currency
totals, attachment/rejected/excluded counts, independently recomputed source
checksum, immutable extraction reference, policy/mapping/contract versions,
maker-checker attestations, and freshness.

Synthetic or sample manifests may exercise structural validation but remain
non-production. Cross-scope reuse, staleness, checksum changes, inconsistent
counts or exact-money totals, formula injection, path traversal, arbitrary
SQL, and executable serialization are rejected. Relabelling a synthetic
manifest cannot satisfy readiness: the maker attestation must reference
accepted, independently verified `PRODUCTION_EXTERNAL` evidence scoped to the
real-source-manifest requirement. Real records and customer identifiers must
not be committed.

## Authorization-request lifecycle

The deterministic builder hashes the complete readiness snapshot and binds the
request to scope, release commit and artifact, accepted evidence versions,
approved policies, assignments, backup certification, configuration,
manifest, exceptions, readiness logic, maker, proposed checker, generation
time, and expiry. The digest also binds the independent evidence digests,
expected evidence-to-requirement mapping, manifest expectation, and current
scoped identity permissions used to verify the package.

Any critical blocker produces `NOT_READY`. Any dependency or readiness-logic
change, or expiry, produces `INVALIDATED`. The builder cannot approve its own
output and never emits a production-authorized or cutover state. A prepared
request must later be reviewed through a separate, independently authorized
human process that is outside Phase 8.

## Exceptions

Security, scope isolation, reconciliation, backup/restore, canonical financial
boundaries, and statutory controls are non-waivable. Other bounded exceptions
require scope, owner, rationale, impact, compensating control, accepted
evidence, expiry, maker, independent checker, disposition, and audit history.
An exception stays visible in the request package and never silently converts
`NO_GO` into authorization.

## Audit and observability

Structured audit events include actor, action, scope, timestamp, object,
outcome, safe detail code, previous hash, and event hash. They exclude
documents, financial payloads, PII, secrets, credentials, connection strings,
and resolved external references. The hash chain makes modification evident.
Alert definitions are descriptive and disconnected; there is no outbound
delivery.

## Administrative workspace

`/accounting/readiness` is server-rendered and protected by
`accounting.readiness.read`. It shows the exact non-sensitive blockers,
evidence checklist, 20 policy states, 16 assignments, infrastructure and
manifest readiness, exceptions, authorization-request readiness, and the
audit timeline. Client visibility is not authorization. With blockers present,
the strongest named action, **Prepare authorization request**, is disabled.
There is no migration, activation, authorization, cutover, deployment, or
go-live control.

## Remaining steps before production authorization

Authorized humans must make and independently approve all policy decisions;
assign and acknowledge production responsibilities; provide accepted external
evidence; certify backup and isolated restoration; attest a value-free
configuration; prepare and independently verify a final real-source manifest;
resolve non-waivable blockers; obtain business, security, statutory, and
technical acceptance; and submit an unexpired immutable request to a separate
production-authorization process.

None of those external actions were performed by Phase 8, and cutover remains
unavailable.
