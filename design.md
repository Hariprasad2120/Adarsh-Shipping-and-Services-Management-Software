# Design System — Monolith Engine

> **Authoritative specification.** All AI agents, code reviewers, and contributors MUST read this file before creating, editing, or reviewing frontend UI.

---

## 1. Design Principles

1. **One system, every module.** Dashboard, CRM, HRMS, Attendance, AMS, CHA, Accounting — all share the same tokens and components. No module-specific CSS wrappers.
2. **Semantic tokens first.** Use CSS custom properties (`var(--color-*)`) and Tailwind utilities backed by those tokens. Never hard-code hex colors when a token exists.
3. **Dark and light.** Every page must work in both themes. Tokens auto-switch; hard-coded values do not.
4. **Reuse before creating.** Check `src/components/ui/` before building a new primitive. Duplicate Button, Card, Input, or Badge components are forbidden.
5. **Cyan is action. Orange is alert.** The brand accent `#00cec4` is for interactive/primary elements. Orange `#fb923c` is for warnings and secondary data. Never combine both on the same element.

---

## 1.1 CHA Workflow Notes

- CHA jobs move from Document Collection to Additional Data before Checklist Preparation.
- Additional Data captures Vessel Inward Date, IGM, EGM, and Delivery Order Validity; all four fields are required before checklist import is available.
- Delivery Order Validity warnings use orange alert treatment in the persistent dashboard header when expiry is within four calendar days, and destructive treatment only for expired status labels.

---

## 2. Token Source Files

| File | Role |
|---|---|
| `src/app/globals.css` | CSS custom properties (`:root`, `html.dark`, `html.light`), `@theme inline` Tailwind bridge, design-system utility classes, theme compliance overrides |
| `src/lib/design-tokens.ts` | TypeScript exports for inline styles — `colors`, `radius`, `fontSize`, `shadows`, `fonts`, `statTones`, `status` |
| `src/app/layout.tsx` | Font loading: Geist Sans, Kiona Sans, Geist Mono |

---

## 3. Color Tokens

### 3.1 Brand Accent

| Token | Value | Use |
|---|---|---|
| Accent | `#00cec4` | Primary buttons, active states, borders, focus rings, accent bars, icon tint |
| Accent hover | `#00b8af` | Hover state for cyan buttons |
| Accent subtle | `rgba(0, 206, 196, 0.10)` | Icon badge backgrounds, stat card icon containers |
| Orange | `#fb923c` | Alert states, warning data, secondary stat cards |

### 3.2 Surface Hierarchy

| Token | CSS Variable | Light | Dark | Use |
|---|---|---|---|---|
| Background | `--background` | `#f7f9fb` | `#0d1117` | Page background |
| Surface | `--color-surface` | `#ffffff` | `#161b22` | Card backgrounds, panels |
| Surface Container Low | `--color-surface-container-low` | `#f2f4f6` | `#161b22` | Secondary panels, modal headers |
| Surface Container | `--color-surface-container` | `#eceef0` | `#21262d` | Table headers, code backgrounds |
| Surface Container High | `--color-surface-container-high` | `#e6e8ea` | `#30363d` | Elevated surfaces |
| Surface Container Highest | `--color-surface-container-highest` | `#e0e3e5` | `#3b4252` | Maximum elevation |
| Surface Dim | `--color-surface-dim` | `#d8dadc` | `#0d1117` | Dimmed surfaces |
| Surface Bright | `--color-surface-bright` | `#ffffff` | `#21262d` | Bright surfaces |

### 3.3 Text & Icon Colors

| Token | CSS Variable | Light | Dark | Use |
|---|---|---|---|---|
| On Surface | `--color-on-surface` | `#191c1e` | `#f0f6fc` | Primary text, headings, data |
| On Surface Variant | `--color-on-surface-variant` | `#404947` | `#8b949e` | Secondary text, labels, captions |
| Placeholder | `--color-placeholder` | `#8a919d` | `#96a0ad` | Input placeholder text |
| Foreground | `--foreground` | `#191c1e` | `#f0f6fc` | Body text (alias for on-surface) |

### 3.4 Border & Outline Colors

| Token | CSS Variable | Light | Dark | Use |
|---|---|---|---|---|
| Outline | `--color-outline` | `#707977` | `#30363d` | Strong borders, dividers |
| Outline Variant | `--color-outline-variant` | `#bfc8c6` | `#21262d` | Subtle borders, card edges |
| Cyan border | Hard-coded | `rgba(0, 206, 196, 0.55)` | Same | Input borders (applied globally in `<main>`) |
| Cyan focus ring | Hard-coded | `0 0 0 3px rgba(14, 137, 149, 0.14)` | Same | Input focus state |

### 3.5 Primary / Secondary / Tertiary (Material 3 style)

| Role | Light | Dark |
|---|---|---|
| Primary | `#003631` | `#00c4b6` |
| On Primary | `#ffffff` | `#0f1319` |
| Primary Container | `#134e48` | `#161f28` |
| Secondary | `#0051d5` | `#38bdf8` |
| Tertiary | `#4b2500` | `#fb923c` |

These are registered in the `@theme inline` block and available as `bg-primary`, `text-on-primary`, etc.

### 3.6 Module Identity Colors (nav/sidebar only)

| Module | Color | Use |
|---|---|---|
| Dashboard | `#00c4b6` | Sidebar active indicator, nav icon |
| HRMS | `#818cf8` | Sidebar active indicator, nav icon |
| Attendance | `#fbbf24` | Sidebar active indicator, nav icon |
| To-Do | `#22c55e` | Sidebar active indicator, nav icon |
| AMS | `#c084fc` | Sidebar active indicator, nav icon |
| Admin | `#8b5cf6` | Sidebar active indicator, nav icon |
| CRM | `#38bdf8` | Sidebar active indicator, nav icon |

> These colors are for navigation elements ONLY. Do not use them for buttons, body text, or content areas.

### 3.7 Semantic Status Colors (AMS appraisal stages)

| Stage | Background | Text | Border |
|---|---|---|---|
| Due Notified | `#fefce8` | `#a16207` | `#fde68a` |
| Reviewers Assigned | `#eff6ff` | `#1d4ed8` | `#bfdbfe` |
| Self Assessment | `#faf5ff` | `#7e22ce` | `#e9d5ff` |
| Reviewer Rating | `#eef2ff` | `#4338ca` | `#c7d2fe` |
| Management Review | `#fff7ed` | `#c2410c` | `#fed7aa` |
| Meeting Pending | `#ecfeff` | `#0e7490` | `#a5f3fc` |
| Meeting Live | `#f0fdf4` | `#15803d` | `#bbf7d0` |
| Hike Finalisation | `#fdf2f8` | `#be185d` | `#f9a8d4` |
| Closed | `#f3f4f6` | `#6b7280` | `#e5e7eb` |

These are defined in `design-tokens.ts` under `colors.status` and are approved exceptions to the "no hard-coded colors" rule.

---

## 4. Typography

### 4.1 Font Families

| Role | CSS Variable | Font | Loaded In |
|---|---|---|---|
| Body / Sans | `--font-geist-sans` | Geist Sans | `layout.tsx` via `next/font/google` |
| Display / Headings | `--font-kiona-sans` | Kiona Sans | `layout.tsx` via `next/font/local` |
| Mono / Numeric | `--font-geist-mono` | Geist Mono | `layout.tsx` via `next/font/google` |

> **Important:** The `@theme inline` block maps `--font-sans` and `--font-display` to `var(--font-geist-sans)`. The Kiona display font is available via `var(--font-kiona-sans)` directly. The `.ds-h*` heading classes use `var(--font-display)` which currently resolves to Geist Sans. For Kiona headings, use `font-family: var(--font-kiona-sans)` explicitly or apply it via `design-tokens.ts` → `fonts.display`.

### 4.2 Font Size Scale

| Token | CSS Variable | Value |
|---|---|---|
| xs | `--text-xs` | 10px |
| sm | `--text-sm` | 12px |
| base | `--text-base` | 14px (body default) |
| md | `--text-md` | 15px |
| lg | `--text-lg` | 16px |
| xl | `--text-xl` | 18px |
| 2xl | `--text-2xl` | 20px |
| 3xl | `--text-3xl` | 24px |
| 4xl | `--text-4xl` | 30px |

### 4.3 Typography Utility Classes

| Class | Font | Size | Weight | Tracking | Transform |
|---|---|---|---|---|---|
| `.ds-h1` | `var(--font-display)` | 24px (`--text-3xl`) | Inherited | -0.015em | UPPERCASE |
| `.ds-h2` | `var(--font-display)` | 20px (`--text-2xl`) | Inherited | -0.015em | UPPERCASE |
| `.ds-h3` | `var(--font-display)` | 18px (`--text-xl`) | Inherited | -0.01em | UPPERCASE |
| `.ds-label` | Inherited | 10px (`--text-xs`) | 400 | 0.12em | UPPERCASE |
| `.ds-numeric` | `var(--font-mono)` | Inherited | 400 | — | tabular-nums, slashed-zero |

### 4.4 Font-Weight Rules

- Body text: `400` (default, no override needed)
- Headings (`.ds-h*`): No explicit `font-weight` set — inherits from context
- Numeric (`.ds-numeric`): `400 !important`
- Labels (`.ds-label`): `400`
- Buttons: `500` (medium, set in button component)

---

## 5. Spacing, Radius, and Shadow

### 5.1 Border Radius Scale

| Token | CSS Variable | Value | Use |
|---|---|---|---|
| sm | `--radius-sm` | 6px | Small elements, checkboxes |
| md | `--radius-md` | 8px | Buttons, tags |
| lg | `--radius-lg` | 10px | Input fields alternate |
| xl | `--radius-xl` | 12px | Cards, inputs, modals (primary radius) |
| 2xl | `--radius-2xl` | 16px | Large cards |
| 3xl | `--radius-3xl` | 20px | Panels |
| card-lg | `--radius-card-lg` | 24px | Stat cards, featured panels |
| full | `--radius-full` | 9999px | Badges, avatars, pills |

### 5.2 Shadow Scale

| Token | CSS Variable | Value (light) | Use |
|---|---|---|---|
| ambient | `--shadow-ambient` | `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` | Default card shadow |
| ambient-hover | `--shadow-ambient-hover` | `0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)` | Hover elevation |
| card | TS only | `0 14px 28px -24px rgba(0,0,0,0.12)` | Stat card shadow |
| card-hover | TS only | `0 20px 36px -20px rgba(0,0,0,0.16)` | Stat card hover |

Dark mode has its own shadow values (more contrast). See `globals.css` `html.dark` block.

---

## 6. Shared Components

### 6.1 Button — `src/components/ui/button.tsx`

Re-exports from `button-1.tsx`. Import from either path.

The canonical button look is the neon treatment (adopted app-wide 2026-07-06, confirmed after review):

| Variant | Appearance |
|---|---|
| `default` | Cyan `#00cec4` bg + cyan border, white text; hover `#00b8af` + cyan neon glow `0 0 16px rgba(0,206,196,.5), 0 0 5px rgba(0,206,196,.3)` + `neon-pulse-approve` pulse |
| `outline` | Surface bg, cyan `#00cec4/45` border, cyan text; hover: full-cyan border, no fill tint, glow `0 0 12px rgba(0,206,196,.3)` |
| `destructive` | Red `#ef4444` bg + red border, white text; hover `#dc2626` + red glow + `neon-pulse-reject` pulse |
| `inverse` | Transparent bg, current text color, hover black/10 |
| `disabled` | `opacity-50` + `pointer-events-none` (any variant) |

Implementation note:
- Shared `Button` renders `data-variant`, `data-size`, and `data-mode` attributes. Global CHA styling in `globals.css` must target these attributes instead of inferring button role from utility-class substrings, otherwise tinted `outline` buttons can be incorrectly promoted to solid fills.

**Hover motion (applies to ALL buttons, every variant and extension):** buttons lift `translateY(-1px)` on hover, return to `translateY(0)` and compress to `scale(0.96)` on press. This is baked into the shared Button base classes (`hover:-translate-y-px active:translate-y-0 active:scale-[0.96]`, `transition-all duration-200`) and mirrored by the `.cha-module` cascade — do not remove it or override it per-button.

| Size | Height |
|---|---|
| `sm` | 32px (`h-8`) |
| `md` | 40px (`h-10`) |
| `lg` | 44px (`h-11`) |

| Mode | Behavior |
|---|---|
| `default` | Normal button with padding |
| `icon` | Square aspect ratio, no horizontal padding |

```tsx
import { Button } from "@/components/ui/button";

<Button variant="default">Save</Button>
<Button variant="outline" size="sm">Cancel</Button>
<Button variant="default" mode="icon"><Settings size={16} /></Button>
```

#### 6.1.1 CHA-approved button extensions (review decisions, 2026-07-05)

These two patterns are **sanctioned CHA defaults** — reuse them as-is; do not invent new variants of the same role.

| Pattern | Recipe | Use |
|---|---|---|
| **Orange outline (warning-state action)** | `<Button variant="outline" className="border-[#fb923c]/50 text-[#fb923c] hover:bg-surface">` | Actions that toggle/clear a warning state (Mark All N/A, Assign Manager, Deactivate Section 49). Orange neon hover keeps border/text orange with no tint fill; lifts `-1px` on hover like every button (§6.1). |
| **Tonal tinted (severity popover actions)** | `<Button size="sm" className="flex-1 border {tone}/25 bg-{tone}/12 text-{tone} hover:bg-{tone}/18">` where tone ∈ red-500 · `#fb923c` · orange-500 · `#00cec4` · outline-variant (neutral) | Action rows inside warning-indicator popovers. **Size, padding and text size come from `size="sm"` (h-8, px-3, 12px)** — never override with `h-8`/`h-7`/`text-xs`. Tint colors are the approved part; geometry stays standard. |

> History: the neon look + universal hover lift was adopted 2026-07-06, briefly reverted by mistake the same day, then **restored and confirmed as final** (see §16). The neon treatment above IS the design system for buttons.

#### 6.1.2 Button-adjacent patterns (canonical, 2026-07-06)

| Pattern | Recipe | Rules |
|---|---|---|
| **Upload dropzone** | `flex w-full cursor-pointer items-center gap-2 rounded-xl border border-dashed border-outline-variant/50 bg-surface px-4 py-3 text-sm text-on-surface-variant transition hover:border-[#00cec4]/60 hover:bg-surface-container-low/40` | The ONE dropzone recipe (button or label). Untinted `bg-surface` at rest (2026-07-07 review); neutral dashed border that turns cyan on hover. No `rounded-2xl`, no per-screen variants. |
| **Text-link button** | `className="ds-plain cha-link …"` + own size/weight classes (`button.cha-link` in `globals.css`) | ADOPTED 2026-07-07: no background fill, cyan text `#00cec4` (hover `#00b8af` + underline), **neon hover animation kept** (`neon-pulse-approve` glow + `translateY(-1px)` lift, `scale(0.96)` press). `ds-plain` is mandatory so the button cascade never fills them. Orange/green semantic links (Raise Query, Acknowledge Receipt, etc.) keep their own colors and are NOT converted. |
| **Minimum size** | `size="sm"` (h-8 / 32px, 12px text) | Smallest sanctioned button. No `h-7`, no `h-8 text-xs py-1` overrides — geometry comes from the size token only. |
| **`.ds-plain` opt-out** | Add `ds-plain` as the first class on any `<button>` that must NOT be neon (dashed dropzone buttons, quick-action tiles) | The `.cha-module` neon cascade excludes `button.ds-plain` (`:not(.ds-plain)` on every button selector). Without it, the cascade's `[class*=…]` matching force-restyles tile-style buttons into solid neon buttons. (Text-link buttons deliberately do NOT carry it — reverted to original cascade behavior 2026-07-07.) |

Canonical implementation:

```tsx
import { FileUploadField } from "@/components/ui/file-upload-field";

<FileUploadField
  id="supporting-file"
  helperText="Accepted formats depend on the workflow."
  triggerText="Drag and drop or choose file to upload"
/>
```

Use `src/components/ui/file-upload-field.tsx` as the default upload primitive across documents, checklist, additional-data, and modal flows. Use `compact` for inline card uploads; use the default layout for primary upload forms with selected-file preview.

### 6.2 Card — `src/components/ui/card.tsx`

| Export | Use |
|---|---|
| `Card` | Container: `rounded-xl`, `border-outline-variant/60`, `bg-surface`, `shadow-sm` |
| `CardHeader` | Top section with padding |
| `CardContent` | Body section with spacing |
| `CardTitle` | `<h3>` with `.ds-h3` |

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
```

### 6.3 Badge — `src/components/ui/badge.tsx`

Standard semantic pill for statuses, priorities, and compact labels. Geometry: `rounded-full`, `px-2.5 py-1`, `text-[10px]`, lighter `font-medium`, and expanded tracking (`0.14em`).

| Variant | Colors |
|---|---|
| `default` | Indigo 50 bg, indigo 700 text |
| `secondary` | Surface container high bg, on-surface-variant text |
| `success` | Green 50 bg, green 700 text |
| `warning` | Amber 50 bg, amber 700 text |
| `destructive` | Red tint bg, red 700 text in light / red 200 in dark |

CHA mapping contract:
- Stages: `FILING` → `default`, `CHECKLIST_APPROVAL` → `warning`, `FILED` → `success`, all other neutral stages → `secondary`
- Priority: `HIGH` → `destructive`, `MEDIUM` → `warning`, `LOW` → `secondary`
- Document states: `UPLOADED` / `RECEIPT_ACKNOWLEDGED` → `success`, `QUERY_RAISED` → `warning`, `MANDATORY` → `destructive`, `NOT_AVAILABLE` and pending-style neutral states → `secondary`

Text-color rule:
- Solid destructive CTA buttons may use white text on solid red fills.
- Tinted destructive badges, chips, and red alpha panels must keep red text for readability; global CSS must not force them to white.

### 6.4 Input — `src/components/ui/input.tsx`

Standard single-line text field with cyan border. Height 44px (`h-11`), `rounded-xl`, `px-4 py-2.5`.

> **Field geometry contract:** `Input`, `DateInput`, and `DropdownSelect` are the canonical single-line form controls and must share the same visible geometry: `h-11`, `rounded-xl`, and matching horizontal padding. Do not render field-like controls as solid CTA buttons.

> **Note:** Global CSS in `globals.css` also auto-styles all `<input>`, `<select>`, `<textarea>` inside `<main>` with cyan borders and focus rings. You do NOT need extra classes for basic form inputs.

### 6.5 Modal — `src/components/ui/modal.tsx`

Props: `open`, `title`, `description?`, `onClose`, `children`, `className?`

### 6.6 Alert — `src/components/ui/alert.tsx`

CVA-based with 7 variants × 4 appearances × 3 sizes. Imports Button from `button-1.tsx`.

### 6.7 DropdownMenu — `src/components/ui/dropdown-menu.tsx`

Radix-based. Exports: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuLabel`, and more.

### 6.8 DropdownSelect — `src/components/ui/dropdown-select.tsx`

Controlled/uncontrolled select built on DropdownMenu. It is an outlined, surface-backed field trigger with the same geometry as `Input` (`h-11`, `rounded-xl`, shared padding), not a solid action button.

> **Compact exception:** Embedded selectors inside dense list/card rows may opt into a compact trigger such as `h-8` via `triggerClassName`, but this is a deliberate local exception for sub-row controls, not the default form-field size.

### 6.9 FilterMenu — `src/components/ui/filter-menu.tsx`

Filter button with active count badge + dropdown content.

### 6.10 Label — `src/components/ui/label.tsx`

Form label: `text-sm`, `font-medium`, `text-on-surface`.

---

## 7. Design-System CSS Classes

| Class | Effect | Use |
|---|---|---|
| `.ds-h1` | 24px uppercase heading | Page titles |
| `.ds-h2` | 20px uppercase heading | Section titles |
| `.ds-h3` | 18px uppercase heading | Card/panel titles |
| `.ds-label` | 10px uppercase, muted color | Table headers, form labels |
| `.ds-numeric` | Geist Mono, tabular-nums | Numbers, money, stats |
| `.ds-icon-badge` | 36×36 frosted glass icon container | Stat cards, feature icons |
| `.ds-form-section` | Auto-prepends 3px cyan bar to child h2/h3/h4 | Form section groupings |
| `.ds-table` | Full-width table with styled th/td | Data tables |
| `.ds-row-link` | Clickable row with cyan hover | Table rows that navigate |
| `.hover-cyan` | Cyan glow on hover | Cards, list items |
| `.ds-shell-lg` | `border-radius: 24px` | Modal outer shell |
| `.ds-dark-banner` | Preserves white text in light mode | Dark-background hero sections |
| `.card-cyan-outline` | Thin cyan outline border | Workspace cards, data-entry panels, highlighted information cards |
| `.card-top-accent` | Cyan inset shadow top | Primary stat cards |
| `.card-top-accent-orange` | Orange inset shadow top | Alert/secondary stat cards |
| `.card-left-accent` | 3px cyan left border | Detail rows, list items |
| `.card-left-accent-orange` | 3px orange left border | Alert detail rows |
| `.cyan-range-slider` | Styled range thumb | Range inputs |
| `.animate-page-enter` | Slide-in-from-right animation | Page transitions |

---

### 7.1 Canonical Table Implementation

Tables must follow this exact wrapper hierarchy for visible rounded corners, proper clipping, and theme compatibility:

```tsx
{/* Outer shell: provides rounded corners, clipping, border, and background */}
<div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
  
  {/* Optional: Toolbar section */}
  <div className="p-4 border-b border-outline-variant">
    {/* Search, filters, actions */}
  </div>
  
  {/* Scroll wrapper: horizontal scrolling on narrow viewports */}
  <div className="overflow-x-auto">
    <table className="ds-table">
      <thead>
        <tr>
          <th className="px-6 py-3">Column Header</th>
        </tr>
      </thead>
      <tbody>
        <tr className="ds-row-link">
          <td className="px-6 py-4">Cell data</td>
        </tr>
      </tbody>
    </table>
  </div>
  
  {/* Optional: Pagination (inside the shell) */}
</div>
```

**Rules:**
- **Border radius** belongs on the outer `overflow-hidden` container — never on `<table>` directly
- **`overflow-x-auto`** goes on the inner scroll wrapper — not on the clipping container
- **`ds-table`** uses `border-separate` + `border-spacing: 0` — never use `border-collapse`
- **`ds-table th`** has `background-color: var(--color-surface-container-low)` — provides subtle header distinction
- **Last row** has `border-bottom: none` — prevents double border with container
- **Ordinary data cells** use `font-weight: 400` — only name/identifier columns use `font-medium`
- **Row separators** use `var(--color-outline-variant)` — never hard-coded hex borders
- **Do not** use `divide-y` on `<tbody>` — the `ds-table td` border-bottom handles separation
- **Do not** add `bg-[#0f1319]` or other hard-coded backgrounds — use `bg-surface`

---

### 7.2 Canonical Panel Recipes (2026-07-06)

Two panel roles, one recipe each — no radius drift, no border/bg opacity permutations:

| Role | Recipe | Notes |
|---|---|---|
| **Section panel** (card on page background) | `rounded-xl border border-outline-variant/60 bg-surface shadow-sm` + local padding (`p-4`–`p-6`) | Matches the shared `Card`. Applies to ALL panels on a page background — report panels, approval queues, filter bars, workspace sections, the workflow-builder shell, nested `bg-surface` sub-panels. No `rounded-2xl`/`rounded-3xl` exceptions. |
| **Inset panel** (nested inside a section panel) | `rounded-xl border border-outline-variant bg-surface-container-low` + local padding | Full `outline-variant` token (already subtle) and solid `surface-container-low` — never `/25 /30 /35 /40` border steps or `/20 /35 /40 /50` bg opacities. |

Settings tiles follow the same rules: non-interactive info/health tiles use the section-panel recipe (neutral border — cyan borders are for interactive elements only); interactive quick-action rows use the section-panel recipe + `card-left-accent hover-cyan`.

Approved accent variant:
- Workspace section panels that need light emphasis without a full left rail may add `card-top-accent` on top of the section-panel recipe. This keeps the standard thin border while adding the 2px cyan inset top line used in CHA Additional Data cards.
- Cyan-outlined cards may add `card-cyan-outline` on top of the base border utility to apply a thin `rgba(0, 206, 196, 0.35)` border, matching the approved document-card border treatment used in CHA workspaces.

---

## 8. Stat Card Tones

Defined in `design-tokens.ts` under `statTones`:

| Tone | Icon BG | Icon Text | Accent |
|---|---|---|---|
| teal | `bg-[#00cec4]/10` | `text-[#00857e]` | `#00cec4` |
| blue | `bg-blue-50` | `text-blue-600` | `#3b82f6` |
| amber | `bg-amber-50` | `text-amber-600` | `#f59e0b` |
| violet | `bg-violet-50` | `text-violet-600` | `#8a52ff` |
| green | `bg-green-50` | `text-green-600` | `#22c55e` |
| slate | `bg-slate-100` | `text-slate-500` | `#94a3b8` |

These are approved exceptions to the "no Tailwind color" rule.

---

## 9. Theme Compliance Overrides

`globals.css` contains safety overrides that remap legacy Tailwind classes to design-system tokens in both themes. These exist because some older pages use `text-slate-*`, `bg-white`, `bg-gray-*`, etc. The overrides ensure these render correctly in both light and dark mode.

**You should NOT rely on these overrides for new code.** Use semantic tokens directly:

| Instead of | Use |
|---|---|
| `text-gray-900` / `text-slate-200` | `text-on-surface` |
| `text-gray-500` / `text-slate-400` | `text-on-surface-variant` |
| `bg-white` | `bg-surface` |
| `bg-gray-50` / `bg-slate-100` | `bg-surface-container-low` |
| `border-gray-200` | `border-outline-variant` |

---

## 10. Responsive Layout Rules

- Mobile breakpoint: `640px` (Tailwind `sm:`)
- Tablet breakpoint: `768px` (Tailwind `md:`)
- Desktop breakpoint: `1024px` (Tailwind `lg:`)
- Use CSS Grid or Flexbox for layouts
- Stat card grids: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Form grids: `grid-cols-1 sm:grid-cols-2`
- Table layouts: Full-width, horizontal scroll on mobile

### 10.1 Page Shell (DashboardShell)

All dashboard pages are wrapped by `DashboardShell` (`src/app/(dashboard)/_components/dashboard-shell.tsx`). It provides:
- `WelcomeBar` (top bar with search, date, theme toggle)
- `AutoBreadcrumb` (for non-CRM, non-portal routes)
- Consistent padding: `px-6 py-8 lg:px-8 xl:px-10`
- Scroll container: `overflow-y-auto` on a flex-1 wrapper

**Rules:**
- **Never add `p-8`, `px-6 py-8`, or equivalent outer padding** to page-level components — the shell provides it.
- **Never bypass the shell** by rendering outside the dashboard layout.
- If a component needs full-width (no padding), it must use negative margins or be moved above the padding wrapper.

---

## 11. Accessibility & Contrast

- All text on `surface` must use `on-surface` or `on-surface-variant` for minimum 4.5:1 contrast
- Focus states must use visible ring (cyan glow for inputs, or outline for buttons)
- All interactive elements must have `aria-label` or visible text
- Disabled states: `opacity-50` + `pointer-events-none`
- Loading states: Use skeleton or spinner, never empty containers

---

## 12. Rules — What NOT to Do

1. **No module-specific theme wrappers** — no `.crm-theme`, `.hrms-theme`, etc.
2. **No raw Tailwind slate/gray colors** in new code — use semantic tokens
3. **No gray borders on inputs** — inputs in `<main>` get cyan borders automatically
4. **No colored backgrounds on buttons** except cyan (`#00cec4`) for primary and red for destructive
5. **No duplicate components** — do not create another Button, Card, Input, or Badge
6. **No lowercase headings** — all `.ds-h*` classes enforce UPPERCASE
7. **No arbitrary hex colors** when a token exists
8. **No arbitrary pixel values** when a radius/size token exists
9. **No light-only backgrounds** — never use `bg-white`, `bg-[#ffffff]`, or light hex backgrounds without ensuring dark-mode compatibility. Use `bg-surface`, `bg-surface-container-low`, etc.
10. **No light-only text colors** — never use `text-slate-900`, `text-gray-900`, or dark hex text without dark-mode fallbacks. Use `text-on-surface`, `text-on-surface-variant`, etc.
11. **No page-level padding** — `DashboardShell` provides all outer padding. Do not add `p-8` or similar to the root element of a page component.
12. **Test both themes** — every new page or component must be verified in both light and dark mode before completion.

---

## 13. Introducing New Tokens or Components

1. Document the gap in a PR description or agent response
2. Propose the token name, value, and use case
3. Get user approval before adding to `globals.css` or `design-tokens.ts`
4. Add to this `design.md` after approval
5. If creating a new shared component, place it in `src/components/ui/`

---

## 14. Agent Checklist

Before completing any UI work, verify:

- [ ] Used semantic color tokens (not raw hex unless it's an approved exception)
- [ ] Used shared components from `src/components/ui/` (not creating duplicates)
- [ ] Page works in both light and dark themes
- [ ] Page is responsive at mobile (< 640px) and desktop
- [ ] Headings use `.ds-h1/.ds-h2/.ds-h3` classes with UPPERCASE
- [ ] Numbers/money use `.ds-numeric` class
- [ ] Tables use `.ds-table` class
- [ ] Form sections use `.ds-form-section` where appropriate
- [ ] Inputs inside `<main>` are not overriding cyan border
- [ ] No new Tailwind slate/gray classes introduced
- [ ] Status colors match the approved palette from Section 3.7
- [ ] Module identity colors (if used) are limited to navigation
- [ ] No `p-8` or outer padding on page root — shell provides it
- [ ] No hard-coded light-only backgrounds (`bg-white`, `bg-[#fff*]`)
- [ ] No hard-coded light-only text (`text-slate-900`, `text-gray-900`)
- [ ] Verified in dark mode — all text readable, no invisible elements

---

## 15. Standard Application Page Layout

To ensure a consistent, premium feel across the monolith-engine workspace, every normal workspace page must align perfectly with the shared breadcrumbs and sidebar boundaries. 

### 15.1 Canonical Page Layout & Reference
- **Source of Truth:** The HRMS Dashboard page serves as the layout and alignment reference.
- **Outer Padding:** All standard pages MUST rely on the outer padding provided by the [DashboardShell](file:///c:/Users/SilverCloud/Documents/monolith-engine/src/app/(dashboard)/_components/dashboard-shell.tsx). The padding is responsive:
  - **Horizontal/Vertical:** `px-6 py-8 lg:px-8 xl:px-10`
- **Page Container Width:** Standard workspace pages, lists, and detail views MUST span the full available viewport width (`w-full`).
  - Do NOT apply width limits like `max-w-7xl`, `max-w-[1600px]`, or `container`.
  - Do NOT apply centering rules like `mx-auto`.

### 15.2 Prohibited Duplicate Padding
- Root containers inside dashboard subpages must NOT add page-level gutters (e.g., `p-8` or `px-6 py-8`). This prevents double padding, which makes content gutters look excessively wide.

### 15.3 Allowed Layout Exceptions
The following exceptions are approved where narrow reading constraints are necessary for usability and focus:
1. **Forms & Detail Editors:** Pages primarily focused on data input (e.g., creating a lead, settings page, editing profile parameters) should use a constraint like `max-w-5xl` or `max-w-[1200px]` centered via `mx-auto`, but must still remove any duplicate outer padding (`p-8`).
2. **Modals & Dialogs:** Popups and alerts maintain their specific fixed widths and padding.
3. **Authentication Screens:** Login and registration pages use centered, constrained forms.
4. **Reading-focused Documents:** Long-form text articles or terms of service screens.

### 15.4 Page Heading Ownership
- The persistent top header (`AppHeader` / `WelcomeBar`, `src/components/welcome-bar.tsx`) already renders the current page's title as `workspaceLabel`, sourced from the matched nav item in `src/lib/navigation.ts`.
- Standard workspace pages MUST NOT repeat this as an in-page `<h1>` (e.g. a "Clearance Jobs Catalog" heading on `/cha/jobs` duplicating the "Jobs" top-header title). Remove the redundant `ds-h1` + description block from the page body; keep any action buttons (Create, Filters, etc.) in that row, right-aligned.
- Exceptions: identifier headings that are not the page name (e.g. a job number on a job detail page), and sub-view headings nested under a settings page that the top header does not distinguish (e.g. a workflow builder title under `/cha/settings/filing-workflows`).

---

## 16. CHA UI Review Decisions (live)
- **2026-07-07 · design.md decision — Form field contract locked to outlined h-11 controls** — `Input`, `DateInput`, and `DropdownSelect` now explicitly share the single-line field geometry (`h-11`, `rounded-xl`, matching padding) and dropdown triggers are documented as outlined surface-backed form fields, not solid CTA buttons; compact `h-8` selectors remain allowed only for dense embedded card/list rows (id `manual-form-field-contract`)
- **2026-07-07 · design.md decision — Badge typography + CHA mappings normalized** — shared `Badge` updated to lighter `font-medium` text with wider tracking, and CHA dashboard / jobs list / workspace status-priority-document chips now resolve through one shared mapping contract (`src/lib/cha-badges.ts`) instead of inline pill styles (id `manual-cha-badge-contract`)
- **2026-07-07 · design.md decision — Text-link buttons = cha-link (no fill, cyan text, animation kept)** — supersedes `manual-textlink-full-revert`: new `button.cha-link` class in globals.css (transparent bg, #00cec4 text, hover #00b8af + underline + neon-pulse glow + 1px lift); applied with `ds-plain` to Register Payout ×2, Audit Status, Review Status, Change, Assign Manager Now, Go to Settings. Orange/green semantic links unchanged (id `manual-cha-link`)
- **2026-07-07 · design.md decision — Text-link buttons FULLY REVERTED to original** — supersedes `manual-textlink-old` and the earlier font-medium migration + ds-plain tagging: all text-link buttons in expenses-client and job-workspace are byte-identical to the pre-audit originals (original weights, plain "Audit Status" text button, no ds-plain guards, original cascade behavior). §6.1.2 text-link row cleared — no standardized recipe (id `manual-textlink-full-revert`)
- **2026-07-07 · design.md decision — Text-link buttons reverted to old design system** — font-medium downgrade reversed: cyan links back to `font-bold`, orange to `font-semibold`, green to `font-bold`, muted secondary ("Audit Status") back to a text button (`text-on-surface-variant hover:text-on-surface font-semibold`) instead of an outline Button; ds-plain kept/added on all (§6.1.2 updated; 10 undoable history entries) (id `manual-textlink-old`)
- **2026-07-07 · design.md decision — Dropzone background untinted (old-UI look)** — `bg-surface-container-low` fill removed from all 5 dropzones: rest = `border-dashed border-outline-variant/50 bg-surface`, hover = `border-[#00cec4]/60 bg-surface-container-low/40` (§6.1.2 updated; 2 undoable history entries). Text-link buttons intentionally unchanged.
- **2026-07-07 · design.md decision — Expense request card to design system** — urgent card: `border-red-200 bg-red-50/5` → `card-left-accent-orange border-red-500/35`; status pill + URGENT chip → shared `Badge`; urgency-justification container uses `border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-200` for readable red-on-red urgency copy (id `manual-expense-card`)
- **2026-07-07 · design.md fix — showcase dropzone demo bg mismatch** — second workspace-dropzone demo button was missing `ds-plain`; tagged (id `manual-dropzone-demo`)
- **2026-07-06 · design.md fix — ds-plain: text-link Register Payout** — replaced `className="font-medium text-[#00cec4] hover:underline"` with `className="ds-plain font-medium text-[#00cec4] hover:underline"` (2 file(s), id `ofhgazq1`)
- **2026-07-06 · design.md fix — ds-plain: text-link Post Resolution Reply (orange)** — replaced `className="text-xs font-medium text-[#fb923c] hover:underline flex items-center gap-1.5"` with `className="ds-plain text-xs font-medium text-[#fb923c] hover:underline flex items-center gap-1.5"` (1 file(s), id `a16wuaqg`)
- **2026-07-06 · design.md fix — ds-plain: text-link Change (job header)** — replaced `className="ds-label text-[#00cec4] hover:underline"` with `className="ds-plain ds-label text-[#00cec4] hover:underline"` (1 file(s), id `4rcumwep`)
- **2026-07-06 · design.md fix — ds-plain: text-link Assign Manager Now** — replaced `className="mt-2 text-xs font-medium text-[#00cec4] hover:underline cursor-pointer uppercase tracking-wider"` with `className="ds-plain mt-2 text-xs font-medium text-[#00cec4] hover:underline cursor-pointer uppercase tracking-wider"` (1 file(s), id `v8bazhsv`)
- **2026-07-06 · design.md fix — ds-plain: text-link Go to Settings** — replaced `className="mt-2 text-xs font-medium text-[#00cec4] hover:underline cursor-pointer"` with `className="ds-plain mt-2 text-xs font-medium text-[#00cec4] hover:underline cursor-pointer"` (1 file(s), id `qpbbmrne`)
- **2026-07-06 · design.md fix — ds-plain: dropzone button (modal + showcase)** — replaced `className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[#00cec4]/45 bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant transition-colors hover:bg-surface-container"` with `className="ds-plain flex w-full cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[#00cec4]/45 bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant transition-colors hover:bg-surface-container"` (2 file(s), id `jq1hh39n`)
- **2026-07-06 · design.md fix — ds-plain: settings quick-action tile** — replaced `className="card-left-accent hover-cyan flex w-full items-center justify-between rounded-xl border border-outline-variant/60 bg-surface px-4 py-3 text-left shadow-sm transition-all"` with `className="ds-plain card-left-accent hover-cyan flex w-full items-center justify-between rounded-xl border border-outline-variant/60 bg-surface px-4 py-3 text-left shadow-sm transition-all"` (2 file(s), id `bybnw8gr`)
- **2026-07-06 · design.md fix — ds-plain: showcase text-link demo (cyan)** — replaced `className="font-medium text-[#00cec4] hover:underline bg-transparent border-0"` with `className="ds-plain font-medium text-[#00cec4] hover:underline bg-transparent border-0"` (1 file(s), id `hm7zsdy2`)
- **2026-07-06 · design.md fix — ds-plain: showcase text-link demo (ds-label)** — replaced `className="ds-label text-[#00cec4] hover:underline bg-transparent border-0"` with `className="ds-plain ds-label text-[#00cec4] hover:underline bg-transparent border-0"` (1 file(s), id `yyat98dy`)
- **2026-07-06 · design.md decision — Neon buttons RESTORED and confirmed final** — the `manual-neon-revert` rollback clobbered user CSS by mistake; reinstated: neon `button-1.tsx` variants, the full `.cha-module` cascade in `globals.css` (with the narrowed `label[class*="bg-[#00cec4]"]` selector and all hover lifts), and the §6.1 neon spec. Workspace approve/reject keep proper `default`/`destructive` variants (visually identical under the cascade) (id `manual-neon-restore`)
- **2026-07-06 · design.md decision — Section panel recipe is strict** — §7.2 exception for `rounded-2xl/3xl` featured shells removed; the workflow-builder shell converted to the standard section-panel recipe (`rounded-xl border-outline-variant/60`) (id `manual-panel-strict`)
- **2026-07-06 · design.md decision — Neon adoption REVERTED** *(superseded by `manual-neon-restore` above)* — reverses `manual-btn-neon` + `manual-lift-back`: §6.1 restored to the original spec (plain cyan/outline/destructive, color-shift hover only), `button-1.tsx` reverted, the entire `.cha-module` neon button cascade (globals.css 1318–1512, incl. `neon-pulse-*` keyframes and all hover lifts) deleted, and the workspace `cha-btn-neon-approve/reject` classes replaced with proper `default`/`destructive` variants (id `manual-neon-revert`)
- **2026-07-05 · design.md decision — Orange outline button sanctioned as CHA default** — `border-[#fb923c]/50 text-[#fb923c] hover:bg-[#fb923c]/10` on `Button variant="outline"` documented in §6.1.1 (manual entry, no code change)
- **2026-07-05 · design.md decision — Cyan neon hover lift removed** — deleted `transform: translateY(-1px)` from `.cha-module` cyan button + upload-label hover rules in `src/app/globals.css` (fixes "Deactivate Section 49" lifting on hover; red destructive rule untouched; undo via git, id `manual-lift`)
- **2026-07-05 · design.md decision — Tonal buttons: red — standard sm size/text** — replaced `h-8 flex-1 border border-red-500/25 bg-red-500/12 text-red-500 hover:bg-red-500/18 hover:text-red-600 text-xs` with `flex-1 border border-red-500/25 bg-red-500/12 text-red-500 hover:bg-red-500/18 hover:text-red-600` (2 file(s), id `ilaw37ev`)
- **2026-07-05 · design.md decision — Tonal buttons: orange fb923c — standard sm size/text** — replaced `h-8 flex-1 border border-[#fb923c]/25 bg-[#fb923c]/12 text-[#fb923c] hover:bg-[#fb923c]/18 hover:text-[#f97316] text-xs` with `flex-1 border border-[#fb923c]/25 bg-[#fb923c]/12 text-[#fb923c] hover:bg-[#fb923c]/18 hover:text-[#f97316]` (3 file(s), id `pw8xhzc6`)
- **2026-07-05 · design.md decision — Tonal buttons: orange-500 — standard sm size/text** — replaced `h-8 flex-1 border border-orange-500/25 bg-orange-500/12 text-orange-600 hover:bg-orange-500/18 hover:text-orange-700 text-xs` with `flex-1 border border-orange-500/25 bg-orange-500/12 text-orange-600 hover:bg-orange-500/18 hover:text-orange-700` (1 file(s), id `e2g9d38x`)
- **2026-07-05 · design.md decision — Tonal buttons: neutral acknowledge — standard sm size/text** — replaced `h-8 flex-1 border-outline-variant/50 bg-surface text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface text-xs` with `flex-1 border-outline-variant/50 bg-surface text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface` (2 file(s), id `xso9hc8a`)
- **2026-07-05 · design.md decision — Tonal buttons: cyan extension — standard sm size/text** — replaced `h-8 flex-1 border-[#00cec4]/40 bg-[#00cec4]/10 text-[#00cec4] hover:bg-[#00cec4]/15 text-xs` with `flex-1 border-[#00cec4]/40 bg-[#00cec4]/10 text-[#00cec4] hover:bg-[#00cec4]/15` (2 file(s), id `0ip0g18o`)

> Style decisions applied from /cha-ui-showcase. Each entry is undoable via the showcase history panel.
- **2026-07-05 · design.md migration — Labels: expenses pay-form 9px bold** — replaced `text-[9px] uppercase font-bold tracking-wide block text-on-surface-variant` with `ds-label block` (2 file(s), id `20caics4`)
- **2026-07-05 · design.md migration — Labels: workspace expense-line 9px bold** — replaced `text-[9px] uppercase font-bold tracking-wide text-on-surface-variant` with `ds-label` (1 file(s), id `gtj7wxc9`)
- **2026-07-05 · design.md migration — Labels: workspace disburse-form 9px bold** — replaced `text-[9px] uppercase font-bold tracking-wide block` with `ds-label block` (1 file(s), id `iwmlaiv1`)
- **2026-07-05 · design.md migration — Labels: workspace advances 10px bold** — replaced `text-[10px] uppercase font-bold tracking-wide block` with `ds-label block` (1 file(s), id `f1t3p4ay`)
- **2026-07-05 · design.md migration — Labels: workspace checklist 10px bold + ds-label** — replaced `text-[10px] uppercase font-bold text-on-surface-variant block ds-label` with `ds-label block` (1 file(s), id `5gsdlypy`)
- **2026-07-05 · design.md migration — Labels: workspace attachments 9px bold + ds-label** — replaced `text-[9px] uppercase tracking-wide font-bold text-on-surface-variant block ds-label` with `ds-label block` (1 file(s), id `4pzb5ex6`)
- **2026-07-05 · design.md migration — Labels: job-header ds-label shrunk to 9px** — replaced `ds-label block text-[9px] text-on-surface-variant` with `ds-label block text-on-surface-variant` (2 file(s), id `tvhi8f41`)
- **2026-07-05 · design.md migration — Numerics: stat value 3xl font-bold** — replaced `text-3xl font-bold ds-numeric` with `text-3xl ds-numeric` (2 file(s), id `t48bvisn`)
- **2026-07-05 · design.md migration — Numerics: stat value 2xl font-bold** — replaced `text-2xl font-bold ds-numeric` with `text-2xl ds-numeric` (2 file(s), id `a3rbl7jk`)
- **2026-07-05 · design.md migration — Numerics: font-bold ds-numeric** — replaced `font-bold ds-numeric` with `ds-numeric` (2 file(s), id `r6wa4zl1`)
- **2026-07-05 · design.md migration — Numerics: redundant ds-numeric font-mono** — replaced `ds-numeric font-mono` with `ds-numeric` (2 file(s), id `e0xq254f`)
- **2026-07-05 · design.md migration — Numerics: expenses total xl font-bold** — replaced `text-xl font-bold text-[#00cec4] block mt-1.5 ds-numeric` with `text-xl text-[#00cec4] block mt-1.5 ds-numeric` (1 file(s), id `qgci3i3r`)
- **2026-07-05 · design.md migration — Numerics: workspace total lg font-bold** — replaced `text-lg font-bold text-[#00cec4] block mt-1 ds-numeric` with `text-lg text-[#00cec4] block mt-1 ds-numeric` (1 file(s), id `z63ipxt0`)
- **2026-07-06 · design.md decision — Shared Button spec = CHA neon look** — §6.1 rewritten: default/outline/destructive now specify cyan/red neon borders, glow shadows and `neon-pulse-*` hover pulse, baked natively into `src/components/ui/button-1.tsx` (no longer only via the `.cha-module` cascade) (id `manual-btn-neon`)
- **2026-07-07 · design.md fix — Shared Button outline role locked via data-variant** — `src/components/ui/button-1.tsx` now emits `data-variant` / `data-size` / `data-mode`, and the `.cha-module` cascade in `src/app/globals.css` keys off those markers so `outline` buttons keep their respective cyan/orange/red outline treatment instead of being force-filled by substring-based selectors (id `manual-button-variant-data`)
- **2026-07-06 · design.md decision — Hover lift reinstated for ALL buttons** — reverses the 2026-07-05 `manual-lift` removal: `hover:-translate-y-px active:translate-y-0 active:scale-[0.96]` added to the shared Button base, and `transform: translateY(-1px)` restored in the `.cha-module` cyan/label/outline/orange hover rules in `globals.css` (id `manual-lift-back`)
- **2026-07-06 · design.md migration — Upload dropzones unified to one recipe** — workspace dropzones A/B replaced with the extension-modal recipe (`rounded-xl border-dashed border-[#00cec4]/45 bg-surface-container-low hover:bg-surface-container`); `.cha-module` label cascade selector narrowed to `label[class*="bg-[#00cec4]"]` so dashed dropzones are no longer force-restyled (§6.1.2) (id `manual-dropzone`)
- **2026-07-06 · design.md migration — Nonstandard button heights removed** — all `h-7`, `h-8 text-xs py-1`, `text-xs h-8`, `h-7 text-[10px]` overrides stripped in approvals, expenses and job workspace; geometry now comes from `size="sm"` only (§6.1.2) (id `manual-btn-size`)
- **2026-07-06 · design.md migration — Text-link buttons normalized** — `font-bold`/`font-semibold` links downgraded to `font-medium`; "Audit Status"/"Review Status" text buttons converted to `<Button variant="outline" size="sm">` (§6.1.2) (id `manual-text-link`)
- **2026-07-06 · design.md migration — Section panel radius drift removed** — reports/approvals/expenses/jobs/workspace panels unified to `rounded-xl border-outline-variant/60 bg-surface shadow-sm`; workflow-builder canvas keeps `rounded-3xl` as sanctioned featured-shell exception (§7.2) (id `manual-panel`)
- **2026-07-06 · design.md migration — Inset panel opacity roulette removed** — all `border-outline-variant/{25|30|35|40}` + `bg-surface-container-low{/20|/35|/40|/50}` permutations replaced with `rounded-xl border-outline-variant bg-surface-container-low` (§7.2) (id `manual-inset`)
- **2026-07-06 · design.md migration — Settings tiles normalized** — health/info tiles: `border-[#00cec4]/20` → `border-outline-variant/60` (cyan = interactive only); quick-action rows: custom hover shadow + arrow-slide replaced with `card-left-accent hover-cyan` (§7.2) (id `manual-settings-tiles`)
