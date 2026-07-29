# Monolith UI migration status

Last updated: 2026-07-29

## Current milestone

The production migration foundation plus batches 001 through 003 are
implemented and verified. Batch 004 (Expense and CHA), its shared popup/glass
corrections, and Batch 005 (CRM) are implemented and pass their source,
archive, type, focused test, and production-build gates. Their authenticated
visual matrices remain blocked because the connected Browser service has no
available browser instance.

- Source audit: 211 page routes and 12 layouts.
- Protected visual reference: `/dashboard`.
- Migrated routes: `/account/security`, `/admin/design-system`,
  `/notifications`, `/product-catalogue`, `/todo`, all 38 `/hrms` routes, all
  7 `/attendance` routes, all 18 `/ams` routes, all 5 `/lms` routes, all 11
  `/cha` routes, `/expense`, and all 57 `/crm` routes.
- Migrated shared surfaces: authenticated user profile menu plus common
  permission, empty, loading, error, and not-found states; People Operations
  workspace; Performance and Learning workspace; Expense and CHA operations
  workspace; CRM operations workspace; centralized controls, data tables,
  dialogs, navigation, and route states.
- Pending individual route migrations: 68.
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
| `/`                  |          1 |         0 |        0 |       1 |
| `/account`           |          1 |         0 |        1 |       0 |
| `/accounting`        |         32 |         0 |        0 |      32 |
| `/admin`             |         10 |         0 |        1 |       9 |
| `/ams`               |         18 |         0 |       18 |       0 |
| `/attendance`        |          7 |         0 |        7 |       0 |
| `/cha`               |         11 |         0 |       11 |       0 |
| `/communication`     |         10 |         0 |        0 |      10 |
| `/crm`               |         57 |         0 |       57 |       0 |
| `/customer-portal`   |         12 |         0 |        0 |      12 |
| `/dashboard`         |          1 |         1 |        0 |       0 |
| `/expense`           |          1 |         0 |        1 |       0 |
| `/google-chat-link`  |          1 |         0 |        0 |       1 |
| `/hrms`              |         38 |         0 |       38 |       0 |
| `/lms`               |          5 |         0 |        5 |       0 |
| `/login`             |          1 |         0 |        0 |       1 |
| `/notifications`     |          1 |         0 |        1 |       0 |
| `/product-catalogue` |          1 |         0 |        1 |       0 |
| `/setup`             |          1 |         0 |        0 |       1 |
| `/todo`              |          1 |         0 |        1 |       0 |
| `/verify`            |          1 |         0 |        0 |       1 |
| **Total**            |    **211** |     **1** |  **142** |  **68** |

An import from `@/components/monolith` is not proof of route migration. A route
remains pending until its rendered presentation and behavior satisfy the
completion gate.

## Layout audit

| Layout                                         | Covered pages | Responsibility                                     |
| ---------------------------------------------- | ------------: | -------------------------------------------------- |
| `src/app/layout.tsx`                           |           211 | Fonts, initial theme, metadata, global providers   |
| `src/app/(dashboard)/layout.tsx`               |           194 | Authentication, RBAC/module gates, shell selection |
| `src/app/(dashboard)/attendance/layout.tsx`    |             7 | Attendance People Operations workspace             |
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
- Night, Violet, Light, and Purple are selected by root `theme-*` classes and
  the shared AppShell keeps `data-theme`, `color-scheme`, and persisted
  preference aligned. Night is the default when no saved user preference exists.

## Foundation implementation

Completed:

- created the exhaustive, repeatable route/layout audit generator;
- created a verified baseline backup of legacy `src/app`, `src/components`, and
  `src/styles`;
- centralized tokens, typography, shape, motion, the original three themes, and
  the additive Purple light theme;
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

Batch 005 archive:
`OLD UI code/legacy-ui-before-monolith-crm-fd1cbe7.zip`

- Source commit: `fd1cbe7`.
- Entries: 131 active CRM route, view, shared CRM, and item-presentation files
  with original relative paths.
- Size: 282,113 bytes.
- SHA-256:
  `E24B74587E9D6FC8F596920BCAE7A69738685385B46E975CE94274A149E973C1`.
- Archive checksum, size, and exact file-list verification: passed.

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

| Batch              | Routes                                          | State               | Notes                                                                                                                                                                                                                                    |
| ------------------ | ----------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reference          | `/dashboard`                                    | Protected           | Normalized to shared primitives; visual contract retained.                                                                                                                                                                               |
| Pre-foundation 001 | `/account/security`                             | Verified previously | Migration predates this foundation-only session.                                                                                                                                                                                         |
| Foundation         | No module routes                                | Foundation ready    | Audit, backup, tokens, themes, AppShell, layouts, dashboard normalization.                                                                                                                                                               |
| Batch 001          | `/product-catalogue`, `/todo`, `/notifications` | Verified            | Full Monolith composition; profile menu and common authenticated states included.                                                                                                                                                        |
| Showcase           | `/admin/design-system`                          | Verified            | Production design-system showcase with Inter typography, centered spacing, token/component examples, People Operations catalogue entries, and tracked redesign decisions.                                                                 |
| Batch 002          | All `/hrms` and `/attendance` routes            | Verified            | 45 complete People Operations routes, shared controls/data/dialog/state compositions, and preserved employee, leave, attendance, overtime, biometric, GPS, shift, approval, payroll, recruitment, letter, report, and settings behavior. |
| Batch 003          | All `/ams` and `/lms` routes                    | Verified            | 23 complete Performance and Learning routes, shared workspace/control/table/dialog/state compositions, and preserved appraisal, reviewer, criteria, asset, goal, feedback, course, assignment, enrolment, progress, and report behavior. |
| Batch 004          | All `/cha` routes and `/expense`                | Migrated; visual verification blocked | 12 complete Expense and CHA routes, including the dynamic job workspace, customer editing, workflow configuration, documents, additional data, approvals, filing, bill filing, expenses, reports, settings, and all dialogs/drawers. Source, archive, type, focused test, and build gates pass; the connected Browser service exposes no browser instance for the required authenticated theme/viewport matrix. |
| Batch 005          | All `/crm` routes                               | Migrated; visual verification blocked | 57 complete CRM routes covering accounts, contacts, leads, enquiries, deals, activities, campaigns, approvals, products, items, quotes, invoices, tickets, lead sources, forecasting, and supporting sales workspaces. Source, archive, type, focused test, and build gates pass; the connected Browser service exposes no browser instance for the required authenticated theme/viewport matrix. |

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

## Quality log: batch 005

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

## Post-batch 004 CHA typography and heading correction

Implemented on 2026-07-29 using the protected `/dashboard` section-heading
reference and the attached typography scale.

- Removed decorative icon rendering from the CHA dashboard header, metrics,
  section headings, table toolbar actions, empty state, pending-action rows,
  and create-job entry action.
- Aligned CHA dashboard heading, label, body, table, and card typography with
  the Monolith type tokens used by the protected dashboard.
- Moved CHA section/control headings outside their card surfaces. The title
  remains on the left while the explanatory copy and actions sit to the right
  at desktop widths, matching the dashboard command-center heading pattern.
- Refined the outside headings to use dashboard-style numeric markers instead
  of text eyebrows, moved section/control action buttons into the card surface
  below the heading, and reduced outside section titles to the shared heading
  scale so side-by-side cards stay balanced.
- Re-applied the exact protected dashboard section-heading typography to CHA
  outside headings: `clamp(32px, 3.15vw, 44px)`, weight `360`, line-height
  `0.98`, and `-0.055em` tracking, with a narrow-container fallback to prevent
  lower card overflow.
- Aligned CHA data tables with the attached shipment-register reference:
  uppercase 13 px table heads, 15 px body copy, 13 px secondary text, 96 px row
  rhythm, 22 px cell padding, quiet dividers, bold primary record cells, and
  matching footer spacing across both `DataTable` and `ChaTable` render paths.
- Reduced the CHA table label/header band to a 44 px rhythm and applied a
  theme-tinted background so the header row matches the attached reference more
  closely.
- Tokenized the CHA header graphic colors and exposed the `graphic` prop
  through the CHA header wrappers so production build and static theme gates
  remain clean.
- Applied `src/app/(dashboard)/todo/graphics/TodoHeaderGraphic.tsx` to the CHA
  dashboard header, marked the motion graphic as a client component, and kept
  the graphic theme-tokenized to avoid the Server Component
  `createMotionComponent()` runtime error.
- Split the header graphics back to their requested module sources:
  `/cha/graphics/ChaHeaderGraphic.tsx` for CHA and
  `/todo/graphics/TodoHeaderGraphic.tsx` for To-Do. Both motion graphics are
  client components and share the same theme-aware glassmorphism token classes.
- Moved the To-Do `Create task` action out of the page header graphic area and
  into the task ledger panel header beside the filter, so it sits with the
  table/list controls below the hero graphic.
- Restyled the CHA metric summary cards to match the attached connected-card
  reference: one rounded strip, vertical dividers, uppercase muted labels,
  large lightweight values, quiet status copy, and responsive divider behavior.
- Tuned CHA metric-card typography to the reference: Inter family, lighter
  12 px uppercase labels, 42-50 px lightweight values, and 13 px regular status
  copy instead of the heavier global label styling.
- Reduced the CHA metric-strip card height to the reference rhythm by tightening
  the card min-height, vertical padding, and label/value/detail gap while
  preserving the connected dividers and responsive layout.
- Suppressed stray text carets/selection on non-editable CHA heading, table
  header, and label text while leaving real inputs and controls editable.
- Reworked the shared Monolith button system to match the design-system
  reference hierarchy: black primary pill, theme-accent filled action,
  surface secondary, dark-outline action, soft destructive, disabled, and
  circular icon actions. Updated the admin design-system showcase to display
  the same button hierarchy and text/icon action composition.
- Rebuilt the shared filter controls to match the table reference: compact
  segmented filter rows, theme-accent active tabs, and a bordered Filter trigger
  with list icon plus accent count chip. The admin design-system showcase now
  uses the live shared filter menu so clicking the Filter trigger opens a real
  dropdown with selectable options and Apply/Clear actions.
- Updated the CHA dashboard assigned-jobs command row with a scoped Filter
  menu, icon-bearing shared button actions for New Job, View All, and Settings,
  normal-weight shared button/table text, colored text statuses in place of
  filled badges, and light success/danger design-system swatches.
- Stabilized the assigned-jobs Filter trigger while its portaled menu is open,
  added Categories, Job type, and Current stages filter groups with URL-backed
  Apply/Clear behavior and a persistent `0` count when empty, and added a
  shared Monolith search control for assigned jobs by customer, job number,
  job type, title, and filing reference.
- Refined the assigned-jobs command row so search is a compact single field
  with the search icon inside it, the filter menu groups are nested disclosure
  sections without an internal scrollbar, and CHA action/filter controls opt
  out of hover lift to avoid menu-transition nudging.
- Preserved CHA cards, tables, copy, workflows, RBAC, actions, routes, dialogs,
  and business behavior.

Backup:
`OLD UI code/ui-iteration-backups/cha-typography-icon-removal-20260729/`
`OLD UI code/ui-iteration-backups/cha-numbered-heading-actions-20260729/`
`OLD UI code/ui-iteration-backups/cha-dashboard-section-heading-style-20260729/`
`OLD UI code/ui-iteration-backups/cha-datatable-reference-style-20260729/`
`OLD UI code/ui-iteration-backups/cha-todo-graphic-table-label-20260729/`
`OLD UI code/ui-iteration-backups/cha-todo-graphic-separation-caret-20260729/`
`OLD UI code/ui-iteration-backups/cha-dashboard-metric-card-reference-20260729/`
`OLD UI code/ui-iteration-backups/cha-dashboard-metric-typography-reference-20260729/`
`OLD UI code/ui-iteration-backups/monolith-button-reference-20260729/`
`OLD UI code/ui-iteration-backups/monolith-filter-reference-20260729/`
`OLD UI code/ui-iteration-backups/cha-dashboard-actions-status-colors-20260729/`

Passed:

- targeted ESLint for the changed CHA dashboard, shared CHA operations, CHA
  workspace, and create-job entry files;
- `npx tsc --noEmit -p tsconfig.ui-migration.json` with the required 8 GB Node
  heap;
- `npx vitest run "src/components/monolith/cha-workspace.test.tsx"`;
- static Expense/CHA verifier:
  `node scripts/verify-monolith-expense-cha-ui.mjs`;
- targeted TypeScript, ESLint, and static Expense/CHA verifier after the
  assigned-jobs search/filter refinement;
- production build with Prisma generation, Next.js compilation, production
  TypeScript, and all 315 pages.

Blocked:

- Authenticated browser visual verification remains blocked by the same missing
  in-app Browser instance, so this correction is implemented and statically
  verified but not declared visually Verified.
