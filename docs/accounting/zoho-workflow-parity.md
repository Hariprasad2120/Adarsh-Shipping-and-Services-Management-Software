# Zoho Workflow Parity — Phase 0

Source: `docs/accounting/sources/Zoho Books Workings.md`. Status is discovery, not policy approval. “Expected Monolith behavior” means the safe parity target subject to Phase 1 decisions; examples/defaults are never automatically company policy.

## Operational workflows and fields

| ID | Source lines | Workflow / named fields and defaults | Existing evidence | Expected Monolith behavior | Status / phase / acceptance |
|---|---:|---|---|---|---|
| ZOHO-CUST-001 | 65-88 | Customer data: type, name, display/company/contact, GST/tax, addresses, phone/email, currency, payment terms, credit limit, bank details, custom fields | `CrmAccount`; Accounting references it | One customer master; finance extensions and effective/audited policy; no duplicate | Partial; decisions 3/4; Phases 1–6; master/tenant/RBAC/reconciliation tests |
| ZOHO-CUST-002 | 89-112 | Quotation: customer, number/date/expiry, salesperson, subject, lines, qty/rate/discount/tax, terms, notes, attachments; conversion | `CrmInvoice(QUOTE)` and `Quotation` duplicate | Canonical versioned quote, approval and quantity/amount conversion lineage; no journal until financial event | Duplicated; DEC-0004; Phases 1,2,5 |
| ZOHO-CUST-003 | 113-137 | Sales invoice: customer, invoice/order/date/due, salesperson, place of supply, lines, GST, discount, shipping/adjustment, payment details, attachments; quotation conversion and immediate-due example | `SalesInvoice` plus CRM invoice path | Accounts-owned accounting invoice created from approved request; exact Decimal/tax snapshots; balanced immutable post | Unsafe/duplicated; DEC-0003/4/5; Phases 4–6 |
| ZOHO-CUST-004 | 138-154 | Customer debit note fields, original invoice, reason, tax and receivable increase semantics | Customer-note model/service | Approved debit-note semantics, original linkage, tax adjustment, posting/reversal and AR reconciliation | Partial/unsafe; DEC-0003; Phase 6 |
| ZOHO-CUST-005 | 155-172 | Customer credit note fields, original invoice, reason, tax, application/refund and receivable reduction | Customer-note model/service | Credit allocation/refund lifecycle with immutable posting and AR/tax reconciliation | Partial/unsafe; Phase 6 |
| ZOHO-VEND-001 | 173-196 | Vendor data: identity/contact/GST/address/currency/terms/bank/custom fields | `CrmVendor` | Single vendor master with controlled finance/bank fields and duplicate/change review | Partial; Phase 3 |
| ZOHO-VEND-002 | 197-220 | Vendor invoice/bill: vendor invoice no/date/due, PO, place of supply, lines, taxes, TDS, charges, attachments | `PurchaseInvoice` | Accounts bill with duplicate vendor-number control, 2/3-way policy, Decimal/tax/TDS snapshots and immutable post | Partial/unsafe; Phases 1,7 |
| ZOHO-VEND-003 | 221-238 | Vendor debit note: vendor/original bill, date/no, reason, items/tax/amount, application | `VendorNote` | Approved vendor-credit/debit semantics, original linkage, allocation/refund and AP/tax reconciliation | Partial/unsafe; DEC-0003; Phase 7 |
| ZOHO-VEND-004 | 239-257 | Recurring expense: profile/vendor/category/amount/tax/frequency/dates/payment account/auto-create/notes | `RecurringExpense` processor | Idempotent scheduled template execution with leases, approvals, retry/dead-letter and exact posting | Unsafe; Phases 7/13 |
| ZOHO-BANK-001 | 258-280 | Bank account details, opening balance, feeds/import, categorize/match/transfer/reconcile | account type BANK; bank-transfer action | Secure bank master, statement import, deterministic/manual matching, reconciliation session and audit | Mostly missing; Phase 8 |
| ZOHO-BANK-002 | 281-298 | Cash accounts/transactions/opening balance, transfers and reporting | account type CASH; GL reports | Controlled cashbook, receipts/payments/transfers, approvals and cash reconciliation | Partial; Phase 8 |
| ZOHO-ACC-001 | 299-320 | Manual journal: number/date/reference, currency/rate, accounts, debit/credit, contact, tax, project, notes/attachments | Journal screen/service | Server-derived balanced Decimal journal, approval, period lock, immutable posting/reversal, dimensions | Unsafe; Phases 2/4 |
| ZOHO-ACC-002 | 321-338 | Recurring journal: profile, frequency/start/end/next date, template lines, notes | Recurring journal model/processor | Idempotent scheduler, approval, durable occurrence key, retries and reconciliation | Unsafe; Phases 4/13 |
| ZOHO-LOCK-001 | 339-354 | Lock date/type/reason/password override and exceptions | `TransactionLock` | Period/fiscal close with role/step-up approval, no reusable password, auditable reopen/adjustment | Unsafe; DEC-0009; Phases 1/4 |
| ZOHO-COA-001 | 355-372 | Chart: type/name/code/description/parent/currency/balance/active, system accounts | `Account`, seed | Versioned hierarchical COA, locked control accounts, opening journals, safe inactivation not deletion | Partial/unsafe; Phases 2/3 |
| ZOHO-ASSET-001 | 373-395 | Fixed asset: code/name/class/date/cost/supplier, depreciation method/rate/life, accumulated/NBV, account mapping/location/status/disposal | shared `Asset`, depreciation entries | AMS candidate → Accounts register; Decimal books, capitalization, depreciation, impairment/disposal and GL tie-out | Partial/conflicting; DEC-0007; Phase 10 |
| ZOHO-PARTNER-001 | 396-414 | Partner capital/current, profit share, salary, interest, drawings and appropriations | `PartnerAccount` | Policy/effective-date controlled partner register and approved appropriation journals | Premature/unsafe; DEC-0011; Phase decision |
| ZOHO-JOB-001 | 415-434 | Job register: code/name/customer/type/status/dates, income/expense allocation, salesperson/manager, notes and profitability | `ChaJob`, `JobCosting` | CHA/project master mapped once to accounting dimensions; source docs and GL reconcile by job | Duplicated/partial; DEC-0008; Phases 3/12 |

## Named report parity (all 24 entries)

All reports must be server-authorized, tenant/branch scoped, paginated/export-controlled, Decimal-safe, and reconcile to the canonical GL/subledger as-of semantics.

| ID | # / source | Report and named output | Current state | Target evidence / phase |
|---|---|---|---|---|
| ZOHO-REPORT-001 | 1, 437-442 | Profit and Loss: period income/expenses/net result | Exists; Number-based | GL tie-out and exact Decimal comparative/as-of tests; Phase 11 |
| ZOHO-REPORT-002 | 2, 443-448 | Balance Sheet: assets/liabilities/equity | Exists; tolerance-based | Equation and retained-result tie-out; Phase 11 |
| ZOHO-REPORT-003 | 3, 449-454 | Trial Balance: opening/debit/credit/closing | Exists; Number-based | Every account and total balances exactly; Phase 4/11 |
| ZOHO-REPORT-004 | 4, 455-460 | Cash Flow Statement | Missing | Approved direct/indirect method and GL-derived evidence; Phase 11 |
| ZOHO-REPORT-005 | 5, 461-466 | AR Ageing Summary | Partial | Invoice/credit/allocation/control-account reconciliation and bucket tests; Phase 6/11 |
| ZOHO-REPORT-006 | 6, 467-472 | AP Ageing Summary | Partial | Bill/credit/allocation/control-account reconciliation and bucket tests; Phase 7/11 |
| ZOHO-REPORT-007 | 7, 473-478 | Sales Register | Partial | Posted/void/credit/tax totals tied to source and GL; Phase 6/11 |
| ZOHO-REPORT-008 | 8, 479-484 | Customer Debit Note Register | Missing/partial model | Original link/status/tax/AR tie-out; Phase 6/11 |
| ZOHO-REPORT-009 | 9, 485-490 | Customer Credit Note Register | Missing/partial model | Application/refund/tax/AR tie-out; Phase 6/11 |
| ZOHO-REPORT-010 | 10, 491-496 | Purchase Register | Partial | Bills/voids/credits/tax totals tied to AP/GL; Phase 7/11 |
| ZOHO-REPORT-011 | 11, 497-502 | Vendor Debit Note Register | Missing/partial model | Original link/application/tax/AP tie-out; Phase 7/11 |
| ZOHO-REPORT-012 | 12, 503-508 | GSTR-1 Summary | Partial summary only | Tax-professional approved invoice/credit/CDN/HSN reconciliation; Phase 9 |
| ZOHO-REPORT-013 | 13, 509-514 | GSTR-2B Summary | Partial/non-canonical | Import/match/eligibility variance and purchase/tax-ledger reconciliation; Phase 9 |
| ZOHO-REPORT-014 | 14, 515-520 | GSTR Summary | Partial | Registration/period return summary tied to tax ledgers; Phase 9 |
| ZOHO-REPORT-015 | 15, 521-526 | Ledger Statement | General ledger exists | Opening/movements/closing, party/account filters and exact GL tie-out; Phase 11 |
| ZOHO-REPORT-016 | 16, 527-532 | Job Register | Partial/duplicated | Canonical job master, statuses and source/GL references; Phase 12 |
| ZOHO-REPORT-017 | 17, 533-538 | Job Wise Profit Report | Partial | Revenue/cost/accrual/allocation completeness and GL reconciliation; Phase 12 |
| ZOHO-REPORT-018 | 18, 539-544 | Sales by Customer | Missing | Posted net sales/credits by canonical customer; Phase 11 |
| ZOHO-REPORT-019 | 19, 545-550 | Sales by Charges | Missing | Charge/account/tax mapping and GL tie-out; Phase 11 |
| ZOHO-REPORT-020 | 20, 551-556 | Purchase by Vendor | Missing | Posted net purchases/credits by canonical vendor; Phase 11 |
| ZOHO-REPORT-021 | 21, 557-562 | Purchase by Charges | Missing | Charge/account/tax mapping and GL tie-out; Phase 11 |
| ZOHO-REPORT-022 | 22, 563-568 | Day Book | Partial | Chronological posted facts with reversal lineage and exact totals; Phase 11 |
| ZOHO-REPORT-023 | 23, 569-574 | Journal Report | Partial | Journal header/line/status/source/reversal audit and balance; Phase 4/11 |
| ZOHO-REPORT-024 | 24, 575-579 | Ledger Statement (duplicate title) | Same as #15; ambiguous | `DEC-0002` must identify intended distinct report; acceptance then assigned |
