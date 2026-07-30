# Accounting Phase 5 Operational UI and Application Integration

Status: implemented locally on 2026-07-30; guarded verification evidence is recorded below after execution.

Scope: additive operational UI on the accepted Phase 2–4 Accounting kernel. This phase does not authorize production, Neon, Zoho, external providers, real data, port 5432, deployment, or Phase 6 cutover.

## UI architecture

- `operational-auth.ts` performs authentication and route permission checks before operational page queries.
- `operational-access.ts` is the single Accounting route-to-permission map used by the layout and tests.
- `operational-queries.ts` contains bounded, organization-scoped read models. Monetary values cross the server/component boundary as exact decimal strings.
- `operational-actions.ts` exposes only canonical prepare/approve/post/reject/reverse/outbox operations. UI code does not create or edit posted journals, journal lines, GL facts, canonical allocations, or canonical posting state directly.
- `accounting-operational-views.tsx` and `accounting-operational-actions.tsx` provide the shared registers, detail views, policy gates, reason dialogs, row-version controls, and exact money display.
- Existing Monolith tokens and production primitives remain the only presentation system. The protected `/dashboard` design is unchanged.

## Route and permission map

| Route | Purpose | Server permission gate | Mutation boundary / state |
|---|---|---|---|
| `/accounting` | Operational counts, attention queues, audit activity | dashboard, document, payment, or ledger read | Read-only; no invented P&L or cash KPI |
| `/accounting/approvals` | Document, payment, and manual-journal checker inbox | relevant document/payment/journal approval | Per-record review only; no bulk post |
| `/accounting/sales-invoices` | Compatibility drafts plus canonical sales register | document/invoice read or sales prepare | Draft create → `prepareLegacySalesInvoice`; canonical approval/post |
| `/accounting/purchase-invoices` | Compatibility drafts plus canonical purchase register | document/invoice read or purchase prepare | Draft create → `prepareLegacyPurchaseInvoice`; canonical approval/post |
| `/accounting/documents/[id]` | Immutable canonical document, lines, journal, audit, correction/allocation lineage | document read/approve or invoice read | approve/reject/reverse through document adapters with expected version |
| `/accounting/customer-receipts` | Canonical customer receipt register | payment read or receipt prepare | Draft → `prepareLegacyPayment`; no external payment claim |
| `/accounting/vendor-payments` | Canonical vendor-payment register | payment read or payment prepare | Draft → `prepareLegacyPayment`; Accounting posting is distinct from transfer execution |
| `/accounting/payments` | All canonical payments | payment read/prepare/approve | Read and drill-down; draft compatibility route redirects |
| `/accounting/payments/[id]` | Payment, exact allocations, journal, audit, reversal lineage | payment read/approve | approve/reject/reverse through payment adapters with expected version |
| `/accounting/allocations` | Active and reversed canonical allocations | payment read or allocate | Read-only; posted allocations are not edited |
| `/accounting/credit-notes` | Customer correction register | document read or credit-note prepare | Original invoice remains immutable; linked correction only |
| `/accounting/debit-notes` | Vendor correction register | document read or debit-note prepare | Read-only; creation remains gated because no accepted vendor caller exists |
| `/accounting/journal-entries` | Canonical and compatibility journal register | journal or ledger read | Manual draft allowed only through accepted draft creator |
| `/accounting/journal-entries/[id]` | Read-only exact journal, source, audit, reversal/replacement lineage | journal or ledger read | A separate journal approver may invoke the canonical engine; no line editing |
| `/accounting/general-ledger` | Account/date-filtered GL inquiry with deterministic running balance | ledger read or reports view | Read-only, paginated, exact Decimal carry across pages |
| `/accounting/recurring` | Scheduled occurrence register | recurring template/process | Read-only occurrence state; financial generation remains policy-gated |
| `/accounting/depreciation` | AMS source readiness and policy gate | depreciation integration | No calculation or financial mutation without approved book policy |
| `/accounting/partners` | Partner source readiness and policy gate | partner transaction prepare | No inferred deed terms, tax, calculation, or financial mutation |
| `/accounting/outbox` | Canonical publication state | audit read or outbox control | Audited retry/review only; immutable payload and expected version |
| `/accounting/manual-review` | Failed/dead-letter/manual-review events | manual-review permission | Reason-coded operational state only |
| `/accounting/configuration` | Legal entity, period, currency, policy, series, and gate readiness | settings/control administration | Read-only Phase 5 overview; existing configuration mutations remain separately permissioned |
| `/accounting/access-denied` | Non-disclosing permission-denied state | authenticated layout exception | No data access |

Existing Chart of Accounts, Items, Trial Balance, Profit & Loss, Balance Sheet, CRM commercial documents, orders, and legacy Settings routes remain discoverable under their existing permissions. They are compatibility/product routes, not alternate canonical financial writers.

## Lifecycle and control matrix

| Workflow | Draft / prepare | Independent action | Posted effect | Correction |
|---|---|---|---|---|
| Sales invoice | Exact monetary strings; tenant customer/account/config validation; draft only | document + sales approval + post; maker differs | canonical document journal | reasoned linked reversal/correction |
| Purchase invoice | Exact monetary strings; tenant supplier/account/config validation; draft only | document + purchase approval + post; maker differs | canonical document journal | reasoned linked reversal/correction |
| Customer receipt | Exact amount/allocation strings; target party, tenant, status, and capacity validation | payment approval + payment post; maker differs | canonical payment journal and frozen allocations | linked payment reversal releases active allocations |
| Vendor payment | Same as receipt; bank transfer execution is not inferred | payment approval + payment post; maker differs | canonical payment journal only | linked payment reversal |
| Manual journal | Exact balanced strings; active tenant accounts and branch | journal approval + post; maker differs; expected row version | canonical posting engine only | canonical journal reversal/replacement |
| Outbox | Immutable event already exists | retry or manual review with stable reason code and expected version | no financial mutation | state transition is audited; payload is unchanged |

Posted document, payment, allocation, journal, and GL facts have no edit UI. Rejection is a terminal, audited pre-posting state transition and creates no journal or ledger fact.

## Existing-route convergence

| Compatibility route | Canonical convergence |
|---|---|
| `/accounting/payment-entries` | Redirects to `/accounting/payments` |
| `/accounting/sales-invoices/[legacyId]` | Draft remains preparable; once canonical, redirects to `/accounting/documents/[id]` |
| `/accounting/purchase-invoices/[legacyId]` | Draft remains preparable; once canonical, redirects to `/accounting/documents/[id]` |
| `/accounting/payment-entries/[legacyId]` | Draft remains preparable; once canonical, redirects to `/accounting/payments/[id]` |
| manual journal draft | Appears in journal register and approval inbox; checker action posts through the canonical engine |

Immediate-post checkboxes and success messages were removed. Draft creation services no longer contain their unreachable direct financial writer branches.

## Explicit policy gates

- Quotation-to-invoice conversion: accepted immutable quotation version and conversion policy absent.
- Vendor note creation: canonical adapter exists, accepted runtime caller absent.
- General payment: common contract exists, no approved product entry point.
- Depreciation: Finance/CA book, rate/life/method/residual, account, rounding, and correction policy absent.
- Recurring financial generation: catch-up/skip/template approval and generated-document rules absent.
- Partner transactions: effective deed terms, limits, tax, accounts, and approval policy absent.
- Production outbox publication: destination/provider/credentials/monitoring/consumer contract absent.
- External payment execution: no supported bank processor state or evidence contract.

These gates block only the affected action; they do not hide valid read-only evidence or stop unrelated Accounting workflows.

## Data, migration, rollback, and backup

- No schema change or database migration is required by Phase 5.
- No real-data migration or production reconciliation was started.
- Legacy visual sources were backed up at `OLD UI code/legacy-ui-before-accounting-phase5-2f37936.zip` before UI removal/replacement.
- Rollback is application-level: remove the Phase 5 routes/shared UI and restore the backed-up compatibility visual sources. Canonical Phase 2–4 rows remain intact and readable; posted facts are never deleted or rewritten.

## Verification evidence

Recorded from the exact guarded commands in this implementation session:

- TypeScript: `npx tsc --noEmit --pretty false` passed after the final code changes.
- ESLint: all new Phase 5 routes, modules, components, tests, navigation,
  catalogue source, and static verifier passed. The legacy `actions.ts` and
  `service.ts` still report their documented pre-existing `no-explicit-any`
  debt when linted as complete files; no file-wide suppression was added.
- Focused Phase 5 tests: 46/46 passed across exact-money, access, UI
  architecture, posting boundary, contracts, outbox, and money suites.
- Complete Accounting suite: 52/52 passed across eight files.
- Complete repository suite: 342/345 passed. The only failures are the same
  three documented pre-existing CHA cases: Drive checklist attachment
  availability, estimated filing date expectation, and direct-delete audit
  event expectation.
- Production build: passed under the guarded staging environment; 342 pages
  generated, including all 48 Accounting routes. The existing non-fatal
  customer-portal NFT trace warning remains.
- Guarded synthetic staging: exact loopback marker/name/user health passed; 59
  migrations are current; staging verification passed; bounded application
  startup returned HTTP 307 and released port 3100.
- Static Accounting UI verifier: passed for all 48 routes, shared controls,
  responsive styles, protected workflow signals, and both backup checksums.
- Product catalogue: regenerated from 248 app routes and 212 API routes;
  catalogue validation passed with 0 errors and 0 warnings.
- Prisma validation: the existing schema is valid; Phase 5 adds no schema or
  migration change, and guarded staging reports all 59 migrations current.
- Changed-file safety scan: 62 text files checked, with no secret-pattern hit
  and no forbidden generated, environment, credential, report, or key artifact.
- Browser/theme/viewport/accessibility: blocked because browser discovery
  returned no available in-app or attached browser (`[]`). No unrelated
  browser surface was substituted, so visual verification is not claimed.
- `git diff --check`: passed; final worktree/head/stage evidence is recorded in
  the session handoff and final implementation report.
