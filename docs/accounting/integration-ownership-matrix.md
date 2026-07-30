# Accounting Integration Ownership Matrix

This is an initial discovery matrix, not approved architecture. `Proposed SoR` must be ratified through `decisions.md`. CRM, HRMS, CHA, AMS, browser actions, and integrations must never write accounting journal tables directly (BASE-INT-001/002, BASE-ACC-003, BASE-DB-011/012/013).

## Phase 2 approved ownership overlay

The following approved decisions supersede “Decision required” entries in the discovery matrix:

| Domain | System of record | Permitted Accounting interaction | Prohibited interaction | Reconciliation key |
|---|---|---|---|---|
| Customer | CRM `CrmAccount` | Finance-owned extension, AR documents/status | Duplicate customer master or CRM journal write | `orgId + CrmAccount.id` |
| Vendor | Procurement/Accounting-owned shared `CrmVendor` | Finance extension, AP/payment status | Duplicate vendor or source-module journal | `orgId + CrmVendor.id` |
| Employee/payroll | HRMS | Consume approved immutable payroll run/version; return financial status | Accounting payroll recalculation or HRMS journal write | `orgId + payrollRunId + version` |
| Branch | Organization Administration | Use canonical branch as dimension | Accounting branch duplicate | `orgId + Branch.id` |
| Cost centre | Accounting | Validated effective-dated dimension | Free-text posting dimension | `orgId + dimensionValueId` |
| Project | Project-owning module | Canonical ID mapped to Accounting dimension | Duplicate Accounting project master | `orgId + sourceType + sourceId` |
| CHA job | CHA `ChaJob` | Direct canonical dimension/reference and financial read model | Future `JobCosting` duplicate master or CHA journal write | `orgId + ChaJob.id` |
| Service/item | Shared `CrmProduct`, Accounting finance/tax mapping | Snapshot approved mapping/version | Duplicate item or inventory post for service item | `orgId + CrmProduct.id + mappingVersion` |
| Quotation/order | CRM | Approved immutable invoice request | Create Accounting draft/statutory invoice/journal | `orgId + requestId + version` |
| Accounting invoice/bill/note/payment | Accounting | Publish immutable status/balance outcomes | Source module edits/accounting-number assignment | Accounting document ID/version |
| Claim | HRMS or CHA approval; Accounting payable/payment | Consume approved claim/version and return settlement | Source financial settlement or direct journal | `orgId + owner + claimId + version` |
| Asset | AMS operational; Accounting financial books | Consume lifecycle candidate/version, return NBV/status | Shared mutable depreciation values | `orgId + AMS asset ID + book` |
| Communication/portal | Communication/party-facing delivery | Deliver immutable hash/version; receive controlled requests | Financial mutation or journal posting | document/version/hash + party ID |

All commands cross the versioned inbox boundary. All Accounting results use the transactional outbox. Direct imports of Prisma journal delegates by CRM, HRMS, CHA, AMS, portal or browser code are prohibited and are enforced by the Phase 3 architecture test and database guards.

## Phase 3 implemented ownership transitions

- Bank transfer preparation creates an immutable Accounting request; only a separate authorized Accounting approver can invoke canonical posting.
- CRM won-deal conversion produces an immutable invoice request only and requires both CRM and Accounting draft authority. It cannot create or post an Accounting invoice.
- HRMS owns payroll calculation and approval. Accounting accepts an immutable approved run/version and can post its supplied allocations without recalculation.
- Manual journal drafts remain Accounting-owned; submitted/posted effects and reversal are canonical-engine-only.
- AMS depreciation, recurring journal and partner financial posting are fail-closed until their versioned policy and canonical adapters exist.

| Domain / fields | Existing model(s) | Proposed system of record | Allowed writers | Consumers / direction | Sensitive fields / stable IDs | Required reconciliation |
|---|---|---|---|---|---|---|
| Organization / legal entity | `Organisation`, `AccountingSettings` | Shared platform for identity; Accounts for accounting policy | Platform admins; Finance for scoped settings | Platform → all modules | registration, tax IDs; `orgId` | Every accounting row tenant-scoped; settings refer to same org |
| Branch | `Branch` plus optional accounting `branchId` | Shared platform | Platform/HR admins | Shared → CRM/HRMS/CHA/Accounts | registration/location; `branchId` | Branch belongs to org; posting dimensions valid at posting date |
| Customer | `CrmAccount`; customer IDs referenced by Accounts | CRM master with finance-owned extension | CRM for commercial identity; Finance for credit/collections policy | CRM → Accounts; Accounts → CRM balances/status | GSTIN, addresses, bank data, credit; `CrmAccount.id` | CRM customer ↔ AR control/subledger; no duplicate customer |
| Vendor | `CrmVendor` | CRM/shared vendor master with finance-owned extension | Authorized vendor master/Finance roles | Shared → Accounts/CHA | GSTIN, bank/payment data; `CrmVendor.id` | Vendor ↔ AP control/subledger; duplicate and bank-change review |
| Employee | `User`, `EmploymentRecord`, HRMS profile models | HRMS | HR for employment/payroll inputs | HRMS → Accounts masked/versioned | salary, statutory IDs, bank data; employee ID + version | Approved payroll run totals/components ↔ journals/payments |
| Department / division | shared org models | HRMS/shared platform | HR/org admins | HRMS → Accounts dimension mapping | IDs and effective dates | Payroll allocations total to approved run |
| Cost centre / project | `CrmProject`; ad-hoc accounting dimensions | Decision required | Authorized operational owner; Finance mapping | CRM/CHA/HRMS → Accounts | stable external ID/version | Source allocation totals ↔ journal dimensions |
| CHA job | `ChaJob`, `JobCosting` | CHA for operational job; Accounts for financial views | CHA workflow; Finance accounting mapping | CHA → Accounts; Accounts → CHA billed/cost/paid status | customer/vendor documents; job ID | Job costs/revenue trace to source docs and GL; no duplicate job register |
| Item / service | `CrmProduct`, Accounting item pages/services | Decision required, likely shared catalogue | Product/master-data steward | CRM/CHA → Accounts | tax code, HSN/SAC, valuation; stable item ID/version | Document snapshots match master version; inventory ledger if enabled |
| Tax configuration | `TaxLine`, product tax percent, settings | Accounts/Tax | Finance/Tax only | Accounts rules consumed by CRM request validation | GST registration, rate, place of supply | Tax document lines ↔ tax ledgers/returns |
| CRM opportunity / contract | `CrmDeal` and related CRM models | CRM | CRM | CRM → invoice request; Accounts → billed/paid feedback | commercial terms; deal/version ID | forecast remains distinct from billed/recognized/collected |
| Quotation | `CrmInvoice(type=QUOTE)`, `Quotation` | Decision required (`DEC-0004`) | CRM or Finance per approved workflow | CRM ↔ Accounts conversion/status | pricing and customer data; quote/version ID | One conversion lineage; quantities/amounts not over-converted |
| Sales order | `CrmInvoice(type=SALES_ORDER)` | CRM/commercial | CRM approvals | CRM → Accounts invoice request | order/version ID | Ordered, billed, credited, collected totals |
| Billing request / milestone | No canonical durable model found | CRM/CHA source | CRM/CHA approval workflow | Source → Accounts command/event | idempotency key + immutable source version | Exactly one accepted/rejected accounting result |
| Accounting sales invoice | `SalesInvoice`; duplicate `CrmInvoice(type=INVOICE)` | Accounts | Accounts posting service only | Accounts → CRM/portal/Communication | tax/amount/bank/customer snapshots; accounting ID/number | Source request ↔ invoice ↔ journal ↔ AR ↔ allocations |
| Purchase order | `CrmInvoice(type=PURCHASE_ORDER)` | Decision required | Procurement/authorized CRM roles | Procurement → Accounts bill matching | vendor/order version | Ordered/received/billed variance |
| Vendor bill | `PurchaseInvoice` | Accounts | Accounts posting service | Accounts → CHA/vendor status | vendor/tax/bank; bill ID/number | Bill ↔ journal ↔ AP ↔ payments/credits |
| Receipt / customer payment | `PaymentEntry`, `PaymentAllocation` | Accounts | Cashier/payment service | Accounts → CRM/customer portal | bank reference; payment ID/idempotency | Payment amount = allocations + on-account; AR/control/bank reconcile |
| Vendor payment | same shared payment models | Accounts | Payment preparation/approval service | Accounts → vendor/CHA/HRMS | bank details/references | AP allocations + on-account = payment; bank reconciliation |
| Bank transaction | GL entries; no complete statement model found | Accounts/bank feed | Import worker; authorized matcher | Bank → Accounts | account/statement/reference | Statement closing balance and matched GL reconcile to zero |
| Journal / ledger | `JournalEntry`, `JournalEntryLine`, `GeneralLedgerEntry` | Accounts | Canonical posting engine only | Read-only facts to all consumers | financial facts; source/version/idempotency/reversal IDs | Balanced transaction/base currency; immutable; source and reversal lineage |
| Payroll run | `PayrollBatch`; HRMS salary inputs | HRMS immutable approved run | HRMS payroll engine | HRMS → Accounts; result Accounts → HRMS | salary/components/bank; run ID/version | Run totals/components ↔ liabilities/journals/payment outcomes |
| Payroll journal | `PayrollBatch.journalEntryId` | Accounts | Posting engine | Accounts → HRMS | journal and run version IDs | One run version → one active posting; reversal/repost lineage |
| Reimbursement / expense claim | HRMS reimbursement/fuel records; CHA expense records | Origin module for claim; Accounts for payable/payment | HRMS/CHA approval; Accounts posting/payment | Bidirectional | claimant, bank, receipts; claim/version ID | Approved amount ↔ payable/journal/payment; no second expense ledger |
| Fixed asset candidate | `Asset` shared by AMS/Accounting | AMS operational candidate; Accounts financial register, pending `DEC-0007` | AMS lifecycle; Finance capitalization | AMS → Accounts; Accounts → AMS NBV/disposal status | serial/cost/location; asset/version ID | Capitalized cost ↔ AP/GL; depreciation/disposal ↔ asset register/GL |
| Communications / document versions | email queues, customer-portal document versions, storage | Communication/storage for delivery; Accounts for immutable financial rendering | Accounts renders/version-locks; Communication delivers | Accounts → Communication/portal | financial PDFs, email, attachments | Sent version hash/template/source state retained and access-controlled |

## Remaining gaps

- Document-specific canonical adapters are still required for sales/purchase invoices, payments, notes, quotation conversion, recurring expenses, depreciation, partner transactions and payroll payment.
- CHA operational expense payment and HRMS reimbursement payment still need durable bidirectional Accounting contracts.
- Inbox/outbox persistence and safe classifications are implemented, but publication/retry/manual-review workers and operational metrics remain later work.
- `JobCosting`, quotation/note records, `CrmInvoice`, and Accounting invoice records still overlap and require controlled source-adapter rollout and reconciliation.
