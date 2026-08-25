# UI Migration Constraints

When changing user-facing UI in this repository:

- Read `docs/MONOLITH_UI_DESIGN_SYSTEM.md`
- Read `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`
- Read `docs/ui-route-audit.md`
- Read `docs/ui-component-and-style-ownership-audit.md`
- Read `docs/ui-migration-handoff.md`
- Read `docs/engineering/CODE_ORGANIZATION.md` when present
- Read `docs/engineering/PERFORMANCE.md` when present

Authoritative UI references:

- `/dashboard`
- `/admin/design-system`
- production components in `src/components/ui`
- approved shared owner folders under `src/components/*`
- module-owned UI under `src/modules/<module>/components`

Rules:

- Do not redesign the working dashboard
- Do not skin legacy pages with the new design system
- Do not create one-off buttons, fields, cards, tables, badges, alerts, nav, loading states, or typography
- `src/components/monolith` is compatibility/catalogue-only, not a second implementation location
- Do not add selectors to `src/styles/legacy-compatibility.css`
- Support Light, Night, and Violet themes
- Do not claim migration complete without source and runtime verification
- Update migration docs after each migration batch
