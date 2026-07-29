# Monolith Accounting — Full Step-by-Step Codex Implementation Guide

**Target:** Existing Monolith Engine repository
**Execution:** One phase per Codex session/approval gate
**Primary sources:**

1. `Accounting_Software_Build_Specification.md`
2. `Zoho Books Workings.md`
3. `Monolith_Accounting_Codex_Implementation_Plan.md`

This guide is the operator's manual. The two source specifications define the required behaviour. The implementation plan defines the engineering phases and gates. This guide defines exactly how to start, review, approve, and continue the work in Codex.

---

## 1. Important expectations

A production accounting system cannot responsibly be created in one prompt or guaranteed to contain no bugs. Production readiness must be demonstrated through:

- balanced and immutable journals;
- correct server-side authorization and tenant isolation;
- safe database migrations;
- financial and subledger reconciliation;
- statutory-scope validation;
- automated tests and accountant-led UAT;
- backup/restore and rollback rehearsals;
- a controlled parallel run and cutover.

Do not authorize Codex to implement all phases in one run. Complete, inspect, test, and approve one phase at a time.

---

## 2. Source-file integrity check

The converted Markdown files are readable and retain substantive content:

| File | Approximate size | Content retained |
|---|---:|---|
| `Accounting_Software_Build_Specification.md` | 36,000 words | Foundations, sales, purchases, accountant functions, reports, integrations, schemas, statuses, tests, worked examples, composite items, and API surface |
| `Zoho Books Workings.md` | 5,000 words | Customer/vendor workflows, banking/cash, journals, locking, COA, assets, partner accounts, job accounting, and 24 report entries |

Known conversion observations:

- The Zoho file uses bold text for some subsection headings instead of consistent Markdown heading syntax.
- The Zoho report list contains `Ledger Statement` twice. Treat this as one report with two source references unless Finance confirms distinct variants.
- Examples such as INR-only defaults, immediate payment terms, GST-address fallback, nil shipping address, e-invoice applicability, and password-based lock override are proposed operational inputs—not automatically approved company policy.
- Every worked journal and financial statement example must be recomputed independently before it becomes a golden test. If an example does not arithmetically reconcile, record a source defect and obtain an approved corrected expectation.

Keep the original DOCX files for human comparison if available, but use the Markdown files as Codex's primary machine-readable sources.

---

## 3. Repository preparation

From the latest safe Monolith branch:

```bash
git status
git fetch --all --prune
git switch <your-current-development-branch>
git pull --ff-only
git switch -c feature/production-accounting-module
```

If the working tree is not clean, commit or stash only after reviewing the changes. Never discard unrelated work.

Create this source layout:

```text
docs/accounting/sources/
  Accounting_Software_Build_Specification.md
  Zoho Books Workings.md

Monolith_Accounting_Codex_Implementation_Plan.md
Monolith_Accounting_Full_Implementation_Guide.md
```

The source filenames may retain spaces. Codex must quote paths correctly when using shell commands.

Before starting, take a verified database backup of any environment containing real accounting data. Phase 0 must not modify the database.

Recommended Codex configuration:

- open the Monolith repository root, not a subfolder;
- use the latest capable Codex model with high reasoning;
- permit repository reads and normal test/build commands;
- do not grant unrelated production credentials;
- use a development or cloned database until the migration phase is approved.

---

## 4. Master prompt — paste this first

```text
You are working inside the existing Monolith Engine repository.

The repository already contains a base Accounting module and working CRM, HRMS, CHA, AMS, Communication, authentication, RBAC, audit, notification, and shared platform functionality.

Your objective is to safely extend the existing Accounting module into a full production accounting system. Do not create a separate application. Do not blindly replace existing working functionality.

MANDATORY SOURCE FILES

Read these files completely before inspecting or modifying product code:

1. docs/accounting/sources/Accounting_Software_Build_Specification.md
2. docs/accounting/sources/Zoho Books Workings.md
3. Monolith_Accounting_Codex_Implementation_Plan.md
4. Monolith_Accounting_Full_Implementation_Guide.md
5. Every applicable AGENTS.md, README, architecture document, and module-specific instruction

SOURCE AUTHORITY

- Accounting_Software_Build_Specification.md defines broad accounting behaviour, entities, workflows, posting examples, reports, integration expectations, schemas, tests, and quality requirements.
- Zoho Books Workings.md defines Adarsh Shipping's required operating workflow, fields, reports, partner accounts, job accounting, and expected Zoho-style familiarity.
- Monolith_Accounting_Codex_Implementation_Plan.md controls implementation order and phase acceptance gates.
- Monolith_Accounting_Full_Implementation_Guide.md controls how each phase is executed and reviewed.
- Existing production data and verified Monolith behaviour must be preserved unless an approved migration explicitly changes them.
- Approved entries in docs/accounting/decisions.md override unapproved examples or defaults in the source files.
- If sources conflict, record the conflict and stop for a decision. Never choose silently.

MANDATORY READABILITY GATE

For each mandatory file, report:

| File | Exists | Opened | Read to end | First substantive heading | Final substantive heading | Heading/section count | Problems |
|---|---|---|---|---|---|---:|---|

Also report its repository-relative path, byte size, and whether tables and code blocks are accessible.

Do not infer successful reading from the filename, a summary, previous conversation context, or references in another document.

If any mandatory file is missing, truncated, unreadable, corrupted, or inaccessible:

1. Stop immediately.
2. Identify the exact file and problem.
3. Do not execute Phase 0.
4. Do not reconstruct requirements from assumptions.
5. Ask me to provide a complete UTF-8 Markdown copy.

After reading both source specifications:

- identify malformed headings or conversion artefacts;
- confirm that all named reports and final appendices/sections are accessible;
- do not rewrite source files during Phase 0;
- assign stable requirement IDs later in the traceability artifacts;
- independently verify every worked accounting example before using it as an expected test result.

NON-NEGOTIABLE ENGINEERING RULES

1. Execute exactly one authorized phase at a time.
2. Never continue automatically.
3. Preserve unrelated work and existing financial records.
4. Reuse the existing Monolith architecture and design system.
5. Do not create duplicate customers, vendors, employees, jobs, documents, payments, payroll records, or journals.
6. CRM and HRMS must never write journal tables directly.
7. Use Decimal/Numeric and an appropriate decimal library; never JavaScript floating point for financial calculations.
8. Server code must derive totals, taxes, statuses, account mappings, tenant, and actor.
9. Posted journals must be balanced, tenant-scoped, immutable, auditable, and linked to their source.
10. Corrections to posted facts use reversal, void, credit/debit note, adjustment, or approved repost workflows.
11. Posting, allocation, numbering, stock costing, approval, and lock transitions must be atomic, idempotent, and concurrency-safe.
12. Every read and mutation requires server-side authorization. UI visibility is not authorization.
13. Every organization-owned query must enforce tenant scope server-side.
14. Add migrations, fixtures, unit tests, integration tests, permission tests, tenant-isolation tests, invariant tests, and relevant E2E tests.
15. Do not report mock code, TODOs, fake integrations, hard-coded journals, or disabled tests as complete.
16. Do not install or upgrade major dependencies without approval.
17. Do not claim production readiness until every release gate, reconciliation, UAT, backup/restore, and sign-off requirement passes.

Initially, Phase 0 only is authorized.

First return the readability table, applicable repository instructions, detected stack, branch, commit, working-tree state, and existing Accounting/CRM/HRMS/CHA module locations.

Only if all source files pass the readability gate, state:

“I confirm that I successfully opened and completely read all mandatory source files. Phase 0 is the only authorized phase.”

Then execute Phase 0 only.
```

---

## 5. Phase 0 — Repository discovery and source traceability

Paste after the readability gate passes:

```text
Execute Phase 0 only: repository discovery, source extraction, baseline validation, and gap assessment.

This phase is read-only with respect to product behaviour and the database. You may create only documentation under docs/accounting/. Do not implement features, alter Prisma/database models, create migrations, redesign pages, or fix baseline failures.

1. Record baseline

- branch, commit, worktree changes;
- package manager, runtime, framework, Prisma and PostgreSQL versions;
- deployment, CI/CD and environment layout;
- commands available for lint, formatting, type-check, unit tests, integration tests, E2E tests, migration validation, and production build.

Run available baseline checks. Record exact commands, exit status, duration, and failures. Do not fix pre-existing failures.

2. Audit existing Accounting

Inspect routes, layouts, navigation, pages, components, server actions, route handlers, services, repositories, validators, schemas, migrations, jobs, seed data, tests, and permissions for:

- organization settings, fiscal periods, numbering and locking;
- chart of accounts, journals, journal lines, posting and reversal;
- opening balances and legacy data;
- customers, vendors, items/services, taxes, currencies and exchange rates;
- quotations, orders, invoices, receipts, credit/debit notes and allocations;
- purchase orders, bills, expenses, payments and vendor credits/debit notes;
- bank/cash, statement import, matching and reconciliation;
- inventory, valuation, landed cost, returns and composite items;
- fixed assets, depreciation and disposal;
- partner capital/current accounts;
- branches, cost centres, projects and CHA jobs;
- dashboards, all reports, exports, PDFs and attachments;
- approvals, maker-checker, audit, notifications and background work.

Classify each capability as working/reusable, partial, unsafe, missing, duplicated, mocked/hard-coded, or conflicting.

3. Audit CRM ↔ Accounts

Map customer ownership, quote/order/contract, job/service billing, milestones, invoice requests, advances/retainers, billable expenses, credit limits, receipts, allocations, outstanding/ageing, credits, cancellations, collections, commissions, and billed/recognized/collected revenue feedback.

Find direct database writes, duplicated models, manual hand-offs, existing APIs/events/jobs, missing idempotency, missing retries, and missing reconciliation.

4. Audit HRMS ↔ Accounts

Map employee/branch/department/cost-centre ownership, payroll runs, earnings, deductions, TDS, benefits, loans/advances, reimbursements, bonus, gratuity, leave encashment, full-and-final settlement, liabilities, payment batches, bank failures, reversals, and reconciliation.

Confirm HRMS owns payroll calculation. Accounts owns journals, liabilities, disbursement, reversal, and financial reconciliation.

5. Audit CHA/AMS/Communication

- CHA job master, job costing, customer billing, operational/vendor expenses and approvals;
- AMS asset capitalization candidates and asset ownership;
- document generation, storage, email, reminders, notifications, and immutable sent-document versions.

6. Audit shared controls

Authentication, sessions, RBAC, segregation of duties, tenant and branch isolation, Decimal usage, database transactions, concurrency, idempotency, audit logs, outbox/inbox, retries/dead letters, file security, privacy/redaction, backups, restore, monitoring, rate limiting, exports, retention, and rollback.

7. Extract and trace sources

Create unique IDs for every substantive requirement:

- BASE-FND, BASE-SALES, BASE-PUR, BASE-ACC, BASE-REP, BASE-INT, BASE-DB, BASE-TEST, BASE-API;
- ZOHO-CUST, ZOHO-VEND, ZOHO-BANK, ZOHO-ACC, ZOHO-LOCK, ZOHO-COA, ZOHO-ASSET, ZOHO-PARTNER, ZOHO-JOB, ZOHO-REPORT.

Retain exact source section/title and line range. Consolidate duplicates while keeping all source references. Record malformed headings and source conflicts. Recompute worked examples and flag any mismatch instead of changing expected values silently.

8. Create these files

docs/accounting/current-state-audit.md
docs/accounting/source-integrity.md
docs/accounting/source-requirements.md
docs/accounting/zoho-workflow-parity.md
docs/accounting/requirements-traceability.md
docs/accounting/integration-ownership-matrix.md
docs/accounting/decisions.md
docs/accounting/baseline-validation.md

Every finding must cite repository paths, symbols/models, and source requirement IDs.

The ownership matrix must name the system of record, allowed writers, consumers, sync direction, sensitive fields, identifiers, and reconciliation rule for customers, vendors, employees, organizations, branches, quotations, billing requests, accounting invoices, payroll runs, payroll journals, expense claims, receipts, payments, bank transactions, journals, fixed assets, CHA jobs, projects, cost centres, items/services, and tax configuration.

9. Completion report

Report:

1. stack and repository summary;
2. existing capability map;
3. source integrity and requirement counts;
4. Zoho parity gaps;
5. CRM/HRMS/CHA/AMS integration maps;
6. reusable components;
7. data requiring preservation;
8. critical accounting/security/integrity risks;
9. exact baseline results;
10. files created;
11. unresolved decisions;
12. proposed migration strategy;
13. blockers;
14. Phase 1 recommendation.

Do not change product code. Do not start Phase 1.

End exactly:
“Phase 0 is complete and I am waiting for approval before Phase 1.”
```

### Reject Phase 0 if

- findings are generic rather than repository-specific;
- either source file or final section was skipped;
- source requirements lack IDs and exact references;
- the 24 Zoho report entries were not mapped;
- existing data and migration risk were not identified;
- CRM/HRMS integration is described only one way;
- product/schema code changed;
- baseline failures were silently fixed or hidden;
- Codex started Phase 1.

Correction prompt:

```text
Phase 0 is not approved.

Correct these specific gaps:
[LIST GAPS]

Reinspect the repository and source Markdown. Update only the affected Phase 0 documentation with exact repository paths, symbols, source requirement IDs, and evidence. Do not change product code or the database. Do not begin Phase 1.
```

---

## 6. Phase 1 — Business policy and India statutory decisions

Do not let Codex invent these decisions. Finance/management must answer them.

```text
Phase 0 is approved. Commit only the reviewed Phase 0 documentation, show the commit hash and summary, and preserve unrelated changes.

Execute Phase 1 only: accounting policy, organizational, migration, and India statutory-scope decisions. Do not implement code or migrations.

Convert every unresolved item into a questionnaire containing:

- decision ID and source requirement IDs;
- question and why it matters;
- available options;
- recommended option and rationale;
- accounting, operational, migration, CRM, HRMS, CHA/job-costing, security, and statutory effects;
- information/owner required;
- blocking or non-blocking classification.

At minimum cover legal entities, branches, GST registrations, fiscal year, opening date, base/foreign currencies, chart structure, numbering, accrual policy, tax rounding, approval thresholds, maker-checker, period locking/reopening, reversal rules, customer/vendor credit, partner accounts, job costing, overhead allocation, revenue recognition, payroll posting detail, reimbursements, GST/place of supply/reverse charge/HSN-SAC, GSTR-1/3B/2B, ITC matching, TDS/TCS, e-invoice, e-way bill, retention, historical migration, bank feeds, payment gateways, portals, and report definitions.

Explicitly validate Zoho-derived defaults rather than adopting them automatically.

Update docs/accounting/decisions.md after my answers. Mark every decision Approved, Rejected, Deferred, or Blocked with owner/date.

Stop after Phase 1 and wait for approval before Phase 2.
```

Phase 1 passes only when every Phase 2-blocking decision is approved by the correct business owner and India-compliance scope is reviewed by a qualified finance/tax professional.

---

## 7. Phase execution sequence

| Phase | Deliverable | Main release gate |
|---:|---|---|
| 0 | Repository/source audit | Complete evidence and traceability |
| 1 | Policy/statutory decisions | No unresolved architecture blocker |
| 2 | Domain architecture and migration design | Approved model, contracts and dry-run migration |
| 3 | Core financial kernel | Balanced, immutable, idempotent journals |
| 4 | Settings, RBAC, masters, opening balances | Tenant/RBAC tests and opening-balance reconciliation |
| 5 | Non-posting sales | Quote/order lineage and approval |
| 6 | Posting sales | AR, revenue, tax, receipts and credits reconcile |
| 7 | Purchases | AP, expenses, bills, payments and vendor credits reconcile |
| 8 | Tax, discounts and multicurrency | Approved statutory cases and FX reconcile |
| 9 | Accountant workspace | Journals, locks, budgets and partner workflows controlled |
| 10 | Banking | Statement import/match/categorize/reconcile to zero |
| 11 | Inventory and fixed assets | Stock/GL and asset/GL reconciliation |
| 12 | Reports and dashboards | Reports derive from ledger and reconcile |
| 12A | CRM and HRMS integration | Bidirectional, idempotent, private and reconcilable |
| 13 | Portals, documents and automation | Secure access and replay-safe automation |
| 14 | Legacy migration | Zero unexplained difference |
| 15 | Security and operational readiness | Security, load, restore and runbooks pass |
| 16 | UAT, parallel run and release | Formal sign-offs and controlled cutover |

Required dependency order:

```text
0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 12A → 13 → 14 → 15 → 16
```

Phase 12A may be designed earlier, but implementation must not bypass the accepted accounting posting, banking, reporting, tax, sales, or purchase domains.

---

## 8. Reusable prompt for Phase 2

```text
Phase 1 is approved. Commit only reviewed Phase 1 documentation.

Execute Phase 2 only according to the implementation plan: domain architecture, data ownership, posting-rule catalogue, API/integration contracts, permissions matrix, and additive migration design.

Do not implement feature UI. Do not destructively migrate production data.

Produce/update:
- docs/accounting/domain-model.md
- docs/accounting/posting-rules.md
- docs/accounting/api-contracts.md
- docs/accounting/integration-contracts.md
- docs/accounting/integration-ownership-matrix.md
- docs/accounting/permissions-matrix.md
- docs/accounting/migration-and-reconciliation.md
- docs/accounting/requirements-traceability.md

Design one canonical journal engine, source-to-journal lineage, Decimal precision, period locks, numbering, approvals, reversals, allocations, outbox/inbox, optimistic/pessimistic concurrency rules, and tenant constraints.

Provide ERD/schema diff, indexes/constraints, migration stages, rollback/forward-fix strategy, legacy mapping, data-volume assumptions, and migration rehearsal commands.

Prove that no CRM, HRMS, CHA, AMS, or browser action writes journal lines directly.

Run design/schema validation and migration dry-run against a disposable copy only. Stop before Phase 3.
```

---

## 9. Reusable implementation prompt for Phases 3–16

Replace bracketed values for the authorized phase.

```text
Phase [CURRENT] is approved. Commit only its reviewed changes and show the commit hash.

Execute Phase [NEXT] only from Monolith_Accounting_Codex_Implementation_Plan.md.

Before coding:

1. Read the exact source sections mapped to Phase [NEXT].
2. Read approved decisions and all current docs/accounting artifacts.
3. Inspect relevant existing code, schema, migrations, tests, and uncommitted changes.
4. List the requirement IDs covered.
5. Present the smallest end-to-end implementation slices and test matrix.
6. Stop for any unresolved business/accounting/statutory decision.

For each approved slice implement:

- safe additive schema migration;
- domain and application services;
- Decimal-based calculation;
- atomic/idempotent posting or state transition;
- server-side tenant and RBAC enforcement;
- route/server action/API;
- UI using existing Monolith design-system components;
- audit, source lineage, outbox/notification and failure state;
- fixtures and unit/integration/permission/tenant/concurrency/E2E tests;
- documentation and traceability updates.

Do not accept authoritative totals, tax, tenant, actor, status, accounts, or journal lines from the browser. Do not directly edit/delete posted facts.

Validation:

- format/lint;
- type-check;
- unit and integration tests;
- accounting invariant tests;
- tenant/RBAC tests;
- migration up/down or forward-fix rehearsal as supported;
- targeted E2E;
- production build;
- phase-specific reconciliation;
- query/performance review.

Report exact commands and results, migrations/files changed, behaviour preserved, posting/data-flow rules, security/concurrency checks, reconciliation totals, known limitations, and traceability changes.

Do not start Phase [FOLLOWING].
End exactly:
“Phase [NEXT] is complete and I am waiting for approval before Phase [FOLLOWING].”
```

---

## 10. Phase-specific additions

Append the relevant block to the reusable prompt.

### Phase 3 — Financial kernel

```text
Prove balanced-entry enforcement at database/service boundaries, posted immutability, reversible lineage, atomic posting, duplicate-command prevention, lock-date enforcement, collision-safe numbering, and control-account restrictions. Include concurrent posting and rollback tests.
```

### Phase 4 — Settings, masters and opening balances

```text
Implement organization/branch fiscal configuration, approved COA hierarchy, customers/vendors/items/taxes/currencies, permissions, approval configuration and opening balances. Reconcile opening journals to imported customer/vendor/bank/stock/asset balances with zero unexplained difference.
```

### Phase 5 — Non-posting sales

```text
Implement customer → quotation → sales order/approved billing request without journals. Preserve conversion lineage, remaining billable quantity/value, approval, expiry, attachments, versions and cancellation. Integrate CRM ownership without duplicating customers or quotes.
```

### Phase 6 — Posting sales

```text
Implement invoice, recurring invoice, retainer, sales receipt, payment allocation, customer debit/credit notes, refunds, void/reversal and AR ageing. Cover service and inventory invoices, partial/split/on-account payments, bank charges, credits and overpayments. Reconcile AR subledger to the control account.
```

### Phase 7 — Purchases

```text
Implement purchase orders, vendor bills, recurring bills/expenses, vendor debit/credit workflow, expenses, payments and AP allocations. Integrate CHA expenses through the canonical approval/payable/payment path. Reconcile AP to the control account.
```

### Phase 8 — Tax, discount and multicurrency

```text
Implement only approved Phase 1 statutory scope. Cover inclusive/exclusive prices, line/document discounts, CGST/SGST/IGST/cess where approved, place of supply, reverse charge, TDS/TCS, credit-note tax effects, GSTR summaries/2B matching, exchange rates, realized/unrealized FX and base-currency adjustment. Obtain finance/tax UAT evidence.
```

### Phase 9 — Accountant workspace

```text
Implement manual/recurring/reversing journals, templates, budgets, subaccounts, lock/reopen controls, tax adjustments/payments and approved partner capital/current-account workflows. Never store a reusable lock-override password. Require permission, reason, time-bound reopening and audit.
```

### Phase 10 — Banking

```text
Implement bank/cash accounts, secure statement import, deterministic matching, split/categorize/exclude/transfer, clearing accounts and reconciliation. Matching an existing entry must not create a duplicate journal. Demonstrate reconciliation to zero and safe duplicate-file re-import.
```

### Phase 11 — Inventory and assets

```text
Implement approved inventory valuation, cost layers, purchase/sale/return, landed cost, negative-stock policy, item groups/composites and stock reconciliation. Implement asset capitalization, depreciation, impairment/adjustment if approved, transfer and disposal. Reconcile inventory and fixed-asset registers to GL.
```

### Phase 12 — Reports

```text
Build reports from canonical posted journal/subledger facts, never separate report totals. Cover every base-spec report and all 24 Zoho entries, treating duplicate Ledger Statement as one report unless decided otherwise. Include drill-down, date/as-of semantics, branch/job/cost-centre filters, exports, permissions and comparative periods. Validate the independently corrected worked scenario.
```

### Phase 12A — CRM/HRMS bidirectional integration

```text
Implement approved ownership contracts with versioned commands/events, durable source-target mappings, transactional outbox/inbox, idempotent consumers, retries, dead-letter visibility, replay, correlation IDs and reconciliation.

CRM → Accounts: approved billing requests, jobs/services, milestones, retainers, expenses, discounts/taxes and credit checks.
Accounts → CRM: document/posting state, due/outstanding/ageing, payments/allocations, credits/reversals, finance holds and billed/recognized/collected measures.
HRMS → Accounts: approved immutable payroll version, components, allocations, reimbursement, loans/advances, bonus, gratuity and full-and-final facts.
Accounts → HRMS: journal/liability/payment/reversal/reconciliation state and authorized employee-level payment results.

Test duplicates, out-of-order delivery, worker crashes, partial bank failures, replay, privacy, cross-tenant isolation and repair without direct posted-journal edits.
```

### Phase 13 — Portals/documents/automation

```text
Implement only approved customer/vendor portal scope, immutable rendered PDFs, Communication-based email/reminders, recurring schedulers, approval inbox, attachment controls and approved payment gateway lifecycle. Verify signatures, replay safety, contact-level access and exact sent-document version retention.
```

### Phase 14 — Migration

```text
Use a rehearsed, backed-up, restartable migration. Preserve legacy IDs and audit history. Reconcile trial balance, P&L, balance sheet, AR, AP, bank/cash, tax, stock, assets, document counts, partner accounts and job profitability. No cutover with an unexplained difference.
```

### Phase 15 — Operational readiness

```text
Perform tenant/RBAC/IDOR/mass-assignment/injection/CSRF/XSS/upload/export/security review; concurrency and production-volume load tests; index/query/N+1 review; secret/log redaction; accessibility; supported browsers; queue/dead-letter alerts; backup restore; disaster recovery; RPO/RTO; operations and incident runbooks. Resolve all critical/high findings.
```

### Phase 16 — UAT and release

```text
Run accountant-authored UAT, complete Zoho workflow-parity UAT, rehearse month/period close, perform an approved parallel run, reconcile every ledger/subledger/register/report, train users, test cutover and rollback, deploy behind an organization/feature flag, and monitor invariants. Require Product, Finance, Security, Operations and statutory-adviser sign-off before declaring production readiness.
```

---

## 11. Review and approval prompt after every phase

```text
Do not begin another phase.

Provide the Phase [N] acceptance pack:

1. requirement IDs completed, blocked and deferred;
2. source sections covered;
3. approved decisions used;
4. changed files and migrations;
5. data preserved;
6. posting rules and state transitions;
7. authorization and tenant controls;
8. concurrency/idempotency behaviour;
9. exact test/build commands and unabridged pass/fail summary;
10. reconciliation inputs, outputs and difference;
11. migration/rollback evidence;
12. screenshots or E2E evidence for user workflows;
13. known limitations and risks;
14. traceability/documentation updates;
15. suggested commit message.

If anything required by the phase gate is incomplete, mark the phase BLOCKED or PARTIAL. Do not describe it as complete.
```

Only approve when the actual files, tests, migrations, and reconciliations support the claim.

Approval:

```text
Phase [N] is approved.

Commit only the reviewed Phase [N] changes using the approved commit message. Preserve unrelated work. Show the commit hash, changed-file summary, and working-tree status.

Do not start Phase [N+1] until I send its authorization prompt.
```

---

## 12. Mandatory financial test pack

Across the applicable phases, require:

- debit equals credit in transaction and base currency;
- unbalanced journal rejected;
- posted journal/lines cannot be updated or deleted;
- reversal retains source and original lineage;
- identical retry creates one result;
- concurrent posting/number allocation creates no duplicate;
- failed posting rolls back document, journal, stock, allocation and audit effects;
- locked-period actions rejected;
- cross-tenant read/write blocked;
- unauthorized status transition blocked;
- browser-tampered totals/tax/accounts ignored and recalculated;
- AR/AP subledgers equal control accounts;
- bank reconciliation reaches zero;
- stock valuation equals inventory GL;
- asset register cost/depreciation/NBV equals GL;
- tax reports reconcile to source documents and tax ledgers;
- reports tie to GL and preserve as-of/date-range semantics;
- source examples are independently recomputed;
- CRM and HRMS replay/out-of-order/failure scenarios do not duplicate financial facts;
- migration produces zero unexplained financial difference;
- backup restoration reproduces accepted balances.

---

## 13. Minimum end-to-end UAT journeys

1. Organization, fiscal year, COA, GST, currencies, numbering and permissions.
2. Customer → quote → order → partial invoice → receipt → statement → P&L/BS/AR.
3. Inventory bill → vendor payment → sale → customer receipt → bank and stock reconciliation.
4. Bill → partial payment → vendor debit/credit → AP ageing.
5. CHA expense → manager/accounts approval → payable/posting/payment → shared status.
6. CHA job → direct/indirect costs → milestone billing → job gross/net profit.
7. Foreign-currency invoice → partial payment at changed rate → realized FX → open-balance revaluation.
8. Bank import → exact/fuzzy/manual match → split/categorize → reconciliation.
9. Asset purchase → capitalization → depreciation → disposal → gain/loss.
10. Partner capital → drawings/remuneration/interest → year-end appropriation.
11. Period lock → rejected edit/post → authorized, audited reopen → adjustment → relock.
12. CRM milestone → invoice request → approval/post → partial payment → credit note → CRM totals reconcile.
13. CRM credit hold → rejection → approved resolution → idempotent retry.
14. HRMS payroll → journal/liabilities → payment batch with partial bank failure → retry → reconciliation.
15. HRMS reimbursement/advance → Accounts disbursement/recovery → HRMS balance.
16. Reversal/repost of CRM invoice and HRMS payroll with linked status in all modules.
17. GSTR/source-document/ledger reconciliation for the approved statutory scope.
18. Legacy migration and parallel-period comparison with zero unexplained difference.

---

## 14. Production cutover checklist

Do not release until:

- all in-scope traceability rows are Verified or Accepted;
- no critical/high security or financial-integrity defect remains;
- all posted-document and journal invariants pass;
- data migration and every reconciliation have zero unexplained difference;
- India statutory functionality is validated by a qualified professional;
- production-like performance SLOs pass;
- monitoring covers failed posts, unbalanced attempts, queue/dead letters, integration mismatches, reconciliation differences and permission anomalies;
- backup and restore are demonstrated;
- cutover and rollback are rehearsed;
- old and new paths cannot post the same transaction twice;
- accountant-led UAT and an approved parallel run pass;
- Product, Finance, Security and Operations sign off;
- rollout uses a controlled feature/organization flag;
- a stabilization owner, incident path and rollback threshold are documented.

---

## 15. First action

Start with the Master Prompt in section 4. Do not paste every phase prompt at once. Allow Codex to complete only the readability gate and Phase 0, inspect its artifacts, correct gaps, and approve it before Phase 1.
