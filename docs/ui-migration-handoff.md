# Monolith UI migration handoff

Last updated: 2026-07-29

## Current state

- Branch: `main`.
- Batch 005 source parent: `fd1cbe7`.
- Protected reference: `/dashboard` was not redesigned.
- Route inventory: 211 total, 1 protected, 142 migrated, 68 pending, and 12
  layouts.
- Batch 005 covers every discovered CRM page: 57 `/crm` routes, including all
  static and dynamic record routes.
- Source replacement, archive verification, route/static audit, targeted lint,
  focused and production TypeScript, focused tests, production build, diff
  hygiene, and authentication HTTP smoke pass.
- The required authenticated Light/Night/Violet desktop/tablet/mobile matrix
  is blocked because the connected in-app Browser service exposes no browser
  instance.
- Batch 005 is Migrated but not Verified. It has intentionally not been
  committed as a verified batch.
- The uncommitted Batch 004 Expense/CHA work and the subsequent shared
  popup/theme-tinted-glass corrections remain intact. Their live visual matrix
  is blocked by the same Browser service.
- The attached To-Do modal reference has now been applied throughout CHA:
  every dialog, popover, filter/autocomplete menu, 45 native selects, and 7
  custom selects route through centralized CHA floating-surface adapters.
- The create-job and success dialogs now use the reference header/body/footer
  composition with neutral controls and one bounded content scroller. Static,
  type, focused test, build, archive, and HTTP smoke gates pass; live visual
  verification is blocked by the same missing Browser instance.
- The CHA dashboard typography/icon-removal pass is also applied. CHA
  section/control headings now sit outside the component cards with the
  explanatory copy and actions aligned to the right on desktop, following the
  protected `/dashboard` command-center heading pattern. The second refinement
  uses numeric markers instead of text eyebrows, moves action controls into the
  card surface below the outside heading, and uses the shared heading type scale
  for side-by-side sections. The latest correction applies the exact protected
  dashboard section-heading typography to CHA outside headings:
  `clamp(32px, 3.15vw, 44px)`, weight `360`, line-height `0.98`, and
  `-0.055em` tracking, with a narrow-container fallback for lower cards.
  CHA data tables now follow the attached shipment-register reference across
  both `DataTable` and `ChaTable`: uppercase 13 px heads, 15 px body type,
  13 px secondary copy, 96 px row rhythm, 22 px cell padding, quiet dividers,
  bold primary record cells, and matching footer spacing. The CHA header graphic
  is tokenized and routed through the shared page-header `graphic` prop. The
  table label/header band is now reduced to a 44 px rhythm with a theme-tinted
  background, and the CHA dashboard imports the client-safe, theme-tokenized
  `src/app/(dashboard)/todo/graphics/TodoHeaderGraphic.tsx` to avoid the
  `createMotionComponent()` Server Component runtime error. The latest
  refinement splits the header graphics back to their requested module files:
  CHA uses `src/app/(dashboard)/cha/graphics/ChaHeaderGraphic.tsx`, To-Do uses
  `src/app/(dashboard)/todo/graphics/TodoHeaderGraphic.tsx`; both are
  client-safe and share the same theme-aware glassmorphism token classes. The
  To-Do `Create task` action now lives in the task ledger panel header beside
  the filter instead of over the hero graphic. CHA non-editable
  heading/table-label text also suppresses stray click carets. The CHA metric
  summary strip now follows the attached connected-card reference with one
  rounded surface, vertical dividers, uppercase muted labels, large lightweight
  values, quiet status copy, and responsive divider behavior. The metric-card
  typography is tuned to the reference with Inter, lighter 12 px uppercase
  labels, 42-50 px lightweight values, and 13 px regular status copy.
  Static, type, focused test, verifier, and production-build gates pass; live
  visual verification is still blocked by the missing Browser instance.

## Batch 005 implementation

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
7. Added a scoped semantic compatibility boundary to the shared item views so
   CRM is fully Monolith while still-pending Accounting consumers retain their
   current behavior until their own migration batch.
8. Removed verified obsolete active CRM visual imports and local page-width
   wrappers. No code in `OLD UI code` or `_design-reference` is compiled or
   imported.
9. Preserved authentication, RBAC/module gates, Prisma and data operations,
   server actions, validation, record lifecycle behavior, approvals, imports,
   notifications, and integrations.
10. Regenerated the exhaustive route audit and added repeatable CRM archive,
    presentation, route, and protected-behavior verification.

## Backup record

Archive:
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

## Key files

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
  select, native select, filter-menu, warning-popover, dialog adapters, and
  outside-card section heading composition.
- `src/components/cha/create-job-dialog.tsx`: reference-composed create/success
  dialogs and centralized autocomplete surfaces.
- `src/app/(dashboard)/cha/page.tsx` and
  `src/app/(dashboard)/cha/_components/cha-operations-shared.tsx`: CHA
  dashboard presentation using dashboard typography and icon-free headings.
- `src/styles/monolith-system.css`: CHA metric strip uses the connected-card
  reference with reduced card height, tighter vertical padding, lightweight
  labels, and responsive dividers.
- `src/components/monolith/button.tsx`,
  `src/components/monolith/workspace.tsx`,
  `src/components/monolith/foundation.tsx`, and
  `src/styles/monolith-system.css`: shared Monolith actions now expose the
  reference button hierarchy, including accent and outline variants plus
  reference-sized circular icon actions. Backup:
  `OLD UI code/ui-iteration-backups/monolith-button-reference-20260729/`.
- `src/components/monolith/filter-menu.tsx` and
  `src/styles/monolith-system.css`: shared filter controls now use the
  reference segmented filter row and bordered Filter trigger with list icon and
  accent count chip; the admin design-system sample opens the live shared
  filter dropdown with selectable options and Apply/Clear actions. Backup:
  `OLD UI code/ui-iteration-backups/monolith-filter-reference-20260729/`.
- `src/app/(dashboard)/admin/design-system/design-system-client.tsx`: the
  button showcase now mirrors the reference board with Button hierarchy and
  Text & icon actions groups.
- `src/app/(dashboard)/cha/page.tsx`,
  `src/app/(dashboard)/cha/_components/cha-dashboard-filter-action.tsx`,
  `src/components/cha/dashboard-create-job.tsx`, and
  `src/styles/monolith-system.css`: CHA dashboard assigned-jobs actions now use
  shared icon buttons plus a scoped filter menu; table body/status text is
  normal weight with colored text statuses; success/danger swatches use the
  light semantic surfaces. Backup:
  `OLD UI code/ui-iteration-backups/cha-dashboard-actions-status-colors-20260729/`.
- `src/app/(dashboard)/cha/page.tsx`,
  `src/app/(dashboard)/cha/_components/cha-dashboard-filter-action.tsx`, and
  `src/styles/monolith-system.css`: the assigned-jobs command row now includes
  a shared Monolith search control, a stable open-state Filter trigger, and
  URL-backed Categories, Job type, and Current stages filter groups with shared
  Apply/Clear actions and a persistent empty `0` count. The latest refinement
  keeps search as a compact single field with the icon inside it, nests filter
  groups in disclosure sections without an internal scrollbar, and removes
  hover lift from the CHA action/filter cluster to prevent menu-transition
  nudging.
- `src/components/monolith/operations-overview.tsx`,
  `src/app/(dashboard)/cha/page.tsx`, and `src/styles/monolith-system.css`:
  the lower CHA dashboard is now a reusable Operations Overview with an
  asymmetric pending/deadline grid and full-width activity timeline. It keeps
  the existing live pending-checklist, pending-filing, filing-query,
  due-date-warning, audit-log, actor, and job navigation data while replacing
  the prior three oversized cards. Backup:
  `OLD UI code/ui-iteration-backups/cha-operations-overview-redesign-20260729/`.
- `src/components/monolith/operations-overview.tsx` and
  `src/styles/monolith-system.css`: Pending Actions quick actions are now
  compact command cards with marker tiles, structured metadata, priority
  badges, and compact CTA affordances instead of stretched alert rows. Backup:
  `OLD UI code/ui-iteration-backups/cha-quick-actions-redesign-20260729/`.
- `src/app/(dashboard)/cha/jobs/jobs-client.tsx` and
  `src/styles/monolith-system.css`: CHA Jobs now uses the shared CHA header
  graphic, removes the standalone Job Command Center section, places the
  search/filter/create controls inside each datatable panel, and removes the
  Job Title column from both Active and Completed Jobs. Backup:
  `OLD UI code/ui-iteration-backups/cha-jobs-header-actions-table-20260729/`.
- `src/app/(dashboard)/cha/jobs/jobs-client.tsx` and
  `src/styles/monolith-system.css`: CHA Jobs datatable controls now match the
  shared table reference with a left-aligned Monolith search field, right
  aligned New Job and Filter controls, and no extra Apply Search button.
  Backup:
  `OLD UI code/ui-iteration-backups/cha-jobs-datatable-controls-reference-20260729/`.
- `scripts/verify-monolith-expense-cha-ui.mjs`: exhaustive CHA popup/dropdown,
  behavior, and archive gate.

## Verification record

Passed:

- legacy archive checksum, size, and 131-file listing;
- route audit: 211 pages, 12 layouts, 142 migrated, 68 pending;
- static CRM verifier for all 57 routes and every dynamic route family;
- targeted ESLint for new infrastructure, boundaries, shell, verifier, and
  tests;
- targeted ESLint for the latest CHA dashboard search/filter files and shared
  filter component;
- targeted ESLint for the Operations Overview component and CHA dashboard
  usage;
- targeted ESLint for the Pending Actions quick-action card refinement;
- targeted ESLint for the CHA Jobs register header/action/table refinement;
- targeted ESLint for the CHA Jobs datatable toolbar reference refinement;
- `npx tsc --noEmit -p tsconfig.ui-migration.json`;
- `npx tsc --noEmit -p tsconfig.ui-migration.json` after the latest CHA
  search/filter refinement;
- `npx tsc --noEmit -p tsconfig.ui-migration.json` after the lower dashboard
  Operations Overview redesign;
- `npx tsc --noEmit -p tsconfig.ui-migration.json` after the Pending Actions
  quick-action card refinement;
- `npx tsc --noEmit -p tsconfig.ui-migration.json` after the CHA Jobs register
  header/action/table refinement;
- `npx tsc --noEmit -p tsconfig.ui-migration.json` after the CHA Jobs
  datatable toolbar reference refinement;
- static Expense/CHA verifier after the CHA Jobs datatable toolbar reference
  refinement;
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
