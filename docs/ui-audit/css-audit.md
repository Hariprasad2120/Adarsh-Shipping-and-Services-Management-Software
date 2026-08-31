# CSS Audit — `src/app/globals.css`

Date: 2026-08-31. One file, **38,605 lines**. `src/styles/` is physically empty — the
"section files" are pseudo-sections marked by `/* ===== BEGIN src/styles/... ===== */`
comments inside globals.css.

## Imports (globals.css top)

| Line | Import | Status |
|---|---|---|
| 1 | `tailwindcss` | ok (Tailwind v4) |
| 2 | `../../frappe_docker/design/frappe-ui-design-system.css` (29,981 chars) | ok — raw token source of truth |
| 3 | `tw-animate-css` | ok |
| 4 | `shadcn/tailwind.css` | ok |
| 5 | `../styles/dashboard-redesign.css` | **BROKEN — file does not exist.** Remove or restore. |

## Section map

| Section marker | Lines | Size | Verdict |
|---|---|---|---|
| `monolith-tokens.css` | 129–469 | 340 | **KEEP** — semantic `--mn-*` layer, light+dark+violet, well-structured. This is the design-system source of truth. |
| `monolith-system.css` | 471–21,818 | **21,347** | **SPLIT** — shared component styles, heavily bloated with `.mnx-*` page-specific rules that belong in module sections or should die with component migration. |
| `modules/communication-admin.css` | 21,820–25,256 | 3,436 | scope to comms module; audit for dead rules |
| `modules/cha.css` | 25,258–27,002 | 1,744 | keep scoped |
| `modules/accounting.css` | 27,004–27,858 | 854 | keep scoped |
| `modules/freight-forwarding.css` | 27,860–28,385 | 525 | keep scoped |
| `modules/people.css` | 28,387–32,037 | **3,650** | audit — `.mnx-people-*` explosion |
| `modules/performance.css` | 32,039–32,448 | 409 | keep scoped |
| `modules/crm.css` | 32,450–34,916 | 2,466 | keep scoped |
| `legacy-compatibility.css` | 34,918–36,331 | 1,413 | **REMOVE incrementally** — migration debt; no new selectors here |
| `dev-console.css` | 36,333–36,696 | 363 | keep (dev only) |
| `design-system-catalogue.css` | 36,698–37,039 | 341 | keep (catalogue layout only) |
| `animated-login.module.css` | 37,041–38,604 | 1,563 | keep (specialised) |

## Smells (whole file)

| Smell | Count | Action |
|---|---|---|
| `!important` | **548** | reduce to near-zero; each is an override war lost. Migrate the component, delete the `!important`. |
| `[class*=…]` / `[class^=…]` attribute selectors | **106** | fragile; replace with explicit classes on canonical components |
| `@media` blocks | 98 | consolidate into pattern-level responsive rules |
| unique hex colors | **174** | target: only in the token section. All others → semantic tokens. |
| `.mnx-*` page-specific class families | dozens | biggest offenders: `.mnx-dashboard-page-shell` (102 rules), `.mnx-table-card` (43), `.mnx-dashboard-tabs` (33), `.mnx-module-card` (30), `.mnx-accounting-page` (28), `.ff-booking-page-embedded` (27), `.mnx-dashboard-shell` (24), `.mnx-todo-header-graphic` (22), `.mnx-pending-action-row` (22), `.mnx-catalogue-module-card` (22), `.login` (22), `.mnx-workspace-page` (20), `.mnx-people-*` (many). Each = a page that owns its own CSS instead of using a pattern. |

## Token integrity (verified by prior audit, 2026-08-09, still valid)

Chain: `.mnx-*` class → `--mnx-*` local var → `--mn-*` semantic alias → `--frappe-*` raw.
Prior grep: 531 `var(--mn-*/--frappe-*)` vs 17 raw hex in the component layer (comments).
The token discipline in the primitive layer is good; the problem is the volume of
**page-specific composition CSS** layered on top.

## Migration strategy (brief Phase 16 — gradual, by component)

1. Fix the broken import (line 5) — remove it.
2. Freeze `legacy-compatibility.css` and `monolith-system.css` — no new selectors.
3. Per canonical component migrated: move its styles to a clearly-marked component section,
   delete the `.mnx-<page>-*` equivalents, remove associated `!important`.
4. When a `.mnx-<page>-*` family has zero references (grep across `src/`), delete the block.
   Record every removed selector in `docs/ui-audit/migration-status.md`.
5. Do NOT rewrite the token section — it is correct.
6. Long-term: physically split globals.css into real files (`@import`), section by section,
   only once each section is stable.

## Do not

- Discard the `--mn-*` token system because Stitch emits different CSS.
- Add a second global CSS patch.
- Delete a `.mnx-*` block before proving zero usage.
- Replace tokens with raw hex from a Stitch export.
