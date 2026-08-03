# Monolith UI migration status

Last updated: 2026-08-01

## 2026-08-01 Accounting demo bootstrap and setup-guide continuation

Added a dedicated Accounting-only demo bootstrap, surfaced it in Admin
Settings, and expanded the Product Catalogue with a detailed Accounting setup
and first-month operating guide.

Delivered:

- added `src/modules/accounting/demo.ts` so Admin can seed an idempotent July
  2026 Accounting walkthrough into the current organisation, including
  dedicated demo maker/approver users, bank metadata, demo customer/vendor
  masters, posted sales and purchase documents, posted customer/vendor
  payments, and posted manual journals;
- extended `src/modules/accounting/actions.ts` with
  `seedAccountingDemoMonthAction`, then updated
  `src/app/(dashboard)/admin/settings/page.tsx`,
  `src/app/(dashboard)/admin/settings/settings-client.tsx`, and
  `src/components/monolith/admin-workspace.tsx` so Admin Settings now exposes a
  clear Accounting demo button plus run-summary feedback;
- hardened `src/modules/accounting/legacy-bootstrap.ts` so organisations now
  auto-create missing `AccountingAccountControl` rows for active posting
  ledgers, while only the configured trade receivable/payable control accounts
  require party references by default;
- expanded `src/lib/catalogue-data.ts` and
  `src/app/(dashboard)/product-catalogue/page.tsx` so the Accounting module now
  includes a detailed organisation setup sequence, July 2026 demo runbook, and
  working-check checklist inside the Product Catalogue.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/demo.ts' 'src/modules/accounting/legacy-bootstrap.ts' 'src/app/(dashboard)/admin/settings/page.tsx' 'src/app/(dashboard)/admin/settings/settings-client.tsx' 'src/components/monolith/admin-workspace.tsx' 'src/app/(dashboard)/product-catalogue/page.tsx' 'src/lib/catalogue-data.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- live demo bootstrap run against `hr@adarshshipping.in`'s organisation
  (`cmr4m8jb10000ysbwuoj2bvvx`) via `seedAccountingDemoMonth(...)`: passed and
  reported 2 posted canonical documents, 2 posted payments, 3 posted manual
  journals, and balanced July totals of debit `892850.00` and credit
  `892850.00`;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed; Turbopack
  still reports the existing unrelated NFT tracing warning through
  `next.config.ts` and
  `src/app/api/customer-portal/document-versions/[id]/route.ts`, but the build
  completed successfully.

Open follow-up:

- the new Accounting demo currently seeds the active organisation rather than
  provisioning a separate switchable workspace/org shell;
- `src/modules/accounting/actions.ts` still carries the repository's existing
  broad `@typescript-eslint/no-explicit-any` lint debt, unchanged by this
  slice.

## 2026-08-01 Accounting FX revaluation draft continuation

Completed the last open 9.18 Accounting FX automation gap by turning close-date
review into a controlled draft-journal workflow instead of leaving it as
manual-only evidence.

Delivered:

- extended `src/modules/accounting/foreign-exchange.ts` so close runs can now
  resolve configured FX gain/loss posting accounts, convert realized and
  unrealized review rows into balanced journal lines, create a normal draft
  journal through the existing maker-checker journal service, and persist the
  draft lineage/status back onto the close run;
- updated `src/app/(dashboard)/accounting/currency-adjustments/page.tsx` so
  the close-run table now uses the richer FX workspace data, supports `Refresh
  FX review`, allows `Create FX draft` after review evidence exists, and links
  directly to the resulting journal detail route;
- added focused unit coverage in
  `src/modules/accounting/__tests__/foreign-exchange.test.ts` for happy-path
  draft creation and missing-account safeguards;
- added `vitest.unit.config.ts` so mocked unit suites like the new FX draft
  coverage can run locally without requiring the repository's staging-database
  Vitest bootstrap.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/foreign-exchange.ts' 'src/app/(dashboard)/accounting/currency-adjustments/page.tsx' 'src/modules/accounting/__tests__/foreign-exchange.test.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run --config vitest.unit.config.ts src/modules/accounting/__tests__/foreign-exchange.test.ts src/modules/accounting/__tests__/tax-settlement.test.ts src/modules/accounting/__tests__/phase9-late-slices.test.ts --reporter verbose`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed; Turbopack
  still reports the existing unrelated NFT tracing warning through
  `next.config.ts` and
  `src/app/api/customer-portal/document-versions/[id]/route.ts`, but the build
  completed successfully.

Open follow-up:

- browser verification remains intentionally skipped for the remaining Phase 9
  slices per current instruction;
- Phase 9 implementation is now complete through 9.23, with only optional
  authenticated browser QA left if a browser backend returns in a later
  session.

## 2026-08-01 Accounting foreign-exchange review continuation

Continued the remaining 9.18 Accounting FX parity by adding realized and
unrealized review behavior on top of the earlier currency-control and
tax-settlement workspaces.

Delivered:

- added `src/modules/accounting/foreign-exchange.ts` so Accounting can now
  compute open foreign-currency revaluation exposure from approved historical
  and latest FX rates, compute realized settlement variance from actual
  payment allocations, and record a close-run FX review snapshot into
  `AccountingPeriodCloseRun`;
- updated `src/app/(dashboard)/accounting/currency-adjustments/page.tsx` so
  the route now shows unrealized and realized FX review tables plus a
  controlled `Record FX review` action for open, ready, and reopened close
  runs;
- tightened `src/modules/accounting/tax-settlement.ts` so final close now
  requires a matching FX review snapshot when foreign-currency exposure or
  settlement variance exists for the close date;
- extended `src/modules/accounting/phase9-workspaces.ts` and
  `src/modules/accounting/__tests__/tax-settlement.test.ts` so row-version and
  guarded close behavior stay covered.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/foreign-exchange.ts' 'src/modules/accounting/tax-settlement.ts' 'src/app/(dashboard)/accounting/currency-adjustments/page.tsx' 'src/modules/accounting/phase9-workspaces.ts' 'src/modules/accounting/__tests__/tax-settlement.test.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/modules/accounting/__tests__/tax-settlement.test.ts' 'src/modules/accounting/__tests__/phase9-late-slices.test.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed; Turbopack
  still reports the existing unrelated NFT tracing warning through
  `next.config.ts` and
  `src/app/api/customer-portal/document-versions/[id]/route.ts`, but the build
  completed successfully.

Open follow-up:

- browser verification remains intentionally skipped for the remaining Phase 9
  slices per current instruction;
- the main remaining 9.18 FX gap is now automatic journalized revaluation
  posting rather than realized/unrealized review and close-evidence control.

## 2026-08-01 Accounting tax-settlement behavior continuation

Continued the 9.18 Accounting parity work by adding operational filing-period
and period-close transitions on top of the earlier tax-settlement visibility
workspace.

Delivered:

- added `src/modules/accounting/tax-settlement.ts` so statutory filing periods
  can now move through guarded `OPEN -> READY -> FILED` transitions with
  report-availability checks, live report snapshots, acknowledgement-reference
  enforcement, audit logging, and row-version protection;
- added guarded close-run transitions so period-close runs can now move through
  `OPEN/REOPENED -> READY -> CLOSED` and `CLOSED -> REOPENED`, with blocking
  checks for overlapping open filing periods and missing transaction-lock
  coverage before final close;
- updated `src/app/(dashboard)/accounting/tax-settlement/page.tsx` so Finance
  operators can now execute those controlled filing and close transitions
  directly from the live settlement workspace instead of returning to
  configuration-admin CRUD;
- extended `src/modules/accounting/phase9-workspaces.ts` and added
  `src/modules/accounting/__tests__/tax-settlement.test.ts` so row-version
  data and focused transition coverage back the new operational behavior.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/tax-settlement.ts' 'src/app/(dashboard)/accounting/tax-settlement/page.tsx' 'src/modules/accounting/__tests__/tax-settlement.test.ts' 'src/modules/accounting/phase9-workspaces.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/modules/accounting/__tests__/tax-settlement.test.ts' 'src/modules/accounting/__tests__/phase9-late-slices.test.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed; Turbopack
  still reports the existing unrelated NFT tracing warning through
  `next.config.ts` and
  `src/app/api/customer-portal/document-versions/[id]/route.ts`, but the build
  completed successfully.

Open follow-up:

- browser verification remains intentionally skipped for the remaining Phase 9
  slices per current instruction;
- the main remaining 9.18 gap is now deeper foreign-exchange parity, especially
  realized/unrealized revaluation behavior, rather than missing filing / close
  transition controls.

## 2026-08-01 Banking overview and account workspace foundation

Extended the existing `/accounting/banking` route into a real Banking
workspace backed by `AccountingBankAccount`, posted ledger balances, and the
existing accounting configuration and permission boundaries.

Delivered:

- added `src/modules/accounting/banking-service.ts`,
  `src/modules/accounting/banking-actions.ts`, and
  `src/modules/accounting/banking-shared.ts` so Banking now has a dedicated
  service boundary for overview filters, money aggregation, account metadata
  management, inactive-account handling, and account transaction workspace
  queries;
- rebuilt `src/app/(dashboard)/accounting/banking/page.tsx` and
  `src/app/(dashboard)/accounting/banking/banking-client.tsx` so the Banking
  overview now shows real Cash in Hand and Bank Balance summaries, server-fed
  search/date/status filters, Amount in Bank vs Amount in Books separation,
  masked identifiers, active/inactive state, and working `Edit account`,
  `View transactions`, and `Mark inactive` actions only;
- added `src/app/(dashboard)/accounting/banking/[bankAccountId]/page.tsx` and
  `bank-account-client.tsx` so each bank account now has a transaction
  workspace with real posted-book rows, stable running balances with opening
  carry-forward, reference links back to source accounting records, and the
  same safe edit/inactivate controls;
- reused the existing `saveAccountingBankAccount` configuration path rather
  than creating a duplicate Banking persistence workflow, and preserved the
  existing Banking foundation migration without modification;
- added focused Banking tests in
  `src/modules/accounting/__tests__/banking-service.test.ts` and
  `src/app/(dashboard)/accounting/banking/banking-client.test.tsx`.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/banking-shared.ts' 'src/modules/accounting/banking-service.ts' 'src/modules/accounting/banking-actions.ts' 'src/modules/accounting/__tests__/banking-service.test.ts' 'src/app/(dashboard)/accounting/banking/page.tsx' 'src/app/(dashboard)/accounting/banking/banking-client.tsx' 'src/app/(dashboard)/accounting/banking/banking-client.test.tsx' 'src/app/(dashboard)/accounting/banking/[bankAccountId]/page.tsx' 'src/app/(dashboard)/accounting/banking/[bankAccountId]/bank-account-client.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/modules/accounting/__tests__/banking-service.test.ts' 'src/app/(dashboard)/accounting/banking/banking-client.test.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed; Turbopack
  still reports the existing unrelated NFT tracing warning through
  `next.config.ts` and
  `src/app/api/customer-portal/checklist-files/[id]/route.ts`, but the build
  completed successfully.

Open follow-up:

- this slice intentionally did not start real bank connectors, statement inbox,
  rule engine, reconciliation, deposit capture, or automatic import flows
  because those backing services are not yet implemented in this repository;
- Banking account creation in this pass stays constrained to existing
  `AccountingBankAccount` fields and configuration metadata, with book balances
  continuing to come only from posted ledger activity.

## 2026-08-01 Accounting dashboard late-phase visibility continuation

Continued the 9.20 to 9.23 acceptance work by upgrading the main Accounting
landing route so the newer statutory, reporting, integration, and
customization slices are visible from `/accounting` instead of only through
their leaf workspaces.

Delivered:

- updated `src/app/(dashboard)/accounting/page.tsx` so the dashboard now loads
  live summaries from the currency-control, tax-settlement, report-builder,
  integrations, and customization workspaces in parallel with the existing
  operational queue metrics;
- added a Phase 9 controls metric band for foreign-currency subledgers, open
  filing periods, active export profiles, active source mappings, and active
  custom metadata;
- added dashboard tables for connected late-phase workspaces and recent
  statutory filing / close checkpoints so the Finance landing route reflects
  the broader Phase 9 surface area instead of only core drafts/approvals/audit
  queues.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/accounting/page.tsx' 'src/modules/accounting/phase9-workspaces.ts' 'src/app/(dashboard)/accounting/currency-adjustments/page.tsx' 'src/app/(dashboard)/accounting/tax-settlement/page.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/modules/accounting/__tests__/operational-access.test.ts' 'src/modules/accounting/__tests__/operational-ui.architecture.test.ts' 'src/modules/accounting/__tests__/phase9-late-slices.test.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed.

Open follow-up:

- browser verification remains intentionally skipped for the remaining Phase 9
  slices per current instruction;
- the remaining work is now mostly in deeper behavioral parity and final
  specification-derived acceptance coverage rather than missing dashboard
  visibility for the late-phase routes.

## 2026-08-01 Accounting tax-settlement and currency-control continuation

Continued the 9.18 Accounting parity work by turning the earlier accountant
foundations into live operational control surfaces for FX visibility,
statutory filing checkpoints, and close-control review.

Delivered:

- extended `src/modules/accounting/phase9-workspaces.ts` with
  `getAccountingCurrencyControlWorkspace()` and
  `getAccountingTaxSettlementWorkspace()` so Accounting can now load
  functional-currency settings, foreign-currency customer/vendor profiles,
  recent period-close runs, filing periods, validated tax profile counts, GST
  summary snapshots, and current transaction-lock dates from one late-phase
  workspace layer;
- upgraded `src/app/(dashboard)/accounting/currency-adjustments/page.tsx` so
  the route now shows foreign-currency subledger visibility and recent close
  checkpoints instead of only static configuration evidence;
- added `src/app/(dashboard)/accounting/tax-settlement/page.tsx` as a live
  Monolith tax-settlement workspace with registration metrics, filing-period
  tables, GST report snapshots, current lock-date visibility, and workflow
  connectors into reports, transaction locking, configuration admin, and
  currency controls;
- updated `src/components/monolith/accounting-workspace.tsx`,
  `src/lib/navigation.ts`, and
  `src/modules/accounting/operational-access.ts` so
  `/accounting/tax-settlement` behaves as a first-class Accounting route;
- updated `src/modules/accounting/__tests__/operational-access.test.ts` and
  `src/modules/accounting/__tests__/operational-ui.architecture.test.ts` so
  the new route is covered by the shared operational-access and route
  architecture assertions.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/phase9-workspaces.ts' 'src/app/(dashboard)/accounting/currency-adjustments/page.tsx' 'src/app/(dashboard)/accounting/tax-settlement/page.tsx' 'src/components/monolith/accounting-workspace.tsx' 'src/modules/accounting/operational-access.ts' 'src/lib/navigation.ts' 'src/modules/accounting/__tests__/operational-access.test.ts' 'src/modules/accounting/__tests__/operational-ui.architecture.test.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/modules/accounting/__tests__/operational-access.test.ts' 'src/modules/accounting/__tests__/operational-ui.architecture.test.ts' 'src/modules/accounting/__tests__/phase9-late-slices.test.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed.

Open follow-up:

- browser verification remains intentionally skipped for the remaining Phase 9
  slices per current instruction;
- with the local dev server stopped, the earlier `.next\\monolith-dev-3.stderr.log`
  lock is no longer blocking build verification;
- the main remaining 9.18 gap is deeper behavioral parity for automated
  settlement/revaluation flows, not the operational workspace layer.

## 2026-08-01 Accounting late-phase workspaces and API continuation

Continued Accounting Phase 9 beyond the 9.15 purchases slice by wiring the
late-stage operational workspaces that were still missing across approvals,
communications, customization, reporting, integrations, and slice-derived
tests.

Delivered:

- added additive persisted Accounting customization registries in
  `prisma/schema.prisma` plus
  `prisma/migrations/20260801000310_accounting_phase9_customization_and_automation/migration.sql`
  for `AccountingCustomFieldDefinition`, `AccountingAutomationRule`, and
  `AccountingWorkspaceModule`;
- added `src/modules/accounting/customization.ts` and
  `src/modules/accounting/phase9-workspaces.ts` so Accounting now has
  server-authoritative customization CRUD plus late-slice summary queries for
  approval coverage, communications, report-builder catalog, and integrations;
- added live Monolith routes `/accounting/customization`,
  `/accounting/communications`, `/accounting/report-builder`, and
  `/accounting/integrations`, and expanded `/accounting/approvals` with
  workflow coverage summary;
- added authenticated Accounting API endpoints for approvals summary,
  communications, report catalog, integrations, custom fields, automation
  rules, and workspace modules;
- updated `src/components/monolith/accounting-workspace.tsx`,
  `src/lib/navigation.ts`, and
  `src/modules/accounting/operational-access.ts` so the new late-phase routes
  behave as first-class Accounting workspaces;
- added focused late-slice assertions in
  `src/modules/accounting/__tests__/phase9-late-slices.test.ts` and updated the
  existing operational route architecture tests to cover the new surfaces.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/customization.ts' 'src/modules/accounting/phase9-workspaces.ts' 'src/app/(dashboard)/accounting/customization/page.tsx' 'src/app/(dashboard)/accounting/communications/page.tsx' 'src/app/(dashboard)/accounting/report-builder/page.tsx' 'src/app/(dashboard)/accounting/integrations/page.tsx' 'src/app/(dashboard)/accounting/approvals/page.tsx' 'src/app/api/accounting/approvals/summary/route.ts' 'src/app/api/accounting/communications/route.ts' 'src/app/api/accounting/reports/catalog/route.ts' 'src/app/api/accounting/custom-fields/route.ts' 'src/app/api/accounting/custom-fields/[id]/route.ts' 'src/app/api/accounting/automation-rules/route.ts' 'src/app/api/accounting/automation-rules/[id]/route.ts' 'src/app/api/accounting/workspace-modules/route.ts' 'src/app/api/accounting/workspace-modules/[id]/route.ts' 'src/app/api/accounting/integrations/route.ts' 'src/components/monolith/accounting-workspace.tsx' 'src/modules/accounting/operational-access.ts' 'src/lib/navigation.ts' 'src/lib/db.ts'`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/modules/accounting/__tests__/operational-access.test.ts' 'src/modules/accounting/__tests__/operational-ui.architecture.test.ts' 'src/modules/accounting/__tests__/phase9-late-slices.test.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed;
- targeted `git diff --check` for the touched late-phase files: passed, aside
  from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- browser verification remains intentionally skipped for the remaining Phase 9
  slices per current instruction;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` is still blocked by
  the locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- deeper 9.18 multi-currency, subaccounts, locking, and tax-settlement parity
  is still the largest remaining specification gap after this continuation.

## 2026-08-01 Accounting debit-note and correction-route continuation

Continued the 9.15 Purchases lifecycle work by fixing the remaining
customer-side visibility gap in the shared debit-note route and aligning the
shared correction-route metadata with the mixed customer/vendor behavior now
present in Accounting.

Delivered:

- added
  `src/app/(dashboard)/accounting/debit-notes/customer-note-drafts-client.tsx`
  and updated `/accounting/debit-notes` so customer debit-note drafts now
  appear alongside vendor debit-note drafts and the canonical debit-note
  register;
- updated `src/modules/accounting/service.ts` so customer-note listings now
  include original invoice references for source-lineage display;
- normalized the shared credit-note route metadata, navigation label, and
  access classification so `/accounting/credit-notes` no longer reads as
  sales-only when it now covers both customer and vendor credits.

Verification:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/accounting/debit-notes/page.tsx' 'src/app/(dashboard)/accounting/debit-notes/customer-note-drafts-client.tsx' 'src/app/(dashboard)/accounting/debit-notes/vendor-note-drafts-client.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted `git diff --check` for the touched debit-note and correction-route
  files: passed, aside from the normal Windows line-ending warnings in the
  worktree.

Blocked:

- browser verification is intentionally skipped for the remaining slices per
  current instruction;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by the
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- remaining 9.15 work is now mostly in deeper canonical payable-party mapping
  and any leftover vendor-settlement edge cases, not basic correction-route
  visibility.

## 2026-08-01 Accounting expenses and reimbursements continuation

Continued the 9.15 Purchases lifecycle work by adding an Accounting-side
Finance workspace for operational expense and reimbursement payout visibility
without inventing unsupported canonical posting paths.

Delivered:

- added `/accounting/expenses` with live Monolith metrics, workflow cards, and
  payable-ready queue tables for CHA operational expenses and HR fuel
  reimbursements;
- wired the new route into `src/components/monolith/accounting-workspace.tsx`,
  `src/lib/navigation.ts`, and
  `src/modules/accounting/operational-access.ts` so it behaves as a first-class
  Accounting workspace;
- kept payout execution in the existing `/expense` and `/hrms/reimbursement`
  source flows because those modules still own approval, proof, and party
  identity and do not yet resolve automatically into canonical customer or
  supplier payment-entry parties.

Verification:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/accounting/expenses/page.tsx' 'src/components/monolith/accounting-workspace.tsx' 'src/lib/navigation.ts' 'src/modules/accounting/operational-access.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed;
- targeted `git diff --check` for the touched Accounting expenses files:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Blocked:

- browser verification is intentionally skipped for the remaining slices per
  current instruction;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by the
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- remaining 9.15 work is now mostly in deeper canonical payable-party mapping
  and any leftover vendor-settlement edge cases, not basic expense visibility.

## 2026-08-01 Accounting vendor-credit and AP-settlement continuation

Continued the 9.15 Purchases lifecycle work by finishing the vendor credit-note
draft path in Accounting and tightening the vendor-payment handoff into a
supplier- and bill-scoped AP settlement flow.

Delivered:

- updated `/accounting/credit-notes/new` so both customer and supplier
  original-invoice pickers now load real posted invoice states instead of the
  impossible legacy `APPROVED` / `SUBMITTED` filter;
- added
  `src/app/(dashboard)/accounting/credit-notes/vendor-credit-drafts-client.tsx`
  and updated `/accounting/credit-notes` so vendor credit-note drafts now
  appear in Accounting with direct submit-to-canonical actions and canonical
  review links once prepared;
- updated `/accounting/payment-entries/new` so vendor disbursements can open
  pre-scoped to a supplier and specific bill, with the outstanding amount
  preloaded into both the draft payment amount and the starting allocation;
- updated `/accounting/purchase-invoices/[id]` and `/accounting/vendor-payments`
  so AP operators can jump directly from an open bill or the vendor-payment
  register into that scoped settlement flow.

Verification:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/accounting/credit-notes/page.tsx' 'src/app/(dashboard)/accounting/credit-notes/new/page.tsx' 'src/app/(dashboard)/accounting/credit-notes/vendor-credit-drafts-client.tsx' 'src/app/(dashboard)/accounting/payment-entries/new/page.tsx' 'src/app/(dashboard)/accounting/payment-entries/new/new-payment-client.tsx' 'src/app/(dashboard)/accounting/purchase-invoices/[id]/page.tsx' 'src/app/(dashboard)/accounting/vendor-payments/page.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed;
- targeted `git diff --check` for the touched vendor-credit and AP-settlement
  files: passed, aside from the normal Windows line-ending warnings in the
  worktree.

Blocked:

- browser verification is intentionally skipped for the remaining slices per
  current instruction;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by the
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- direct expense-entry / reimbursement parity and some broader AP settlement
  edge cases are still open in 9.15.

## 2026-08-01 Accounting recurring-bill continuation

Continued the 9.15 Purchases lifecycle work by turning the dormant
`RecurringExpense` foundation into a live recurring-bill workflow that
generates draft purchase invoices instead of legacy direct posting.

Delivered:

- added additive recurring-bill run persistence plus
  `prisma/migrations/20260801000300_accounting_phase9_recurring_expense_runs/migration.sql`;
- added `src/modules/accounting/recurring-expenses.ts` and
  `src/modules/accounting/recurring-expense-actions.ts` so Accounting can now
  create recurring bill profiles, process due occurrences, generate one-off
  draft purchase invoices, skip due dates, pause/resume profiles, and record
  generated / skipped / failed run lineage with idempotency keys;
- added `src/app/(dashboard)/accounting/recurring/recurring-expense-client.tsx`
  and updated `src/app/(dashboard)/accounting/recurring/page.tsx` so the live
  recurring workspace now hosts both recurring sales invoices and recurring
  bills in one Monolith operational route;
- updated `src/lib/db.ts` so the Prisma singleton refresh guard recognizes the
  new recurring-expense run delegate.

Verification:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/recurring-expenses.ts' 'src/modules/accounting/recurring-expense-actions.ts' 'src/app/(dashboard)/accounting/recurring/page.tsx' 'src/app/(dashboard)/accounting/recurring/recurring-expense-client.tsx' 'src/app/(dashboard)/accounting/recurring/recurring-sales-client.tsx' 'src/lib/db.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed;
- targeted `git diff --check` for the touched recurring-bill files: passed,
  aside from the normal Windows line-ending warnings in the worktree.

Blocked:

- browser verification is intentionally skipped for the remaining slices per
  current instruction;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by the
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- vendor-credit, expense, and broader AP settlement parity are still open in
  9.15.

## 2026-08-01 Accounting vendor debit-note continuation

Continued the 9.15 Purchases lifecycle work by exposing vendor debit-note
drafts in Accounting and fixing the original-invoice selectors to use real AP
invoice states.

Delivered:

- updated `/accounting/debit-notes/new` so both customer and supplier
  original-invoice pickers now load real posted invoice states instead of the
  impossible legacy `APPROVED` / `SUBMITTED` filter;
- added
  `src/app/(dashboard)/accounting/debit-notes/vendor-note-drafts-client.tsx`
  and updated `/accounting/debit-notes` so vendor debit-note drafts now appear
  in a dedicated draft register with direct submit-to-canonical actions and
  canonical review links once prepared;
- updated `src/modules/accounting/service.ts` so vendor-note listings now
  include original purchase-invoice references for AP correction lineage.

Verification:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/accounting/debit-notes/page.tsx' 'src/app/(dashboard)/accounting/debit-notes/new/page.tsx' 'src/app/(dashboard)/accounting/debit-notes/vendor-note-drafts-client.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted `git diff --check` for the touched debit-note files: passed, aside
  from the normal Windows line-ending warnings in the worktree.

Blocked:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends, even
  though the local app is healthy on `http://127.0.0.1:3000`;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by the
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- recurring-bill, vendor-credit, expense, and broader AP settlement parity are
  still open in 9.15.

## 2026-08-01 Accounting purchase-order continuation

Started the 9.15 Purchases lifecycle work by turning purchase orders into a
true supplier-side Accounting flow with draft-bill conversion instead of
leaving them as generic CRM commercial documents.

Delivered:

- added additive purchase-order lineage persistence on `PurchaseInvoice` and
  `PurchaseInvoiceItem` plus
  `prisma/migrations/20260801000250_accounting_phase9_purchase_order_purchase_invoice_lineage/migration.sql`;
- added `src/modules/accounting/purchase-orders.ts` and
  `src/modules/accounting/purchase-order-actions.ts` so Accounting can now
  load purchase-order detail and convert eligible purchase orders into normal
  draft purchase invoices with duplicate prevention and an explicit mixed-tax
  safeguard;
- added `src/app/(dashboard)/accounting/purchase-orders/[id]/page.tsx` and
  `src/app/(dashboard)/accounting/purchase-orders/[id]/detail-client.tsx` so
  the Monolith now exposes supplier-aware purchase-order detail, linked-bill
  lineage, and one-click draft purchase-invoice conversion;
- updated the generic commercial register so purchase-order rows now show the
  supplier instead of a customer account and expose a review action into the
  new Accounting detail route.

Verification:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/purchase-orders.ts' 'src/modules/accounting/purchase-order-actions.ts' 'src/app/(dashboard)/accounting/purchase-orders/[id]/page.tsx' 'src/app/(dashboard)/accounting/purchase-orders/[id]/detail-client.tsx' 'src/app/(dashboard)/accounting/_components/commercial-documents-page.tsx' 'src/components/monolith/accounting-workspace.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed.

Blocked:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends, even
  though the local app is healthy on `http://127.0.0.1:3000`;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by the
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- recurring-bill, vendor-credit, expense, and broader AP settlement parity are
  still open in 9.15.

## 2026-08-01 Accounting customer-advance and sales-receipt continuation

Continued the 9.14 Sales lifecycle work by landing the remaining
retainer-invoice / customer-advance and sales-receipt coverage on the
canonical receipt workflow instead of reviving legacy direct posting.

Delivered:

- added additive accounting customer-advance / retainer request persistence
  plus
  `prisma/migrations/20260801000240_accounting_phase9_customer_advance_requests/migration.sql`;
- added `src/modules/accounting/customer-advances.ts` and
  `src/modules/accounting/customer-advance-actions.ts` so Accounting can now
  create customer-advance and retainer requests, summarize linked canonical
  receipt coverage, create controlled receipt drafts against the remaining
  balance, and cancel untouched requests;
- added `src/app/(dashboard)/accounting/customer-advances/page.tsx` and
  `src/app/(dashboard)/accounting/customer-advances/customer-advances-client.tsx`
  so the Monolith now exposes a live customer-advance workspace with request
  intake, remaining-balance visibility, linked draft/canonical receipt lineage,
  and direct receipt-draft generation into the normal payment approval flow;
- added dedicated `/accounting/sales-receipts` and
  `/accounting/sales-receipts/new` routes, and updated
  `/accounting/customer-receipts` so sales receipts now have an explicit
  register entry point plus navigation into customer advances;
- updated `src/lib/db.ts` and `tsconfig.json` so stable `.next/types` output is
  the repo-wide TypeScript source of truth after the earlier corrupted
  `.next/dev/types` artifacts.

Verification:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/customer-advances.ts' 'src/modules/accounting/customer-advance-actions.ts' 'src/app/(dashboard)/accounting/customer-advances/page.tsx' 'src/app/(dashboard)/accounting/customer-advances/customer-advances-client.tsx' 'src/app/(dashboard)/accounting/sales-receipts/page.tsx' 'src/app/(dashboard)/accounting/customer-receipts/page.tsx' 'src/lib/db.ts' 'src/components/monolith/accounting-workspace.tsx' 'src/modules/accounting/operational-access.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx next typegen`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed.

Blocked:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends, even
  though the local app is healthy on `http://127.0.0.1:3000`;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by the
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- 9.15 Purchases lifecycle parity is now the next open Phase 9 slice.

## 2026-08-01 Accounting recurring sales-invoice continuation

Continued the 9.14 Sales lifecycle work by replacing the guarded recurring
placeholder with a real recurring sales-invoice profile workspace that
generates draft invoices through the normal invoice service.

Delivered:

- added additive recurring sales-invoice persistence plus
  `prisma/migrations/20260801000230_accounting_phase9_recurring_sales_invoice_profiles/migration.sql`;
- added `src/modules/accounting/recurring-sales-invoices.ts` and
  `src/modules/accounting/recurring-sales-invoice-actions.ts` so recurring
  profiles now support create, due-generation, skip, pause, resume, cancel,
  deterministic occurrence identity, failure tracking, and generated-invoice
  lineage;
- updated `src/lib/db.ts` so the dev-time Prisma singleton refresh guard now
  recognizes the new recurring delegates;
- updated `src/app/(dashboard)/accounting/recurring/page.tsx` and added
  `src/app/(dashboard)/accounting/recurring/recurring-sales-client.tsx` so the
  route now exposes a live Monolith recurring-invoice workspace instead of the
  earlier policy-gate placeholder;
- archived the previous recurring placeholder route in
  `OLD UI code/src/app/(dashboard)/accounting/recurring/page.tsx`.

Verification:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/lib/db.ts' 'src/modules/accounting/recurring-sales-invoices.ts' 'src/modules/accounting/recurring-sales-invoice-actions.ts' 'src/app/(dashboard)/accounting/recurring/page.tsx' 'src/app/(dashboard)/accounting/recurring/recurring-sales-client.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed.

Blocked:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends, even
  though the local app is healthy on `http://127.0.0.1:3000`;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by the
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- the retainer-invoice / customer-advance and sales-receipt portions of 9.14
  remain open.

## 2026-08-01 Accounting quotation sales-order conversion continuation

Continued the 9.14 Sales lifecycle work by turning accepted quotations into
confirmed sales orders with explicit source-lineage instead of stopping at the
draft sales-invoice conversion path.

Delivered:

- added additive quotation-lineage persistence to `CrmInvoice` and
  `CrmInvoiceItem` plus
  `prisma/migrations/20260801000220_accounting_phase9_quote_sales_order_lineage/migration.sql`;
- updated `src/modules/accounting/quotations.ts`,
  `src/modules/accounting/service.ts`, and
  `src/modules/accounting/actions.ts` so accepted quotations can now be
  converted into confirmed `SALES_ORDER` records with quote snapshot metadata,
  copied line quantities/rates/tax values, duplicate-prevention behavior for
  exhausted quotations, and server-side converted-quantity updates;
- updated
  `src/app/(dashboard)/accounting/quotations/[id]/page.tsx`
  and
  `src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx`
  so the quotation detail route now exposes sales-order conversion next to the
  existing draft-invoice conversion flow for users who already manage
  commercial documents.

Verification:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/quotations.ts' 'src/app/(dashboard)/accounting/quotations/[id]/page.tsx' 'src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed;
- `git diff --check -- 'prisma/schema.prisma' 'prisma/migrations/20260801000220_accounting_phase9_quote_sales_order_lineage/migration.sql' 'src/modules/accounting/quotations.ts' 'src/modules/accounting/service.ts' 'src/modules/accounting/actions.ts' 'src/app/(dashboard)/accounting/quotations/[id]/page.tsx' 'src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx' 'task.md'`:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Blocked:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends, even
  though the local app is healthy on `http://127.0.0.1:3000`;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by the
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- linting `src/modules/accounting/actions.ts` and
  `src/modules/accounting/service.ts` still hits pre-existing
  `@typescript-eslint/no-explicit-any` debt outside this specific slice, even
  though the touched quotation route files and conversion service logic that
  were directly verified for this batch are clean.

## 2026-08-01 Manual journal contact-required enforcement continuation

Tightened the Monolith manual-journal flow so ledger lines that have
`allowJournalContact` enabled now require a selected contact before the draft
can be saved and before any older draft can be posted.

Delivered:

- updated `src/app/(dashboard)/accounting/journal-entries/new/new-jv-client.tsx`
  so contact-enabled lines are treated as required in the form, display a clear
  validation message, and block draft save while missing;
- updated `src/modules/accounting/service.ts` so manual-journal validation now
  rejects incomplete contact payloads, enforces a mandatory contact for
  `allowJournalContact` ledgers during draft creation, and re-checks the same
  requirement before posting existing drafts.

Verification:

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted `git diff --check` for the touched manual-journal files: passed,
  aside from the normal Windows line-ending warnings in the worktree.

Blocked:

- targeted ESLint for `src/modules/accounting/service.ts` is still blocked by
  the file's large pre-existing `@typescript-eslint/no-explicit-any` backlog
  unrelated to this contact-enforcement slice;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/modules/accounting/__tests__/posting-boundary.architecture.test.ts'`
  is still red on the pre-existing expectation that `service.ts` contains the
  unrelated `QUOTATION_CONVERSION_GATED` sentinel;
- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends, even
  though the local app remains healthy.

## 2026-08-01 Accounting quotation draft edit affordance continuation

Standardized the Monolith draft-edit affordance for the currently supported
quotation draft workflow so operators can reopen and revise draft content from
both the register and the draft detail surface.

Delivered:

- added shared `AccountingDraftEditLink` in
  `src/components/monolith/accounting-workspace.tsx` so draft-edit actions can
  use one consistent Monolith control;
- updated `src/app/(dashboard)/accounting/quotations/page.tsx` to accept an
  `?edit=` draft target, load the selected quotation draft, and pass its
  editable payload into the client workspace;
- updated `src/app/(dashboard)/accounting/quotations/quotations-client.tsx` so
  the quotations workspace now opens the shared dialog in edit mode, pre-fills
  draft values, saves through `updateQuotationAction`, and exposes `Edit draft`
  from draft rows;
- updated
  `src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx`
  so draft quotation detail now exposes the same `Edit draft` affordance.

Verification:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/components/monolith/accounting-workspace.tsx' 'src/app/(dashboard)/accounting/quotations/page.tsx' 'src/app/(dashboard)/accounting/quotations/quotations-client.tsx' 'src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted `git diff --check` for the touched quotation workspace files:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Remaining:

- this standardizes the draft-edit pattern only where the backend already
  supports draft updates today; other draft-detail surfaces such as legacy
  invoices and payment entries still need server-side edit flows before the
  same Monolith affordance can be turned on there honestly;
- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends, even
  though the local app remains healthy.

## 2026-08-01 HRMS and CRM incentive workspace addition

Added a new incentive workflow spanning CRM as the input surface and HRMS as
the primary back-office processing workspace.

Delivered:

- added additive `IncentiveEntry` persistence plus
  `prisma/migrations/20260801000210_add_incentive_entries/migration.sql`;
- added `src/app/(dashboard)/crm/incentives/page.tsx` and
  `src/app/(dashboard)/crm/incentives/incentives-client.tsx` so CRM now has an
  incentive input area for employee incentive submission;
- added `src/app/(dashboard)/hrms/incentives/page.tsx` and
  `src/app/(dashboard)/hrms/incentives/incentives-client.tsx` so HRMS now has
  the main incentive working tab for review, approval, rejection, and payout
  progression;
- added shared incentive service and API routes in
  `src/modules/incentives/*`, `src/app/api/crm/incentives/route.ts`, and
  `src/app/api/hrms/incentives/route.ts`;
- updated navigation and workspace metadata so HRMS exposes a new `Incentive`
  sidebar subheading with `Incentive Working`, while CRM exposes a new
  `Incentives` route.

Verification:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/components/monolith/crm-workspace.test.tsx' 'src/components/monolith/people-workspace.test.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/crm/incentives/page.tsx' 'src/app/(dashboard)/crm/incentives/incentives-client.tsx' 'src/app/(dashboard)/hrms/incentives/page.tsx' 'src/app/(dashboard)/hrms/incentives/incentives-client.tsx' 'src/app/api/crm/incentives/route.ts' 'src/app/api/hrms/incentives/route.ts' 'src/modules/incentives/service.ts' 'src/modules/incentives/validators.ts' 'src/lib/navigation.ts' 'src/components/monolith/crm-workspace.tsx' 'src/components/monolith/people-workspace.tsx' 'src/components/monolith/crm-workspace.test.tsx' 'src/components/monolith/people-workspace.test.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `git diff --check` for the touched incentive files: passed, aside from the
  normal Windows line-ending warnings in the worktree.

Blocked:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends, even
  though the local app remains healthy;
- this slice adds new routes, so the historical aggregate route totals in the
  migration docs are stale until the next full route-audit regeneration.

## 2026-08-01 HRMS help desk workspace continuation

Replaced the static `/hrms/helpdesk` notice with a real Monolith help desk
workspace backed by the existing HR case APIs and permissions.

Delivered:

- added `src/components/hrms/helpdesk-view.tsx` so HRMS Help Desk now supports
  category-aware case creation, FAQ guidance, searchable case tracking, and
  case conversation updates within the shared People Operations workspace;
- updated `src/app/(dashboard)/hrms/helpdesk/page.tsx` so the route now
  enforces `hrms.helpdesk.read` before rendering the live workspace;
- archived the previous notice-only route implementation under
  `OLD UI code/src/app/(dashboard)/hrms/helpdesk/page.tsx`.

Verification:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/hrms/helpdesk/page.tsx' 'src/components/hrms/helpdesk-view.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `git diff --check -- 'src/app/(dashboard)/hrms/helpdesk/page.tsx' 'src/components/hrms/helpdesk-view.tsx' 'OLD UI code/src/app/(dashboard)/hrms/helpdesk/page.tsx' 'docs/ui-migration-status.md' 'docs/ui-migration-handoff.md'`:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Blocked:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends, even
  though the local app remains healthy.

## 2026-07-31 Accounting quotation lifecycle foundation continuation

Continued the 9.14 Sales lifecycle work by wiring the quotations workspace into
the new server-authoritative quotation lifecycle foundation instead of leaving
the route on the earlier draft-only surface.

Delivered:

- added `src/modules/accounting/quotations.ts` as the quotation lifecycle
  service layer for draft save/edit/clone, approval, send, accept/decline,
  expiry, and partial quotation-to-sales-invoice conversion with row-version
  checks and audit entries;
- updated `src/modules/accounting/service.ts` and
  `src/modules/accounting/actions.ts` so the quotations workspace now uses that
  lifecycle layer and supports partial conversion payloads;
- updated `src/app/(dashboard)/accounting/quotations/page.tsx` so the route now
  enforces `requireAccountingRouteAccess`;
- updated `src/app/(dashboard)/accounting/quotations/quotations-client.tsx`
  so the register links into quotation details and keeps the create flow
  compatible with the new draft payload shape;
- added
  `src/app/(dashboard)/accounting/quotations/[id]/page.tsx`
  and
  `src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx`
  so quotation review, approval, send, decision, cancellation, duplication, and
  partial conversion now have a dedicated Monolith detail route.

Verification:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted ESLint for the touched quotations route files and
  `src/modules/accounting/quotations.ts`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:verify`:
  passed;
- targeted `git diff --check` for the touched quotation files: passed, aside
  from the normal Windows line-ending warnings in the worktree.

Blocked:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends, even
  though the local app is healthy on `http://127.0.0.1:3000`;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` is currently blocked
  by a locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:safety-scan`
  still reports pre-existing repository findings outside this quotation slice.

## 2026-08-01 Accounting quotation delivery and portal continuation

Continued the 9.14 Sales lifecycle work by replacing the quotation send stub
with delivery-mode handling that uses the existing email queue and customer
portal infrastructure, then exposing portal-published quotations to portal
users and letting those portal recipients accept or decline them in-place.

Delivered:

- updated `src/modules/accounting/quotations.ts` so quotation send now handles:
  - `EMAIL` by resolving a CRM customer/contact email and enqueueing an
    `EmailQueue` record;
  - `PORTAL` by requiring an active
    `AccountingPortalPublicationProfile`, notifying active
    `CustomerPortalUser` recipients, and recording portal publication metadata;
  - `MANUAL` by recording explicit manual dispatch evidence instead of reusing
    the queued email state;
- updated
  `src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx`
  so the quotation detail route now lets operators choose the delivery mode
  before sending;
- added `src/modules/customer-portal/accounting-quotations.ts`,
  `src/app/customer-portal/quotations/page.tsx`, and
  `src/app/customer-portal/quotations/[id]/page.tsx` so customers can review
  quotations that were published to the portal;
- added `src/app/customer-portal/quotations/[id]/quotation-decision-panel.tsx`
  and updated `src/modules/customer-portal/accounting-quotations.ts` plus
  `src/modules/customer-portal/actions.ts` so portal customers can accept a
  quotation with an optional reference or decline it with a required reason,
  while still enforcing portal publication, customer scope, expiry, and
  row-version checks;
- updated `src/app/customer-portal/_components/client-actions.tsx` and the
  portal quotation notification link target so the portal shell exposes the new
  Quotations route and portal-delivered quotation notifications now land on the
  exact quotation detail route.

Verification:

- targeted ESLint for the touched quotation and portal files: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/customer-portal/accounting-quotations.ts' 'src/modules/customer-portal/actions.ts' 'src/app/customer-portal/quotations/[id]/page.tsx' 'src/app/customer-portal/quotations/[id]/quotation-decision-panel.tsx' 'src/modules/accounting/quotations.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed.

Blocked:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends, even
  though the local app is healthy on `http://127.0.0.1:3000`;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by the
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000.

## 2026-07-31 Accounting quotations shared-master continuation

Continued the 9.14 Sales lifecycle work by wiring the quotations workspace into
the same shared commercial masters already used by the other Accounting
document-entry routes.

Delivered:

- updated `src/app/(dashboard)/accounting/quotations/page.tsx` so the route now
  fetches live `AccountingPaymentTerm` records;
- updated `src/app/(dashboard)/accounting/quotations/quotations-client.tsx`
  so quotations now capture shared payment terms and reuse the persisted
  `AccountingItemMaster` catalogue for line suggestions plus default rate/GST
  population;
- reused the same live item catalogue for the customer-note line editor on that
  workspace so note creation there no longer stays fully manual either.

Verification:

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted ESLint for the quotations page and client: passed;
- targeted `git diff --check` for the touched quotations files: passed,
  aside from the normal Windows line-ending warnings in the worktree.

Blocked:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends, even
  though the local app is healthy on `http://127.0.0.1:3000`;
- the broader 9.14 through 9.23 lifecycle slices remain open.

## 2026-07-31 Accounting quotation conversion continuation

Started the 9.14 Sales lifecycle continuation by replacing the gated
quotation-conversion placeholder with a working draft sales-invoice conversion
path.

Delivered:

- updated `src/modules/accounting/service.ts` so open quotations can now
  convert into draft sales invoices when their lines share a single GST rate;
- updated `src/app/(dashboard)/accounting/quotations/page.tsx` so the
  quotations register uses the persisted quotation subtotal instead of a
  non-existent field;
- updated `src/app/(dashboard)/accounting/quotations/quotations-client.tsx`
  so newly created quotations normalize into the live table shape and the
  Convert action is available for the actual open/draft quotation states.

Verification:

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted ESLint for the quotations page and client: passed;
- targeted `git diff --check` for the touched quotations and service files:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Remaining:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends, even
  though the local app is healthy on `http://127.0.0.1:3000`;
- quotation conversion still remains intentionally bounded to uniform GST-rate
  quotations for now;
- the broader 9.14 through 9.23 lifecycle slices remain open.

## 2026-07-31 Accounting invoice payment-method continuation

Extended the active Accounting invoice and note entry routes so they now
consume the shared Accounting payment-method master and persist the selected
value on the canonical draft records.

Delivered:

- added additive `paymentMethod` fields plus migration coverage for
  `SalesInvoice`, `PurchaseInvoice`, `CustomerNote`, and `VendorNote`;
- updated `src/components/monolith/accounting-invoice-form.tsx` so invoice and
  note entry now offers live `AccountingPaymentMethod` options alongside the
  earlier term and unit master selections;
- updated the new Accounting sales invoice, purchase invoice, credit note, and
  debit note pages plus their client wrappers so they fetch and pass live
  `AccountingPaymentMethod` records into the shared Monolith form;
- updated `src/modules/accounting/service.ts` and
  `src/modules/accounting/validators.ts` so the selected payment method is
  accepted and stored on the canonical draft invoice/note records.

Verification:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run db:generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted ESLint for the touched invoice/note files: passed;
- targeted `git diff --check` for the touched schema, service, and
  invoice/note files: passed, aside from the normal Windows line-ending
  warnings in the worktree.

Remaining:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends, even
  though the local app is healthy on `http://127.0.0.1:3000`;
- effective-dated price behavior is still not fully wired through the
  Accounting document-entry surfaces;
- the larger 9.14 through 9.23 lifecycle slices remain open.

## 2026-07-31 Accounting commercial document shared-master continuation

Extended the active Accounting commercial order-entry flow so sales orders and
purchase orders now consume the shared Accounting payment-term and price-list
masters instead of relying on a fixed due-date default and standard-only rate
selection.

Delivered:

- updated `src/app/(dashboard)/accounting/_components/commercial-document-form-page.tsx`
  so the commercial-document page now fetches live `AccountingPaymentTerm` and
  `AccountingPriceList` records;
- updated `src/components/monolith/accounting-commercial-document-form.tsx`
  so commercial order entry uses live payment terms for due-date behavior and
  selected price lists for default line pricing/currency behavior;
- updated `src/modules/crm/actions.ts` so selected commercial-document terms
  now persist through the existing `CrmInvoice.terms` field when the form is
  submitted.

Verification:

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted ESLint for
  `src/app/(dashboard)/accounting/_components/commercial-document-form-page.tsx`
  and `src/components/monolith/accounting-commercial-document-form.tsx`:
  passed;
- targeted `git diff --check` for the touched commercial-document files:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Remaining:

- browser verification is still blocked by the missing authenticated in-app
  browser instance;
- effective-dated price behavior and the larger 9.14 through 9.23 lifecycle
  slices remain open.

## 2026-07-31 Accounting invoice shared-master continuation

Extended the active Monolith Accounting document-entry routes so invoice and
note creation now consume the new Accounting shared commercial masters instead
of mixing hardcoded terms with the old generic unit source.

Delivered:

- updated `src/components/monolith/accounting-invoice-form.tsx` so its Terms
  selector and due-date calculation use live `AccountingPaymentTerm` options,
  with the prior hardcoded defaults preserved only as fallback behavior;
- updated new Accounting sales invoice, purchase invoice, credit note, and
  debit note pages so they now source units from `AccountingUnitOfMeasure`
  instead of the generic `Unit` table;
- passed the Accounting payment-term list through the current invoice and note
  client wrappers so the live Monolith document entry routes consume the shared
  commercial configuration foundation added in 9.13.

Verification:

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted ESLint for the touched invoice/note files: passed;
- targeted `git diff --check` for the touched invoice/note files: passed,
  aside from the normal Windows line-ending warnings in the worktree.

Remaining:

- browser verification is still blocked by the missing authenticated in-app
  browser instance;
- effective-dated price and broader shared-commercial consumption are still not
  fully wired through the Accounting document-entry surfaces.

## 2026-07-31 Accounting item master persistence continuation

Replaced the active Monolith Accounting item-master flow so `/accounting/items`
and the related Accounting document forms no longer depend on the legacy
client-side mock/localStorage catalogue.

Delivered:

- added additive persisted `AccountingItemMaster` schema and migration
  foundation;
- added authenticated item-master API routes in
  `src/app/api/accounting/items/route.ts` and
  `src/app/api/accounting/items/[id]/route.ts`;
- rewired `src/components/monolith/accounting-items.tsx` so the item register,
  create flow, import path, status actions, delete action, and detail view use
  the persisted Accounting item master;
- updated `src/components/monolith/accounting-invoice-form.tsx` and
  `src/components/monolith/accounting-commercial-document-form.tsx` so their
  item suggestions and default rate/unit behavior come from the live
  Accounting catalogue instead of the old mock source.

Verification:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run db:generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted ESLint for the touched item-master files: passed;
- targeted `git diff --check` for the touched item-master files: passed,
  aside from the normal Windows line-ending warnings in the worktree.

Remaining:

- browser verification is still blocked by the missing authenticated in-app
  browser instance;
- shared-commercial parity is still incomplete beyond the item master, so the
  later 9.14 through 9.23 lifecycle slices remain open.

## 2026-07-31 item-table currency and exchange-rate alignment

Aligned the active item-table layouts so Currency and Exchange Rate render as
first-class columns and the line-item controls stay on a single row.

Delivered:

- updated the shared Monolith Accounting item table in
  `src/components/monolith/accounting-invoice-form.tsx` to add dedicated
  `Currency` and `Exchange Rate` columns instead of nesting those controls
  under `Item Details`;
- kept the affected row controls, headers, amount cells, and unit helper link
  in one-line table formatting for the Accounting item table;
- tightened the CRM quote and CRM invoice item-table layouts in
  `src/app/(dashboard)/crm/quotes/_components/LineItemsTable.tsx` and
  `src/app/(dashboard)/crm/invoices/invoice-form.tsx` so their columns also
  stay single-line and visually aligned with the updated Accounting table.

Verification:

- `git diff --check -- 'src/components/monolith/accounting-invoice-form.tsx' 'src/app/(dashboard)/crm/quotes/_components/LineItemsTable.tsx' 'src/app/(dashboard)/crm/invoices/invoice-form.tsx'`:
  passed, with only the normal Windows line-ending warnings in the worktree;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/components/monolith/accounting-invoice-form.tsx' 'src/app/(dashboard)/crm/quotes/_components/LineItemsTable.tsx' 'src/app/(dashboard)/crm/invoices/invoice-form.tsx'`:
  remains blocked by pre-existing lint debt in the touched legacy item-form
  files, including existing `no-explicit-any` and `react-hooks/set-state-in-effect`
  findings that were not introduced by this formatting slice.

## 2026-07-31 Accounting Phase 9.13 shared commercial master admin continuation

Continued the already migrated `/accounting/configuration/admin` workspace to
start the real post-9.12 Accounting Phase 9 scope instead of leaving the stale
Phase 9-complete tracker in place.

Delivered:

- corrected the active `task.md` tracker so 9.13 is now the live slice and
  9.14 through 9.23 are recorded as remaining work;
- added
  `docs/accounting/phase-9-specification-traceability.md`
  as the continuation audit record for the attached accounting build
  specification;
- added additive shared commercial master-data foundation for payment terms,
  payment methods, price lists, units of measure, and reporting tags;
- wired those five masters into the existing configuration-admin snapshot,
  server actions, and Monolith admin UI so they are now persisted,
  row-versioned, permission-checked configuration records rather than schema-only
  placeholders.

Verification:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run db:generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted ESLint for the touched configuration-admin files: passed;
- targeted `git diff --check` for the touched files: passed.

Blocked:

- the current `/accounting/items` flow still uses the client-side
  `src/lib/items/item-store.ts` mock/localStorage implementation, so shared
  item-master parity is still incomplete;
- authenticated browser verification remains blocked by the same missing
  in-app browser instance.

## 2026-07-31 accounting sidebar submenu format correction

Corrected the shared Monolith sidebar styling so the Accounting module's
grouped submenu renders with the same structure and spacing as the other
workspace side menus.

Delivered:

- updated the shared submenu selectors in `src/styles/monolith-system.css` so
  grouped sidebar links wrapped by `.mnx-sidebar-subnav-item` inherit the same
  layout, hover, and active styles as direct submenu links;
- added a safeguard assertion in the shared dashboard shell test so grouped
  submenu markup and styling stay covered going forward.

Verification:

- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/app/(dashboard)/_components/dashboard-shell-layout.test.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/_components/dashboard-shell-layout.test.ts' 'src/styles/monolith-system.css'`:
  completed with the existing expected warning that the raw CSS file is ignored
  by the current ESLint config;
- `git diff --check -- 'src/styles/monolith-system.css' 'src/app/(dashboard)/_components/dashboard-shell-layout.test.ts'`:
  passed, with only the usual Windows line-ending warnings in the worktree.

## 2026-07-31 payments draft visibility and approval flow

Adjusted the existing migrated Accounting payments workspace so saved payment
drafts are visible where operators expect them and the new-payment form now
offers an explicit choice between saving a draft and submitting for approval.

Delivered:

- `/accounting/payments` now includes a `Draft payments` section that surfaces
  editable `PaymentEntry` drafts alongside the existing canonical register;
- the new payment form now exposes separate `Save as draft` and
  `Submit for approval` actions instead of a single ambiguous save button;
- saving a draft now returns the operator to `/accounting/payments`, while
  direct submission creates the draft, submits it, and routes to the canonical
  payment record created for approval.

Verification:

- targeted ESLint for the touched payment workspace and action files: pending in
  this slice;
- interactive browser verification remains blocked by the same missing in-app
  browser instance.

## Final migration audit

The final repository audit baseline is integrated with the later Accounting
Phase 5 workspace. The protected `/dashboard` visual reference remains
unchanged and is counted as verified, but not as a migrated route.

- **Total routes discovered: 229**
- **Total routes migrated: 228**
- **Routes source/type/test/build verified: 229**
- **Routes remaining to migrate: 0**
- The production-browser audit covers the 213-route baseline. Authenticated
  theme/viewport evidence remains pending for the 16 later Phase 5 Accounting
  routes because no attached browser was available during that phase.
- Layouts discovered and verified: 14.
- Customer portal routes migrated and verified: 12.
- The two employee invitation routes were moved from legacy centered panels to
  the production public workspace during the production-browser audit.
- The authenticated shell, customer portal, public/authentication surfaces,
  Admin Design System production catalogue, and representative routes from
  every module passed 60 production Playwright route/theme/viewport checks.
- Light, Night, and Violet passed; desktop and 390 px mobile layouts passed
  horizontal-overflow, single-scroll, mobile-navigation, application-error,
  HTTP 500, and semantic-token checks.
- All eight source-level route/module verifiers pass; production TypeScript and
  focused merge lint pass; and the guarded optimized production build generates
  all 342 static pages.
- Repository-wide lint retains the pre-existing business-code backlog. The
  combined full test suite was rerun during Accounting Phase 7: 410 tests pass and three
  existing CHA integration expectations remain red (Drive checklist mail,
  filing date initialization, and legacy direct-delete audit naming).
- Exhaustive route/layout record: [UI route and layout audit](ui-route-audit.md).

## Status definitions

- **Protected**: authoritative working visual reference; no redesign permitted.
- **Foundation ready**: shared tokens, typography, themes, AppShell, and page
  primitives are ready for route migration.
- **Migrated**: presentation replaced with shared Monolith production
  components and its prior visual source backed up.
- **Verified**: migrated route checked for behavior, RBAC, all themes,
  responsive layout, lint, types, and relevant tests.
- **Pending**: discovered route not yet migrated and verified.

## Route inventory

Route discovery scans `src/app/**/page.tsx`, removes route-group segments,
retains dynamic segments, and calculates layout ancestry. The generated audit is
the route-by-route source of truth.

| Route family         | Discovered | Protected | Migrated | Pending |
| -------------------- | ---------: | --------: | -------: | ------: |
| `/`                  |          1 |         0 |        1 |       0 |
| `/account`           |          1 |         0 |        1 |       0 |
| `/accounting`        |         48 |         0 |       48 |       0 |
| `/admin`             |         10 |         0 |       10 |       0 |
| `/ams`               |         18 |         0 |       18 |       0 |
| `/attendance`        |          7 |         0 |        7 |       0 |
| `/cha`               |         11 |         0 |       11 |       0 |
| `/communication`     |         10 |         0 |       10 |       0 |
| `/crm`               |         57 |         0 |       57 |       0 |
| `/customer-portal`   |         12 |         0 |       12 |       0 |
| `/dashboard`         |          1 |         1 |        0 |       0 |
| `/expense`           |          1 |         0 |        1 |       0 |
| `/google-chat-link`  |          1 |         0 |        1 |       0 |
| `/hrms`              |         38 |         0 |       38 |       0 |
| `/invite`            |          2 |         0 |        2 |       0 |
| `/lms`               |          5 |         0 |        5 |       0 |
| `/login`             |          1 |         0 |        1 |       0 |
| `/notifications`     |          1 |         0 |        1 |       0 |
| `/product-catalogue` |          1 |         0 |        1 |       0 |
| `/setup`             |          1 |         0 |        1 |       0 |
| `/todo`              |          1 |         0 |        1 |       0 |
| `/verify`            |          1 |         0 |        1 |       0 |
| **Total**            |    **213** |     **1** |  **212** |   **0** |

An import from `@/components/monolith` is not proof of route migration. A route
remains pending until its rendered presentation and behavior satisfy the
completion gate.

## Layout audit

| Layout                                         | Covered pages | Responsibility                                     |
| ---------------------------------------------- | ------------: | -------------------------------------------------- |
| `src/app/layout.tsx`                           |           213 | Fonts, initial theme, metadata, global providers   |
| `src/app/(dashboard)/layout.tsx`               |           194 | Authentication, RBAC/module gates, shell selection |
| `src/app/(dashboard)/attendance/layout.tsx`    |             7 | Attendance People Operations workspace             |
| `src/app/(dashboard)/accounting/layout.tsx`    |            32 | Accounting operations workspace                    |
| `src/app/(dashboard)/admin/layout.tsx`         |            10 | Administration workspace and asynchronous states   |
| `src/app/(dashboard)/ams/layout.tsx`           |            18 | AMS Performance Operations workspace               |
| `src/app/(dashboard)/cha/layout.tsx`           |            11 | CHA operations workspace                           |
| `src/app/(dashboard)/communication/layout.tsx` |            10 | Workspace connection gate/providers                |
| `src/app/(dashboard)/crm/layout.tsx`           |            57 | CRM operations workspace                           |
| `src/app/(dashboard)/hrms/layout.tsx`          |            38 | HRMS People Operations workspace                   |
| `src/app/(dashboard)/hrms/recruit/layout.tsx`  |            15 | Recruitment feature flag                           |
| `src/app/(dashboard)/lms/layout.tsx`           |             5 | LMS Learning Operations workspace                  |
| `src/app/(dashboard)/expense/layout.tsx`       |             1 | Expense operations workspace                       |
| `src/app/customer-portal/layout.tsx`           |            12 | Portal session gate and portal shell               |

## Reference design-system analysis

The read-only source under
`_design-reference/Monolith-Design-System-v11-Full-Source-and-Dependencies` was
reviewed without modification or imports.

- `app/page.tsx` is a single interactive catalogue covering foundations,
  typography, actions, forms, surfaces, feedback, data display, navigation, and
  motion.
- `app/globals.css` defines the reference visual language: warm Light surfaces,
  true-neutral Night surfaces, deep-cool Violet surfaces, restrained borders,
  yellow/violet accent hierarchy, compact operational labels, large low-weight
  headings, 4 px base spacing, 12 px controls, 20 px cards, and 160 ms motion.
- `app/layout.tsx` establishes Geist Sans and Geist Mono.
- The reference is a visual specification, not a production dependency.

Production mapping:

- `src/styles/monolith-tokens.css` owns semantic color, surface, border, status,
  typography, spacing, radius, shadow, gradient, and motion tokens.
- `src/styles/monolith-system.css` consumes semantic values through stable
  `--mnx-*` compatibility aliases so the protected dashboard does not change.
- `WorkspaceMetric` follows the reference metric-strip pattern: grouped
  summaries render as one rounded surface with internal dividers, and actionable
  metrics expose an explicit redirect/action icon.
- `WorkspaceSectionHeading` follows the reference numbered-heading layout:
  small accent number, large light title, and muted explanatory copy aligned to
  the right at desktop sizes.
- Night, Violet, and Light are selected by root `theme-*` classes and the
  shared AppShell keeps `data-theme`, `color-scheme`, and persisted preference
  aligned. Night is the default when no saved user preference exists.

## Foundation implementation

Completed:

- created the exhaustive, repeatable route/layout audit generator;
- created a verified baseline backup of legacy `src/app`, `src/components`, and
  `src/styles`;
- centralized tokens, typography, shape, motion, and the Light, Night, and
  Violet themes;
- established `MonolithAppShell` as the shared authenticated shell;
- established shared page, surface, action, badge, icon-action, label, and
  empty-state primitives plus workspace page/table layouts;
- normalized `/dashboard`, its loading state, and its error state to those
  shared primitives while retaining the existing HTML element choices, class
  contracts, business data, interactions, RBAC, and styling;
- kept all pending module routes on their existing shell.

## OLD UI code backup

Baseline archive:
`OLD UI code/legacy-ui-before-monolith-foundation-7120d79.zip`

- Source commit: `7120d79`
- Entries: 1,199
- Size: 1,598,247 bytes
- SHA-256:
  `7271B78353937BDD0BF733E3AA864FFEFCFD05C444172318C3B5D5B71401E043`
- Verification command: `node scripts/verify-old-ui-backup.mjs`
- Verification result: passed; checksum, size, archive listing, and required
  dashboard/system entries matched.

Both `OLD UI code` and `_design-reference` are excluded from production
TypeScript. They are also excluded from ESLint and are not imported by
production source.

Batch 001 archive:
`OLD UI code/legacy-ui-before-monolith-batch-001-aed95fe.zip`

- Source commit: `aed95fe`
- Entries: 9 targeted route/shell files with original relative paths.
- Size: 26,781 bytes.
- SHA-256:
  `676DAB6A2C6FC519F3616B880C1689562B868F0E1AF03CBE6B4A22C7554C7738`
- Archive listing verification: passed.

Batch 002 archive:
`OLD UI code/legacy-ui-before-monolith-hrms-attendance-e032bf2.zip`

- Source commit: `e032bf2`
- Entries: 81 active HRMS/Attendance route, view, shell, component, and style
  files with original relative paths.
- Size: 219,295 bytes.
- SHA-256:
  `70A95661F9244DF4D49F35C7AEDAA40159A4365F77AAF6E1A8BB07B0E54F4313`
- Archive listing verification: passed.

Batch 003 archive:
`OLD UI code/legacy-ui-before-monolith-ams-lms-0faa8b3.zip`

- Source commit: `0faa8b3`
- Entries: 47 active AMS/LMS route, view, and specialized component files
  with original relative paths.
- Size: 136,030 bytes.
- SHA-256:
  `0C851DAB4C38FC0D22004EF27F14CB260C75FF3291BB1111E7D68101D81B0256`
- Archive checksum, size, and file listing verification: passed.

Batch 005 archives:

`OLD UI code/legacy-ui-before-monolith-accounting-fd1cbe7.zip`

- Source commit: `fd1cbe7`.
- Files: 68 active Accounting route/view sources plus the legacy CRM invoice
  form, delete action, and shared item presentation dependencies, with original
  relative paths retained.
- ZIP entries including directories: 102.
- Size: 147,861 bytes.
- SHA-256:
  `B6B7D58BB2A20166829C80B1D395A521B30239159C06AC03ABFA9C1574939DFC`.
- Archive checksum, size, and file listing verification: passed through
  `scripts/verify-monolith-accounting-ui.mjs`.

`OLD UI code/legacy-ui-before-monolith-crm-fd1cbe7.zip`

- Source commit: `fd1cbe7`.
- Entries: 131 active CRM route, view, shared CRM, and item-presentation files
  with original relative paths.
- Size: 282,113 bytes.
- SHA-256:
  `E24B74587E9D6FC8F596920BCAE7A69738685385B46E975CE94274A149E973C1`.
- Archive checksum, size, and exact file-list verification: passed.

Batch 006 archive:
`OLD UI code/legacy-ui-before-monolith-communication-admin-ed1bf68.zip`

- Source commit: `ed1bf68`.
- Entries: 45 active Communication/Admin route, view, navigation, and shared
  legacy presentation files with original relative paths.
- Size: 130,499 bytes.
- SHA-256:
  `65DDD40D29C8FEA5AF6D86A00F71CBD3E1E4927E18DC5944F9AECF74D2303EC8`.
- Archive checksum, size, exact file count, and required entries pass through
  `scripts/verify-monolith-communication-admin-ui.mjs`.

Batch 007 archives:

`OLD UI code/legacy-ui-before-monolith-auth-misc-db4bc60.zip`

- Source commit: `db4bc60`.
- Entries: 13 active Authentication/Miscellaneous route, component,
  configuration, type, global-style, and shared-style files with original
  relative paths.
- Size: 62,758 bytes.
- SHA-256:
  `7A958A708AA5CBCAC2797E9BA59E2CAE2AC2233573C8310AD9CC6F62C0A05C8B`.

`OLD UI code/legacy-ui-before-monolith-auth-misc-scroll-navigator-db4bc60.zip`

- Source commit: `db4bc60`.
- Entry: the active pre-change `src/components/scroll-navigator.tsx`.
- Size: 2,339 bytes.
- SHA-256:
  `90B173D7BB29187683E4C7277D0E83F9B0F09F7FE65F0772FC5B4DD6D67ED84C`.
- Both archives pass checksum, size, exact-listing, and required-entry
  verification through `scripts/verify-monolith-auth-misc-ui.mjs`.

## Quality log: foundation

Passed:

- OLD UI archive verification.
- Targeted ESLint for every changed production TypeScript/TSX file and both
  migration utility scripts.
- Focused TypeScript: `npx tsc --noEmit -p tsconfig.ui-migration.json`.
- Production TypeScript: `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`.
- Relevant Vitest suites: 36 tests across shared primitives, AppShell routing,
  dashboard module behavior, navigation, security, and session security.
- Production build: `npm run build`.
  - Prisma Client generated.
  - Next.js production compilation passed.
  - Production TypeScript passed.
  - 315 static pages generated.

Repository-wide `npm run lint` was also executed with an 8 GB heap. It reaches
pre-existing findings in Prisma seed scripts, maintenance scripts, accounting,
CHA, and other pending module source. The foundation files pass targeted
ESLint; no migration-related lint failure remains. The full scan remains a
repository-quality backlog and was not addressed by changing out-of-scope
modules.

Production TypeScript excludes `*.test.ts(x)` and `__tests__` because test mocks
are executed and type-transformed by Vitest, not shipped by Next.js. The
production program and build pass; known Prisma mock typing debt remains within
the test sources themselves.

The build emits one existing Turbopack NFT trace warning from
`src/app/api/customer-portal/checklist-files/[id]/route.ts`; it is non-fatal and
unrelated to the UI foundation.

## Migration batches

| Batch              | Routes                                                       | State                                 | Notes                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------ | ------------------------------------------------------------ | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reference          | `/dashboard`                                                 | Protected                             | Normalized to shared primitives; visual contract retained.                                                                                                                                                                                                                                                                                                                                                      |
| Pre-foundation 001 | `/account/security`                                          | Verified previously                   | Migration predates this foundation-only session.                                                                                                                                                                                                                                                                                                                                                                |
| Foundation         | No module routes                                             | Foundation ready                      | Audit, backup, tokens, themes, AppShell, layouts, dashboard normalization.                                                                                                                                                                                                                                                                                                                                      |
| Batch 001          | `/product-catalogue`, `/todo`, `/notifications`              | Verified                              | Full Monolith composition; profile menu and common authenticated states included.                                                                                                                                                                                                                                                                                                                               |
| Catalogue          | `/admin/design-system`                                       | Verified                              | Live production catalogue for 207 unique runtime component names across 13 global/control/public/module composition groups, 23 interactive route states, shared floating surfaces, and the real persisted Light/Night/Violet theme picker.                                                                                                                                                                      |
| Batch 002          | All `/hrms` and `/attendance` routes                         | Verified                              | 45 complete People Operations routes, shared controls/data/dialog/state compositions, and preserved employee, leave, attendance, overtime, biometric, GPS, shift, approval, payroll, recruitment, letter, report, and settings behavior.                                                                                                                                                                        |
| Batch 003          | All `/ams` and `/lms` routes                                 | Verified                              | 23 complete Performance and Learning routes, shared workspace/control/table/dialog/state compositions, and preserved appraisal, reviewer, criteria, asset, goal, feedback, course, assignment, enrolment, progress, and report behavior.                                                                                                                                                                        |
| Batch 004          | All `/cha` routes and `/expense`                             | Migrated; visual verification blocked | 12 complete Expense and CHA routes, including the dynamic job workspace, customer editing, workflow configuration, documents, additional data, approvals, filing, bill filing, expenses, reports, settings, and all dialogs/drawers. Source, archive, type, focused test, and build gates pass; the connected Browser service exposes no browser instance for the required authenticated theme/viewport matrix. |
| Batch 005          | All `/accounting` routes                                     | Verified                              | 32 complete Accounting routes covering the command centre, chart of accounts, banking, jobs, journals, payments, sales and purchase invoices, commercial orders, quotations and notes, items, financial statements, reports, and settings. All 288 authenticated route/theme/viewport checks pass.                                                                                                              |
| Batch 005          | All `/crm` routes                                            | Migrated; visual verification blocked | 57 complete CRM routes covering accounts, contacts, leads, enquiries, deals, activities, campaigns, approvals, products, items, quotes, invoices, tickets, lead sources, forecasting, and supporting sales workspaces. Source, archive, type, focused test, and build gates pass; the connected Browser service exposes no browser instance for the required authenticated theme/viewport matrix.               |
| Batch 006          | All `/communication` and `/admin` routes                     | Verified                              | 19 migrated route surfaces plus the separately verified production component catalogue. Shared Communication/Admin frames, controls, tables, dialogs, loading/error states, semantic themes, dense Mail/Chat responsiveness, and preserved connected-workspace and administration behavior. All 306 authenticated checks across Communication, Admin, and Recruit pass.                                         |
| Batch 007          | `/`, `/login`, `/setup`, `/verify/[id]`, `/google-chat-link` | Verified                              | All five repository-discovered Authentication/Miscellaneous routes use centralized public/root Monolith compositions. Credential and Google SSO, setup, document verification, Google Chat linking, root authorization/module controls, validation, redirects, and data operations are preserved. All 45 Light/Night/Violet desktop/tablet/mobile checks pass.                                                  |

## Quality log: production component catalogue

Implemented:

- replaced the obsolete decision-log/showcase route with a live catalogue
  derived from imported runtime modules;
- covered the authenticated AppShell/theme layer, foundation, workspace,
  asynchronous states, People, Performance/Learning, CHA, Accounting, CRM,
  Communication, Admin, and public/authentication compositions;
- included specialized production Accounting invoice, commercial-document,
  delete, item-list, item-editor, and item-detail components in the runtime
  index;
- rendered real production actions, badges, fields, selects, checkboxes,
  progress, alerts, menus, filters, warnings, dialogs, tables, uploads,
  module summaries, details, and public status surfaces;
- added 23 selectable shared and module-specific permission, configuration,
  empty, loading, and error states;
- extracted `MonolithThemePicker` from the AppShell as a shared production
  component, retaining the existing root classes and persisted preference;
- removed the obsolete `.mnx-showcase-*` style family and
  `docs/design-system-showcase.md`;
- archived the replaced route and shared visual source in
  `OLD UI code/legacy-ui-before-admin-design-system-catalogue-4f93df4.zip`.

Backup evidence:

- source commit: `4f93df4`;
- archive size: 38,803 bytes;
- SHA-256:
  `643FF25A031F1B8ED7A50F6A04E643564BB77F698A817EF586CD32ACDEC82E34`;
- required route/client/style entries, size, and checksum pass through
  `scripts/verify-monolith-design-system-catalogue.mjs`.

Passed:

- regenerated route audit: 211 pages, 14 layouts, 198 migrated, 12 pending;
- focused production catalogue static/archive verifier;
- scoped ESLint for the route, shared AppShell, audit, and verification
  scripts;
- focused UI-migration TypeScript and full production TypeScript with the
  required 8 GB heap;
- 39 focused tests across 12 shared component, workspace, dialog, shell, and
  dashboard suites;
- production build with Prisma generation, Next.js compilation, production
  TypeScript, and all 315 application pages;
- 9 authenticated catalogue checks across Light, Night, and Violet at
  1440×1000 desktop, 1024×900 tablet, and 390×844 mobile;
- shared theme switching/persistence, 207 unique runtime components, module-state
  selection, dialog open/Escape/focus behavior, semantic tokens, exact route,
  application-error checks, and horizontal-overflow checks;
- 9 screenshots plus
  `artifacts/ui-migration/design-system-catalogue/verification.json`, with
  representative Light, Violet, and mobile Night captures reviewed;
- `git diff --check`.

Repository-wide `npm run lint -- --quiet` was executed with the required heap.
It remains red on the documented pre-existing business/module backlog (1,429
errors); the catalogue-scoped lint is clean. The production build retains the
six documented non-fatal broad filesystem/NFT trace warnings in HRMS,
customer-portal, and `next.config.ts`.

## Quality log: Communication and Admin batch 006

Passed:

- Discovered all 10 Communication, 10 Admin, and 15 Recruit routes directly
  from repository page sources. Recruit was already migrated in Batch 002 and
  was re-verified without presentation changes.
- Archived the active legacy Communication/Admin presentation before
  replacement; the repeatable static gate verifies the 45-file archive,
  checksum, size, and required entries.
- Added centralized Communication and Administration workspace frames, route
  metadata, navigation, metrics, panels, controls, tables, permission/loading/
  error states, settings layouts, role/session registers, and responsive dense
  Mail/Chat compositions.
- Replaced route-local overlays in Mail and Chat with the shared focus-managed
  dialog layer and removed the obsolete active Communication navbar.
- Preserved OAuth connection gates, Google mail/chat/calendar/Drive/Meet APIs,
  job-space provisioning and cleanup, notification preferences, role and
  permission APIs, session revocation/timeouts, passkey reset actions, data
  import, simulation controls, settings persistence, RBAC, validation, and
  audit logging.
- Regenerated the exhaustive audit: 211 pages, 14 layouts, 193 migrated, and
  17 pending.
- Static UI/archive/workflow gate:
  `node scripts/verify-monolith-communication-admin-ui.mjs`.
- Scoped ESLint for every changed TypeScript/TSX/MJS source: passed.
- Production TypeScript:
  `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`.
- Focused Vitest suite: 2 shared Communication/Admin composition tests.
- Production build:
  `NODE_OPTIONS=--max-old-space-size=8192 npm run build`; Prisma generation,
  Next.js compilation, production TypeScript, and all 315 application routes
  passed. The six existing broad filesystem/NFT trace warnings remain
  non-fatal and outside this batch.
- Authenticated production Playwright gate:
  `node scripts/verify-monolith-communication-admin-runtime.mjs --use-local-special-account`.
  It passed all 306 combinations covering 34 Communication, Admin, and Recruit
  routes in Light, Night, and Violet at 1440×1000 desktop, 1024×900 tablet, and
  390×844 mobile. Assertions cover exact paths, workspace/theme tokens,
  centralized controls/tables, application/server errors, legacy composition,
  and horizontal overflow; 81 representative screenshots and
  `artifacts/ui-migration/communication-admin/verification.json` were recorded.
- `git diff --check`.

Repository-wide `npm run lint` was run with the required heap and continues to
fail on the documented pre-existing lint backlog across seed/maintenance
scripts and unrelated business modules. The Batch 006 scoped lint passes.

## Quality log: Authentication and Miscellaneous batch 007

Passed:

- Discovered the complete module directly from all repository page sources:
  `/`, `/login`, `/setup`, `/verify/[id]`, and `/google-chat-link`.
- Archived all active legacy presentation before replacement. The repeatable
  static gate verifies the primary 13-file archive and supplemental
  ScrollNavigator archive by exact path, size, and SHA-256.
- Added the centralized public Monolith shell, brand, stage, panel, header,
  inset, actions, status, detail, and footer compositions, then rebuilt all
  five routes from those shared primitives.
- Preserved root-account authorization and module toggles, credential and
  Google SSO with safe callbacks and remember-me behavior, one-time platform
  setup, public letter verification, Google Chat identity replacement/linking,
  API error handling, validation, redirects, and data operations.
- Removed the obsolete 1,416-line login stylesheet and its unused visual type
  module. Legacy global controls are isolated from public Monolith routes, and
  the global ScrollNavigator is suppressed only on the five public/root route
  families.
- Regenerated the exhaustive audit: 211 pages, 14 layouts, 198 migrated, and
  12 pending. Every pending route belongs to `/customer-portal`.
- Static UI/archive/workflow gate:
  `node scripts/verify-monolith-auth-misc-ui.mjs`.
- Scoped ESLint for every changed TypeScript/TSX/MJS source: passed.
- Focused and production TypeScript with the required 8 GB heap: passed.
- Focused Vitest suites: 9 tests covering the public workspace, foundation,
  and shared workspace contracts.
- Production build:
  `NODE_OPTIONS=--max-old-space-size=8192 npm run build`; Prisma generation,
  Next.js compilation, production TypeScript, and all 315 application routes
  passed. The six existing broad filesystem/NFT trace warnings remain
  non-fatal and outside this batch.
- Production Playwright gate:
  `node scripts/verify-monolith-auth-misc-runtime.mjs --use-local-special-account`.
  It passed all 45 combinations across the five routes, Light, Night, and
  Violet, and 1440x1000 desktop, 1024x900 tablet, and 390x844 mobile. Checks
  cover exact paths, final page animation, semantic themes, standardized
  controls, loaded verification/link states, protected behavior, browser and
  server errors, legacy presentation, and horizontal overflow.
- Safe interaction checks cover login validation/password reveal and the
  mocked account-link success path. The public verification database fixture
  is reversible and was removed in `finally`.
- 45 screenshots plus
  `artifacts/ui-migration/auth-misc/verification.json` were reviewed across
  all themes and widths.

Repository-wide `npm run lint -- --quiet` was run with the required heap. It
continues to fail on the documented pre-existing seed, maintenance-script,
hook-effect, and unrelated business-module backlog; no Batch 007 file appears
in that backlog, and the complete Batch 007 scoped lint passes.

## Quality log: batch 001

Passed:

- Verified the batch archive checksum and all 9 archived relative paths.
- Targeted ESLint for every changed TypeScript/TSX file and both updated/new
  migration scripts.
- Focused TypeScript: `npx tsc --noEmit -p tsconfig.ui-migration.json`.
- Production TypeScript:
  `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`.
- Relevant Vitest suites: 27 tests across shared Monolith primitives, common
  states, shell routing/layout, navigation, and session security.
- Production build:
  `NODE_OPTIONS=--max-old-space-size=8192 npm run build`.
  - Prisma Client generated.
  - Next.js production compilation and TypeScript passed.
  - 315 static pages generated.
- Authenticated Playwright verification using the Webpack development server:
  - `/product-catalogue`, `/todo`, and `/notifications`;
  - Light, Night, and Violet themes;
  - 1440×1000 desktop, 1024×900 tablet, and 390×844 mobile;
  - user profile menu and all common state compositions;
  - 45 screenshots with route, theme, legacy-composition, and horizontal
    overflow assertions;
  - Product Catalogue search/module/blueprint interactions, To-Do dialog and
    task expansion, Notifications filters, and profile actions.

The migrated routes have no active imports from the replaced data table,
legacy card/button/input/select/modal composition, no inline color utilities,
and no legacy visual class families. Legacy global form/button/checkbox rules
are explicitly excluded while `data-dashboard-shell="true"` is active.

Repository-wide `npm run lint` was executed with an 8 GB heap. It still reaches
the pre-existing findings in Prisma seed scripts, maintenance scripts,
accounting, CHA, and other pending modules recorded by the foundation handoff.
All batch 001 files pass targeted ESLint.

The build retains the existing non-fatal Turbopack NFT trace warning from the
customer-portal checklist-file route.

## Quality log: batch 002

Passed:

- Verified the batch archive checksum, size, and all 81 archived paths.
- Regenerated the exhaustive route audit: 211 pages, 9 layouts, 49 migrated,
  and 161 pending.
- Static People Operations gate:
  `node scripts/verify-monolith-people-operations-ui.mjs`.
  - all 45 routes and their shared layout/loading/error boundaries;
  - no scoped raw standard controls, legacy data-table/ModuleHome imports,
    custom dialog overlays, legacy visual class families, fixed palette
    utilities, inline hex, or RGB colors;
  - protected biometric sync, punch, overtime server actions, and GPS behavior
    signals retained.
- Targeted ESLint for new shared components, layouts, boundaries, shell,
  verifier scripts, and tests.
- Focused TypeScript: `npx tsc --noEmit -p tsconfig.ui-migration.json`.
- Production TypeScript:
  `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`.
- Relevant Vitest suites: 20 tests in 7 suites covering foundation,
  workspace, People Operations metadata/composition, shell routing,
  navigation, overtime calculations, and HRMS letters.
- Clean production build:
  `NODE_OPTIONS=--max-old-space-size=8192 npm run build`.
  - Prisma Client generated.
  - Next.js production compilation and TypeScript passed.
  - 315 static pages generated.
  - Tailwind discovery is explicitly scoped to `src`, keeping archived and
    scratch visual code out of production compilation.
- Authenticated production Playwright matrix:
  - 45 routes: 38 HRMS and 7 Attendance;
  - Light, Night, and Violet at 1440×1000 desktop;
  - Violet at 1024×900 tablet and Light at 390×844 mobile;
  - 225 route/theme/viewport combinations and 32 representative captures;
  - exact-route, theme, semantic-token, shared-control/table, legacy-class,
    application-error, and horizontal-overflow assertions.

Repository-wide `npm run lint` was executed with an 8 GB heap and reports the
existing repository backlog: 2,147 findings (1,631 errors and 516 warnings) in
seed/maintenance scripts and pending modules. The new batch infrastructure
passes targeted ESLint. Presentation-converted legacy business views retain
their existing `no-explicit-any`, hook-effect, unused-symbol, escaped-text, and
image-rule findings; business behavior was not rewritten merely to mask that
pre-existing debt.

The build retains six non-fatal Turbopack broad file-trace warnings from
existing dynamic filesystem paths in HRMS letter generation, customer-portal
file routes/service code, and the existing NFT trace through `next.config.ts`.
They do not affect compilation or the verified runtime routes.

## HRMS employee profile expansion

`/hrms/employees/[id]` and `/hrms/settings` were extended on 2026-07-29
without changing their migrated Monolith page frame.

- The employee profile now includes editable basic, work, hierarchy, personal,
  identity, contact, separation, payroll, bank, education, prior-work,
  dependant, audit, and organisation-defined custom-field sections.
- Profile sections use compact full-width horizontal cards in a single
  sequence, with up to four internal information columns at desktop widths.
  Cards size to their own content instead of stretching beside a taller
  neighbour.
- The `/hrms/employees` directory now uses the full inherited workspace width
  and an explicit fixed desktop table grid, eliminating the collapsed columns
  and unused space inside each role card. Its aligned columns show photo or
  initials, employee ID, name, email, joining date, every role, department,
  location, employment status, login/account status, annual gross, and
  actions; the toolbar also shows the filtered total count.
- The directory filter now searches employee ID, name, email, designation,
  role, branch, department, and division, and filters by role, location,
  department, employee status, login/account status, and onboarding status.
- Added a shared Monolith export dialog and an organisation-scoped,
  `hrms.employee.read`-protected export endpoint. XLS, XLSX, CSV, and TSV
  downloads use the exact active directory filters, include the directory's
  employment, organisation, account, onboarding, and annual-gross columns,
  and neutralize spreadsheet-formula prefixes in employee-controlled text.
- The row login toggle is a shared People Operations control protected by
  `hrms.employee.deactivate`, excludes the signed-in user, retains
  organisation scoping, and uses the established user update path so disabling
  an account still revokes live sessions.
- Existing imported payroll metadata remains a fallback for employees that do
  not yet have a durable expanded profile.
- HRMS Settings now has a second responsive column for creating, editing,
  ordering, requiring, disabling, and deleting employee custom fields.
- Added organisation-scoped custom-field definitions, per-employee profile
  values, tenant/reference validation, audit metadata, and preservation of
  deactivation session revocation and appraisal-schedule synchronization.
- Applied database migration
  `20260729183000_add_employee_hrms_profiles`.
- Pre-change visual sources are archived at
  `OLD UI code/legacy-ui-before-hrms-employee-profile-expansion-20260729.zip`
  (9,468 bytes; SHA-256
  `96BB11CA91858C2E76E10D6825CB33CA40B188B4337F85F5465EDF5B77A047BA`).
- The pre-change employee-directory visual sources are archived at
  `OLD UI code/legacy-ui-before-hrms-employee-directory-expansion-20260729.zip`
  (6,845 bytes; SHA-256
  `438C73350E07CB606053F4767A33E173C302E693584E571CCAC1036D65871C0D`).
- Targeted ESLint, production TypeScript, three focused Vitest cases, Prisma
  generation, database migration deploy, `git diff --check`, and the
  316-page production build pass with the existing non-fatal `next.config.ts`
  NFT trace warning.
- The subsequent directory alignment batch passes targeted ESLint, production
  TypeScript, six focused People Operations/profile tests, the static
  45-route People Operations verifier, `git diff --check`, and a fresh
  316-page production build with the same existing non-fatal NFT warning.
- The filter/export follow-up passes targeted ESLint, production TypeScript,
  12 focused People Operations/profile/export tests, the same 45-route static
  verifier, and a fresh 317-page production build. The build includes
  `/api/hrms/employees/export` and retains the same existing non-fatal
  `next.config.ts` NFT trace warning.
- A fresh in-app Browser connection attempt followed the required
  troubleshooting flow, but no browser instance was exposed. Interactive
  Light/Night/Violet and responsive verification of the directory filter,
  export dialog/download, and updated profile/settings routes remains pending;
  their prior batch-level verification is not being reused as evidence for the
  new controls.

## Post-batch 002 shell correction

The Monolith workspace sidebar now renders functional, permission-filtered
submenus for every navigation section that has children.

- Parent rows are accessible expand/collapse buttons with `aria-expanded` and
  `aria-controls`.
- The active workspace opens automatically and the most-specific child route
  receives `aria-current`.
- Nested links work in the full desktop sidebar, compact desktop rail, and
  mobile drawer; mobile child navigation closes the drawer.
- Authenticated browser verification covered HRMS, Attendance, To-Do, and AMS,
  including collapse/reopen and nested navigation.
- Targeted ESLint, full TypeScript, 7 navigation/layout tests, and the 8 GB
  production build passed.

## Quality log: batch 003

Passed:

- Verified the batch archive checksum, size, and all 47 archived source paths.
- Regenerated the exhaustive route audit: 211 pages, 11 layouts, 73 migrated,
  and 137 pending.
- Static Performance and Learning gate:
  `node scripts/verify-monolith-performance-learning-ui.mjs`.
  - all 23 routes (18 AMS and 5 LMS), including every dynamic route pattern;
  - shared layouts plus loading and error boundaries;
  - no scoped raw standard controls/tables, legacy data-table/ModuleHome
    imports, custom fixed overlays, legacy visual class families, fixed palette
    utilities, inline hex, or RGB colors;
  - protected appraisal assignment/detail/criteria/self-assessment/management
    review, asset, LMS, and PMS behavior signals retained.
- Targeted ESLint for new shared components, layouts, boundaries, shell,
  rewritten LMS/PMS views, verifier scripts, and tests.
- Focused TypeScript: `npx tsc --noEmit -p tsconfig.ui-migration.json`.
- Production TypeScript:
  `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`.
- Relevant Vitest suites: 34 tests in 7 suites covering foundation, workspace,
  Performance and Learning metadata/composition, shell routing, navigation,
  and session security.
- Clean production build:
  `NODE_OPTIONS=--max-old-space-size=8192 npm run build`.
  - Prisma Client generated.
  - Next.js production compilation and TypeScript passed.
  - 315 static pages generated.
- Authenticated runtime matrix:
  - 23 routes: 18 AMS and 5 LMS;
  - Light, Night, and Violet at 1440×1000 desktop;
  - Violet at 1024×900 tablet and Light at 390×844 mobile;
  - 115 route/theme/viewport combinations and 24 representative captures;
  - exact path, completed route loading, shell/theme, semantic tokens, shared
    controls/tables, no legacy composition, no application errors, and no
    horizontal overflow;
  - real appraisal and employee records exercised the available dynamic
    detail and assignment routes; unavailable management-review, asset,
    self-assessment, and reviewer fixtures were verified through their exact
    authenticated not-found boundaries without mutating business data.

Repository-wide `npm run lint` was executed with an 8 GB heap and reports the
existing repository backlog: 2,120 findings (1,618 errors and 502 warnings) in
seed/maintenance scripts and pending modules. The new batch infrastructure and
rewritten LMS/PMS surfaces pass targeted ESLint. Presentation-converted legacy
AMS business views retain 20 errors and 33 warnings from their existing
`no-explicit-any`, hook-effect, purity, unused-symbol, escaped-text, and image
rules; business behavior was not rewritten merely to mask that debt.

The build retains six non-fatal Turbopack broad file-trace warnings from
existing dynamic filesystem paths in HRMS letter generation, customer-portal
file routes/service code, and the NFT trace through `next.config.ts`. They do
not affect compilation or the verified runtime routes.

## Quality log: batch 004

Passed:

- Archived and verified 37 active legacy Expense/CHA route, view, component,
  and style sources before replacement.
- Regenerated the exhaustive route audit: 211 pages, 12 layouts, 85 migrated,
  and 125 pending.
- Static Expense and CHA gate:
  `node scripts/verify-monolith-expense-cha-ui.mjs`.
  - all 12 routes (11 CHA and 1 Expense), including customer and job dynamic
    route patterns;
  - shared workspace layouts plus loading and error boundaries;
  - no scoped raw standard controls/tables, legacy data-table imports, custom
    fixed overlays, legacy visual class families, fixed-palette utilities,
    inline hex, or RGB colors;
  - protected job stages, prerequisites, approvals, documents, filing,
    expenses, RBAC, and server-action signals retained.
- Targeted ESLint for the new shared workspace infrastructure, layouts,
  boundaries, shell, verifier scripts, and tests.
- Focused TypeScript: `npx tsc --noEmit -p tsconfig.ui-migration.json`.
- Production TypeScript:
  `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`.
- Monolith workspace/foundation/shell Vitest suites: 14 tests in 4 suites.
- CHA checklist and date-extension focused suites: 12 tests in 2 suites.
- Production build:
  `NODE_OPTIONS=--max-old-space-size=8192 npm run build`.
  - Prisma Client generated.
  - Next.js production compilation and TypeScript passed.
  - 315 static pages generated.

The broader CHA integration suite completed 24 of 27 tests. Its three failures
are fixture/environment expectations outside this presentation migration: an
unavailable Google Drive checklist attachment, a null `estimatedFilingDate`
fixture, and an audit-event name mismatch (`JOB_DELETE_EXECUTED` is emitted
where the test expects `JOB_DELETED_DIRECT`). No workflow behavior was changed
to force those tests green.

Repository-wide lint was executed with an 8 GB heap and reports the existing
backlog: 2,117 findings (1,617 errors and 500 warnings). The batch-scoped
legacy business views retain 375 errors and 71 warnings, concentrated in the
large job workspace and workflow builder, from their existing
`no-explicit-any`, hook-effect, unused-symbol, and related business-code debt.
New batch infrastructure passes targeted ESLint.

Blocked:

- The connected in-app Browser service returned no browser instance
  (`agent.browsers.list()` returned an empty list). Therefore the required
  authenticated Light, Night, and Violet checks at desktop, tablet, and mobile
  widths have not been performed.
- Batch 004 is intentionally not marked Verified and has not been committed as
  a verified batch. Once a Browser instance is available, exercise all 12
  routes, including loaded dynamic job/customer fixtures and every dialog,
  drawer, filing stage, theme, and viewport, then commit only if that matrix
  passes.

## Quality log: CRM batch 005

Passed:

- Discovered all 57 CRM routes from `src/app/**/page.tsx`, including every
  dynamic contact, customer, deal, enquiry, invoice, item, lead, quote, and
  ticket route rather than relying on navigation links.
- Archived and verified 131 active legacy CRM route, view, shared CRM, and
  item-presentation sources before replacement.
- Regenerated the exhaustive route audit: 211 pages, 12 layouts, 142 migrated,
  and 68 pending.
- Static CRM gate: `node scripts/verify-monolith-crm-ui.mjs`.
  - all 57 routes and all dynamic route patterns;
  - shared CRM workspace, controls, connected metrics, panels, toolbars, tabs,
    tables, record links, dialogs, loading/error/empty/configuration/permission
    states, and responsive semantic styles;
  - no scoped raw standard controls/tables, route-local fixed overlays, legacy
    visual class families, fixed-palette utilities, inline hex, or RGB colors;
  - RBAC, authentication, server actions, data services, validation,
    integrations, and protected workflow signals retained.
- Targeted ESLint for the new CRM workspace infrastructure, layout,
  boundaries, shell switch, verifier, and test.
- Focused TypeScript: `npx tsc --noEmit -p tsconfig.ui-migration.json`.
- Production TypeScript:
  `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`.
- Relevant Vitest suites: 21 tests in 7 suites covering the CRM workspace,
  Monolith foundations, dialogs, CHA workspace, navigation, and JustDial
  import behavior.
- Production build:
  `NODE_OPTIONS=--max-old-space-size=8192 npm run build`.
  - Prisma Client generated.
  - Next.js production compilation and TypeScript passed.
  - 315 static pages generated, including all 57 CRM routes.
- Production HTTP authentication smoke: `/crm` returned the expected `307`
  redirect to `/login?callbackUrl=%2Fcrm`.
- `git diff --check`.

Repository-wide lint was executed with an 8 GB heap and retains its known
backlog: 2,113 findings (1,616 errors and 497 warnings). The CRM-scoped legacy
business views retain 222 errors and 98 warnings, concentrated in the lead and
enquiry detail workspaces, from existing `no-explicit-any`, hook-effect,
unused-symbol, and related business-code debt. New batch infrastructure passes
targeted ESLint. Business behavior was not rewritten merely to mask unrelated
lint debt.

The production build retains the existing non-fatal Turbopack broad file-trace
warning through `next.config.ts` and the customer-portal checklist-file route.

Blocked:

- The production app started at `http://127.0.0.1:3100` with the required 8 GB
  Node heap. Browser runtime initialization succeeded, but
  `agent.browsers.getForUrl(...)` reported no available browser and the
  required one-time `agent.browsers.list()` query returned `[]`.
- The Browser skill prohibits substituting standalone Playwright or another
  unrelated backend. Therefore the authenticated 57-route × 3-theme ×
  3-viewport visual matrix, dynamic loaded-state and dialog checks have not
  been performed.
- Batch 005 is intentionally not marked Verified and has not been committed as
  a verified batch. Attach an in-app Browser instance, run the 513 route/theme/
  viewport combinations and representative interaction checks, then commit
  only if that matrix passes.

## Post-batch 004 shared popup correction

Implemented on 2026-07-29 in response to the oversized create-job workspace and
the same popup contract used throughout migrated Monolith routes.

- Consolidated `WorkspaceDialog`, the general `Modal` adapter, and
  `ChaDialogLayer` onto one portal, backdrop, focus, keyboard, and document
  scroll-lock implementation.
- Replaced the fixed 56rem CHA workspace height with shared compact, default,
  wide, and workspace sizes. Workspace dialogs are capped at 52rem and 88dvh
  on desktop, keeping surrounding context and close/actions visible.
- Kept headers and footers outside the scrollable content region for standard
  dialogs. The create-job workspace retains one bounded form-content scroller
  instead of scrolling the entire overlay and form independently.
- Added safe-area-aware mobile bottom-sheet behavior and full-width actions,
  while desktop and tablet dialogs remain centered and inset.
- Added accessible title/description relationships, Escape handling, focus
  containment, trigger-focus restoration, stacked-dialog-safe body locking,
  scrollbar compensation, and backdrop dismissal.
- Stabilized inline close callbacks so typing or other popup state changes do
  not restart the dialog lifecycle or steal focus.
- Replaced the context-specific default `People operations` modal eyebrow with
  the neutral `Workspace action` label for shared dialogs used by AMS, CHA, and
  Expense.
- Scanned all migrated route and component sources. No route-local
  `fixed inset-0` popup remains; migrated modal workflows delegate to the
  centralized layer. The AppShell mobile navigation drawer remains its own
  centralized navigation primitive.

Backup:
`OLD UI code/legacy-ui-before-monolith-popup-fix-20260729-384cfad.zip`

- Five pre-correction sources with relative paths retained.
- Size: 44,608 bytes.
- SHA-256:
  `6ED2CAF2AB94813E0BB5235B847C39DA9762FE7154E065EB4D595508FB2DE119`.
- Checksum, exact five-file listing, and required entries pass through the
  Expense/CHA static verifier.

Passed:

- updated static Expense/CHA and centralized popup contract gate;
- targeted ESLint for the shared dialog, modal adapter, CHA adapter, verifier,
  and popup contract test;
- full production TypeScript with the required 8 GB Node heap;
- 16 tests in 5 Monolith workspace, popup, foundation, and shell suites;
- production build with the required 8 GB Node heap, including Prisma
  generation, Next.js compilation, production TypeScript, and 315 static
  pages.

Blocked:

- The connected Browser service again returned no available browser instance
  (`agent.browsers.list()` returned `[]`). Live Light, Night, and Violet
  verification at desktop, tablet, and mobile widths is therefore still
  pending for representative To-Do, HRMS, Attendance, AMS, Expense, and CHA
  dialogs, including the create-job workspace shown in the defect report.

## Quality log: Accounting batch 005

Passed:

- Discovered all 32 Accounting routes directly from
  `src/app/(dashboard)/accounting/**/page.tsx`, including five dynamic detail
  patterns and the commercial-document aliases absent from a simple sidebar
  inventory.
- Archived the active legacy Accounting presentation and its CRM/item visual
  dependencies before replacement. The repeatable static gate verifies the
  archive checksum, size, 68-file listing, and required paths.
- Added the shared Accounting workspace layout, loading/error boundaries,
  metadata, route headers, metrics, sections, toolbars, tables, dialogs,
  record cards, details, statuses, and semantic responsive styles.
- Centralized specialized invoice form/detail, commercial-document form,
  item catalogue/form/detail, and delete-action components instead of
  duplicating route-local visual implementations.
- Preserved Accounting and CRM server actions, Prisma/service reads, RBAC,
  validation, ledger posting controls, allocation behavior, CSV/JSON
  import/export, quotations and note conversion/submission, and commercial
  document integrations.
- Removed active Accounting imports from the legacy CRM invoice form, legacy
  CRM delete button, and legacy shared item presentation.
- Regenerated the exhaustive audit: 211 pages, 13 layouts, 117 migrated, and
  93 pending.
- Static UI/archive/workflow gate:
  `node scripts/verify-monolith-accounting-ui.mjs`.
- Targeted ESLint for all Accounting route sources, shared specialized
  components, shell/audit/runtime verifiers, and focused tests.
- Production TypeScript:
  `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`.
- Five focused Vitest suites: 22 tests covering Accounting services, shared
  workspace composition, centralized workspace/dialog contracts, and shell
  routing.
- Production build:
  `NODE_OPTIONS=--max-old-space-size=8192 npm run build`.
  - Prisma Client generated.
  - Next.js compilation and production TypeScript passed.
  - 315 static pages generated.
  - The six existing broad filesystem/NFT trace warnings remain non-fatal and
    originate outside Accounting.
- Authenticated Playwright runtime gate:
  `node scripts/verify-monolith-accounting-runtime.mjs --use-local-special-account`.
  - all 32 exact routes, including loaded dynamic item, journal, payment,
    sales-invoice, and purchase-invoice details;
  - Light, Night, and Violet themes at 1440×1000 desktop, 1024×900 tablet, and
    390×844 mobile;
  - 288 route/theme/viewport combinations and 72 representative screenshots;
  - exact paths, completed route/header state, active theme and semantic
    tokens, centralized controls/tables, no legacy composition, no browser or
    server errors, and no page-level horizontal overflow;
  - mobile quotation-dialog viewport bounds and Escape dismissal;
  - temporary dynamic-route fixtures were inserted with unique test IDs,
    removed in the verifier's `finally` cleanup, and independently confirmed
    absent after the run.
- `git diff --check`.

## Post-batch 004 theme-tinted glass correction

Implemented on 2026-07-29 for transparent popup, dropdown, and drawer surfaces
across the active Monolith shell.

- Fixed the root cause: Monolith semantic aliases previously existed only
  inside `.mnx-dashboard-shell`, while dialogs and dropdown menus are portaled
  under `body`. The aliases now also inherit from
  `html[data-dashboard-shell="true"]`, without affecting non-Monolith pages.
- Added centralized Light, Night, Violet, and Purple glass-surface, border,
  overlay, shadow, fallback, and blur/saturation tokens. Surfaces retain
  backdrop blur while receiving a strong theme tint and readable contrast.
- Applied the shared contract to `WorkspaceDialog`/`Modal`/`ChaDialogLayer`,
  Radix dropdowns and selects, filter menus, profile and command popups,
  warning popovers, mobile navigation drawer/backdrop, Mona chat/model
  menu/tooltip, dialog action bars, and Sonner notifications.
- Added opaque fallbacks for browsers without `backdrop-filter` and for the
  `prefers-reduced-transparency` accessibility preference.
- Removed the undefined legacy `--card`, `--text`, `--border`, and `--shadow`
  references from the shared portaled dropdown implementation.
- No workflow, validation, RBAC, server action, data operation, or integration
  behavior changed.

Backup:
`OLD UI code/legacy-ui-before-monolith-glass-tint-20260729-384cfad.zip`

- Seven pre-correction sources with relative paths retained.
- Size: 51,478 bytes.
- SHA-256:
  `9FA4F7F7F253149910A4A61151B57F04CBD8675651D15C50F0C52376195A5BB5`.
- Checksum, exact seven-file listing, and required entries pass through the
  Expense/CHA static verifier.

Passed:

- centralized theme-tinted glass and popup static gate;
- targeted ESLint for the changed shared infrastructure, verifier, and test;
- full production TypeScript with the required 8 GB Node heap;
- 17 tests in 5 Monolith popup, workspace, foundation, and shell suites;
- `git diff --check`;
- production build with the required 8 GB Node heap, including Prisma
  generation, Next.js compilation, production TypeScript, and all 315 pages;
- local HTTP smoke: `/todo` returned the expected authenticated `307` redirect
  to `/login?callbackUrl=%2Ftodo`.

The changed Mona and CHA create-job presentation-only class references compile
and type-check. Their files retain the previously documented legacy ESLint
backlog; no business code was rewritten to conceal that unrelated debt.

Blocked:

- Browser selection for `http://127.0.0.1:3001` returned no available browser,
  and the required one-time availability check returned `[]`. Live computed
  style, screenshot, focus, theme, and responsive verification is still
  pending in Light, Night, and Violet. This correction is implemented and
  statically verified, but is not declared visually Verified or committed.

## Post-batch 004 CHA reference dialog and dropdown correction

Implemented on 2026-07-29 using the attached To-Do create-task dialog as the
visual reference for every CHA popup, dialog, popover, and dropdown.

- Added centralized CHA adapters for `Modal`, `DropdownSelect`,
  `NativeSelect`, `FilterMenu`, and `WarningIndicatorPopover`. CHA consumers no
  longer import those unscoped floating primitives directly.
- Applied one semantic floating-surface contract to all 45 native selects, 7
  custom selects, the workflow document action menu, customer/job filters,
  warning popovers, route/location/customer/owner/manager/team autocomplete
  menus, workflow validation popup, job note popovers, permission dialogs,
  job-workspace dialogs, and the create-job success state.
- Replaced the oversized gold create-job promotional treatment with the
  reference header/body/footer composition: neutral theme-aware surface,
  bounded content scroller, compact title/description/close actions, neutral
  controls, and persistent footer actions.
- Rebuilt the create-job success popup on the same contract instead of nesting
  a second decorative surface inside the dialog.
- Light, Night, Violet, and Purple consume the existing semantic surface,
  control, text, border, overlay, accent, shadow, and glass tokens. Native
  option surfaces inherit each theme’s color scheme.
- Preserved all CHA validation, RBAC, server actions, workflow behavior,
  document operations, expenses, filters, routing, and integrations.

Backup:
`OLD UI code/legacy-ui-before-cha-dialog-reference-20260729-fd1cbe7.zip`

- 22 pre-correction CHA and shared floating-surface sources with relative paths
  retained.
- Size: 197,905 bytes.
- SHA-256:
  `EBFB1DB5B9C49479391B94549DC047DABAA699AA13FDF4F10B3635CF638E4F0F`.
- Checksum, exact 22-file listing, required entries, and all earlier archives
  pass through `scripts/verify-monolith-expense-cha-ui.mjs`.

Passed:

- exhaustive static gate for all 11 CHA routes plus `/expense`, every CHA
  floating consumer, protected behavior signals, and four archive records;
- targeted ESLint for the new shared adapters, popup contract test, and
  verifier;
- focused and production TypeScript with the required 8 GB Node heap;
- 13 tests in 4 Monolith workspace, popup, and foundation suites;
- production build with Prisma generation, Next.js compilation, production
  TypeScript, and all 315 pages;
- authenticated-route HTTP smoke at `http://127.0.0.1:3100/cha/jobs`, returning
  the expected `307` login redirect;
- `git diff --check`.

The create-job business component retains 13 errors and 1 warning from its
pre-existing `no-explicit-any`, hook-effect, and dependency lint debt. New
shared adapter and verification infrastructure passes targeted ESLint.

Blocked:

- Browser selection for `http://127.0.0.1:3000` again returned no available
  browser and the required one-time availability query returned `[]`.
- Live Light, Night, Violet, and Purple visual verification at desktop, tablet,
  and mobile widths remains pending for all CHA dialog, select, menu, filter,
  autocomplete, warning, success, and permission states. This correction is
  implemented and statically verified but is not declared visually Verified.

## HRMS employee invitation and self-service lifecycle

Implemented on 2026-07-29.

- Replaced direct temporary-password employee creation with an HR-controlled
  invitation flow. HR creates the pending employee, employment record, initial
  HRMS profile, organisation assignments, bank data, and roles before a secure
  email invitation is issued.
- Invitation secrets are random 32-byte values; only SHA-256 hashes are stored.
  Links expire after 72 hours by default, are single-use, and old links are
  revoked on resend. Acceptance consumes the invitation and activates the user
  in one database transaction.
- Added public invitation review, password creation, and workspace-ready pages.
  Passwords require at least 12 characters with upper- and lower-case letters
  and a number. Public read/accept endpoints are rate-limited and return
  no-store responses.
- Pending employees appear immediately in the Employee directory and profile
  with Invited, Invite Expired, or Invite Delivery Failed states. HR can resend
  an invitation, and pending accounts cannot be activated through the generic
  account toggle.
- Removed the redundant `Onboard Employee` HRMS sidebar and dashboard
  quick-action entry. Employee creation and invitation remain contextual to the
  consolidated Employees directory, which links to the existing protected
  creation flow.
- Added employee self-service discovery through the shell profile menu.
  Employees may edit only the server allowlisted basic/KYC fields, addresses,
  education, work experience, and dependents. Department, branch, division,
  joining/exit dates, employment status/type, reporting lines, bank details,
  salary, roles, system fields, work-contact fields, and custom HR fields remain
  HR-only even when a request is forged outside the UI.
- Existing email infrastructure is reused through Resend or SMTP. Delivery
  failures retain the pending employee record and surface a resend action to HR.
- Applied database migration
  `20260729201500_add_employee_invitations` successfully.
- Updated the test runner exclusions so immutable `_design-reference`, archived
  `OLD UI code`, generated clients, and build output are never compiled as
  production tests.
- Corrected the pre-existing Attendance OT PageProps contract to the Next 16
  async `searchParams` shape because its stale development declaration blocked
  the otherwise successful production type phase.

Backup:
`OLD UI code/legacy-ui-before-hrms-employee-invitations-20260729.zip`

- Size: 24,105 bytes.
- SHA-256:
  `7A7B1DF27B5B3BD28CA363909E3920161B7E0A346F95D9652E88A69C1BDBA5CF`.

Passed:

- Prisma client generation and migration deployment;
- full production TypeScript with the required 8 GB Node heap;
- targeted ESLint for all invitation, employee profile/directory, shell, API,
  test, and supporting files;
- 19 focused invitation, replay-protection, self-service allowlist, employee
  profile, and export tests;
- production-source suite: 32 of 33 files and 208 of 211 tests passed; the
  remaining three failures are pre-existing CHA Drive/filing/audit integration
  expectations unrelated to HRMS;
- People Operations static verifier: all 45 routes and protected-behavior
  signals passed;
- exhaustive route audit: 213 pages and 14 layouts;
- production build: Prisma generation, Next compilation, production TypeScript,
  and all 321 pages;
- `git diff --check`.

Repository-wide ESLint still reports the known broad legacy backlog. The
invitation scope passes targeted lint. The build retains one existing non-fatal
Turbopack broad-file trace warning through `next.config.ts` and the customer
portal checklist-file route.

Blocked:

- The required browser connection returned no available browser and the
  one-time availability query returned `[]`. Live Light, Night, and Violet
  visual verification of invitation acceptance, workspace-ready, HR invite,
  invited-directory, and self-service states remains pending.

## HRMS daily work report workflow upgrade

Implemented on 2026-07-29 for the already migrated `/hrms/work-reports`,
`/hrms/settings`, and `/hrms/approvals` routes.

- Replaced the compact single-entry daily-report popup with a wide rectangular
  workspace dialog and repeatable work line items. Each line retains an
  independent job number/name and detailed description.
- Added an organisation-scoped Work Report Setup column to HRMS Settings.
  Administrators can create text, long-text, number, date, select, and yes/no
  fields, set required/active state and display order, choose one-level or
  two-level approval, and require a finally approved report for daily OT.
- Work report submission refreshes browser GPS immediately before save,
  resolves a readable address with coordinate fallback, and persists latitude,
  longitude, accuracy, address, and a server-generated capture timestamp.
- One-level approval routes to the primary reporting manager. Two-level
  approval holds the secondary reporting manager until the primary manager
  approves. A rejection closes later levels; final approval completes the
  report.
- Active managers receive in-app and email-backed notification records.
  Approval/rejection is available both on the Work Reports detail timeline and
  in the HRMS Approvals inbox. Employees receive the final decision.
- When the administrator enables the OT dependency, missing, pending, or
  rejected reports produce zero OT with `WORK_REPORT_REQUIRED`. Final approval
  recalculates the affected attendance date.
- Applied database migration
  `20260729233000_upgrade_work_reports` successfully to the configured
  PostgreSQL database.

Backup:
`OLD UI code/legacy-ui-before-work-report-upgrade-20260729.zip`

- Five pre-upgrade work-report and HRMS-settings route/component sources with
  relative paths retained.
- Size: 9,674 bytes.
- SHA-256:
  `C2695E8858C51DFF58A2848C59C541745BD05225144490184E7AE23D2E91D490`.

Passed with the required 8 GB Node heap:

- Prisma format, client generation, migration status, and migration deploy;
- targeted ESLint for every changed TypeScript/TSX production and test source;
- production TypeScript with `npx tsc --noEmit`;
- 9 focused work-report approval and OT tests across 2 suites;
- People Operations static verifier for all 45 HRMS and Attendance routes,
  shared controls/dialogs/states, semantic colours, catalogue coverage, and
  protected behavior signals;
- production build with Prisma generation, Next.js compilation, production
  TypeScript, and all 323 generated pages;
- database migration status reports the schema is up to date.

The build retains the existing non-fatal Turbopack broad-file trace warning
through `next.config.ts` and the customer-portal checklist-file route.

Blocked:

- Browser selection for `http://localhost:3100/hrms/work-reports` returned no
  available browser. After the required troubleshooting read, the one-time
  availability query returned `[]`.
- Live Light, Night, and Violet verification remains pending for the rectangular
  dialog, add/remove rows, dynamic fields, GPS permission/refresh/error states,
  settings column, manager decision controls, approval handoff, and responsive
  overflow/focus behavior. The upgrade is implemented, migrated, lint/type/test/
  build clean, but is not declared visually Verified.

## HRMS document drive rework

Implemented on 2026-07-29 for the already migrated `/hrms/files` route.

- Replaced the simulated local file ledger with real multipart uploads to the
  organisation Shared Drive configured for the existing Google Workspace/CHA
  integration.
- Provisioning creates `Monolith HR Document Drive` with managed `My Space
Files`, `Company Files`, and `Employee Shared` category folders. My Space and
  Employee Shared create employee subfolders using
  `Employee Name - ID {employeeNumber}` with user ID fallback.
- My Space listing, upload, open, and download are restricted server-side to
  the owning employee, including against forged API requests.
- Company Files are readable by every authenticated member of the
  organisation. Upload is restricted to HR document administrators.
- Employee Shared files are readable only by the owning employee, their current
  primary or secondary reporting manager, and HR. Reporting managers can view
  only their direct reports; only the owner or HR can upload.
- Google Drive links and IDs are never returned to the browser. Authorised open
  and download requests are proxied through a protected no-store route, and
  active-content MIME types are forced to download instead of inline rendering.
- Upload and download events are written to the existing HRMS audit log. The
  former arbitrary folder creator and false simulated malware-clean badge were
  removed.
- Applied database migration
  `20260729234500_rework_hr_document_drive` successfully to the configured
  PostgreSQL database.

Backup:
`OLD UI code/legacy-ui-before-hr-document-drive-rework-20260729.zip`

- Size: 5,933 bytes.
- SHA-256:
  `25E1C5B3DF3CFA282A1BA8694F697A44FFEEA898F5BFFE5620194F12E630F775`.

Passed with the required 8 GB Node heap:

- Prisma format, validation, client generation, migration deployment, and final
  migration status;
- targeted ESLint for the Drive service/client, HRMS page/component, API routes,
  and shared page metadata;
- production TypeScript through both `npx tsc --noEmit` and the Next.js build;
- 7 focused hierarchy, read-policy, and upload-policy tests;
- production build with Prisma generation, Next.js compilation, production
  TypeScript, the protected file endpoint, and all 323 generated pages;
- full repository suite: 35 of 37 files and 222 of 226 tests passed. The one
  protected-dashboard CSS expectation and three existing CHA integration-data
  expectations are unrelated to the HR document drive.

The build retains the existing non-fatal Turbopack broad-file trace warning
through `next.config.ts` and the customer-portal checklist-file route.

Blocked:

- Browser selection for `http://localhost:3000/hrms/files` returned no available
  browser. After the required troubleshooting read, the one-time availability
  query returned `[]`.
- Live Light, Night, and Violet verification remains pending for all three tabs,
  upload/error/empty states, HR and manager employee selectors, responsive table
  overflow, and keyboard focus. The page is implemented, migrated, lint/type/
  policy-test/build clean, but is not declared visually Verified.

## HRMS quick add employee

Implemented on 2026-07-29 for the already migrated `/hrms/employees` route.

- Added an HR-only `Add Employee` action alongside the retained `Full
Onboarding` flow.
- The quick dialog asks only for mandatory Employee ID, first name, last name,
  and email address. It can generate the next globally unused numeric employee
  ID and displays the organisation's last employee ID.
- Quick creation reuses the existing hashed, expiring, single-use employee
  invitation lifecycle and assigns the organisation's default Employee role.
- The employee is created as an inactive pending account with an empty HRMS
  profile and `Not started` onboarding status. No joining date, department,
  reporting line, salary, employment type, or other unknown value is invented.
- The employment record remains absent until HR edits the employee profile and
  supplies a real joining date; the existing profile save then upserts the
  employment record and appraisal schedule.
- Duplicate email and Employee ID checks remain server-side. Invitation
  delivery failure keeps the employee record and exposes the existing resend
  workflow from the profile.
- Both quick add and full onboarding actions are hidden unless the viewer has
  `hrms.employee.create`; both API operations independently enforce the same
  permission.
- No database migration was required.

Backup:
`OLD UI code/legacy-ui-before-hrms-quick-add-employee-20260729.zip`

- Size: 5,951 bytes.
- SHA-256:
  `C7E9AECEFC7886C09FE778959DD42F4F2C91C94E972C523ECCA94706E9EBB841`.

Passed with the required 8 GB Node heap:

- targeted ESLint for the directory page/action, quick API, invitation service,
  and focused tests;
- production TypeScript with `npx tsc --noEmit`;
- 22 focused invitation lifecycle, quick-add, employee-profile, and
  employee-export tests across 5 suites;
- production build with Prisma generation, Next.js compilation, production
  TypeScript, the new protected API route, and all 324 generated pages;
- `git diff --check`.

The build retains the existing non-fatal Turbopack broad-file trace warning
through `next.config.ts` and the customer-portal checklist-file route.

Blocked:

- Browser selection for `http://localhost:3000/hrms/employees` returned no
  available browser. The previously loaded one-time availability query for this
  connected session returned `[]`.
- Live Light, Night, and Violet verification remains pending for the quick
  dialog, generated/manual Employee ID, validation, invitation success/failure,
  focus behavior, and desktop/tablet/mobile layouts. The change is implemented
  and lint/type/test/build clean, but is not declared visually Verified.

## Post-batch 004 CHA Jobs datatable controls

Implemented on 2026-07-29 after merge resolution.

- Matched the `/cha/jobs` Active and Completed Jobs datatable toolbars to the
  shared Monolith table reference: left-aligned icon search, right-aligned New
  Job and Filter controls, no extra Apply Search button, and shared search/
  control sizing.
- Preserved existing search, filter, pagination, creation, permission, and row
  navigation behavior.

Backup:
`OLD UI code/ui-iteration-backups/cha-jobs-datatable-controls-reference-20260729/`

Passed:

- targeted ESLint for `src/app/(dashboard)/cha/jobs/jobs-client.tsx`;
- `npx tsc --noEmit -p tsconfig.ui-migration.json`;
- static Expense/CHA verifier:
  `node scripts/verify-monolith-expense-cha-ui.mjs`.

Blocked:

- Authenticated visual verification remains covered by the existing missing
  browser-instance blocker for CHA.

## Login animated character restore

Implemented on 2026-07-29 by request for `/login` only.

- Restored the pre-Batch-007 animated Monolith character login scene while
  preserving the existing credential, SSO, remember-me, callback, stale-session
  cleanup, validation, and redirect behavior.
- Kept the change scoped to `src/components/auth/monolith-logistics-login.tsx`,
  its CSS module, and the small login scene type helper.
- Other Authentication/Miscellaneous routes remain on the Batch 007 public
  Monolith surfaces.

Backup:
`OLD UI code/ui-iteration-backups/login-animated-character-restore-20260729/`

## Dashboard module graphics correction

Implemented on 2026-07-29 for the protected `/dashboard` module command center.

- Restored the shared `mnx-dashboard-graphic` and `mnx-dg-*` semantic graphic
  token classes consumed by the module illustration components.
- Constrained the module-card art slot so the Product Catalogue, HRMS,
  Attendance, AMS, LMS, CRM, and related dashboard graphics are centered and
  scaled inside their panels instead of rendering as broken outline fragments.
- Preserved dashboard business data, module links, metrics, ordering, and card
  interaction behavior.

Backup:
`OLD UI code/ui-iteration-backups/dashboard-module-graphics-fix-20260729/`

## CHA dashboard workspace style restore

Implemented on 2026-07-29 for the protected `/cha` command workspace.

- Restored the shared CHA heading, Assigned Jobs toolbar, search, filter menu,
  and status text classes consumed by the dashboard workspace table.
- Normalized the Assigned Jobs action buttons and filter trigger back to the
  Monolith datatable pill sizing instead of legacy compact/unstyled controls.
- Restored the shared Operations Overview panel, pending action, expiry,
  empty-state, job-reference, and recent-activity timeline styles.
- Preserved existing job queries, permissions, links, refresh behavior,
  warning indicators, filters, and row navigation.

Backup:
`OLD UI code/ui-iteration-backups/cha-dashboard-styles-restore-20260729/`

Follow-up backup for the action-button correction:
`OLD UI code/ui-iteration-backups/cha-dashboard-action-buttons-fix-20260729/`

Design-system primitive revert:

- Moved the action-button correction out of global `mnx-button-outline` and
  `mnx-filter-button` selectors and into the CHA Assigned Jobs toolbar scope so
  the design-system primitives keep their original button presentation.

Backup:
`OLD UI code/ui-iteration-backups/design-system-button-revert-20260729/`

## Monolith button and filter primitive recreation

Implemented on 2026-07-29 for the shared design-system primitives and
datatable filter trigger.

- Recreated the reference button hierarchy in the shared Monolith button
  classes: primary, accent, secondary, outline, ghost, destructive, disabled,
  compact, and icon-button tones.
- Recreated the reference filter trigger dimensions, rounded corner, icon
  sizing, and active-count chip for `mnx-filter-button` / `filter-button`.
- Updated the `/admin/design-system` Actions and status preview to render the
  same reference examples for button hierarchy plus text and icon actions.

Backup:
`OLD UI code/ui-iteration-backups/monolith-buttons-filter-reference-recreate-20260729/`

## 2026-07-29 performance hot-path pass

The presentation contract remains unchanged. `/cha/jobs` now lazy-loads
create-dialog data only after New Job is requested, and `/dashboard` lazy-loads
the Organization-tab directory. Both routes continue to use the existing
Monolith components and semantic themes.

Verification passed for targeted ESLint, production TypeScript, focused
performance/dashboard tests, the 328-route production build, and a Playwright
login/HMR smoke. Authenticated visual verification remains pending because the
configured remote database is not documented as approved staging and the local
PostgreSQL service credentials are unavailable.

## 2026-07-30 Login native-submit credential leak fix

The migrated `/login` form now keeps its controls disabled until React
hydration has attached the credential sign-in handler. Its non-JavaScript
fallback uses POST instead of the browser's default GET, so named credential
fields cannot be serialized into the address bar. If an earlier native
submission already added `email`, `password`, or `rememberMe` parameters, the
hydrated page removes them with `history.replaceState` while retaining the safe
`callbackUrl`.

Backup:
`OLD UI code/ui-iteration-backups/login-native-submit-credential-leak-fix-20260730/`

Verification:

- hydrated Playwright login check: POST form, enabled after hydration, invalid
  credentials stayed on the sanitized login URL, no console or page errors;
- JavaScript-disabled Playwright check: email, password, and submit controls
  remained disabled and the form method was POST;
- targeted ESLint: passed;
- UI migration TypeScript (`tsconfig.ui-migration.json`): passed;
- production TypeScript (`tsc --noEmit`): passed;
- `git diff --check`: passed;
- the historical Batch 007 static verifier still stops on its unrelated root
  source assertion requiring the literal `await auth()`; the current root
  authentication implementation predates this fix and was not changed.

## 2026-07-30 Accounting Phase 5 operational workspace

Implemented the complete safe additive Accounting operational UI on the
accepted Phase 2–4 kernel.

Migrated and integrated:

- `/accounting` operational overview;
- `/accounting/approvals`;
- sales and purchase draft/register/detail convergence;
- customer receipts, vendor payments, canonical payments and allocations;
- customer credit-note and vendor debit-note registers;
- canonical document and payment detail/action pages;
- manual-journal draft, checker inbox, immutable detail, and canonical post;
- journal register and deterministic paginated General Ledger;
- recurring occurrence, depreciation, partner, outbox, manual-review, and
  configuration readiness views;
- centralized permission-aware Accounting navigation and access-denied state.

The routes use shared Monolith components and semantic tokens only, with no
dashboard redesign or reference-project modification. Monetary values are
serialized and calculated as exact decimal strings. Immediate-post controls
were removed; posted facts remain immutable; reasoned rejection, reversal,
retry, and manual-review controls use row versions and server authorization.

Existing Chart of Accounts, Items, Trial Balance, Profit & Loss, Balance Sheet,
CRM commercial invoice/order, and legacy Settings navigation was preserved.
Policy-gated workflows remain visible and fail closed without invented
financial or statutory policy.

Backup:
`OLD UI code/legacy-ui-before-accounting-phase5-2f37936.zip` (SHA-256
`3260DD7EE1DAC71D3FB4AAE3AA149668A450EF9F944D817C2461679DD8D1C8A8`).

Detailed route, permission, lifecycle, convergence, policy, and verification
evidence is in `docs/accounting/phase-5-operational-ui.md`.

Verification passed for production TypeScript, scoped Phase 5 ESLint, 52/52
Accounting tests, the 48-route Accounting static verifier, guarded staging
identity/schema/data/application checks, product-catalogue validation, and the
342-page production build. The full repository suite remains 342/345 because
of the same three documented pre-existing CHA failures. No browser was
available, so authenticated Light/Night/Violet and viewport visual verification
is not marked complete.
## 2026-07-30 Accounting Phase 7 rollout preparation

Accounting Phase 7 rollout preparation is implemented without UI, schema,
production, provider, or real-data changes. The additive rollout layer provides
the policy register, secret-free production configuration contract,
manifest-integrity checks, deterministic go/no-go engine, cutover state
machine, backup-readiness evaluator, bounded synthetic rehearsal profiles,
monitoring/alert catalogues, acceptance roles, deployment sequence,
rollback/forward-fix matrix, hypercare plan, and future non-destructive
production smoke specification.

Current production decision is `NO_GO`: all 20 policy decisions remain
unselected, production configuration and authorization evidence are absent,
backup/restore readiness is blocked, named operational staffing and business
acceptance are incomplete, and Phase 7 cannot transition into production
authorization or execution.

Verification: 20 Phase 7 tests passed; 48 focused Phase 6 tests passed; the full
guarded suite passed 410/413 with the same three pre-existing CHA expectations;
TypeScript, affected-file ESLint, Prisma format/validate, the Phase 7 static and
safety scans, `git diff --check`, and the 342-page production build passed.

## 2026-07-31 Accounting database schema repair

The configured root Neon database now contains the complete canonical
Accounting Phase 2–4, Phase 6, and current Phase 9 schema. Migration history was
reconciled only for four migrations whose objects were proven present. Two
idempotent forward migrations repair the remaining baseline effects and align
new Phase 9 date/constraint metadata. No UI route was redesigned.

The Accounting error boundary now renders only the shared Monolith error state,
a retry action, and a generated correlation reference. Raw Prisma messages,
table names, filesystem paths, and stacks are sent only to the authenticated
server-side error reporter and are not rendered.

Passed: Prisma format/validate/generate/status, empty database-to-schema diff,
the 70-model read-only Accounting schema verifier, production TypeScript,
repair-scoped ESLint, focused error-boundary test, Accounting integration
tests, the production build, all 29 navigation-route HTTP requests, and server
log scans for P2021/missing-table errors.

Repository-wide lint retains 1,360 errors and 312 warnings in the documented
legacy backlog. The full suite is 491/494 with only the same three unrelated
CHA failures. Authenticated browser rendering remains blocked because the
connected browser service returned no available browser instance.

## 2026-07-31 localhost:3000 single-server development policy

The normal Monolith development server is now explicitly fixed to
`http://localhost:3000` for Turbopack and webpack. The separate staging web
server is disabled; the staging environment runner no longer permits `next`,
and the former staging application/login launchers were removed. Isolated
staging PostgreSQL and Vitest command-line workflows remain available and do
not start a web application.

Environment resolution is now documented and guarded as follows:

- Next.js development loads `.env`; no `.env.local`, `.env.development`, or
  `.env.development.local` exists;
- Prisma CLI loads the same root `.env` through `prisma.config.ts`;
- `src/lib/db.ts` consumes the `DATABASE_URL` already loaded by Next.js;
- Vitest deliberately loads `.env.staging.local` for isolated command-line
  database tests only;
- browser/runtime audits are restricted to the already-running
  `http://localhost:3000` and refuse another origin or port;
- `npm run env:database:check` prints only environment mode, host, port,
  database name, and SSL state.

The root database target is the remote Neon `neondb` database with SSL enabled.
Because the root configuration also identifies the deployed Vercel
application, this session treated it as production-sensitive. Prisma validate
and migrate status plus the Accounting schema verifier were read-only; all 66
migrations were already applied and the 70-model verifier reported zero
failures. No migration, reset, push, seed, or fixture write was performed.

The verified previous Monolith listener on port 3000 was stopped, `.next` was
removed, Prisma Client was regenerated, and the server was restarted. Next.js
reported `Local: http://localhost:3000` and `Environments: .env`. Port 3100 has
no listener.

Verification passed for the safe database diagnostic, Prisma validate/status,
the Accounting schema verifier, Prisma generation, modified-script ESLint,
Phase 9 static verification, 14 focused Phase 9 tests, production TypeScript,
the 346-page production build, and the port-3000 readiness check. Repository
lint still fails on the pre-existing unrelated backlog. All 16 requested
Accounting URLs returned their expected same-origin HTTP 307 authentication
redirect from port 3000 with no 404/500 or missing-table/Prisma log entry. The
in-app browser inventory was empty, so authenticated visual and network
verification remains blocked and is not marked complete.

## 2026-07-31 customer and vendor master continuation

Completed the partial customer/vendor master follow-up left in the local
Accounting/CRM branch.

Delivered:

- fixed the in-progress GST registration auto-fetch flow on the CHA customer
  new/edit forms and kept the new tax-preference field wiring;
- consolidated CRM customer list and creation/edit entry points onto the CHA
  customer master by redirecting `/crm/customers`, `/crm/customers/new`, and
  `/crm/customers/[id]/edit` to the CHA equivalents;
- added a shared GST-assisted vendor-creation form and replaced the old inline
  CRM vendor form with it;
- added `/accounting/vendor-master` as the Accounting-facing vendor register
  and creation surface, with read access tied to Accounting document/invoice
  permissions and write controls still gated by `crm.vendor.manage`;
- added the Accounting route metadata for the new vendor-master workspace.

Verification passed with the required 8 GB Node heap:

- production TypeScript via `npx tsc --noEmit`;
- targeted ESLint for the touched customer/vendor/accounting workspace files;
- production build with Prisma generation, Next.js compilation, TypeScript, and
  349 generated pages including `/accounting/vendor-master`;
- `git diff --check` for the touched files.

Notes:

- this was a targeted continuation, not a fresh full-route migration audit;
- the historical route-count summary above predates the new
  `/accounting/vendor-master` route and was not regenerated in this slice;
- authenticated browser verification remains blocked by the same missing
  in-app browser instance.

## 2026-07-31 staging web runtime re-enabled

The earlier single-server restriction is superseded at the user's request.
`npm run staging:dev` again serves the current Monolith source at
`http://127.0.0.1:3100` while keeping the normal `.env` development server on
`http://localhost:3000`. The staging runtime is guarded to use only the exact
local PostgreSQL target at `127.0.0.1:56432`, binds only to loopback, uses the
separate `.monolith-staging/next` build directory, and refuses startup unless
outbound email and OAuth delivery configuration is disabled. Staging also uses
dedicated auth cookie names so its sessions cannot collide with port 3000.

Seven pending Accounting Phase 9 migrations were deployed to the synthetic
staging database, bringing it to all 73 repository migrations. The staging
fixture/database verifier passed, both `/login` endpoints returned HTTP 200,
and representative current Accounting routes on ports 3000 and 3100 returned
the expected same-origin authentication redirects without a 404 or 500.

## 2026-07-31 Accounting item master rework

Reworked the Accounting item master list and new-item flow to align much more
closely with the requested reference behavior while keeping the shared Monolith
workspace and existing local item-store model intact.

Delivered:

- rebuilt `/accounting/items` into a denser item-master register with the
  requested emphasis on name, SKU, purchase description, purchase rate,
  description, selling rate, HSN/SAC, usage unit, and item image presence;
- rebuilt `/accounting/items/new` into a fuller item-master form with image
  upload/preview, sales and purchase information blocks, GST/tax defaults,
  preferred-vendor selection, inventory toggles, and additional operational
  fields;
- wired the new item form to the live vendor master so Preferred Vendor pulls
  from the shared vendor register already available under
  `/accounting/vendor-master`;
- extended the shared client-side item model and validation with the additional
  item-master metadata required by the new UI while preserving compatibility
  with the existing CRM item dialog and CRM new-item page.

Backup:

- `OLD UI code/ui-iteration-backups/accounting-item-master-rework-20260731/`

Verification passed with the required 8 GB Node heap:

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`;
- targeted ESLint for the Accounting item-master files plus the two shared CRM
  item-entry compatibility files;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` with 349 generated
  routes including `/accounting/items`, `/accounting/items/[id]`,
  `/accounting/items/new`, and `/accounting/vendor-master`.

Blocked:

- authenticated browser verification is still blocked by the same missing
  in-app browser instance, so the exact desktop/tablet/mobile visual match for
  the new item register and new-item form is not marked complete.

## 2026-07-31 GST portal manual fallback

Added a safe manual GST Portal fallback to the customer and vendor GSTIN flows.

Delivered:

- the CHA customer new/edit forms and the shared vendor-master create form now
  show a direct `Verify on GST Portal` link beside GSTIN entry;
- when backend GST auto-fetch is not configured, the forms now fail over with a
  clear user-facing message instead of leaving the lookup flow ambiguous;
- the fallback explicitly points to the public GST taxpayer-search portal and
  notes that manual captcha verification is required there.

Verification:

- targeted ESLint for the new fallback helper and the three touched GST-aware
  client forms: passed.

Notes:

- full production TypeScript is currently blocked by unrelated pre-existing
  `CustomerContactPayload` typing errors in `src/modules/crm/actions.ts`, not by
  this GST fallback slice;
- authenticated browser verification remains blocked by the same missing
  in-app browser instance.

## 2026-07-31 customer master contact and address expansion

Expanded the existing CHA customer new/edit master flow to support the
requested operational contact and address behavior.

Delivered:

- the Contact step now treats the visible contact as the primary contact and
  supports adding additional contacts with name, designation, email, and
  phone;
- customer save/update now syncs those entries into linked `CrmContact`
  records while keeping the account-level summary email/phone on the primary
  contact;
- the Address step now includes Courier Address plus toggles for
  `Billing As Shipping` and `Billing As Courier`;
- PIN code entry now performs a live India PIN lookup through a server action
  and auto-fills locked City and State fields for billing, shipping, and
  courier addresses;
- edit loading now includes active linked contacts and persisted courier/toggle
  metadata so the expanded form round-trips correctly.

Verification:

- targeted ESLint for
  `src/app/(dashboard)/cha/customers/new/new-customer-client.tsx`,
  `src/app/(dashboard)/cha/customers/[id]/edit/edit-customer-client.tsx`, and
  `src/app/(dashboard)/cha/customers/[id]/edit/page.tsx`: passed;
- filtered production TypeScript output showed no errors from the touched
  customer files or the new customer-master CRM action changes.

Blocked:

- full `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` is currently
  blocked by unrelated pre-existing `src/components/monolith/vendor-master-create-form.tsx`
  failures;
- authenticated browser verification remains blocked by the same missing
  in-app browser instance.

## 2026-07-31 customer master finance and KYC expansion

Extended the same CHA customer new/edit wizard again for branch-level opening
balances and the additional cancelled-cheque document.

Delivered:

- the Finance step now supports multiple opening-balance rows, one per branch
  the customer does business with;
- the first opening-balance row still backfills the existing single
  `openingBalanceBranch` and `openingBalanceAmount` account fields for
  compatibility, while the full branch list persists in the customer remarks
  metadata;
- the KYC step now includes `Cancelled Cheque` in both create and edit flows;
- the Review step now reflects the branch-wise opening balances and the new
  cancelled-cheque upload state.

Verification:

- targeted ESLint for
  `src/app/(dashboard)/cha/customers/new/new-customer-client.tsx` and
  `src/app/(dashboard)/cha/customers/[id]/edit/edit-customer-client.tsx` stays
  clean;
- filtered TypeScript output showed no customer-form or customer-action matches
  for the new branch-balance/cancelled-cheque wiring.

Blocked:

- full repository ESLint remains red because `src/modules/crm/actions.ts`
  carries the existing wide `no-explicit-any` backlog unrelated to this slice;
- full production TypeScript remains blocked by the pre-existing
  `src/components/monolith/vendor-master-create-form.tsx` failures;
- authenticated browser verification remains blocked by the same missing
  in-app browser instance.

## 2026-07-31 journal entries reference refresh

Reworked the active Accounting journal register and new-journal draft screen to
align more closely with the supplied manual-journal reference while keeping the
existing Monolith workspace and independent-approval posting flow intact.

Delivered:

- `/accounting/journal-entries` now exposes journal search, status, and date
  filters and renders a denser register with date, location, journal number,
  reference/source id, status, notes, amount, created-by, and reporting-method
  columns;
- the journal register query now resolves branch names and maker names and lets
  operators search voucher numbers, narration, source ids/types, and location;
- `/accounting/journal-entries/new` now uses a fuller journal-header layout,
  denser row-entry grid, visible row actions, and an inline totals card that
  mirrors the requested operational flow more closely;
- the manual-journal draft page still saves only the backend-supported fields:
  posting date, branch, narration, and balanced journal lines; unsupported
  reference-template, reverse-date, recurring, and attachment workflows were
  not invented.

Backup:

- `OLD UI code/ui-iteration-backups/journal-entries-reference-refresh-20260731/`

Verification passed with the required 8 GB Node heap:

- targeted ESLint for the touched journal route/query/view files passed; ESLint
  reports the existing expected warning that raw CSS files are ignored by the
  current config;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed with 351
  generated routes including `/accounting/journal-entries` and
  `/accounting/journal-entries/new`;
- `git diff --check` for the touched files: passed.

Blocked:

- authenticated browser verification remains blocked by the same missing
  in-app browser instance, so this slice is not claiming final Light/Night/
  Violet screenshot parity across desktop, tablet, and mobile.

### Follow-up: ledger contact toggle

Extended the same journal slice again so ledger master can control whether a
manual-journal line is allowed to select a contact/counterparty.

Delivered:

- added `Account.allowJournalContact` plus migration
  `20260731113000_add_account_allow_journal_contact`;
- added a ledger-master checkbox to enable contact selection in manual journals
  and surfaced a `Contact` badge on qualifying ledger rows;
- updated `/accounting/journal-entries/new` so each line now shows the
  requested Contact column and only enables it when the selected ledger has the
  new toggle turned on;
- wired that selector into the existing canonical `partyType` / `partyId`
  journal-line contract using active customers, vendors, and employees.

Verification:

- targeted ESLint for the touched account/journal/validator files: passed;
- `npx prisma validate`: passed;
- `npx prisma generate`: passed;
- `git diff --check` for the touched files: passed.

Blocked:

- repository-wide ESLint for `src/modules/accounting/service.ts` still hits the
  pre-existing broad `no-explicit-any` backlog unrelated to this slice;
- full `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` is currently
  blocked by unrelated pre-existing type errors in
  `/accounting/bulk-update`, `/accounting/currency-adjustments`, and
  `/accounting/fixed-assets`;
- authenticated browser verification remains blocked by the same missing
  in-app browser instance.

## 2026-07-31 staging-to-Monolith Accounting integration

The feature mismatch between the staging and port-3000 Accounting navigation
was traced to database state and RBAC rather than separate UI source trees. The
Monolith database stored only the original 18 Accounting permissions and its
system `Admin` role therefore could not receive the later operational grants.

Delivered:

- added an idempotent 67-key Accounting permission catalogue migration;
- granted the complete catalogue only to system `Admin` roles, leaving maker,
  checker, Management, and custom roles unchanged;
- rehearsed the permission migration and the concurrently added asset
  foundation migration against isolated staging first;
- deployed the banking, recurring, permission-catalogue, and asset-foundation
  additive migrations to the Monolith database;
- fixed the Windows local launcher so an empty port-3000 listener check exits
  successfully after a guarded restart;
- restarted Monolith to clear the old five-minute RBAC cache.

Verification: both databases report all 75 migrations current; Monolith stores
67 Accounting permissions and the system Admin account resolves all 67; the
Accounting schema verifier passed with zero failures; 12 previously hidden
Accounting routes returned their expected authentication redirects with no
404/500; and port 3000 restarted with no stderr. Authenticated visual checking
remains blocked because the in-app browser inventory is empty.

## 2026-07-31 banking regrouping and workspace connectors

Regrouped the live Accounting bank-related navigation and workspace so the
operator now gets a single Banking subsection instead of banking functions
being scattered across mixed Sales, Purchases, and Banking labels.

Delivered:

- added `/accounting/banking` to the shared Accounting operational access map
  so it now follows the same route gate and permission checks as the other
  Accounting workspaces;
- added reusable second-level sidebar subsection headings in the shared
  Monolith AppShell and used them to club `Overview`, `Payments`,
  `Customer Receipts`, `Vendor Payments`, and `Allocations` under one
  `Banking` subheading inside Accounting navigation;
- rebuilt the `/accounting/banking` workspace into a fuller Banking hub with
  connected workflow cards linking to the related banking registers, while
  preserving the live internal transfer dialog and server action;
- aligned the affected Accounting route metadata so the connected banking pages
  consistently present under the Banking heading instead of mixed treasury /
  settlement wording.

Backup:

- `OLD UI code/ui-iteration-backups/accounting-banking-grouping-20260731/`

Verification:

- targeted ESLint for the touched banking/nav/access files: passed; ESLint
  reported the existing expected warning that raw CSS files are ignored by the
  current config;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`: passed;
- targeted `git diff --check` for the touched files: passed, with only the
  normal line-ending warnings from the current Windows worktree;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: blocked by an
  existing locked `.next\\monolith-dev-3.stderr.log` file from the active local
  development runtime (`EBUSY` on unlink), not by a banking compile error.

Blocked:

- authenticated browser verification remains blocked by the same missing
  in-app browser instance, so final screenshot parity against the supplied
  banking references is not claimed yet;
- the default production build currently cannot complete while the active local
  runtime keeps the `.next` log file locked.

## 2026-07-31 accountant regrouping and connected workspaces

Grouped the accountant-facing Accounting tools under a single `Accountant`
subheading and added focused accountant workspaces for the items that did not
already have dedicated routes.

Delivered:

- regrouped `Manual Journals`, `Recurring Journals`, `Chart of Accounts`,
  `Bulk Update`, `Currency Adjustments`, `Transaction Locking`, and
  `Fixed Assets` under the shared Accounting sidebar `Accountant` subheading;
- added the new accountant routes `/accounting/bulk-update`,
  `/accounting/currency-adjustments`, `/accounting/transaction-locking`, and
  `/accounting/fixed-assets`, each built with Monolith sections and connected
  workflow cards that link into the real existing Accounting functions;
- added a reusable shared `AccountingWorkflowCards` component and generalized
  the connector-card styling so Banking and Accountant workflows use the same
  production pattern;
- moved `/accounting/accounts` and `/accounting/settings` onto the shared
  `requireAccountingRouteAccess` guard instead of the older direct session
  check, keeping the accountant routes permission-aware end to end;
- added live transaction-lock management to the new
  `/accounting/transaction-locking` workspace through the existing
  `updateTransactionLockAction`, while surfacing current period definitions and
  related accountant connectors;
- surfaced live FX evidence, fixed-asset readiness, and controlled
  accountant-maintenance links without inventing unsupported bulk posting,
  automatic revaluation, or direct depreciation behavior.

Backup:

- `OLD UI code/ui-iteration-backups/accounting-accountant-grouping-20260731/`

Verification:

- targeted ESLint for the touched nav/workspace/accountant-route files: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`: passed;
- targeted `git diff --check` for the touched files: passed, with only the
  normal Windows line-ending warnings from the current worktree;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: blocked by the same
  existing `EBUSY` lock on `.next\\monolith-dev-3.stderr.log` from the active
  local development runtime, not by an accountant-route compile error.

Blocked:

- authenticated browser verification remains blocked by the same missing
  in-app browser instance, so final screenshot parity for the new Accountant
  submenu and workspaces is not claimed yet;
- this slice adds four new Accounting routes, so the historical top-level route
  counts in the audit docs remain stale until the next full route regeneration.

## 2026-07-31 chart of accounts reference refresh

Refreshed `/accounting/accounts` to match the requested reference workflow more
closely while keeping live account maintenance and ledger data functional.

Delivered:

- replaced the earlier simple chart tree with a two-pane accountant workspace:
  searchable filtered account hierarchy on the left and the selected account's
  live detail view on the right;
- added real recent-transaction rendering for the selected account, including
  rolled-up group-account descendants, live debit/credit balances, transaction
  search, and transaction-type filters;
- added working `Add account` and `Edit account` dialogs in the Monolith
  system, with account code, parent, root type, account type, branch, active
  state, journal-contact, and opening-balance controls;
- extended account updates so edited accounts now persist parent changes,
  account-code updates, root/account type changes, group-mode changes, and
  related validation such as duplicate-code and parent-cycle prevention;
- added chart-specific layout styling for the split view, balance summary, and
  transaction panel without falling back to legacy UI patterns.

Backup:

- `OLD UI code/ui-iteration-backups/accounting-chart-of-accounts-reference-refresh-20260731/`

Verification:

- targeted ESLint for
  `src/app/(dashboard)/accounting/accounts/page.tsx` and
  `src/app/(dashboard)/accounting/accounts/accounts-client.tsx`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`: passed;
- targeted `git diff --check` for the touched chart-of-accounts files: passed,
  aside from the normal Windows line-ending warnings in the worktree;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: blocked before Next
  build by an existing Prisma schema validation failure in untouched
  `prisma/schema.prisma` references to missing models
  `AccountingSourceMappingProfile`, `AccountingPeriodCloseRun`,
  `AccountingReportExportProfile`, and
  `AccountingPortalPublicationProfile`.

Blocked:

- authenticated browser verification remains blocked by the same missing
  in-app browser instance, so final screenshot parity for the refreshed Chart of
  Accounts route is not claimed yet;
- the default production build is currently blocked by the unrelated Prisma
  schema validation errors above, not by the `/accounting/accounts` slice.

## 2026-07-31 optional original-invoice linking for debit and credit notes

Made the original invoice optional across the shared sales and purchase debit /
credit-note form and the customer-adjustment dialog.

Delivered:

- added the shared `AccountingOptionalInvoiceLink` production control, which
  initially presents `Link with invoice` and reveals only the eligible invoice
  chooser after the user activates it;
- replaced the required, always-visible original-invoice field for sales credit
  notes, sales debit notes, purchase credit notes, and purchase debit notes;
- applied the same staged optional-link interaction to the customer-note dialog
  under `/accounting/quotations`;
- removed the canonical submission gate that required every correction note to
  reference an invoice; unlinked notes now use their own configured currency,
  account, and statutory-tax policy, while linked notes retain original-invoice
  validation and correction-capacity controls;
- preserved `accounting.correction.approve` for all debit and credit note
  document types even when `correctionOfId` is null;
- extended the Phase 4 staging fixture and added a focused integration case for
  an unlinked customer credit note.

Backup:

- `OLD UI code/ui-iteration-backups/accounting-optional-invoice-link-20260731/`

Verification:

- targeted ESLint for the new shared control, quotations client, document
  adapter, and integration test: passed;
- the broader targeted lint including the already-modified shared invoice form
  still reports its pre-existing `any` and synchronous effect-state errors;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`: passed;
- server-render checks passed for both control states: the initial state contains
  the link action and no select, while the active state contains the invoice
  select and no link action;
- focused staging integration test `prepares a credit note without linking an
  original invoice`: passed, confirming null `correctionOfId`, no supporting
  invoice reference, and the correct note document type;
- the full historical Phase 4 integration file remains blocked by the staging
  database missing the newer `Account.allowJournalContact` column, which makes
  its first posting test fail and cascades into later legacy tests.

Blocked:

- no in-app browser instance is available, so authenticated visual verification
  of the click-to-reveal chooser remains pending.

## 2026-08-01 journal draft editing and submitted review flow

Manual journals now follow an explicit maker-checker lifecycle: drafts remain
editable by their creator, submitted journals lose edit controls, and approvers
can either post or reject them.

Delivered:

- added draft-only journal edit actions on the detail route for the original
  maker, with the edit flow reopening `/accounting/journal-entries/new` in
  draft-edit mode and saving the revision as a new draft version while marking
  the superseded draft accordingly;
- changed journal submission into a distinct `DRAFT -> SUBMITTED` step so a
  maker can save, revise, and then explicitly send the journal for independent
  review;
- removed edit affordances once a journal reaches `SUBMITTED`, and updated the
  shared accounting action-state helper to treat submitted journals as pending
  approval rather than editable work in progress;
- updated the approvals queue and journal register copy so manual-journal review
  targets submitted journals instead of raw drafts;
- extended journal approval actions with both `Approve and post` and `Reject`
  paths, requiring a rejection reason and marking rejected submitted journals as
  `CANCELLED`;
- enforced manual-journal contact requirements both while saving/editing drafts
  and again during submit/approve transitions, so ledgers with manual-journal
  contact support cannot be submitted or posted without a selected contact.

Verification:

- targeted ESLint across the touched journal UI/actions/architecture-test files:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run src/modules/accounting/__tests__/posting-boundary.architecture.test.ts`:
  still fails on the pre-existing unrelated expectation that
  `src/modules/accounting/service.ts` contains `QUOTATION_CONVERSION_GATED`;
- authenticated browser verification remains unavailable because no in-app
  browser instance is connected.

## 2026-08-01 accounting sidebar heading alignment

Aligned the shared Accounting sidebar headings so the Banking and Accountant
groups render in the intended hierarchy instead of splitting into mixed or
repeated labels.

Delivered:

- assigned the Banking section label to sales invoices, sales credit notes,
  purchase invoices, purchase debit notes, and vendor master so they stay under
  the same Banking heading as overview, payments, receipts, vendor payments, and
  allocations;
- assigned the Accountant section label to General Ledger so the heading does
  not break between manual journals and the other ledger controls;
- moved Recurring Journals into the main Accountant block so it functions like
  the other accountant controls instead of reappearing later as a separated
  heading group;
- aligned Banking wording in the shared route metadata and Banking workspace
  shortcut cards so `/accounting/banking` reads as Banking `Overview` and
  `/accounting/payments` reads as `Payments`.

Verification:

- targeted ESLint for `src/lib/navigation.ts`,
  `src/components/monolith/accounting-workspace.tsx`, and
  `src/app/(dashboard)/accounting/banking/banking-client.tsx`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`: passed;
- authenticated browser verification remains unavailable because no in-app
  browser instance is connected.

## 2026-07-31 debit-note reason classification

Separated debit-note reasons by their accounting effect instead of reusing the
credit-note reason list.

Delivered:

- added the shared `AccountingNoteReasonSelect` and centralized reason lists;
- sales debit notes now offer reasons for increasing the customer balance,
  including underbilling, price/rate increases, undercharged quantity,
  recoverable charges, short-charged tax, late-payment charges, and invoice
  correction;
- purchase debit notes now offer reasons for reducing the vendor balance,
  including purchase returns, short supply, rejected goods, quality issues,
  vendor overbilling, discounts/rebates, tax corrections, and service
  deficiencies;
- retained the existing credit-note reason set;
- applied the sales-debit list to the customer adjustment dialog when its note
  type changes to `DEBIT`, clearing any incompatible previously entered reason.

Backup:

- `OLD UI code/ui-iteration-backups/accounting-debit-note-reasons-20260731/`

Verification:

- targeted ESLint for the shared selector, its test, and the customer-note
  dialog: passed;
- focused reason-selection tests: 3 passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`: passed.

## 2026-07-31 purchase-credit reason classification

Corrected purchase credit notes so their reasons represent an increase in the
amount payable to the vendor rather than falling through to sales-credit
reasons.

Delivered:

- added a dedicated purchase-credit reason set for vendor underbilling,
  price/rate increases, received-but-unbilled quantity, additional freight or
  handling, tax short charged by the vendor, reversal of a purchase return or
  debit note, late-payment charges, and purchase-invoice correction;
- mapped `purchase-credit` explicitly in the shared note reason selector;
- retained the existing sales-credit, sales-debit, and purchase-debit mappings.

Backup:

- `OLD UI code/ui-iteration-backups/accounting-purchase-credit-note-reasons-20260731/`

Verification:

- targeted ESLint: passed;
- focused reason-selection tests: 4 passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`: passed;
- authenticated browser verification remains unavailable because no in-app
  browser instance is connected.

## 2026-08-01 Banking foundation audit and hardening

Audited the new Banking overview and account workspace foundation and fixed the
highest-risk defects without broadening the Banking scope into later phases.

Delivered:

- hardened `src/modules/accounting/banking-service.ts` so Banking now validates
  account kinds server-side, rejects duplicate ledger mappings before
  persistence, blocks unsafe currency or ledger changes after dependent Banking
  activity exists, treats inactivation idempotently, and uses stricter posted
  ledger-entry filtering for book-balance calculations;
- kept client/server boundaries clean by continuing to deliver only serializable
  Banking DTOs, masked identifiers, and server-action entry points to browser
  components;
- added a Banking route loading state via
  `src/app/(dashboard)/accounting/banking/loading.tsx`;
- expanded focused Banking coverage from the earlier 2 files / 6 tests to 4
  files / 22 tests, including route read access, manage permission enforcement,
  masking edge cases, duplicate mapping protection, amount-in-bank separation,
  and running-balance carry-forward behavior.

Verification:

- targeted ESLint for the Banking service, actions, route files, and Banking
  tests: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/modules/accounting/__tests__/banking-service.test.ts' 'src/modules/accounting/__tests__/banking-actions.test.ts' 'src/modules/accounting/__tests__/banking-route-access.test.ts' 'src/app/(dashboard)/accounting/banking/banking-client.test.tsx' --reporter verbose`:
  passed, 4 files / 22 tests;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed, with the
  existing Turbopack NFT tracing warning still reported from `next.config.ts`
  through `src/app/api/customer-portal/checklist-files/[id]/route.ts`.

Open limits:

- Banking access denial still follows the shared `/accounting/access-denied`
  route gate before page rendering rather than a Banking-local denied component;
- no real bank connectors, statement ingestion workflows, reconciliation, or
  other later Banking phases were started in this audit pass.

## 2026-08-01 Banking statement import and uncategorized review

Extended the existing Banking overview and account workspace with the next
production Banking phase: manual CSV statement import, import history, and
read-only uncategorized transaction visibility.

Delivered:

- `src/modules/accounting/banking-import.ts` now provides the Banking-local CSV
  parsing, explicit date-format handling, decimal normalization, duplicate
  fingerprinting, bounded previews, and tenant-scoped file storage helpers used
  by this phase;
- `src/modules/accounting/banking-statements-service.ts`,
  `src/modules/accounting/banking-service.ts`, and
  `src/modules/accounting/banking-actions.ts` now support statement preview,
  deterministic duplicate detection, bounded import commit, import history,
  statement-backed Amount in Bank, and real uncategorized counts from imported
  unresolved lines without creating ledger postings;
- `src/app/(dashboard)/accounting/banking/banking-client.tsx`,
  `src/app/(dashboard)/accounting/banking/[bankAccountId]/bank-account-client.tsx`,
  and `src/app/(dashboard)/accounting/banking/statement-dialog.tsx` now expose
  working Bank Statements entry points, CSV-only import configuration and
  preview, account-scoped history, and a read-only Uncategorized Transactions
  view in the Banking workspace;
- focused Banking coverage expanded again to 5 files / 26 tests with explicit
  CSV normalization, signed-amount handling, ambiguous-date rejection,
  zero-amount rejection, and duplicate-within-file coverage in
  `src/modules/accounting/__tests__/banking-import.test.ts`.

Verification:

- targeted ESLint for the touched Banking service, action, route, and client
  files: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/modules/accounting/__tests__/banking-import.test.ts' 'src/modules/accounting/__tests__/banking-service.test.ts' 'src/modules/accounting/__tests__/banking-actions.test.ts' 'src/modules/accounting/__tests__/banking-route-access.test.ts' 'src/app/(dashboard)/accounting/banking/banking-client.test.tsx' --reporter verbose`:
  passed, 5 files / 26 tests;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed, with the
  existing Turbopack NFT tracing warning still reported from `next.config.ts`
  through `src/app/api/customer-portal/document-versions/[id]/route.ts`.

Open limits:

- manual statement import is intentionally CSV-only in this phase;
- statement imports remain synchronous and bounded rather than using a separate
  background-job system;
- no connectors, inbound statement email, rules, quick categorize, matching,
  reconciliation, or other later Banking phases were started here.
