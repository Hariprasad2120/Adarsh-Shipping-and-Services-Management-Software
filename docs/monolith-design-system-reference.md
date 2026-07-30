# Monolith design system — canonical production reference

## Source of truth

The administrator route `/admin/design-system` is the visual source of truth for all new and migrated Monolith UI. It is a production port of the read-only v11 reference in:

`_design-reference/Monolith-Design-System-v11-Full-Source-and-Dependencies`

The reference folder remains read-only. The production route must visually match it before any application page is migrated.

## Required visual language

- Font family: Geist Sans through `--font-geist-sans`, with Inter and Segoe UI fallbacks.
- Light palette: Ink `#11120E`, Paper `#F7F7F2`, Signal Yellow `#F9D972`, Soft Yellow `#FCE8A8`, Mist `#E8E9E2`, Slate `#77786F`, Success surface `#E6F3EA`, Danger surface `#FCECEB`.
- Themes: Light, Night, and Violet only for the canonical reference.
- Base spacing unit: 4 px.
- Control radius: 12 px.
- Card radius: 20 px.
- Section gap: 32 px.
- Micro response: 160 ms.
- Expressive/spring response: 640 ms.
- Display typography: 64 px, light weight, -4% tracking.
- Section heading: 32 px, light weight, -3% tracking.
- Body: 15 px / 150% line height.

## Canonical component files

Application pages must import from `@/components/monolith` and reuse these files rather than create route-local alternatives.

### Foundations and shell

- `src/components/monolith/app-shell.tsx` — authenticated sidebar, topbar, search, profile, and theme control.
- `src/components/monolith/foundation.tsx` — page, surface, action, icon action, badge, spec label, and empty-state foundations.
- `src/components/monolith/workspace.tsx` — page header, section heading, connected metrics, panels, fields, actions, badges, alerts, tables, and route states.
- `src/components/monolith/workspace-dialog.tsx` — shared responsive dialog.
- `src/components/monolith/workspace-states.tsx` — shared permission, loading, empty, and error boundaries.

### Actions and feedback

- `src/components/monolith/button.tsx`
- `src/components/monolith/badge.tsx`
- `src/components/monolith/alert.tsx`
- `src/components/monolith/filter-menu.tsx`
- `src/components/monolith/warning-indicator-popover.tsx`
- `src/components/monolith/dropdown-menu.tsx`
- `src/components/monolith/modal.tsx`

### Forms and selection

- `src/components/monolith/input.tsx`
- `src/components/monolith/textarea.tsx`
- `src/components/monolith/label.tsx`
- `src/components/monolith/native-select.tsx`
- `src/components/monolith/dropdown-select.tsx`
- `src/components/monolith/date-input.tsx`
- `src/components/monolith/file-upload-field.tsx`
- `src/components/monolith/neon-checkbox.tsx`

### Data and operational compositions

- `src/components/monolith/card.tsx`
- `src/components/monolith/people-data-table.tsx`
- `src/components/monolith/people-workspace.tsx`
- `src/components/monolith/performance-workspace.tsx`
- `src/components/monolith/cha-workspace.tsx`
- `src/components/monolith/crm-workspace.tsx`
- `src/components/monolith/accounting-workspace.tsx`
- `src/components/monolith/communication-workspace.tsx`
- `src/components/monolith/admin-workspace.tsx`
- `src/components/monolith/public-workspace.tsx`

### Specialized accounting compositions

- `src/components/monolith/accounting-commercial-document-form.tsx`
- `src/components/monolith/accounting-delete-action.tsx`
- `src/components/monolith/accounting-invoice-detail.tsx`
- `src/components/monolith/accounting-invoice-form.tsx`
- `src/components/monolith/accounting-items.tsx`

## Implementation rule

When a required pattern is missing:

1. Add it to `src/components/monolith`.
2. Style it with semantic `--mn-*` tokens in `src/styles/monolith-system.css`.
3. Export it from `src/components/monolith/index.ts`.
4. Add a live specimen to `/admin/design-system`.
5. Only then use it in a module page.

Do not discover an existing button, card, form, table, status, or navigation element and merely restyle its route-local markup. Remove the route-local visual implementation and replace it with the canonical shared component while preserving its behavior, RBAC, validation, server action, and accessibility contract.

## Mandatory page composition

Every migrated authenticated route must use:

- `WorkspacePage`
- `WorkspacePageHeader`
- `WorkspaceSectionHeading` for major sections
- `.mnx-workspace-metrics` with `WorkspaceMetric` for summary metrics
- `WorkspacePanel` for grouped content
- `WorkspaceField` plus canonical controls for forms
- `WorkspaceTable` for operational tables
- shared route states instead of custom loading/empty/error/permission markup

The default page frame remains 1200 px maximum width with the shared responsive gutters. Route-local maximum widths and page padding are prohibited.

## Validation checklist

Before accepting a UI change, compare it against `/admin/design-system` in Light, Night, and Violet at desktop, tablet, and mobile widths. Verify typography, spacing, radii, borders, focus states, hover states, disabled states, feedback states, table density, responsive behavior, keyboard use, and reduced-motion behavior.
