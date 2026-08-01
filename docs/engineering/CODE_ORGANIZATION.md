# Code Organization

This engineering guide is the authoritative location for the Monolith
component-ownership and repository-structure rules used during the structural
integration.

See the full guide in [../CODE_ORGANIZATION.md](../CODE_ORGANIZATION.md).

Key rules:

- `src/app` owns routes and route-private composition only.
- `src/components/ui` owns canonical module-agnostic primitives.
- Shared composites belong in explicit shared folders under `src/components/`.
- Module-owned reusable UI belongs in `src/modules/<module>/components`.
- `src/components/monolith` is compatibility/catalogue-only during migration.
- `npm run architecture:check` is a required verification gate.
