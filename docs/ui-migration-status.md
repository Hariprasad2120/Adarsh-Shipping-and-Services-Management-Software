# Monolith UI migration status

Last updated: 2026-07-29

## Current milestone

The production migration foundation, batches 001 through 003, Accounting,
Batch 006 (Communication and Admin), and Batch 007 (Authentication and
Miscellaneous) are implemented and verified. Batch 006 also re-ran the
complete Recruit route family to confirm it remains verified.
The `/admin/design-system` route is now a live catalogue derived from the
actual production component modules, with 207 unique runtime component names,
23 interactive route states, and verified Light/Night/Violet testing.
Batch 004 (Expense and CHA), its shared popup/glass corrections, and the CRM
migration pass their source, archive, type, focused test, and production-build
gates; their authenticated visual matrices remain blocked because the
connected Browser service has no available browser instance.

- Source audit: 211 page routes and 14 layouts.
- Protected visual reference: `/dashboard`.
- Migrated routes: `/account/security`, `/admin/design-system`,
  `/notifications`, `/product-catalogue`, `/todo`, all 38 `/hrms` routes, all
  7 `/attendance` routes, all 18 `/ams` routes, all 5 `/lms` routes, all 11
  `/cha` routes, `/expense`, all 32 `/accounting` routes, all 57 `/crm`
  routes, all 10 `/communication` routes, all 10 `/admin` routes, `/`,
  `/login`, `/setup`, `/verify/[id]`, and `/google-chat-link`.
- Migrated shared surfaces: authenticated user profile menu plus common
  permission, empty, loading, error, and not-found states; People Operations
  workspace; Performance and Learning workspace; Expense and CHA operations
  workspace; Accounting operations workspace; CRM operations workspace;
  Communication workspace; Administration workspace; centralized controls,
  data tables, dialogs, navigation, and route states; public Authentication,
  secure-document verification, account-linking, and root module-control
  surfaces.
- Pending individual route migrations: 12.
- Exhaustive route/layout record: [UI route and layout audit](ui-route-audit.md).
- Batch 007 passes its static/archive/workflow verifier, scoped ESLint,
  production TypeScript, focused component tests, the 315-page production
  build, and all 45 route/theme/viewport checks.

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
| `/accounting`        |         32 |         0 |       32 |       0 |
| `/admin`             |         10 |         0 |       10 |       0 |
| `/ams`               |         18 |         0 |       18 |       0 |
| `/attendance`        |          7 |         0 |        7 |       0 |
| `/cha`               |         11 |         0 |       11 |       0 |
| `/communication`     |         10 |         0 |       10 |       0 |
| `/crm`               |         57 |         0 |       57 |       0 |
| `/customer-portal`   |         12 |         0 |        0 |      12 |
| `/dashboard`         |          1 |         1 |        0 |       0 |
| `/expense`           |          1 |         0 |        1 |       0 |
| `/google-chat-link`  |          1 |         0 |        1 |       0 |
| `/hrms`              |         38 |         0 |       38 |       0 |
| `/lms`               |          5 |         0 |        5 |       0 |
| `/login`             |          1 |         0 |        1 |       0 |
| `/notifications`     |          1 |         0 |        1 |       0 |
| `/product-catalogue` |          1 |         0 |        1 |       0 |
| `/setup`             |          1 |         0 |        1 |       0 |
| `/todo`              |          1 |         0 |        1 |       0 |
| `/verify`            |          1 |         0 |        1 |       0 |
| **Total**            |    **211** |     **1** |  **198** |  **12** |

An import from `@/components/monolith` is not proof of route migration. A route
remains pending until its rendered presentation and behavior satisfy the
completion gate.

## Layout audit

| Layout                                         | Covered pages | Responsibility                                     |
| ---------------------------------------------- | ------------: | -------------------------------------------------- |
| `src/app/layout.tsx`                           |           211 | Fonts, initial theme, metadata, global providers   |
| `src/app/(dashboard)/layout.tsx`               |           194 | Authentication, RBAC/module gates, shell selection |
| `src/app/(dashboard)/attendance/layout.tsx`    |             7 | Attendance People Operations workspace             |
| `src/app/(dashboard)/accounting/layout.tsx`    |            32 | Accounting operations workspace                     |
| `src/app/(dashboard)/admin/layout.tsx`         |            10 | Administration workspace and asynchronous states    |
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

| Batch              | Routes                                          | State               | Notes                                                                                                                                                                                                                                    |
| ------------------ | ----------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reference          | `/dashboard`                                    | Protected           | Normalized to shared primitives; visual contract retained.                                                                                                                                                                               |
| Pre-foundation 001 | `/account/security`                             | Verified previously | Migration predates this foundation-only session.                                                                                                                                                                                         |
| Foundation         | No module routes                                | Foundation ready    | Audit, backup, tokens, themes, AppShell, layouts, dashboard normalization.                                                                                                                                                               |
| Batch 001          | `/product-catalogue`, `/todo`, `/notifications` | Verified            | Full Monolith composition; profile menu and common authenticated states included.                                                                                                                                                        |
| Catalogue          | `/admin/design-system`                          | Verified            | Live production catalogue for 207 unique runtime component names across 13 global/control/public/module composition groups, 23 interactive route states, shared floating surfaces, and the real persisted Light/Night/Violet theme picker. |
| Batch 002          | All `/hrms` and `/attendance` routes            | Verified            | 45 complete People Operations routes, shared controls/data/dialog/state compositions, and preserved employee, leave, attendance, overtime, biometric, GPS, shift, approval, payroll, recruitment, letter, report, and settings behavior. |
| Batch 003          | All `/ams` and `/lms` routes                    | Verified            | 23 complete Performance and Learning routes, shared workspace/control/table/dialog/state compositions, and preserved appraisal, reviewer, criteria, asset, goal, feedback, course, assignment, enrolment, progress, and report behavior. |
| Batch 004          | All `/cha` routes and `/expense`                | Migrated; visual verification blocked | 12 complete Expense and CHA routes, including the dynamic job workspace, customer editing, workflow configuration, documents, additional data, approvals, filing, bill filing, expenses, reports, settings, and all dialogs/drawers. Source, archive, type, focused test, and build gates pass; the connected Browser service exposes no browser instance for the required authenticated theme/viewport matrix. |
| Batch 005          | All `/accounting` routes                        | Verified            | 32 complete Accounting routes covering the command centre, chart of accounts, banking, jobs, journals, payments, sales and purchase invoices, commercial orders, quotations and notes, items, financial statements, reports, and settings. All 288 authenticated route/theme/viewport checks pass. |
| Batch 005          | All `/crm` routes                               | Migrated; visual verification blocked | 57 complete CRM routes covering accounts, contacts, leads, enquiries, deals, activities, campaigns, approvals, products, items, quotes, invoices, tickets, lead sources, forecasting, and supporting sales workspaces. Source, archive, type, focused test, and build gates pass; the connected Browser service exposes no browser instance for the required authenticated theme/viewport matrix. |
| Batch 006          | All `/communication` and `/admin` routes        | Verified            | 19 migrated route surfaces plus the separately verified production component catalogue. Shared Communication/Admin frames, controls, tables, dialogs, loading/error states, semantic themes, dense Mail/Chat responsiveness, and preserved connected-workspace and administration behavior. All 306 authenticated checks across Communication, Admin, and Recruit pass. |
| Batch 007          | `/`, `/login`, `/setup`, `/verify/[id]`, `/google-chat-link` | Verified | All five repository-discovered Authentication/Miscellaneous routes use centralized public/root Monolith compositions. Credential and Google SSO, setup, document verification, Google Chat linking, root authorization/module controls, validation, redirects, and data operations are preserved. All 45 Light/Night/Violet desktop/tablet/mobile checks pass. |

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
