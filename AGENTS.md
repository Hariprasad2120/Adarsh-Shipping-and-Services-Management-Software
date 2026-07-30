# Monolith UI Migration Rules

Read these files before changing UI code:

1. docs/monolith-design-system-reference.md
2. docs/full-ui-migration-prompt.md
3. docs/ui-migration-status.md
4. docs/ui-migration-handoff.md
5. docs/design-system-main-merge-governance.md

The authoritative visual references are, in order:

1. Actual canonical components in `src/components/monolith`
2. Live specimens in `/admin/design-system`
3. `docs/monolith-design-system-reference.md`
4. Read-only visual reference files

The component source is authoritative. The design-system page proves and
showcases the source. The design-system page must not override the source.

The administrator design-system route must match the read-only reference before using it to migrate application pages. When the route and an older implementation disagree, follow the route and the canonical component map in `docs/monolith-design-system-reference.md`; do not invent a compromise style.

Rules:

- The new design system is the only active UI system.
- Do not apply it as a CSS skin over legacy pages.
- Preserve all business logic, RBAC, server actions, integrations and validation.
- Back up legacy visual code before removing it.
- Do not redesign the working dashboard.
- Use centralized design tokens and shared production components.
- Import reusable UI from `@/components/monolith`; never create route-local alternatives for an existing pattern.
- A missing reusable pattern must be added to `src/components/monolith`, exported from its barrel, styled with semantic tokens, and demonstrated on `/admin/design-system` before module use.
- Every new or discovered visual componentâ€”shared or module-specificâ€”must use a single canonical production implementation and must be registered with a live specimen in `/admin/design-system`; never create a design-system-only copy, and do not complete the change until `npm run design-system:verify` passes.
- `/admin/design-system` is a live catalogue of the actual production components, not an independent reference implementation; its route-specific CSS may arrange specimens but must never style production components.
- Non-actionable surfaces must not receive hover elevation or movement. Hover movement is allowed only for buttons, links, explicitly interactive surfaces and draggable elements.
- All major page and section headings must use `WorkspaceSectionHeading`; do not create route-local heading typography or spacing.
- Do not create one-off buttons, fields, cards, tables, badges, alerts, navigation, loading states or typography.
- Support Light, Night and Violet themes.
- Do not use inline hex colors when a semantic token exists.
- Do not declare completion until every discovered route is verified.
- Update docs/ui-migration-status.md after every migrated page.
- Update docs/ui-migration-handoff.md before ending an incomplete session.
- Run lint, type checking and relevant tests after every migration batch.
- Always run Node.js commands with an 8 GB heap by setting
  `NODE_OPTIONS=--max-old-space-size=8192` before execution. Do not first
  attempt builds, TypeScript, lint, tests, Next.js, Prisma, Playwright, or other
  Node-powered tooling with Node's default heap. In PowerShell, use
  `$env:NODE_OPTIONS='--max-old-space-size=8192'` in the same process that
  launches the command so child processes inherit it.
- Do not modify files inside `_design-reference`.
- Do not import from or compile the reference project.
- Do not import from the reference project’s node_modules.
- Do not compile files inside `OLD UI code`.
