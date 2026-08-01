# Component reorganization baseline

Recorded: 2026-07-30 (Asia/Calcutta)

## Source state

- Branch: `codex/production-safe-structural-cleanup-20260730`
- Commit: `e891cdd7e240aa69155d3c89e0462512d8ebd1b3`
- Working tree: clean (`git status --short` produced no output)
- Package manager: npm
- Node heap for every Node-powered command:
  `NODE_OPTIONS=--max-old-space-size=8192`

No work was stashed, reset, discarded, overwritten, or reformatted during
pre-flight.

## Mandatory baseline

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run lint` | Timed out after 184 seconds | The repository-wide ESLint process emitted no findings before the execution window expired. The preceding cleanup baseline records the accepted source backlog as 1,740 findings (1,387 errors and 353 warnings). |
| `npm test` | Blocked before collection | Exit 1. The marker-guarded staging PostgreSQL endpoint at `127.0.0.1:56432` refused the connection; Vitest consequently reported no test files found. No production database was used. |
| `npm run build` | Passed in 181.8 seconds | Prisma Client generation, Next.js 16.2.6 compilation, production TypeScript, and all 328 generated pages passed. |

The successful build retained the existing non-fatal Turbopack NFT trace
warning through `next.config.ts` and
`src/app/api/customer-portal/checklist-files/[id]/route.ts`.

## Accepted pre-existing conditions

1. Repository-wide ESLint has a documented active-source backlog and may exceed
   a short execution window.
2. The full Vitest command requires the local marker-verified staging database,
   which is currently offline.
3. The production build emits one accepted non-fatal broad-file trace warning.
4. Existing UI migration records retain pending customer-portal migration and
   authenticated CHA/CRM visual matrices.

These conditions are baseline evidence. They must not be attributed to this
component reorganization without direct contrary evidence.
