# Monolith UI migration handoff

Last updated: 2026-07-28

## Current state

- Branch: `redesign/monolith-primary-ui`
- Starting commit: `7120d79` (`checkpoint: working dashboard before full UI migration`)
- Worktree was clean when this migration session resumed.
- The repository initially had no migration status or handoff document, and the
  root `full-ui-migration-prompt.md` was empty. The required control documents
  have therefore been reconstructed under `docs/` before UI code changes.
- Route discovery found 211 page routes. `/dashboard` is the protected working
  reference; 210 routes still require migration verification.

## Completed batch

Batch 001 migrated and verified `/account/security`.

Completed presentation work:

- backed up the original page and sessions client under
  `OLD UI code/src/app/(dashboard)/account/security`;
- added shared workspace page, page-header, panel, action, badge, alert, table,
  and empty-state primitives in `src/components/monolith/workspace.tsx`;
- added semantic, responsive primitive styles to
  `src/styles/monolith-system.css`;
- opted only `/dashboard` and `/account/security` into the Monolith shell;
- added contextual shell route labels without changing the `/dashboard`
  appearance;
- preserved authentication, session listing, per-session revocation, bulk
  revocation, revalidation, errors, timeout messaging, and server actions;
- added a reusable authenticated browser smoke script at
  `scripts/verify-account-security-ui.mjs`.

Verification completed:

- targeted ESLint: passed;
- focused TypeScript (`tsconfig.ui-migration.json`): passed;
- shell routing, navigation, security, and session-security tests: 29 passed;
- inline-color and legacy-class scan for Batch 001: passed;
- semantic Light/Night/Violet token and responsive breakpoint inspection:
  passed;
- authenticated Playwright verification: passed at Light desktop, Night tablet,
  and Violet mobile sizes;
- generated screenshot evidence under `artifacts/ui-migration`;
- deterministic session time formatting removed the server/client locale
  hydration mismatch;
- the smoke script now waits for React hydration and signs out its own test
  session after verification.

The Turbopack panic was caused by corrupted HMR state reporting `Next.js package
not found` while emitting `/login`. `next@16.2.6` remained correctly installed
and resolvable. The development server was restarted with the supported
`--webpack` fallback and is healthy on port 3000.

Webpack also exposed a pre-existing CSS Modules purity error in the login page.
The selector now uses the local `.loginPage` class inside `:has(...)`, preserving
the rendered behavior while compiling correctly. This was a compatibility fix,
not a migration verification for `/login`.

## Important constraints

- Do not change `/dashboard` visuals.
- Do not opt unmigrated routes into the Monolith shell.
- Do not treat an existing Monolith import as route verification.
- Do not compile or import code from `OLD UI code`.
- Do not modify `_design-reference`.

## Known repository-wide quality findings

- `npm run lint` requires a larger Node heap and then reports pre-existing
  findings outside Batch 001, including archived/scrap and Prisma/application
  files. Changed production files pass targeted lint.
- Full `tsc --noEmit` reports pre-existing customer-portal test-mock and
  security-test typing errors. The focused migration type check passes.
- `tsconfig.json` now excludes both `_design-reference` and `OLD UI code` so
  neither read-only source is compiled.
- During the session, `AGENTS.md` and an untracked nested
  `Adarsh-Shipping-and-Services-Management-Software/` directory appeared as
  external worktree changes. They were not created or edited by this migration
  work and must be preserved.

## Next action

Select the next small route family from the inventory. Do not opt another route
into the Monolith shell before its legacy presentation is backed up and
replaced. Keep using the Webpack development fallback until Turbopack's HMR
package-resolution panic can be reproduced and resolved independently.
