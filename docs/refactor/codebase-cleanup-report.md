# Codebase cleanup report

Date: 2026-07-30

## Source and scope

- Starting branch: `main`
- Cleanup branch: `codex/production-safe-structural-cleanup-20260730`
- Starting commit: `88fe383dcf43e4042a79ca058aadfa746904e389`
- Ending implementation commit: `582f732` (the final report/status commit
  follows without production-code changes)
- Production data/schema/migrations changed: no
- Routes, API contracts, server actions, permissions, sessions, validation, and
  business rules changed: no

## Final structure

```text
src/
  app/                         Next.js route entrypoints/composition
  components/
    monolith/                  canonical production design system
    layout/                    dashboard/application shell
    navigation/                breadcrumbs and navigation
    feedback/                  page feedback/animation
    shared/                    cross-module composites
    providers/                 application providers
  modules/
    accounting/components/     Accounting feature-aware UI
    core/components/           root-only feature UI
    <feature>/                 existing feature business boundaries
  lib/                         cross-cutting infrastructure
  styles/                      semantic tokens and global system CSS
```

Canonical tokens are in `src/styles/monolith-tokens.css`; canonical system
styling is in `src/styles/monolith-system.css`; canonical production primitives
and workspace compositions are in `src/components/monolith`.

## Moves and consolidation

Eighteen files were moved with `git mv`:

- four navigation components;
- four layout components;
- three shared composites;
- one feedback component;
- one provider;
- two root-only clients into the Core module;
- three Accounting feature-aware components out of the canonical design-system
  directory.

No file was renamed and no component prop/export/markup contract changed.
The complete mapping and ownership rationale are in `component-inventory.md`
and `design-system-migration-matrix.md`.

The unused legacy `ModuleHome` implementation was removed. It had no consumer
and duplicated the active Monolith workspace/card approach.

## Deletions

359 files were removed:

- 315 generated screenshots, verification JSON files, and development logs
  under `artifacts`;
- 33 compiler-excluded copied Communication prototype files under `scrap`;
- six files in a nested partial repository duplicate;
- three root development server logs;
- one generated performance inspection document;
- one confirmed-unused legacy component.

Reasons, reference searches, replacements, and required validation are recorded
in `deletion-manifest.md`. Git history is the recovery path. `/artifacts/`,
`/scrap/`, the nested-copy folder, and `*.log` are ignored to prevent return.

## Retentions

`_design-reference` was not modified. `OLD UI code` remains because repository
instructions and active static migration gates still require its archive
evidence; it is excluded from production. Prisma migrations, path-sensitive or
plausibly manual operational scripts, mobile source, active docs, and uncertain
CSS/component candidates remain. See `retention-list.md`.

## Package manager and scripts

npm remains authoritative. `package-lock.json` is the only lockfile; no
dependency or lockfile version changed. Active scripts remain at stable paths
because package/config entrypoints and repository-root calculations make a
cosmetic move risky.

Added:

- `npm run audit:structure`
- `npm run audit:unused`
- `npm run quality`

The structural guard prevents loose shared components, old import paths,
canonical-system boundary violations, and tracked artifact/scrap/log/nested
copies. The unused-symbol audit is evidence only and does not authorize
deletion.

## Verification

All Node commands used `NODE_OPTIONS=--max-old-space-size=8192`.

| Gate | Result |
| --- | --- |
| Production TypeScript | Passed |
| Structural audit | Passed: 1,332 tracked paths and 909 production sources |
| Accounting static gate | Passed: 32 routes and protected workflow signals |
| Communication/Admin static gate | Passed: 20 routes and protected behavior |
| Auth/Misc static gate | Existing stale failure: expects literal `await auth()` |
| Unused-symbol audit | Reports existing backlog; evidence only |
| Browser smoke | Passed `/login`: meaningful content, interactive snapshot, no Next.js overlay |
| Playwright | Native login URL-leak passed; authenticated motion check skipped without safe credentials |
| Vitest | Existing blocker: guarded staging PostgreSQL offline at `127.0.0.1:56432` |
| Lint | Existing source backlog remains: 1,740 findings (1,387 errors, 353 warnings). Generated `.monolith-staging` bundles are now correctly excluded from lint. |
| Production build | Passed: Prisma generation, compilation, TypeScript, and all 328 pages; one accepted NFT trace warning remains |
| `git diff --check` | Passed |

No cleanup-specific functional or visual regression is known. Because this was
a path-only component move plus removal of non-runtime files, the browser smoke
is the representative after check. Historical before screenshots were generated
artifacts and intentionally removed; their prior versions remain in Git.

## Remaining recommendations

- Complete the already documented customer-portal route migration and the
  pending authenticated CHA/CRM theme matrices before evaluating active
  compatibility CSS.
- Bring up the marker-verified local staging database before using Vitest
  results as a final regression comparison.
- Address unused-symbol and lint findings in separately reviewed,
  behavior-aware batches; do not bulk-delete based on either audit.

## Cleanup summary

- Files moved: 18
- Files consolidated: 3 feature-aware components moved behind module ownership
- Files deleted: 359
- Legacy components removed: 1
- Legacy CSS removed: 0 (uncertain active compatibility rules retained)
- Scripts reorganized: 0 moved; 3 quality/audit commands added
- Documents consolidated/removed: 8 generated/copied/duplicate documents
- Remaining uncertain files: documented in `retention-list.md`
- Lint: 1,740 existing source findings (1,387 errors, 353 warnings)
- Tests: staging database baseline blocker
- Build: passed, 328 pages
- Playwright: public security smoke passed; authenticated check skipped
- Functional regressions: none known
- Visual regressions: none observed in public smoke
