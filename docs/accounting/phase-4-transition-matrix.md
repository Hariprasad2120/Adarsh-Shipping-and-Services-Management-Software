# Accounting Phase 4 Document, Payment, and Scheduler Transition Matrix

Status: implemented and evidence-backed on guarded synthetic staging, 2026-07-30.

Scope: this phase does not activate production posting or publication. It does not authorize Neon, Zoho, external providers, real data, port 5432, migration rehearsal, deployment, or Phase 5.

## Shared lifecycle

Applicable legacy screens remain draft/read compatibility surfaces. Preparation resolves authenticated organization and legal entity on the server, validates a versioned `AccountingDocumentPolicy`, freezes an `AccountingSourceSnapshot`, validates the versioned contract with Decimal arithmetic, and persists a canonical document or payment plus a pending inbox request. Preparation is not approval and does not create a ledger effect.

An independent authorized approver supplies approval evidence. Only `postCanonicalAccountingRequest` may create the posted journal, journal lines, GL projection, audit record, and outbox event. Posted documents, payments, allocations, and generated scheduled occurrences are database-protected. Corrections preserve the original and use a new correction, reversal, or replacement lineage.

## Identity and current-path inventory

| ID | Source / entry point | Current model and lifecycle | Current authorization | Financial-write state | Canonical type / schema |
|---|---|---|---|---|---|
| F01 | Accounting sales invoice: `submitSalesInvoiceAction` → `prepareLegacySalesInvoice` | `SalesInvoice` DRAFT remains compatibility source; `AccountingDocument` PENDING_APPROVAL → POSTED | `accounting.sales-invoice.prepare`; approval additionally requires `accounting.document.approve`, `accounting.sales-invoice.approve`, `accounting.post` | Transitioned; legacy create-with-submit and submit helpers are blocked | `SALES_INVOICE`, document v1, `AR-SALES-INVOICE-v1` |
| F02 | Accounting purchase invoice: `submitPurchaseInvoiceAction` → `prepareLegacyPurchaseInvoice` | `PurchaseInvoice` DRAFT source; canonical document lifecycle | `accounting.purchase-invoice.prepare`; independent purchase/document approval and post | Transitioned for explicit zero-tax configured bills; unapproved tax/discount treatment is gated | `PURCHASE_INVOICE`, document v1, `AP-PURCHASE-BILL-v1` |
| F03 | Accounting quotation conversion: `convertQuotationToInvoiceAction` | `Quotation`; no canonical generated invoice yet | Existing Accounting action has no sufficient Phase 4 conversion authority | Policy-gated before mutation; no posted fallback | Planned `SALES_INVOICE` document v1, `AR-SALES-INVOICE-v1` |
| F04 | Customer receipt: `submitPaymentEntryAction` → `prepareLegacyPayment` | `PaymentEntry` DRAFT plus canonical payment/allocation PENDING_APPROVAL → POSTED | `accounting.receipt.prepare`; independent `accounting.payment.approve`, `.post`, and canonical post | Transitioned | `CUSTOMER_RECEIPT`, payment v1, `AR-CUSTOMER-RECEIPT-v1` |
| F05 | Vendor payment: same action/adapter with PAY source | `PaymentEntry` DRAFT plus canonical payment/allocation | `accounting.payment.prepare`; independent payment approval/post | Transitioned | `VENDOR_PAYMENT`, payment v1, `AP-VENDOR-PAYMENT-v1` |
| F06 | General payment | No distinct runtime source path was discovered | No source-specific route exists | Deferred: common contract supports `GENERAL_PAYMENT`, but no product flow was fabricated | Payment v1; rule/configuration still required |
| F07 | Approved HRMS payroll-payment instruction: `prepareApprovedPayrollPayment` | Immutable `AccountingPayrollRunSnapshot` liability plus canonical payment/allocation | Narrow `accounting.payroll-payment.integrate`; posting remains canonical trusted-integration authority | Transitioned producer foundation; legacy `payPayrollBatch` remains blocked | `APPROVED_PAYROLL_PAYMENT`, payment v1, `PAYROLL-PAYMENT-v1` |
| F08 | Customer/vendor credit note: customer action → `prepareLegacyCustomerNote`; vendor foundation → `prepareLegacyVendorNote` | Legacy note stays DRAFT until canonical correction posts; original invoice remains immutable | `accounting.credit-note.prepare`; independent correction/document approval and post | Customer runtime transitioned; vendor adapter ready but no vendor submit caller was discovered | `CUSTOMER_CREDIT_NOTE` / `VENDOR_CREDIT_NOTE`, document v1 |
| F09 | Customer/vendor debit note: same correction adapters | Same correction lifecycle | `accounting.debit-note.prepare`; independent correction/document approval and post | Customer runtime transitioned; vendor adapter foundation has no current caller | `CUSTOMER_DEBIT_NOTE` / `VENDOR_DEBIT_NOTE`, document v1 |
| F10 | Invoice/payment cancellation: cancel actions → canonical cancellation/reversal adapters | Draft cancellation follows legacy draft rules; posted canonical facts get linked reversal and CANCELLED/REVERSED projection state | `accounting.reverse` plus source-specific server action authorization | Transitioned; legacy direct cancellation helpers are not action callers | Canonical reversal v1; original effective date and reason retained |
| F11 | AMS depreciation: `runDepreciationAction` / `runDepreciationForAsset` | Legacy `Asset` and depreciation model | Existing Accounting action cannot supply approved AMS policy/run evidence | Policy-gated before calculation or mutation | Approved depreciation-run identity/contract foundation; `ASSET-DEPRECIATE-v1` registered |
| F12 | Recurring expense/journal workers; `register/claim/settleAccountingScheduledOccurrence` foundation | Template → versioned source snapshot → unique occurrence PENDING/CLAIMED → GENERATED/SKIPPED/FAILED | `accounting.recurring-occurrence.process` | Scheduler identity/claim foundation transitioned on exact staging; legacy auto-post paths remain gated | Occurrence v1; generated document and final posting remain separately approved |
| F13 | Partner transaction: `recordPartnerTransaction` | Legacy `PartnerAccount` | Existing action has no approved effective partner terms/control-account policy | Policy-gated before account creation, calculation, mutation, or posting | Partner identity foundation; `PARTNER-APPROPRIATION-v1` registered |
| F14 | Approved HRMS payroll correction: `postApprovedPayrollCorrection` | Original immutable payroll-run snapshot plus approved correction version | `accounting.payroll-correction.integrate`; canonical trusted integration | DELTA adjustment transitioned; replacement mode remains explicitly policy-gated | Correction v1, `PAYROLL-CORRECTION-v1` |
| F15 | HRMS payroll-payment event | Same approved instruction producer as F07; payroll accrual remains separate Phase 3 flow | Narrow payroll-payment integration identity | Transitioned; duplicate event/version cannot duplicate payment or journal | Payment v1 with source-snapshot allocation and payroll lineage |
| F16 | Transactional outbox: `claim/settle/retry/move/publishClaimedSyntheticOutbox` | PENDING/RETRYABLE → PROCESSING lease → PROCESSED, MANUAL_REVIEW, or DEAD_LETTER | guarded worker; privileged `accounting.outbox.retry` / `.manual-review` | Transitioned for guarded synthetic destinations only; no external delivery | Event v1; journal and outbox remain atomic |

## Snapshot, idempotency, and policy controls

| ID | Immutable version / snapshot | Idempotency and payload hash | Required configuration | Approval / maker-checker |
|---|---|---|---|---|
| F01 | Legacy invoice `updatedAt` second-version and complete line snapshot | `ACCOUNTING:DOCUMENT:SALES_INVOICE:{id}:{version}`; normalized contract hash | legal entity, customer, receivable/revenue, currency/FX, tax category/account, number, approval and rounding policy | maker cannot approve; sales-specific approval plus post |
| F02 | Supplier document and line snapshot | document source/request/idempotency uniqueness; immutable normalized hash | vendor, supplier reference scope, payable/expense, currency/FX, tax/statutory evidence, number, approval, rounding | maker cannot approve; purchase-specific approval plus post |
| F03 | Exact accepted quotation version is required but not yet available as approved evidence | planned deterministic quotation/version conversion key | accepted-version evidence, permitted field mapping, invoice policy | conversion stays gated |
| F04 | Payment-entry version and allocation targets | `ACCOUNTING:PAYMENT:CUSTOMER_RECEIPT:{id}:{version}` | bank/cash, receivable control, currency/FX, method, unapplied policy | payment approval and posting separate from preparation |
| F05 | Payment-entry version and supplier allocations | vendor-payment key and hash as above | bank/cash, payable control, currency/FX, method, overpayment policy | independent checker/poster |
| F06 | Requires an approved source/version when a product path exists | contract already enforces deterministic hash | payment classification, accounts, party, method, approval | deferred |
| F07/F15 | Approved payroll run plus instruction ID/version; generic payload excludes employee details | instruction ID/version key; allocation points to approved payroll source snapshot | payroll liability, bank/cash, currency, period, payment policy | narrow producer; canonical integration posting |
| F08/F09 | Note version plus original canonical document/policy | document key by note/version; correction capacity guarded under original row lock | correction type, number/approval, reason, original policy preservation, accounts, currency and statutory evidence | correction approver distinct from maker |
| F10 | Original journal and original effective date | reversal key bound to original journal and reason | open correction period and reversal policy | `accounting.reverse`; canonical engine audits |
| F11 | run ID/version, asset list, period and approved calculated amounts | `depreciationRunIdentity` | AMS-approved book policy, useful life/method/residual result, accounts/dimensions, statutory rounding | gated |
| F12 | template ID/version and scheduled date snapshot | `recurringOccurrenceIdentity`; unique source and occurrence keys | enabled/effective template, catch-up rule, generated-document policy | processing permission; generated document still needs its own approval |
| F13 | partner/source transaction version | partner identity helper and canonical source uniqueness | effective partner terms, classification, accounts, evidence, approval | gated |
| F14 | original run ID/version plus correction ID/version and approved delta | payroll correction normalization/hash | correction evidence, legal entity, currency, accounts/dimensions | narrow producer and canonical post; replacement gated |
| F16 | immutable event payload/version/hash and journal aggregate | unique destination/idempotency key; consumer must deduplicate | only `SYNTHETIC_*` destination is claimable in Phase 4 | privileged retry/review audited |

## Correction, rollout, and evidence

| ID | Reversal/correction strategy | Compatibility / legacy block | Rollout classification | Evidence / unresolved gate |
|---|---|---|---|---|
| F01/F02 | linked journal reversal; new document/version for amendment | draft/read compatibility; create-with-submit and direct submit blocked | transitioned during Phase 4 | guarded prepare/approve/post and architecture tests; statutory tax remains DEC-0022 gated |
| F03 | later invoice correction only; never mutate quotation-derived posted invoice | conversion throws before mutation | policy-gated | accepted quotation version and production invoice policy missing |
| F04/F05 | payment reversal releases active allocations in the canonical transaction | draft/read compatibility; direct submit/cancel blocked | transitioned during Phase 4 | exact, over-allocation, immutability, concurrency and external-reference DB controls |
| F06 | reversal required when implemented | no legacy financial writer discovered | deferred with reason | no product entry point or approved rule |
| F07/F15 | payment reversal; accrual journal is independent | legacy batch payment blocked | transitioned producer foundation | immutable approved HRMS instruction required |
| F08/F09 | correction document references original; repeated/concurrent corrections cannot exceed original | legacy note submit functions blocked; vendor read/draft remains | transitioned/foundation as noted | standalone notes and statutory deadlines remain gated |
| F10 | draft cancel or canonical linked reversal only | action paths no longer call legacy cancellation | transitioned | closed-period correction policy unresolved |
| F11 | new approved run version plus reversal/replacement | legacy calculation/post block retained in source for audit context only | policy-gated | approved AMS policy and statutory rounding absent |
| F12 | failed/skipped explicit; generated terminal state immutable; template edits create later version | legacy recurring auto-post code is unreachable behind hard gate | scheduler foundation transitioned; financial generation policy-gated | catch-up and template approval policy absent |
| F13 | linked reversal/replacement | legacy writer unreachable behind hard gate | policy-gated | partner terms, limits, tax and control mappings absent |
| F14 | separate DELTA adjustment; REPLACEMENT must use approved reversal/replacement | Accounting never recalculates payroll | transitioned for DELTA / policy-gated for replacement | replacement policy absent |
| F16 | retry preserves journal; deterministic rejection goes manual review; retry ceiling dead-letters | no external provider/broker configured | transitioned on guarded synthetic staging | production destination/provider/credentials deliberately absent |

## Database controls

The expand-only Phase 4 migration chain adds canonical documents, lines, payments, allocations, scheduled occurrences, document policies, outbox lease/result fields, tenant/legal-entity guards, immutable-state guards, source/request/idempotency uniqueness, scoped external-reference uniqueness, active allocation uniqueness, row-lock allocation capacity, correction remaining-value capacity, terminal occurrence immutability, and a corrected table-safe tenant trigger.

No legacy column is dropped. Rollback is operational: stop preparation/worker entry points, keep canonical rows readable, and forward-fix defects. Posted facts are not deleted or rewritten.

## Remaining production gates

- DEC-0022 statutory GST/jurisdiction rounding and production precision approval.
- Approved purchase statutory/withholding/reverse-charge/input-credit behavior.
- Accepted quotation version and independent invoice-conversion policy.
- Standalone credit/debit-note and closed-period statutory treatment.
- AMS depreciation book policy.
- Recurring catch-up, skip, template approval, and generated-document rules.
- Partner agreement terms and control-account policy.
- Payroll replacement correction policy.
- Production outbox destination, provider, credentials, monitoring, and consumer contract.
