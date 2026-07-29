# Monolith UI migration handoff

Last updated: 2026-07-29

## Current state

- Branch: `main`.
- Merge parents: Accounting commit `179b909` and CRM commit `16bb82c`, both
  based on `fd1cbe7`.
- Protected reference: `/dashboard` was not redesigned.
- Route inventory: 211 total, 1 protected, 174 migrated, 36 pending, and 13
  layouts.
- The combined migration covers all 32 discovered `/accounting` routes and all
  57 discovered `/crm` routes, including their dynamic record routes.
- Accounting presentation, behavior contracts, archive, audit, static gate,
  targeted lint, production TypeScript, focused tests, production build, and
  the authenticated theme/viewport matrix all pass.
- CRM source replacement, archive verification, route/static audit, targeted
  lint, focused and production TypeScript, focused tests, production build,
  diff hygiene, and authentication HTTP smoke pass.
- CRM and the Batch 004 Expense/CHA popup and theme-tinted-glass corrections
  remain Migrated but not visually Verified because the connected in-app
  Browser service exposes no browser instance. This blocker does not apply to
  Accounting's completed authenticated Playwright matrix.

## Accounting route inventory

Routes were discovered from repository page sources, not sidebar links:

- `/accounting`
- `/accounting/accounts`
- `/accounting/balance-sheet`
- `/accounting/banking`
- `/accounting/general-ledger`
- `/accounting/invoices-sales`
- `/accounting/invoices-sales/new`
- `/accounting/items`
- `/accounting/items/[id]`
- `/accounting/items/new`
- `/accounting/jobs`
- `/accounting/journal-entries`
- `/accounting/journal-entries/[id]`
- `/accounting/journal-entries/new`
- `/accounting/payment-entries`
- `/accounting/payment-entries/[id]`
- `/accounting/payment-entries/new`
- `/accounting/profit-loss`
- `/accounting/purchase-invoices`
- `/accounting/purchase-invoices/[id]`
- `/accounting/purchase-invoices/new`
- `/accounting/purchase-orders`
- `/accounting/purchase-orders/new`
- `/accounting/quotations`
- `/accounting/reports`
- `/accounting/sales-invoices`
- `/accounting/sales-invoices/[id]`
- `/accounting/sales-invoices/new`
- `/accounting/sales-orders`
- `/accounting/sales-orders/new`
- `/accounting/settings`
- `/accounting/trial-balance`

## Implementation record

1. Backed up the legacy Accounting route tree and its active CRM invoice-form,
   CRM delete-button, and shared item visual dependencies before replacement.
2. Activated exact `/accounting` and `/accounting/**` paths in the production
   Monolith shell.
3. Added the shared Accounting layout, route metadata/header, loading and error
   boundaries, metrics, semantic panels, sections, toolbars, forms, details,
   tables, statuses, dialogs, and responsive styles.
4. Replaced every Accounting route's old markup instead of applying a CSS skin.
5. Added centralized specialized components for:
   - sales and purchase invoice forms and details;
   - commercial invoice/order creation and registers;
   - item catalogue, item creation, and item details;
   - Accounting delete actions.
6. Migrated chart-of-accounts hierarchy, banking transfers, job costing,
   journal vouchers, payment allocations, quotations, customer notes,
   statements, registers, report execution/export, and settings.
7. Preserved authentication, organisation context, RBAC, service and Prisma
   reads, server actions, balanced-journal validation, invoice posting,
   payment allocation, note submission, quotation conversion, imports/exports,
   and CRM commercial-document integration.
8. Removed active Accounting imports from the legacy CRM invoice form, legacy
   CRM delete button, and legacy item presentation.
9. Updated the shell route gate, exhaustive route audit generator, route audit,
   migration status, focused workspace test, static verifier, and authenticated
   runtime verifier.

## CRM implementation

1. Discovered all 57 CRM routes by scanning every `src/app/**/page.tsx`; the
   inventory includes the catch-all plus approvals, calls, campaigns,
   contacts, customers, dashboard, deals, documents, efficiency, enquiries,
   events, forecasts, invoices, items, lead sources and JustDial, leads, price
   books, products, projects, purchase and sales orders, quotes, sales inbox,
   services, social, solutions, tasks, tickets, vendors, visits, and VOC.
2. Archived 131 active legacy CRM route, view, shared CRM, and item-presentation
   sources before presentation replacement.
3. Activated exact `/crm` and `/crm/**` paths in the production Monolith shell
   and replaced the legacy CRM layout with the centralized workspace frame.
4. Added centralized CRM route metadata and production components for
   workspace headers, connected metrics, numbered sections, panels, toolbars,
   tabs, actions, fields, controls, tables, record links, statuses, dialogs,
   and permission/configuration/empty/loading/error states.
5. Replaced raw route controls, tables, route-local overlays, fixed-palette
   utilities, inline colors, and legacy CRM visual class families with shared
   Monolith components and semantic theme tokens.
6. Migrated CRM dialogs for approvals, item creation/confirmation, lead
   remarks/conversion/follow-up/interest, perishable details, quote
   confirmation, and the JustDial viewport.
7. Added a scoped semantic boundary to the shared item views and retained the
   specialized Monolith Accounting item compositions from the parallel batch.
8. Removed verified obsolete active CRM visual imports and local page-width
   wrappers. No code in `OLD UI code` or `_design-reference` is compiled or
   imported.
9. Preserved authentication, RBAC/module gates, Prisma and data operations,
   server actions, validation, record lifecycle behavior, approvals, imports,
   notifications, and integrations.
10. Regenerated the exhaustive route audit and added repeatable CRM archive,
    presentation, route, and protected-behavior verification.

## Backup record

Archives:

`OLD UI code/legacy-ui-before-monolith-accounting-fd1cbe7.zip`

- Source commit: `fd1cbe7`.
- Original files: 68, with relative paths retained.
- ZIP entries including directories: 102.
- Size: 147,861 bytes.
- SHA-256:
  `B6B7D58BB2A20166829C80B1D395A521B30239159C06AC03ABFA9C1574939DFC`.
- Checksum, size, exact file count, and required entries pass through
  `scripts/verify-monolith-accounting-ui.mjs`.

## Accounting key files

- `docs/ui-route-audit.md`: regenerated route-by-route source record.
- `docs/ui-migration-status.md`: batch status, counts, archive, and quality log.
- `scripts/audit-ui-routes.mjs`: recognizes Accounting batch 005.
- `scripts/verify-monolith-accounting-ui.mjs`: route, archive, presentation,
  responsive-style, and protected-workflow static gate.
- `scripts/verify-monolith-accounting-runtime.mjs`: reversible fixtures and
  complete authenticated route/theme/viewport verification.
- `src/components/monolith/accounting-workspace.tsx`: centralized route
  metadata and Accounting production compositions.
- `src/components/monolith/accounting-invoice-form.tsx`: shared sales/purchase
  invoice editor.
- `src/components/monolith/accounting-invoice-detail.tsx`: shared invoice
  details and posting controls.
- `src/components/monolith/accounting-commercial-document-form.tsx`: shared
  CRM-backed invoice/order editor for Accounting aliases.
- `src/components/monolith/accounting-items.tsx`: catalogue register, item
  editor, and details.
- `src/app/(dashboard)/accounting/layout.tsx`: Accounting workspace boundary.
- `src/styles/monolith-system.css`: semantic Accounting theme and responsive
  presentation.

`OLD UI code/legacy-ui-before-monolith-crm-fd1cbe7.zip`

- Source commit: `fd1cbe7`.
- Original files: 131, with relative paths retained.
- Size: 282,113 bytes.
- SHA-256:
  `E24B74587E9D6FC8F596920BCAE7A69738685385B46E975CE94274A149E973C1`.
- Checksum, size, exact listing, and required entries pass through
  `scripts/verify-monolith-crm-ui.mjs`.

Earlier foundation and batch archives remain in `OLD UI code`, including the
uncommitted Batch 004 glass-correction archive.

CHA dialog reference archive:
`OLD UI code/legacy-ui-before-cha-dialog-reference-20260729-fd1cbe7.zip`

- 22 pre-correction CHA/shared floating-surface sources.
- Size: 197,905 bytes.
- SHA-256:
  `EBFB1DB5B9C49479391B94549DC047DABAA699AA13FDF4F10B3635CF638E4F0F`.
- Checksum, exact listing, and required entries pass through the Expense/CHA
  verifier.

## CRM and shared key files

- `docs/ui-route-audit.md`: exhaustive route-by-route source record.
- `docs/ui-migration-status.md`: current counts and verification gates.
- `scripts/audit-ui-routes.mjs`: recognizes all 57 CRM routes as migrated.
- `scripts/verify-monolith-crm-ui.mjs`: archive, route, presentation, semantic
  theme, and protected-behavior source gate.
- `src/components/monolith/crm-workspace.tsx`: centralized CRM metadata and
  workspace/control/table/dialog/state compositions.
- `src/components/monolith/crm-workspace.test.tsx`: shared CRM composition
  contract tests.
- `src/app/(dashboard)/crm/layout.tsx`: CRM workspace boundary.
- `src/app/(dashboard)/crm/loading.tsx` and `error.tsx`: centralized route
  states.
- `src/app/(dashboard)/_components/dashboard-shell-switcher.tsx`: exact CRM
  Monolith-shell activation.
- `src/styles/monolith-system.css`: CRM semantic and responsive presentation.
- `src/components/monolith/cha-workspace.tsx`: centralized CHA modal, custom
  select, native select, filter-menu, warning-popover, and dialog adapters.
- `src/components/cha/create-job-dialog.tsx`: reference-composed create/success
  dialogs and centralized autocomplete surfaces.
- `scripts/verify-monolith-expense-cha-ui.mjs`: exhaustive CHA popup/dropdown,
  behavior, and archive gate.

## Verification record

Passed:

Accounting:

- `node scripts/verify-monolith-accounting-ui.mjs`;
- route audit: 211 pages, 13 layouts, 174 migrated, 36 pending;
- targeted ESLint for Accounting routes, shared Accounting components, shell,
  migration scripts, runtime script, and tests;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`;
- 22 tests in 5 focused Accounting/workspace/dialog/shell suites;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`;
- Prisma generation, Next.js compilation, production TypeScript, and 315
  static pages;
- 288 authenticated runtime checks:
  - 32 routes;
  - Light, Night, and Violet;
  - 1440×1000 desktop, 1024×900 tablet, and 390×844 mobile;
  - loaded item, journal, payment, sales-invoice, and purchase-invoice dynamic
    details;
  - exact path, final workspace/header, theme/tokens, standardized controls,
    browser/server errors, legacy composition, and horizontal overflow;
  - mobile quotation-dialog size and Escape dismissal;
  - 72 representative screenshots and
    `artifacts/ui-migration/accounting/verification.json`;
- temporary database fixture cleanup independently confirmed at zero;
- `git diff --check`.

The production build retains six existing non-fatal broad filesystem/NFT trace
warnings in HRMS/customer-portal code and `next.config.ts`. They are outside
the Accounting batch and do not affect compilation or the verified routes.

CRM and shared corrections:

- legacy archive checksum, size, and 131-file listing;
- route audit: 211 pages, 13 layouts, 174 migrated, 36 pending;
- static CRM verifier for all 57 routes and every dynamic route family;
- targeted ESLint for new infrastructure, boundaries, shell, verifier, and
  tests;
- `npx tsc --noEmit -p tsconfig.ui-migration.json`;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`;
- 21 focused tests in 7 suites;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`, including Prisma
  generation, Next.js compilation, production TypeScript, and 315 pages;
- production HTTP smoke for `/crm`, returning the expected authenticated `307`
  login redirect;
- `git diff --check`.

Repository-wide ESLint retains the known business-code backlog. The latest
scan reported 1,616 errors and 497 warnings, with the CRM-scoped scan reporting
222 errors and 98 warnings. Findings are concentrated in pre-existing
`no-explicit-any`, hook-effect, unused-symbol, and related debt in large CRM
lead/enquiry views and service/action modules. New migration infrastructure
passes targeted lint. No business behavior was rewritten merely to hide that
debt.

The build retains the existing non-fatal Turbopack broad file-trace warning
through `next.config.ts` and the customer-portal checklist-file route.

## Merge integration validation

The Accounting and CRM branches were reconciled additively on 2026-07-29.
Both route families are active in the Monolith shell and route audit, and the
generated inventory now records 211 pages, 13 layouts, 174 migrated routes,
and 36 pending routes.

Passed on the combined tree with the required 8 GB Node heap:

- Accounting, CRM, and Expense/CHA static migration verifiers;
- targeted ESLint for the merged audit, shell, and CRM infrastructure;
- production TypeScript with `npx tsc --noEmit`;
- 24 tests in 6 Accounting, CRM, CHA, dialog, and shell suites;
- production build, including Prisma generation, Next.js compilation,
  production TypeScript, and all 315 static pages;
- `git diff --check` for both working and staged changes.

The production build retains the six previously documented non-fatal broad
filesystem/NFT trace warnings in HRMS, customer-portal, and `next.config.ts`.

## Important constraints

- Do not redesign `/dashboard`.
- Do not modify Accounting or CRM permissions, validation, server actions,
  integrations, posting rules, or data operations for presentation-only work.
- Do not compile or import from `OLD UI code`.
- Do not compile, import, or modify `_design-reference`.
- Keep Node.js processes at `NODE_OPTIONS=--max-old-space-size=8192`.

## Browser blocker

The production application started successfully at
`http://127.0.0.1:3100` with the required 8 GB Node heap. The Browser skill was
initialized against that URL. Browser selection reported `No browser is
available`; after reading the required troubleshooting documentation, the
one-time availability query `agent.browsers.list()` returned `[]`.

The Browser skill prohibits substituting standalone Playwright or an unrelated
browser backend. Consequently, none of these claims may be made yet:

- Light, Night, Violet, and Purple visual verification for every CHA modal,
  native/custom select, filter, warning, autocomplete, and success surface;
- CHA desktop, tablet, and mobile popup/overflow/focus verification;
- authenticated loaded-state verification for all 57 CRM routes;
- Light, Night, and Violet visual verification;
- desktop, tablet, and mobile responsive verification;
- all 513 route/theme/viewport combinations;
- dynamic contact/customer/deal/enquiry/invoice/item/lead/quote/ticket state;
- dialog, popover, menu, overflow, exact-theme, and application-error runtime
  assertions;
- verified-batch commit.

## Next action

Attach an in-app Browser instance, then continue this same batch:

1. Start the production app with the 8 GB Node heap.
2. First verify every reachable CHA dialog/dropdown family in Light, Night,
   Violet, and Purple at desktop, tablet, and mobile widths. Include create-job,
   success, permission, warning, filter, native/custom select, autocomplete,
   document, expense, workflow, and destructive-confirmation states.
3. Use authenticated, read-only fixtures for every dynamic CRM route.
4. Exercise all 57 CRM routes in Light, Night, and Violet at desktop, tablet, and
   mobile widths (513 combinations), asserting the exact path, CRM workspace,
   theme, absence of application errors, and no horizontal overflow.
5. Open every safe CRM dialog and representative dropdown, select, filter,
   warning, Mona, toast, and shared Batch 004 popup consumer. Verify themed
   glass, focus handling, one bounded content scroller, mobile safe-area
   behavior, and focus restoration without mutating workflow data.
6. Fix any visual defects, rerun static/type/test/build gates, update this
   handoff and status to Verified, and only then commit the verified batch.
