# Monolith UI migration handoff

Last updated: 2026-07-28

## Current state

- Branch: `redesign/monolith-primary-ui`
- Batch 001 parent: `aed95fe`
- Legacy visual baseline: `7120d79`
- Protected reference: `/dashboard` remains unchanged.
- Verified migrated routes: `/account/security`, `/notifications`,
  `/product-catalogue`, and `/todo`.
- Verified shared surfaces: authenticated user profile menu and common
  permission, empty, loading, error, and not-found states.
- Route inventory: 211 total, 1 protected, 4 migrated, 206 pending.
- Batch 001 implementation, runtime matrix, tests, and production build pass.
- The worktree should be clean after the batch 001 commit.

## Batch 001 completed

1. Backed up the replaced route and shell sources before visual replacement.
2. Rebuilt Product Catalogue with production page, panel, field, badge,
   metric, workflow, dossier, interaction, outcome, and print compositions.
3. Rebuilt To-Do while preserving database-backed CRUD, validation,
   reminders, checklist updates, filter behavior, deep-link editing, status
   transitions, notifications, and destructive confirmation.
4. Rebuilt Notifications while preserving server filtering, personal
   isolation, read/acknowledge/open/dismiss actions, policy labels, links, and
   bulk actions.
5. Activated the three verified routes in `MonolithAppShell`.
6. Replaced the inert top-bar avatar with the authenticated user profile menu,
   including user identity, platform/workspace context, Security & Sessions,
   and sign-out.
7. Added reusable production metrics, fields, select/input/textarea/checkbox,
   progress, dialog, and permission/empty/loading/error state primitives.
8. Added authenticated loading, error, and not-found boundaries.
9. Removed active legacy component imports and scoped old generic
   input/select/textarea/button/checkbox CSS away from Monolith routes.
10. Updated the repeatable route audit and migration records.

## Backup record

Archive:
`OLD UI code/legacy-ui-before-monolith-batch-001-aed95fe.zip`

- Source commit: `aed95fe`
- Entries: 9 original targeted files with relative paths retained.
- Size: 26,781 bytes.
- SHA-256:
  `676DAB6A2C6FC519F3616B880C1689562B868F0E1AF03CBE6B4A22C7554C7738`
- `tar -tf` listing verification: passed.

The foundation archive remains:
`OLD UI code/legacy-ui-before-monolith-foundation-7120d79.zip`.

## Key files

- `docs/ui-route-audit.md`: regenerated route-by-route audit.
- `scripts/audit-ui-routes.mjs`: recognizes the three batch 001 routes.
- `scripts/verify-monolith-batch-001-ui.mjs`: authenticated interaction,
  theme, viewport, profile, common-state, legacy-composition, and overflow
  verification.
- `src/components/monolith/workspace.tsx`: reusable workspace components.
- `src/components/monolith/workspace-dialog.tsx`: production dialog.
- `src/components/monolith/workspace-states.tsx`: shared state compositions.
- `src/components/monolith/app-shell.tsx`: profile menu and shared shell.
- `src/styles/monolith-system.css`: production component and batch layout
  styling.
- `src/app/globals.css`: legacy generic form/button/checkbox selectors are
  inactive under the Monolith shell.

## Verification record

Passed:

- targeted ESLint for all changed TypeScript/TSX and migration scripts;
- `npx tsc --noEmit -p tsconfig.ui-migration.json`;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`;
- 27 relevant Vitest tests in 5 suites;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`;
- Prisma Client generation, production compilation, production TypeScript,
  and all 315 static pages;
- authenticated runtime interaction checks;
- 45 authenticated visual captures:
  - Product Catalogue, To-Do, Notifications, user profile, common states;
  - Light, Night, Violet;
  - 1440×1000, 1024×900, 390×844;
- no horizontal overflow, wrong-theme state, legacy composition, or route
  redirect in the verified matrix.

Runtime behavior exercised:

- Product Catalogue search/no-results, module selection, and blueprint view;
- To-Do create/edit dialog surface, cancellation, shared checkbox, and task
  expansion without mutating production data;
- Notifications status/acknowledgement filters without running bulk mutations;
- profile menu identity, Security & Sessions, and sign-out affordances.

The local Turbopack development server panicked while compiling `/login`
(`Next.js package not found`). The repository now defaults `npm run dev` to
the officially supported `next dev --webpack` path so normal development no
longer enters the failing Turbopack code path. Turbopack remains an explicit
diagnostic opt-in through `npm run dev:turbopack`. The production Turbopack
build passed; this was a local development-bundler issue.

Repository-wide `npm run lint` was executed with an 8 GB heap and still reports
the pre-existing backlog in seed/maintenance scripts and pending accounting,
CHA, and other modules. No batch 001 file fails targeted ESLint.

The existing non-fatal production-build NFT trace warning remains in
`src/app/api/customer-portal/checklist-files/[id]/route.ts`.

## Important constraints

- Do not redesign `/dashboard`.
- Do not opt a pending route into `MonolithAppShell` before backing up and
  replacing its presentation.
- Do not treat a Monolith import as migration verification.
- Do not compile or import from `OLD UI code`.
- Do not compile, import, or modify `_design-reference`.
- Preserve business logic, server actions, validation, RBAC, integrations,
  navigation, pagination, filtering, and notifications.
- Keep legacy generic styling excluded from verified Monolith routes.
- Update status after every migrated page and this handoff before ending an
  incomplete session.

## Next action

Choose the next coherent family from the 206 pending routes. Read the migration
instructions, confirm the clean worktree, back up the exact active visual
sources, extend shared primitives before page use, and repeat the full
theme/responsive/behavior validation gate.
