# Accounting Phase 9 Task Tracker

Last updated: 2026-07-31

## Overall Phase 9 progress

`[████████████████████░░░░] 75%`

- Completed: 75%
- Remaining: 25%
- Status: In progress

## Current Slice 9.13 progress

`[██████████████████░░░░░░] 72%`

- Completed: 72%
- Remaining: 28%
- Status: In progress

## Completed in this branch so far

- Slice 9.1 capability-policy registry
- Capability-policy admin workspace
- Configuration admin workspace foundation
- Organisation accounting profile
- Legal entities
- GST registrations
- Fiscal years
- Accounting periods
- Period lock / reopen workflow
- Currency configuration
- Exchange-rate draft / approval evidence
- Dimension definitions
- Dimension values
- Number series
- Approval policies
- Chart-of-accounts controls
- Counterparty-to-legal-entity scopes
- Document / payment policy administration
- Integration destinations in disabled state
- Configuration comparison views
- Configuration audit feed
- Slice 9.2 complete
- Slice 9.3 foundation started: tax profiles and tax rules/components
- Slice 9.3 statutory reporting controls: return profiles and filing periods
- Slice 9.3 resolver layer: active tax/statutory configuration selection and GST report gating
- Slice 9.3 document preparation bridge: resolver-backed tax gating for canonical sales and purchase preparation
- Slice 9.3 complete
- Slice 9.4 foundation started: bank accounts, statement import register, and reconciliation-session models/admin visibility
- Slice 9.4 complete: verified statement import workflow, normalized statement-line capture, reconciliation sessions, and controlled bank-match administration
- Slice 9.5 foundation started: canonical recurring template, schedule, and run schema/migration base
- Slice 9.5 complete: recurring template administration, recurring schedules, run register controls, and generation-policy metadata wiring
- Slice 9.6 complete: canonical financial assets, asset books, depreciation-run register, and policy-control administration without enabling legacy direct depreciation posting
- Slice 9.7 complete: canonical partner master, effective-dated partner terms, and appropriation-control administration without enabling legacy partner posting
- Slice 9.8 complete: canonical budget headers, scenario/version controls, active-version management, and account/dimension budget lines without enabling journal-writing behavior
- Slice 9.9 complete: canonical customer/vendor finance profiles, control-account and currency metadata, and contained admin visibility without enabling duplicate subledger posting paths
- Slice 9.10 complete: source-mapping profiles plus inbound/outbound/posting/payroll integration evidence visibility
- Slice 9.11 complete: period close runs and report export profiles
- Slice 9.12 complete: portal publication profiles and final configuration-admin Phase 9 closing controls

## Active 9.13 work in this branch

- Continued the 9.14 Sales lifecycle slice by adding a server-authoritative quotation lifecycle foundation:
  - additive quotation lifecycle, snapshot, approval, send, decision, and conversion-lineage schema fields;
  - exact-decimal quotation line/totals calculation;
  - draft save, clone, approval, send, accept/decline, expiry, and partial quotation-to-sales-invoice conversion services;
  - matching quotation server actions and route-level permissions.
- Reworked the active Monolith quotations route so it now uses `requireAccountingRouteAccess`, keeps the current create flow compatible with the new quotation payload shape, links list rows into a dedicated quotation detail route, and exposes lifecycle actions plus partial conversion inputs on `/accounting/quotations/[id]`.
- Verified the current quotation slice with:
  - `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`
  - `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`
  - `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/accounting/quotations/page.tsx' 'src/app/(dashboard)/accounting/quotations/quotations-client.tsx' 'src/app/(dashboard)/accounting/quotations/[id]/page.tsx' 'src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx' 'src/modules/accounting/quotations.ts'`
  - `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`
  - `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:verify`
- Current non-code blockers/findings for this slice:
  - `npm run build` is blocked by a locked `.next\\monolith-dev-3.stderr.log` while the local app remains live on `http://localhost:3000`;
  - `npm run accounting:phase9:safety-scan` still fails on pre-existing repository findings in `.env.staging.example`, `OLD UI code/.../service.ts`, and `src/modules/accounting/service.ts`;
  - authenticated browser verification remains unavailable in this Codex session because no browser backend is exposed.

- Read the full attached accounting build specification end to end through DOCX XML extraction.
- Re-opened Phase 9 tracking after the stale 9.12-only completion claim.
- Started the required 9.13 shared commercial master-data foundation.
- Added additive Prisma schema and migration foundation for:
  - `AccountingPaymentTerm`
  - `AccountingPaymentMethod`
  - `AccountingPriceList`
  - `AccountingUnitOfMeasure`
  - `AccountingReportingTag`
- Wired those five new masters through the existing Accounting configuration-admin snapshot, server actions, and Monolith admin workspace.
- Added additive persisted `AccountingItemMaster` schema and migration foundation.
- Added authenticated Accounting item-master API routes for list, detail, create, status updates, and deletes.
- Replaced the Monolith `/accounting/items` register, create form, and detail flow with the persisted Accounting item master.
- Switched the Monolith Accounting invoice form and commercial document form to load live Accounting catalogue items instead of the local mock/localStorage store.
- Switched new Accounting sales invoices, purchase invoices, credit notes, and debit notes to source units of measure from `AccountingUnitOfMeasure` and payment terms from `AccountingPaymentTerm` instead of hardcoded terms and the generic `Unit` table.
- Switched new Accounting sales invoices, purchase invoices, credit notes, and debit notes to source payment methods from `AccountingPaymentMethod`, and added additive canonical `paymentMethod` persistence on `SalesInvoice`, `PurchaseInvoice`, `CustomerNote`, and `VendorNote`.
- Switched Accounting commercial document entry for sales orders and purchase orders to consume `AccountingPaymentTerm` and `AccountingPriceList`, and fixed CRM commercial document creation so selected terms now persist through the existing `CrmInvoice.terms` field.
- Started the 9.14 Sales lifecycle continuation by replacing the gated quotation conversion placeholder with a working quotation-to-draft-sales-invoice flow, and fixed the quotations workspace subtotal/status handling so converted and newly created quotations render correctly.
- Continued the quotations workspace so it now consumes live `AccountingPaymentTerm` options and the persisted `AccountingItemMaster` catalogue for line suggestions/default rates instead of staying fully manual.
- Started the required Phase 9 specification traceability document for slices 9.13 through 9.23.

## Remaining major Phase 9 slices after 9.12

- Slice 9.13 shared commercial master data
- Slice 9.14 complete Sales lifecycle
- Slice 9.15 complete Purchases lifecycle
- Slice 9.16 generic approval workflow engine expansion
- Slice 9.17 templates, communication, and portal workflows
- Slice 9.18 multi-currency, subaccounts, locking, and tax settlement
- Slice 9.19 custom fields, custom modules, and automation
- Slice 9.20 dashboard, complete reports, and report builder
- Slice 9.21 optional inventory and fulfilment capability
- Slice 9.22 API and integration surface
- Slice 9.23 specification-derived tests

## Next target

Continue 9.14 Sales lifecycle coverage from the working quotation conversion path, while still closing the remaining 9.13 shared-commercial pricing/rate gaps.

## Notes

- Progress is an engineering estimate, not a claim of acceptance completion.
- No production deployment has been performed.
- No historical accounting migration has been run.
- Authenticated browser verification is still blocked in the current Codex session because the browser runtime reports zero available browser backends even though the local app itself is healthy on `http://127.0.0.1:3000`.
- The Monolith Accounting item catalogue now persists through the database-backed `AccountingItemMaster`; invoice/note entry now consumes Accounting payment-term, payment-method, and unit-of-measure masters with additive canonical `paymentMethod` persistence; and commercial order entry now consumes Accounting payment terms and price lists. Broader shared-commercial parity is still incomplete because effective-dated pricing/rate behavior and the later Sales, Purchases, communications, API, and specification-derived test slices remain open.
