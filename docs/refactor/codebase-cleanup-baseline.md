# Codebase cleanup baseline

Recorded: 2026-07-30 (Asia/Calcutta)

## Source state

- Starting branch: `main`
- Cleanup branch: `codex/production-safe-structural-cleanup-20260730`
- Starting commit: `88fe383dcf43e4042a79ca058aadfa746904e389`
- Starting working tree: clean (`git status --short` produced no output)
- Remote: `origin`, `https://github.com/Hariprasad2120/Adarsh-Shipping-and-Services-Management-Software.git`
- Node.js: `v22.18.0`
- npm: `10.9.3`

## Package manager

npm is authoritative:

- `package-lock.json` is the only tracked lockfile.
- `package.json` scripts use npm/npx.
- `README.md` documents npm exclusively.
- `Dockerfile` uses `npm ci`, `npx prisma generate`, and `npm run build`.
- Lockfile history extends to the initial repository commit.
- No CI workflow establishes a competing package manager.

No lockfile removal or dependency change is required.

## Baseline checks

All Node-powered commands were launched with
`NODE_OPTIONS=--max-old-space-size=8192`.

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run lint` | Failed after 241.2 seconds | 61,096 findings: 6,413 errors and 54,683 warnings. Representative errors include `@typescript-eslint/no-explicit-any` in active business modules and `prefer-const` in `src/modules/hrms/__tests__/letters.test.ts`. This is the existing repository-wide lint backlog. |
| `npm test` | Blocked before test discovery | Exit 1. Guarded staging setup could not connect to `127.0.0.1:56432` (`ECONNREFUSED`); Vitest then reported no test files found. No production database was used. |
| `npm run build` | Passed | Prisma Client generation passed; Next.js 16.2.6 compiled; production TypeScript passed; 328 static pages were generated. |
| `npm run test:playwright:performance` | Not run in baseline | It requires a separately running application server. The first isolated background-server launch attempt was rejected by the execution policy before a process was created. |

The build retained the existing non-fatal Turbopack NFT warning involving
`next.config.ts` and
`src/app/api/customer-portal/checklist-files/[id]/route.ts`.

## Automated coverage and gaps

- Vitest tests exist under `src`, `scripts/__tests__`, and module `__tests__`
  directories, but the guarded staging database must be available before they
  execute.
- The tracked Playwright smoke script checks native login credential leakage
  and optionally checks authenticated dashboard motion warnings.
- Historical route/theme/viewport scripts exist under `scripts`, but several
  require local staging fixtures and credentials.
- The existing UI migration record documents 12 pending customer-portal route
  migrations and outstanding authenticated visual matrices for CHA and CRM.
- Cleanup verification must not claim those existing gaps as newly covered.

## Accepted pre-existing failures

1. Repository-wide ESLint backlog: 6,413 errors and 54,683 warnings.
2. Guarded Vitest execution blocked while the local marker-verified staging
   PostgreSQL service is unavailable at `127.0.0.1:56432`.
3. One non-fatal production-build NFT trace warning.
4. Previously documented visual-verification gaps for customer portal, CHA,
   and CRM.

These failures may be improved, but they must not be hidden, weakened, or
reported as cleanup regressions.

Post-baseline inspection proved that the initial lint total included generated
`.monolith-staging` Next.js bundles. Excluding that generated runtime output
reduced the final measurement to the real source backlog: 1,740 findings
(1,387 errors and 353 warnings). No active source rule was weakened.
