# Phase 0 Baseline Validation

Date: 2026-07-29
All Node-powered commands used `NODE_OPTIONS=--max-old-space-size=8192`. No baseline failure was fixed.

## Repository and stack

| Item | Baseline |
|---|---|
| Branch | `feature/production-accounting-module` |
| Commit | `0729d684b4418808ab352fd1931fc53f8cd2d35f` |
| Worktree at start | Clean |
| Package manager | npm 11.13.0; `package-lock.json` |
| Runtime | Node.js 24.15.0 |
| Framework | Next.js 16.2.6, React 19.2.4, TypeScript 5 |
| Database tooling | Prisma / `@prisma/client` 7.8.0, PostgreSQL driver 8.20.0 |
| Declared local database | PostgreSQL 16 Alpine in `docker-compose.yml` |
| Production-like configured target | Neon PostgreSQL is named by Prisma; version and migration state could not be queried |

## Exact checks

| Command | Exit | Duration | Result |
|---|---:|---:|---|
| `npm run catalogue:check` | 0 | 1.91s | Pass with 20 warnings: 12 new HRMS API routes and 8 new Prisma models absent from the generated catalogue. |
| `npm run lint` | 1 | 82.5s observed first run | Fail; output was too large for a reliable aggregate in the console. |
| `npx eslint . --format json --output-file <temporary-file>` | 1 | 76.12s | 1,390 errors, 368 warnings, 0 fatal parser errors across 213 files. Accounting contributes 79 errors in `actions.ts`, 29 errors/21 warnings in `service.ts`, plus migration-script errors. |
| `npx tsc --noEmit` | 0 | 6.88s | Pass. |
| `npx prisma validate` | 0 | 2.19s | Pass; Prisma schema is syntactically valid. |
| `npx prisma migrate status` | 1 | 6.69s | Fail with schema-engine error after identifying the configured Neon datasource. Migration history is unverified. |
| `npm test` with `DATABASE_URL` overridden to an unreachable local endpoint | 1 | 3.88s | 32 files passed, 7 failed; 163 tests passed, 6 failed, 64 skipped (233 total). DB integration suites could not connect. Isolation was mandatory because these tests create/delete organizations and Phase 0 forbids database writes. |
| `npx next build` | 0 | 63.10s | Production compile, TypeScript, and 324 static pages pass. One existing Turbopack/NFT warning traces an unexpectedly broad filesystem dependency from the customer-portal checklist-file route. |

`npm run build` was not used because it first runs `prisma generate`, which can rewrite generated product files. `npx next build` exercised the production application build without violating the Phase 0 documentation-only constraint.

## Available versus missing validation surfaces

| Surface | Available | Phase 0 finding |
|---|---:|---|
| Lint | Yes | Failing baseline |
| Formatting | No dedicated script | Missing |
| Type check | No script; direct `tsc` works | Passing |
| Unit tests | Mixed into one Vitest command | 163 non-DB tests passed under isolation |
| Integration tests | Present but share configured DB behavior | No disposable test-database guard; unsafe to run against an unknown target |
| Accounting invariant tests | Eight integration scenarios | Narrow; no tenant/RBAC/concurrency/idempotency/immutable-reversal/failure-injection coverage |
| E2E | Playwright dependency installed | No E2E script/configured accounting suite discovered |
| Migration validation | Prisma commands available | History inaccessible; CHA readiness docs also record a broken shadow-history migration |
| Production build | Yes | Pass via non-generating variant |

## Database and data baseline limitation

Read-only aggregate count probing failed with `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`. Therefore the existence, volume, tenant distribution, reconciliation state, and migration version of live records are unknown. Schema and import code prove that accounting-compatible records may exist, but no Phase 0 document claims database counts. `DEC-0016` blocks any migration or compatibility assertion that requires live evidence.

## Environment, delivery, and operations

- `.env` exists locally and is ignored; only variable names were inspected, never values.
- Root `.gitignore` line 68 ignores `/docs/*`; this also hides the mandatory source files and all eight Phase 0 artifacts from normal `git status`. They exist on disk but will require an explicitly approved ignore-rule change or deliberate force-add during the later reviewed commit step. Phase 0 did neither.
- `Dockerfile`, `docker-compose.yml`, and `/api/health` exist.
- No repository CI workflow or hosted-deployment manifest was found.
- README links to `DEPLOYMENT.md`, `ENVIRONMENT_VARIABLES.md`, `SECURITY.md`, `BACKUP_AND_RESTORE.md`, `TESTING.md`, and `CHA_PRODUCTION_SCOPE.md`, but these files are missing.
- No accounting backup/restore evidence, RPO/RTO, reconciliation monitor, dead-letter dashboard, or rollback runbook was found.
- Dockerfile uses Node 20 while the inspected local runtime is Node 24; runtime parity is unverified.
