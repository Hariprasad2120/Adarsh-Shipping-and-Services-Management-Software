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

| Variant | Appearance |
|---|---|
| `default` | Cyan `#00cec4` bg, white text, hover `#00b8af` |
| `outline` | Surface bg, outline-variant border, hover surface-container-low |
| `inverse` | Transparent bg, current text color, hover black/10 |

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

| Variant | Colors |
|---|---|
| `default` | Indigo 50 bg, indigo 700 text |
| `secondary` | Surface container high bg, on-surface-variant text |
| `success` | Green 50 bg, green 700 text |
| `warning` | Amber 50 bg, amber 700 text |
| `destructive` | Red 50 bg, red 600 text |

### 6.4 Input — `src/components/ui/input.tsx`

Standard text input with cyan border. Height 44px (`h-11`), `rounded-xl`.

> **Note:** Global CSS in `globals.css` also auto-styles all `<input>`, `<select>`, `<textarea>` inside `<main>` with cyan borders and focus rings. You do NOT need extra classes for basic form inputs.

### 6.5 Modal — `src/components/ui/modal.tsx`

Props: `open`, `title`, `description?`, `onClose`, `children`, `className?`

### 6.6 Alert — `src/components/ui/alert.tsx`

CVA-based with 7 variants × 4 appearances × 3 sizes. Imports Button from `button-1.tsx`.

### 6.7 DropdownMenu — `src/components/ui/dropdown-menu.tsx`

Radix-based. Exports: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuLabel`, and more.

### 6.8 DropdownSelect — `src/components/ui/dropdown-select.tsx`

Controlled/uncontrolled select built on DropdownMenu. Cyan borders matching Input style.

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
| `.card-top-accent` | Cyan inset shadow top | Primary stat cards |
| `.card-top-accent-orange` | Orange inset shadow top | Alert/secondary stat cards |
| `.card-left-accent` | 3px cyan left border | Detail rows, list items |
| `.card-left-accent-orange` | 3px orange left border | Alert detail rows |
| `.cyan-range-slider` | Styled range thumb | Range inputs |
| `.animate-page-enter` | Slide-in-from-right animation | Page transitions |

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
