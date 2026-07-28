# Monolith UI migration handoff

Last updated: 2026-07-29

## Current state

- Branch: `main`
- Batch 004 parent: `384cfad`
- Protected reference: `/dashboard` was not redesigned.
- Route inventory: 211 total, 1 protected, 85 migrated, 125 pending, and 12
  layouts.
- Batch 004 covers every discovered Expense and CHA page: 11 `/cha` routes and
  `/expense`.
- The presentation replacement, archive, audit, static gate, targeted lint,
  focused and production TypeScript, focused tests, and production build pass.
- The required authenticated Light/Night/Violet desktop/tablet/mobile matrix is
  blocked because the connected in-app Browser service has no available browser
  instance.
- Batch 004 is migrated but not Verified. It has intentionally not been
  committed as a verified batch.
- The shared popup correction is implemented across the migrated Monolith
  families. Static, type, focused test, and production-build gates pass; its
  live theme/viewport matrix is included in the existing Browser blocker.

## Batch 004 implementation

1. Discovered routes from every `src/app/**/page.tsx` source rather than
   relying on sidebar links:
   - `/cha`
   - `/cha/approvals`
   - `/cha/customers`
   - `/cha/customers/[id]/edit`
   - `/cha/customers/new`
   - `/cha/expenses`
   - `/cha/jobs`
   - `/cha/jobs/[jobId]`
   - `/cha/reports`
   - `/cha/settings`
   - `/cha/settings/filing-workflows`
   - `/expense`
2. Archived 37 active legacy route, component, and style sources before
   presentation replacement.
3. Activated exact `/cha`, `/cha/**`, `/expense`, and `/expense/**` paths in the
   production Monolith shell.
4. Added centralized Expense/CHA workspace composition, semantic panels,
   connected metrics, numbered sections, toolbars, tabs, tables, badges,
   actions, dialog layers, loading states, and error states.
5. Replaced route-level legacy controls and presentation with shared Monolith
   controls and workspace components. Added a centralized shared textarea and
   normalized input handling for checkbox, radio, range, file, and hidden input
   types.
6. Migrated the full dynamic job workspace: details, documents, additional
   data, checklist approvals, filing workflow, filing prerequisites, bill
   filing, advances, expenses, audit history, warnings, dialogs, and drawers.
7. Migrated customer list/create/edit, job list/create, expenses, approvals,
   reports, settings, workflow configuration, and the Expense route.
8. Removed the obsolete active CHA global visual skin and replaced active
   legacy visual imports/classes with centralized semantic Monolith
   presentation.
9. Preserved authentication, RBAC and module gates, Prisma/data operations,
   server actions, validation, job stages and prerequisites, approvals,
   document handling, expenses, notifications, and integrations.
10. Regenerated the exhaustive route audit and added a repeatable static
    Expense/CHA verifier.

## Backup record

Archive:
`OLD UI code/legacy-ui-before-monolith-expense-cha-384cfad.zip`

- Source commit: `384cfad`
- Original files: 37, with relative paths retained.
- ZIP entries including directories: 52.
- Size: 269,883 bytes.
- SHA-256:
  `4BB7A161B2FC3D0C004500EA31FAE4DB3BAA49B098A3ABA8DAE07DAA32624F12`
- Archive checksum, size, and file-list verification: passed through
  `scripts/verify-monolith-expense-cha-ui.mjs`.

The foundation and batches 001 through 003 archives remain in `OLD UI code`.

Popup correction archive:
`OLD UI code/legacy-ui-before-monolith-popup-fix-20260729-384cfad.zip`

- Five pre-correction shared popup/CHA/style sources with relative paths
  retained.
- Size: 44,608 bytes.
- SHA-256:
  `6ED2CAF2AB94813E0BB5235B847C39DA9762FE7154E065EB4D595508FB2DE119`
- Checksum, exact listing, and all required entries: passed.

## Key files

- `docs/ui-route-audit.md`: regenerated route-by-route source record.
- `docs/ui-migration-status.md`: current migration counts and batch gate.
- `scripts/audit-ui-routes.mjs`: recognizes every Expense and CHA route as
  migrated.
- `scripts/verify-monolith-expense-cha-ui.mjs`: archive, route, presentation,
  and protected-workflow source gate.
- `src/components/monolith/cha-workspace.tsx`: centralized Expense/CHA metadata
  and workspace compositions.
- `src/components/monolith/textarea.tsx`: centralized multiline control.
- `src/components/monolith/input.tsx`: centralized input-type handling.
- `src/components/monolith/workspace-dialog.tsx`: centralized popup portal,
  responsive surface sizes, focus containment, keyboard handling, scroll lock,
  accessible naming, and focus restoration.
- `src/components/monolith/modal.tsx`: general compatibility adapter onto the
  centralized popup contract.
- `src/components/monolith/workspace-dialog.test.ts`: shared popup source and
  responsive-style contract.
- `src/app/(dashboard)/cha/layout.tsx`: CHA workspace boundary.
- `src/app/(dashboard)/expense/layout.tsx`: Expense workspace boundary.
- `src/app/(dashboard)/cha/jobs/[jobId]/job-workspace-client.tsx`: complete
  migrated job operations workspace.
- `src/components/cha/create-job-dialog.tsx`: migrated job creation dialog.
- `src/app/(dashboard)/cha/settings/filing-workflows/workflows-client.tsx`:
  migrated filing-workflow configuration workspace.
- `src/styles/monolith-system.css`: shared Expense/CHA semantic presentation.
- `src/app/globals.css`: obsolete legacy CHA UI skin removed.

## Verification record

Passed:

- legacy archive checksum, size, and 37-file listing;
- route audit: 211 pages, 12 layouts, 85 migrated, 125 pending;
- static UI/archive/workflow verifier for all 12 routes;
- targeted ESLint for new infrastructure, layouts, boundaries, shell, verifier,
  and tests;
- `npx tsc --noEmit -p tsconfig.ui-migration.json`;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`;
- 14 Monolith workspace, foundation, and shell tests in 4 suites;
- 12 CHA checklist/date-extension tests in 2 suites;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`;
- Prisma generation, Next.js compilation, production TypeScript, and 315
  static pages;
- `git diff --check`.

Post-batch popup correction also passes:

- five-file pre-correction archive checksum and listing;
- centralized popup static gate and migrated-source overlay scan;
- targeted ESLint for all correction infrastructure;
- full `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`;
- 16 tests in 5 focused suites;
- clean `NODE_OPTIONS=--max-old-space-size=8192 npm run build`, including
  Prisma generation, Next.js compilation, production TypeScript, and 315
  static pages.

The broader CHA integration suite completed 24 of 27 tests. The three failures
are existing fixture/environment expectations unrelated to presentation:

- Google Drive checklist attachment unavailable;
- `estimatedFilingDate` fixture is null;
- the test expects `JOB_DELETED_DIRECT` while the service emits
  `JOB_DELETE_EXECUTED`.

Repository-wide lint retains its known backlog: 2,117 findings (1,617 errors and
500 warnings). The presentation-converted Expense/CHA business views retain 375
errors and 71 warnings from existing `no-explicit-any`, hook-effect,
unused-symbol, and related debt. The new batch infrastructure passes targeted
ESLint. No business behavior was rewritten merely to mask legacy lint debt.

The production build retains the existing non-fatal Turbopack NFT trace warning
through `next.config.ts` and the customer-portal checklist-file route.

## Browser blocker

The production application started successfully at `http://127.0.0.1:3100`.
The Browser skill was then initialized against that URL, but
`agent.browsers.getForUrl(...)` reported that no browser was available and
`agent.browsers.list()` returned `[]`. The Browser skill prohibits substituting
standalone Playwright when its connected browser runtime is unavailable.

Consequently, none of these claims may be made yet:

- authenticated loaded-state verification for all Expense/CHA routes;
- Light, Night, and Violet visual verification;
- desktop, tablet, and mobile responsive verification;
- dialog/drawer and filing-workspace interaction verification;
- application-error, overflow, or exact-theme runtime assertions;
- verified-batch commit.

The same Browser service check was repeated for the shared popup correction on
2026-07-29 and still returned no available browser instance. The live matrix
must now include representative shared dialogs in To-Do, HRMS, Attendance,
AMS, Expense, and CHA, with the create-job workspace checked against the
reported oversized/nested-scroll defect.

## Important constraints

- Do not redesign `/dashboard`.
- Do not modify workflow behavior, stage prerequisites, approvals, document
  handling, expenses, role permissions, validation, integrations, or server
  actions.
- Do not compile or import from `OLD UI code`.
- Do not compile, import, or modify `_design-reference`.
- Keep all Node.js processes at
  `NODE_OPTIONS=--max-old-space-size=8192`.
- Preserve the batch changes and archive until runtime verification is
  available.

## Next action

Enable or attach an in-app Browser instance, then continue this same batch:

1. Start the production app with the 8 GB Node heap.
2. Use authenticated fixtures for the dynamic job and customer routes.
3. Exercise all 12 routes in Light, Night, and Violet at desktop, tablet, and
   mobile widths.
4. Open and verify all reachable dialogs, drawers, document/additional-data
   panels, checklist approvals, filing stages, workflow configuration, bill
   filing, expenses, and permission/not-found states without mutating workflow
   data.
5. Include representative shared popup consumers from To-Do, HRMS,
   Attendance, and AMS; assert that the surface stays inset on desktop/tablet,
   becomes a safe-area-aware bottom sheet on mobile, keeps close/actions
   visible, has one content scroller, contains keyboard focus, and restores
   focus to its trigger.
6. Fix any presentation defects, rerun the static/type/test/build gates, mark
   Batch 004 Verified, and only then commit the verified batch.
