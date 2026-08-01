# Adding a Monolith component

Monolith has one production implementation for each visual pattern. The live
administrator catalogue renders that implementation; it never maintains a
demo-only copy.

## Required workflow

1. Search `src/components/monolith`, the ownership audit, and module components
   to determine whether the pattern already exists.
2. Extend the existing component when its contract can safely cover the use
   case.
3. Otherwise create one canonical shared or module-owned typed component.
4. Use semantic `--mn-*` tokens. Shared styles belong in
   `monolith-system.css`; genuine module composition styles belong in the
   matching `src/styles/modules` owner.
5. Export shared UI through `src/components/monolith/index.ts`.
6. Add a typed registry entry with stable ID, export, source, scope, category,
   description, status, themes, states, interaction, accessibility notes, and a
   live renderer using safe mock data.
7. Replace route-local recreations while preserving behavior, form contracts,
   refs, handlers, validation, RBAC, server actions, routing, test IDs, and
   integrations.
8. Run `npm run design-system:verify`.
9. Run scoped lint, production TypeScript, relevant tests, the production
   build, and browser parity checks with the required 8 GB Node heap.
10. Update the migration status and handoff documents.

## Interaction rules

Static surfaces do not move. Use `interactive` only when the surface has a real
action and keyboard contract. Links, buttons, icon actions, and draggable
elements may use motion; disabled controls, badges, alerts, tables, form
containers, and informational metrics may not.

## Heading rules

Every major page or section heading uses `WorkspaceSectionHeading`. Do not add
route-local heading typography or spacing. Panel-internal titles may use the
canonical panel header because they are not major sections.

## Deprecation

Mark the registry entry `deprecated`, name the replacement in its description,
migrate all production consumers, and remove the source only after import,
coverage, type, test, build, and browser gates pass.
