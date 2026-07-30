# Accounting Phase 6 cutover runbook

Status: preparation only. Every production-changing step requires separate
written authorization. This runbook is not that authorization.

## 1. Authorization and policy

- [ ] `[SEPARATE AUTHORIZATION REQUIRED]` Name rollout owner, operator, checker
  and recovery decision owner.
- [ ] Record stakeholder, Finance/CA, security and operations sign-off.
- [ ] Accept opening/history, currency/FX, tax/statutory, depreciation, partner,
  attachment scanning/retention and provider policies.
- [ ] Confirm tenant, organization and legal-entity scope.
- [ ] Confirm migration maker and checker are different active identities.

Stop if anything is unresolved.

## 2. Backup and recovery

- [ ] `[SEPARATE AUTHORIZATION REQUIRED]` Create production database backup.
- [ ] Verify restoration in an isolated approved environment.
- [ ] Record immutable reference, checksum, time and retention owner.
- [ ] Record forward-fix and restore decision boundaries.
- [ ] Confirm posted facts use canonical reversal, not deletion.

## 3. Freeze and final extraction

- [ ] `[SEPARATE AUTHORIZATION REQUIRED]` Announce freeze window.
- [ ] `[SEPARATE AUTHORIZATION REQUIRED]` Freeze source financial writes.
- [ ] Create the final credential-free versioned extraction.
- [ ] Create file manifest, SHA-256 values and record counts.
- [ ] Validate the accepted source contract and prove no later source change.

## 4. Rehearsal

- [ ] Validate/normalize on exact guarded synthetic staging.
- [ ] Review mappings and all missing/ambiguous cases.
- [ ] Run dependency and opening/history gates.
- [ ] Run dry-run twice and prove identical hashes.
- [ ] Interrupt/resume a bounded synthetic execution.
- [ ] Replay it and prove no duplicate canonical target.
- [ ] Reconcile every legal entity and currency.
- [ ] Quarantine unresolved exceptions.
- [ ] Record bounded performance/resource results.

Production execution remains blocked after rehearsal.

## 5. Deployment readiness

- [ ] Build and validate the exact revision.
- [ ] Validate additive SQL and old/new version compatibility.
- [ ] Keep migration deployment separate from startup.
- [ ] Confirm outbound/provider configuration is disabled.
- [ ] Confirm one scheduler owner, leases, clock and timezone.
- [ ] Confirm non-mutating health/readiness checks and operational alerts.
- [ ] Define go/no-go and forward-fix/restore thresholds.

## 6. Production migration

- [ ] `[SEPARATE AUTHORIZATION REQUIRED]` Deploy additive schema migration.
- [ ] `[SEPARATE AUTHORIZATION REQUIRED]` Run final production dry-run.
- [ ] Match rehearsal manifest/outcome evidence.
- [ ] Obtain final operator/checker approval.
- [ ] `[SEPARATE AUTHORIZATION REQUIRED]` Review and enable the exact production
  migration command in a later production-enablement change.
- [ ] Execute bounded batches, persist checkpoints and quarantine exceptions.
- [ ] Stop on scope, policy, balance, duplicate, reconciliation or outbox error.

Current Phase 6 code cannot perform this gate.

## 7. Reconciliation and business verification

- [ ] Compare source/import/skip/failure counts.
- [ ] Compare document, debit/credit, AR/AP, receipt/payment, allocation totals
  by legal entity and currency.
- [ ] Verify journal balance, lineage, duplicates, mappings and orphans.
- [ ] Verify unexpected outbox items are zero.
- [ ] Obtain Finance/business-owner sign-off.

No partial batch or manual review may be reported as complete.

## 8. Post-cutover checks

- [ ] Verify authentication, Accounting navigation and RBAC.
- [ ] Verify maker/checker and cross-entity denial.
- [ ] Read representative documents, payments, journals and GL facts.
- [ ] Verify allocation/correction lineage, configuration and reconciliation.
- [ ] Verify outbox/scheduler and provider state without delivery.
- [ ] Compare performance with the accepted baseline.

## 9. Provider enablement

- [ ] `[SEPARATE AUTHORIZATION REQUIRED]` Accept provider-specific contract.
- [ ] Verify credentials without logging them.
- [ ] Test signature/replay/idempotency/reconciliation with non-production
  fixtures.
- [ ] `[SEPARATE AUTHORIZATION REQUIRED]` Enable one destination at a time.

Provider enablement is not required for provider-disabled cutover closure.

## 10. Monitoring and closure

- [ ] Monitor exceptions, posting failures, reconciliation, outbox, scheduler,
  authorization and idempotency for the accepted window.
- [ ] Record forward fixes and canonical reversals.
- [ ] Obtain operational/business closure.
- [ ] Retain manifest, mappings, certification, reconciliation, approvals and
  backup reference under the accepted retention policy.

## Recovery decision

Use forward fix for retryable metadata/prepared records. Use canonical reversal
or cancellation for posted financial effects. Use database restore only under
separately authorized infrastructure recovery. Never delete posted records or
migration evidence.
