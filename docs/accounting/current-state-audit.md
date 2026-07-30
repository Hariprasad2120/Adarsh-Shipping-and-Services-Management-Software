# Phase 0 Current-State Audit

Date: 2026-07-29
Classification: discovery only. No product code, schema, migration, or database data was changed.

## Executive assessment

The repository has a substantial Accounting UI and service layer, but it is not a safe production accounting engine. It is reusable as a migration base only after Phase 1 policies and Phase 2 architecture resolve canonical documents, immutable posting, Decimal arithmetic, source ownership, tenant/RBAC gaps, concurrency, migration safety, and reconciliation. Production readiness must not be claimed.

## Repository map

- Accounting routes: `src/app/(dashboard)/accounting/**` (32 route entries in the production build; 52 TSX files discovered).
- Shared Accounting UI: `src/components/monolith/accounting-*.tsx`.
- Domain code: `src/modules/accounting/service.ts`, `actions.ts`, `reports.ts`, `validators.ts`, `types.ts`.
- Accounting tests: `src/modules/accounting/__tests__/accounting.test.ts`; workspace UI test in `src/components/monolith/accounting-workspace.test.tsx`.
- Data model: `prisma/schema.prisma:2733-3450` plus shared CRM/HRMS/CHA/AMS models.
- Creation migration: most Accounting tables were introduced inside misleadingly named `prisma/migrations/20260620103057_init_cha_module/migration.sql`; no safe incremental accounting evolution was found.
- Seed/RBAC/navigation: `prisma/seed.ts:117-134`, `:213-350`; `src/lib/navigation.ts:702-811`.
- Legacy import: `scripts/migrate-accounting-data.ts` (must not be run; see migration risks).

## Capability classification

| Capability | State | Repository evidence | Phase 0 assessment / source |
|---|---|---|---|
| Accounting workspace/navigation/themes | Reusable | accounting route/layout and `accounting-workspace.tsx` | Shared production components are usable; immutable PDF/communication requirements remain separate (BASE-FND-037/038/039). |
| Chart of accounts | Partial/unsafe | `Account`; create/update/seed services | Tenant key and hierarchy exist. Posted account type/opening balance can be edited; system-lock/currency/effective rules absent; cascade deletes threaten history (BASE-FND-009/011/012). |
| Fiscal year / locks | Partial/unsafe | `FiscalYear`, `TransactionLock`; lock actions/service | Single closed flag/lock date only; no periods or close workflow. Reusable password field, client-supplied `lockedBy`, and missing action permission (BASE-ACC-032; ZOHO-LOCK-001). |
| Journal entry | Partial/unsafe | `JournalEntry`, lines, GL; create/submit/cancel | Draft/submit exists and tenant lookup is partial. Balance uses JS Number/tolerance; no DB invariant, source/version/idempotency, concurrency, approval, or immutable reversal lineage (BASE-FND-008, BASE-ACC-003/011, BASE-DB-012/013). |
| General ledger | Conflicting | `JournalEntryLine` and separate `GeneralLedgerEntry` facts | Two financial representations can diverge; GL rows are mutable/cancellable and cascade-deletable (BASE-FND-008, BASE-DB-011/012/013). |
| Numbering | Mocked/hard-coded | count + 1001; `CHN-*`; hard-coded `2026-27` | Race-prone, reusable after deletion, inconsistent across CRM/Accounts, not branch/FY-configured (BASE-FND-019; ZOHO-ACC-001). |
| Sales invoices / AR | Duplicated/unsafe | `SalesInvoice` plus `CrmInvoice(type=INVOICE)` | Two active Accounting route families; float/Number tax math; incomplete snapshots/status approvals; source-to-journal lineage absent (BASE-SALES-014/017; ZOHO-CUST-003). |
| Purchase invoices / AP | Partial/unsafe | `PurchaseInvoice` and items | Draft/post/cancel exists but shares precision, immutability, numbering, GST, approval, and lineage defects (BASE-PUR-008/011; ZOHO-VEND-002). |
| Payments / allocations | Critical unsafe | `PaymentEntry`, `PaymentAllocation`; submit service | Allocation target is not org/party constrained; both/neither invoice can be referenced; over-allocation and allocation-total invariants absent; updates use Number and non-tenant `findUnique` (BASE-SALES-044/047, BASE-PUR-026/028). |
| Customer/vendor notes | Partial/unsafe | quotation/note services/models | Number/tax calculations use float; permissions missing; note semantics and original-document/GST linkage require decision (BASE-SALES-037/040, BASE-PUR-020; ZOHO-CUST-004/005, ZOHO-VEND-003). |
| Recurring invoices/bills/journals | Partial/unsafe | recurring models/processors | No durable execution key, leasing, atomic next-date update, retry/dead-letter or replay control; crashes can duplicate (BASE-SALES-023/026, BASE-PUR-016, BASE-ACC-010). |
| Banking/cash/reconciliation | Mostly missing | bank-transfer action and ledger report | Transfer posts a count-numbered journal. No statement import, matching, split, reconciliation session, closing balance, or audit workflow (BASE-ACC-012/014; ZOHO-BANK-001/002). |
| Tax/GST | Partial/hard-coded | `TaxLine`, Float tax rates, GST summary reports | Default 18% and fixed dropdown rates; no authoritative rules engine, place of supply, tax snapshots/groups, statutory validation, or full return reconciliation (BASE-PUR-045/049/050/053; ZOHO-REPORT-012/013/014). |
| Currency | Unsafe/incomplete | currency strings and Float exchange rates | Decimal is converted to Number and exchange rates are Float; realized/unrealized FX and base-currency balance invariants absent (BASE-FND-027/028/029, BASE-ACC-026). |
| Inventory/COGS | Missing | item pages; no complete stock ledger/cost layers in Accounting | No auditable valuation, landed cost, stock movements, negative-stock policy, returns, or GL reconciliation (BASE-PUR-008, BASE-REP-006). |
| Fixed assets | Partial/conflicting | shared `Asset`, depreciation service, AMS routes | Float rate/Number calculations; no capitalization source, useful-life versioning, disposal/impairment, tax-book split; ownership overlaps AMS (BASE-ACC-021/023; ZOHO-ASSET-001). |
| Payroll | Conflicting/unsafe | `PayrollBatch`; `compilePayrollBatch` | Accounting calculates from current HRMS data and fallback tax/PF assumptions; no immutable approved HRMS run/version or component/employee reconciliation (BASE-INT-001). |
| CHA job costing | Duplicated/partial | `ChaJob`, `JobCosting`, CHA expenses | Operational source and accounting view are not linked by a durable contract; expense payment can complete without accounting posting (BASE-INT-001; ZOHO-JOB-001). |
| Partner accounts | Partial/premature | `PartnerAccount` | Ratios/rates are Float; policy, effective dates, appropriations, interest/salary/drawings posting and approvals unconfirmed (ZOHO-PARTNER-001). |
| Reports | Partial/unsafe | `reports.ts` and 10 report actions | Several named reports exist, but use Number/tolerances and may read divergent GL/subledgers. Many actions lack report permission; 24-report parity is incomplete (BASE-REP-002/007/009/011; ZOHO-REPORT-*). |
| Audit | Partial/non-atomic | `AccountingAuditLog`, service audit calls | Audit frequently occurs after financial transaction commit and can fail independently; actor relation cascades; before/after data and tamper evidence incomplete (BASE-TEST-004). |
| RBAC/tenant isolation | Critical gaps | Accounting actions and direct page service calls | Core mutations often check permissions, later actions/reports often only authenticate. Payment allocation target lookups can cross tenant. UI navigation is not authorization (BASE-FND-024/026). |
| APIs/integrations | Missing | no Accounting API routes in production build | Server actions exist; no versioned command/event contracts, outbox/inbox, idempotent consumers, retries, dead letters, replay or mismatch repair (BASE-API-001, BASE-INT-001). |
| PDF/email/files | Partial platform reuse | Communication queues, portal document versions, storage APIs | Reusable delivery/storage exists, but Accounting lacks immutable rendered financial-document versions, access/retention and delivery lineage (BASE-FND-038/039). |

## Unsafe financial behavior (prioritized)

1. **P0 – money precision:** `validateBalancedEntry`, invoice/payment/note/payroll/depreciation/report logic uses `Number`, `parseFloat`, `Math`, Float quantity/tax/exchange-rate columns, and tolerances. This violates exact Decimal requirements.
2. **P0 – posted fact mutability:** cancellation marks GL entries cancelled and writes loosely linked reversal rows; cascade FKs can remove financial history; no database-enforced balance/immutability.
3. **P0 – tenant/authorization:** allocation invoice lookup is not tenant/party scoped; lock, quotation, note, job, and many report actions omit permission enforcement.
4. **P0 – duplicate ledgers/documents:** journal lines versus GL, Accounting invoice versus CRM invoice, job costing versus CHA job, and Accounting payroll calculation versus HRMS ownership can diverge.
5. **P0 – concurrency/idempotency:** count numbering, posting, allocation, recurring work, CRM conversion and migration lack durable uniqueness/locking/replay controls.
6. **P0 – migration/data unknown:** configured database is inaccessible for read-only counts/history, and the existing importer is unsafe.

## CRM ↔ Accounts

Current direction is neither canonical nor reconcilable:

- CRM-originated commercial pages inside `/accounting` call CRM services/actions and use `crm.invoice.manage`.
- Separate `/accounting/sales-invoices` uses Accounting models.
- Deal-to-invoice code hard-codes due date/tax and directly creates an accounting document instead of an idempotent approved request.
- CRM feedback for allocations, credits, reversals, ageing, holds, billed/recognized/collected measures and commissions is incomplete.
- There is no durable immutable source version, acknowledgment, outbox/inbox, replay, or automated mismatch detector.

Preserve all `CrmAccount`, `CrmVendor`, `CrmInvoice`, `SalesInvoice`, `PurchaseInvoice`, payment and ledger identifiers until an approved mapping proves lineage and prevents duplicate posting (`DEC-0004`, `DEC-0005`).

## HRMS ↔ Accounts

- HRMS identity/employment/salary inputs exist.
- HRMS payroll page imports Accounting actions/services.
- Accounting compiles payroll from live HRMS records and may use fallback Chennai/new-tax/PF/rounding assumptions.
- `PayrollBatch` lacks immutable run version, component/employee lines, approval snapshot, payment-batch outcomes, and reversal/repost lineage.
- Reimbursements and advances do not flow through a canonical Accounts payable/payment contract; Accounts does not return reconciled status.

HRMS must own calculation and immutable approved runs; Accounts must own journals, liabilities, disbursement and financial reconciliation after `DEC-0006`.

## CHA / AMS / Communication

- CHA has mature job/expense/checklist/email workflows but no canonical Accounts posting/reconciliation contract. Existing CHA production-readiness documentation already records broken migration history and concurrency/auth gaps.
- AMS and Accounting share `Asset`; capitalization and financial register ownership are unresolved (`DEC-0007`).
- Communication email queues, notifications, Google integrations, portal document versions and storage are reusable platform capabilities. Accounting-specific immutable render/version/delivery evidence remains missing.

## Data requiring preservation

At minimum: organizations/branches/users/roles; customer/vendor/employee stable IDs; CRM quotes/orders/invoices; Accounting invoices/bills/payments/allocations; journal and GL rows; customer/vendor subledgers; fiscal years/settings/locks; payroll batches; assets/depreciation; CHA jobs/expenses; audit logs; document versions/attachments; external references and imported document numbers. Live volumes and integrity are unknown, not zero.

## Migration strategy recommendation (not authorization)

1. Restore an anonymized production copy into an isolated rehearsal database and verify backup/restore first.
2. Inventory/count/hash/reconcile every legacy source and duplicate document/ledger path.
3. Approve source ownership and immutable posting architecture.
4. Add new constraints/tables additively; never repurpose posted rows in place.
5. Backfill canonical source IDs, versions, idempotency keys, journal lineage and Decimal representations with resumable checkpoints.
6. Recompute and reconcile GL, AR/AP, tax, bank, inventory/assets/payroll/jobs; quarantine unexplained differences.
7. Dual-read/compare, then controlled dual-write only through one canonical posting service; prevent old/new duplicate posting.
8. Cut over per organization behind a feature flag after accountant UAT, parallel run, backup/restore and rollback rehearsal.
9. Retire legacy paths only after preservation evidence and signed reconciliation.

The existing `scripts/migrate-accounting-data.ts` is not a migration foundation: it hard-codes tenant/user/path, guesses accounts, uses floats, writes posted facts non-atomically, changes invoice balances directly, and lacks dry-run/backup/checkpoints/idempotency/reconciliation.

## Reusable components

- Monolith Accounting workspace/layout/table/form/status primitives.
- Existing auth/session/RBAC infrastructure, once applied uniformly server-side.
- Prisma transaction patterns where extended with invariants/concurrency.
- CRM customer/vendor and shared organization/employee masters.
- CHA job/expense approval data as source facts.
- Communication email queue, notifications, storage and customer-portal version patterns.
- Existing Accounting screens and report shapes as UX/workflow evidence, not correctness proof.

## Blockers before implementation

- Resolve `DEC-0001` through `DEC-0016` as applicable.
- Provide a disposable database copy and verified backup/migration history.
- Approve canonical posting model and document/integration ownership.
- Define Decimal, currency, tax, numbering, lock, reversal, approval and retention policies.
- Define staged legacy preservation/reconciliation acceptance with Finance.
