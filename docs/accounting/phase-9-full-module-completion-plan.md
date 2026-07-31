# Accounting Phase 9 — Full Module Completion Plan

Status: implementation continuation plan created from `main` on 2026-07-31.

Branch: `agent/accounting-phase9-capability-readiness`

## Objective

Complete the Accounting module as a usable, policy-driven operational product without replacing or bypassing the canonical Phase 2–8 foundation already present in the repository.

This phase must preserve the following non-negotiable boundaries:

- `JournalEntry` and `JournalEntryLine` remain the sole canonical debit/credit facts.
- Only the canonical posting engine may create posted journal, GL, allocation, document, payment, or reversal effects.
- Posted facts are immutable and corrected through linked reversals, corrections, or later-period adjustments.
- Every mutation is organization- and legal-entity-scoped, permission checked, idempotent, audited, row-versioned, and maker-checker controlled.
- JavaScript `number` must not be used for monetary calculations.
- No production database connection, provider activation, real-data migration, cutover, or external payment claim is authorized by this phase.
- Business, statutory, tax, depreciation, partner, recurrence, banking, and provider decisions must be explicit configuration—not code defaults.

## Existing accepted foundation

The current repository already contains:

1. Organization Accounting profile, legal entities, registrations, currencies, periods, dimensions, account controls, approval policies, number series, inbox, outbox, and Decimal rounding foundations.
2. Canonical posting engine with exact balance, immutable journal/GL evidence, source snapshots, idempotency, reversal and replacement lineage.
3. Canonical sales invoice, purchase invoice, correction document, receipt, vendor payment, allocation, payroll-payment instruction, scheduled occurrence, and transactional outbox foundations.
4. Operational registers, detail pages, approval inbox, ledger inquiry, manual review, configuration, migration/readiness, and authorization-planning UI.
5. Controlled migration, reconciliation, rollout rehearsal, operational readiness, and production-authorization planning contracts.

Phase 9 must extend these components rather than creating alternate services, tables, posting helpers, or module-specific ledgers.

## Completion order

### Slice 9.1 — Capability policy registry

Create a single versioned capability-policy registry for currently hardcoded gates:

- recurring financial generation;
- asset depreciation;
- partner transactions and appropriations;
- production outbox publication;
- quotation conversion;
- vendor correction-note entry;
- general payment entry;
- payroll replacement correction;
- statutory tax processing;
- bank statement import and reconciliation;
- budget control;
- custom Accounting fields.

Required properties:

- organization and legal-entity scope;
- capability code and version;
- status: `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `EXPIRED`, `SUPERSEDED`, `REVOKED`;
- effective dates;
- canonical JSON configuration plus SHA-256 hash;
- maker and independent checker;
- approval/rejection timestamps and reason;
- statutory validation marker where applicable;
- optimistic `rowVersion`;
- immutable history and audit events.

Acceptance criteria:

- existing hardcoded `false` policy gates are replaced by server-resolved effective policy states;
- missing, malformed, hash-mismatched, inactive, expired, cross-tenant, self-approved, or revoked policies fail closed;
- no policy approval directly posts financial facts;
- configuration pages show exact blocker reasons rather than a generic unavailable state.

### Slice 9.2 — Complete configuration administration

Add production-quality administration pages and actions for:

- organization Accounting profile;
- legal entities and four GST registrations;
- fiscal years and periods;
- INR and USD currency configuration and approved FX evidence;
- chart-of-account controls and system roles;
- dimension definitions and values;
- approval policies and role assignments;
- number series by legal entity and registration;
- counterparty-to-legal-entity scopes;
- document/payment policies;
- capability policies;
- integration destinations in disabled state;
- audit history and configuration comparisons.

All writes require expected row version, server permission checks, maker-checker separation, reasoned state transitions, and audit history.

### Slice 9.3 — Tax and statutory engine

Implement a configurable Indian service-accounting tax layer without hardcoded applicability decisions:

- tax profiles, effective tax rules, components, SAC mappings, place-of-supply classification, intra/inter-state treatment, reverse charge, exemptions, input-credit classification, withholding/TDS/TCS evidence, and statutory rounding policy;
- GST component calculation using Decimal strings;
- sales and purchase document tax lines;
- credit/debit note tax reversals;
- tax liability/input registers;
- GSTR-supporting read models and export contracts;
- e-invoice/e-way capability contracts kept disabled until explicitly applicable and authorized.

Acceptance criteria:

- tax never posts without an approved effective policy and validated component mapping;
- source and calculated totals reconcile exactly;
- zero-tax is explicit policy, not a fallback;
- statutory reports are reproducible from posted canonical evidence.

### Slice 9.4 — Banking and reconciliation

Implement:

- Accounting bank-account reference master;
- ICICI statement import adapters for approved formats;
- immutable statement import and statement-line models;
- duplicate import and duplicate bank-reference protection;
- suggested matching to canonical receipts, payments, journals, and transfers;
- manual matching with permission and reason;
- reconciliation sessions with opening/closing proof;
- unmatched, partially matched, reversed, and stale-item queues;
- bank book and reconciliation reports.

No bank transfer execution is claimed. External execution remains a separate provider/evidence workflow.

### Slice 9.5 — Recurring transactions

Implement versioned recurring templates and schedules for supported canonical draft types.

Required behavior:

- deterministic occurrence identity;
- timezone and business-date policy;
- catch-up, skip, pause, end-date, and retry policy;
- generated result is a draft or pending-approval canonical document/payment, never silently posted;
- template changes create a new version;
- terminal occurrences stay immutable;
- scheduler claims remain lease-based and idempotent.

### Slice 9.6 — Asset accounting and depreciation

Integrate AMS operational assets with Accounting financial books:

- one Accounting financial asset per approved AMS asset/version;
- Companies Act and Income Tax books;
- effective cost, capitalization, residual value, useful life, method, rate, and account mappings;
- additions, transfers, impairments, disposals, write-offs, and corrections;
- draft depreciation run, independent approval, canonical journal posting, reversal, and rerun lineage;
- asset register, depreciation schedule, and NBV reports.

No rate, useful life, method, residual, tax treatment, or rounding rule may be inferred.

### Slice 9.7 — Partnership accounting

Implement effective-dated partner finance records:

- partner identity and deed-term versions;
- capital, current, drawings, loan, remuneration, interest, and appropriation account mappings;
- configured limits and calculation evidence;
- partner contribution, withdrawal, loan, interest, remuneration, and appropriation workflows;
- independent approval and canonical posting;
- partner ledger, capital/current statements, and appropriation reports.

All deed, tax, and calculation terms remain explicit approved configuration.

### Slice 9.8 — Budgets and management controls

Implement versioned budgets with:

- fiscal year, scenario, legal entity, branch, department, account, and dimension scope;
- draft, submitted, approved, superseded, and locked states;
- import/export with formula-injection safeguards;
- monthly/period allocation;
- actual-versus-budget reporting;
- configurable warning/block controls at document preparation and approval;
- no direct journal creation.

### Slice 9.9 — Customer and vendor finance operations

Complete finance profiles and subledger operations:

- customer credit terms, credit limits, collection status, statement preferences, and control-account mapping;
- vendor payment terms, bank-detail change approval, withholding configuration, and control-account mapping;
- ageing reports;
- customer/vendor statements;
- on-account and unapplied balance management;
- allocation and unapplication workflows with canonical reversal history;
- dunning/payment-reminder preparation without sending unless a provider is authorized.

### Slice 9.10 — Payroll, expense, CHA, CRM, and AMS integrations

Complete trusted producer contracts:

- HRMS payroll accrual, payment instruction, delta correction, and approved replacement policy;
- employee expense and advance settlement;
- CHA job costing, revenue, reimbursable/non-reimbursable expense, customer billing, vendor payable, and profitability dimensions;
- CRM quotation/deal/invoice request conversion using immutable accepted versions;
- AMS capitalization/disposal source events;
- durable inbox/outbox acknowledgement and returned status.

Source modules remain owners of operational facts; Accounting owns financial acceptance and posting.

### Slice 9.11 — Reports and period close

Complete exact, paginated reports:

- trial balance;
- general ledger and day book;
- profit and loss;
- balance sheet;
- cash/bank book;
- receivables and payables ageing;
- customer/vendor statements;
- tax registers;
- budget variance;
- asset/depreciation reports;
- partner reports;
- job profitability;
- audit, exception, and reconciliation reports.

Add a controlled period-close checklist covering reconciliations, pending approvals, unposted drafts, integration failures, tax readiness, depreciation, payroll, partner entries, and management acceptance. Closing or reopening a period must be independently approved and audited.

### Slice 9.12 — Portals, exports, and operational polish

Complete:

- customer portal invoice, receipt, allocation, statement, dispute/query, and downloadable-document views;
- vendor portal bills, payments, statements, and bank-detail change requests;
- safe CSV/XLSX/PDF exports;
- attachment versioning, scanning status, comments, and audit history;
- responsive forms and registers;
- keyboard navigation, labelled scroll regions, focus management, loading/error/empty states;
- bounded search/filter pagination and performance budgets.

## Data migration and Zoho cutover boundary

Historical migration begins from April 2025 after full staging acceptance. The Monolith Accounting cutover target remains March 2027, with the first Monolith financial year beginning April 2027. Earlier historical years remain available through imported evidence and reconciled read models according to the accepted migration plan.

Before any real migration:

1. obtain an authorized populated staging restore;
2. inventory Zoho entities, totals, attachments, dependencies, and unsupported records;
3. approve mappings and policies;
4. run dry-run import and reconciliation;
5. resolve or formally disposition every exception;
6. verify opening and historical balances by legal entity;
7. complete backup and isolated restoration certification;
8. obtain Accounting, management, security, statutory, database, and technical acceptance;
9. submit an immutable production authorization request;
10. perform cutover only through the separately authorized runbook.

## Testing requirements for every slice

Each slice must include:

- pure Decimal and contract unit tests;
- permission, maker-checker, row-version, idempotency, and cross-tenant tests;
- database constraint/trigger integration tests on guarded staging;
- posting-boundary architecture tests;
- migration chain validation from an empty staging database;
- rollback/forward-fix evidence;
- UI source verification and focused component tests;
- TypeScript, ESLint, Prisma validate/format, build, and `git diff --check`;
- bounded performance benchmarks;
- no-secret and no-production-activation scans.

The existing three unrelated CHA test failures must not be hidden, rewritten as Accounting success, or expanded by Accounting changes.

## Definition of full module completion

The module is functionally complete only when:

- all slices above are implemented and pass their acceptance criteria;
- every operational accounting action routes through canonical services;
- all hardcoded capability gates are replaced by approved effective policy decisions;
- statutory calculations and reports are accepted by Finance/CA;
- all legal entities and four GST registrations are configured;
- INR/USD and exchange-rate workflows are operational;
- bank reconciliation, recurring, depreciation, partners, budgets, subledgers, integrations, reports, close, and portals are usable;
- historical migration has passed reconciliation in authorized staging;
- security, backup/restore, observability, performance, accessibility, and operational acceptance evidence is complete;
- production remains unavailable until the separate immutable authorization and cutover process is approved.

## Immediate implementation target

Begin with Slice 9.1 and Slice 9.2. They remove the current hardcoded policy gates and provide the administrative control plane required by every later accounting capability. Do not implement depreciation, recurrence, partner calculations, production publication, or statutory tax by inserting code defaults before the applicable approved policy exists.
