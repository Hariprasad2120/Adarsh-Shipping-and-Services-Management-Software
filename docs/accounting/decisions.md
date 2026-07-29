# Accounting Decisions and Unresolved Questions

Last updated: 2026-07-29
Decision source: Adarsh Shipping & Services management response supplied for Phase 1 on 2026-07-29.

This register distinguishes platform capability from organization configuration. An approved Adarsh setting is not a permanent restriction on other organizations. Statutory interpretations remain subject to qualified CA/Finance approval.

## Status definitions

- `APPROVED`: policy and scope are sufficiently decided.
- `APPROVED — CONFIGURATION PENDING`: architecture/feature scope is approved, but named organization data or operating parameters are still required.
- `DEFERRED`: explicitly outside the initial implementation slice but the platform must remain capable of supporting it.
- `BLOCKED`: required owner evidence is missing and the item blocks Phase 2 design or completion.
- `OPEN`: no business answer has yet been supplied.
- `SOURCE DEFECT`: source text is inconsistent and cannot be used as an oracle.

## Decision register

| ID | Status | Decision / remaining information | Owner and date | Phase 2 impact |
|---|---|---|---|---|
| DEC-0001 | SOURCE DEFECT | Appendix E calculations remain unapproved. Finance must select the independently recomputed values, the published values, or a replacement worked example. | Finance, pending | Does not block Phase 2 architecture; blocks acceptance-test oracle. |
| DEC-0002 | OPEN | Zoho report #15 and #24 are both named Ledger Statement. Confirm whether #24 is a duplicate or a different report. | Finance, pending | Does not block Phase 2 architecture. |
| DEC-0003 | APPROVED — CONFIGURATION PENDING | Monolith is a configurable multi-organization, multi-industry platform. Zoho provides workflow familiarity and migration compatibility, not hard-coded company policy. Invoice terms, address fallback, shipping address, credit-limit policy, bank-detail policy, quotation numbering and conversion approval remain pending. | Adarsh management, 2026-07-29 | Pending defaults do not block the generic model; they block organization rollout configuration. |
| DEC-0004 | APPROVED | CRM owns quotations, sales orders, purchase orders and approved immutable invoice requests. Accounting exclusively owns accounting drafts, statutory invoices and posted invoices. All records use canonical shared IDs. | Adarsh management, 2026-07-29 | Commercial ownership is sufficient for Phase 2 architecture. |
| DEC-0005 | APPROVED | CRM may issue only an approved immutable invoice request; it cannot create an Accounting draft, statutory invoice, posted invoice or journal. Accounting owns financial validation, numbering, tax and posting. | Adarsh management, 2026-07-29 | CRM–Accounts command boundary is approved for Phase 2. |
| DEC-0006 | APPROVED | HRMS owns payroll calculation and sends an approved immutable versioned run. Accounting may post summarized GL journals while retaining employee/component subledger detail and complete run/reversal/payment lineage. | Adarsh management, 2026-07-29 | Payroll ownership and minimum contract detail are sufficient for Phase 2. |
| DEC-0007 | APPROVED — CONFIGURATION PENDING | AMS owns operational assets; Accounting owns the linked financial register. Separate, reconcilable Companies Act and Income Tax books are required. Asset classes, lives, rates and capitalization thresholds remain pending CA/Finance approval. | Adarsh management, 2026-07-29 | Shared ownership is approved; organization depreciation configuration may follow later. |
| DEC-0008 | APPROVED — CONFIGURATION PENDING | `ChaJob` is the canonical operational job. Accounting links financial facts to it and must not create another job master. Allocation drivers, recoverable treatment, revenue policy and margin definitions remain pending. | Adarsh management; Finance details pending, 2026-07-29 | Architecture may proceed; detailed job posting/profitability rules remain later blockers. |
| DEC-0009 | APPROVED — CONFIGURATION PENDING | Hard locks are default. Normal corrections use reversal/adjustment in the next open period. Exceptional reopening is requested by Accounts Manager, independently approved by Partner/Finance Administrator, reason-required, time-bound, fully audited and automatically re-locked. Posted entries are never edited/deleted. Alternate approver assignments remain configurable. | Adarsh management, 2026-07-29 | Period/correction architecture is approved for Phase 2. |
| DEC-0010 | APPROVED — CONFIGURATION PENDING | GST invoicing/registrations are required. TDS, TCS, e-invoice and e-way bill must be configurable and disabled for the initial entity until CA-confirmed applicability. Detailed GST/place-of-supply/reverse-charge/HSN-SAC and statutory rules remain pending. | Adarsh management; CA pending, 2026-07-29 | Generic effective-dated statutory architecture may proceed; production rules cannot. |
| DEC-0011 | APPROVED — CONFIGURATION PENDING | Initial functional currency is INR; USD is required. Revalue eligible open monetary balances at every period close, post unrealized FX separately, reverse on the next period's first day and recognize realized FX on settlement. Preserve posted historical rates. Provider/fallback hierarchy remains pending. | Adarsh management, 2026-07-29 | Currency and revaluation architecture is approved; provider selection is deferred. |
| DEC-0012 | APPROVED — CONFIGURATION PENDING | Each GST registration has independent invoice, credit-note and debit-note sequences. Broader voucher sequence scope, formats, annual reset, gap/cancellation rules and imported-number treatment remain pending. | Adarsh management; Finance/Product pending, 2026-07-29 | Generic sequence model may proceed; full numbering policy remains open. |
| DEC-0013 | APPROVED — CONFIGURATION PENDING | Provisional minimum: accounting records/source documents/attachments for eight financial years; audit/posting lineage permanently; portal documents follow the related accounting document. Legal hold suspends deletion; archives are encrypted/searchable/tenant-scoped; posted journals and audit lineage are never physically deleted. CA/legal confirmation remains pending. | Adarsh management; CA/Legal pending, 2026-07-29 | Retention/FK/archive architecture is approved; legal periods remain configuration. |
| DEC-0014 | APPROVED — CONFIGURATION PENDING | Perform transaction-level Zoho Books migration wherever evidence permits; preserve source IDs, numbers, dates, rates, statuses, attachments and lineage; retain a controlled read-only archive; quarantine all unmapped records; prove counts and financial reconciliations. Historical start date and export/API coverage remain pending. | Adarsh management; Finance/Ops details pending, 2026-07-29 | Scope is approved; dates, source coverage and a rehearsal database block Phase 2 migration-plan completion. |
| DEC-0015 | APPROVED — CONFIGURATION PENDING | Accounts Manager approves invoices, expenses, payments and manual journals but cannot approve anything personally created or materially modified. Mandatory independent approval applies to journals, bank-detail changes, write-offs, period reopening and high-risk payments. Thresholds and alternate approvers remain pending. | Adarsh management; Finance/Security details pending, 2026-07-29 | Configurable approval model may proceed; rollout parameters remain pending. |
| DEC-0016 | BLOCKED | Provide a corrected disposable/anonymized validation database, backup/restore evidence and migration history. Never place credentials in this file. | Operations, pending | Blocks Phase 2 data profiling and migration rehearsal. |
| DEC-0017 | APPROVED — CONFIGURATION PENDING | Initial legal entity is one partnership with four GST registrations. Each legal entity has completely separate books; consolidated reporting is separate. Exact GSTINs, registered names, states, addresses and branch mappings are pending. | Adarsh management, 2026-07-29 | Generic organization model may proceed; exact registration migration/configuration remains pending. |
| DEC-0018 | APPROVED — CONFIGURATION PENDING | Cut over only at the beginning of a financial year; no mid-year cutover. Initial recommendation is configurable April–March. Exact first financial year/cutover date remains pending, and cutover requires complete reconciliation. | Adarsh management, 2026-07-29 | Period model may proceed; migration plan cannot be finalized without the date. |
| DEC-0019 | APPROVED — CONFIGURATION PENDING | Accrual accounting is the default. Support point-in-time, service-completion, milestone, time-period, deferred/unearned and accrued/unbilled recognition. CRM non-financial documents never recognize revenue. Service-category policies need Finance/CA approval. | Adarsh management; Finance/CA details pending, 2026-07-29 | Generic recognition model may proceed; service-category posting rules remain pending. |
| DEC-0020 | APPROVED | Customer—CRM; Vendor—Procurement/Accounting; Employee—HRMS; Branch—Organization Administration; Department—HRMS/Organization Administration; Project—project-owning module; Cost Centre—Accounting; Item/Service—shared with Accounting-owned finance/tax mappings; Salesperson—CRM linked to Employee; bank-reference masters—Accounting. All modules use canonical IDs and never duplicate masters. | Adarsh management, 2026-07-29 | Shared-master ownership is approved for Phase 2. |
| DEC-0021 | APPROVED | Initial Adarsh rollout uses service items only; inventory is modular and disabled. Service items require income/expense accounts, tax codes, units, SAC and pricing. Platform architecture must support future service-only, inventory-only and mixed organizations. | Adarsh management, 2026-07-29 | Phase 2 must keep inventory modular; no initial Adarsh stock opening or valuation migration. |
| DEC-0022 | APPROVED — CONFIGURATION PENDING | Tax-inclusive/exclusive pricing is configurable by organization/document defaults. Use Decimal/Numeric only and higher internal precision; calculate base, discount, taxable value and tax components before totals; default rounding is half-up; statutory components/document totals follow Indian rules; round-off posts to a configured ledger. Exact scales and edge cases require technical/CA validation. | Adarsh management; CA/technical validation pending, 2026-07-29 | Money/calculation architecture is approved; exact scales remain a Phase 2 validation item. |
| DEC-0023 | APPROVED — CONFIGURATION PENDING | Configurable GST capability and registration-specific tax configuration are required. Detailed CGST/SGST/IGST/UTGST/cess/reverse-charge/place-of-supply/HSN-SAC rules require CA validation. | Adarsh management; CA pending, 2026-07-29 | Effective-dated model may proceed; production tax matrix remains blocked. |
| DEC-0024 | APPROVED / DEFERRED SPLIT | GSTR-1, GSTR-3B and GSTR-2B with ITC matching are required. Initial release produces validated reconciled exports and working papers only. Direct filing is deferred until provider, credentials, authorization, sandbox validation and CA approval exist. | Adarsh management, 2026-07-29 | Reporting/reconciliation scope is approved; direct filing integration is later scope. |
| DEC-0025 | APPROVED — CONFIGURATION PENDING | E-invoice and e-way-bill are configurable capabilities, disabled for the initial organization pending CA applicability, credentials, provider and mappings. No production transmission before approval. | Adarsh management; CA/provider pending, 2026-07-29 | Provider integration may be deferred; effective-dated applicability model is required. |
| DEC-0026 | APPROVED — CONFIGURATION PENDING | TDS/TCS are configurable capabilities, disabled for the initial organization pending CA applicability and approved section/threshold/rate rules. | Adarsh management; CA pending, 2026-07-29 | Generic model may proceed; production rules remain blocked. |
| DEC-0027 | APPROVED — CONFIGURATION PENDING | Same maker-checker policy as DEC-0015; approvals are configurable by entity, branch, document, amount, currency, risk and role; self-approval remains prohibited even with both permissions. | Adarsh management, 2026-07-29 | Phase 2 approval model may proceed. |
| DEC-0028 | APPROVED / DEFERRED SPLIT | Initial bank is ICICI Bank using Net Banking. Initial scope is secure statement import, matching and reconciliation for verified formats. Bank APIs, automated feeds, gateways and payment initiation are deferred and provider-independent. | Adarsh management, 2026-07-29 | Phase 2 models statement import/reconciliation; direct initiation is not initial scope. |
| DEC-0029 | OPEN | Customer/vendor credit limits, holds, ageing buckets, overrides, disputes, bad debt, write-off thresholds and GST treatment remain unanswered. | Finance/CRM/CHA/CA, pending | Does not block ledger kernel but blocks Phase 2 AR/AP workflow completeness. |
| DEC-0030 | APPROVED — CONFIGURATION PENDING | Customer debit note increases AR; customer credit note reduces AR; vendor debit note reduces AP. Original linkage is mandatory for a specific invoice/bill; standalone notes require authorized reason/statutory treatment. Credits may be applied, unapplied or independently refunded. Applications/unapplications/refunds are atomic, auditable and reversible; posted notes are immutable. | Adarsh management; standalone statutory mappings pending CA, 2026-07-29 | Note/allocation architecture is approved for Phase 2. |
| DEC-0031 | OPEN | Confirm whether CRM commissions are forecast-only or approved HRMS payroll inputs, including eligibility, cut-off, approval and clawback. | Sales/Finance/HR, pending | Does not block the ledger kernel; blocks CRM–HRMS integration contract. |
| DEC-0032 | APPROVED | HRMS/CHA owns claim approval. Accounting owns reimbursements, advances, loans, recoveries, payments and full-and-final financial settlement and returns reconciled status to the source workflow. | Adarsh management, 2026-07-29 | Shared claim/payable ownership is approved for Phase 2. |
| DEC-0033 | APPROVED | Include customer and vendor portals in the initial Accounting release with party/tenant-scoped server authorization, immutable documents, query/dispute/remittance workflows and high-control bank/KYC changes. Portal users never post journals or edit posted facts. | Adarsh management, 2026-07-29 | Portal contracts are in scope; implementation remains a later phase. |
| DEC-0034 | APPROVED — CONFIGURATION PENDING | Partnership accounting is applicable. Support separate partner capital/current, drawings, interest, remuneration, appropriation, loans and tax adjustments with effective-dated terms. Deed values and CA-approved treatment are pending. | Adarsh management; partnership deed/CA pending, 2026-07-29 | Generic partner model may proceed; no balances or ratios may be invented. |
| DEC-0035 | OPEN | Approve report definitions, ageing buckets, cash-flow method, comparisons, job margin definitions and the duplicate Ledger Statement interpretation. | Finance/CA/Operations, pending | Does not block core domain model; blocks report/UAT acceptance definitions. |
| DEC-0036 | APPROVED | Build a configurable multi-organization, multi-industry platform supporting partnerships, LLPs, companies, proprietorships, nonprofits, service/trading/logistics entities, optional inventory and multiple GST registrations. Never hard-code Adarsh or logistics-specific rules globally. | Adarsh management, 2026-07-29 | Controlling product-direction decision for all Phase 2 design. |

## Approved policy detail

### DEC-0004, DEC-0005 and DEC-0020 — Commercial and master ownership

- CRM owns quotations, sales orders, purchase orders and approved immutable invoice requests.
- Accounting exclusively owns accounting drafts, statutory invoices and posted invoices.
- Customer is CRM-owned; Vendor is Procurement/Accounting-owned; Employee is HRMS-owned.
- Branch is owned by Organization Administration; Department by HRMS/Organization Administration.
- Project is owned by its operational module; Cost Centre by Accounting.
- Item/Service is a shared master with Accounting-owned financial/tax mappings.
- Salesperson is CRM-owned and linked to Employee where applicable.
- Bank-reference masters are Accounting-owned.
- Every module references canonical shared IDs; duplicate masters are prohibited.

### DEC-0006 and DEC-0032 — Payroll, claims and employee financial flows

- HRMS owns payroll calculation and submits an approved immutable versioned payroll run.
- The posting/reconciliation contract includes legal entity, branch, department, cost centre, employee, run, pay period, earning/deduction component, expense and liability/recovery accounts, Decimal amount/currency, payment status and reversal/version reference.
- Accounting may post summarized GL journals but retains employee/component subledger detail for reconciliation, statutory reporting and final settlement.
- HRMS/CHA owns claim approval; Accounting owns reimbursements, advances, loans, recoveries, payments and full-and-final financial settlement.

### DEC-0007 — Fixed assets

- AMS owns the operational asset; Accounting owns a linked financial register.
- Maintain separate, reconcilable Companies Act and Income Tax depreciation books.
- Asset classes, useful lives, rates and capitalization thresholds are effective-dated configuration approved by Finance/CA; none may be invented.

### DEC-0009 — Period locks and correction

- Use hard locks by default.
- Normal corrections use reversal/adjustment in the next open period.
- Exceptional reopening is requested by Accounts Manager and independently approved by a Partner/Finance Administrator; requester and approver must differ.
- Reason and period are mandatory; reopening is time-bound, fully audited, and automatically re-locks.
- Posted entries are never edited/deleted; corrections use linked reversal and reposting.

### DEC-0013 — Retention

- Provisional minimum, pending CA/legal confirmation: journals, accounting records, source documents and attachments for eight financial years.
- Retain audit logs and posting lineage permanently; never physically delete posted journals or audit lineage.
- Portal accounting documents inherit the related accounting-document retention.
- Legal hold suspends archival deletion.
- Archives are encrypted, searchable, tenant-scoped and access-controlled.
- Anonymize personal data only where legally permitted after statutory, contractual and legal-hold obligations expire.

### DEC-0017 — Entity and GST-registration model

- Configure one partnership legal entity initially and support additional legal entities later.
- Maintain completely separate ledgers, vouchers, periods, balances and statutory reports for every legal entity.
- Consolidated reporting is a separate derived view and never replaces entity books.
- Support four initial GST registrations, but do not create placeholder GSTINs.
- Each GST registration owns its GSTIN, legal/trade name, state/code, registered address, branch mapping, invoice/debit-note/credit-note sequences, tax rules, return/reconciliation scope, e-invoice configuration and e-way-bill configuration.
- Permit audited administrative activation/deactivation; historical registrations and posted-document snapshots remain immutable.
- Provide branch- and GST-registration-level reports within the legal entity.

### DEC-0018 and DEC-0014 — Cutover and history

- Cut over at the beginning of a financial year, not mid-year.
- Support configurable opening, closing, adjustment and locked periods.
- Zoho Books is the principal historical source.
- Migrate transaction-level history where source evidence permits, including masters, invoices/bills, notes, receipts/payments/allocations, expenses, journals, bank/reconciliation data, tax references, balances, attachments, numbers, dates, currencies/rates, statuses and lineage.
- Preserve original Zoho IDs and original document numbers.
- Never silently discard or duplicate a source record; unmatched data enters a Finance-reviewed exception queue.
- Keep Zoho information available as a controlled read-only archive through migration acceptance and retention.
- Prove migration completeness using record counts, control totals, trial balance, GL, AR/AP ageing, bank, tax, document and retained-earnings reconciliations.

### DEC-0011 and DEC-0022 — Multicurrency, pricing and rounding

- Initial functional/base currency is INR; USD transaction support is required.
- Support multicurrency customers, vendors, invoices, bills, receipts, payments, bank accounts, advances and journals.
- Store transaction/functional currency, rate, rate date/source and both currency amounts using Decimal.
- Revalue eligible open monetary balances at every period close, post unrealized FX separately, reverse on the first day of the next period, and recognize realized FX on settlement.
- Preserve the historical rate of every posted/migrated transaction.
- Permit authorized manual rates only with reason and immutable audit.
- Pricing may be tax-inclusive or tax-exclusive using organization/document defaults.
- Use Decimal/Numeric only, currency-specific stored precision and higher internal precision for rates, tax and FX.
- Calculate line base, discount, taxable value and tax components before document totals.
- Round statutory components/document totals under approved Indian rules using half-up by default; post differences to a configured round-off ledger.
- Exact Decimal scales and statutory edge cases remain subject to technical and CA validation.

### DEC-0021 — Items

- Initial Adarsh organization has service items only; disable inventory.
- Never create stock movements or inventory valuation for service items.
- Service items require income/expense accounts, tax codes, units, SAC and pricing configuration.
- Keep physical inventory/warehouse/serial/batch/valuation capability modular for other organizations or later enablement.

### DEC-0015 and DEC-0027 — Maker-checker

- Accounts Manager approves invoices, expenses, payments and manual journals.
- A user cannot approve a transaction they created or materially modified.
- If the Accounts Manager is maker, a separately authorized partner, administrator or alternate Finance approver must approve.
- Mandatory independent approval applies to manual journals, bank-detail changes, write-offs, period reopening and high-risk payments.
- Configure workflows by legal entity, branch, document, amount, currency, risk and role.
- Keep approval history immutable; possession of both permissions never enables self-approval.

### DEC-0028 — Banking

- Initial bank/channel: ICICI Bank / ICICI Net Banking.
- Initial scope: secure CSV/XLSX or other verified statement import, matching and reconciliation.
- Defer direct API feeds, gateways and payment initiation.
- A prepared accounting payment is not a bank-authorized payment.
- Any later initiation requires approved provider, protected credentials, maker-checker, limits, beneficiary-change controls, idempotency, signed evidence, status reconciliation, retry/failure handling and full audit.

### DEC-0023, DEC-0025 and DEC-0026 — Statutory features

- GST invoicing, tax calculation and multi-registration support are required.
- TDS, TCS, e-invoice and e-way-bill exist as configurable, effective-dated features.
- Keep those features disabled for the initial organization until the CA confirms applicability.
- Enabling requires authorized configuration and complete audit.
- Do not retroactively alter historical applicability.
- Do not transmit production statutory documents before applicability, credentials, provider and CA-approved mappings are complete.
- Use sandbox/test mode where supported.

### DEC-0024 — GST returns

- Support GSTR-1, GSTR-3B and GSTR-2B with ITC matching.
- Initial release produces validated reconciled exports and working papers only.
- Direct filing remains deferred until provider, credentials, authorization, sandbox validation and CA approval are complete.

### DEC-0030 — Debit/credit notes

- Customer debit note increases receivables; customer credit note reduces receivables; vendor debit note reduces payables.
- Original-document linkage is mandatory when adjusting a specific invoice or bill.
- Standalone notes require an authorized reason and applicable statutory treatment.
- Credits may be applied to an open document, retained as unapplied party credit or refunded through independent payment approval.
- Applications, unapplications and refunds are atomic, auditable and reversible; posted notes are immutable.

### DEC-0033 — Portals

- Include customer and vendor portals in the initial release.
- Customer portal: invoices/credits, outstanding, statements, immutable downloads, payment/allocation status, remittance advice, disputes and controlled profile/KYC changes.
- Vendor portal: purchase orders where applicable, bill/supporting-document submission, validation/approval/payment/remittance status, applicable TDS information and controlled bank/KYC changes.
- Portal users never post journals or edit posted financial facts.
- Bank-detail changes require verification, maker-checker, notification and immutable audit.
- Every portal request is server-authorized, tenant-scoped and party-scoped.

### DEC-0034 — Partner accounts

- Partnership feature is in scope.
- Maintain separate partner capital/current, drawings, interest, remuneration, appropriation, loans and tax adjustments.
- Terms and ratios are effective-dated.
- Do not invent partner identities, opening balances, ratios, remuneration or rates.
- Do not mix partner balances with customer, vendor or employee subledgers.

### DEC-0019 and DEC-0008 — Revenue and CHA job profitability

- Default to accrual accounting.
- CRM quotes/orders/draft billing requests never recognize revenue.
- Accounting owns the posted financial/statutory invoice.
- Support point-in-time, service-completion, milestone, time-period, deferred/unearned and accrued/unbilled recognition.
- `ChaJob` is canonical; Accounting links financial facts rather than creating another job master.
- Support direct/allocated cost, employee expenses, vendor bills, duties paid for customers, recoverable/non-recoverable expenses and revenue.
- Amounts paid for customers are not automatically company expense or revenue; approved recoverable policy controls treatment.
- Profitability views include recognized revenue, direct and allocated indirect cost, recoverables, billed/unbilled, collected/outstanding, gross margin and contribution margin.

## Information explicitly prohibited from invention

Do not invent or default the following as Adarsh production data:

- the four GSTINs, names, states, addresses or branch mappings;
- the first financial year or cutover date;
- historical migration start date or available Zoho export/API coverage;
- exchange-rate provider/fallback hierarchy or final Decimal scales;
- partner names, balances, ratios, remuneration or interest rates;
- statutory applicability, thresholds, sections or rates;
- approval amounts or alternate approvers.

## Explicit Phase 2 environment block

No authorized validation database exists. Phase 2 remains blocked until Operations provides an access-controlled anonymized production restore or representative staging restore with secure connection delivery, backup date/source, anonymization confirmation, migration history, restore validation and read/write authorization boundaries. Credentials must never be written in repository documentation or chat.

## Approval rule

Only rows marked `APPROVED` or the explicitly approved portion of `APPROVED — CONFIGURATION PENDING` may control Phase 2. Pending configuration must remain configuration—not hard-coded policy. `BLOCKED`, `OPEN`, `DEFERRED` and unresolved portions must not be silently resolved in code or schema.
