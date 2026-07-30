# Monolith UI migration handoff

Last updated: 2026-07-30

## 2026-07-30 component architecture handoff

The component ownership refactor is implemented without intentional visual or
behavior changes:

- `src/components/monolith` is retired;
- `src/components/ui` contains the canonical business-neutral primitives;
- generic display, form, layout, navigation, feedback, and provider components
  have explicit shared folders;
- business workspaces and components live under their owning modules;
- multi-page Accounting, CHA, CRM, LMS, and Customer Portal route components
  moved out of App Router private folders;
- remaining `_components` files are scoped to their owning route segment;
- public component barrels mediate the intentional People, Performance, Items,
  Mona, and CHA cross-module compositions;
- `npm run architecture:check` enforces the boundaries;
- the final AST inventory reports zero proposed moves and retains uncertain
  files instead of deleting them.

Fresh baseline and final results are in
`docs/refactor/component-reorganization-baseline.md` and
`docs/refactor/component-reorganization-report.md`. Existing customer-portal
UI migration and authenticated CHA/CRM visual-matrix blockers remain unchanged.

## 2026-07-30 CHA shared operational datatable handoff

The `/admin/design-system` "Tables & filters" shipment-register specimen is now
represented by a reusable production component family in
`src/components/data-display/operational-data-table.tsx`. The CHA dashboard
assigned-jobs table and `/cha/jobs` Active/Completed Jobs tables use this same
operational table-card component rather than the generic table or People
Operations table adapter. The component owns the header actions, table wrap,
selectable rows, mode icons, status dots, row actions, footer summary, and
pagination controls. Search, filters, create-job lazy loading, permission
denial, active filter pills, row navigation, warning indicators, and pagination
behavior are unchanged.

Verification passed with the required 8 GB Node heap:

- scoped ESLint for the shared operational table, CHA dashboard, CHA jobs, and
  design-system catalogue files;
- `npx tsc --noEmit -p tsconfig.ui-migration.json`;
- `npx tsc --noEmit`;
- `node scripts/verify-monolith-expense-cha-ui.mjs`.

Live authenticated theme/viewport verification is still pending under the
existing CHA browser-instance blocker.

Correction note:

- The shared operational table now restores the reference rounded card shell
  instead of rendering as a borderless full-width table.
- The design-system specimen, CHA dashboard table, and `/cha/jobs` tables use
  the same corrected shell, status-dot rendering, checkbox control, mode icons,
  row action icons, and pagination controls.
- Scoped ESLint, UI migration TypeScript, production TypeScript, the
  Expense/CHA static verifier, and diff hygiene passed after the correction.
- `scripts/verify-monolith-design-system-catalogue.mjs` is still stale for the
  current reference-style catalogue and stops before this table section on the
  obsolete `data-production-catalogue="true"` assertion.

## 2026-07-30 design-system section heading alignment

`/admin/design-system` now uses a production override for every `.section-heading`
so the section index/title/copy match the CHA outside-heading style and spacing.
The heading blocks use the same large light title scale, tight line-height and
tracking, numbered index treatment, and padding above the bordered component
that follows each section.

Verification passed:

- scoped ESLint for `design-system-client.tsx`;
- UI migration TypeScript;
- production TypeScript;
- diff hygiene.

## Current state

- Branch: `main`.
- Batch 007 source base: `db4bc60`.
- Protected reference: `/dashboard` was not redesigned.
- Route inventory: 211 total, 1 protected, 198 migrated, 12 pending, and 14
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
- All 10 Communication and 10 Admin routes are migrated; 19 Batch 006 route
  surfaces pass source, behavior, archive, type, test, build, and authenticated
  visual gates.
- `/admin/design-system` is now a separately verified live production
  component catalogue: 207 unique runtime component names across 13 groups, 23
  interactive route states, and 9 Light/Night/Violet desktop/tablet/mobile
  checks pass.
- All 15 Recruit routes remain verified and passed the Batch 006 regression
  matrix.
- All five Authentication/Miscellaneous routes are verified in Light, Night,
  and Violet at desktop, tablet, and mobile widths. The only pending routes
  are the 12-page `/customer-portal` family.

## Production component catalogue

The obsolete design-decision showcase at `/admin/design-system` was replaced
from source, not reskinned.

Implementation:

1. The catalogue imports production module namespaces and derives its complete
   index from their runtime exports.
2. It covers AppShell/theme, foundation, workspace, shared async state, People,
   Performance/Learning, CHA, Accounting, CRM, Communication, Admin, and
   public/authentication composition groups.
3. It renders real production primitives and representative module
   compositions, including menus, filters, warnings, dialogs, tables, uploads,
   summaries, details, status, public surfaces, and all 23 shared/module state
   variants.
4. `MonolithThemePicker` is now shared by the AppShell and catalogue. The
   catalogue intentionally exposes Light, Night, and Violet while using the
   shell's existing root classes and `localStorage.theme` persistence.
5. The obsolete `.mnx-showcase-*` CSS and
   `docs/design-system-showcase.md` were removed.

Backup:

- `OLD UI code/legacy-ui-before-admin-design-system-catalogue-4f93df4.zip`;
- source commit `4f93df4`;
- 38,803 bytes;
- SHA-256
  `643FF25A031F1B8ED7A50F6A04E643564BB77F698A817EF586CD32ACDEC82E34`;
- checksum, size, and required entries pass through
  `scripts/verify-monolith-design-system-catalogue.mjs`.

Verification:

- static catalogue/import/state/theme/archive gate: passed;
- route audit: 211 pages, 14 layouts, 198 migrated, 12 pending;
- scoped ESLint: passed;
- focused and full production TypeScript with the required heap: passed;
- 39 focused tests across 12 suites: passed;
- production build and all 315 application pages: passed;
- 9 authenticated Light/Night/Violet × desktop/tablet/mobile checks: passed;
- shared theme selection and persistence, 207 unique runtime components,
  module state selection, dialog open/Escape behavior, semantic theme tokens,
  application errors, and horizontal overflow: passed;
- 9 screenshots and
  `artifacts/ui-migration/design-system-catalogue/verification.json`: reviewed;
- full repository lint remains red on the existing 1,429-error business/module
  backlog; no catalogue-scoped lint finding remains;
- the build retains the six existing non-fatal broad filesystem/NFT trace
  warnings.

## Authentication and Miscellaneous route inventory

Repository page discovery, not navigation links, found exactly:

- `/`
- `/login`
- `/setup`
- `/verify/[id]`
- `/google-chat-link`

## Batch 007 implementation record

1. Archived the complete active legacy presentation before replacement in
   `OLD UI code/legacy-ui-before-monolith-auth-misc-db4bc60.zip`, then made a
   supplemental pre-change archive for the shared ScrollNavigator.
2. Added `src/components/monolith/public-workspace.tsx` as the centralized
   public shell, brand, stage, panel, header, inset, action, status, detail,
   and footer composition layer.
3. Rebuilt credential/Google SSO login, one-time organization setup, public
   secure-document verification, Google Chat account linking, and root module
   control from shared Monolith production components.
4. Preserved all authentication callbacks, remember-me behavior, session
   cleanup, root-account authorization, module-toggle PATCH operations, setup
   validation/API handling, verification reads and privacy masking, link-token
   verification/replacement, redirects, and error behavior.
5. Removed the obsolete 1,416-line login stylesheet and unused login visual
   type module. Isolated legacy global form rules from the public shell and
   suppressed the global ScrollNavigator only on this route family.
6. Added semantic Light/Night/Violet public styling and responsive behavior at
   desktop, tablet, and mobile widths without inline fixed-palette colors.
7. Added repeatable static/archive and production Playwright verifiers and
   regenerated the exhaustive route audit.

Backup evidence:

- Primary archive: 13 files, 62,758 bytes, SHA-256
  `7A958A708AA5CBCAC2797E9BA59E2CAE2AC2233573C8310AD9CC6F62C0A05C8B`.
- Supplemental ScrollNavigator archive: 1 file, 2,339 bytes, SHA-256
  `90B173D7BB29187683E4C7277D0E83F9B0F09F7FE65F0772FC5B4DD6D67ED84C`.
- Exact paths, counts, sizes, checksums, and required entries pass through
  `scripts/verify-monolith-auth-misc-ui.mjs`.

Verification evidence:

- static route/presentation/archive/protected-behavior verifier: passed;
- scoped ESLint for every changed TypeScript/TSX/MJS source: passed;
- focused and production TypeScript with the required 8 GB heap: passed;
- 9 focused public-workspace/foundation/workspace tests: passed;
- production build with Prisma generation, Next.js compilation, production
  TypeScript, and all 315 application routes: passed;
- 45 production route/theme/viewport checks: passed across all five routes,
  Light/Night/Violet, and 1440x1000 desktop, 1024x900 tablet, and 390x844
  mobile;
- safe login validation/password reveal and mocked Google Chat link-success
  interactions: passed;
- reversible public verification fixture cleanup: passed;
- 45 screenshots and
  `artifacts/ui-migration/auth-misc/verification.json`: reviewed.

The production build retains six existing non-fatal broad filesystem/NFT trace
warnings in HRMS/customer-portal code and `next.config.ts`. Repository-wide
`npm run lint -- --quiet` retains the documented pre-existing seed,
maintenance-script, hook-effect, and unrelated business-module backlog; Batch
007 scoped lint is clean.

## Communication, Admin, and Recruit route inventory

Repository discovery—not sidebar links—found:

- Communication: `/communication`, `/communication/calendar`,
  `/communication/chat`, `/communication/drive`,
  `/communication/google-chat-live-view`, `/communication/job-spaces`,
  `/communication/mail`, `/communication/meetings`, `/communication/search`,
  and `/communication/settings`.
- Admin: `/admin`, `/admin/data-tools`, `/admin/design-system`,
  `/admin/google-chat`, `/admin/notifications`, `/admin/passkeys`,
  `/admin/roles`, `/admin/sessions`, `/admin/settings`, and
  `/admin/simulation`.
- Recruit: all 15 routes rooted at `/hrms/recruit`, including audit, career,
  applications, assistant, jobs, profile, resumes, employer applications,
  candidates/new, jobs/new, and settings. These were already verified in
  Batch 002 and were re-tested without source changes.

## Batch 006 implementation record

1. Archived all active legacy Communication/Admin visual source before
   replacement.
2. Activated exact Communication/Admin paths in the shared Monolith shell and
   added centralized workspace frames, metadata, local navigation, semantic
   controls/tables, and asynchronous states.
3. Rebuilt the Communication overview, calendar, meetings, Drive, search,
   job spaces, live-view fallback/diagnostics, settings, Mail, and Chat
   presentation while preserving connected Google APIs and job workflows.
4. Rebuilt Admin overview, data import, Google Chat monitoring, notifications,
   passkeys, roles, sessions, settings, and simulation presentation while
   preserving RBAC, actions, validation, destructive confirmations, and data
   operations.
5. Replaced Mail/Chat route-local overlays with the shared focus-managed dialog
   layer and removed the obsolete Communication navbar from active source.
6. Added tablet/mobile behavior for dense Mail/Chat panes and corrected the
   shared Violet active-tab contrast found during screenshot review.
7. Regenerated the exhaustive route audit and added repeatable static and
   authenticated runtime verifiers.

- The expanded HRMS employee profile and its HRMS Settings custom-field
  builder are implemented, migrated to the database, and pass targeted lint,
  production TypeScript, focused tests, and the production build. A new
  interactive visual pass remains pending because the same Browser service
  currently exposes no browser instance.

## HRMS employee profile expansion

Implemented on 2026-07-29:

- `/hrms/employees/[id]` now presents the full editable employee record:
  basic and work information, reporting hierarchy, personal and identity
  details, contacts and addresses, separation, payroll, bank details, work
  experience, education, dependants, system audit fields, roles, and account
  actions.
- Its information sections are compact full-width horizontal cards stacked in
  sequence, using up to four value columns on desktop so short cards no longer
  inherit unused height from larger neighbouring sections.
- `/hrms/employees` now fills the inherited workspace width. Each role card
  uses an explicit nine-column desktop grid for combined employee identity,
  joining date, roles, department, location, employment status, login status,
  annual gross, and actions, with horizontal overflow retained for narrower
  viewports. The toolbar reports the current filtered total.
- Its centralized filter now covers broad employee search, role, branch,
  department, employee status, account status, and onboarding status. The
  broad search includes employee number, designation, organisation assignment,
  and role as well as name and email.
- The adjacent export action opens a shared Monolith dialog for XLS, XLSX,
  CSV, or TSV. The permission-checked server route exports up to 10,000 records
  from the exact current filter query, never includes password data, and
  guards employee-controlled cells against spreadsheet formula execution.
- A shared People Operations account toggle was added for authorised HR users.
  It prevents self-lockout, preserves organisation scoping, and routes account
  disablement through the existing session-revoking user update logic.
- Imported payroll JSON is retained as a non-destructive fallback while new
  edits persist to `EmployeeHrmsProfile` and the established `User` and
  `EmploymentRecord` fields.
- `/hrms/settings` now uses a two-column responsive composition; the new
  employee-profile column manages organisation-scoped text, long-text, number,
  date, select, and yes/no fields.
- Profile update validation enforces tenant-scoped organisation/reporting
  references, custom-field required/type/select contracts, and self-reporting
  prevention. Existing session revocation and appraisal synchronization remain
  active.
- Migration `20260729183000_add_employee_hrms_profiles` was applied
  successfully to the configured database.
- Archive:
  `OLD UI code/legacy-ui-before-hrms-employee-profile-expansion-20260729.zip`,
  9,468 bytes, SHA-256
  `96BB11CA91858C2E76E10D6825CB33CA40B188B4337F85F5465EDF5B77A047BA`.
- Directory archive:
  `OLD UI code/legacy-ui-before-hrms-employee-directory-expansion-20260729.zip`,
  6,845 bytes, SHA-256
  `438C73350E07CB606053F4767A33E173C302E693584E571CCAC1036D65871C0D`.
- Passed with the required 8 GB Node heap: Prisma generation, targeted ESLint,
  `npx tsc --noEmit`, three focused Vitest cases, and `npm run build` (316
  static pages). The build retains the existing non-fatal `next.config.ts` NFT
  trace warning.
- The directory alignment follow-up also passes targeted ESLint, production
  TypeScript, six focused People Operations/profile tests, the static 45-route
  verifier, diff hygiene, and a fresh 316-page production build.
- The filter/export follow-up passes targeted ESLint, production TypeScript,
  12 focused People Operations/profile/export tests, the 45-route verifier,
  and a 317-page production build that includes
  `/api/hrms/employees/export`.
- Browser setup and the one permitted availability query returned no browser
  instance, so interactive save/add-row/custom-field and
  Light/Night/Violet desktop/tablet/mobile checks, including the filter menu,
  export dialog, and a safe test download, must be run when a browser is
  attached.

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

`OLD UI code/legacy-ui-before-monolith-communication-admin-ed1bf68.zip`

- Source commit: `ed1bf68`.
- Original files: 45, with relative paths retained.
- Size: 130,499 bytes.
- SHA-256:
  `65DDD40D29C8FEA5AF6D86A00F71CBD3E1E4927E18DC5944F9AECF74D2303EC8`.
- Checksum, size, exact file count, and required entries pass through
  `scripts/verify-monolith-communication-admin-ui.mjs`.

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

Communication, Admin, and Recruit:

- static route/presentation/archive/protected-behavior verifier for all 20
  Communication/Admin routes and the 19 newly migrated surfaces;
- route audit: 211 pages, 14 layouts, 193 migrated, 17 pending;
- scoped ESLint for all changed production and migration sources;
- production TypeScript with the required 8 GB heap;
- 2 focused shared-workspace tests;
- production build with Prisma generation, Next.js compilation, production
  TypeScript, and all 315 application routes;
- 306 authenticated Playwright checks across 34 Communication, Admin, and
  Recruit routes, all three themes, and desktop/tablet/mobile widths;
- exact paths, workspace ownership, active semantic theme/tokens, standardized
  controls/tables, no legacy visual composition, no application/server errors,
  and no page-level horizontal overflow;
- 81 representative screenshots plus
  `artifacts/ui-migration/communication-admin/verification.json`;
- screenshot review across Light, Night, Violet, desktop, tablet, and mobile;
- `git diff --check`.

The full repository lint command was also executed. It remains red on the
documented pre-existing seed, maintenance-script, and unrelated business-module
backlog; Batch 006 scoped ESLint passes.

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
Both route families remain active in the Monolith shell. Batch 007 subsequently
advanced the generated inventory to 211 pages, 14 layouts, 198 migrated routes,
and 12 pending routes.

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

## Remaining historical visual blocker

The production application started successfully at
`http://127.0.0.1:3100` with the required 8 GB Node heap. The Browser skill was
initialized against that URL. Browser selection reported `No browser is
available`; after reading the required troubleshooting documentation, the
one-time availability query `agent.browsers.list()` returned `[]`.

That historical connected-browser blocker applies to the earlier CRM and
Expense/CHA verification claims only. It does not apply to Batch 006, whose
local authenticated production Playwright matrix completed successfully.
The following earlier claims remain outstanding:

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
- CRM and Expense/CHA visual-verification commits.

## Next action

Continue the remaining migration program:

1. Attach an in-app Browser instance and verify every reachable CHA
   dialog/dropdown family in Light, Night,
   Violet, and Purple at desktop, tablet, and mobile widths. Include create-job,
   success, permission, warning, filter, native/custom select, autocomplete,
   document, expense, workflow, and destructive-confirmation states.
2. Use authenticated, read-only fixtures for every dynamic CRM route.
3. Exercise all 57 CRM routes in Light, Night, and Violet at desktop, tablet, and
   mobile widths (513 combinations), asserting the exact path, CRM workspace,
   theme, absence of application errors, and no horizontal overflow.
4. Open every safe CRM dialog and representative dropdown, select, filter,
   warning, Mona, toast, and shared Batch 004 popup consumer. Verify themed
   glass, focus handling, one bounded content scroller, mobile safe-area
   behavior, and focus restoration without mutating workflow data.
5. Fix any visual defects, rerun static/type/test/build gates, and commit those
   verified earlier batches.
6. Migrate the 12 remaining discovered routes, all in the customer portal
   family, without changing protected `/dashboard`.

## 2026-07-29 HRMS employee invitation handoff

The employee invitation and self-service lifecycle is implemented, migrated,
and production-build clean.

Delivered:

- HR creates an inactive pending employee and sends a secure organisation
  invitation instead of assigning a temporary password.
- Invitation tokens are hashed at rest, expire after 72 hours by default, are
  revoked on resend, and are consumed exactly once in the same transaction that
  activates the employee and stores the bcrypt password hash.
- The public employee invite page validates the link, shows the organisation
  context, enforces a strong password, and redirects to a workspace-ready thank
  you page.
- Pending employees are visible in the Employee directory/profile immediately,
  including delivery, expiry, and resend states.
- The redundant `Onboard Employee` sidebar/dashboard entry was removed;
  invitation creation remains available only from the Employees directory.
- Employee self-service can update only the explicit server-side basic/KYC
  allowlist. Critical employment, organisation, bank, joining, reporting,
  salary, role, work-contact, custom, and system data remains HR-only.
- Generic user updates cannot bypass invitation acceptance by activating a
  pending invited user.
- The shell exposes `My employee profile` to employees who have employee-read
  capability.

Persistence:

- `EmployeeInvitation`, `User.emailVerifiedAt`, and `User.activatedAt` were
  added by `20260729201500_add_employee_invitations`.
- The migration was deployed successfully to the configured PostgreSQL
  database.
- Email delivery uses the existing Resend/SMTP provider configuration.

Verification:

- targeted ESLint: passed;
- production TypeScript: passed;
- focused HRMS invitation/profile/export tests: 19 passed;
- People Operations static verifier: 45 routes passed;
- route audit: 213 pages, 14 layouts;
- production build: 321 pages passed;
- full production-source tests: 208 passed and 3 unrelated CHA integration
  expectations failed;
- repository-wide ESLint remains blocked by the documented legacy backlog;
- browser selection returned no available browser (`[]`), so live Light, Night,
  and Violet visual/responsive checks remain pending.

Backup:

- `OLD UI code/legacy-ui-before-hrms-employee-invitations-20260729.zip`
- 24,105 bytes
- SHA-256
  `7A7B1DF27B5B3BD28CA363909E3920161B7E0A346F95D9652E88A69C1BDBA5CF`

Next visual action:

1. Attach an in-app Browser instance.
2. Verify `/hrms/employees/new`, invited Employee directory/profile states,
   `/invite/employee` with valid/invalid/expired/used tokens, the password
   requirement/error states, `/invite/employee/ready`, and employee
   self-service at desktop, tablet, and mobile widths in Light, Night, and
   Violet.
3. Confirm keyboard focus, no horizontal overflow, email failure/resend
   messaging, and that HR-only controls never enter edit mode for an employee.

## 2026-07-29 HRMS work report workflow handoff

The daily work report expansion is implemented and deployed to the configured
database.

Delivered:

- `/hrms/work-reports` uses a wide rectangular shared dialog with up to 25
  independent job/description line items.
- The dialog refreshes GPS on submission, resolves the current address with a
  coordinate fallback, and saves coordinates, accuracy, address, and a
  server-side timestamp. The address is read-only in the form.
- `/hrms/settings` now has a third Work Report Setup column for dynamic report
  fields, one-level versus two-level approval, and the approved-report OT
  requirement.
- The employee's existing primary manager is approval level 1 and secondary
  reporting manager is level 2. Level 2 remains waiting until level 1 approves.
- Managers receive durable notification-center records and queued email
  notifications. They can approve/reject from the report timeline or HRMS
  Approvals inbox. Employees receive the final decision.
- The Attendance OT engine emits `WORK_REPORT_REQUIRED` with zero OT whenever
  the setting is enabled and that date has no finally approved report. Final
  approval triggers recalculation for the report date.

Persistence:

- Migration `20260729233000_upgrade_work_reports` is deployed.
- `WorkReport` now stores repeatable items, dynamic values, and GPS evidence.
- `WorkReportApproval` stores level, waiting/pending/final state, decision time,
  and an enforced approver relation.
- `WorkReportSettings` and `WorkReportField` are organisation scoped.

Verification:

- targeted ESLint: passed with no findings;
- production TypeScript: passed;
- focused work-report and OT tests: 9 passed in 2 suites;
- People Operations static verifier: all 45 HRMS and Attendance routes passed;
- production build: 323 pages passed;
- database migration status: up to date;
- backup:
  `OLD UI code/legacy-ui-before-work-report-upgrade-20260729.zip`, 9,674 bytes,
  SHA-256
  `C2695E8858C51DFF58A2848C59C541745BD05225144490184E7AE23D2E91D490`;
- the existing non-fatal customer-portal NFT trace warning remains;
- browser selection returned no available browser (`[]`).

Next visual action:

1. Attach an in-app Browser instance.
2. Verify `/hrms/work-reports`, `/hrms/settings`, and `/hrms/approvals` at
   desktop, tablet, and mobile widths in Light, Night, and Violet.
3. Exercise add/remove line items, every dynamic field type, location allow/
   deny/timeout/refresh states, primary approval, secondary handoff, rejection,
   final decision notification, and OT recalculation.
4. Confirm focus trapping/restoration, one bounded dialog scroller, no
   horizontal overflow, and correct semantic-token contrast in every theme.

## 2026-07-29 HRMS document drive handoff

The HR document drive is reworked, backed by the configured organisation Shared
Drive, and deployed to the configured database.

Delivered:

- `Monolith HR Document Drive` is the managed main folder. It contains
  `My Space Files`, `Company Files`, and `Employee Shared`.
- My Space and Employee Shared provision employee folders named
  `Employee Name - ID {employeeNumber}`, falling back to the internal user ID.
- My Space is private to its owning employee inside HRMS.
- Company Files are visible organisation-wide, while only HR document
  administrators can upload them.
- Employee Shared is visible only to its employee, current primary/secondary
  reporting managers, and HR. Managers see only direct reports and cannot upload
  on a report's behalf; HR can.
- The API accepts real files up to 25 MB, uploads them to Drive, stores only the
  secure metadata/index in PostgreSQL, and removes an orphaned Drive file if the
  metadata transaction fails.
- No raw Drive ID or link reaches the client. Open/download requests repeat the
  access decision and proxy the bytes with no-store and nosniff headers. Only
  PDF and safe raster-image MIME types may render inline.
- Upload/download audit events are persisted.

Persistence:

- Migration `20260729234500_rework_hr_document_drive` is deployed.
- `HrDocumentDriveConfig` records the managed root/category folder IDs.
- `HrDocumentFolder` records the employee-category Drive folder mapping.
- `HrDocumentFile` records the protected file index and owner/uploader metadata.
- Final migration status reports the schema is up to date.

Verification:

- targeted ESLint: passed with no findings;
- production TypeScript: passed;
- focused document hierarchy/access tests: 7 passed;
- production build: all 323 pages passed;
- full suite: 222 passed, with one unrelated protected-dashboard visual
  expectation and three unrelated existing CHA integration expectations
  failing;
- backup:
  `OLD UI code/legacy-ui-before-hr-document-drive-rework-20260729.zip`, 5,933
  bytes, SHA-256
  `25E1C5B3DF3CFA282A1BA8694F697A44FFEEA898F5BFFE5620194F12E630F775`;
- browser selection returned no available browser (`[]`), so the page is not
  marked visually Verified.

Next visual action:

1. Attach an in-app Browser instance.
2. Verify `/hrms/files` at desktop, tablet, and mobile widths in Light, Night,
   and Violet.
3. Exercise empty, loading, search, upload, 25 MB validation, disconnected
   Drive, HR Company Files upload, employee self-upload, HR employee selection,
   manager direct-report selection, forbidden forged employee IDs, open, and
   download states.
4. Confirm table overflow, keyboard focus, no horizontal page overflow, semantic
   token contrast, and that My Space/Employee Shared controls never appear for
   an unauthorised user.

## 2026-07-29 HRMS quick add employee handoff

The minimal employee creation path is implemented on `/hrms/employees`.

Delivered:

- HR users with `hrms.employee.create` now see `Add Employee` and `Full
  Onboarding` as separate choices.
- `Add Employee` opens the shared Monolith dialog and requires only Employee ID,
  first name, last name, and email.
- `Generate` reads the organisation's last Employee ID and proposes an unused
  numeric ID above the current global maximum. Manual IDs remain supported and
  are checked again on submission.
- The quick API assigns the default Employee role, creates an inactive pending
  user and empty HRMS profile, and sends the existing secure invitation.
- It deliberately does not create an `EmploymentRecord`. HR supplies the actual
  joining date and remaining details later from the employee profile, whose
  existing save flow creates that record and appraisal schedule.
- Email delivery failure preserves the pending employee and uses the existing
  resend action. Duplicate email/ID and permission checks are server-side.
- Full onboarding remains unchanged for cases where HR already has complete
  employment, organisation, salary, bank, and personal information.

Persistence:

- No schema or database migration was required.
- The existing User, EmployeeHrmsProfile, EmployeeInvitation, role, security
  event, and email delivery models are reused.

Verification:

- targeted ESLint: passed;
- production TypeScript: passed;
- focused quick-add/invitation/profile/export tests: 22 passed across 5 suites;
- production build: all 324 pages passed;
- backup:
  `OLD UI code/legacy-ui-before-hrms-quick-add-employee-20260729.zip`, 5,951
  bytes, SHA-256
  `C7E9AECEFC7886C09FE778959DD42F4F2C91C94E972C523ECCA94706E9EBB841`;
- the existing non-fatal customer-portal NFT trace warning remains;
- browser selection returned no available browser, so the quick dialog is not
  marked visually Verified.

Next visual action:

1. Attach an in-app Browser instance.
2. Verify `/hrms/employees` in Light, Night, and Violet at desktop, tablet, and
   mobile widths.
3. Exercise generated and manual IDs, duplicate email/ID responses, required
   fields, invalid email, invitation delivery success/failure, cancel, Escape,
   focus trap/restoration, and navigation to the new pending employee profile.
4. Confirm non-HR viewers never receive either creation action and forged quick
   API requests return the permission error.

## 2026-07-29 CHA Jobs datatable controls

The `/cha/jobs` Active and Completed Jobs datatable toolbars now match the
shared Monolith table reference: left-aligned icon search, right-aligned New Job
and Filter controls, no extra Apply Search button, and shared search/control
sizing.

Backup:
`OLD UI code/ui-iteration-backups/cha-jobs-datatable-controls-reference-20260729/`

Verification:

- targeted ESLint for `src/app/(dashboard)/cha/jobs/jobs-client.tsx`: passed;
- `npx tsc --noEmit -p tsconfig.ui-migration.json`: passed;
- `node scripts/verify-monolith-expense-cha-ui.mjs`: passed;
- visual verification remains covered by the existing CHA browser-instance
  blocker.

## 2026-07-29 Login animated character restore

The `/login` page was restored to the earlier animated Monolith character scene
by request, without changing login behavior. The restore is limited to the
login component, its CSS module, and the small scene type helper. Current
credential login, Google SSO, remember-me, callback URL safety, stale-session
cleanup, validation, success delay, and redirect behavior are preserved.

Backup:
`OLD UI code/ui-iteration-backups/login-animated-character-restore-20260729/`

## 2026-07-29 Dashboard module graphics correction

The protected `/dashboard` module command center graphics are repaired. The
merge had left the active React illustration components without their shared
`mnx-dashboard-graphic` and `mnx-dg-*` semantic CSS tokens, causing the card art
to render as broken outline fragments. The shared graphic token block and a
stable module-card art canvas are restored in `src/styles/monolith-system.css`.

Backup:
`OLD UI code/ui-iteration-backups/dashboard-module-graphics-fix-20260729/`

## 2026-07-29 CHA dashboard workspace style restore

The protected `/cha` command workspace styles are repaired. The active
components were still rendering the shared Monolith class names, but the merge
had dropped the CSS for the outside section headings, Assigned Jobs table
toolbar/search/filter/status text, and the Operations Overview pending action,
expiry, empty-state, job-reference, and recent-activity timeline surfaces.
The Assigned Jobs action controls were also normalized so New Job, Filter, View
All, and Settings use the Monolith datatable pill sizing rather than legacy
compact/unstyled controls.

Backup:
`OLD UI code/ui-iteration-backups/cha-dashboard-styles-restore-20260729/`

Follow-up backup:
`OLD UI code/ui-iteration-backups/cha-dashboard-action-buttons-fix-20260729/`

The follow-up button correction was then scoped back out of the global design
system primitives. `mnx-button-outline` and `mnx-filter-button` are no longer
globally restyled by this repair; only the CHA Assigned Jobs toolbar receives
the datatable-specific sizing.

Revert backup:
`OLD UI code/ui-iteration-backups/design-system-button-revert-20260729/`

## 2026-07-29 Monolith button and filter primitive recreation

The shared button and filter primitives have been recreated from the v11
reference source. `mnx-button` now carries the reference 48px pill proportions,
variant fills/shadows/borders, compact and disabled states, and 15px action
icons. `mnx-filter-button` / `filter-button` now carries the reference 35px
datatable filter control with the small accent count chip. The
`/admin/design-system` Actions and status preview now renders the same
reference button hierarchy plus text and icon action examples.

Backup:
`OLD UI code/ui-iteration-backups/monolith-buttons-filter-reference-recreate-20260729/`

## 2026-07-29 performance audit handoff

The performance pass preserves the active Monolith presentation. Create Job
options on `/cha/jobs` and Organization-tab data on `/dashboard` are now lazy;
their loading surfaces use existing shared components.

Passed: targeted ESLint, production TypeScript, 9 focused tests, 328-route
production build, public `/login` Playwright smoke, and a controlled Turbopack
Fast Refresh check with one page load and no console errors.

Blocked: authenticated theme/viewport and performance measurements require an
explicitly approved local/staging database and safe credentials. The repository
`.env` remote Neon target was deliberately not used.

## 2026-07-30 login credential-query fix

The `/login` double-entry symptom and credential-bearing URL were traced to the
browser's native pre-hydration form submission. The login controls now stay
disabled until hydration, the form declares POST as its safe native fallback,
and the client removes any legacy `email`, `password`, or `rememberMe` query
parameters without removing a valid `callbackUrl`.

Passed: hydrated and JavaScript-disabled Playwright checks, targeted ESLint,
the UI migration and production TypeScript projects, and `git diff --check`.
No real user credentials or remote database authentication were used during
verification. The historical Batch 007 static verifier remains stale against
the current root authentication source and stops on its unrelated literal
`await auth()` assertion; this fix does not modify the root flow.

Backup:
`OLD UI code/ui-iteration-backups/login-native-submit-credential-leak-fix-20260730/`

## 2026-07-30 performance phase 2 continuation

The current uncommitted performance tree now contains request-scoped dashboard
context, lazy Team/Organization data, two-query cached dashboard metrics,
side-effect-free widget reads, lazy/dynamic CHA Create Job options, visible-job
warning scoping, aggregated CHA metrics, joined activity actors, database/pool
telemetry, a dedicated non-overlapping Justdial worker, explicit Turbopack
scripts, and Playwright security/motion checks.

Measured local-staging latency targets pass. The exact measurements, pool/SQL
telemetry, commands and limitations are in
`docs/performance-phase-2-results.md`.

Do not mark this phase complete yet:

- measured complete-request query counts remain 29 for `/cha` and 22 for
  `/cha/jobs`, above the required maximum of eight;
- the full suite passes 283/286 tests, with the three previously recorded CHA
  fixture failures;
- repository-wide lint exceeded the 120-second run window;
- production per-query/pool telemetry still needs a representative run.

No commit, push, reset, stash, clean or discard operation was performed.

## 2026-07-30 production-safe structural cleanup

Cleanup work is isolated on
`codex/production-safe-structural-cleanup-20260730`, starting from clean
`main` commit `88fe383dcf43e4042a79ca058aadfa746904e389`.

Delivered:

- explicit ownership folders for the former loose shared components;
- Accounting feature-aware forms moved out of the canonical design-system
  directory;
- 359 confirmed generated, copied, logged, inspection, or dead files removed;
- generated/clutter paths ignored;
- structural/import boundary guard, unused-symbol audit command, quality
  command, repository organization documentation, and PR checklist;
- no route, contract, permission, action, database, theme, token, markup, or
  business behavior change.

Retained deliberately:

- `_design-reference`, unchanged;
- `OLD UI code`, because active migration archive gates still use it;
- Prisma migration history and all uncertain/manual operational scripts;
- active compatibility CSS pending the outstanding visual matrices.

Validation:

- production TypeScript passed;
- `npm run audit:structure` passed;
- Accounting and Communication/Admin static verifiers passed;
- the Auth/Misc verifier retains its documented stale `await auth()` failure;
- public `/login` browser smoke passed with content and no error overlay;
- native login URL-leak Playwright passed; authenticated motion verification
  was skipped because safe credentials were not provided;
- staging-backed Vitest remains blocked by the baseline offline
  `127.0.0.1:56432` database;
- final lint/build results are recorded in
  `docs/refactor/codebase-cleanup-report.md`.
