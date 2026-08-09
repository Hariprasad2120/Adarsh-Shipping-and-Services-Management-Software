# Design System Audit — Component Registry & Duplicate-UI Findings

Date: 2026-08-09

## 1. Component Inventory Summary

21 exported components/primitives across `src/components/ui/*.tsx` (14 files) and `src/components/layout/workspace-dialog.tsx`. Full machine-readable detail in `component-registry.json`.

| Category | Count | Components |
|---|---|---|
| actions | 3 | Button, MonolithAction, MonolithIconAction |
| forms | 7 | Input, DateInput, Textarea, NativeSelect, NeonCheckbox, Label, DropdownSelect (also selection) |
| selection | 1 | DropdownSelect |
| overlays | 3 | DropdownMenu(+subparts), Modal, WorkspaceDialog/WorkspaceDialogLayer |
| data-display | 4 | Badge, MonolithBadge, MonolithSpecLabel, FolderIcon |
| feedback | 2 | Alert, MonolithEmptyState |
| layout | 3 | Card, MonolithPage, MonolithSurface |
| navigation | 0 | none in this folder |

**Styling pattern breakdown:**
- CVA: Button, Alert (2)
- Delegated (thin wrapper over another primitive): Modal, DropdownSelect, FolderIcon (3)
- Hand-rolled (string-concat / lookup table): Card, Badge, Input, DateInput, Textarea, NativeSelect, DropdownMenu, NeonCheckbox, Label, and all of foundation.tsx's 8 exports, WorkspaceDialog (16)

**Token integrity verified:** grepped `monolith-system.css` — 531 occurrences of `var(--mn-*)`/`var(--frappe-*)` vs. 17 raw hex hits (all in comments/non-color contexts). Confirmed the chain `mnx-*` CSS classes → `--mnx-*` local vars (defined in monolith-system.css / modules/crm.css) → `var(--mn-*)` semantic aliases (monolith-tokens.css) → `var(--frappe-*)` raw tokens. No hardcoded colors found in the primitive layer.

**Correction to prior known facts:** the component CSS classes depend on `--mnx-*` (not `--mn-*` directly) as their immediate variable layer; `--mn-*` is one level further down the alias chain. Both are real, just at different tiers.

**Internal duplication already inside the primitive layer** (see §3 for detail): `foundation.tsx`'s `MonolithSurface` vs `Card`, `MonolithBadge` vs `Badge`, and `MonolithAction`/`MonolithIconAction` vs `Button` are three pairs of components in the *same* `src/components/ui/` folder targeting the same visual pattern with different prop APIs (`tone` vs `variant`, string-template vs CVA). This is the highest-leverage, lowest-effort cleanup: reconciling these needs no cross-module hunting, just picking one API per pattern and updating foundation.tsx call sites (WorkspaceDialog itself depends on `MonolithIconAction`/`MonolithSpecLabel`).

## 2. Unmanaged (raw HTML) UI — exhaustive count

Counted via `Grep` (ripgrep) across `*.tsx` for `<button`, `<input`, `<select`, `<textarea`, `<table`, aggregated by top-level directory under `src/app` and `src/modules`. All numbers below are exhaustive matches, not samples.

### src/app (by top-level route/module dir)

| Directory | button | input | select | textarea | table | **Total** |
|---|---:|---:|---:|---:|---:|---:|
| (dashboard)/accounting | 75 | 130 | 8 | 3 | 0 | **216** |
| (dashboard)/admin | 4 | 0 | 0 | 0 | 0 | **4** |
| (dashboard)/dashboard | 5 | 2 | 0 | 0 | 1 | **8** |
| (dashboard)/product-catalogue | 5 | 0 | 0 | 0 | 0 | **5** |
| (dashboard)/todo | 2 | 0 | 0 | 0 | 0 | **2** |
| (dashboard)/cha | 1 | 1 | 0 | 0 | 0 | **2** |
| (dashboard)/crm | 0 | 1 | 0 | 0 | 0 | **1** |
| customer-portal | 0 | 1 | 0 | 1 | 1 | **3** |
| **App totals** | **92** | **135** | **8** | **5** | **2** | **242** |

Notes: `(dashboard)/accounting/configuration/admin/page.tsx` alone accounts for 49 raw `<button>` and 87 raw `<input>` — a single file, single worst offender file-wise. `customization/page.tsx` and `tax-settlement/page.tsx` are the next-heaviest single files.

### src/modules (by top-level module dir)

| Directory | button | input | select | textarea | table | **Total** |
|---|---:|---:|---:|---:|---:|---:|
| hrms | 16 | 1 | 0 | 0 | 1 | **18** |
| cha | 6 | 12 | 1 | 0 | 0 | **19** |
| accounting | 8 | 8 | 0 | 0 | 1 | **17** |
| core | 11 | 1 | 0 | 0 | 0 | **12** |
| mona | 9 | 0 | 0 | 1 | 0 | **10** |
| crm | 0 | 1 | 2 | 1 | 1 | **5** |
| customer-portal | 4 | 0 | 0 | 0 | 0 | **4** |
| auth | 4 | 3 | 0 | 0 | 0 | **7** |
| freight-forwarding | 2 | 1 | 0 | 0 | 2 | **5** |
| people | 1 | 1 | 0 | 0 | 1 | **3** |
| dashboard | 1 | 0 | 0 | 0 | 0 | **1** |
| notifications | 1 | 0 | 0 | 0 | 0 | **1** |
| admin | 0 | 1 | 0 | 0 | 0 | **1** |
| communication | 0 | 1 | 0 | 0 | 0 | **1** |
| performance | 0 | 1 | 0 | 0 | 1 | **2** |
| **Module totals** | **63** | **32** | **3** | **2** | **7** | **107** |

### Combined grand totals (src/app + src/modules)

| Element | Count |
|---|---:|
| `<button>` | 155 |
| `<input>` | 167 |
| `<select>` | 11 |
| `<textarea>` | 7 |
| `<table>` | 9 |
| **Grand total** | **349** |

### Top 5 worst-offender directories overall (raw-element total)

1. **`src/app/(dashboard)/accounting`** — 216 (75 button + 130 input + 8 select + 3 textarea) — dominant hotspot, driven almost entirely by `configuration/admin/page.tsx` (136 elements alone), `customization/page.tsx` (30), `tax-settlement/page.tsx` (22).
2. **`src/modules/cha`** — 19 (6 button + 12 input + 1 select) — concentrated in `labs/import-job-creation/components/tabs/*` (invoice-tab, item-details-tab) and `customs/ui/customs-workspace.tsx`.
3. **`src/modules/hrms`** — 18 (16 button + 1 input + 1 table) — spread across sidebar, top-nav, leave-tracker, attendance-calendar, dashboard-widgets.
4. **`src/modules/accounting`** — 17 (8 button + 8 input + 1 table) — concentrated in `accounting-invoice-form.tsx`, `accounting-items.tsx`, `accounting-commercial-document-form.tsx`.
5. **`src/modules/core`** — 12 (11 button + 1 input) — almost entirely `monolith-app-shell.tsx` (11 raw buttons for shell chrome/nav).

(`src/app/(dashboard)/dashboard` at 8 and `src/modules/mona` at 10 are close runners-up but rank below core/accounting on total volume.)

## 3. Duplicate/Competing Component Findings

| Candidate | Location | Verdict | Reasoning |
|---|---|---|---|
| `CrmDialog` / `CrmDialogLayer` | `src/modules/crm/components/workspace/crm-workspace.tsx` | **Genuine variant** | Composes `WorkspaceDialogLayer` from `src/components/layout/workspace-dialog.tsx` directly; only adds CRM-scoped header chrome/typed props. |
| `AccountingDialog` | `src/modules/accounting/components/accounting-workspace.tsx` (re-exported via `src/components/monolith/accounting-workspace.tsx`) | **Genuine variant** | Composes `WorkspaceDialog` directly (imports `WorkspaceDialog`, `WorkspaceDialogSize`). Pure module-scoped wrapper. |
| `ChaDialogLayer` | `src/modules/cha/components/*` (create-job-dialog.tsx, cha-workspace.tsx, customs-workspace.tsx, create-job-permission-guard.tsx) | **Genuine variant** | Used consistently across 4 CHA files; underlying implementation composes the same dialog-layer pattern (portal + `mnx-dialog*` classes), scoped to CHA workspace chrome. |
| `create-job-dialog.tsx` inline `<form className="mnx-dialog mnx-cha-create-dialog">` markup | `src/modules/cha/components/create-job-dialog.tsx` | **Genuine variant (uses ChaDialogLayer as outer shell)** | The raw `mnx-dialog`/`mnx-dialog-content` classes are applied to inner content wrapped by `ChaDialogLayer`, not a from-scratch modal — consistent with how `WorkspaceDialog` itself composes `mnx-dialog` onto children passed to `WorkspaceDialogLayer`. Not an independent reimplementation of overlay behavior (portal/focus-trap/escape still comes from the shared layer). |
| `ConfirmDialog` (×2: `src/modules/items/components/ConfirmDialog.tsx`, `src/modules/crm/components/quotes/ConfirmDialog.tsx`) | items & crm modules | **Genuine variant** | Both compose `CrmDialog`, not their own markup. Two files sharing a name/shape is a naming collision worth noting (potential confusion / accidental wrong-import risk) but not a styling duplicate. |
| `NewItemDialog.tsx` | `src/modules/items/components/NewItemDialog.tsx` | **Genuine variant** | Composes `CrmDialog`; heavy form composition on top, all shared primitives underneath. |
| `statement-dialog.tsx` (banking import) | `src/app/(dashboard)/accounting/banking/statement-dialog.tsx` | **Genuine variant** | Composes `AccountingDialog` from `src/components/monolith/accounting-workspace.tsx` (confirmed via import list), which itself delegates to `WorkspaceDialog`. |
| 4× CRM lead modals: `convert-modal.tsx`, `follow-up-modal.tsx`, `interested-modal.tsx`, `remarks-modal.tsx` | `src/app/(dashboard)/crm/leads/[id]/` | **Genuine variant** | All compose `CrmDialog`/`CrmButton`/`CrmInput`/`CrmTextarea` from the CRM workspace module rather than raw markup. |
| `form-preview-modal.tsx` | `src/modules/ams/components/form-preview-modal.tsx` | **Genuine variant** | Directly imports and uses `Modal` from `@/components/ui/modal`. Textbook correct usage. |
| **`src/components/data-display/data-table.tsx` (`DataTable`)** vs **`src/components/data-display/operational-data-table.tsx` (`OperationalDataTable`)** | Both in `src/components/data-display/` | **TRUE DUPLICATE** | `DataTable` styles itself with `monolith-card monolith-accent border-mono-border/60 bg-mono-card text-mono-text` — a **different, non-`mnx-*` class vocabulary** (`monolith-*`/`mono-*`) that does not appear to route through the same token chain used everywhere else, and defines its own local `cn()` helper instead of importing `@/lib/utils`. `OperationalDataTable` uses proper `mnx-table-card`/`mnx-operational-table-*` token classes. Both are actively consumed: `DataTable` by 6 files (customer-portal dashboard/shipments pages, clickable-row), `OperationalDataTable` by 11 files (CHA, CRM, freight-forwarding, HRMS). Two parallel "shared" table systems living in the same folder is the clearest true duplication found in this audit. |
| `MonolithSurface` (foundation.tsx) vs `Card` (card.tsx) | both `src/components/ui/` | **TRUE DUPLICATE (primitive-layer)** | Both render `className="mnx-panel ..."`; `MonolithSurface` adds a polymorphic `as` prop and an `interactive` data-attribute that `Card` lacks, but otherwise identical token target. Two APIs, one visual primitive. |
| `MonolithBadge` (foundation.tsx) vs `Badge` (badge.tsx) | both `src/components/ui/` | **TRUE DUPLICATE (primitive-layer)** | Same `mnx-badge` + tone/variant classes, different prop name (`tone` vs `variant`) and different default behavior (`Badge` defaults to a styled variant; `MonolithBadge` has no default and renders bare `mnx-badge` if `tone` is omitted). |
| `MonolithAction`/`MonolithIconAction` (foundation.tsx) vs `Button` (button.tsx, `mode="icon"`) | both `src/components/ui/` | **TRUE DUPLICATE (primitive-layer)** | Same `mnx-button`/`mnx-button-*`/`mnx-icon-button` classes; `Button` uses CVA with a `mode` prop for the icon case, `MonolithAction`/`MonolithIconAction` hand-roll the same via string templating as two separate components. `WorkspaceDialog` itself depends on `MonolithIconAction`, so this duplicate is load-bearing for the dialog primitive and can't be deleted outright without updating `workspace-dialog.tsx`. |
| `ItemsTable.tsx`, `LineItemsTable.tsx`, `users-table.tsx` (`UsersTable`) | items/crm/hrms modules | **Genuine variant** | All compose module-scoped table wrappers (`CrmTable`, `PeopleControlTable`) rather than raw `<table>` markup or a competing table primitive. |

**Summary: 4 true duplicates found** — the DataTable/OperationalDataTable pair (cross-module, highest impact since both are "shared" folder components with real consumers on both sides) plus 3 primitive-layer duplicate pairs entirely inside `src/components/ui/foundation.tsx` vs. its sibling files (Surface/Card, Badge/Badge, Action/Button). Everything else investigated under *Modal/Dialog/ConfirmDialog naming turned out to be genuine module-scoped composition over the shared `WorkspaceDialog` primitive — the dialog consolidation from the "Redesign" work evidently already succeeded; duplication risk is now concentrated in the table layer and in `foundation.tsx`'s overlap with the primary `ui/` primitives.

## 4. WorkspaceDialog API (referenced by Modal)

`src/components/layout/workspace-dialog.tsx` exports two pieces:

- **`WorkspaceDialogLayer`** — headless/layout primitive. Props: `children`, `className`, `describedBy`, `labelledBy`, `onClose`, `open`, `size?: WorkspaceDialogSize`, `style?`. Handles: `createPortal` to `document.body`, backdrop click-to-close, Escape-to-close, full Tab/Shift+Tab focus trap scoped to the dialog surface (filters hidden/`aria-hidden` elements), autofocus on open via `requestAnimationFrame`, restores previously-focused element on close, and a **ref-counted document body scroll lock** (`bodyLockDepth`) that correctly supports nested/stacked dialogs without fighting each other over `overflow`/`padding-right`.
- **`WorkspaceDialog`** — chrome layer on top of `WorkspaceDialogLayer`. Adds `title`, `description?`, `eyebrow` (required), `footer?`. Generates accessible `id`s via `React.useId()` for `aria-labelledby`/`aria-describedby`. Renders a `<header>` with `MonolithSpecLabel` (eyebrow) + `<h2>` (title) + optional `<p>` (description) + a `MonolithIconAction` close button, then `<div className="mnx-dialog-content">{children}</div>`, then optional `<footer>`.

**`WorkspaceDialogSize`** = `"compact" | "default" | "wide" | "workspace"` — applied as `mnx-dialog-surface-{size}` on the portal surface. `Modal` (`components/ui/modal.tsx`) forwards this type verbatim as its own `size` prop and otherwise just renames/passes through `title`/`description`/`eyebrow` (defaulting `eyebrow` to `"Workspace action"`) — confirmed pure delegation, no independent logic.

## 5. Prioritized Recommendations

1. **Migrate `src/app/(dashboard)/accounting/configuration/admin/page.tsx` first.** Single file, 136 raw elements (49 button + 87 input) — by far the single largest concentration of unmanaged UI in the codebase (>27% of total combined raw-element count comes from the accounting directory alone, and this one file is more than half of that directory's total). Highest blast-radius-per-file ratio in the whole audit; fixing it alone would cut total raw-input count by ~52% and raw-button count by ~32%.
2. **Migrate the rest of `src/app/(dashboard)/accounting`** (`customization/page.tsx`: 30 elements, `tax-settlement/page.tsx`: 22, `capabilities/page.tsx`: 17, `currency-adjustments/page.tsx`: 9, plus banking/accounts/journal-entries files) as a second wave. This directory alone is 216 of the 349 total raw elements found (62%) — consolidating it is the single highest-leverage module-wide investment available.
3. **Resolve the `DataTable` vs `OperationalDataTable` split** before either grows further. `DataTable` uses an entirely separate, non-token (`monolith-*`/`mono-*`) class vocabulary from the rest of the design system and sits in the same shared folder as the token-correct `OperationalDataTable`. Recommend deprecating `DataTable`, porting its 6 consumers (customer-portal dashboard/shipments, `clickable-row.tsx`) to `OperationalDataTable`, and deleting the legacy file — this also removes the only non-`mnx-*` styling vocabulary found anywhere in the shared component layer.
4. **Reconcile `foundation.tsx`'s three duplicate pairs** (`MonolithSurface`/`Card`, `MonolithBadge`/`Badge`, `MonolithAction`+`MonolithIconAction`/`Button`) since this is entirely internal to `src/components/ui/` — no cross-module hunting needed, just picking one canonical API per pattern (recommend keeping `Button`/`Badge`/`Card` as the canonical CVA/simple API and either deleting or re-implementing the `Monolith*` foundation exports as re-export shims, matching the pattern already proven safe for `components/monolith/button.tsx`). Note `WorkspaceDialog` itself depends on `MonolithIconAction`/`MonolithSpecLabel`, so those two specifically should become shims rather than being deleted outright.
5. **Tackle `src/modules/cha` and `src/modules/hrms` next** (19 and 18 raw elements respectively) as the top module-level (non-app-route) offenders — `cha/labs/import-job-creation` tabs and `hrms` sidebar/top-nav/leave-tracker/attendance-calendar are the concentration points within each.
