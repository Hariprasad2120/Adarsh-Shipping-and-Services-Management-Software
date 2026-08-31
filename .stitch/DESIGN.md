# DESIGN.md — Monolith Engine Design System (draft v0)

**Status:** draft. Source of truth for production values remains the token section of
`src/app/globals.css` (lines 129–469, `--mn-*` aliases over `--frappe-*`) and
`frappe_docker/design/frappe-ui-design-system.css`. This file is the human-readable spec
Stitch generations must follow; it does **not** introduce a parallel token set.

Principle: **Stitch is the design tool. The `--mn-*` semantic token layer is the production
CSS architecture.** Every Stitch output is translated back to these tokens + canonical
components — never copied as raw CSS.

---

## TYPOGRAPHY

- Family: **Geist Sans** via `--mn-font-sans` (→ `--frappe-font-family`). Mono: `--mn-font-mono`.
- Do not set route-local `font-family` or recreate heading styles with utilities.

| Role | Token | Use |
|---|---|---|
| Display | `--mn-type-display-*` (clamp 2–2.75rem, 600, -0.035em) | rare; one number/hero stat |
| Page heading (h1) | `--mn-type-heading-*` (2xl, 600) | `WorkspacePageHeader` only |
| Section heading | `--mn-type-section-heading-size-{desktop,tablet,mobile}` | `WorkspaceSectionHeading` |
| Panel title | `--mn-type-title-*` (lg) | `WorkspacePanelHeader` |
| Body | `--mn-type-body-*` (base) | default |
| Control | `--mn-type-control-size` (sm) | inputs, buttons |
| Helper | `--mn-type-helper-size` (xs) | field hints |
| Label / eyebrow | `--mn-type-label-*` (2xs, 700, 0.08em, uppercase) | eyebrows, table headers |
| Numeric / stat | `--mn-type-numeric-*` (clamp 1.5–2rem, 600, -0.04em) | metric values only |

Numeric size scale for module CSS: `--mn-font-size-{xs,sm,md,lg,xl,2xl,label}`.

## COLOR — semantic, never raw

Fixed hue meanings **app-wide** (already defined light + dark):

| Hue | Meaning | Glyph/stat token | Wash token | Icon-bg token |
|---|---|---|---|---|
| primary | brand, informational | `--mn-sem-primary` | `--mn-tint-primary` | `--mn-icon-primary-bg` |
| info | informational (cyan) | `--mn-sem-info` | `--mn-tint-info` | `--mn-icon-info-bg` |
| success | in / done / approved | `--mn-sem-success` | `--mn-tint-success` | `--mn-icon-success-bg` |
| warning | pending / not-yet | `--mn-sem-warning` | `--mn-tint-warning` | `--mn-icon-warning-bg` |
| danger | overdue / absent / rejected | `--mn-sem-danger` | `--mn-tint-danger` | `--mn-icon-danger-bg` |
| violet | leave / people | `--mn-sem-violet` | `--mn-tint-violet` | `--mn-icon-violet-bg` |
| orange | holiday / calendar | `--mn-sem-orange` | `--mn-tint-orange` | `--mn-icon-orange-bg` |
| teal | secondary / helpdesk | `--mn-sem-teal` | `--mn-tint-teal` | `--mn-icon-teal-bg` |

Status surface pairs: `--mn-color-{success,warning,danger,info}` + `-surface`.

**No new hex.** globals.css currently carries 174 unique hex values and 548 `!important` — the
migration reduces both. New work adds zero raw color.

## SURFACES

| Token | Role |
|---|---|
| `--mn-color-canvas` | page background (light `--frappe-bg`; dark `#0d1117`) |
| `--mn-color-surface` | card / panel (dark `#111820`) |
| `--mn-color-surface-soft` / `-muted` | nested / recessed |
| `--mn-color-surface-hover` | row/control hover |
| `--mn-color-glass-surface*` | overlays, sticky bars (backdrop `--mn-filter-glass`) |

Dark surfaces are layered grays, never pure black. Separation via `--mn-color-border*`
(`-subtle` / default / `-strong`), not glow.

## SPACING

4px base. `--mn-space-1..10`. Rhythm tokens:
`--mn-layout-workspace-stack-gap` (major sections), `--mn-heading-to-panel-gap`,
`--mn-heading-title-description-gap`. No arbitrary `space-y-*` / `gap-[…]` where a token fits.

## RADIUS

`--mn-radius-control` (sm) · `--mn-radius-panel` (md) · `--mn-radius-feature` (lg).
`--mn-icon-radius` for icon containers. No route-local radii.

## BORDERS

`--mn-color-border` default, `-subtle` for internal dividers, `-strong` for emphasis /
glass edges. 1px. Dark: `#2c3745` / `#222c38` / `#3b485a`.

## SHADOWS

`--mn-shadow-panel` (resting card) · `--mn-shadow-floating` (menus, dialogs) ·
`--mn-shadow-accent{,-soft}`. Do not hand-roll box-shadows.

## ICONS

- `MonolithIcon` contract (`src/components/ui/monolith-icon.tsx`) — rounded outline,
  `currentColor` strokes, token-backed containers.
- lucide-react is the working icon set; @carbon/icons-react also present — **do not mix
  families in one surface**. Standardise on lucide for app chrome.
- Sizes: `--mn-icon-size-{xs,sm,md,lg}`; containers `--mn-icon-surface-size-*`.

## MOTION

`--mn-motion-fast` (interaction feedback) · `--mn-motion-panel` (220ms, panel/expander).
`--mn-ease-standard`. Respect `prefers-reduced-motion`. Movement only on real interactive
surfaces. **Remove**: dashboard celebration burst, action-burst spans, decorative pulse.
three/gsap/framer-motion stay only where a specialised experience needs them.

## DENSITY

Enterprise-dense by default. Table row height compact; metric strips compact; one large
numeric per page max. Progressive disclosure for anything P2 and below.

## FOCUS

Visible focus ring on every interactive element (currently `outline-ring/50` in base layer;
keep token-driven). Modals trap focus, restore on close, Escape closes.

## STATUS COLORS

Map to the hue table above. Badge variants: `default`(primary) · `secondary`(neutral) ·
`success` · `warning` · `destructive`(danger) · `info`. One badge per status, never a
sentence.

## DARK MODE / LIGHT MODE

Three themes: **light**, **night** (dark), **violet** (dark + violet accent). Plus
`[data-accent]` = blue|green|amber|violet (frappe defines a bright dark variant per accent).
Selector chain: `:root` / `html[data-theme]` / legacy `.dark` `.theme-*`. Every token has a
light and a dark definition already. New components must never hardcode a theme-varying color.

## RESPONSIVE BEHAVIOUR

- Page frame: `WorkspacePage`. Current `--mn-layout-page-max: 100%` (full-width; the
  75rem figure in the old doc is stale) with gutters
  `clamp(1.5rem,2.2vw,2.25rem)` desktop / `1.5rem` tablet / `1rem` mobile.
- Breakpoints (verify in `@theme`): tablet ~1024, mobile ~430/390.
- Wide content (tables, statements, kanban) scrolls inside its own `overflow-x:auto`
  container; page body never scrolls horizontally.
- Multi-column layouts collapse to single column at tablet; sidebars become sheets/drawers
  on mobile.

## OPEN QUESTIONS (resolve before Phase 15)

1. One chart library for REPORT/ANALYTICS pattern — current deps have none dedicated
   (three/leaflet only). Pick (Recharts? inline SVG? follow `dataviz` skill).
2. Reconcile deprecated `foundation.tsx` pairs (`MonolithSurface`/`Card`,
   `MonolithBadge`/`Badge`, `MonolithAction`/`Button`) — pick one API each.
3. Fix broken `@import "../styles/dashboard-redesign.css"` in globals.css line 5 (file absent).
4. Decide split strategy for the 21,347-line `monolith-system` section of globals.css.
