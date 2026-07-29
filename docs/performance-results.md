# Performance optimization results

Date: 2026-07-29

## Root causes confirmed

1. Webpack was forced for development. A clean `/login` compilation took
   6.53s versus 3.01s through the final default Turbopack command.
2. 148 React server-tree modules called `auth()` directly even though the
   repository already exposed request-scoped `getSession = cache(auth)`.
3. The dashboard shell mounted two independent polling agents. They issued up
   to four authenticated requests on separate 30s/60s timers, and the todo
   client performed reminder writes.
4. `/cha/jobs` imported the 13.5k-line CHA service and loaded customers, all
   active users, managers, teams, shipment types, and numbering rules before
   the Create Job dialog opened. It also ran settings/default initialization
   and warning materialization during a normal GET render.
5. The dashboard eagerly sent up to 200 employee records and organization
   structure in its initial RSC payload even though that data is only rendered
   after selecting the Organization tab.
6. The dashboard module summary still contains three count queries per visible
   module. This remains unresolved because changing it safely requires query
   plans and representative approved data.

## Implementation by subsystem

### Development and HMR

- `dev` and `dev:turbopack` now use Next.js 16's default Turbopack mode.
- `dev:webpack` remains available as a diagnostic fallback.
- The Webpack fallback ignores expanded legacy/reference/scratch trees.
- A controlled Playwright-connected component edit compiled in 280ms. The page
  recorded one load event total, stayed on `/login`, and produced no console
  errors, demonstrating Fast Refresh without a full page reload.
- The expanded UI reference/backup trees were not deleted: repository UI rules
  declare the design reference read-only and the pre-existing staged backup
  additions belong to the user. Both trees remain excluded from TypeScript,
  ESLint, tests, and the Webpack fallback watcher.

### Authentication

- Every tracked server `page.tsx`, `layout.tsx`, and shared server-render helper
  now calls `getSession()`.
- API handlers and server actions retain independent `auth()` validation,
  preserving request isolation and immediate revocation behavior.
- Static regression tests assert the server-tree boundary, nonce validation,
  disabled-user rejection, revoked status handling, and permission exceptions.

### Runtime updates

- Added `GET /api/runtime/updates`, which authenticates once and reads active
  notifications plus upcoming todo reminders in parallel.
- Added private ETag validation, one in-flight read, `AbortController`,
  visibility pause/resume, a single timeout, and exponential failure backoff.
- Notification presentation remains an explicit batched mutation.
- Removed the client reminder writer/poller.
- Added cron-secret-protected `GET /api/cron/todo-reminders` for bounded
  background materialization.

### CHA jobs

- Added focused server-only jobs and warnings query modules.
- The list query validates pagination and selects only rendered fields.
- Create-only data moved to permission-protected
  `GET /api/cha/jobs/create-options` and loads only when the dialog opens.
- Direct `?new=true` links still work and load options because the dialog was
  explicitly requested.
- Settings/default initialization was removed from the GET render.
- Due-date and filing-query warnings are pure reads scoped to the active and
  completed rows currently visible (at most 20 job IDs).
- The jobs page no longer imports `src/modules/cha/service.ts`.

### Dashboard

- Organization structure and the bounded employee directory moved to
  `GET /api/dashboard/organization`.
- The initial dashboard render no longer loads or serializes that dataset; it
  is fetched only when the Organization tab is selected.

## Exact benchmark comparison

| Scenario | Before | After | Change |
| --- | ---: | ---: | ---: |
| Development `/login` cold | 6,527.8ms Webpack | 3,005.1ms default Turbopack | -54.0% |
| Development `/login` warm median | 45.2ms | 44.9ms | -0.7% |
| Development `/login` warm p95 | 52.3ms | 51.1ms | -2.4% |
| Development `/login` application code, cold | not separated by Webpack log | 166ms | informational |
| Production `/login` warm median | baseline not captured before refactor | 5.4ms | no before/after claim |
| Production `/login` warm p95 | baseline not captured before refactor | 5.5ms | no before/after claim |
| Production build compilation | 17.0s | 15.0s | -11.8% |
| Production build routes | 324 | 328 | four intentional endpoints added |

Authenticated `/dashboard`, `/cha/jobs`, API latency, database query counts,
query durations, slowest SQL, server render duration, hydration duration, and
EXPLAIN ANALYZE results remain unavailable because no approved representative
database was identifiable. No acceptance target is claimed for those routes.

## Verification

- `npm ci`: passed; 724 packages installed.
- `npm run db:generate`: passed.
- `npx tsc --noEmit`: passed.
- Focused performance/security and dashboard tests: 9/9 passed.
- Targeted ESLint for new/changed hot-path code: passed.
- Production build: passed; 328 routes, 15.0s compile, 32.8s TypeScript.
- Playwright `/login` smoke: HTTP 200, correct path/title, no browser console or
  page errors.
- Controlled HMR check: one load event, no full reload, no browser errors.
- Full test run with the remote database blocked: 33 files and 166 tests passed,
  64 tests were skipped, and six fixture tests failed only after seven
  database-backed suites were blocked by the deliberately invalid local URL.
- Full repository ESLint remains red with 1,391 pre-existing errors and no
  warnings. Targeted ESLint for every changed performance hot-path file passes.

## Database and connection-pool work

No migration or index was created. The request explicitly prohibits guessing
indexes, and the approved representative database needed for SQL capture and
`EXPLAIN (ANALYZE, BUFFERS)` was unavailable. For the same reason, no
evidence-free `DB_POOL_SIZE` increase is recommended. Keep the conservative
existing value until local, container, and serverless pool wait time can be
measured independently.

## Modified files

- Complete repository inventory and per-file status:
  `docs/performance-file-audit.md`.
- Scanner/report infrastructure: `.gitignore`,
  `scripts/performance-audit.ts`, and the three performance documents.
- Compiler configuration: `package.json`, `next.config.ts`.
- Authentication: 148 server-render tree files, plus
  `src/lib/__tests__/performance-boundaries.test.ts`.
- Runtime/CHA/dashboard: the eleven files recorded in commit `2740f34`.

## Remaining limitations and risks

- Authenticated benchmarks, query plans, pool saturation, and end-to-end RBAC
  regression require an explicitly approved local/staging database and safe
  test credentials.
- Dashboard module counts still fan out across visible modules and must be
  replaced only after SQL plans can be captured.
- The original giant CHA service still serves non-list workflows. The jobs
  hot path is split, but the remaining commands/integrations need incremental
  extraction with their integration suites available.
- The existing customer-portal NFT broad-trace warning remains.
- `npm audit` reports 19 dependency advisories (3 low, 4 moderate, 10 high,
  2 critical); dependency remediation was not mixed into this performance
  refactor.

## Commits

1. `20902ee` — inventory runtime performance risks.
2. `140d249` — make Turbopack the default compiler.
3. `e50dad5` — deduplicate server-tree session validation.
4. `2740f34` — consolidate polling and lighten dashboard hot paths.
