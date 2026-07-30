# Accounting Phase 2 Foundation and Phase 3 Canonical Kernel

Status: Phase 2 foundation and Phase 3 canonical kernel implemented on synthetic staging, updated 2026-07-30

Scope: additive development and synthetic staging only; no production migration or external Accounting integration is authorized.

## Design boundaries

- `Organisation.id` is the tenant key. Every accounting aggregate is owned by one organization.
- CRM owns customer and commercial request identity; HRMS owns employee and approved payroll identity; CHA owns `ChaJob`; AMS owns the operational asset. Accounting stores finance-owned extensions and canonical IDs, never duplicate masters.
- Only the canonical Accounting posting service may create posted journal and GL facts. Browser actions and CRM, HRMS, CHA, AMS services submit versioned commands through the Accounting boundary.
- Posted facts are immutable. Corrections are linked reversals or later-period adjustments.
- Phase 2 adds structure and constraints but does not replace the existing Accounting service or claim that its legacy posting paths are safe.

## Implemented expand-only foundation

The migration `20260730010000_accounting_phase2_foundations` adds:

| Aggregate | Purpose | Tenant/identity controls |
|---|---|---|
| `AccountingOrganisationProfile` | Functional currency, financial-year convention, enabled inventory mode, storage/display scales and rounding mode | One row per `orgId`; no organization-specific values are backfilled |
| `AccountingLegalEntity` | Separate books per legal entity | `(orgId, code)` unique; at most one default entity per organization |
| `AccountingTaxRegistration` | Effective-dated registration shell | `(orgId, registrationCode)` and `(orgId, gstin)` unique; GSTIN/state may remain null until supplied |
| `AccountingPeriod` | Periods within the existing `FiscalYear` | Unique fiscal-year/period number and organization/date range; date/value checks |
| `AccountingPeriodLockRequest` | Reasoned, time-bound, independently decided reopening | Requester/decider foreign keys, no self-decision, optimistic `rowVersion` |
| `AccountingCurrency` | Organization-enabled currencies | ISO-style three-letter code; one functional currency per organization |
| `AccountingExchangeRate` | Dated, sourced, approval-capable rates | Positive rate, distinct pair, unique source/date/pair; approved records require approver and timestamp |
| `AccountingAccountControl` | Locked/system account and dimension rules without rewriting legacy `Account` | One control row per account; tenant guard; optional organization system role |
| `AccountingDimensionDefinition` / `AccountingDimensionValue` | Validated dimensions and canonical master references | Organization-scoped codes; canonical type/id must appear together |
| `AccountingJournalLineDimension` | Dimension assignment to a journal line | One value per definition per line; cross-tenant trigger |
| `AccountingApprovalPolicy` | Versioned, configuration-driven maker-checker policy | `(orgId, code, version)` unique; one active policy per document type |
| `AccountingNumberSeries` | Atomic document numbering by organization and optional registration | Positive next number, optimistic version, null-registration uniqueness |
| `AccountingIntegrationInbox` / `Outbox` | Durable idempotent cross-module boundary | Tenant/source/destination idempotency and retry indexes |
| `JournalEntry` additions | Period, source/version/idempotency, functional currency, posted/reversal lineage | Additive nullable fields plus tenant/source uniqueness and `rowVersion` |
| `JournalEntryLine` additions | Transaction-currency debit/credit and exchange rate | Decimal columns and non-negative/single-side checks |

The migration also installs Accounting-specific tenant-link triggers. A valid foreign ID from another organization is rejected for legal entity, period, lock request, currency, account-control, dimension, number-series and journal-period relationships.

## ERD

```mermaid
erDiagram
  Organisation ||--o| AccountingOrganisationProfile : configures
  Organisation ||--o{ AccountingLegalEntity : owns
  AccountingLegalEntity ||--o{ AccountingTaxRegistration : registers
  Organisation ||--o{ FiscalYear : owns
  FiscalYear ||--o{ AccountingPeriod : contains
  AccountingPeriod ||--o{ AccountingPeriodLockRequest : controls
  Organisation ||--o{ AccountingCurrency : enables
  AccountingCurrency ||--o{ AccountingExchangeRate : from
  AccountingCurrency ||--o{ AccountingExchangeRate : to
  Account ||--o| AccountingAccountControl : governs
  AccountingDimensionDefinition ||--o{ AccountingDimensionValue : contains
  JournalEntry ||--o{ JournalEntryLine : contains
  JournalEntryLine ||--o{ AccountingJournalLineDimension : classified_by
  AccountingDimensionValue ||--o{ AccountingJournalLineDimension : selected
  AccountingPeriod ||--o{ JournalEntry : dates
  JournalEntry ||--o{ JournalEntry : reverses
  Organisation ||--o{ AccountingIntegrationInbox : receives
  Organisation ||--o{ AccountingIntegrationOutbox : publishes
```

## Aggregate ownership and planned extensions

| Area | Canonical aggregate | Phase 2 design |
|---|---|---|
| Organization | Shared `Organisation`; Accounting profile/legal entity/registration extensions | Never clone organization or branch |
| Fiscal calendar | Existing `FiscalYear` plus `AccountingPeriod` and lock requests | Closed/hard-locked periods reject posting; reopening is independently approved and automatically expires/relocks |
| Currency | Accounting currency and rate masters | INR/USD are authorized Adarsh capabilities; providers and production rates remain unset |
| Chart of accounts | Existing `Account` plus `AccountingAccountControl` | Preserve existing IDs; system accounts cannot be renamed/deleted or directly posted when policy disallows it |
| Customer | `CrmAccount` plus future one-to-one finance profile | No `AccountingCustomer` master |
| Vendor | `CrmVendor` plus future one-to-one finance profile | No duplicate vendor; bank changes require high-control workflow |
| Employee | `User`/HRMS employee identity plus Accounting subledger reference | Payroll detail is keyed by immutable HRMS run/version and employee ID |
| Service item | `CrmProduct` plus future finance/tax mapping | Initial rollout is service-only; no stock movement for service items |
| CHA job | `ChaJob.id` as a dimension source | Legacy `JobCosting` is mapped, not accepted as a second future master |
| Asset | AMS operational ID plus Accounting financial books | Separate Companies Act and Income Tax depreciation books |
| Documents | Explicit sales invoice, purchase bill, note, receipt/payment and expense aggregates | Do not collapse into one weak polymorphic transaction table |
| Ledger | Existing journal tables evolved into the sole canonical journal | `GeneralLedgerEntry` becomes a derived projection, never an independent writer |
| Banking | Future bank account, statement/import, statement line, match and reconciliation session | Initial scope is verified statement import only |
| Allocations | Explicit payment/credit allocation and unapplication records | Sum of active allocations plus on-account amount equals document amount |
| Budget | Future versioned budget header/line/scenario | Never writes journals |
| Recurrence | Future template/schedule/run keyed to generated draft | Auto-post remains policy-controlled and maker-checker compliant |
| Custom fields | Definition/value aggregates with type/validation/effective scope | No arbitrary unsafe schema columns or unvalidated JSON used for accounting facts |

## Canonical journal contract

`JournalEntry` is the transaction header; `JournalEntryLine` is the only debit/credit fact set. A posted journal must have:

- one `orgId`, posting date and resolved `AccountingPeriod`;
- a unique `(orgId, idempotencyKey)`;
- a unique source tuple `(orgId, sourceSystem, sourceType, sourceId, sourceVersion)`;
- at least two lines;
- exactly one positive side on each non-zero line;
- equal total debit and credit in functional currency;
- frozen transaction amount, functional amount, currency and exchange rate;
- maker, checker/poster, timestamps and immutable audit lineage;
- an optional `reversalOfId`, never a self-reference and never multiple active reversals for the same correction intent.

The Phase 3 schema and service enforce exact balance, immutable-posted triggers, legal-entity account ownership, approved FX evidence, source/request uniqueness and transactional inbox/journal/GL/audit/outbox creation.

## Planned logical schema catalogue

These aggregates are part of the approved Phase 2 design but are intentionally not all created in the first foundation migration. Each will be introduced additively in its implementation phase:

| Logical model | Key relationships and constraints |
|---|---|
| `AccountingCustomerProfile` | Unique `(orgId, crmAccountId)`; credit/collection policy version, control account and currency; FK to canonical `CrmAccount` |
| `AccountingVendorProfile` | Unique `(orgId, crmVendorId)`; AP/payment/tax policy version; FK to canonical `CrmVendor` |
| `AccountingServiceFinanceProfile` | Unique `(orgId, crmProductId, version)`; income/expense/tax/SAC/unit mappings and effective dates |
| `AccountingTaxProfile` / `AccountingTaxRule` / `AccountingTaxComponent` | Registration/effective-date scoped; component Decimal percentage; no rate or applicability hard-coded |
| `AccountingPriceList` / `AccountingPriceListLine` | Organization/currency/effective dates; Decimal price; canonical service/item ID |
| `AccountingDocumentNumber` | Immutable allocation record linked to `AccountingNumberSeries`; unique rendered number per scoped series |
| `AccountingSalesInvoice` / `AccountingSalesInvoiceLine` / `AccountingSalesInvoiceTax` | Explicit AR document, canonical customer/request version, snapshots, Decimal totals, approval/posting lineage |
| `AccountingPurchaseBill` / line / tax | Explicit AP document, canonical vendor/source reference, supplier-number duplicate checks |
| `AccountingCustomerNote` / `AccountingVendorNote` | Explicit note effect and mandatory original linkage or approved standalone policy |
| `AccountingReceipt` / `AccountingPayment` | Explicit cash/bank documents with party/on-account treatment and posting lineage |
| `AccountingAllocation` / `AccountingAllocationReversal` | Typed FK per supported document pair; positive Decimal amount; active allocation uniqueness and reversible lineage |
| `AccountingApprovalRequest` / `AccountingApprovalDecision` | Frozen target type/ID/version/payload hash; ordered policy steps; immutable decisions and no self-approval |
| `AccountingAttachment` / `AccountingComment` / `AccountingDocumentHistory` | Immutable version/hash/storage key, tenant authorization and append-only history |
| `AccountingBankAccount` | Accounting-owned bank-reference master; tenant/legal entity/registration/currency and protected detail version |
| `AccountingBankStatementImport` / `AccountingBankStatementLine` | File hash/format/version, unique bank reference, Decimal amount/balance and import exceptions |
| `AccountingBankMatch` / `AccountingReconciliationSession` | Typed match to Accounting document/journal, match confidence/reason and closing-balance proof |
| `AccountingRecurringTemplate` / `AccountingRecurringSchedule` / `AccountingRecurringRun` | Versioned source template, due schedule, idempotent generated-draft result |
| `AccountingBudget` / `AccountingBudgetLine` | Scenario/version/fiscal period/account/dimensions with Decimal amount; no journal writer |
| `AccountingFinancialAsset` / `AccountingAssetBook` / depreciation/disposal run | Unique AMS asset/book, effective policy, Decimal cost/depreciation/NBV and journal lineage |
| `AccountingPartner` / `AccountingPartnerTerm` / `AccountingAppropriation` | Effective-dated canonical party, capital/current/drawings mappings and CA-approved Decimal terms |
| `AccountingPayrollSubledger` | Immutable HRMS run/version/employee/component reference tied to journal and payment outcomes |
| `AccountingClaimSettlement` | HRMS/CHA claim version, payable/advance/recovery/payment disposition and returned source status |
| `AccountingCustomFieldDefinition` / `AccountingCustomFieldValue` | Valid data type, target scope, validation schema and effective dates; typed values, not arbitrary columns |
| `AccountingPostingAttempt` | Command/payload hash, policy/rule version, result journal, failure code and idempotency lineage |

Typed document aggregates are preferred over a single polymorphic transaction table. Polymorphism is limited to integration envelopes, audit references and validated custom-field targets where it does not replace financial foreign-key constraints.

## Precision and rounding

Storage types selected for the foundation are:

| Value | Storage | Organization scale |
|---|---|---|
| Canonical functional/transaction money | `Decimal(28,8)` for journal, journal-line, GL projection and payroll snapshot totals; legacy document facts remain unchanged | configured currency precision, permitted 0–8 |
| Quantity | Planned `Decimal(20,6)` | `quantityScale`, permitted 0–10 |
| Canonical exchange rate | `Decimal(30,12)` on approved rate evidence and journal lines | `exchangeRateScale`, permitted 4–12 |
| Percentage | Planned `Decimal(12,6)` | `percentageScale`, permitted 2–8 |

The columns provide storage capacity, not an invented statutory rounding policy. `HALF_UP` is the approved default. Component/document rules and final scales remain subject to DEC-0022 technical/CA validation. JavaScript `number` must not be used by new accounting calculations.

## State models

- Period: `OPEN → SOFT_LOCKED → HARD_LOCKED → CLOSED`. Reopening creates a separate request; it does not rewrite prior lock history.
- Exchange rate: `DRAFT → APPROVED|REJECTED`. Only approved rates may be used by posting.
- Integration message: `PENDING → PROCESSING → PROCESSED`; bounded retries lead to `FAILED` or `DEAD_LETTER`.
- Financial document: `DRAFT → PENDING_APPROVAL → APPROVED → POSTED`; rejection returns a new editable version, cancellation of posted facts creates reversal lineage.
- Journal: legacy statuses remain temporarily; Phase 3 introduces controlled transitions without rewriting existing posted records.

## Deletion and retention

- New foundation parents use `ON DELETE RESTRICT`.
- Draft-owned child collections may cascade only where the parent itself is safely deletable.
- Posted journal, source lineage, audit and integration idempotency records are never physically deleted.
- Legacy cascade relationships are documented migration debt; they are not silently changed on populated tables in Phase 2.

## Open configuration, not defaults

No production GSTIN, state, address, tax rate, threshold, bank format, partner value, approver assignment, FX provider or statutory applicability was inserted. Organization profile rows require explicit fiscal/inventory/precision input. Synthetic fixtures are clearly `STAGING`-named and are not policy templates.

## Remaining legacy and later-phase limitations

- Existing Accounting services still use legacy statuses and some JavaScript `number`/Prisma `Float` fields.
- Legacy sales/purchase/payment/note/recurring document writers are fail-closed at the old GL helper and require document-specific canonical adapters in their later authorized phases.
- Bank transfer, manual journal, CRM invoice-request preparation and approved immutable HRMS payroll accrual use the Phase 3 boundary. Legacy Accounting payroll compilation and direct payroll-payment effects remain blocked pending the HRMS producer/payment contract.
- Customer/vendor finance profiles, tax rule components, bank reconciliation, assets, budgets, recurring schedules and explicit document approval instances are designed but await their authorized implementation phases.
- Production migration and real-data reconciliation remain separately gated by DEC-0014 and the real-data portion of DEC-0016.

## Phase 3 canonical posting implementation

`AccountingSourceSnapshot` is the immutable source/version/payload-hash fact. `AccountingIntegrationInbox` stores the versioned request envelope and processing outcome; `AccountingPostingAttempt` records each safe attempt; `AccountingIntegrationOutbox` is written in the posting transaction. `AccountingPayrollRunSnapshot` freezes an HRMS-approved run without transferring payroll calculation ownership to Accounting.

Every canonical `JournalEntry` records legal entity, period, source snapshot, request/idempotency identity, rule, currencies, approved exchange-rate evidence, approval-policy version, number series, rounding-policy version, document references, correlation/causation, and reversal/replacement lineage. Transaction and base amounts are Decimal. Posted headers, lines, GL projections and source snapshots are database-protected from update/delete.

The engine accepts only registered journal/rule/source triples and positive source versions. A source version that already produced a journal cannot be reused with a changed canonical request. Tenant guards independently validate every linked legal entity, source snapshot, approver, exchange rate, policy and number series; journal children must use accounts owned by the journal organization and legal entity.

The canonical runtime state model is `RECEIVED/PENDING → PROCESSING → PROCESSED`, with `REJECTED`, `RETRYABLE`, and `MANUAL_REVIEW` outcomes. Legacy document reads and draft creation remain compatible, but the old GL helper and reversal helper fail closed. Depreciation, recurring auto-journal, and partner posting stay gated until their versioned policy evidence and adapters exist.

DEC-0022 is only partially implemented: the exact internal Decimal boundary, configured currency scale up to eight places, twelve-place FX evidence, explicit quantization, base conversion, deterministic allocation/remainder handling and a versioned rounding-policy reference are implemented. Synthetic non-statutory tests use an explicitly marked policy. Statutory component/document rounding, tax edge cases, depreciation policies and production round-off treatment remain gated pending Finance/legal/CA validation.

## Phase 4 canonical documents and payments

`AccountingDocumentPolicy` is an effective-dated, legal-entity-scoped, hash-verified configuration snapshot. `AccountingDocument` and `AccountingDocumentLine` freeze the source identity/version, party, dates, currency/FX evidence, configuration versions, Decimal line/totals, approval lineage, request identity, payload hash, original-correction relationship, and eventual journal link. The lifecycle is `PENDING_APPROVAL → POSTED`, with explicit rejected/cancelled outcomes; preparation never implies posting.

`AccountingCounterpartyEntityScope` is the approved effective-dated bridge from an organization customer/vendor master to a legal entity. Sales, purchase, receipt and vendor-payment preparation fails closed without an active mapping; a database trigger independently proves both the legal-entity and party organization.

`AccountingPayment` freezes payment identity, payer/payee, bank/cash and control accounts, dates, currency/FX, method/reference, declared allocated/unapplied totals, approval evidence, immutable payload, reversal and journal lineage. `AccountingPaymentAllocation` points to either a posted canonical document/version or an approved payroll source snapshot/version. Partial unique indexes, target-row locks and capacity triggers protect concurrent allocations. The canonical engine rechecks that active allocation totals plus unapplied amount equal the payment exactly before posting.

`AccountingScheduledOccurrence` separates template/version/date identity from claim, generated record, approval and journal evidence. `PENDING`, `CLAIMED`, `GENERATED`, `SKIPPED`, and `FAILED` are explicit. Claims use row locks with `SKIP LOCKED`; stale leases are recoverable, while generated/skipped occurrences are immutable.

The Phase 4 document, payment and occurrence tables are expand-only and retain legacy draft/read models. See `phase-4-transition-matrix.md` for the precise compatibility and policy-gated status of each source path.
