# Performance baseline

Date: 2026-07-29

## Safety and environment

The repository `.env` points to a remote Neon PostgreSQL host, but no repository
documentation identifies that database as local, staging, or approved for
performance testing. It was therefore not contacted. Docker is unavailable.
A local PostgreSQL 18 service is listening on port 5432, but the repository's
documented development credentials do not authenticate to it.

All compile and test commands used an explicit non-remote URL on
`127.0.0.1`. No production database, schema mutation, destructive data command,
or `prisma db push` was used.

This prevents an honest authenticated/database baseline for the protected
routes. Those cells are marked unavailable rather than being replaced with
unauthenticated redirect timings.

## Clean baseline

- `npm ci`: passed after stopping the repository-owned Webpack dev server that
  held a native `lightningcss` binary open.
- `.next` and `tsconfig.tsbuildinfo`: removed before baseline compilation.
- `npm run db:generate`: passed; Prisma Client 7.8.0.
- Dependency check: one installed copy each of Next 16.2.6, React 19.2.4, and
  React DOM 19.2.4.
- `npx tsc --noEmit`: passed.
- Baseline build: passed, 324 routes; compilation 17.0s and production
  TypeScript 32.9s.
- Baseline tests: 32 files and 163 tests passed. Seven database-backed suites
  could not authenticate to the deliberately invalid local URL; 64 tests were
  skipped and six fixture tests failed for that reason.

## Development compiler baseline

Measurements use `curl` wall time. Warm p95 is nearest-rank over five samples.

| Compiler | Route | Cold | Warm samples | Median | p95 | Payload |
| --- | --- | ---: | --- | ---: | ---: | ---: |
| Webpack | `/login` | 6,527.8ms | 45.9, 45.2, 44.0, 52.3, 39.0ms | 45.2ms | 52.3ms | 18,521 B |
| Turbopack compatibility alias | `/login` | 2,751.5ms | 52.2, 41.5, 40.5, 40.8, 40.9ms | 40.9ms | 52.2ms | 23,506 B |

The initial report's `Cannot read properties of undefined (reading 'call')`
error did not reproduce after the stale development output was removed. No
stack trace was available in the supplied logs, so this is recorded as
“not reproduced,” not as a confirmed code fix.

## Requested route matrix

| Route | Development cold | Development warm | Production warm | Query count/duration | Status |
| --- | ---: | ---: | ---: | --- | --- |
| `/login` | 6,527.8ms Webpack | 45.2ms median / 52.3ms p95 | measured after implementation | 0 application DB queries | Valid public baseline |
| `/dashboard` | unavailable | unavailable | unavailable | unavailable | Authentication and approved DB required |
| `/cha` | unavailable | unavailable | unavailable | unavailable | Authentication and approved DB required |
| `/cha/jobs` | unavailable | unavailable | unavailable | unavailable | Authentication and representative approved DB required |
| `/expense` | unavailable | unavailable | unavailable | unavailable | Authentication and approved DB required |
| `/hrms` | unavailable | unavailable | unavailable | unavailable | Authentication and approved DB required |
| `/crm/dashboard` | unavailable | unavailable | unavailable | unavailable | Authentication and approved DB required |
| `/accounting` | unavailable | unavailable | unavailable | unavailable | Authentication and approved DB required |
| `/api/notifications/active` | unavailable | unavailable | unavailable | unavailable | Authentication and approved DB required |
| `/api/notifications/presented` | unavailable | unavailable | unavailable | unavailable | Authentication and approved DB required |
| `/api/todos/reminders/upcoming` | unavailable | unavailable | unavailable | unavailable | Authentication and approved DB required |
| `/api/todos/reminders/check` | unavailable | unavailable | unavailable | unavailable | Authentication and approved DB required |

Unauthenticated requests to these protected paths were separately checked and
returned the expected `307` login redirect in roughly 2–9ms. They are security
smoke results, not application performance measurements.

