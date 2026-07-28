# Monolith UI migration handoff

Last updated: 2026-07-28

## Current state

- Branch: `redesign/monolith-primary-ui`
- Foundation session parent: `8d44605`
- Legacy visual baseline: `7120d79`
- Foundation implementation and production build are verified.
- The worktree should be clean after the foundation commit.
- No new individual module was migrated in this session.

## Completed foundation stages

1. Audited all 211 page routes and all 7 layouts.
2. Rebuilt `docs/ui-migration-status.md` around the verified inventory.
3. Created and checksum-verified the complete OLD UI baseline archive.
4. Analysed the authoritative reference source and recorded its production
   mapping.
5. Centralized semantic tokens, Geist typography, shape, motion, and Light,
   Night, and Violet theme palettes.
6. Established the shared `MonolithAppShell` and reusable page/layout
   primitives.
7. Normalized the protected `/dashboard` implementation to shared primitives
   without changing its class contract or design.
8. Updated this handoff with commands, results, known debt, and next actions.

## Key files

- `docs/ui-route-audit.md`: generated route-by-route and layout-by-layout audit.
- `scripts/audit-ui-routes.mjs`: repeatable audit generator.
- `OLD UI code/legacy-ui-before-monolith-foundation-7120d79.zip`: complete
  visual-source baseline.
- `scripts/verify-old-ui-backup.mjs`: checksum and archive-content verifier.
- `src/styles/monolith-tokens.css`: centralized production tokens and themes.
- `src/styles/monolith-system.css`: production component styling and stable
  dashboard aliases.
- `src/components/monolith/app-shell.tsx`: shared authenticated AppShell.
- `src/components/monolith/foundation.tsx`: shared page and UI primitives.
- `src/components/monolith/workspace.tsx`: reusable migrated-page layouts.

## Verification record

Passed:

- `node scripts/verify-old-ui-backup.mjs`
- targeted ESLint for all changed production TypeScript/TSX and migration
  utility scripts
- `npx tsc --noEmit -p tsconfig.ui-migration.json`
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`
- 36 relevant Vitest tests
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`

The production build compiled successfully, completed TypeScript, and generated
315 static pages.

`npm run lint` was executed repository-wide with an 8 GB heap. It still reports
pre-existing findings in pending modules and maintenance/seed scripts. All
foundation files pass targeted ESLint. Do not broaden a future UI migration
batch into unrelated lint cleanup unless explicitly requested.

The production TypeScript program excludes test files; Vitest owns test
transformation/execution. Existing Prisma mock typing issues remain in test
source but do not affect the passing production type-check or build.

One non-fatal existing Turbopack NFT trace warning remains in the customer
portal checklist-file route.

## Important constraints

- Do not redesign `/dashboard`.
- Do not opt a pending route into `MonolithAppShell` before backing up and
  replacing its presentation with shared Monolith components.
- Do not treat an existing Monolith import as route verification.
- Do not compile or import from `OLD UI code`.
- Do not compile, import, or modify `_design-reference`.
- Preserve business logic, server actions, validation, RBAC, integrations,
  navigation, pagination, filtering, and notifications during page batches.
- Update the status after every migrated page and this handoff before ending an
  incomplete session.

## Next action

Begin the first post-foundation module batch from the pending route inventory.
Choose a small coherent route family, inspect its behavior and permissions,
back up its presentation under `OLD UI code`, add reusable patterns to the
foundation before page use, and verify all three themes and responsive widths.

The local Webpack development server that had been running on port 3000 was
stopped so the production build could own `.next`. Restart it explicitly when
interactive verification is needed.
