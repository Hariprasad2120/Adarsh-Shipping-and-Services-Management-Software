# Monolith UI Migration Rules

Read these files before changing UI code:

1. docs/full-ui-migration-prompt.md
2. docs/ui-migration-status.md
3. docs/ui-migration-handoff.md

The authoritative visual references are:

- `_design-reference/Monolith-Design-System-v11-Full-Source-and-Dependencies`
- The existing working `/dashboard`

Rules:

- The new design system is the only active UI system.
- Do not apply it as a CSS skin over legacy pages.
- Preserve all business logic, RBAC, server actions, integrations and validation.
- Back up legacy visual code before removing it.
- Do not redesign the working dashboard.
- Use centralized design tokens and shared production components.
- Do not create one-off buttons, fields, cards, tables or typography.
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
- Do not import from the reference project’s node_modules.
- Do not compile files inside `OLD UI code`.
