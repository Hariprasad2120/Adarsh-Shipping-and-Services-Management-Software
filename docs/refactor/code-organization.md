# Code organization

The authoritative component boundary documentation is
[`docs/architecture/component-organization.md`](../architecture/component-organization.md).

The canonical shared UI locations are `components/ui`, `data-display`, `forms`,
`layout`, `navigation`, `feedback`, and `providers`. Business UI belongs to
`modules/<module>/components`. `src/components/monolith` is retired.

Run `npm run architecture:check` for the enforceable repository gate and
`node scripts/audit-component-architecture.mjs` to regenerate the complete
usage, migration, deletion-candidate, and retention maps.
