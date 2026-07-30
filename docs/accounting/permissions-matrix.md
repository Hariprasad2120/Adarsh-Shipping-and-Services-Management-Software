# Accounting Permissions and Maker-Checker Matrix

Status: Phase 3 canonical authorization implemented on synthetic staging. Server enforcement is required; UI visibility is never authorization.

## Principles

- Permissions are scoped to the authenticated organization and, where configured, legal entity/registration/branch.
- Maker and checker must be distinct users for protected transitions.
- A user holding both permissions still cannot approve their own or materially modified work.
- Platform administrators do not implicitly gain financial posting rights.
- Posted facts have no edit/delete permission. Corrections use reversal/adjustment permissions.
- Amount/risk thresholds and alternate approvers are configuration pending and are not hard-coded.

## Permission catalogue

| Capability | Read | Prepare/manage | Approve/post/control |
|---|---|---|---|
| Organization accounting settings | `accounting.settings.read` | `accounting.settings.manage` | `accounting.settings.approve` |
| Legal entity/GST registration | `accounting.tax-registration.read` | `accounting.tax-registration.manage` | `accounting.tax-registration.activate` |
| Fiscal years/periods | `accounting.period.read` | `accounting.period.manage` | `accounting.period.lock` |
| Exceptional reopen | `accounting.period.read` | `accounting.period.reopen.request` | `accounting.period.reopen.approve` |
| Currency/rates | `accounting.currency.read` | `accounting.currency.manage` | `accounting.exchange-rate.approve` |
| Chart of accounts | `accounting.coa.read` | `accounting.coa.manage` | `accounting.coa.approve` |
| Dimensions | `accounting.dimension.read` | `accounting.dimension.manage` | `accounting.dimension.approve` |
| Number series | `accounting.number-series.read` | `accounting.number-series.manage` | `accounting.number-series.approve` |
| Manual journal | `accounting.journal.read` | `accounting.journal.create` | `accounting.journal.approve`, `accounting.journal.post` |
| Reversal | `accounting.journal.read` | `accounting.journal.reverse.request` | `accounting.journal.reverse.approve` |
| Sales/AR | `accounting.ar.read` | `accounting.ar.manage` | `accounting.ar.approve`, `accounting.ar.post` |
| Purchase/AP | `accounting.ap.read` | `accounting.ap.manage` | `accounting.ap.approve`, `accounting.ap.post` |
| Receipts/payments | `accounting.payment.read` | `accounting.payment.prepare` | `accounting.payment.approve`, `accounting.payment.post` |
| Banking/reconciliation | `accounting.bank.read` | `accounting.bank.import`, `accounting.bank.match` | `accounting.bank.reconcile` |
| Tax working papers | `accounting.tax.read` | `accounting.tax.prepare` | `accounting.tax.approve` |
| Reports | `accounting.report.read` | — | `accounting.report.export` |
| Audit | `accounting.audit.read` | — | `accounting.audit.export` |
| Integration operations | `accounting.integration.read` | `accounting.integration.retry` | `accounting.integration.dead-letter.manage` |

Legacy permissions such as `accounting.read/create/approve` remain compatibility aliases until routes are migrated. They must not become a permanent coarse-grained bypass.

The canonical Phase 3 runtime uses `accounting.draft.create`, `accounting.invoice.create`, `accounting.journal.prepare`, `accounting.journal.approve`, `accounting.post`, `accounting.reverse`, `accounting.replace`, `accounting.integration.post`, `accounting.integration.retry`, and `accounting.integration.manual-review`. Administration keys are `accounting.period_lock.request`, `accounting.period_lock.approve`, `accounting.exchange_rate.maintain`, `accounting.rounding_policy.admin`, `accounting.approval_policy.admin`, and `accounting.number_series.admin`; read keys are `accounting.ledger.read` and `accounting.audit.read`.

## Protected actions

| Action | Maker | Independent checker | Extra condition |
|---|---|---|---|
| Material organization/statutory policy change | Settings manager | Settings approver | Effective date and before/after audit |
| Account create/change/deactivate | COA manager | COA approver where policy says | System account remains locked |
| Manual journal | Journal creator | Journal approver/poster | No self-approval; balance/period checks |
| Payment | Payment preparer | Payment approver/poster | Bank-detail/risk policy snapshot |
| Write-off/bad debt | AR/AP maker | Independent approver | Threshold policy pending |
| Period reopen | Accounts Manager requester | Partner/Finance Administrator | Reason, bounded window, automatic relock |
| Exchange-rate approval | Currency manager | Rate approver where manually entered | Source/date frozen |
| Bank/KYC change | Party workflow initiator | High-control approver | Verification evidence required |
| Reversal | Reversal requester | Reversal approver | Linked original and permitted posting date |

## Enforcement tests

- missing permission and wrong tenant return forbidden without revealing record existence;
- self-approval fails even if user has both permissions;
- maker cannot mutate the version after approval without creating a new version;
- stale `expectedVersion` fails;
- branch/legal-entity scope cannot be escalated through request input;
- platform-admin-only identity cannot post;
- protected system accounts and posted facts reject direct changes;
- audit records contain actor, effective scope, policy version and reason.
