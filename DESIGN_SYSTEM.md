# Monolith Design System

> **Status:** Phase 1 — foundation established, Dashboard is the first production
> implementation. Other routes migrate one page at a time.

The **single source of truth for UI**. Every visual element — surface, type,
spacing, colour, control — is defined once here and consumed by every module.
No page-local card CSS, no random hex, no "slightly different button".

- **Tokens + component CSS:** [`src/styles/ds-tokens.css`](src/styles/ds-tokens.css)
  (record of record). Its exact contents are mirrored into
  [`src/app/globals.css`](src/app/globals.css) between the
  `/* ===== BEGIN src/styles/ds-tokens.css ===== */` markers, because
  `globals.css` is the only stylesheet Next.js loads. **Edit the source file,
  then re-mirror** (a one-line node script — see the file header).
- **React components:** [`src/components/ds/`](src/components/ds), re-exported
  from [`src/components/ds/index.ts`](src/components/ds/index.ts). Import as
  `import { MetricCard, Card } from "@/components/ds"`.
- **Concept:** *"Harbour at dawn"* — steel water, buoy-marker signal,
  weathered brass, fog. Restrained. **Green means good, red means bad;
  nothing else is loud.**

---

## Design tokens

All tokens are CSS custom properties on `:root` (light) with a full override
block for `html[data-theme="dark"]` / `html.dark`. **Always use the semantic
alias, never the raw ramp**, so dark mode flips correctly.

### Surfaces

| Token | Role |
|---|---|
| `--ds-canvas` | page ground (a soft cool grey, never pure white) |
| `--ds-surface` / `--ds-surface-raised` | primary card surface (white / near-white) |
| `--ds-surface-sunken` | secondary tinted-grey surface |
| `--ds-surface-hover` | row / control hover |
| `--ds-surface-selected` | selected row / nav item |

### Dark panel (`--ds-inv-*`)

The charcoal analytics panel is a **design-system surface**, not a theme.
Anything inside `<Card variant="dark">` (class `.ds-panel--dark`) consumes the
inverse token set: `--ds-inv-surface`, `--ds-inv-surface-raised`,
`--ds-inv-border`, `--ds-inv-text`, `--ds-inv-text-muted`, `--ds-inv-pos`
(soft green), `--ds-inv-neg` (soft red), `--ds-inv-accent`. These stay
near-black in **both** themes. Reuse for report panels, exec summaries,
command centers.

### Text

`--ds-text` · `--ds-text-muted` · `--ds-text-subtle` · `--ds-text-disabled`
· `--ds-text-on-accent`

### Borders

`--ds-border-subtle` (default card hairline) · `--ds-border` · `--ds-border-strong`

### Semantic colours

Each has a base and a `-soft` (~10% wash) and `-border` variant:
`--ds-success` · `--ds-warning` (= secondary rust) · `--ds-danger` ·
`--ds-info` (= primary). Brand roles: `--ds-primary` (steel blue — brand,
primary action, links, focus), `--ds-secondary` (rust — sparing signal),
`--ds-tertiary` (brass — accents only, never primary action).

### Chart palette

`--ds-chart-1..5` (series; 1 carries the story), `--ds-chart-pos` /
`--ds-chart-neg` (reserved semantic, never a "series"), `--ds-chart-grid`,
`--ds-chart-axis`, `--ds-chart-track` (muted rail behind a bar),
`--ds-chart-area-from` / `-to` (area-fill gradient stops). **Restrained by
design — the interface is not colourful.**

### Focus

`--ds-focus-ring` — a 2px canvas gap + 2px primary ring. Applied on
`:focus-visible` for every interactive DS element.

### Typography — one family, four roles

`--ds-font-family` (Geist via `next/font`, Inter fallback).

| Role | Class | Use | Size |
|---|---|---|---|
| Display | `.ds-display` `-lg`/`-md`/`-sm` | page / section / card titles; tight `-0.03em`, weight 600 | `clamp(1.75–2.375rem)` / `clamp(1.375–1.75rem)` / `1.125rem` |
| Body | `.ds-body` `-lg`/`-md`/`-sm`, `.ds-body-muted` | prose, labels, cells; `1.55` leading | `1rem` / `0.9375rem` / `0.8125rem` |
| Meta | `.ds-meta` `-sm` | eyebrows, dates, codes, column headers; uppercase, `0.08em`, weight 500 | `0.75rem` / `0.6875rem` |
| Numeric | `--ds-numeric-lg`/`-md` | big KPI values; tabular, tight, **not** uppercase | `clamp(1.75–2.25rem)` / `1.5rem` |

Tabular numbers (`font-variant-numeric: tabular-nums`) on every metric, timer,
and table figure. Do not make everything bold.

### Spacing — a fixed scale

`--ds-space-1..7` = `4 · 8 · 12 · 16 · 24 · 32 · 48` px. No arbitrary values.

### Radius

`--ds-radius-sm` 6px (controls, badges) · `-md` 10px (nested cards) ·
`-lg` 16px (cards, panels) · `-xl` 22px (feature surfaces — the dark panel).

### Elevation

`--ds-shadow-sm` (whisper — default card) · `--ds-shadow-md` (tooltips,
menus). No glow, no strong gradients.

### Motion

`--ds-motion-fast` 120ms · `--ds-motion-base` 200ms · `--ds-ease`
`cubic-bezier(0.2,0,0,1)`. All transitions disabled under
`prefers-reduced-motion: reduce`.

### Icons — one contract

lucide-react, stroke `1.75`. Sizes `--ds-icon-sm` 14 / `-md` 16 / `-lg` 18.

### Breakpoints

`360 · 390 · 430 · 768 · 1024 · 1280 · 1440 · 1920+`. Layout uses CSS Grid +
`minmax()` + `auto-fit`; **no fixed px widths for major layout sections**.
Dashboard analytics grid collapses to one column at `≤1024px`; cards drop a
padding step and the attention row reflows at `≤480px`.

---

## Components

Import from `@/components/ds`. **Prefer a `variant`/`tone`/`direction` prop
over a new component.** Business data always enters via props — a component
never knows it is "the dashboard card".

| Component | Props (key) | What it is |
|---|---|---|
| **`Card`** | `variant` `default`/`subtle`/`outlined`/`dark`, `pad`, `as` | the structural primitive — every boxed surface. `dark` = the charcoal panel. |
| **`SectionHeader`** | `title`, `description`, `actions`, `headingLevel` | title + optional right actions; inherits colour (works in a dark panel). |
| **`MetricCard`** | `label`, `value`, `unit`, `trend`, `caption`, `icon`, `boxed`, `variant` | one KPI: muted label · delta pill · big tabular value · caption. |
| **`StatGrid`** | `cols` `3`/`4` | responsive `auto-fit` row of MetricCards. |
| **`StatusBadge`** | `tone`, `icon` | state pill; **text carries meaning, never colour alone**. |
| **`TrendBadge`** | `direction` `up`/`down`/`flat`, `value`, `srLabel` | delta pill — arrow **and** colour encode direction; `srLabel` for AT. |
| **`DataTable`** | `columns`, `rows`, `getRowKey`, `rowHref`, `loading`, `error`, `emptyTitle`, `footer` | the one responsive table architecture. Inline loading / empty / error, click-to-navigate rows, right/centre align, two-line `DataTableCell`. Overflow contained to the table. |
| **`ChartCard`** | `title`, `description`, `actions`, `height`, `loading`, `error`, `isEmpty` | titled Card that owns a chart's states so the chart body never has to. |
| **`TrendArea`** | `data` `{label,value}[]`, `valueFormatter`, `height` | primary trend (recharts area). Muted axes, few gridlines, token colour, container-responsive, survives a zero-only series. |
| **`FunnelBars`** | `stages` `{id,label,value}[]`, `filler` | the dark-panel pipeline / conversion chart. Proportional bars, marked checkpoints in the positive hue with %/label/count. Empty state on zero entry. |
| **`AttentionList`** | `items`, `totalCount`, `moreHref`, `healthyLabel` | severity-railed queue of records-needing-action; renders an "all clear" state when empty. |
| **`QuickActions`** | `actions` `{label,href,icon}[]` | compact grid of shortcut links — only ever fed real permitted routes. |
| **`DefinitionList`** | `items` `{term,description}[]` | label/number rows (the dark-panel "signals" readout). |
| **`FilterBar`** | `align` | right-aligned control cluster; wraps on small screens. |
| **`Select`** | `options`, `label`, `icon` | native `<select>` with DS chrome — no clipping, accessible. |
| **`DateRangeSelect`** | `value`, `onChange` | preset range picker (`24h`/`7d`/`30d`/`90d`) on `Select`. |
| **`LoadingState` / `EmptyState` / `ErrorState` / `PermissionState`** | `title`, `description`, `action` | the four data states. Inherit colour (dark-panel aware). |
| **`Skeleton`** | `width`, `height`, `radius` | one shimmer placeholder; compose to pre-shape a loading card. |
| **`WelcomeNote`** | `title`, `eyebrow`, `message`, `actions`, `trailing` | page-intro band; `trailing` slot carries a PunchCard / date chip. |
| **`PunchCard`** | `status`, `since`, `loading`, `onPunch` | attendance control (HRMS-specific logic; DS chrome). |
| **`DsButton` / `DsButtonLink`** | `variant` `primary`/`secondary`/`outlined`/`inverted`/`ghost`, `size` | the button. One `primary` per view. |
| **`DsIcon` / `DsDisplay` / `DsBody` / `DsMeta`** | — | primitive icon + typography wrappers. |

### Every data component handles all states

Loading · Success · Empty · Error · Unauthorized. **Never a blank white card
while a request loads** — `DataTable`, `ChartCard`, `AttentionList`,
`FunnelBars` all render a state block or skeleton.

### Accessibility baseline

Semantic HTML · visible `:focus-visible` ring on every control · `sr-only`
labels on icon-only controls and table captions · `role="list"` on the
attention queue · click-rows are `tabIndex=0` + Enter-activatable ·
`role="status"`/`role="alert"` on loading/error · direction encoded by arrow
**and** colour, never colour alone · targets ≥ comfortable touch size on
mobile.

---

## Component ledger — USED BY / intended for

Every component established in Phase 1, so future developers **extend, never
recreate**:

| Component | Used by (today) | Intended next |
|---|---|---|
| `Card` (all variants) | Dashboard | CRM, CHA, Accounts, HR, Payroll, Projects, Inventory, Documents, Reports, Settings — everywhere |
| `MetricCard` / `StatGrid` | Dashboard (module pulse KPIs) | Accounts (AR/AP, collections), CRM (pipeline value, win rate), HR (headcount, attrition), CHA (jobs, clearance TAT), Payroll (run totals), Inventory (stock value, low-stock) |
| `TrendBadge` / `StatusBadge` | Dashboard | every list/table status cell, every KPI delta, workflow badges |
| `DataTable` / `DataTableCell` | Dashboard (recent work) | all module list views — jobs, leads, invoices, employees, shipments, documents |
| `ChartCard` / `TrendArea` | Dashboard (activity volume) | Accounts (cashflow), CRM (pipeline over time), HR (attendance trend), Reports |
| `Card variant="dark"` + `FunnelBars` + `DefinitionList` | Dashboard (appraisal pipeline + attendance signals) | CRM conversion funnel, CHA job-lifecycle panel, exec/report summary panels |
| `AttentionList` | Dashboard (requires attention) | CHA (delayed jobs, missing docs), Accounts (overdue invoices), HR (expiring documents), CRM (stale leads) |
| `QuickActions` | Dashboard | every module landing surface |
| `FilterBar` / `Select` / `DateRangeSelect` | Dashboard | every list/report page header |
| `SectionHeader` | Dashboard | every Card and page section app-wide |
| State blocks / `Skeleton` | Dashboard, dashboard `error.tsx` | every async surface app-wide |
| `WelcomeNote` / `PunchCard` | Dashboard "My space" | WelcomeNote → every page header; PunchCard → HRMS/attendance only |

---

## No page-specific CSS drift

Future pages **must not** introduce `employee-card.css`, `invoice-card.css`,
etc. for components that are visually identical. Use `<Card>`, `<MetricCard>`,
`<StatusBadge>`, `<DataTable>`. Page-level CSS controls **composition only**
(the grid); component appearance belongs to the component.

## Migration model (per future page)

1. Audit current page · 2. Identify business functionality · 3. Map UI to DS
components · 4. Extend DS **only** for a genuinely new pattern · 5. Build the
generic component · 6. Replace old page UI · 7. Preserve business logic ·
8. Test responsive (all 8 widths) · 9. Test a11y · 10. Remove obsolete
page-local CSS **after verifying nothing depends on it** · 11. Update this
file · 12. Next page only after approval.

## Legacy status

Four style systems currently coexist: `frappe-ui`, `shadcn`, `tw-animate`,
and this `--ds-*` layer. **Strategy:** build the `--ds-*` equivalent
side-by-side; delete a legacy component / CSS block **only** once its
replacement exists and no route references it. Phase 1 removed the orphaned
`.mnx-dash2-*` dashboard-overview rules (replaced by `.ds-*` + DS components);
`.mnx-dash2-tabs` is retained for the Team/Organization tab strip until those
surfaces migrate.
