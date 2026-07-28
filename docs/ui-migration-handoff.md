# Monolith UI migration handoff

Last updated: 2026-07-28

## Current state

- Branch at batch start: `main`
- Batch 002 parent: `e032bf2`
- Protected reference: `/dashboard` was not redesigned.
- Route inventory: 211 total, 1 protected, 49 migrated, 161 pending.
- Verified migrated families: all 38 `/hrms` routes and all 7 `/attendance`
  routes, in addition to the four previously migrated routes.
- Batch 002 implementation, route audit, static gate, TypeScript, focused
  tests, production build, and authenticated runtime matrix pass.

## Batch 002 completed

1. Archived the active legacy visual sources before replacement.
2. Activated exact `/hrms`, `/hrms/**`, `/attendance`, and `/attendance/**`
   routes in the production Monolith shell.
3. Added family layouts plus shared loading and error boundaries.
4. Added centralized People Operations metadata, page frame, summary, section,
   navigation, record, notice, loading, error, control, table, and dialog
   compositions.
5. Replaced complete HRMS and Attendance page presentation, including nested
   employee and letter details, onboarding, ownership, payroll, recruitment,
   career/employer flows, approvals, reports, settings, helpdesk, leaves,
   biometric sync, overtime, punch, and timesheets.
6. Removed scoped legacy visual class families, fixed palette utilities,
   inline colors, old data-table/ModuleHome composition, raw standard controls,
   and custom overlays.
7. Preserved RBAC, authentication, server actions, validation, employee and
   leave flows, attendance calculations, biometric integration, GPS tracking,
   shifts, overtime, payroll, letters, recruitment, approvals, and reports.
8. Documented the shared People Operations components in the Admin Design
   System catalogue.
9. Scoped Tailwind discovery to `src`, ensuring `OLD UI code` and scratch
   artifacts are never compiled.
10. Regenerated the exhaustive route audit and migration records.

## Backup record

Archive:
`OLD UI code/legacy-ui-before-monolith-hrms-attendance-e032bf2.zip`

- Source commit: `e032bf2`
- Entries: 81 original files with relative paths retained.
- Size: 219,295 bytes.
- SHA-256:
  `70A95661F9244DF4D49F35C7AEDAA40159A4365F77AAF6E1A8BB07B0E54F4313`
- Archive listing verification: passed.

The foundation and batch 001 archives remain in `OLD UI code`.

## Key files

- `docs/ui-route-audit.md`: regenerated route-by-route source record.
- `scripts/audit-ui-routes.mjs`: recognizes all HRMS and Attendance routes as
  batch 002.
- `scripts/verify-monolith-people-operations-ui.mjs`: static presentation and
  protected-behavior gate.
- `scripts/verify-monolith-people-operations-runtime.mjs`: authenticated
  production route/theme/viewport gate.
- `src/components/monolith/people-workspace.tsx`: centralized page metadata
  and People Operations compositions.
- `src/components/monolith/people-controls.tsx`: production standard controls.
- `src/components/monolith/people-data-table.tsx`: production data-table
  contract.
- `src/app/(dashboard)/hrms/layout.tsx` and
  `src/app/(dashboard)/attendance/layout.tsx`: family workspace boundaries.
- `src/app/(dashboard)/admin/design-system/design-system-client.tsx`: People
  Operations component catalogue.
- `src/styles/monolith-system.css`: shared People Operations presentation.
- `src/app/globals.css`: Tailwind source detection restricted to active
  production source.

## Verification record

Passed:

- legacy archive checksum, size, and 81-entry listing;
- route audit: 211 pages, 9 layouts, 49 migrated, 161 pending;
- static UI/behavior verifier for all 45 routes;
- targeted ESLint for new batch infrastructure;
- `npx tsc --noEmit -p tsconfig.ui-migration.json`;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`;
- 20 relevant Vitest tests in 7 suites;
- clean `NODE_OPTIONS=--max-old-space-size=8192 npm run build`;
- Prisma generation, Next.js compilation, production TypeScript, and 315
  static pages;
- 225 authenticated runtime combinations across 45 routes:
  - Light, Night, and Violet on 1440×1000 desktop;
  - Violet on 1024×900 tablet;
  - Light on 390×844 mobile;
  - exact path, shell/theme, semantic tokens, shared controls/tables, no legacy
    composition, no application errors, and no horizontal overflow;
- 32 representative screenshots.

Repository-wide lint was also executed and retains the known backlog: 2,147
findings (1,631 errors and 516 warnings) across seed/maintenance scripts,
pending modules, and unchanged business-code debt in presentation-converted
views. New batch infrastructure passes targeted ESLint.

The build retains six non-fatal Turbopack broad file-trace warnings from
existing dynamic filesystem paths in HRMS letter generation, customer-portal
file routes/service code, and the NFT trace through `next.config.ts`. They do
not affect compilation or the verified runtime routes.

## Post-batch 002 shell correction

Workspace chevrons in `MonolithAppShell` are now real accessible submenu
controls instead of decorative icons. Active workspaces auto-expand, child
routes are permission-filtered and route-aware, and nested navigation works on
desktop, compact desktop, and mobile. Authenticated browser checks covered
HRMS, Attendance, To-Do, and AMS; targeted lint, full TypeScript, navigation
tests, and the 8 GB production build passed.

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

Choose the next coherent family from the 161 pending routes, archive its active
visual sources, extend centralized production components before page use, and
repeat the full static, type, test, build, and authenticated theme/responsive
verification gate.
