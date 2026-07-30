# Accounting Phase 7 operational runbook

Status: prepared but disabled. Every production-changing step below says
“requires separate production authorization.” Phase 7 does not execute any of
them.

## Rehearsal procedure

1. Verify the exact Phase 6 checkpoint and a clean starting worktree.
2. Validate the tracked policy register; unresolved decisions produce no-go.
3. Validate deterministic synthetic fixture hashes and bounded profile limits.
4. Verify the Phase 7 marker, synthetic target, in-memory storage, no database
   access, no port, disabled providers, synthetic classification, and separate
   operator/checker identities.
5. Capture a pre-rehearsal readiness snapshot without environment values.
6. Run dry-run and prove the executor was not called.
7. Run controlled in-memory execution with the explicit synthetic proof.
8. Interrupt once, retain outcomes, resume, and reconcile.
9. Replay the completed batch and prove target identity count does not change.
10. Correct mappings only through a new independently approved mapping version.
11. Run the mismatch scenario and prove certification is withheld.
12. Record exceptions using stable codes and bounded safe messages.
13. Verify the synthetic manifest, fixture hash, outcome counts, and exact
    reconciliation.
14. Issue a post-rehearsal certificate only when all applicable controls pass.

Cleanup is limited to ending ephemeral in-memory state or abandoning confirmed
synthetic pre-posting artifacts. Do not delete posted financial records,
migration evidence, or audit records.

## Rehearsal scenarios

| ID | Scenario | Required evidence |
|---|---|---|
| REH-001 | Clean first-time batch | Completed, certified, exact target count. |
| REH-002 | Dry-run with zero financial effects | Ready with zero executor and database calls. |
| REH-003 | Interrupted batch and resume | First run failed or remained blocked by incomplete reconciliation; resume completed. |
| REH-004 | Duplicate batch replay | Stable canonical identifiers; no additional targets. |
| REH-005 | Duplicate source identifier | Blocked as duplicate. |
| REH-006 | Missing mapping | Blocked with stable missing-mapping code. |
| REH-007 | Ambiguous mapping | Blocked; no fallback selection. |
| REH-008 | Cross-entity attempt | Rejected before canonical execution. |
| REH-009 | Closed-period conflict | Blocked pending approved policy and canonical period validation. |
| REH-010 | Unsupported currency operation | Rejected; no currency fallback. |
| REH-011 | Policy-gated opening balance | Blocked until every opening/history decision is accepted. |
| REH-012 | Sales and purchase invoices | Canonical preparation boundary and exact totals. |
| REH-013 | Receipts and payments | Exact amount, allocated, and unapplied totals. |
| REH-014 | Allocations | Dependency and exact allocation evidence. |
| REH-015 | Credit and debit note lineage | Original-document lineage retained. |
| REH-016 | Attachment failure | Quarantined as scan/storage gated. |
| REH-017 | Reconciliation mismatch | No certification or completion. |
| REH-018 | Outbox provider-disabled behavior | Zero external delivery and zero unsafe destinations. |
| REH-019 | Scheduler duplicate prevention | One owner, lease/occurrence identity, no duplicate effects. |
| REH-020 | Rollback requiring canonical reversal | No deletion; authorized reversal/cancellation decision. |
| REH-021 | Partial infrastructure failure | Stop, checkpoint, classify, and resume or escalate. |

Only REH-001, REH-002, REH-003, REH-004, REH-017, and REH-018 are executed by
the database-free Phase 7 rehearsal command. REH-005 through REH-016 and
REH-019 through REH-021 are covered by named executable automated tests. None
of the 21 scenarios is classified as specification-only or missing; the tests
remain synthetic evidence and do not replace a separately approved guarded
canonical/database rehearsal.

## Backup and recovery prerequisite

- [ ] Backup owner role accepted.
- [ ] Database, schema, extensions, configuration, and attachment scope
  accepted.
- [ ] Creation timestamp is within the approved maximum age.
- [ ] Encryption evidence accepted.
- [ ] Restore-access authorization recorded.
- [ ] Backup verification evidence recorded.
- [ ] Retention policy accepted.
- [ ] RPO and RTO accepted.
- [ ] Isolated restore rehearsal passed.
- [ ] Database/attachment consistency passed.
- [ ] Rollback decision authority accepted.

If any item is missing, readiness is blocked by infrastructure. Do not create,
access, or restore a production backup as part of Phase 7.

## Deployment sequence

1. Pin and independently verify the exact application version.
2. Validate additive migrations and backward compatibility.
3. Validate the secret-free production configuration contract.
4. Start with providers and outbound delivery disabled — **requires separate
   production authorization**.
5. Confirm exactly one scheduler owner or keep it disabled — **requires
   separate production authorization**.
6. Run non-mutating readiness and health checks.
7. Verify migration tooling exists but execution remains disabled.
8. Freeze source financial writes — **requires separate production
   authorization**.
9. Verify backup and restore-rehearsal evidence.
10. Certify final dry-run evidence.
11. Execute production migration — **requires separate production
    authorization**.
12. Reconcile every legal entity, currency, type, and applicable total.
13. Run non-destructive production smoke tests — **requires separate production
    authorization**.
14. Obtain business acceptance.
15. Enable one provider destination at a time — **requires separate production
    authorization**.
16. Monitor the accepted hypercare window.
17. Close only after technical and business evidence is accepted.

## Cutover state machine

The tracked model is:

```text
Draft -> AwaitingPolicy -> AwaitingTechnicalApproval
      -> AwaitingBusinessApproval -> ReadyForRehearsal
      -> RehearsalRunning -> RehearsalFailed | RehearsalPassed
RehearsalFailed -> ReadyForRehearsal | Aborted
RehearsalPassed -> ReadyForProductionAuthorization
ReadyForProductionAuthorization -> ProductionAuthorized
ProductionAuthorized -> CutoverRunning -> ReconciliationRequired
      -> VerificationRequired -> Hypercare -> Completed
Any permitted active state -> Aborted
```

Every transition requires evidence, authorization, an actor role, timestamp,
and audit reference. Phase 7 rejects transitions into `ProductionAuthorized`,
`CutoverRunning`, `Hypercare`, and `Completed`.

## Monitoring catalogue

Dashboards or documented queries must expose counts, state, duration, and safe
scope identifiers only:

- migration batches and throughput;
- validation, mapping, posting, and reconciliation failures;
- outbox backlog and provider-disabled state;
- scheduler owner, lease, and duplicate occurrence state;
- manual-review backlog;
- authorization and idempotency conflicts;
- slow-operation percentiles;
- pool wait, active connection, query duration, timeout, and other database
  saturation indicators.

Never expose financial payloads, PII, secrets, credentials, database URLs, or
attachment bytes.

## Alert definitions

| Alert | Severity | Route by role | First response |
|---|---|---|---|
| Production guard failure | SEV1 | IT/platform, Security | Halt and verify identity evidence. |
| Migration halt | SEV1 | Migration operator, IT/platform | Stop and classify last checkpoint. |
| Duplicate posting risk | SEV1 | Accounting owner, Migration operator | Disable execution and reconcile lineage. |
| Reconciliation imbalance | SEV1 | Finance, Accounting owner | No-go and isolate affected scopes. |
| Scope-isolation violation | SEV1 | Security, IT/platform | Abort and preserve evidence. |
| Backup verification failure | SEV1 | Database owner, IT/platform | No-go until accepted evidence exists. |
| Outbox poison message | SEV2 | Operations, Support | Keep providers disabled and quarantine. |
| Scheduler duplication | SEV1 | IT/platform, Operations | Disable duplicate owner and inspect leases. |
| Unauthorized provider activation | SEV1 | Security, IT/platform | Disable provider and preserve configuration audit. |
| Elevated authorization failures | SEV2 | Security | Review safe denial codes and identity posture. |
| Performance degradation | SEV2 | IT/platform, Migration operator | Reduce bounded concurrency or halt. |
| Attachment migration failure | SEV2 | Operations, Security | Quarantine; do not bypass scanning. |

These are definitions only and are not connected to live channels.

## Operational acceptance

Do not substitute person names until explicitly configured.

- [ ] Accounting business owner: scope, policies, financial acceptance, and
  reversal authority.
- [ ] Finance: exact reconciliation, opening/history, currency, tax,
  depreciation, and retention decisions.
- [ ] Operations: freeze, operator procedure, exception handling, and staffing.
- [ ] IT/platform: deployment, scheduler, monitoring, provider-disabled
  startup, and performance.
- [ ] Security: identities, RBAC, scope isolation, redaction, attachments,
  authorization chain, and incident routing.
- [ ] Database owner: backup, restore rehearsal, RPO/RTO, saturation, and
  recovery access.
- [ ] Migration operator: manifests, mappings, dry-run, checkpoints, resume,
  replay, and evidence custody.
- [ ] Approver/maker-checker owner: independent identities and approval
  workflow.
- [ ] Support/hypercare owner: triage, escalation, reconciliation cadence,
  sign-off, and closure.

## Rollback and forward-fix matrix

| Stage | Retry | Quarantine | Abandon pre-posting | Canonical reversal | Restore considered | Authority | Reconcile |
|---|---|---|---|---|---|---|---|
| Pre-validation | Safe | Yes | Yes | No | No | Migration operator | Yes |
| Mapping validation | Safe after new approval | Yes | Yes | No | No | Operator and checker | Yes |
| Dry-run | Safe | Yes | Yes | No | No | Migration operator | Yes |
| Prepared, unposted | Conditional | Yes | Only if confirmed unposted | No | No | Accounting owner and checker | Yes |
| Posted canonical effect | No blind retry | Yes | No | Required when correction is approved | No | Finance and independent approver | Yes |
| Reconciliation failure | No | Yes | No | May be required | No | Finance and Accounting owner | Yes |
| Infrastructure corruption | No | Yes | No | Case-specific | Only separately authorized | Database owner and recovery authority | Yes |
| Provider enable failure | Safe after disable/fix | Yes | No | No | No | IT/platform and Security | Yes |

Never delete a posted financial record or immutable migration evidence as
rollback.

## Hypercare plan

Hypercare is prepared, not activated.

- Duration options: 3, 5, or 10 business days, selected by approved risk
  evidence.
- Roles: Accounting owner, Finance reconciler, Operations coordinator,
  IT/platform responder, Security responder, Database owner, Migration
  operator, independent checker, and Support owner.
- Escalation: SEV1 immediate stop/no-go; SEV2 same-window owner response; SEV3
  tracked forward fix.
- Classification: financial integrity, scope/security, authorization,
  infrastructure, performance, attachment, provider/outbox, scheduler, and
  usability.
- Reconciliation: at cutover checkpoints and at the approved daily frequency,
  always by legal entity and currency.
- Manual review: stable code, safe context, owner role, disposition, checker,
  and evidence reference.
- Provider enablement: disabled through initial verification; one destination
  at a time only after separate authorization.
- Daily sign-off: Finance, Operations, IT/platform, and Support roles.
- Closure: zero SEV1, accepted SEV2 disposition, exact reconciliation,
  controlled backlog, stable performance, accepted provider state, and signed
  business/technical closure.
- Post-implementation review: evidence completeness, incidents, reversals,
  policy deviations, performance, and improvement actions.

## Production smoke-test specification

Future execution is non-destructive and **requires separate production
authorization**. Do not execute it in Phase 7.

1. Authenticate with an approved least-privilege test identity.
2. Verify Accounting navigation and denied controls by role.
3. Verify organization and legal-entity isolation with read-only requests.
4. Read dashboard summaries without changing filters or state.
5. Read representative invoices, payments, and correction lineage.
6. Compare journal debit and credit totals.
7. Read General Ledger facts under the approved scope.
8. Verify payment allocation plus unapplied amount equals payment total.
9. Verify outbox backlog and zero unsafe destinations.
10. Verify scheduler owner/disabled state and lease health.
11. Read final migration reconciliation evidence.
12. Verify monitors return redacted counts and durations.
13. Verify all providers and outbound delivery remain disabled before any
    later provider authorization.

## Incident command

On any SEV1: halt at the current checkpoint, keep providers disabled, preserve
safe audit and manifest evidence, do not delete or rewrite financial facts,
identify the affected organization/legal entity/currency from safe identifiers,
obtain the authorized decision owner, reconcile, and choose only approved
forward fix, canonical reversal/cancellation, or separately authorized
infrastructure recovery.
