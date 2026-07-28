# Monolith full UI migration

## Goal

Migrate every user-facing route to the production Monolith design system while
preserving the application's business behavior. The migration is a presentation
replacement, not a rewrite of domain logic.

## Authoritative visual references

1. `_design-reference/Monolith-Design-System-v11-Full-Source-and-Dependencies`
2. The existing working `/dashboard`

The reference project is read-only. Do not modify it, import its `node_modules`,
or compile it as part of this application.

## Non-negotiable rules

- The new design system is the only active UI system.
- Do not apply the new design as a CSS skin over legacy page markup.
- Preserve business logic, RBAC, server actions, integrations, validation,
  navigation, forms, pagination, filters, and notifications.
- Back up legacy visual code under `OLD UI code` before replacing or removing it.
- Do not redesign the working `/dashboard`.
- Use centralized semantic tokens and shared production components.
- Do not create one-off buttons, fields, cards, tables, or typography.
- Support Light, Night, and Violet themes.
- Do not use inline hex colors when a semantic token exists.
- Do not declare the migration complete until every discovered route has been
  verified.
- Update `docs/ui-migration-status.md` after every migrated page.
- Update `docs/ui-migration-handoff.md` before ending an incomplete session.
- Run lint, type checking, and relevant tests after every migration batch.
- Do not modify files inside `_design-reference`.
- Do not compile files inside `OLD UI code`.

## Required workflow for each batch

1. Read this file, `docs/ui-migration-status.md`, and
   `docs/ui-migration-handoff.md`.
2. Confirm the worktree state and preserve unrelated user changes.
3. Inspect the route, its client components, server actions, permissions, and
   validation before changing presentation.
4. Copy the replaced visual implementation into `OLD UI code`, keeping the same
   relative path where practical.
5. Add any reusable visual pattern to `src/components/monolith` and its semantic
   styling to `src/styles/monolith-system.css` before using it in a page.
6. Migrate the route as real Monolith markup. Do not rely on legacy visual
   classes inside a Monolith shell.
7. Verify behavior, RBAC, all three themes, and desktop/tablet/mobile layout in
   proportion to the route's risk.
8. Run lint, `tsc --noEmit`, and relevant tests.
9. Update the status and handoff documents with commands and results.

## Completion gate

Completion requires a fresh route discovery, a route-by-route verification
record with no pending routes, no active legacy UI runtime imports or legacy
visual class families, successful quality checks, and a final visual pass in
Light, Night, and Violet themes at desktop, tablet, and mobile widths.
