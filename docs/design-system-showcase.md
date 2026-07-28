# Design System Showcase

Last updated: 2026-07-28

The production showcase route is `/admin/design-system`. It is the living
reference for reusable UI migration decisions after the protected `/dashboard`
baseline.

## Current Decisions

| Date | Decision | Reuse rule |
| --- | --- | --- |
| 2026-07-28 | Use `Inter, "Segoe UI", Arial, sans-serif` for interface text. | Keep the stack in `--mn-font-sans`; do not set route-local font families. |
| 2026-07-28 | Numeric text should not use the old mono-style visual. | Keep `--mn-font-mono` mapped to the Inter stack unless a future decision changes it. |
| 2026-07-28 | Page content should feel centered and spacious like the reference. | Use `WorkspacePage`/`MonolithPage` and shared layout gutter tokens. |
| 2026-07-28 | The showcase itself should be reusable production UI. | Extend `src/styles/monolith-system.css` and shared Monolith primitives before route-local styling. |
| 2026-07-28 | Scrollbars belong to the full app viewport, not the centered content frame. | Keep `.mnx-dashboard-main` full width and center the inner page wrapper. |
| 2026-07-28 | Page content should be slightly narrower with a little more surrounding space. | Use a 1200px content max and `clamp(32px, 3.3vw, 50px)` desktop gutters. |
| 2026-07-28 | The approved page frame is now the default for future migration work. | All future migrated pages should inherit the 1200px frame and shared gutters through Monolith page primitives. |
| 2026-07-28 | Sidebar navigation should hide its scrollbar and use compact reference-like rows. | Use hidden nav scrollbars, 40px rows, 15px icons, and lighter 12px nav labels in the shared Monolith sidebar. |
| 2026-07-28 | Metric summary cards should read as one connected element, not loose individual cards. | Use `.mnx-workspace-metrics` with `WorkspaceMetric`; the parent owns the rounded surface and child metrics use internal dividers. |
| 2026-07-28 | Actionable metric/cards need an explicit redirect cue. | Add `href`, `actionLabel`, and `actionIcon` to `WorkspaceMetric` only when the card actually navigates or performs an action. |
| 2026-07-28 | Dashboard personal-pulse cards must also follow the connected summary strip. | Keep `.mnx-dashboard-metrics` as one rounded surface with divided `.mnx-metric-card` cells; only add redirect icons if those cells become links/actions. |
| 2026-07-28 | Plain dashboard metric strips should not use decorative icons. | Keep `.mnx-metric-card` cells text-only with reference-style padding: equal-size light label/detail text, centered numeric value, and a shorter connected strip height. |
| 2026-07-28 | Section headings should use the reference numbered-heading layout. | Use `WorkspaceSectionHeading`: small accent number, large light heading on the left, and muted explanatory paragraph aligned on the right. |
| 2026-07-28 | Section headings should sit outside content containers. | Render `WorkspaceSectionHeading` as a sibling above cards, strips, tables, and surfaces so containers hold only the interactive/content element. |
| 2026-07-28 | Dashboard welcome and attendance should feel like a bespoke command surface, not a generic split card. | Keep the welcome note and attendance actions, restore visible background geometry, and fold work counts into an integrated signal rail rather than separate cards. |
| 2026-07-28 | Dashboard hero should not show grid-like vertical construction lines or loose count cards. | Use a same-height vertical action window that continuously scrolls module actions from top to bottom. |
| 2026-07-28 | Module cards should not rely on colored icon tiles, bitmap backgrounds, or uniform box cards. | Use glassmorphic token-styled SVG graphics related to each module, equal-width cards, equal art/content halves, varied art side placement, monochrome status dots, and softer asymmetric card radii. |
| 2026-07-28 | Workspace page headers can use right-side graphics instead of left icon tiles. | Use the shared `WorkspacePageHeader` `graphic` slot for route-specific hero art; keep the copy and actions readable and hide decorative art on mobile. |
| 2026-07-28 | Hover motion should feel smooth and unhurried across the UI. | Use `--mn-motion-fast: 320ms`, `--mn-motion-panel: 640ms`, and `--mn-ease-standard: cubic-bezier(0.12, 0.86, 0.18, 1)` for shared hover, focus, and interactive surface transitions. |
| 2026-07-28 | Work schedule previews should look like calendar surfaces, not plain task lists. | Use a vertical week calendar with one date-first row per day, shift details in the row body, and a subtle today marker. |
| 2026-07-28 | Theme order should start with Dark/Night, then Violet, Light, and Purple. | Default to `night`, expose the theme picker in `Night -> Violet -> Light -> Purple` order, and persist the user preference in `localStorage.theme`. |
| 2026-07-28 | Purple plus white is now a supported light theme. | Use `html.theme-purple` tokens for purple-on-white surfaces; keep the theme additive to the existing Night, Violet, and Light support. |
| 2026-07-28 | Calendar today highlights should not overlap dotted separators. | Add vertical inset around the highlighted row and suppress the adjacent dotted separators so the rounded current-day pill reads cleanly. |
| 2026-07-28 | Dropdowns should use the branch-selector pattern from the reference. | Use `DropdownSelect` for all new dropdown menus: 54px rounded trigger, simple chevron, floating white menu, 46px rows, and subtle accent highlight on the selected/hovered option. |
| 2026-07-28 | Dashboard team summaries and directories should reuse approved card and heading patterns. | Use the connected metric strip for reportee/attendance counts, and place directory headings outside table containers with `WorkspaceSectionHeading`. |
| 2026-07-28 | Dashboard organization summaries should follow the same dashboard card system. | Place the organization heading outside the tab surface with `WorkspaceSectionHeading`, use the connected metric strip for company counts, and keep signal panels as standard Monolith cards. |

## Update Rule

When a new design decision is requested in this conversation, update both:

- the `/admin/design-system` showcase, if the decision has a visual example;
- this file, with the date, decision, and reuse rule.
