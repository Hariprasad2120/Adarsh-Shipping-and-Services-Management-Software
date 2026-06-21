<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:design-system -->
# Design System — Monolith Engine (Adarsh Shipping)

Single design system. All modules share it. No module-specific CSS wrappers. Tokens live in `src/app/globals.css` (CSS custom properties) and `src/lib/design-tokens.ts` (TS exports for inline styles).

---

## Accent Colors

| Token | Value | Use |
|---|---|---|
| Cyan | `#00cec4` | Buttons, active states, borders, focus rings, icon color, left/top accent bars |
| Orange | `#fb923c` | Alert states, warning data, secondary stat cards |

Rule: cyan = action/interactive. Orange = alert/secondary data. Never both on the same element.

---

## Typography

- **Body text**: Geist Sans — `--font-sans` and `--font-display` both map to `var(--font-geist-sans)` in the `@theme inline` block.
- **Display / Headings**: Kiona Sans is available via `var(--font-kiona-sans)` and exported as `fonts.display` from `design-tokens.ts`.
- **Numbers/Code**: Geist Mono (`var(--font-mono)`) — use `.ds-numeric` for tabular figures

Heading utility classes (`.ds-h1`, `.ds-h2`, `.ds-h3`) inherit font-weight from context. Body text uses `400`.

### Typography Classes

| Class | Description |
|---|---|
| `.ds-h1` | Page title — 24px, uppercase, 0.04em tracking, Kiona |
| `.ds-h2` | Section title — 20px, uppercase, 0.03em tracking, Kiona |
| `.ds-h3` | Card/panel title — 18px, uppercase, Kiona |
| `.ds-label` | Table column headers, form labels — 10px, `UPPERCASE`, 0.12em tracking, `var(--color-on-surface-variant)` |
| `.ds-numeric` | Numbers, money, stats — Geist Mono, tabular-nums, slashed-zero |

---

## Components

### Buttons

Primary button: cyan background, white text. Always.

```tsx
<button className="bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-4 py-2 rounded-xl text-sm uppercase tracking-wide transition-all">
  Action Label
</button>
```

Or use `<Button>` from `src/components/ui/button.tsx` (default variant is already cyan).

### Inputs

All `<input>`, `<select>`, `<textarea>` inside `<main>` automatically receive:
- Border: `rgba(0, 206, 196, 0.55)` (light cyan)
- Focus ring: `0 0 0 3px rgba(14, 137, 149, 0.14)` (cyan glow)
- Radius: `var(--radius-xl)` = 12px

No extra classes needed for inputs inside `<main>`. Don't override the border to gray.

### Icon Badges

Use `.ds-icon-badge` for icon containers — frosted glass, transparent cyan background.

```tsx
<span className="ds-icon-badge">
  <SomeIcon size={18} />
</span>
```

Produces: 36×36px, `rounded-xl`, `bg-[#00cec4]/10`, `backdrop-blur-sm`, `text-[#00cec4]`.

For orange variant, apply inline: `style={{ background: 'rgba(251,146,60,0.10)', color: '#fb923c' }}` on `.ds-icon-badge`.

### Card Accent Bars

Cards that highlight data use a solid accent bar — either top or left.

```tsx
// Top accent — cyan (primary metric)
<div className="card-top-accent rounded-xl p-4 ...">

// Top accent — orange (alert/secondary metric)  
<div className="card-top-accent-orange rounded-xl p-4 ...">

// Left accent — cyan
<div className="card-left-accent rounded-xl p-4 ...">

// Left accent — orange
<div className="card-left-accent-orange rounded-xl p-4 ...">
```

Use `card-top-accent` for stat cards in a grid. Use `card-left-accent` for detail rows, list items, or form sections.

### Form Section Headings

Wrap each logical form section in `.ds-form-section`. The `h2/h3/h4` directly inside it gets a `3px cyan vertical bar` prepended automatically via `::before`.

```tsx
<div className="ds-form-section space-y-4">
  <h3>Personal Information</h3>
  <div className="grid grid-cols-2 gap-4">
    ...fields
  </div>
</div>
```

### Data Tables

```tsx
<table className="ds-table">
  <thead>
    <tr>
      <th>Employee</th>   {/* auto: uppercase, muted color, 0.12em tracking */}
      <th>Department</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr className="ds-row-link" onClick={() => router.push(`/detail/${id}`)}>
      <td>John Smith</td>           {/* data: var(--color-on-surface) */}
      <td className="ds-label">Engineering</td>  {/* label treatment on data cells when needed */}
      <td><Badge>Active</Badge></td>
    </tr>
  </tbody>
</table>
```

Rules:
- Table always full-width (`w-full` — already applied by `.ds-table`)
- Column headers (`th`) are `UPPERCASE` automatically
- Data cells (`td`) use `var(--color-on-surface)` — full contrast
- Labels/category values in cells: add `.ds-label` to make them muted uppercase
- Clickable rows: add `ds-row-link` to `<tr>` — hover gets cyan left-inset glow

### Hover States

Standard hover: cyan glow shadow.

```tsx
// Subtle — cards, list items
<div className="hover-cyan ...">

// Inline — buttons (use hover:shadow-[...] Tailwind)
hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)]
```

---

## CSS Variables — Quick Reference

| Variable | Light | Dark |
|---|---|---|
| `var(--background)` | `#f7f9fb` | `#0d1117` |
| `var(--color-surface)` | `#ffffff` | `#161b22` |
| `var(--color-surface-container-low)` | `#f2f4f6` | `#161b22` |
| `var(--color-surface-container)` | `#eceef0` | `#21262d` |
| `var(--color-on-surface)` | `#191c1e` | `#f0f6fc` |
| `var(--color-on-surface-variant)` | `#404947` | `#8b949e` |
| `var(--color-outline)` | `#707977` | `#30363d` |
| `var(--color-outline-variant)` | `#bfc8c6` | `#21262d` |
| `var(--color-placeholder)` | `#8a919d` | `#96a0ad` |

---

## Module Identity Colors (nav/sidebar only)

These are for nav icons and sidebar active indicators only — not for buttons, labels, or body content.

```
dashboard: #00c4b6    hrms: #818cf8    attendance: #fbbf24
todo: #22c55e         ams: #c084fc     admin: #8b5cf6
crm: #38bdf8
```

---

## Rules — What NOT to Do

- **No module-specific theme wrappers** — no `.crm-theme`, `.hrms-theme`, etc. Use CSS variables.
- **No hardcoded Tailwind slate/gray colors** — `text-slate-200`, `bg-slate-800`, etc. Use `var(--color-on-surface)` etc.
- **No extra font-weight on `.ds-h*`** — already set to 700. Don't override.
- **No lowercase headings or table headers** — always `UPPERCASE`.
- **No gray borders on inputs** — inputs in `<main>` get cyan borders automatically. Don't override.
- **No colored backgrounds on buttons** except cyan (`#00cec4`) for primary and red (`#ef4444`) for destructive.
- **No importing from `Design System/`** — that folder is deleted. All tokens are in `globals.css` and `design-tokens.ts`.
- **No light-only backgrounds** — never use `bg-white`, `bg-[#ffffff]`, or light hex backgrounds. Use `bg-surface`, `bg-surface-container-low`, etc.
- **No light-only text colors** — never use `text-slate-900`, `text-gray-900`. Use `text-on-surface`, `text-on-surface-variant`.
- **No page-level padding** — `DashboardShell` provides `px-6 py-8 lg:px-8 xl:px-10`. Do not add `p-8` to page root elements.

---

## Mandatory: Read `design.md`

**Before creating, editing, or reviewing any frontend UI, read `design.md` at the project root.** It is the authoritative visual standard and contains:

- Complete token tables (colors, typography, spacing, radius, shadows)
- Light/dark theme mappings with exact values
- All shared component locations and variants
- Approved exceptions (module colors, status colors, stat tones)
- Rules for introducing new tokens

### Implementation Checklist

Every AI agent must report these checks in their final response after UI work:

1. ✅ Used semantic tokens — no raw hex unless approved exception
2. ✅ Used shared components — no duplicate primitives created
3. ✅ Light and dark theme verified
4. ✅ Mobile and desktop layout verified
5. ✅ Headings use `.ds-h*` with UPPERCASE
6. ✅ Numbers use `.ds-numeric`
7. ✅ Tables use `.ds-table`
8. ✅ No new Tailwind slate/gray classes introduced
9. ✅ No gray input borders — cyan applied automatically
10. ✅ No legacy style removed without user approval
11. ✅ No `bg-white` or light-only hex backgrounds — used `bg-surface` tokens
12. ✅ No `text-slate-900` or light-only text — used `text-on-surface` tokens
13. ✅ No `p-8` on page root — shell provides outer padding
14. ✅ Dark mode verified — all text readable, no invisible elements
15. ✅ Tables use `ds-table` inside `overflow-hidden rounded-xl` container — see `design.md` Section 7.1
16. ✅ Table data cells use `font-weight: 400` (normal) — only name/identifier columns use `font-medium`
17. ✅ No `border-collapse` on tables — `ds-table` uses `border-separate` with `border-spacing: 0`
18. ✅ No `divide-y divide-[#hex]` on `<tbody>` — `ds-table td` border-bottom handles row separators
19. ✅ Table rounded corners verified in browser — not just class applied
<!-- END:design-system -->
