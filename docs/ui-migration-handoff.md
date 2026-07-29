# Monolith UI migration handoff

Last updated: 2026-07-29

## Current state

- Branch: `main`.
- Accounting batch parent: `fd1cbe7`.
- Protected reference: `/dashboard` was not redesigned.
- Route inventory: 211 total, 1 protected, 117 migrated, 93 pending, and 13
  layouts.
- Batch 005 covers every one of the 32 discovered `/accounting` routes.
- Accounting presentation, behavior contracts, archive, audit, static gate,
  targeted lint, production TypeScript, focused tests, production build, and
  the authenticated theme/viewport matrix all pass.
- Batch 005 is Verified and ready for its single batch commit.
- Batch 004's historical connected-Browser visual blocker remains documented
  in `docs/ui-migration-status.md`; it does not apply to the completed
  Accounting Playwright matrix.

## Batch 005 route inventory

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

## Backup record

Archive:
`OLD UI code/legacy-ui-before-monolith-accounting-fd1cbe7.zip`

- Source commit: `fd1cbe7`.
- Original files: 68, with relative paths retained.
- ZIP entries including directories: 102.
- Size: 147,861 bytes.
- SHA-256:
  `B6B7D58BB2A20166829C80B1D395A521B30239159C06AC03ABFA9C1574939DFC`.
- Checksum, size, exact file count, and required entries pass through
  `scripts/verify-monolith-accounting-ui.mjs`.

## Key files

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

## Verification record

Passed:

- `node scripts/verify-monolith-accounting-ui.mjs`;
- route audit: 211 pages, 13 layouts, 117 migrated, 93 pending;
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

## Important constraints

- Do not redesign `/dashboard`.
- Do not modify Accounting posting rules, permissions, validation, server
  actions, CRM integrations, or data operations for presentation-only work.
- Do not compile or import from `OLD UI code`.
- Do not compile, import, or modify `_design-reference`.
- Keep Node.js processes at `NODE_OPTIONS=--max-old-space-size=8192`.

## Next action

After the verified Accounting commit, select the next pending module from the
route audit. CRM is the largest remaining authenticated family (57 routes), so
its discovery and migration should be treated as its own backed-up batch rather
than folded into Accounting follow-up work.
