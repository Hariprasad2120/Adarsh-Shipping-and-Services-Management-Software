# Script inventory

The 52 tracked scripts were checked against `package.json`, Prisma/Vitest
configuration, source imports, documentation, and one another.

## Active categories

- Database/staging: guarded environment runner, staging target/runtime/global
  setup, staging database control, bootstrap/import/migration utilities.
- Integration/workers: Justdial worker, job synchronization, workmail and
  catalogue maintenance.
- Verification: route audit, static UI gates, runtime Playwright matrices,
  security/performance checks, and staging checks.
- Document operations: DOCX extraction, generation, template reading, and
  conversion utilities.
- Diagnostics/performance: connection check, route benchmark, and performance
  audit.

These scripts contain path-sensitive repository-root calculations and several
are package/config entrypoints. They remain in `scripts/` rather than being
moved merely for appearance. No script was proven unused under the prompt's
manual-production-use stop condition.

The removed `scrap` test and services were not scripts or package entrypoints.

