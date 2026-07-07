# CHA Module — UI/CSS Elements Audit

> Generated 2026-07-05. Inspection-only audit — no CHA code was modified.
> Companion visual review page: `/cha-ui-showcase` (`src/app/(dashboard)/cha-ui-showcase/`).
> Off-system elements render side-by-side: **current — CHA** (with the real `.cha-module` cascade applied) vs **design system — design.md** (the compliant equivalent).
> The showcase is also a live editor: each element has **Copy code** and **Paste / edit code** — applying a change performs an exact-string replace across all CHA source files (`src/app/(dashboard)/cha`, `src/components/cha`, the showcase, `globals.css`, `design.md`), records it to `docs/cha-ui-showcase-history.json`, appends it to design.md §16, and is undoable from the history panel. Backend: `src/app/api/cha-ui-showcase/route.ts` (requires `cha.settings.manage`; disabled in production unless `CHA_SHOWCASE_EDIT=true`).
>
> Legend — **Source**: `shared` = from `src/components/ui/` or global `ds-*` classes · `cha` = CHA-specific component/CSS · `inline` = inline Tailwind on the element · `css-file` = rule in `src/app/globals.css`.
> **Reusable?**: whether the pattern is generic enough to keep/promote. **Inconsistent?**: deviates from `design.md`.

---

## 1. Pages / Screens Found

| Route | File | Notes |
|---|---|---|
| `/cha` | `src/app/(dashboard)/cha/page.tsx` | KPI cards + My Assigned Jobs table |
| `/cha/jobs` | `src/app/(dashboard)/cha/jobs/page.tsx` + `jobs-client.tsx` | Filter bar, Active/Completed tables, pagination |
| `/cha/jobs/[jobId]` | `jobs/[jobId]/page.tsx` + `job-workspace-client.tsx` (5,851 lines) | Job header, stage stepper, sticky tabs, docs/checklist/filing/advances/expenses panels, modals |
| `/cha/jobs/[jobId]` (DO panel) | `jobs/[jobId]/do-validity-panel.tsx` | Toggle switch, upload row, extension history table |
| `/cha/approvals` | `approvals/page.tsx` | Two table cards + empty states |
| `/cha/expenses` | `expenses/page.tsx` + `expenses-client.tsx` | Filter card, expense request cards, inline review/pay forms |
| `/cha/reports` | `reports/page.tsx` | Stat cards, delayed-filings table, audit log feed |
| `/cha/customers` | `customers/page.tsx` | Canonical ds-table |
| `/cha/customers/new`, `/cha/customers/[id]/edit` | `customers/new/page.tsx`, `customers/[id]/edit/page.tsx` | `max-w-5xl mx-auto` form pages (allowed exception) |
| `/cha/settings` | `settings/page.tsx` + `settings-form.tsx` (1,583 lines) | Custom pill tab bar, Cards, quick-action list |
| `/cha/settings/filing-workflows` | `filing-workflows/page.tsx` + `workflows-client.tsx` (2,793 lines) | Full-height canvas builder: palette drawer, SVG edges, nodes, properties panel |
| Layout | `cha/layout.tsx` | Wraps everything in `.cha-module` (triggers global CSS override layer) |
| Shared dialogs | `src/components/cha/create-job-dialog.tsx` (1,396 lines), `dashboard-create-job.tsx` | Hand-rolled modal + 3D success overlay |
| Warning indicators | `cha/_components/job-validity-warning-indicator.tsx`, `job-section49-validity-warning-indicator.tsx`, `job-filing-query-warning-indicator.tsx` | Three near-identical portal popovers |
| DO extension modal | `cha/_components/do-extension-modal.tsx` | Uses shared `Modal` |
| Delete button | `cha/_components/job-delete-inline-button.tsx` | Uses shared `Modal` + destructive button |

## 2. Shared Components Used In CHA

`Button` (`ui/button.tsx`), `Badge` (`ui/badge.tsx` — workflow builder only), `Card/CardHeader/CardContent/CardTitle` (settings + workflow palette only), `Modal` (`ui/modal.tsx`), `DropdownSelect`, `FilterMenu`, `DateInput`, `Label` (rarely), `DataTable` family (`components/data-table.tsx` — dashboard + jobs list only), `ClickableRow`.

Global `ds-*` classes used: `ds-h1/h2/h3`, `ds-label`, `ds-numeric`, `ds-icon-badge`, `ds-form-section`, `ds-table`, `ds-row-link`, `hover-cyan`, `card-top-accent`, `card-left-accent`, `card-left-accent-orange`.

## 3. CHA-Specific CSS in `globals.css`

| Selector | Lines | What it does | Verdict |
|---|---|---|---|
| `.cha-module input/select/textarea` padding | ~999–1014 **and duplicated** ~1194–1209 | Forces `!important` padding on all form controls in CHA | CHA-only exception; **duplicated block** — one copy is dead weight |
| `.cha-btn-neon-approve` + `.cha-module button[class*=…]` cascade | ~1330–1404 | Force-restyles **every** button in CHA to cyan neon (border, bg, white text, hover glow + `neon-pulse-approve` animation, translateY, scale on active) via brittle `[class*="bg-"]` attribute selectors | **Module-specific theme wrapper — direct violation of design.md §12.1**; silently overrides `Button` variants |
| `.cha-btn-neon-reject` + red attribute selectors | ~1407–1456 | Same neon treatment for anything with `bg-red-/text-red-/destructive` in class | Same violation; makes *text-red outline* buttons render as solid red |
| Outline-button cyan override | ~1459–1483 | Forces outline buttons to cyan text/border + glow | Same violation |
| Orange (`fb923c`) button override | ~1486–1510 | Forces orange neon outline | Same violation |
| `.cha-module label[class*="00cec4"]` | ~1377–1404 | Neon treatment for upload `<label>` buttons | Same violation |
| `.cha-jobs-table-shell`, `.cha-jobs-table` | 680–696 | Softens border colors of jobs tables (light+dark values) | One-off; duplicates what `border-outline-variant/25` utilities already do |
| `@keyframes neon-pulse-approve / neon-pulse-reject` | 1319–1327 | Button hover pulse | CHA-only animation |
| `@keyframes pulse-ring-orange / pulse-ring-red` + `.animate-pulse-orange/red` | ~1016–1046 **and duplicated** ~1211+ | Warning-indicator pulse rings | Duplicated block |
| Neon checkbox (`main input[type="checkbox"]`) | ~1092–1119 | Custom cyan checkbox for whole app | Shared (not CHA-only) but visually part of CHA forms |
| `borderFlow1–4`, `particleExplosion`, `ringPulse`, `sparkFlash` keyframes | ~1049–1089 | "Neon checkbox" effect keyframes | Appear unused by any current markup — candidates for removal (verify first) |

## 4. Element Inventory

### 4.1 Typography

| Category | Element | File | Source | Classes | Visual notes | Reusable? | Inconsistent? |
|---|---|---|---|---|---|---|---|
| Typography | Page/section headings | all pages | shared | `ds-h1/ds-h2/ds-h3 text-on-surface` | Correct usage | Yes | No |
| Typography | Job number heading | job-workspace 2360 | inline | `ds-h1 ds-numeric` | Numeric page title (allowed identifier heading) | Yes | No |
| Typography | Labels | everywhere | shared | `ds-label` | Correct | Yes | No |
| Typography | Micro-labels | expenses-client 407+, workspace 2390 | inline | `text-[9px] uppercase font-bold tracking-wide` / `ds-label text-[9px]` | Ad-hoc 9px labels instead of `ds-label` | No | **Yes — font-bold + arbitrary 9px** |
| Typography | Body/helper text | everywhere | inline | `text-xs`/`text-sm text-on-surface-variant` | Consistent | Yes | No |
| Typography | Error/alert text | create-job-dialog 730 | inline | `text-xs text-[#fb923c]` | Orange for validation hint (design says orange = warning; ok) | Yes | No |
| Typography | Numeric values | everywhere | shared | `ds-numeric`, sometimes redundant `ds-numeric font-mono` | `font-mono` redundant with ds-numeric | Yes | Minor |
| Typography | font-bold/font-semibold overuse | 145 occurrences in 7 files | inline | `font-bold`, `font-semibold` on stats, td cells, labels | design.md: body 400, only name cols `font-medium` | — | **Yes** |

### 4.2 Buttons

| Element | File | Source | Classes | Notes | Reusable? | Inconsistent? |
|---|---|---|---|---|---|---|
| Primary button | all pages | shared | `<Button>` default | Cyan; but neon CSS layer re-styles it (adds border, glow, pulse, lift) | Yes | Overridden by `.cha-module` layer |
| Outline button | all pages | shared | `<Button variant="outline">` | Neon layer forces cyan text/border — differs from design.md outline spec (on-surface text) | Yes | **Yes (via CSS layer)** |
| Destructive button | workspace 2400, delete button | shared | `<Button variant="destructive">` | Neon layer adds red glow/pulse | Yes | Overridden |
| Orange outline button | workspace 2549, 2457 | inline | `border-[#fb923c]/50 text-[#fb923c] hover:bg-[#fb923c]/10` | Repeated ad-hoc pattern (Mark All N/A, Assign Manager, Section 49 off-state) | Candidate for a variant | **Yes — no such variant in design.md** |
| Tinted action buttons | validity indicator 58–61, 208 | cha | `border-red-500/25 bg-red-500/12 text-red-500` / orange / cyan equivalents | Tonal tinted buttons unique to warning popovers | One-off | Yes |
| Text-link buttons | expenses-client 469, 486; workspace 2380 | inline | `text-[#00cec4] hover:underline font-bold` / `text-on-surface-variant hover:text-on-surface font-semibold` | Bare `<button>` styled as link | One-off | Yes (font-bold) |
| Icon button | workflows-client 1682, 1759 | shared | `<Button variant="outline" mode="icon" size="sm">` | Correct | Yes | No |
| Size overrides | approvals 78, expenses 327+ | inline | `h-8 text-xs py-1`, `h-7 text-xs` | Ad-hoc button heights below `sm` (32px) | No | **Yes — nonstandard sizes** |
| Upload label-as-button | do-extension-modal 101 | inline | dashed `border-[#00cec4]/45 bg-surface-container-low rounded-xl` | Nice pattern, duplicated in workspace with different bg opacities | Candidate | Duplicated variants |

### 4.3 Cards

| Element | File | Source | Classes | Notes | Reusable? | Inconsistent? |
|---|---|---|---|---|---|---|
| KPI/stat card | cha/page 189, reports 101 | shared classes, inline assembly | `card-top-accent rounded-xl bg-surface border border-outline-variant/30 p-5 space-y-2 hover-cyan transition-all` | Matches design.md stat card | Yes | `text-3xl font-bold` on value (weight rule) |
| Icon badge (orange override) | cha/page 204, 228 | inline style | `ds-icon-badge` + `style={{background:'rgba(251,146,60,0.1)',color:'#fb923c'}}` | AGENTS.md documents this exact pattern | Yes | No (approved) |
| Section card (rounded-xl) | reports 180, approvals 32, expenses 164 | inline | `bg-surface border border-outline-variant/30 rounded-xl p-6 shadow-sm` | The "classic" CHA panel | Yes | Radius 12px |
| Section card (rounded-2xl) | workspace 2338, 2531, jobs-client 316 | inline | `rounded-2xl border border-outline-variant/30 bg-surface shadow-sm` | Same role, 16px radius | Yes | **Duplicate of above with different radius** |
| Canvas shell (rounded-3xl) | workflows-client 1679 | inline | `rounded-3xl border border-outline-variant bg-surface shadow-sm` | Third radius for a page shell | — | **Radius drift xl → 2xl → 3xl** |
| Shared `Card` component | settings-form, workflow palette only | shared | `Card/CardHeader/CardTitle` | Used in only 2 of 11 screens; everywhere else hand-rolled | Yes | **Under-used** |
| Inset/nested panel | workspace 2564, 3068, 3570… | inline | `rounded-2xl border border-outline-variant/{25,30,35,40} bg-surface-container-low[/20,/35,/40,/50] p-3..4` | ~20 occurrences with at least 8 opacity permutations | Candidate | **Yes — opacity roulette** |
| Upload/doc requirement card | workspace 2628 | shared class + inline | `p-4 rounded-2xl border card-left-accent(-orange) bg-[var(--color-surface)]` | Left accent = uploaded(cyan)/pending(orange) | Yes | Verbose `bg-[var(--color-surface)]` instead of `bg-surface` |
| Config health tile | settings-form 685 | inline | `rounded-xl border border-[#00cec4]/20 bg-surface p-4 shadow-sm` | Cyan-tinted border card, unique to settings | One-off | Yes (cyan border on non-interactive card) |
| Quick-action card | settings-form 727 | inline | `rounded-xl border-outline-variant/50 … hover:border-[#00cec4]/70 hover:shadow-[…] group-hover:translate-x-1` | Nice premium hover; unique | Candidate | One-off shadow values |
| Expense request card | expenses-client 231 | inline | `bg-surface p-6 rounded-xl border shadow-sm` + urgent `border-red-200 bg-red-50/5` | Urgent tint is light-only red | Yes | **`border-red-200` light-only** |
| Audit log item | reports 229 | inline | `text-xs p-3 bg-surface-container-low border-outline-variant/40 rounded-xl` | Fine | Yes | No |

### 4.4 Badges & Status Indicators

| Element | File | Source | Classes | Notes | Inconsistent? |
|---|---|---|---|---|---|
| Stage pill (colored) | cha/page 364 | inline | `rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]` + `border-blue-200 bg-blue-50 text-blue-700` / amber / green | Light-only Tailwind palette colors | **Yes** |
| Stage pill (neutral) | jobs-client 264 | inline | `rounded-full border-outline-variant/35 bg-surface-container-low text-[10px] uppercase` | Same data, totally different look from dashboard | **Yes — same element, two styles** |
| Expense status pill | expenses-client 270 | inline | `px-3 py-1 rounded-full text-[10px] font-bold` + `bg-green-100/blue-100/orange-100 text-*-700` | Third styling of a status pill; light-only bg | **Yes** |
| Job header chips | workspace 2342–2357 | inline | `rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase` (+ `border-green-200 text-green-600` status) | Fourth pattern (square chips) | **Yes** |
| Doc status chip | workspace 2645 | inline | `text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#00cec4]/10 text-[#00cec4]` etc. | Fifth pattern (4px radius) | **Yes** |
| MANDATORY chip | workspace 2641 | inline | `text-[9px] bg-red-50 text-red-500 border-red-200` | Light-only red | **Yes** |
| URGENT chip | expenses-client 262 | inline | `bg-red-100 text-red-700 border-red-200` | Light-only red | **Yes** |
| Shared `Badge` | workflows-client 1688+ | shared | `<Badge variant="success/warning/secondary">` | Only screen using the shared Badge | Under-used elsewhere |
| Priority indicator | cha/page 377 vs jobs-client 269 | inline | colored `text-red-500/#fb923c` bold text vs plain muted uppercase | Same field, two treatments | **Yes** |
| Warning indicator trigger | _components indicators | cha | `h-7 w-7 rounded-lg border` + red/orange tone + `hover:scale-105` (+ `animate-pulse-orange/red` variants) | Consistent across the 3 indicator components | No (internally consistent) |

### 4.5 Tables

| Element | File | Source | Notes | Inconsistent? |
|---|---|---|---|---|
| `DataTable` component | cha/page, jobs-client | shared | Toolbar + head + body + empty | No |
| `cha-jobs-table` override | jobs-client 206 + globals.css | cha css-file | Softer borders only for jobs tables | **Yes — one-off CSS** |
| Canonical ds-table shell | customers/page 47, do-validity-panel 210 | shared | Matches design.md §7.1 exactly | No |
| ds-table inside padded card | reports 190, approvals 52 | inline | Table lives in `p-6` card instead of `overflow-hidden` shell; no `px-6 py-3` th padding | **Yes — non-canonical wrapper** |
| Bold/colored td cells | reports 204, approvals 69, 127 | inline | `font-semibold text-[#00cec4]` / `font-semibold text-red-500` on td | **Yes — td weight rule** |
| tfoot pagination | jobs-client 279 | inline | Pagination inside table footer; fine visually | No |
| Mini file table | workspace 4355 | inline | `truncate max-w-[200px] text-xs` cells | Minor |

### 4.6 Forms

| Element | File | Source | Notes | Inconsistent? |
|---|---|---|---|---|
| Bare inputs relying on global cyan styling | jobs-client 322, expenses-client 175+ | shared (globals) | Correct per design.md — no extra classes | No |
| Fully hand-styled input | create-job-dialog 745, 776, 1271 | inline | Re-implements the exact global style inline: `px-3.5 py-2.5 bg-[var(--color-surface)] border-[rgba(0,206,196,0.55)] rounded-xl focus:ring-[rgba(14,137,149,0.14)]` | **Yes — redundant duplication of global CSS** |
| `.cha-module` padding override | globals.css | cha css-file | `!important` padding on all CHA inputs (duplicated block) | **Yes** |
| DateInput | shared | shared | Used consistently | No |
| DropdownSelect | jobs-client, create-job-dialog | shared | Used in filters + dialog | No |
| Native `<select>` | expenses-client 184, workflows-client 1699 | inline | Mixed with DropdownSelect across screens | **Yes — two select styles** |
| Checkbox | jobs-client 427, settings-form | shared (global neon checkbox) | Consistent via global CSS | No |
| Toggle switch | do-validity-panel 33–63 | cha | Custom `h-5 w-9` switch, `bg-[#00cec4]` on, `bg-surface-container` off, **`bg-white` thumb** (light-only) | **Yes — one-off + bg-white** |
| Form sections | do-validity-panel 123, workspace 3646 | shared | `.ds-form-section` + `ds-h3` | No |
| Helper text | everywhere | inline | `text-xs text-on-surface-variant` | No |

### 4.7 Tabs / Segmented Controls

| Element | File | Classes | Inconsistent? |
|---|---|---|---|
| Workspace sticky tabs | workspace 2507–2528 | `sticky top-0 z-20 border-y bg-surface/95 backdrop-blur` + buttons `rounded-lg text-[11px] font-bold uppercase`; active = `bg-[#00cec4]/10 text-[#00cec4] shadow-[inset_0_0_0_1px_rgba(0,206,196,0.35)]` | Pattern A |
| Settings pill tabs | settings-form 639–674 | `min-h-[50px] rounded-xl border` grid; active = **solid cyan bg + white text** + `shadow-[0_16px_32px_-22px_rgba(0,206,196,0.95)]`, hover `-translate-y-0.5` | Pattern B — **same control type, opposite active treatment** |
| Zoom control cluster | workflows-client 1864 | `rounded-xl border bg-surface p-1` segmented icon group | Pattern C (fine for canvas) |

### 4.8 Modals / Overlays / Panels

| Element | File | Source | Notes | Inconsistent? |
|---|---|---|---|---|
| Shared `Modal` | do-extension-modal, job-delete-inline-button, workspace modals (5389–5667: `max-w-xl/2xl/4xl`) | shared | Standard | No |
| Hand-rolled create-job dialog | create-job-dialog 688–711 | cha | `fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in` + `max-w-3xl rounded-2xl shadow-xl` card, `bg-surface-container-low` header | **Yes — duplicate modal implementation** |
| 3D success overlay | create-job-dialog 1290–1393 | cha | `bg-slate-950/90 z-[100]` + embedded `<style>` block, hard-coded dark hexes (`#161b22`, `#30363d`), `text-slate-400`, copy typo "IS SUCCESSFULLY!" | **Yes — one-off, raw slate, inline `<style>` in TSX** |
| Warning popover (portal) | _components indicators 150–224 | cha | `fixed z-[500] w-72` manual positioning; `rounded-xl border p-4 shadow-lg bg-surface` + inline `backgroundImage` linear-gradient tint | One-off × 3 near-identical copies | **Yes — triplicated component** |
| Palette drawer | workflows-client 1751 | inline | `absolute inset-y-0 left-0 w-[min(330px,…)] shadow-2xl transition-transform` | Canvas-specific; fine |
| Properties drawer | workflows-client 2155 | inline | Right-side mirror of palette | Fine |
| Validation float panel | workflows-client 2118 | inline | `rounded-2xl bg-surface/95 shadow-2xl backdrop-blur` | Fine |

### 4.9 Empty / Loading / Error States

| Element | File | Classes | Inconsistent? |
|---|---|---|---|
| Empty state A | jobs-client 225 | `p-12`, icon 48, `text-sm text-on-surface` + `text-xs` | baseline |
| Empty state B | approvals 46 / 106 | `p-12` icon 48 / **`p-10` icon 42**, `font-semibold` title | **Yes — drifting sizes/weights** |
| Empty state C | expenses-client 217 | card wrapper + `mx-auto` icon | Third variant |
| Empty text (dashed) | reports 186 | `italic border border-dashed rounded-lg` | Fourth variant |
| Spinner | workspace 5693 | custom `w-8 h-8 rounded-full border-2 border-t-[#00cec4] … animate-spin` | One-off spinner |
| Loading buttons | everywhere | text swap "Saving…/Creating…" | Consistent enough |
| Error page | jobs/[jobId]/page 121–139 | `max-w-3xl rounded-2xl` card, `border-red-200 bg-red-50 text-red-500` icon tile | Light-only red tile |
| Skeletons | — | none found in CHA | Gap (design.md §11 asks skeleton/spinner) |

### 4.10 Workflow / Canvas UI

| Element | File | Classes | Notes |
|---|---|---|---|
| Canvas background | workflows-client 1890–1941 | `bg-surface-container-low` + inline dot-grid `backgroundImage` | Fine |
| Node card | 2018 | `absolute rounded-2xl border bg-surface/95 p-4 shadow-sm backdrop-blur`; selected = `border-[#00cec4] shadow-[0_0_0_3px_rgba(0,206,196,0.18),0_18px_42px_-28px_rgba(0,206,196,0.75)]` | Premium, internally consistent |
| Connection handles | 2040–2070 | `h-4 w-4 rounded-full border-2` cyan/outline states | Fine |
| Edges (SVG) | 1949–1990 | cyan stroke, orange for back-routes/selected, `strokeDasharray="8 7"`, arrow marker, pill `foreignObject` labels | Fine |
| Stage stepper | workspace 2415–2437 | `size-6 rounded-full border text-[10px] font-bold`; done = solid cyan, active = cyan ring `shadow-[0_0_0_3px_rgba(0,206,196,0.12)]` | Reusable stepper candidate |
| Timeline | workspace 4585–4646 | `pl-5 before:w-[2px] before:bg-outline-variant/40` rail + `h-3.5 w-3.5` dots, active `bg-[#00cec4] animate-pulse` | Reusable timeline candidate |

### 4.11 Animations & Effects Found

| Animation | Where | Source | Verdict |
|---|---|---|---|
| `neon-pulse-approve/reject` (button hover pulse) | all CHA buttons via `.cha-module` layer | css-file | **Out-of-system** — design.md hover is a static cyan glow |
| Button hover `translateY(-1px)` + active `scale 0.96` | same layer | css-file | Out-of-system |
| `pulse-ring-orange/red` | warning indicator triggers | css-file | Purposeful (attention); duplicated keyframes block |
| `hover-cyan` glow | stat cards | shared | In-system |
| `hover:scale-105` | indicator triggers | inline | One-off |
| Settings tab `hover:-translate-y-0.5` + huge colored shadow | settings-form | inline | One-off |
| `animate-in fade-in` | create-job dialog | tailwindcss-animate | Fine |
| 3D cabinet/folder drop (`drawer-open`, `folder-drop`, `float`) | create-job success overlay | inline `<style>` | **Out-of-system one-off** |
| `animate-pulse` timeline dot, custom `animate-spin` spinner | workspace | inline | Fine / one-off |
| `borderFlow1–4`, `particleExplosion`, `ringPulse`, `sparkFlash` | globals.css | css-file | **No usages found — dead CSS (verify)** |

### 4.12 Icons

Lucide throughout (consistent library). Sizes drift: 10, 12, 13, 14, 15, 16, 18, 20, 24, 42, 48 px. Cyan `#00cec4` for section icons, orange `#fb923c` for warnings, red for destructive — consistent color language.

---

## 5. Duplicate Patterns (same element, different builds)

1. **Status pill** — 5 implementations (dashboard colored pill · jobs neutral pill · expenses tonal-100 pill · workspace square chip · doc-card 4px chip) + shared `Badge` used only in workflow builder.
2. **Modal** — shared `Modal` vs hand-rolled create-job dialog.
3. **Panel/card shell** — `rounded-xl p-6` vs `rounded-2xl p-4` vs `rounded-3xl`, borders at 8 different opacity steps.
4. **Empty state** — 4 variants.
5. **Tab control** — inset-tint tabs (workspace) vs solid-cyan pill tabs (settings).
6. **Warning indicator popover** — 3 near-identical components (~550 combined lines) differing only in tone/copy.
7. **Input styling** — global cyan CSS vs re-implemented inline clone in create-job-dialog vs `.cha-module` `!important` padding layer on top.
8. **Table wrapper** — DataTable vs canonical shell vs padded-card table vs `cha-jobs-table` CSS override.
9. **Upload dropzone** — dashed `bg-surface` vs dashed `bg-surface-container-low/35` (workspace 4239 vs 4318) vs extension-modal variant.
10. **Priority display** — colored bold text vs muted uppercase text.

## 6. design.md Violations Summary

- **Module theme wrapper**: entire `.cha-module` neon button/input CSS layer (§12.1 "No module-specific theme wrappers").
- **Light-only colors**: `bg-red-50/100`, `border-red-200`, `bg-green-100`, `bg-blue-100`, `bg-orange-100` pills/alerts (expenses, dashboard, workspace, error page); `bg-white` toggle thumb; `bg-slate-950/90`, `text-slate-400`, hard-coded dark hexes in success overlay.
- **Font-weight**: 145× `font-bold/font-semibold`, incl. table cells and stat values.
- **Non-token values**: arbitrary shadows (`0_16px_32px_-22px_…`), 9px/11px font sizes, radius drift, 8-step border-opacity roulette.
- **Duplicate primitives**: hand-rolled modal, hand-rolled status pills instead of `Badge`, one-off toggle switch, one-off spinner.
- **Dead/duplicated CSS**: `.cha-module` padding block ×2, `pulse-ring` keyframes ×2, unused neon-checkbox effect keyframes.

## 7. Keep (reusable, in-system)

- Stat/KPI card assembly (`card-top-accent` + `ds-icon-badge` + `ds-numeric`).
- Canonical `ds-table` shells (customers, do-validity history) and the `DataTable` component usage.
- Filter bar pattern (search input + `FilterMenu` + `DropdownSelect`) on jobs list.
- Job stage stepper and execution timeline (promote to shared components).
- Workflow canvas visual language (nodes, handles, edges, drawers) — internally consistent and theme-token based.
- Warning-indicator *visual* design (tone-tinted trigger + popover) — but collapse 3 copies into 1 parameterized component.
- Upload dropzone (dashed cyan) — pick one variant, promote.
- `.ds-form-section` usage in DO panel / filing details.

## 8. Review Later (one-off / out-of-system) — candidates for removal or replacement

- Entire `.cha-module` neon override layer + `cha-btn-neon-*` (decide: delete, or formalize as sanctioned Button hover in design.md).
- 3D success overlay in create-job-dialog (replace with toast or simple success modal; fix copy typo).
- Settings pill tab bar (align with workspace tab pattern or a shared SegmentedControl).
- `cha-jobs-table-shell/cha-jobs-table` CSS.
- Light-only tonal pills → migrate to `Badge` variants.
- Duplicated globals.css blocks + unused keyframes.
- Ad-hoc `h-7/h-8` button sizes, 9px labels, `font-bold` td cells.
- Custom Toggle (promote a shared Switch to `src/components/ui/` instead).

---
*No CHA business logic, APIs, database access, or permissions were touched. This file + the showcase route are the only additions.*
