Mandatory Monolith UI rules

Before creating, changing, or reviewing any user-facing UI, read:

docs/MONOLITH_UI_DESIGN_SYSTEM.md

docs/engineering/CODE_ORGANIZATION.md when present

docs/engineering/PERFORMANCE.md when present

The current production component implementations and /admin/design-system are authoritative. The dashboard is the composition reference and CHA is the operational reference.

Implement shared UI in the approved owner folders under src/components; implement genuine module compositions under src/modules/<module>/components. src/components/monolith is the public aggregation/catalogue boundary and must not contain a second component implementation.

Do not add new selectors to src/styles/legacy-compatibility.css. Do not claim a route is migrated without current source and runtime verification.

# Monolith UI Migration Rules

Read these files before changing UI code:

1. `docs/MONOLITH_UI_DESIGN_SYSTEM.md`
2. `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`
3. `docs/ui-route-audit.md`
4. `docs/ui-component-and-style-ownership-audit.md`
5. `docs/ui-migration-handoff.md`
6. `docs/engineering/CODE_ORGANIZATION.md` when present
7. `docs/engineering/PERFORMANCE.md` when present

The authoritative visual references are:

- the existing working `/dashboard`
- the current production component implementations in:
  - `src/components/ui`
  - `src/components/layout`
  - `src/components/forms`
  - `src/components/data-display`
  - `src/components/feedback`
  - `src/components/navigation`
  - `src/components/providers`
  - `src/modules/<module>/components`
- the live `/admin/design-system` catalogue

Rules:

- The new design system is the only active UI system.
- Do not apply it as a CSS skin over legacy pages.
- Preserve all business logic, RBAC, server actions, integrations, and validation.
- Back up legacy visual code before removing it.
- Do not redesign the working dashboard.
- Use centralized design tokens and shared production components.
- Use canonical primitives from `src/components/ui`, explicit shared component
  owners under `src/components/{data-display,forms,layout,navigation,feedback,providers}`,
  and module-owned UI under `src/modules/<module>/components`.
- `src/components/monolith` is compatibility/catalogue-only during migration.
  Do not add a second production implementation there.
- `src/components/monolith/index.ts` is the supported public API/barrel.
- `src/components/monolith/catalogue/**` contains typed catalogue entries and live specimens only.
- Do not create one-off buttons, fields, cards, tables, badges, alerts,
  navigation, loading states, or typography.
- Support Light, Night, and Violet themes.
- Do not use inline hex colors when a semantic token exists.
- Do not declare completion until every discovered route is verified.
- Update `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md` after every migration batch.
- Update `docs/ui-migration-handoff.md` before ending an incomplete session.
- Regenerate `docs/ui-route-audit.md` and `docs/ui-component-and-style-ownership-audit.md`
  whenever route/state classification or ownership evidence changes materially.
- Run lint, type checking, and relevant tests after every migration batch.
- Always run Node.js commands with an 8 GB heap by setting
  `NODE_OPTIONS=--max-old-space-size=8192` before execution. In PowerShell, use
  `$env:NODE_OPTIONS='--max-old-space-size=8192'` in the same process that
  launches the command so child processes inherit it.
- Do not compile files inside `OLD UI code`.
