# Monolith UI migration handoff

Last updated: 2026-07-28

## Current state

- Branch at batch start: `main`
- Batch 003 parent: `0faa8b3`
- Protected reference: `/dashboard` was not redesigned.
- Route inventory: 211 total, 1 protected, 72 migrated, 138 pending, and 11
  layouts.
- Verified migrated families now include all 18 `/ams` routes and all 5 `/lms`
  routes, in addition to the previously migrated account, notification,
  product-catalogue, to-do, HRMS, and Attendance routes.
- Batch 003 implementation, archive, route audit, static gate, TypeScript,
  focused tests, production build, and authenticated runtime matrix pass.

## Batch 003 completed

1. Discovered AMS and LMS from every `src/app/**/page.tsx` source rather than
   relying on navigation: 18 AMS routes and 5 LMS routes, including all six
   dynamic route patterns.
2. Archived all 47 active legacy route, view, and specialized component
   sources before replacing presentation.
3. Activated exact `/ams`, `/ams/**`, `/lms`, and `/lms/**` routes in the
   production Monolith shell.
4. Added family layouts plus centralized loading and error boundaries.
5. Added centralized Performance and Learning metadata, page frame, summary,
   section, navigation, record, status, progress, notice, loading, error,
   control, table, and dialog compositions.
6. Replaced the complete presentation of AMS appraisal, cycle, criteria, slab,
   extension, KPI, history, asset, goal, review, self-assessment, management
   review, course, assignment, learning, and report pages.
7. Removed active legacy `ModuleHome`, legacy data-table, old visual-class,
   fixed-palette, inline-color, raw standard-control/table, and custom overlay
   composition. No standalone shared AMS component file was deleted because
   each remains referenced by active business views; their presentation was
   migrated in place.
8. Preserved authentication, RBAC, module gates, Prisma/data access, server
   actions, form validation, appraisal stages, reviewer assignment,
   self-assessment and management-review workflows, assets, goals, feedback,
   course enrolment, assignment/progress operations, reporting, and
   integrations.
9. Added repeatable static and authenticated runtime gates for the complete
   family and captured 24 representative loaded-state screenshots.
10. Regenerated the exhaustive route audit and migration records.

## Backup record

Archive:
`OLD UI code/legacy-ui-before-monolith-ams-lms-0faa8b3.zip`

- Source commit: `0faa8b3`
- Entries: 47 original files with relative paths retained.
- Size: 136,030 bytes.
- SHA-256:
  `0C851DAB4C38FC0D22004EF27F14CB260C75FF3291BB1111E7D68101D81B0256`
- Archive checksum, size, and file listing verification: passed.

The foundation and batches 001 and 002 archives remain in `OLD UI code`.

## Key files

- `docs/ui-route-audit.md`: regenerated route-by-route source record.
- `scripts/audit-ui-routes.mjs`: recognizes every AMS and LMS route as batch 003.
- `scripts/verify-monolith-performance-learning-ui.mjs`: static presentation,
  archive, route, and protected-behavior gate.
- `scripts/verify-monolith-performance-learning-runtime.mjs`: authenticated
  route/theme/viewport, loaded-state, semantic, responsive, and interaction
  gate.
- `src/components/monolith/performance-workspace.tsx`: centralized metadata
  and Performance/Learning compositions.
- `src/components/monolith/workspace-data-table.tsx`: shared production data
  table entry point, reusing the existing centralized implementation.
- `src/app/(dashboard)/ams/layout.tsx` and
  `src/app/(dashboard)/lms/layout.tsx`: family workspace boundaries.
- `src/components/hrms/lms-view.tsx`: migrated learning catalogue and progress
  operations.
- `src/components/hrms/pms-view.tsx`: migrated goals, progress, and feedback
  operations.
- `src/styles/monolith-system.css`: semantic and responsive Performance and
  Learning presentation.
- `artifacts/ui-migration/performance-learning`: 24 representative
  loaded-state captures; `verification.json` is locally generated and ignored.

## Verification record

Passed:

- legacy archive checksum, size, and 47-file listing;
- route audit: 211 pages, 11 layouts, 72 migrated, 138 pending;
- static UI/archive/behavior verifier for all 23 routes;
- targeted ESLint for new batch infrastructure, shared components, layouts,
  boundaries, shell, rewritten LMS/PMS views, and tests;
- `npx tsc --noEmit -p tsconfig.ui-migration.json`;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`;
- 34 relevant Vitest tests in 7 suites;
- clean `NODE_OPTIONS=--max-old-space-size=8192 npm run build`;
- Prisma generation, Next.js compilation, production TypeScript, and 315
  static pages;
- 115 authenticated runtime combinations across 23 routes:
  - Light, Night, and Violet on 1440×1000 desktop;
  - Violet on 1024×900 tablet;
  - Light on 390×844 mobile;
  - exact path, completed route loading, shell/theme, semantic tokens, shared
    controls/tables, no legacy composition, no application errors, and no
    horizontal overflow;
- 24 representative screenshots plus non-mutating PMS and LMS interaction
  checks.

The runtime fixture resolver used the existing appraisal and employee records
for appraisal detail and assignment. No eligible current-user management
review, asset, self-assessment, or reviewer record existed, so those exact
dynamic URLs were verified through their authenticated not-found boundaries.
The verifier does not create records or advance workflow state.

Repository-wide lint was also executed and retains the known backlog: 2,120
findings (1,618 errors and 502 warnings) across seed/maintenance scripts,
pending modules, and unchanged business-code debt. New batch infrastructure
and rewritten LMS/PMS surfaces pass targeted ESLint. The mechanically
presentation-converted AMS views retain 20 errors and 33 warnings from their
existing `no-explicit-any`, hook-effect, purity, unused-symbol, escaped-text,
and image-rule debt.

The build retains six non-fatal Turbopack broad file-trace warnings from
existing dynamic filesystem paths in HRMS letter generation, customer-portal
file routes/service code, and the NFT trace through `next.config.ts`. They do
not affect compilation or the verified runtime routes.

## Important constraints

- Do not redesign `/dashboard`.
- Do not opt a pending route into the Monolith shell before backing up and
  replacing its complete presentation.
- Do not treat a Monolith import as migration verification.
- Do not compile or import from `OLD UI code`.
- Do not compile, import, or modify `_design-reference`.
- Preserve business logic, server actions, validation, RBAC, integrations,
  navigation, pagination, filtering, and notifications.
- Update status after every migrated page and this handoff before ending an
  incomplete session.

## Next action

Choose the next coherent family from the 138 pending routes, archive its active
visual sources, extend centralized production components before page use, and
repeat the full static, type, test, build, and authenticated theme/responsive
verification gate.
