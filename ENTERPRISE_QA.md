# ENTERPRISE QA — Monolith

> Test evidence for Stage 2. A page is not certified because it renders.

## Automated coverage added in Stage 2

| Area | File | Tests | Kind |
|---|---|---|---|
| Regional formatting | `core/regional/__tests__/format.test.ts` | 8 | pure unit |
| Module registry + resolution | `core/module-registry/__tests__/registry.test.ts` | 14 | pure unit + parity |
| Legal-entity delete guard | `core/organisation/__tests__/legal-entity.test.ts` | 4 | pure unit |
| Membership lifecycle | `core/organisation/__tests__/membership-lifecycle.test.ts` | 6 | pure unit |
| Numbering format / FY / reset | `core/numbering/__tests__/format.test.ts` | 13 | pure unit |
| Approval chain state machine + SoD | `core/approvals/__tests__/decision.test.ts` | 13 | pure unit |
| Custom-field validation | `core/custom-fields/__tests__/validate.test.ts` | 14 | pure unit |
| Config-audit redaction + diff | `core/config-audit/__tests__/redact.test.ts` | 10 | pure unit |
| Provisioning templates | `core/provisioning/__tests__/templates.test.ts` | 6 | unit |
| Observability (correlation/logger/metrics) | `core/observability/__tests__/observability.test.ts` | 10 | unit |
| Job backoff | `core/jobs/__tests__/backoff.test.ts` | 5 | pure unit |
| i18n translate / plural | `core/i18n/__tests__/translate.test.ts` | 9 | pure unit |

**~112 unit tests**, all green. `tsc --noEmit` clean and `eslint` at 0 errors
after every Stage 2 commit.

## E2E verification performed (scripted against the live database)

| Primitive | Verified behaviour |
|---|---|
| Regional settings | migration backfill: 2 orgs → 2 India-valued rows; behaviour preserved |
| Legal entities | 1 default entity per org; 5/5 branches re-parented, 0 orphan |
| Membership | 102 users → 102 primary memberships; status from `User.active`; 0 dup primary |
| Numbering | **100 parallel allocations → 100 distinct, contiguous 1..100**; annual reset from stale period → `INV-2026-27-0001`; tx rollback un-spends |
| Approvals | no-policy → APPROVED; 2-level chain; self-approve → `SELF_APPROVAL`; wrong approver → `NOT_ELIGIBLE`; L1→L2→APPROVED; reject → REJECTED |
| Custom fields | option / range validation rejected; read + write permission enforced; null clears; def delete cascades values |
| Config audit | record + newest-first + cursor; `apiKey`/`clientSecret` redacted, non-sensitive kept; `changedKeys` excludes unchanged; append-only surface |
| Provisioning | Enterprise template → 8 modules (payroll→hrms), 7 roles + grants, 2 policies, 3 sequences, 1 audit; re-run → 0 dupes; cascade cleanup |
| Observability | `SELECT 1` ready check; correlation-aware JSON log line; labelled metric counter |
| Jobs + idempotency | enqueue dedupe; success stores result; failing job retries w/ backoff → DEAD at attempts=3; `retryDeadJob`; `withIdempotency` runs fn exactly once across replays + concurrent callers |

## Per-module QC audit (spec §35) — NOT PERFORMED

The full CREATE / READ / UPDATE / DELETE + search / filter / sort / pagination /
forms / validation / uploads / downloads / permissions / workflow / approvals /
email / notifications / history / responsive / keyboard / errors / loading /
empty-states / concurrency / tenant-isolation matrix across **every** business
module has not been executed in Stage 2. This is required before an enterprise
production certification and is a blocker (`PRODUCTION_READINESS.md`).

## Browser / device (spec §36) — NOT PERFORMED

No cross-browser matrix run. Policy to establish: Chrome, Edge, Firefox, Safari
(where practical); realistic desktop / laptop sizes; mobile / tablet if
supported.

## Failure testing (spec §37) — PARTIAL

- DB failure → `/api/ready` returns 503 (verified).
- Job worker failure → job re-claimable after `runAfter`; dead-letter at
  `maxAttempts` (verified).
- Duplicate request → `withIdempotency` single execution (verified).
- Mail / OAuth / external-API / storage failure paths: **not systematically
  tested** in Stage 2.

## Accessibility (spec §27) — NOT PERFORMED

No axe / WCAG 2.2 AA pass. Blocker for the accessibility score.
