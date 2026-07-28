# Monolith UI migration status

Last updated: 2026-07-28

## Current milestone

The production migration foundation plus batches 001 and 002 are implemented
and verified.

- Source audit: 211 page routes and 9 layouts.
- Protected visual reference: `/dashboard`.
- Migrated routes: `/account/security`, `/notifications`,
  `/product-catalogue`, `/todo`, all 38 `/hrms` routes, and all 7
  `/attendance` routes.
- Migrated shared surfaces: authenticated user profile menu plus common
  permission, empty, loading, error, and not-found states; People Operations
  workspace, controls, data table, dialog, navigation, and route states.
- Pending individual route migrations: 161.
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
| `/admin`             |         10 |         0 |        0 |      10 |
| `/ams`               |         18 |         0 |        0 |      18 |
| `/attendance`        |          7 |         0 |        7 |       0 |
| `/cha`               |         11 |         0 |        0 |      11 |
| `/communication`     |         10 |         0 |        0 |      10 |
| `/crm`               |         57 |         0 |        0 |      57 |
| `/customer-portal`   |         12 |         0 |        0 |      12 |
| `/dashboard`         |          1 |         1 |        0 |       0 |
| `/expense`           |          1 |         0 |        0 |       1 |
| `/google-chat-link`  |          1 |         0 |        0 |       1 |
| `/hrms`              |         38 |         0 |       38 |       0 |
| `/lms`               |          5 |         0 |        0 |       5 |
| `/login`             |          1 |         0 |        0 |       1 |
| `/notifications`     |          1 |         0 |        1 |       0 |
| `/product-catalogue` |          1 |         0 |        1 |       0 |
| `/setup`             |          1 |         0 |        0 |       1 |
| `/todo`              |          1 |         0 |        1 |       0 |
| `/verify`            |          1 |         0 |        0 |       1 |
| **Total**            |    **211** |     **1** |   **49** | **161** |

An import from `@/components/monolith` is not proof of route migration. A route
remains pending until its rendered presentation and behavior satisfy the
completion gate.

## Layout audit

| Layout                                         | Covered pages | Responsibility                                     |
| ---------------------------------------------- | ------------: | -------------------------------------------------- |
| `src/app/layout.tsx`                           |           211 | Fonts, initial theme, metadata, global providers   |
| `src/app/(dashboard)/layout.tsx`               |           194 | Authentication, RBAC/module gates, shell selection |
| `src/app/(dashboard)/attendance/layout.tsx`    |             7 | Attendance People Operations workspace             |
| `src/app/(dashboard)/cha/layout.tsx`           |            11 | CHA spacing container                              |
| `src/app/(dashboard)/communication/layout.tsx` |            10 | Workspace connection gate/providers                |
| `src/app/(dashboard)/crm/layout.tsx`           |            57 | CRM theme and scroll container                     |
| `src/app/(dashboard)/hrms/layout.tsx`          |            38 | HRMS People Operations workspace                   |
| `src/app/(dashboard)/hrms/recruit/layout.tsx`  |            15 | Recruitment feature flag                           |
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
- Light, Night, and Violet are selected by root `theme-*` classes and the shared
  AppShell keeps `data-theme`, `color-scheme`, and persisted preference aligned.

## Foundation implementation

Completed:

- created the exhaustive, repeatable route/layout audit generator;
- created a verified baseline backup of legacy `src/app`, `src/components`, and
  `src/styles`;
- centralized tokens, typography, shape, motion, and the three themes;
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
| Batch 002          | All `/hrms` and `/attendance` routes            | Verified            | 45 complete People Operations routes, shared controls/data/dialog/state compositions, and preserved employee, leave, attendance, overtime, biometric, GPS, shift, approval, payroll, recruitment, letter, report, and settings behavior. |

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
