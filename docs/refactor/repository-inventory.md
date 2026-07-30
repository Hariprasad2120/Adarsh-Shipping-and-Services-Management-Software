# Repository inventory

Inventory date: 2026-07-30. Source snapshot:
`88fe383dcf43e4042a79ca058aadfa746904e389`.

The starting tree contained 1,691 tracked files. Inventory and reference
searches used `git ls-files` and `rg` across source, configuration, scripts,
tests, documentation, Docker, package metadata, route strings, and CSS.

| Area | Starting files | Classification |
| --- | ---: | --- |
| `src` | 957 | Canonical application routes, active shared code, active module code, styles, types, and tests |
| `artifacts` | 315 | Reproducible generated screenshots, JSON reports, and development logs |
| `OLD UI code` | 106 | Legacy migration evidence retained pending completion of migration verification |
| `mobile` | 59 | Active Android client source |
| `prisma` | 58 | Active schema, migrations, and seed entrypoints; retain unchanged |
| `scripts` | 52 | Active verification, database, integration, document, performance, and maintenance entrypoints |
| `_design-reference` | 42 | Authoritative read-only visual reference; retain unchanged |
| `scrap` | 33 | Compiler-excluded copied Communication prototype; confirmed non-runtime |
| `docs` | 28 | Active architecture/migration/performance records plus one generated inspection report |
| `public` | 10 | Runtime static assets |
| nested repository copy | 6 | Duplicate configuration/reference fragment; excluded from lint and runtime |
| root/configuration | 25 | Active npm, Next.js, Prisma, Docker, TypeScript, lint, environment-example, and instruction files, plus three generated server logs |

## Runtime entrypoints checked

- Next.js `page`, `layout`, `loading`, `error`, `route`, proxy, and dynamic
  segment conventions under `src/app`
- `package.json` scripts and Prisma seed configuration
- Docker build/start commands
- Vitest global setup and test discovery
- cron/background API routes and the Justdial worker
- static/dynamic imports and path aliases
- verification scripts with string-based source/archive references
- CSS imports and public/expense asset URL strings

No Prisma migration, database schema, route entrypoint, API handler, public
asset, active test, background job, or operational package script is in the
confirmed deletion set.

## Cleanup classification result

- Canonical design system: `src/components/monolith`,
  `src/styles/monolith-tokens.css`, and `src/styles/monolith-system.css`.
- Active loose shared components: moved into explicit ownership folders.
- Confirmed unused/generated: 359 files listed by the staged deletion diff and
  summarized in `deletion-manifest.md`.
- Uncertain or instruction-protected: retained in `retention-list.md`.

