# Monolith UI migration status

Last updated: 2026-07-28

## Status definitions

- **Protected**: authoritative working reference; no redesign permitted.
- **Migrated**: presentation replaced with shared Monolith production
  components and legacy visual code backed up.
- **Verified**: migrated route checked for behavior, RBAC, themes, responsive
  layout, lint, types, and relevant tests.
- **Pending**: discovered route not yet migrated and verified.

## Route inventory

Route discovery scans `src/app/**/page.tsx`, removes route-group segments, and
retains dynamic segments. The initial inventory contains **211 page routes**.

| Route family | Discovered | Verified | State |
| --- | ---: | ---: | --- |
| `/` | 1 | 0 | Pending audit |
| `/account` | 1 | 1 | Verified |
| `/accounting` | 32 | 0 | Pending |
| `/admin` | 10 | 0 | Pending |
| `/ams` | 18 | 0 | Pending |
| `/attendance` | 7 | 0 | Pending |
| `/cha` | 11 | 0 | Pending |
| `/communication` | 10 | 0 | Pending |
| `/crm` | 57 | 0 | Pending |
| `/customer-portal` | 12 | 0 | Pending |
| `/dashboard` | 1 | 1 | Protected working reference |
| `/expense` | 1 | 0 | Pending |
| `/google-chat-link` | 1 | 0 | Pending |
| `/hrms` | 38 | 0 | Pending |
| `/lms` | 5 | 0 | Pending |
| `/login` | 1 | 0 | Pending audit |
| `/notifications` | 1 | 0 | Pending |
| `/product-catalogue` | 1 | 0 | Pending |
| `/setup` | 1 | 0 | Pending audit |
| `/todo` | 1 | 0 | Pending |
| `/verify` | 1 | 0 | Pending |
| **Total** | **211** | **2** | **209 require verification** |

Importing from `@/components/monolith` is not proof of migration. Every route is
kept pending until its rendered markup and behavior are verified against the
completion gate.

## Migration batches

| Batch | Routes | State | Notes |
| --- | --- | --- | --- |
| Reference | `/dashboard` | Protected | Existing working dashboard; do not redesign. |
| 001 | `/account/security` | Verified | Legacy presentation backed up. Shared workspace primitives are active. Authenticated Light desktop, Night tablet, and Violet mobile browser checks passed. |

## Quality log

### Batch 001

- Passed targeted ESLint for all changed production TypeScript/TSX files.
- Passed focused TypeScript checking with `tsconfig.ui-migration.json`.
- Passed 29 tests across dashboard shell routing, navigation, security, and
  session security.
- Passed production scans for inline hex colors and legacy visual classes in
  `/account/security`.
- Confirmed the workspace primitives use semantic `--mnx-*` tokens and inherit
  the Light, Night, and Violet shell themes.
- Confirmed desktop, tablet, and mobile layout rules exist at 1180px, 900px, and
  680px breakpoints, with the table isolated in its horizontal scroll region.
- Full-repository `npm run lint` still fails on pre-existing findings in
  out-of-scope archived/scrap, Prisma, and application files.
- Full-repository `tsc --noEmit` still fails on pre-existing test-mock typing
  errors. `_design-reference` and `OLD UI code` are now explicitly excluded from
  compilation.
- Passed authenticated Playwright checks at 1440×1000 Light, 1024×900 Night,
  and 390×844 Violet. Each pass confirmed the migrated table, correct theme,
  absence of the legacy table, and no page-level horizontal overflow.
- Screenshot evidence:
  `artifacts/ui-migration/account-security-light-desktop.png`,
  `artifacts/ui-migration/account-security-night-tablet.png`, and
  `artifacts/ui-migration/account-security-violet-mobile.png`.
- Fixed deterministic `en-IN`/`Asia-Kolkata` session timestamps after the
  browser pass exposed a server/client locale hydration mismatch.
- The initial Turbopack server panic was isolated to corrupted HMR package
  resolution state (`Next.js package not found`). Development verification now
  runs successfully with Next's supported `--webpack` fallback.
- Fixed the login CSS module's pure-global selector so `/login` compiles under
  Webpack without changing its rendered design. `/login` remains pending its
  separate migration audit.
