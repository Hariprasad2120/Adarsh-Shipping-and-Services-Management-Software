# Accounting Posting-Rule Catalogue

Status: Phase 3 canonical kernel implemented on synthetic staging. No rule in this document authorizes direct writes outside the canonical engine or represents an approved production account mapping.

## Universal posting contract

Every rule is executed by the future canonical posting engine in one database transaction:

1. authenticate and authorize the tenant-scoped actor;
2. validate immutable source ID/version and idempotency key;
3. load the approved policy version, account mappings, period and currency rate with locks;
4. reject closed/unauthorized periods and self-approval;
5. calculate only with Decimal values;
6. create balanced journal header/lines, source lineage, audit and outbox event atomically;
7. return the existing result for a replayed idempotency key;
8. correct posted facts only with a linked reversal/adjustment.

Account names below are roles resolved through `AccountingAccountControl.systemRole`, not hard-coded account IDs.

## Rule template

Each implemented rule must declare: rule/version, triggering command, preconditions, debit roles, credit roles, dimensions, transaction/functional currency behavior, rounding, reversal behavior, idempotency and invariant tests.

## Core catalogue

| Rule | Trigger | Debit | Credit | Important conditions |
|---|---|---|---|---|
| `AR-SALES-INVOICE-v1` | Approved Accounting-owned sales invoice posts | AR control; discounts/round-off as applicable | Service revenue; GST output components; deferred revenue where policy says | CRM request cannot post; tax/recognition policy snapshot required |
| `AR-CUSTOMER-RECEIPT-v1` | Cleared/authorized receipt posts | Bank/cash/clearing | AR control or customer advance | Active allocations + on-account = receipt; realized FX separate |
| `AR-CREDIT-NOTE-v1` | Approved customer credit note | Revenue/returns and GST output reversal | AR control | Specific note links original invoice; standalone treatment requires approved policy |
| `AR-DEBIT-NOTE-v1` | Approved customer debit note | AR control | Revenue/other approved role and tax | Same source/statutory controls as invoice |
| `AP-PURCHASE-BILL-v1` | Approved vendor bill posts | Expense/asset/prepayment and recoverable GST | AP control | Vendor/source document uniqueness; RCM/TDS only when effective policy is approved |
| `AP-VENDOR-PAYMENT-v1` | Authorized payment posts | AP control/vendor advance | Bank/cash/clearing | Bank details and high-risk approval version frozen |
| `AP-VENDOR-DEBIT-NOTE-v1` | Approved vendor debit note | AP control | Expense/asset and recoverable GST reversal | Original linkage or approved standalone reason |
| `EXP-DIRECT-v1` | Approved direct expense | Expense/tax/prepayment | Cash/bank/AP/employee payable | Claim owner remains HRMS/CHA when sourced there |
| `GL-MANUAL-JOURNAL-v1` | Independently approved manual journal | Configured debit roles | Configured credit roles | Manual posting to protected control accounts normally prohibited |
| `GL-REVERSAL-v1` | Authorized reversal | Exact original credits | Exact original debits | Preserves original dimensions/rates; links `reversalOfId`; date must be open |
| `FX-REALIZED-v1` | Foreign-currency settlement | AR/AP/bank plus realized FX loss | AR/AP/bank plus realized FX gain | Uses frozen document rate and settlement rate |
| `FX-REVALUE-v1` | Period-close revaluation | Monetary account/FX loss | Monetary account/FX gain | One run/version per period; next-period automatic linked reversal |
| `PAYROLL-ACCRUAL-v1` | Approved immutable HRMS payroll run/version | Salary/component expenses | Employee/statutory/other payroll payables | Summarized GL plus employee/component subledger; never recalculates payroll |
| `PAYROLL-PAYMENT-v1` | Approved payroll payment batch | Payroll payable | Bank/clearing | Total and employee references reconcile to approved run |
| `CLAIM-ACCRUAL-v1` | Approved HRMS/CHA claim/version | Expense/advance recovery | Employee/vendor payable | Source module owns claim approval, Accounting owns payable/payment |
| `ASSET-CAPITALIZE-v1` | Approved Accounting capitalization from AMS candidate | Asset cost/input tax | AP/clearing/CWIP | AMS ID/version retained; separate financial books |
| `ASSET-DEPRECIATE-v1` | Approved depreciation run/book/period | Depreciation expense | Accumulated depreciation | One run per asset/book/period; rates are effective-dated configuration |
| `ASSET-DISPOSE-v1` | Approved disposal | Cash/receivable/accumulated depreciation/loss | Asset cost/gain/output tax | Full source and disposal lineage |
| `PARTNER-APPROPRIATION-v1` | Approved year-end appropriation | Profit appropriation/current account as configured | Partner current/capital as configured | Deed terms and CA policy required; no values inferred |
| `JOB-ALLOCATE-v1` | Approved cost/revenue allocation | No new net debit | No new net credit | Dimension allocation only; totals must equal source line; canonical `ChaJob.id` |

## Currency behavior

- Functional debit/credit is the balancing basis.
- Foreign-currency lines store transaction debit/credit, three-letter currency code, positive approved rate and derived functional amount.
- No binary floating point is permitted.
- Posted rates and calculated values are immutable even if the rate master changes.
- Rounding differences post only to a configured round-off account; they are never hidden by modifying another line.

## Tax behavior

Tax rules are versioned/effective-dated and resolved from registration, place of supply, party treatment, service/HSN-SAC and document date. The catalogue deliberately does not set CGST/SGST/IGST/cess, RCM, TDS or TCS rates or thresholds. Those remain CA/configuration inputs.

## Reversal and correction

- A reversal is a new journal with exact opposite lines and immutable link to the original.
- A correction after reversal is another newly approved source version/posting.
- If the original period is hard locked, reversal posts to the next permitted open period unless a separately approved time-bound reopen is active.
- Reversal creation, source state, journal, audit and outbox event are atomic and idempotent.

## Required tests before Phase 3 completion

- balanced and unbalanced inputs;
- zero, negative and dual-sided lines;
- tenant mismatch on every referenced ID;
- duplicate source/version and idempotency replay;
- closed-period and expired-reopen rejection;
- maker equals checker rejection;
- concurrent posting and numbering;
- functional and foreign-currency rounding;
- reversal/repost lineage and double-reversal prevention;
- protected control-account direct-posting rejection;
- audit/outbox rollback when any posting step fails.

## Phase 3 runtime boundary

`postCanonicalAccountingRequest` is the sole runtime creator of posted journal and GL effects. It accepts request envelope v1, authenticates the user or narrow integration identity from database RBAC, locks the resolved period and number-series row, validates legal entity/currencies/rate evidence/rounding and approval versions/accounts/control rules/dimensions, and requires exact Decimal balance. Snapshot, inbox claim, attempt, number, journal, lines, dimensions, GL projection, audit, processed inbox and outbox are committed in one serializable transaction.

Rule selection fails closed. Each rule ID is registered against an exact journal type and source system/type contract; positive source versions and source approval are mandatory where the registered rule requires them. Callers cannot invent rule identifiers or pair a valid rule with a different source contract.

Canonical accounts must be assigned to the request legal entity and have explicit `AccountingAccountControl`. Foreign-currency lines supply both transaction and base amounts; the engine proves each base amount from the immutable approved rate. Party references resolve to same-organization customer, supplier or employee identities.

Replay of the same idempotency key and canonical payload returns the existing journal. A different payload conflicts. Serializable/unique races are classified for safe retry and cannot create a second journal. No balancing tolerance or silent round-off is applied.

`reverseCanonicalJournal` creates exact opposite lines and retains original request/effective-date, approved FX and dimension lineage. A row lock plus unique reversal invariant prevents double reversal. Closed-period reversal requires the configured next-open-period correction policy. `replaceCanonicalJournal` accepts a separately approved canonical request only after reversal and preserves the original effective date; a partial unique invariant prevents multiple posted replacements.

The legacy `postGLTransactions` and `reverseGLTransactions` functions are fail-closed compatibility sentinels. The architecture test rejects new runtime journal/line/GL writers outside the canonical engine, while permitting only the Accounting draft creator. Database triggers also reject direct draft-to-posted promotion, non-canonical GL inserts and inserted/updated/deleted children or dimensions on posted journals.

## Phase 4 registered document and payment rules

The canonical engine additionally registers exact rule/source/journal triples for sales invoices, purchase bills, customer receipts, vendor payments, payroll payments, payroll corrections, customer credit/debit notes, vendor credit/debit notes, depreciation runs, recurring occurrences and partner appropriations. Registration is not production activation: a missing versioned policy or approved source event fails before a ledger mutation.

Document/payment adapters persist `PENDING_APPROVAL` state and a canonical inbox payload. Approval re-resolves server permissions, rejects maker self-approval and calls the same engine. In the posting transaction the engine marks the matching canonical document/payment posted, links its journal, updates only the compatible legacy projection state, and creates an outbox event. Cancellation and payment reversal call the canonical reversal operation; active allocations are released in the same canonical transaction.

All Phase 4 outbox destinations are deliberately `SYNTHETIC_*`. No production destination or external publisher exists. Production mapping requires a later explicit approval.
