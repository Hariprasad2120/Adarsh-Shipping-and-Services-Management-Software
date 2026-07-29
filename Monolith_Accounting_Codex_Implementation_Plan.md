# Monolith Accounting Module — Codex Step-by-Step Implementation Plan

**Source specifications:** `docs/accounting/sources/Accounting_Software_Build_Specification.md` and `docs/accounting/sources/Zoho Books Workings.md`  
**Target:** Existing Monolith Engine accounting module  
**Execution model:** One phase at a time, with inspection, implementation, tests, review, and an explicit approval gate before the next phase  
**Primary stack assumption:** Existing Monolith stack (Next.js, TypeScript, PostgreSQL, Prisma, existing authentication and RBAC). Codex must confirm the real repository stack during Phase 0 and must not replace it based on this assumption.

---

## 1. Purpose

Use this file as the controlling implementation brief for Codex. The two attached accounting documents are complementary functional sources:

- `docs/accounting/sources/Accounting_Software_Build_Specification.md` defines the broad production accounting architecture, accounting behavior, controls, posting workflows, APIs, entities, examples, and quality expectations.
- `docs/accounting/sources/Zoho Books Workings.md` defines Adarsh Shipping's expected Zoho Books-style operating workflow, required transaction fields, job-accounting behavior, partner accounts, transaction locking, and named reports.

Neither source may be ignored. Where they overlap, Codex must consolidate them into one requirement and preserve the more specific Adarsh operational detail. Where they conflict, statutory law, approved accounting policy, ledger invariants, security, and explicit decisions in `docs/accounting/decisions.md` take precedence. Codex must record the conflict and stop for a decision rather than silently choosing a behavior.

Together, the specifications are the functional source of truth for:

- organization and accounting settings;
- chart of accounts and shared masters;
- double-entry ledger and posting engine;
- sales, purchases, accountant, banking, fixed-assets, and reporting workflows;
- transaction lifecycles, approvals, journals, reversals, allocations, and interconnections;
- database entities, statuses, API surfaces, testing requirements, and worked accounting examples.

The existing Monolith accounting module must be inspected and reused wherever it is correct. Codex must extend or refactor it safely. It must not delete working code, redesign unrelated Monolith modules, or build a second disconnected accounting system.

This plan intentionally prevents a one-shot implementation. Financial software must be built in controlled increments because later features depend on the correctness of the ledger, posting rules, locks, allocations, tax treatment, and migrations.

---

## 2. Non-negotiable Codex operating rules

Paste the following block into Codex before starting Phase 0:

```text
You are implementing the production accounting module inside the existing Monolith Engine repository.

Read these files completely before changing code:
1. Monolith_Accounting_Codex_Implementation_Plan.md
2. docs/accounting/sources/Accounting_Software_Build_Specification.md
3. docs/accounting/sources/Zoho Books Workings.md
4. Repository instructions such as AGENTS.md, README files, architecture documents, and module-specific documentation.

Execution rules:
- Work on exactly one numbered phase at a time.
- Do not begin the next phase until the current phase passes all acceptance gates and I explicitly approve continuation.
- At the start of every phase, inspect the repository again for relevant existing code, schema, routes, components, tests, conventions, and uncommitted changes.
- Treat the existing code as evidence, not as automatically correct. Preserve working behavior and user changes.
- Do not create a parallel accounting module when an existing one can be migrated safely.
- Never use floating-point numbers for money, exchange rates, quantities requiring precision, tax, or journal totals. Use database Decimal/Numeric types and a decimal library.
- Every posted transaction must produce a balanced, immutable journal entry. Sum(debits) must equal sum(credits) in transaction currency and base currency.
- Draft documents may be edited. Posted financial facts must never be silently edited or deleted; correct them through approved reversal, void, credit, debit, adjustment, or repost workflows.
- All posting, allocation, numbering, approval, lock-date, and stock-cost changes must execute inside database transactions with concurrency protection.
- Every organization-owned row must be tenant-scoped. Never trust organizationId, userId, role, totals, tax, status, or ledger accounts supplied by the client.
- Perform authorization on the server for every read and mutation. UI visibility is not authorization.
- Reuse the Monolith design system and shared components. Do not introduce page-specific visual systems or inline styling where shared tokens/components exist.
- Use server-side pagination/filtering for large lists and reports. Avoid N+1 queries and unbounded table reads.
- Add database migrations, fixtures, unit tests, integration tests, permission tests, and accounting invariant tests for every phase.
- Do not claim “bug-free”, “production-ready”, or “complete” without evidence from the required gates.
- Do not hide unfinished work behind mock data, TODOs, placeholder routes, fake integrations, hard-coded journals, or disabled tests.
- Do not install or upgrade major dependencies without explaining why and obtaining approval.
- Do not expose secrets, credentials, tokens, bank details, or sensitive accounting data in source, browser payloads, logs, or test snapshots.
- Treat Zoho Books Workings as a workflow and field-parity requirement, not as authorization to copy Zoho branding, code, proprietary UI, or undocumented behavior.
- Do not hard-code descriptive statements from Zoho Books Workings as policy. Examples such as INR-only operation, payment due on invoice creation, no shipping address, soft-lock password override, or current e-invoice applicability must be confirmed in Phase 1 and stored as organization configuration where appropriate.

Required end-of-phase response:
1. What you inspected.
2. Existing behavior preserved.
3. Files and migrations changed.
4. Posting/data-flow rules implemented.
5. Tests run, exact commands, and results.
6. Security, tenant isolation, concurrency, accessibility, and performance checks.
7. Known limitations or decisions still required.
8. A requirements traceability update.
9. A clear STOP statement: “Phase N is complete and I am waiting for approval before Phase N+1.”

If a required business or accounting decision is ambiguous, stop and ask. Never invent accounting policy.
```

---

## 3. Meaning of “production ready”

Production readiness is an evidence gate, not a promise. The module is ready only when all of the following are true:

- every in-scope requirement has a traceability record;
- posting rules are balanced and tested with worked examples;
- tenant isolation and RBAC tests pass;
- opening balances and any legacy migration reconcile;
- transaction numbering remains unique under concurrency;
- posted records are immutable and reversals are traceable;
- period locks and approval controls cannot be bypassed;
- reports reconcile to the general ledger;
- receivable/payable subledgers reconcile to control accounts;
- inventory valuation reconciles to the inventory ledger if inventory is enabled;
- bank reconciliation has deterministic matching and auditable manual decisions;
- backups, restoration, monitoring, alerting, privacy, retention, and incident procedures are verified;
- performance and load tests meet agreed service-level objectives;
- the accountant/UAT owner signs off;
- India-specific statutory scope is either implemented and validated by a qualified professional or explicitly declared out of scope.

No software process can truthfully guarantee zero bugs. The objective is to prevent, detect, contain, and correct defects without corrupting financial records.

---

## 4. Required project artifacts

Codex must maintain these files in the repository from Phase 0 onward:

```text
docs/accounting/
  source-requirements.md
  zoho-workflow-parity.md
  current-state-audit.md
  decisions.md
  requirements-traceability.md
  domain-model.md
  posting-rules.md
  api-contracts.md
  integration-contracts.md
  integration-ownership-matrix.md
  permissions-matrix.md
  migration-and-reconciliation.md
  test-evidence.md
  operations-runbook.md
  release-readiness.md
```

Rules:

- `source-requirements.md` is a structured index of both attached specifications. Do not paste either document into it.
- `zoho-workflow-parity.md` maps every workflow, field, report, default, and exception in `Zoho Books Workings.md` to an approved Monolith behavior, implementation phase, code, tests, and acceptance evidence.
- `requirements-traceability.md` maps each specification section to implementation, tests, status, and evidence.
- `decisions.md` records business choices and unresolved questions. Never bury a decision only in chat.
- `posting-rules.md` defines the debit/credit templates, triggering event, account resolution, rounding, currency behavior, reversal behavior, and tests.
- `integration-contracts.md` defines versioned CRM/HRMS events and commands, schemas, ownership, validation, idempotency keys, retries, error states, compensating actions, and reconciliation rules.
- `integration-ownership-matrix.md` identifies the system of record and permitted writers for every shared customer, employee, invoice, payroll, reimbursement, payment, status, and accounting-reference field.
- Generated code and migrations must not be used as a substitute for documentation.

Recommended traceability fields:

| Field | Meaning |
|---|---|
| Requirement ID | Stable ID such as `ACC-FND-001` |
| Specification reference | Exact source section |
| Requirement | Concise expected behavior |
| Existing implementation | Reuse / modify / missing / conflicting |
| Design decision | Link or decision ID |
| Code | Files, services, routes, schema |
| Tests | Test file and case |
| Status | Not started / blocked / implemented / verified / accepted |
| Evidence | Command output, screenshot, reconciliation result, or UAT record |

---

## 5. Cross-cutting accounting invariants

These rules apply in every phase:

1. **Balanced entries:** total debit equals total credit at the journal-entry boundary.
2. **Atomicity:** business document, journal, allocations, inventory movements, and audit record commit or roll back together.
3. **Idempotency:** retrying a posting command cannot create a duplicate transaction or journal.
4. **Immutability:** posted journals and lines cannot be directly updated or deleted.
5. **Traceability:** every journal points to its source type and source ID; every source can display its journal and reversals.
6. **Tenant isolation:** organization scoping is applied server-side to every table and query.
7. **Control accounts:** receivable/payable/inventory control accounts cannot be manually misused unless policy explicitly permits it.
8. **Money precision:** Decimal/Numeric storage; documented scale and rounding per currency/tax rule.
9. **Dates:** distinguish document date, posting date, due date, tax date, settlement date, created time, and timezone.
10. **Period locking:** no posting or mutation inside a locked period without an authorized, audited override.
11. **Numbering:** organization-scoped, series-scoped, gap policy documented, collision-safe under concurrency.
12. **Server-derived totals:** subtotal, discounts, taxes, withholding, round-off, exchange effects, paid amount, and balance are recalculated on the server.
13. **Status transition control:** only permitted transitions are accepted; every transition is authenticated and audited.
14. **Approval separation:** creator, approver, poster, payer, and reconciler permissions are separately controllable.
15. **Reconciliation:** general ledger, subledgers, inventory, tax, and bank data have explicit reconciliation checks.
16. **Auditability:** actor, time, old/new state, reason, source, correlation ID, and IP/device metadata are recorded where appropriate.
17. **Single ownership:** every cross-module financial fact has one system of record; CRM and HRMS must not create or mutate journals directly.
18. **Reliable integration:** cross-module publication uses a transactional outbox (or an existing repository mechanism with equivalent guarantees), idempotent consumers, retry/backoff, dead-letter handling, and correlation/causation IDs.
19. **No distributed partial success:** database transactions do not span modules or external services. Local state commits atomically with an outbox event; consumers record durable processing results and expose repair/replay controls.
20. **Integration reconciliation:** source documents, accounting documents, journals, allocations, payments, payroll liabilities, and reimbursements have automated mismatch detection and auditable repair workflows.

---

## 6. Phase-by-phase implementation

## Phase 0 — Repository discovery and gap assessment

### Goal

Understand exactly what already exists before designing or modifying accounting code.

### Codex instruction

```text
Execute Phase 0 only.

Perform a read-only audit first. Inspect:
- repository structure and instructions;
- package/runtime versions;
- Prisma schema and all migrations;
- existing accounting pages, services, route handlers, server actions, APIs, jobs, tests, seed data, permissions, and navigation;
- existing Customer, Vendor, Item, Tax, Job/CHA, Expense, HRMS payroll, CRM invoice, AMS asset, Communication, and file/document models;
- every workflow and field named in Zoho Books Workings: customer data, quotation, sales invoice, customer debit/credit notes, vendor data, vendor invoice, vendor debit note, recurring expense, bank, cash, manual/recurring journals, transaction locking, chart of accounts, fixed asset register, partner accounts, job register, and all listed reports;
- CRM lead, opportunity, quotation, sales-order, customer, contract, service/job, billing milestone, invoice-request, payment-status, credit-limit, commission, and revenue-forecast flows;
- HRMS employee, department, branch, cost centre, payroll period/run, salary component, loan/advance, benefit, deduction, reimbursement, expense, leave/attendance input, full-and-final settlement, gratuity, bonus, and payment flows;
- all current CRM/HRMS-to-Accounts and Accounts-to-CRM/HRMS calls, shared-table writes, events, jobs, webhooks, status fields, duplicate records, and manual hand-offs;
- authentication, session, organization/branch scoping, and RBAC;
- audit logs, notifications, scheduler/queue patterns, PDF/email generation, uploads, exports, and background tasks;
- decimal/money handling, timezone handling, database transaction patterns, optimistic/pessimistic locking, and idempotency;
- existing deployment, CI, observability, backup, and environment configuration.

Do not implement product features in this phase.

Create:
- docs/accounting/current-state-audit.md
- docs/accounting/source-requirements.md
- docs/accounting/zoho-workflow-parity.md
- docs/accounting/requirements-traceability.md
- docs/accounting/decisions.md

The audit must identify:
- reusable components;
- duplicate or conflicting data models;
- incomplete/hard-coded/mock functionality;
- unsafe financial behavior;
- missing migrations/tests;
- integration ownership conflicts;
- missing or unsafe bidirectional CRM/HRMS integration contracts, event delivery, idempotency, reconciliation, replay, and failure visibility;
- data that must be preserved;
- recommended migration strategy;
- prioritized blockers.

Create stable source IDs with prefixes that distinguish the documents, for example `BASE-*` for Accounting Software Build Specification and `ZOHO-*` for Zoho Books Workings. Detect duplicated requirements, but retain citations to both sources in the consolidated traceability row.

Run the existing lint, type-check, test, and build commands without changing code first. Record baseline failures separately; do not attribute existing failures to this work.

STOP after the Phase 0 report and ask for approval.
```

### Gate

- Current accounting capability is inventoried.
- Existing database data and compatibility risks are known.
- Baseline quality commands are recorded.
- Every source-specification section has an initial traceability row.
- Every Zoho workflow, named field, operational default, and report has an initial parity row.
- No implementation begins until open architectural conflicts are decided.

---

## Phase 1 — Accounting policy and statutory-scope decisions

### Goal

Resolve policies that code cannot safely infer.

### Decisions required

- Legal entities/organizations, branches, GST registrations, and base currency.
- Indian financial year and opening date.
- Accrual basis, cash basis views, or both.
- Inventory valuation: FIFO, weighted average, or other.
- Revenue recognition and expense recognition rules.
- Tax-inclusive/exclusive pricing and rounding policy.
- GST scope: CGST, SGST, IGST, UTGST, cess, reverse charge, place of supply, HSN/SAC.
- GST returns/reconciliation scope: GSTR-1, GSTR-3B, GSTR-2B, credit matching.
- E-invoice/IRN/QR-code and e-way bill scope.
- TDS/TCS sections, thresholds, rates, certificates, and returns.
- Multi-currency exchange-rate source and override policy.
- Lock dates, reopen permissions, approval thresholds, and segregation of duties.
- Cash/bank approval and payment authorization.
- Bad debt, write-off, credit limit, and overdue policy.
- Fixed asset depreciation method and Companies Act/Income Tax treatment.
- Numbering per organization, branch, financial year, and document type.
- Data retention, attachments, export, and audit-log retention.
- Whether customer/vendor portals are part of this release.
- Whether the Zoho-style workflow is a strict functional-parity target, a migration-compatibility target, or a familiar operating model with approved Monolith improvements.
- Confirm the Zoho document's operational defaults: INR as default currency; invoice due immediately except approved credit customers; how billing address falls back to GST records; whether shipping address may be blank; customer credit limits; customer bank details; quotation numbering; and quotation-to-invoice conversion.
- Confirm whether customer debit notes increase receivables, customer credit notes reduce receivables, and vendor debit notes reduce payables, including required original-document linkage and GST adjustment behavior.
- Confirm transaction-lock behavior. Do not implement reusable or stored override passwords; prefer permission-controlled, time-bound, reason-required reopening with complete audit unless finance and security owners approve another safe mechanism.
- Confirm partner-account scope: entity type, capital/current account model, profit-sharing ratio, partner salary/commission, interest on capital/drawings, drawings, opening balances, and year-end appropriation workflow.
- Confirm job-accounting rules: authoritative Job/CHA record, job code, contract value, cost-centre mapping, direct/indirect cost allocation, overhead allocation, revenue recognition, closure controls, and gross/net profit definition.
- Integration ownership with CHA Expenses, CRM invoices, HRMS payroll, AMS assets, and Communications.
- CRM billing authority: whether CRM creates only an approved invoice request or an accounting draft; which module owns numbering, tax calculation, posting, credit notes, receipts, allocations, and write-offs.
- HRMS payroll authority: which module calculates payroll and which module owns posting, liabilities, disbursement, reimbursements, employee advances/loans, recoveries, and full-and-final settlement.
- Shared-master ownership for Customer, Employee, Branch, Department, Project, Cost Centre, Item/Service, Salesperson, and bank/payment references.
- Financial feedback required in CRM and HRMS, including document status, due/paid/overdue amounts, payment references, rejection reasons, journal references, period-lock failures, and reversal/credit status.
- Whether CRM commissions are forecast-only or become approved payroll inputs, and the approval/cut-off/clawback policy.

### Codex instruction

```text
Execute Phase 1 only.

Use the Phase 0 audit and both source specifications to present only unresolved accounting, statutory, workflow-parity, data-ownership, and integration decisions. Give a recommended default and consequence for each choice, but do not silently select it.

Update docs/accounting/decisions.md and requirements-traceability.md with approved decisions.

Do not build transactions or ledger code until blocking decisions are approved.
STOP and wait for approval.
```

### Gate

- A finance/accounting owner has accepted the policy decisions.
- India-specific compliance is clearly in scope or out of scope.
- System-of-record ownership is defined for shared Monolith entities.

---

## Phase 2 — Domain architecture and database migration design

### Goal

Design a coherent organization-scoped accounting model that extends the current schema safely.

### Required model areas

- organization accounting profile, fiscal years, periods, lock dates;
- currencies and exchange rates;
- chart of accounts with parent/child hierarchy and locked system accounts;
- customers/vendors without duplicating existing contacts;
- items/services, tax profiles, tax rates/groups/components;
- projects, locations/warehouses, branches, reporting tags, price lists;
- document number series;
- transaction headers, lines, taxes, discounts, attachments, comments, history;
- approvals and status transitions;
- journal entries and journal lines;
- payment allocations and credit applications;
- bank accounts, feeds/imports, matches, reconciliation sessions;
- inventory movements/cost layers if in scope;
- recurring templates/schedules;
- budgets;
- fixed assets and depreciation;
- partner capital/current accounts, drawings, remuneration, interest, profit-sharing rules, and year-end appropriation records where approved;
- canonical Job/CHA financial dimensions and job-register references without duplicating operational jobs;
- audit and outbox/idempotency records;
- custom fields only through validated definitions/values, not arbitrary unsafe columns.

### Required design rules

- Use stable IDs and organization-scoped unique constraints.
- Add foreign keys and appropriate delete restrictions.
- Add database constraints where feasible for state and value invariants.
- Index tenant filters, dates, statuses, document numbers, source references, accounts, contacts, and reconciliation queries.
- Document the precision/scale for money, quantity, exchange rate, and percentage.
- Avoid one giant polymorphic transaction table if it weakens constraints.
- Use explicit source references for the journal, with uniqueness preventing duplicate posting.
- Plan expand/migrate/contract migrations for live tables.
- Include backfill and rollback/forward-fix strategy.

### Codex instruction

```text
Execute Phase 2 only.

Produce the proposed domain model, ERD, Prisma changes, index/constraint plan, migration sequence, legacy mapping, data backfill, validation queries, and rollback/forward-fix approach.

Do not apply destructive migrations. Prefer additive expand/migrate/contract changes.
Generate and test migrations against an isolated database populated with representative legacy fixtures.

Update:
- docs/accounting/domain-model.md
- docs/accounting/migration-and-reconciliation.md
- docs/accounting/requirements-traceability.md

STOP before applying any production migration or starting Phase 3.
```

### Gate

- Schema review passes.
- Existing data preservation is proven on a copy/fixture.
- No cross-tenant or orphaned rows.
- Precision and uniqueness decisions are explicit.

---

## Phase 3 — Core financial kernel

### Goal

Implement the double-entry ledger, fiscal controls, idempotent posting, reversals, and audit trail before transaction modules.

### Required capabilities

- journal draft/post/reverse lifecycle;
- journal lines with debit or credit, never both;
- base and transaction currency amounts;
- account resolution service;
- posting-rule registry;
- atomic posting command with idempotency key;
- period/open-date/lock-date validation;
- system/control-account restrictions;
- source-to-journal uniqueness;
- immutable posted entries;
- explicit reversal linked to original;
- trial balance query and imbalance diagnostics;
- outbox event after successful commit;
- structured audit trail.

### Codex instruction

```text
Execute Phase 3 only.

Implement the accounting kernel as domain/application services independent of UI route handlers. UI/API code must call the same service; no duplicated posting logic.

Add unit and integration tests covering:
- balanced and unbalanced entries;
- zero/negative/rounding edge cases;
- duplicate idempotency keys;
- concurrent posting of the same source;
- locked periods;
- unauthorized posting;
- foreign currency/base currency balance;
- reversal;
- attempted edit/delete of posted entries;
- tenant isolation;
- atomic rollback after injected failure.

Implement a minimal internal journal viewer and trial balance diagnostic only if needed for verification. Do not build the full Accountant UI yet.

Update posting-rules.md and test-evidence.md.
STOP after the kernel and its evidence pass.
```

### Gate

- Database and application both reject invalid posting.
- Concurrent duplicate posting produces one journal only.
- Reversal exactly offsets the original and remains traceable.
- Trial balance is zero for all test fixtures.

---

## Phase 4 — Organization settings, RBAC, masters, and opening balances

### Goal

Build shared data required by every transaction.

### Scope

- accounting organization profile and fiscal configuration;
- chart of accounts with locked system accounts and subaccounts;
- currencies and exchange rates;
- customers/vendors integrated with existing customer/contact masters;
- customer/vendor operational fields required by Zoho Books Workings, including codes, legal/trading names, contacts, addresses, GSTIN, PAN, terms, credit limit, currency, protected bank details, opening balances, vendor category, and TDS applicability;
- items/services and inventory flags;
- tax rates, tax groups, tax components, exemptions;
- branches, locations/warehouses, projects, tags, price lists;
- document number series;
- approval rules and thresholds;
- PDF/email/payment settings as configuration only;
- opening balances with controlled import, validation, posting, and reconciliation;
- partner masters/accounts and Job/CHA accounting mappings where approved;
- permissions matrix and server enforcement.

### Gate

- Masters cannot leak between organizations.
- Locked accounts cannot be deleted or invalidly retyped.
- Duplicate numbering cannot occur under concurrent requests.
- Opening trial balance is balanced and signed off.
- Permissions are tested for view/create/edit/approve/post/void/refund/export/manage-settings.

---

## Phase 5 — Sales non-posting workflow

### Goal

Implement Quotes and Sales Orders before revenue recognition.

### Scope

- quotes, items, taxes, discounts, attachments, notes, templates;
- Zoho-parity quotation fields: number, date, validity, customer and billing snapshot, item/service, HSN/SAC, quantity, UOM, unit price, percentage/fixed discount, GST breakup, total, terms, and narration;
- quote lifecycle and approval;
- quote-to-sales-order conversion;
- sales order lifecycle;
- partial conversion tracking;
- cancellation/expiry;
- customer/project/branch ownership;
- PDF/email/communication integration through existing Monolith services;
- no ledger journal for quotes or sales orders.

### Gate

- Conversion is idempotent and preserves lineage.
- Partial invoicing quantities cannot exceed ordered quantities.
- Statuses are derived/validated, not arbitrarily assigned by the client.
- Approval and tenant isolation tests pass.

---

## Phase 6 — Sales posting workflow

### Goal

Implement invoices, receipts, retainers, credit notes, refunds, and customer payments.

### Posting coverage

- service invoice;
- GST-ready invoice fields and immutable customer/GST/address snapshots required by Zoho Books Workings;
- customer debit notes linked to original invoices for additional freight, price corrections, and extra services;
- inventory invoice with COGS/inventory movement if enabled;
- invoice with immediate payment;
- recurring invoice generation with safe retry;
- retainer receipt and later application;
- sales receipt;
- credit note with and without inventory restock;
- refund;
- payment received allocated to one or many invoices;
- unapplied customer credit;
- bank charge;
- early-payment discount;
- realized foreign-exchange gain/loss;
- void/reversal behavior.

### Gate

- Accounts receivable ageing reconciles to the AR control account.
- Customer statements reconcile to allocations.
- Over-allocation and cross-customer allocation are rejected.
- Worked examples in source Sections 2.4–2.10 pass.
- Email/payment callbacks are authenticated and idempotent.

---

## Phase 7 — Purchase non-posting and posting workflow

### Goal

Implement Purchase Orders, Bills, Recurring Bills, Vendor Credits, Payments Made, and Expenses.

### Integration rule

The existing CHA/global expense workflow must not become a second expense ledger. Define one canonical accounting expense/payable record and map operational requests/approvals to it. Concerned managers/accounts retain the previously defined approval permissions; other roles remain view-only unless the approved permission matrix says otherwise.

### Posting coverage

- expense-type bill;
- inventory bill and landed cost if enabled;
- bill void/reversal;
- recurring bill generation;
- vendor credit and application;
- bill payment;
- unapplied vendor credit/advance;
- direct paid expense;
- employee reimbursable expense;
- recurring expense templates with frequency, start/end/next dates, approval versus auto-post policy, safe scheduler retries, and generated-document lineage;
- billable expense and customer invoicing;
- payment bank charges and realized FX.

### Gate

- Accounts payable ageing reconciles to the AP control account.
- Payment cannot exceed eligible balance without an explicit advance policy.
- Vendor credit application is atomic and traceable.
- CHA and global expenses show the same underlying state and role-based actions.
- Worked examples in source Sections 3.2–3.8 pass.

---

## Phase 8 — Tax, discounts, multicurrency, and statutory workflows

### Goal

Complete cross-cutting calculation logic after core sales and purchases are stable.

### Scope from source

- line and transaction discounts;
- early-payment discounts;
- multi-component taxes;
- tax-inclusive and tax-exclusive pricing;
- exchange rates;
- realized and unrealized exchange gains/losses;
- base currency adjustment.

### India release extension, if approved in Phase 1

- GST registrations and branch/GSTIN mapping;
- CGST/SGST/IGST/UTGST/cess;
- place-of-supply and intra/inter-state determination;
- HSN/SAC and tax category;
- reverse charge;
- GST-compliant document fields;
- credit/debit note tax linkage;
- GSTR report/reconciliation datasets;
- e-invoice/IRN/QR integration;
- e-way bill integration;
- TDS/TCS rules and ledgers.

### Gate

- Golden calculation tests cover rounding at line/document/component levels.
- Tax reports reconcile to tax control accounts.
- Foreign-currency open items reconcile in both currencies.
- External statutory integrations use sandbox/certification environments and idempotent callbacks.
- Qualified Indian accounting/tax review is recorded before production use.

---

## Phase 9 — Accountant workspace

### Goal

Implement controlled accountant functions on top of the kernel.

### Scope

- manual journals with templates and recurring journals;
- manual journal type, supporting reference/attachment, preparer, approver, and cost-centre/job allocation;
- reverse journals;
- bad-debt write-off;
- accruals/prepayments where approved;
- budgets;
- period close and transaction locking;
- approved partner capital/current account, drawings, remuneration, interest, and profit-appropriation journals;
- tax payments and adjustments;
- base-currency revaluation;
- accountant review queue;
- source/journal drill-down.

### Gate

- Manual journals cannot bypass permissions, locks, or control-account policy.
- Recurring job retries cannot duplicate journals.
- Revaluation is reversible and reproducible.
- Locked-period changes require authorized reopening with reason and audit.

---

## Phase 10 — Banking and reconciliation

### Goal

Implement bank accounts, statement import/feed abstraction, categorization, matching, transfer, and reconciliation.

### Scope

- bank/cash account masters;
- protected account number/IFSC/bank/branch fields, receipt/payment/transfer/charge/interest types, cheque/UTR/reference tracking, party and linked-voucher allocation;
- petty/main cash receipts, payments and expenses with voucher numbering, income/expense head, approver, running balance, and cash-control permissions;
- CSV/OFX or approved feed import;
- import deduplication/fingerprinting;
- deterministic candidate matching;
- match to receipts/payments/expenses/transfers;
- split transactions and bank fees;
- reconcile statement closing balance;
- undo reconciliation with permission and audit;
- unresolved/duplicate/error queues;
- secure handling of bank credentials through provider/token vault patterns.

### Gate

- Reconciliation difference is exactly zero before completion.
- Imported lines cannot duplicate after retry.
- Undo does not delete financial history.
- Matching decisions remain auditable.

---

## Phase 11 — Inventory accounting and fixed assets

### Goal

Implement only the methods approved in Phase 1.

### Inventory scope

- warehouses/locations;
- stock movements linked to source documents;
- negative-stock policy;
- valuation/cost layers;
- landed cost allocation;
- returns and credit-note restocking;
- composite items/item groups/packages;
- inventory valuation and COGS reconciliation.

### Fixed asset scope

- asset categories and accounts;
- acquisition/capitalization;
- useful life, residual value, depreciation method;
- depreciation schedule and posting;
- transfer/impairment if approved;
- disposal with proceeds/gain/loss;
- links to AMS without duplicate asset masters.

### Gate

- Inventory valuation equals the inventory control account.
- COGS is reproducible from cost layers.
- Depreciation schedules reconcile to accumulated depreciation.
- AMS and Accounting identify a single owner for asset identity and book values.

---

## Phase 12 — Reporting engine and dashboards

### Goal

Build every report from the ledger or explicitly reconciled subledgers—not from UI totals.

### Required reports

- general ledger, journal report, trial balance;
- profit and loss;
- balance sheet;
- cash flow using an approved method;
- sales register, customer debit-note register, customer credit-note register, purchase register, and vendor debit-note register;
- receivables/payables ageing;
- customer/vendor balances and statements;
- payments received/made;
- inventory valuation/movement;
- tax reports;
- budgets versus actual;
- fixed-assets/depreciation;
- activity/audit reports;
- GSTR-1 summary, GSTR-2B reconciliation summary, and consolidated GST summary where approved;
- job register and job-wise profit report;
- sales by customer and sales by charge/item/service;
- purchases by vendor and purchases by charge/expense head;
- day book;
- partner capital/current-account statements and appropriation report where approved;
- customizable filters, tags, projects, branches, periods, comparison;
- export with permission, tenant scope, and formula-injection protection.

### Gate

- Appendix E worked example produces the expected journal entries, trial balance, P&L, and balance sheet.
- Balance sheet balances.
- Net income bridges from P&L to equity correctly.
- Subledger and control-account reconciliation is automated.
- Reports are performant on production-scale seeded data.
- Every report named in Zoho Books Workings has a parity result of implemented, consolidated under an explicitly mapped equivalent, or formally excluded by an approved decision.
- Job revenue, direct costs, allocated overheads, billed amount, receivables, gross profit, net profit, and margin reconcile to source documents and the general ledger.

---

## Phase 12A — Bidirectional CRM and HRMS accounting integration

### Goal

Integrate CRM and HRMS with Accounts in both directions while retaining one canonical ledger, one owner for every financial fact, and complete audit/reconciliation coverage. This phase begins only after Phases 6, 7, 8, 10, and 12 are accepted.

### Architecture requirements

- Use versioned commands/events through the repository's existing reliable integration mechanism. If none provides atomic publication, idempotent consumption, retry/backoff, dead-letter handling, replay, and observability, implement a transactional outbox/inbox pattern.
- CRM and HRMS may request or originate approved business documents, but only the accounting domain may post, reverse, allocate, close periods, or write journals.
- Do not synchronize by allowing multiple modules to update the same financial row or by using UI routes as integration APIs.
- Every request/event carries organization, branch, source module/type/ID/version, idempotency key, correlation ID, causation ID, actor/service identity, effective date, schema version, and occurred time.
- Consumers validate tenant, permissions/service authority, current source version, status transition, lock date, account mapping, decimal precision, and duplicate delivery.
- Persist source-to-target mappings. Never rely on editable document numbers as foreign keys.
- Return durable accepted, rejected, posted, partially settled, settled, reversed, and failed states. A UI notification is not delivery confirmation.
- Redact salary, bank, tax-ID, customer financial, and other sensitive fields from events and logs unless strictly required and authorized.

### CRM → Accounts

- Synchronize customer/legal-name, GSTIN, billing/shipping address, credit terms, credit limit, currency, tax profile, salesperson, branch, project/cost centre, and active/blocked state according to the ownership matrix.
- Convert an approved CRM quotation/order/contract or billing milestone into an idempotent accounting draft/invoice request with immutable source lineage.
- Support service/job billing, advances/retainers, recurring milestones, reimbursable/billable expenses, discounts, taxes, withholding requirements, attachments, and customer PO references.
- Prevent billing beyond approved quantity/value/milestone unless an authorized override policy permits it.
- Route validation, tax, credit-limit, approval, period-lock, and master-mapping failures back to CRM as actionable rejection states; never silently drop or partially create a document.
- Treat CRM forecasts and unapproved opportunities as non-posting data.

### Accounts → CRM

- Return accounting document ID/number, draft/approval/posting state, invoice date, due date, original amount, outstanding amount, ageing bucket, paid/part-paid/overdue/disputed state, credit-note/reversal status, and payment/allocation references.
- Surface customer credit exposure, available credit, on-account receipts/retainers, finance hold, collection notes/tasks, and approved dunning state without exposing unrelated ledger data.
- Update order/milestone billed and collected amounts from accounting allocations, including partial payments and credits.
- Feed recognized/billed/collected revenue summaries to CRM analytics as separately labelled measures; never overwrite pipeline forecast values.
- Publish commission-eligible and clawback facts only under the approved commission policy, with source invoice/payment/credit lineage.

### HRMS → Accounts

- Synchronize employee identity, employment state, branch, department, designation, cost centre/project allocation, statutory identifiers, and masked bank-payment details under the ownership matrix.
- Accept only an approved, locked payroll run for posting. Include employee/component-level summaries needed for reconciliation without duplicating the HRMS calculation engine.
- Map earnings, employer contributions, employee deductions, taxes/TDS, benefits, loans/advances, recoveries, reimbursements, gratuity, bonus, leave encashment, notice recovery, and full-and-final settlement to approved accounts.
- Support salary-cost allocation across branch, department, cost centre, project/job, and legal entity with totals reconciling to the payroll run.
- Send approved employee expense/reimbursement claims through the canonical Accounts payable/payment workflow; do not create a second expense ledger.
- Enforce maker/checker approval, payroll cut-off, duplicate-run prevention, employee status checks, and locked-period rules.

### Accounts → HRMS

- Return payroll posting batch, journal reference, posting date, acceptance/rejection details, and reversal/repost status to the exact immutable payroll-run version.
- Return liability and payment status separately: approved, posted, payment batch prepared, authorized, paid, partially failed, returned, cancelled, or reconciled.
- Return employee-level payment reference/date only to authorized HRMS roles, with bank-failure reasons safely redacted.
- Return reimbursement, loan/advance disbursement, recovery, and outstanding-balance status so HRMS can display the accounting truth without recalculating it.
- Provide finance-approved payroll cost summaries by authorized dimensions; do not expose other employees' salary details or unrestricted ledger drill-down.
- Prevent HRMS edits to a posted payroll version. Corrections require an approved supplemental/off-cycle run or accounting reversal-and-repost workflow with linked lineage.

### Mapping, controls, and operations

- Provide controlled mapping screens for salary components, CRM products/services, taxes, branches, departments, projects/jobs, cost centres, payment methods, clearing accounts, and exception fallbacks.
- Mapping changes are effective-dated, permission-controlled, audited, and cannot retroactively alter posted entries.
- Provide an integration operations page with delivery state, retry count, last error, source/target links, reconciliation status, safe replay, and authorized repair action.
- Replay must be idempotent; repair cannot directly edit a posted journal.
- Add daily and period-close reconciliation for CRM invoice requests versus accounting documents, billed/paid/credited totals, HRMS payroll totals versus journals/liabilities/payments, employee reimbursements, advances/loans, and unmatched mappings.
- Material mismatches block close or require a documented, authorized override according to policy.

### Required tests

- Contract/schema compatibility and versioning tests.
- Tenant, branch, RBAC/service-identity, field-level privacy, and salary-confidentiality tests.
- Duplicate, out-of-order, delayed, malformed, unauthorized, and replayed event tests.
- Concurrent approval/posting/payment and optimistic-version-conflict tests.
- CRM: full/partial/over billing, credit hold, tax rejection, partial payment, credit note, refund, retainer, reversal, and commission clawback.
- HRMS: regular/off-cycle payroll, duplicate run, component mapping failure, project allocation, reimbursement, loan/advance recovery, full-and-final settlement, partial bank failure, reversal, and repost.
- Worker crash after local commit and before/after acknowledgement, retry exhaustion, dead-letter, replay, and reconciliation-repair tests.
- End-to-end evidence that UI states in CRM/HRMS match canonical accounting balances and references.

### Gate

- Finance, CRM, and HRMS owners approve `integration-ownership-matrix.md` and `integration-contracts.md`.
- CRM billed/paid/credited values reconcile exactly to accounting source documents and allocations.
- Every approved HRMS payroll run reconciles to payroll journals, liability balances, payment batches, and employee-level payment outcomes.
- No duplicate financial document or journal is produced under retry, replay, concurrency, or worker-failure tests.
- Cross-organization leakage and unauthorized salary/financial visibility tests pass.
- Dead-letter, replay, mismatch detection, repair, monitoring, alerts, and operational runbooks are demonstrated.

---

## Phase 13 — Portals, communications, document rendering, and automation

### Goal

Complete cross-cutting workflows without weakening accounting controls.

### Scope

- customer portal: quotes, invoices, credits, payments, statements;
- vendor portal: purchase orders, bills/credits/payment status where approved;
- PDF templates and immutable rendered-document snapshots/versioning;
- email/reminders through existing Communications module;
- payment gateway configuration and webhook lifecycle;
- recurring transaction scheduler;
- notifications and approval inbox;
- attachment scanning, access control, retention, and signed access;
- outbox/worker retries and dead-letter visibility.

### Gate

- Portal access is restricted to the correct contact and organization.
- Background retries are idempotent.
- Sent financial documents retain the exact rendered version.
- Webhooks are signature-verified, replay-safe, and auditable.

---

## Phase 14 — Legacy migration and full reconciliation

### Goal

Move existing accounting data without losing history or changing balances.

### Migration sequence

1. Freeze and inventory legacy mappings.
2. Back up and test restoration.
3. Import/normalize masters.
4. Map chart of accounts and tax codes.
5. Load opening or historical transactions according to approved cutover policy.
6. Preserve source identifiers and legacy references.
7. Rebuild/validate allocations, outstanding balances, and inventory layers.
8. Compare legacy versus new reports.
9. Produce exception reports.
10. Obtain finance-owner sign-off.
11. Rehearse rollback/forward-fix and final cutover.

### Mandatory reconciliations

- trial balance by account;
- balance sheet and P&L by period;
- AR by customer/invoice;
- AP by vendor/bill;
- bank/cash closing balance;
- tax payable/receivable;
- inventory quantity/value;
- fixed asset cost/accumulated depreciation/net book value;
- document counts and totals by type/status;
- orphan, duplicate, unbalanced, and cross-tenant checks.

### Gate

- Zero unexplained financial difference.
- Every accepted exception has an owner and written reason.
- Restore and rollback rehearsal succeeds.

---

## Phase 15 — Security, performance, resilience, accessibility, and operational readiness

### Goal

Verify non-functional requirements using realistic production-scale data.

### Required checks

- OWASP-oriented route/action/API review;
- tenant-isolation automated tests;
- RBAC and segregation-of-duties tests;
- CSRF, XSS, injection, mass-assignment, IDOR, rate-limit, upload, and export checks;
- encryption and secret-management review;
- sensitive log/redaction review;
- dependency and supply-chain checks;
- concurrency/load tests for numbering, posting, allocation, recurring jobs, and reporting;
- query plans/index checks and N+1 analysis;
- backup/restore, disaster recovery, RPO/RTO;
- worker retry/dead-letter and alert tests;
- observability dashboards and financial invariant alerts;
- accessibility, keyboard navigation, focus, contrast, and screen-reader checks;
- supported browser/device tests;
- data retention/export/deletion policy consistent with statutory retention.

### Gate

- No unresolved critical/high security issue.
- Agreed performance SLOs pass.
- Backup restoration is demonstrated.
- Operational runbook and incident owners exist.

---

## Phase 16 — UAT, parallel run, release, and stabilization

### Goal

Release through controlled evidence, not a big-bang switch.

### Required steps

1. Freeze the requirements traceability baseline.
2. Run accountant-authored UAT scripts.
3. Execute the approved Zoho-workflow parity UAT pack, including every field, lifecycle, role, report, export, and reconciliation marked in scope.
4. Run at least one approved parallel accounting period or representative close rehearsal.
5. Compare legacy/Zoho reference outputs and new Monolith results; investigate all differences.
6. Complete opening/closing, tax, bank, AR, AP, inventory, fixed-asset, partner-account, and job-profitability reconciliations.
7. Train administrators, accountants, approvers, and ordinary users.
8. Prepare cutover, rollback, support, and incident plans.
9. Deploy behind a controlled organization/feature flag.
10. Monitor invariants, errors, queues, and performance.
11. Remove the legacy path only after signed acceptance and retention requirements are met.

### Final release gate

- Product owner sign-off.
- Finance/accounting sign-off.
- Security sign-off.
- Operations sign-off.
- Statutory adviser sign-off for India-specific functionality.
- No critical traceability gap.
- All release-blocking tests pass.
- Reconciliation has zero unexplained difference.

---

## 7. Standard instruction for Phases 4–16, including Phase 12A

For each phase after its detailed scope is approved, use:

```text
Execute Phase [N] only from Monolith_Accounting_Codex_Implementation_Plan.md.

Before coding:
1. Read the relevant sections of docs/accounting/sources/Accounting_Software_Build_Specification.md.
2. Read the relevant sections of docs/accounting/sources/Zoho Books Workings.md and the latest docs/accounting/zoho-workflow-parity.md.
3. Read the Phase 0 audit, approved decisions, domain model, posting rules, API contracts, permission matrix, migration plan, and traceability matrix.
4. Inspect all relevant existing repository code and current uncommitted changes.
5. Present a concise implementation slice and test matrix for this phase.

Then implement the approved slice end to end:
- additive/safe schema migration;
- domain/application service;
- server-side validation and authorization;
- API/server action;
- UI using the existing Monolith design system;
- audit/outbox/notification behavior where applicable;
- unit, integration, permission, tenant-isolation, concurrency, and end-to-end tests;
- documentation and traceability updates.

Run the repository’s lint, format check, type-check, unit tests, integration tests, targeted E2E tests, migration checks, and production build. Do not suppress or delete failing tests to obtain a pass.

At the end, report evidence using the required end-of-phase format and STOP. Do not start Phase [N+1] until I explicitly approve it.
```

---

## 8. Posting-rule implementation pattern

Every posting rule must be specified before it is coded:

```text
Rule ID:
Source document and triggering event:
Preconditions:
Transaction date / posting date / tax date:
Currency and exchange-rate source:
Account resolution:
Debit lines:
Credit lines:
Tax components:
Discount and round-off:
Inventory/cost effect:
Allocation effect:
Reversal/void behavior:
Idempotency key:
Audit event:
Failure behavior:
Unit tests:
Integration tests:
Reconciliation effect:
```

The service must calculate from persisted source data inside the transaction. It must not accept journal lines or authoritative totals from the browser.

---

## 9. Minimum automated test matrix

### Ledger

- balanced/unbalanced;
- immutable post;
- reversal;
- locked period;
- concurrent duplicate post;
- cross-tenant access;
- decimal rounding;
- transaction rollback.

### Documents

- every legal status transition;
- illegal transition rejection;
- conversion lineage;
- partial conversion;
- void/cancel;
- approval required/rejected;
- sequence collision;
- attachment access.

### Receivables/payables

- partial, full, split, advance, overpayment, refund;
- credit application;
- bank charge;
- early-payment discount;
- cross-currency settlement;
- realized FX;
- ageing and statements.

### Tax

- inclusive/exclusive;
- line/document discount interaction;
- multiple tax components;
- exemption/zero rate;
- rounding;
- credit note;
- reverse charge and withholding if in scope.

### Inventory/assets

- purchase, sale, return, landed cost, negative stock, composite item;
- depreciation, disposal, gain/loss, locked period.

### Reports

- empty organization;
- opening balances;
- Appendix E scenario;
- comparative period;
- branches/projects/tags;
- subledger-to-control reconciliation;
- exports and permission filters.

### Non-functional

- organization isolation;
- role matrix;
- idempotency;
- concurrency;
- load volume;
- retry/dead letter;
- backup restoration;
- accessibility.

---

## 10. Required user journeys for E2E verification

1. Configure an organization, fiscal year, chart of accounts, taxes, and numbering.
2. Create customer and service item; quote → sales order → partial invoice → payment → statement → reports.
3. Create inventory item; bill inventory → pay vendor → sell item → receive customer payment → reconcile inventory and COGS.
4. Create bill → partial payment → vendor credit → apply credit → AP ageing.
5. Submit CHA expense → manager/accounts approval → accounting posting/payment → shared role-based status.
6. Create foreign-currency invoice → partial settlement at changed rate → realized FX → revalue remaining balance.
7. Import a bank statement → match/split/categorize → reconcile to zero.
8. Capitalize asset → run depreciation → dispose → verify gain/loss.
9. Lock period → attempt forbidden mutation → authorized reopen → audited adjustment.
10. Run Appendix E and reconcile trial balance, P&L, and balance sheet.
11. CRM approved milestone → accounting invoice request → posting → partial payment → credit note → CRM billed/collected/credited totals reconcile.
12. CRM credit-limit breach → Accounts rejects/holds request → authorized resolution appears in CRM → retry creates exactly one accounting document.
13. HRMS approved payroll run → accounting journal/liabilities → payment batch with one failed employee payment → HRMS shows per-employee outcome → retry and bank reconciliation complete without duplicate posting/payment.
14. HRMS reimbursement and employee advance → Accounts approval/disbursement/recovery → HRMS status and balance reconcile to the canonical accounting records.
15. Reverse and repost a payroll run and a CRM-originated invoice; verify linked lineage and corrected states in all modules.

---

## 11. Explicit exclusions unless approved

Codex must not assume these are included merely because a “full accounting system” was requested:

- payroll calculation remains owned by HRMS; Accounts integration, posting, liabilities, payment status, reconciliation, reversal, reimbursements, employee advances/loans, and approved full-and-final settlement are included in Phase 12A;
- statutory filing submission to government portals;
- bank-feed provider contracts;
- payment-gateway commercial onboarding;
- audit/certification by a Chartered Accountant;
- country-specific compliance outside approved jurisdictions;
- OCR accuracy guarantees;
- AI-generated accounting entries without human controls;
- destructive migration of legacy data;
- deletion of the old accounting module before acceptance.

These can be implemented as separate approved phases or integrations.

---

## 12. Recommended first action

Place all three files in the repository root:

```text
docs/accounting/sources/Accounting_Software_Build_Specification.md
docs/accounting/sources/Zoho Books Workings.md
Monolith_Accounting_Codex_Implementation_Plan.md
```

Open the Monolith repository in Codex and send:

```text
Read docs/accounting/sources/Accounting_Software_Build_Specification.md, docs/accounting/sources/Zoho Books Workings.md, Monolith_Accounting_Codex_Implementation_Plan.md, and Monolith_Accounting_Full_Implementation_Guide.md completely. Treat both source Markdown files as mandatory complementary sources under the precedence rules in the plan. Follow the operating rules in the plan and guide. Execute Phase 0 only. Do not change product code during the read-only audit, and stop after producing the Phase 0 artifacts, Zoho workflow-parity matrix, and baseline evidence.
```

Do not ask Codex to implement all phases together. Review the output of each phase, resolve its blockers, commit that phase deliberately, and only then authorize the next phase.
