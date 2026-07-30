# Monolith design-system governance after merge to main

This policy becomes mandatory when
`codex/unify-production-design-system` is merged into `main`. It applies to
every later UI change, conflict resolution, hotfix, and feature branch.

## Canonical source

The live `/admin/design-system` route is the production component catalogue.
Its specimens render real components; catalogue-only CSS may arrange those
specimens but may not restyle them. The supported shared import surface is
`@/components/monolith`.

Before creating UI, search the live catalogue, its registry, the Monolith
barrel, and the ownership audit. Reuse or safely extend the existing production
component when the pattern already exists. Do not recreate buttons, fields,
filters, cards, headings, tables, badges, alerts, navigation, loading states,
or typography inside a route.

## New and unique components

A genuinely unique reusable pattern must be completed in this order:

1. Add one typed implementation to the correct shared or module owner.
2. Style it with semantic tokens in the shared system stylesheet or its single
   module stylesheet.
3. Export shared UI through `@/components/monolith`.
4. Add a typed registry entry and safe live specimen to
   `/admin/design-system`.
5. Document themes, states, interaction, accessibility, ownership, and status.
6. Replace route-local versions without changing business behavior, RBAC,
   validation, server actions, integrations, routing, refs, or test IDs.
7. Run the required verification gates.

An exclusion is allowed only for a non-standalone internal subcomponent or a
route-live component that cannot yet have a safe independent fixture. Every
exclusion must name its source, reason, and owner. Exclusions are not a way to
avoid registering a reusable pattern.

## Operational data-table toolbar

Search, filters, primary create action, visible-record count, and related table
controls belong inside `OperationalDataTableHeader`. At desktop widths they
form one aligned row, with the visible-record count last at the far right.
Compact filters and compact actions share the same control height, padding,
icon size, and icon-to-label spacing. Responsive wrapping is allowed only when
the viewport cannot safely contain the row.

## Merge and conflict-resolution rules

When this branch is merged into `main`:

- preserve the live registry, catalogue exclusions, stylesheet ownership, and
  `@/components/monolith` public API;
- resolve conflicts in favor of canonical production components, not older
  route-local markup or deleted catalogue mock CSS;
- do not restore `design-system-reference.css`,
  `design-system-production.css`, or disconnected demo components;
- keep `globals.css` as the normalized stylesheet entry point;
- retain explicit interactivity: static surfaces do not move;
- update `docs/ui-migration-status.md` and
  `docs/ui-migration-handoff.md` with each migration batch.

## Required gates

Run Node commands with `NODE_OPTIONS=--max-old-space-size=8192`, then run:

```text
npm run design-system:verify
npm run architecture:check
npm run test:ui
npx tsc --noEmit
npm run build
```

Run scoped ESLint and the relevant module/static/runtime verifiers as well.
Do not merge a new reusable visual export if catalogue verification reports it
as unregistered or undocumented.
