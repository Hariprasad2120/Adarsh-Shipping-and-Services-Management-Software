# Monolith Repository Cleanup Log

> Living document. Updated continuously during the Production Preparation / Repository
> Cleanup phase. **No file is ever permanently deleted** — inactive code goes to a
> module `Scrap/` folder, miscellaneous preserved files go to `Extra files/`.

## Cleanup Status

| Field | Value |
|---|---|
| Current phase | **Checkpoint — STEP 5 + STEP 6 (freight-forwarding, accounting inspected) + full `npm run build` GREEN.** |
| Last updated | 2026-08-29 |
| Production build status | ✅ **`npm run build` (`prisma generate && next build`) exit 0** — full route table generated, no errors. Plus `architecture:check` ✅, `tsc --noEmit` ✅, `eslint` ✅ 0 errors. Known-good state banked. |
| Files deleted | **0** |
| Files moved | **16** (batch 1 → `Extra files/`) + **24** (batch 2 git-mv renames) |

### Execution-order progress

- [x] STEP 1 — Repository mapping
- [x] STEP 2 — Dependency / usage mapping
- [x] STEP 3 — Design System audit
- [x] STEP 4 — Complete UI inventory
- [x] **STEP 7 batch 1 — root clutter → `Extra files/`**
- [x] **STEP 6 batch 2 — `src/components/monolith/` reorg + full `architecture:check` cleanup**
- [x] **STEP 5 — duplicate primitives `@deprecated`-tagged** (full call-site migration deferred — rationale in "Duplicate Implementations Found")
- [~] STEP 6 cont. — Module-by-module. Done: `freight-forwarding` (compliant, no action). Remaining: 23 modules.
- [ ] STEP 7 cont. — `Extra files/` (further passes if needed)

### Per-module STEP 6 — approach learned from `freight-forwarding`

Well-built modules (namespaced `.xx-*` CSS that is mostly **layout composition**,
few raw controls, own `components/index.ts` barrel, flat structure) need
**verification only**, not reorg.

### Repo-wide module sweep (2026-08-29) — cruft check

Ran versioned/backup-filename scan (`-old / -backup / -copy / -v2 / -deprecated /
.bak / -wip / -tmp`) across all 25 modules:

- **0 hits in 24 modules.** Only `accounting` has 1 —
  `authorization-planning/responsibility-backup.ts`, already verified ACTIVE
  (domain concept, not a file backup).
- No `-old` / `-new` / duplicate-implementation files anywhere in `src/modules/`.
- 7 modules have `components/index.ts` barrels (cha, crm, freight-forwarding, items,
  mona, people, performance); 18 do not — but 6 of those are ≤4 files. Adding the
  rest is a low-risk navigability nicety, **not** required by
  `verify-code-organization.mjs` for `src/app → module` imports.

**Conclusion:** the repository is already maintained to a high structural bar
(dedicated `architecture:check` / `design-system:verify` tooling, ownership audits).
The one genuine structural problem — `src/components/monolith/` — is fixed (batch 2).
Remaining STEP 6 work is largely **verification + documenting the design-migration
debt** (raw `<button>/<input>` → DS primitives), which is a separate,
behavior-sensitive effort that must NOT be done under the "don't rewrite features"
constraint of this cleanup.

### `accounting` — inspected 2026-08-29

| Aspect | Finding |
|---|---|
| Structure | 47 flat top-level `.ts` (coherent domain split: `banking-*`, `recurring-*`, `operational-*`, `tax-*`, `configuration-*`, `document-*`), + `components/` (13), `components/routes/` (2), `authorization-planning/` (barrel), `migration/` (14), `rollout/` (8), `__tests__/` (26). |
| `migration/` + `rollout/` | **Not imported by any runtime `src/` code** — only by `scripts/accounting-phase*` deployment tooling (wired into `package.json` `accounting:phase6/7/8/9:*` scripts). **Operational, keep active.** Arguably belongs under `scripts/` but relocation risks the phase tooling; documented, left in place. |
| Misplaced files | None (the batch-2 relocations landed here correctly). |
| `accounting.css` (853 lines) | 57 selectors, ~146 layout-prop vs ~83 visual-prop lines; `hex=0, px=19` (token-clean). Visual rules use semantic `var()`. **KEEP as module-local** (layout composition), same verdict as `freight-forwarding.css`. |
| Raw controls | ~216 in `src/app/(dashboard)/accounting/**` route files (not the module). Worst: `configuration/admin/page.tsx` (49 `<button>` + 87 `<input>`). **Logged as design-migration debt — separate effort.** |
| Verdict | **No structural reorg needed.** |

Effort still concentrates (for the future DS-migration effort, not this cleanup) in:
`accounting` route raw-controls, `communication` (3435-line `communication-admin.css`),
`people` (3649-line CSS + 15 raw hex), `hrms` (80 files), `cha` (1741-line
`cha-expense.css` covering 2 modules — split candidate).
- [ ] STEP 8 — Full Design System review
- [ ] STEP 9 — Repository-wide CSS re-scan
- [ ] STEP 10 — Verify Design System coverage
- [ ] STEP 11 — Production validation
- [ ] STEP 12 — Final report

---

## ⚠️ Blocking coordination notes (read before any file move)

1. **Concurrent Codex agent.** Another agent edits this repository live. User
   confirmed 2026-08-29 it is currently idle. Re-confirm idle immediately before
   each file-move batch; a bulk move colliding with its uncommitted work produces
   an un-reviewable merge.
2. **Scale.** ~2,089 `.ts/.tsx` files, 25 modules, 15 `.css` files, 103 test files,
   103 scripts. A full reorg + design-system consolidation is a multi-batch program,
   not a single pass. Each module batch ends with `npm run quality` (or the subset
   that is feasible) before the next begins.
3. **`npm run build` cost.** Full build runs `prisma generate && next build` on a
   large App Router app. Budget accordingly; prefer `typecheck` + `lint` +
   `architecture:check` for fast inner-loop validation, full `build` at batch
   boundaries.

---

## Repository Structure Before Cleanup

### Already good (the target architecture largely exists)

- **Module-based domain code**: `src/modules/<module>/` for 25 modules, most with
  `components/`, `__tests__/`, and domain subdirs (`actions`, `services`, `config`,
  `pdf`, `hooks`, …).
- **Design System core**: `src/components/ui/*.tsx` (19 files, ~21 primitives) +
  `src/styles/monolith-tokens.css` (tokens) + `src/styles/monolith-system.css`
  (~493 KB component/utility CSS) + `src/styles/legacy-compatibility.css`.
- **Design System showcase**: `src/app/(dashboard)/admin/design-system/` (page +
  client + specimen + `design-system.css` + `design-system-catalogue.css`).
- **Prior audits already written**: `scratchpad-design-system-audit.md`,
  `docs/MONOLITH_UI_DESIGN_SYSTEM.md`, `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-component-and-style-ownership-audit.md`, `docs/ui-migration-*.md`,
  `docs/ui-route-audit.md`.
- **Verification tooling** (package.json): `architecture:check`
  (`scripts/verify-code-organization.mjs`), `design-system:verify`
  (`verify-design-system-coverage.mjs` + `verify-catalogue-style-boundary.mjs`),
  `test:design-system:parity`, `audit:unused`, `audit:structure`.

### Problems identified (to be addressed in later steps)

| # | Problem | Evidence |
|---|---|---|
| P1 | **Root directory is a dumping ground.** Binaries, a PPTX, PDFs, and ~10 stale prompt/planning `.md` files sit at repo root. | `Installer.exe`, `Microsoft.Services.Store.winmd`, `Adarsh-InHouse-Software-Costing-Proposal.pptx`, `Monolith-Engine-Documentation.pdf`, `Monolith-Engine-Workflow-Diagrams.pdf`, `AGENTS v1.md`, `AMS_TASK.md`, `TASK.md`, `Claude Master Prompt — ….md`, `Claude Phase-by-Phase Prompt — ….md`, `Codex Master Prompt — ….md`, `WORK_PET_ARCHITECTURE_ANALYSIS.md`, `WORK_PET_IMPLEMENTATION_PLAN.md`, `VERCEL_MIGRATION_AUDIT.md`, `frappe-ui-design-system.{css,md}`, `scratchpad-design-system-audit.md` |
| P2 | **Module-specific components living in the shared layer.** `src/components/monolith/` holds `accounting-*`, `cha-workspace`, `crm-workspace`, `people-*`, `vendor-master-create-form`, `customer-portal-workspace` — domain UI, not shared primitives. | `ls src/components/monolith` |
| P3 | **Two parallel primitive APIs in the same folder.** `foundation.tsx` exports `MonolithSurface`/`MonolithBadge`/`MonolithAction`/`MonolithIconAction` that duplicate `Card`/`Badge`/`Button` (tone-string vs CVA). | `scratchpad-design-system-audit.md` §1, §3 |
| P4 | **~242 raw `<button>/<input>/<select>/<textarea>/<table>` in `src/app`, ~107 in `src/modules`** — unmanaged UI bypassing the Design System. | `scratchpad-design-system-audit.md` §2 |
| P5 | **7 per-module CSS files** in `src/styles/modules/` + 2 in the design-system route + `dev-console.css` + one `.module.css` in auth. Need classification: layout-only (keep) vs. visual redefinition (migrate to DS). | `find src -name "*.css"` |
| P6 | **`src/generated/`** — needs confirmation it is build-time generated (gitignored / reproducible) vs. hand-maintained. | `ls src` |
| P7 | **Duplicate design-system doc set** split across `docs/` and root — no single index. | `ls docs`, `ls *.md` |
| P8 | **`vercel.json` + `vercel.pro.json`** — two Vercel configs; need to confirm which is authoritative. | root |
| P9 | Very light versioned-file cruft in `src/` — only `src/modules/accounting/authorization-planning/responsibility-backup.ts` matches a `-backup` pattern and needs a usage trace. | `find src -name "*-backup*"` |

---

## Repository Structure After Cleanup

_To be written as steps complete. Intended end state:_

- `src/modules/<module>/` owns all domain UI + logic (module workspace components
  currently in `src/components/monolith/` relocated here).
- `src/components/ui/` (+ `styles/monolith-*.css` + `tokens`) is the **single source
  of visual truth**; one primitive per pattern (P3 resolved).
- Root contains only framework/tooling-required files; everything else in
  `Extra files/` or `docs/`.
- Each module has a `Scrap/` folder for its own superseded-but-preserved code.
- `Extra files/` at repo root holds preserved non-production material, categorized.

---

## STEP 2 — Dependency / Usage Mapping (findings)

### Convention-bound / generated / untracked — DO NOT MOVE

| Path | Finding | Rule |
|---|---|---|
| `src/app/**` | Next.js App Router — `page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `(group)` dirs, `[param]` dirs | never move; filesystem = routing |
| `src/app/api/**` | route handlers | never move |
| `src/generated/prisma/**` | **untracked** (0 files in git), gitignored via `/src/generated/prisma`; produced by `npm run db:generate` (`prisma generate`), which `npm run build` runs first | never move; never commit; regenerates |
| `prisma/migrations/**` | DB history | never move |
| `vercel.json`, `vercel.pro.json` | **untracked** (`.gitignore` `*.json` blocklist, not in allowlist). `vercel.pro.json` not referenced by any script/CI — a local variant, not wired in | out of repo-cleanup scope; leave in place |
| `Installer.exe` | **untracked** local binary | leave (not in git) |
| `frappe_docker/design/frappe-ui-design-system.css` + `.md` | **tracked, PRODUCTION dependency** — imported by `src/app/globals.css:2` | never move |
| `src/generated/` (non-prisma, if any) | only `prisma/` subdir present | n/a |

### Dynamic / indirect resolution

- 90 `import(` call-sites, 3 `next/dynamic` — spot-checked, all point at real modules
  with static specifiers (no string-built paths). Safe, but re-verify per module in STEP 6.
- CSS is a **single global cascade**: everything loads through `src/app/globals.css`
  `@import` chain — `tailwindcss` → `frappe-ui-design-system.css` → `monolith-tokens.css`
  → `monolith-system.css` → 7 `styles/modules/*.css` → `legacy-compatibility.css`.
  Module CSS is **not** scoped or lazy. Renaming/moving any of these files requires
  editing the `globals.css` import list.

### `src/components/monolith/` — the "canonical public API" barrel (P2 refined)

`src/components/monolith/index.ts` is a **deliberate facade barrel** re-exporting from
`@/components/ui`, `@/components/layout`, `@/components/feedback`, `@/components/forms`,
`@/components/data-display`, `@/components/navigation`, **and `@/modules/*/components/*`**.
**111 files import from `@/components/monolith`.** It is load-bearing — keep the barrel;
relocation work happens *behind* it.

Files physically in `src/components/monolith/`:

| File | Lines | Nature | Proposed later action |
|---|---:|---|---|
| `cha-workspace.tsx` | 1 | re-export shim → `@/modules/cha/.../cha-workspace` | fold shim into `index.ts`, delete-to-Scrap the 1-liner |
| `crm-workspace.tsx` | 1 | shim → module | same |
| `accounting-workspace.tsx` | 1 | shim → module | same |
| `people-workspace.tsx` | 1 | shim → module | same |
| `customer-portal-workspace.tsx` | 151 | **real impl** misplaced | move to `src/modules/customer-portal/components/`, keep barrel export path |
| `vendor-master-create-form.tsx` | 1116 | **real impl** misplaced | move to `src/modules/accounting/components/` (vendor master is accounting) |
| `accounting-workflow-cards.tsx` | 45 | **real impl** | move to `src/modules/accounting/components/` |
| `accounting-operational-actions.tsx` | — | **real impl** | move to accounting module |
| `accounting-operational-views.tsx` | — | **real impl** | move to accounting module |
| `accounting-optional-invoice-link.tsx` | — | **real impl** | move to accounting module |
| `accounting-note-reason-select.tsx` (+ `.test.tsx`) | — | **real impl** | move to accounting module |
| `badge.tsx`, `button.tsx`, `input.tsx`, `textarea.tsx`, `date-input.tsx`, `dropdown-menu.tsx`, `neon-checkbox.tsx`, `file-upload-field.tsx`, `workspace.tsx` | — | shims/re-exports over `@/components/ui` + `@/components/layout` | keep as compat shims OR collapse into `index.ts`; low priority |
| `catalogue/` | dir | catalogue UI | classify in STEP 6 (product-catalogue) |

### Misleading names — verified ACTIVE, do not Scrap

| File | Why it looks removable | Actual status |
|---|---|---|
| `src/modules/accounting/authorization-planning/responsibility-backup.ts` | `-backup` suffix | **live** — imported by `authorization-request.ts:19` and re-exported from `authorization-planning/index.ts:6`. Name refers to the *domain concept* "responsibility backup" (approver fallback), not a file backup. Consider renaming later; keep active now. |
| `src/modules/ams/form-template.ts`, `self-form-template.ts` | "template" | live domain code |
| `src/modules/hrms/letter-template-*.ts` | "template" | live domain code |
| `src/modules/payroll/components/salary-templates-client.tsx`, `assign-template-control.tsx` | "template" | live feature |

### Root-level TRACKED files — candidates for `Extra files/` (STEP 7, needs greenlight)

| File | Reason | Verified not-required-by |
|---|---|---|
| `frappe-ui-design-system.css` (root, 955 lines, Aug 25) | **stale duplicate** — the live copy is `frappe_docker/design/frappe-ui-design-system.css` (1070 lines, Aug 28), which is what `globals.css` imports. Root copy imported nowhere. | `grep` of `src/`, `globals.css`, `next.config.ts`, `package.json` |
| `frappe-ui-design-system.md` (root) | doc for the stale root css | — |
| `Microsoft.Services.Store.winmd` | Windows SDK binary, no code reference | grep |
| `Adarsh-InHouse-Software-Costing-Proposal.pptx` | sales proposal, not code | — |
| `Monolith-Engine-Documentation.pdf`, `Monolith-Engine-Workflow-Diagrams.pdf` | reference PDFs → `Extra files/References/` | — |
| `AGENTS v1.md` | superseded by `AGENTS.md` | — |
| `AMS_TASK.md`, `TASK.md` | completed task specs → `Extra files/Documentation/` | — |
| `WORK_PET_ARCHITECTURE_ANALYSIS.md`, `WORK_PET_IMPLEMENTATION_PLAN.md` | planning docs for a shipped feature | — |
| `VERCEL_MIGRATION_AUDIT.md`, `VERCEL_DEPLOYMENT.md` | keep `VERCEL_DEPLOYMENT.md` at root (operational); `VERCEL_MIGRATION_AUDIT.md` → `Extra files/` | — |
| `Claude Master Prompt — ….md`, `Claude Phase-by-Phase Prompt — ….md`, `Codex Master Prompt — ….md` | historical prompt specs → `Extra files/Documentation/prompts/` | — |
| `scratchpad-design-system-audit.md` | superseded once STEP 3 lands in `docs/` | keep until DS audit migrated |

**Keep at root:** `README.md`, `AGENTS.md`, `CLAUDE.md`, `Dockerfile`, `docker-compose.yml`,
`next.config.ts`, `tsconfig*.json`, `eslint.config.mjs`, `postcss.config.mjs`,
`vitest*.config.ts`, `prisma.config.ts`, `next-env.d.ts`, `.env*`, `package*.json`.

---

## STEP 3 — Design System Audit

### Canonical DS surface (today)

| Layer | Location | Public entry |
|---|---|---|
| Tokens | `src/styles/monolith-tokens.css` (12 KB) + `frappe_docker/design/frappe-ui-design-system.css` (raw `--frappe-*`) | CSS `var()` |
| Component/utility CSS | `src/styles/monolith-system.css` (~493 KB) | `.mnx-*` classes |
| React primitives | `src/components/ui/*.tsx` → `src/components/ui/index.ts` | `@/components/ui` |
| Facade barrel | `src/components/monolith/index.ts` | `@/components/monolith` (111 importers) |
| Showcase | `src/app/(dashboard)/admin/design-system/` | route `/admin/design-system` |
| Docs | `docs/MONOLITH_UI_DESIGN_SYSTEM.md`, `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`, `docs/ui-component-and-style-ownership-audit.md`, `scratchpad-design-system-audit.md` | — |

### Primitives exported from `@/components/ui`

`Alert, Badge, Button, Card, DateInput, DropdownMenu(+subparts), DropdownSelect,
FolderIcon, foundation.tsx (MonolithSurface, MonolithBadge, MonolithAction,
MonolithIconAction, MonolithSpecLabel, MonolithPage, MonolithEmptyState, +1),
Input, Label, Modal, MonolithIcon, NativeSelect, NeonCheckbox, Tabs, Textarea`
— ~21 primitives / 17 files. (Tabs added since the prior audit's count of 21.)

### Duplicate primitives (highest-leverage fix — STEP 5)

| Pattern | CVA/canonical | Duplicate (foundation.tsx) | API divergence |
|---|---|---|---|
| Card / surface | `card.tsx` `Card` | `MonolithSurface` | `variant` (CVA) vs `tone` (string template) |
| Badge | `badge.tsx` `Badge` | `MonolithBadge` | same |
| Button | `button.tsx` `Button` | `MonolithAction`, `MonolithIconAction` | same; `WorkspaceDialog` depends on `MonolithIconAction` |

Resolution deferred to STEP 5: pick one API per pattern, update `foundation.tsx`
internal call-sites + `WorkspaceDialog`, keep old names as thin deprecated aliases.

### DS coverage gaps (recurring patterns with NO shared primitive)

From `scratchpad-design-system-audit.md` §2 + this pass:

- **Table** — 9 raw `<table>` + many `.mnx-*-table` CSS variants per module; no
  `<DataTable>` primitive. Biggest gap.
- **Toast/Notification** — `sonner` used directly (`import { toast } from "sonner"`)
  across modules; no DS wrapper.
- **Tooltip / Popover** — ad-hoc per module (`warning-indicator-popover` exists in
  `components/feedback` but not generalized).
- **Drawer / Side sheet** — module-local.
- **Stepper / Workflow-stage indicator** — accounting + cha each roll their own
  (`accounting-workflow-cards`, cha job stages, catalogue stages).
- **Pagination** — `ItemsPagination`, `QuotesIndexPage` etc. each local.
- **File upload** — `components/forms/file-upload/*` exists; not all modules use it.
- **Empty state** — `MonolithEmptyState` exists + `.mnx-workspace-state-*`; partially adopted.
- **Page header / Section header** — `.mnx-page-header-icon` + per-module
  `.mnx-*-page-header` compounds (see icon note); `PerformanceSectionHeader` etc.
  are module-specific copies of one pattern.
- **Icon** — `<MonolithIcon />` canonical; ~384 files still import `lucide-react`
  directly (most legitimately, for inline/functional glyphs).

### Already done this cleanup (2026-08-29, CSS-only, no behavior change)

- Unified ~40 divergent decorative icon-container classes (`mnx-icon-badge`,
  `mnx-icon-chip`, `mnx-*-icon`, `mnx-performance-summary` heading, per-module
  `mnx-*-page-header .mnx-page-header-icon`) onto one spec in `monolith-system.css`.

---

## STEP 4 — Complete UI Inventory

### CSS files (15) — classification

| File | Lines | Class | Notes |
|---|---:|---|---|
| `styles/monolith-tokens.css` | ~400 | **Foundation** | keep |
| `frappe_docker/design/frappe-ui-design-system.css` | 1070 | **Foundation** (raw tokens) | keep; consider relocating into `src/styles/` in a later step (would touch `globals.css:2`) |
| `styles/monolith-system.css` | ~12k | **DS core** | keep; large — could split by concern later |
| `styles/legacy-compatibility.css` | ~1.5k (52 KB) | **Transitional** | header says "temporary … new components must not add here". Audit for dead selectors; target removal. |
| `styles/modules/accounting.css` | 853 | module | hex=0, px=19 — mostly tokenized; classify layout vs visual in STEP 6 |
| `styles/modules/cha-expense.css` | 1741 | module (**two modules**) | px=236 — heavy raw spacing; split cha vs expense later |
| `styles/modules/communication-admin.css` | 3435 | module | px=90 |
| `styles/modules/crm.css` | 2465 | module | hosts `--mnx-*` local vars per prior audit; px=68 |
| `styles/modules/freight-forwarding.css` | 524 | module | px=14 |
| `styles/modules/people.css` | 3649 | module | **hex=15** (only module CSS with raw colors), px=85 |
| `styles/modules/performance.css` | 408 | module | px=12 |
| `app/globals.css` | ~30 | **Global entry** | keep |
| `app/(dashboard)/admin/design-system/design-system.css` | — | showcase-local | keep |
| `app/(dashboard)/admin/design-system/design-system-catalogue.css` | — | showcase-local | keep |
| `components/dev-console/dev-console.css` | — | dev tool | keep |
| `modules/auth/components/animated-login.module.css` | — | **only `.module.css` in repo** | classify — likely keeps as scoped module style for the login animation |

Module CSS total ≈ **15,100 lines / 1,955 rules** across 7 files. Near-zero hardcoded
colors (good token discipline) but significant raw `px` spacing (tokenize in STEP 6).
Modules with **no dedicated CSS** (rely on `monolith-system.css` + Tailwind, the target
state): ams, hrms, leave, payroll, items, mona, dashboard, todo, notifications, admin,
auth, core, google-chat, incentives, recruit, customer-portal, attendance.

### Inline `style={{…}}` — contained

~18 module files (crm 6, mona 6, communication 2, hrms 2, ams 1, cha 1) + ~24
`src/app` files, concentrated in `graphics/` (chart) dirs, `crm/leads/[id]`,
`dashboard/graphics`. Most are computed/dynamic values (chart geometry, progress
widths) — legitimate. Enumerate per module in STEP 6; migrate only static ones.

### Icons

- Libraries: `lucide-react` is the standard (imported in ~384 files). No heroicons /
  react-icons / tabler / phosphor found. Custom SVGs: `folder-icon.tsx`, a few module
  glyphs, dev-console.
- Canonical: `<MonolithIcon />` (`src/components/ui/monolith-icon.tsx`).
- Gap: no `<Icon name="…" />` registry indirection; decorative-vs-functional split not
  enforced. Decorative CSS containers unified 2026-08-29.

### Typography / fonts

- To inventory in STEP 6: `next/font` config, `font-family` declarations, size/weight
  scales in `monolith-tokens.css` vs raw values in module CSS.

### Raw unmanaged form controls (from prior audit, still valid)

`<button>` 155 · `<input>` 167 · `<select>` 11 · `<textarea>` 7 · `<table>` 9.
Worst single file: `app/(dashboard)/accounting/configuration/admin/page.tsx`
(49 `<button>`, 87 `<input>`).

---

## Module Inspection Checklist

Generated from `src/modules/` (file counts = `.ts`+`.tsx`).

| Module | Files | Has tests | Status |
|---|---:|:---:|---|
| accounting | 113 | ✔ | ✅ **inspected — no structural reorg needed** (2026-08-29); route raw-controls logged as separate DS-migration debt |
| admin | 2 | ✗ | ☐ not started |
| ams | 20 | ✔ | ☐ not started |
| attendance | 1 | ✗ | ☐ not started |
| auth | 4 | ✗ | ☐ not started |
| cha | 71 | ✔ | ☐ not started |
| communication | 8 | ✔ | ☐ not started |
| core | 12 | ✗ | ☐ not started |
| crm | 69 | ✔ | ☐ not started |
| customer-portal | 16 | ✔ | ☐ not started |
| dashboard | 10 | ✗ | ☐ not started |
| expense | 1 | ✗ | ☐ not started |
| freight-forwarding | 10 | ✗ | ✅ **inspected — compliant, no action** (2026-08-29) |
| google-chat | 8 | ✗ | ☐ not started |
| hrms | 80 | ✔ | ☐ not started |
| incentives | 2 | ✗ | ☐ not started |
| items | 18 | ✗ | ☐ not started |
| leave | 44 | ✔ | ☐ not started |
| mona | 29 | ✔ | ☐ not started |
| notifications | 3 | ✗ | ☐ not started |
| payroll | 65 | ✗ | ☐ not started |
| people | 4 | ✗ | ☐ not started |
| performance | 5 | ✗ | ☐ not started |
| recruit | 4 | ✗ | ☐ not started |
| todo | 1 | ✗ | ☐ not started |

### Cross-cutting areas (also require inspection)

- [ ] `src/app/` route tree (App Router — files are convention-bound, **do not move**)
- [ ] `src/app/api/` route handlers
- [ ] `src/components/` shared layer (`ui`, `monolith`, `data-display`, `feedback`,
      `forms`, `layout`, `navigation`, `providers`, `dev-console`)
- [ ] `src/lib/` shared utilities
- [ ] `src/types/` shared types
- [ ] `src/generated/` (classify: generated vs. maintained)
- [ ] `src/styles/` (tokens, system, legacy-compat, per-module)
- [ ] `src/proxy.ts` (root of `src`)
- [ ] `prisma/` — schema, migrations, seeds (**highly conservative; do not move
      migration history**)
- [ ] `scripts/` (103 files — many are one-off accounting phase scripts)
- [ ] `public/` assets (verify references before any relocation)
- [ ] root config (`next.config.ts`, `tsconfig*.json`, `eslint.config.mjs`,
      `vitest*.config.ts`, `postcss.config.mjs`, `vercel*.json`, `Dockerfile`,
      `docker-compose.yml`, `prisma.config.ts`)
- [ ] `mobile/` (separate Android app — out of scope unless directed)
- [ ] `frappe_docker/` (vendored — classify)
- [ ] `docs/` consolidation

---

## Files Moved to Scrap

_None yet._

## Files Moved to Extra files

Batch 1 — 2026-08-29. All via `git mv` (history preserved). `Extra files/` added to
`.vercelignore`. Index written at `Extra files/README.md`. Verified: `git grep` finds
no code/config/CI reference to any moved path; `src/app/globals.css` imports the
*other* frappe css (`frappe_docker/design/…`), not the moved root copy.

| Original Location | New Location | Reason |
|---|---|---|
| `Monolith-Engine-Documentation.pdf` | `Extra files/References/` | reference PDF, not code |
| `Monolith-Engine-Workflow-Diagrams.pdf` | `Extra files/References/` | reference PDF |
| `Adarsh-InHouse-Software-Costing-Proposal.pptx` | `Extra files/References/` | sales deck |
| `frappe-ui-design-system.css` | `Extra files/Legacy/` | **stale duplicate** — live copy is `frappe_docker/design/frappe-ui-design-system.css` (imported by `globals.css:2`); root copy imported nowhere |
| `frappe-ui-design-system.md` | `Extra files/Legacy/` | doc for the stale css |
| `AGENTS v1.md` | `Extra files/Legacy/AGENTS-v1.md` | superseded by root `AGENTS.md` (renamed: space → dash) |
| `Microsoft.Services.Store.winmd` | `Extra files/Legacy/` | stray Windows SDK binary, no reference |
| `AMS_TASK.md` | `Extra files/Documentation/` | completed task spec |
| `TASK.md` | `Extra files/Documentation/` | completed task spec |
| `WORK_PET_ARCHITECTURE_ANALYSIS.md` | `Extra files/Documentation/` | analysis for a shipped feature |
| `WORK_PET_IMPLEMENTATION_PLAN.md` | `Extra files/Documentation/` | plan for a shipped feature |
| `VERCEL_MIGRATION_AUDIT.md` | `Extra files/Documentation/` | completed migration audit (kept `VERCEL_DEPLOYMENT.md` at root — operational) |
| `Claude Master Prompt — Build Enterprise Leave Management for Monolith ERP.md` | `Extra files/Documentation/prompts/` | historical build prompt |
| `Claude Phase-by-Phase Prompt — Rebuild Zoho Payroll Experience as Native Monolith Payroll.md` | `Extra files/Documentation/prompts/` | historical build prompt |
| `Codex Master Prompt — Monolith Automated Enquiry Rate Acquisition & Pricing Intelligence.md` | `Extra files/Documentation/prompts/` | historical build prompt |

**Deliberately kept at root:** `README.md`, `AGENTS.md`, `CLAUDE.md`,
`VERCEL_DEPLOYMENT.md`, `scratchpad-design-system-audit.md` (still referenced by this
log — migrate into `docs/` during STEP 3 write-up), all build/tooling config,
`Dockerfile`, `docker-compose.yml`. Untracked local files left in place
(`vercel.json`, `vercel.pro.json`, `Installer.exe`).

**Not addressed:** `Dockerfile` line 12 `COPY . .` will copy `Extra files/` into the
build stage (harmless — final image only pulls `.next/standalone` + `public`). A
`.dockerignore` would trim build context but is out of scope for this batch.

## Files Reorganized

### STEP 6 batch 2 — 2026-08-29 — empty `src/components/monolith/` + `architecture:check` → green

**Goal:** `src/components/monolith/` should contain only `index.ts` (the canonical
public barrel) + `catalogue/` (per `scripts/verify-code-organization.mjs`). It held 22
stray files. Barrel stays; implementations move behind it. All 22 relocated via
`git mv` (history preserved). `index.ts` export paths repointed. **`@/components/monolith`
barrel API is unchanged** — its 111 importers are unaffected.

| Original | New Location | Kind | Reason |
|---|---|---|---|
| `monolith/accounting-note-reason-select.tsx` (+`.test.tsx`) | `modules/accounting/components/` | real impl | domain code → owning module |
| `monolith/accounting-operational-actions.tsx` | `modules/accounting/components/` | real impl | " |
| `monolith/accounting-operational-views.tsx` (55 KB) | `modules/accounting/components/` | real impl | " |
| `monolith/accounting-optional-invoice-link.tsx` | `modules/accounting/components/` | real impl | " |
| `monolith/accounting-workflow-cards.tsx` | `modules/accounting/components/` | real impl | " |
| `monolith/vendor-master-create-form.tsx` (47 KB) | `components/forms/` | real impl | vendor-master form; kept in shared `forms/` (not `modules/accounting/`) because it imports CHA workspace primitives — putting it in a module would violate module-isolation; `components/forms/` is exempt |
| `monolith/customer-portal-workspace.tsx` | `components/layout/` | real impl | portal shell = layout composition; imports `@/modules/auth` — same module-isolation reason as above |
| `monolith/accounting-invoice-form.tsx` | → `Extra files/Legacy/monolith-shims/` | 1-line re-export shim | redundant with `index.ts` line 24 |
| `monolith/accounting-workspace.tsx` | → `Extra files/Legacy/monolith-shims/` | shim | redundant with `index.ts` line 23 |
| `monolith/cha-workspace.tsx` | → `Extra files/Legacy/monolith-shims/` | shim | redundant with `index.ts` line 30 |
| `monolith/crm-workspace.tsx` | → `Extra files/Legacy/monolith-shims/` | shim | redundant with `index.ts` line 32 |
| `monolith/people-controls.tsx`, `monolith/people-workspace.tsx` | → `Extra files/Legacy/monolith-shims/` | shims | redundant with `index.ts` lines 33–34 |
| `monolith/{badge,button,input,textarea,date-input,dropdown-menu,neon-checkbox}.tsx` | → `Extra files/Legacy/monolith-shims/` | primitive re-export shims | `verify-code-organization.mjs` bans these filenames anywhere outside `components/ui/` (duplicate-primitive check) — cannot live in a module `Scrap/`; parked outside `src/`. Consumers now use `@/components/monolith` barrel or `@/components/ui/*` directly. |
| `monolith/file-upload-field.tsx`, `monolith/workspace.tsx` | → `Extra files/Legacy/monolith-shims/` | shims | redundant with `index.ts` lines 9, 15 |
| `app/(dashboard)/cha/expenses/expenses-client.tsx` (2777 lines) | `modules/cha/components/` | route client misplaced | `src/modules/expense/server/expense-workspace-page.tsx` imported it via `@/app/…` (route-impl import — linter violation, had an `eslint-disable` band-aid). Now in the CHA module; both importers repointed. |

## Imports / References Updated

### STEP 6 batch 2 — 2026-08-29

- **`src/components/monolith/index.ts`**: 7 `./relative` exports repointed to
  `@/modules/accounting/components/*` / `@/components/layout/customer-portal-workspace`;
  `vendor-master-create-form` export **removed** from the barrel (now imported directly
  from `@/components/forms/vendor-master-create-form` by its 2 route consumers — avoids
  an `index → forms → index` cycle).
- **84 files**: `import … from "@/components/monolith/<subpath>"` →
  `from "@/components/monolith"` (bare barrel). `@/components/monolith/catalogue*`
  preserved. Rewrite was a scripted `perl` pass with a `catalogue` negative-guard.
- **35 files**: merged the resulting duplicate `import { … } from "@/components/monolith"`
  statements into one per file (scripted; specifiers sorted). eslint does not enforce
  `no-duplicate-imports` here, but merged for cleanliness.
- **2 route pages** (`accounting/vendor-master/new`, `crm/vendors/new`): vendor-master
  import → `@/components/forms/vendor-master-create-form`.
- **`cha/expenses/page.tsx`** + **`modules/expense/server/expense-workspace-page.tsx`**:
  `ExpensesClient` import → `@/modules/cha/components` (barrel; added
  `export * from "./expenses-client"` to `src/modules/cha/components/index.ts`).

### Pre-existing `architecture:check` violations fixed (10 total — none introduced by this cleanup; confirmed by diffing against a stashed clean tree)

The linter fails fast (throws on first violation), so the baseline red was masking a
stack. Cleared in order:

| # | File | Was | Now |
|---|---|---|---|
| 1 | `src/components/monolith/*` (22 files) | stray impls in barrel dir | relocated (above) |
| 2 | `src/components/ui/tabs.tsx` | doc-comment contained "HRMS" → tripped `businessTerms` | comment reworded ("other module pages") — comment only, no behavior |
| 3–4 | `crm/.../enquiry-register-toolbar.tsx`, `lead-register-toolbar.tsx` | imported `@/modules/cha/components/workspace/cha-workspace` (cross-module private) | → `@/components/monolith` barrel |
| 5 | `crm/components/masters/crm-masters-workspace.tsx` | `@/modules/items/components/ItemsListPage` | → `@/modules/items/components` (barrel; already exported there) |
| 6 | `customer-portal/components/client-actions.tsx` | `@/modules/core/components/monolith-app-shell` | → `@/components/monolith` barrel (re-exports the theme symbols) |
| 7 | `modules/expense/server/expense-workspace-page.tsx` | `@/app/(dashboard)/cha/expenses/expenses-client` (route impl) | relocated client to `modules/cha/components/`, import → `@/modules/cha/components` |
| 8–9 | `hrms/.../organisation-structure-workspace.tsx`, `ownership-reporting-workspace.tsx` | `@/modules/people/components/people-workspace` | → `@/components/monolith` barrel |
| 10 | `modules/core/components/monolith-app-shell.tsx` | `@/modules/mona/components/mona-desktop-pet` + `…/mona-guidance-overlay` | added both to `src/modules/mona/components/index.ts`; import → `@/modules/mona/components` |

**Result:** `npm run architecture:check` → **exit 0** (first green; baseline was red).
`npx tsc --noEmit` → **exit 0**. `npx eslint` on changed files → **0 errors**.

## Shared Components Reorganized

- `src/components/monolith/` reduced to `index.ts` + `catalogue/` (the sanctioned
  contents). It is now purely a **facade barrel** — no implementations.
- `src/components/forms/vendor-master-create-form.tsx` — new home for the vendor-master
  form (shared, cross-module deps).
- `src/components/layout/customer-portal-workspace.tsx` — new home for the portal shell.
- Barrels extended (additive, no breakage): `src/modules/mona/components/index.ts`
  (+`mona-desktop-pet`, +`mona-guidance-overlay`), `src/modules/cha/components/index.ts`
  (+`expenses-client`).
- `Extra files/Legacy/monolith-shims/` — 16 retired 1-line re-export shim files,
  preserved, out of the build graph.

## Duplicate Implementations Found

| Pattern | Locations | Currently active | Action |
|---|---|---|---|
| Card vs MonolithSurface | `card.tsx` vs `foundation.tsx` | canonical = `Card` | **STEP 5 done 2026-08-29**: `MonolithSurface` marked `@deprecated` → `Card`. Full call-site migration **deferred** (see note). |
| Badge vs MonolithBadge | `badge.tsx` vs `foundation.tsx` | canonical = `Badge` (CVA) | **STEP 5 done**: `MonolithBadge` `@deprecated` w/ `tone`→`variant` map. Migration deferred. |
| Button vs MonolithAction / MonolithIconAction | `button.tsx` vs `foundation.tsx` | canonical = `Button` (CVA) | **STEP 5 done**: both `@deprecated` w/ variant map + `mode="icon"` note. Migration deferred. |

> **STEP 5 rationale (why call-site migration is deferred, not done now):** the
> duplicate `foundation.tsx` primitives have tiny real usage —
> `MonolithSurface` ×5 files (30 of those call-sites are inside
> `admin/design-system/design-system-client.tsx`, the showcase itself),
> `MonolithBadge` ×1, `MonolithAction` ×1, `MonolithIconAction` ×2 (one is
> `workspace-dialog.tsx`). They are **not** flagged by
> `verify-code-organization.mjs` (its duplicate-primitive check only bans specific
> *filenames* outside `components/ui/`; `foundation.tsx` is exempt). The catalogue
> registry `shared-catalogue.tsx` documents them as distinct entries and
> `npm run test:design-system:parity` likely asserts that — migrating risks a
> parity-test break for near-zero structural gain. `@deprecated` tags achieve the
> architectural intent ("new code uses the canonical") at zero risk. Full migration
> can happen later alongside a showcase refresh.
> `MonolithPage` / `MonolithEmptyState` / `MonolithSpecLabel` have **no** `components/ui`
> duplicate — they stay as-is (genuine unique primitives).
| Decorative icon containers | `mnx-icon-badge`, `mnx-icon-chip`, `mnx-*-icon` (~40 module classes) | all rendered | **partially done 2026-08-29** — unified to one spec in `monolith-system.css` (CSS-only, no markup change); `<MonolithIcon />` is the forward path |

## Potentially Deletable Files

_Populated later. Nothing to be deleted during this operation._

## Files Intentionally Left Untouched

| File | Why preserved / untouched |
|---|---|
| `src/modules/accounting/authorization-planning/responsibility-backup.ts` | STEP 2 traced it: **ACTIVE** — imported by `authorization-request.ts:19`, re-exported from `authorization-planning/index.ts:6`. "backup" = domain concept (approver fallback), not a file backup. Left in place; rename is a future nicety. |
| `prisma/migrations/**` | migration history — never moved |
| `src/generated/prisma/**` | untracked build artifact (`prisma generate`) — never moved/committed |
| `vercel.json`, `vercel.pro.json`, `Installer.exe` | untracked local files — outside repo-cleanup scope |

## Issues Discovered During Cleanup

- (P1–P9 above.) Detailed remediation deferred to their steps. No behavior changes made.
- ~~**PRE-EXISTING: `npm run architecture:check` RED on `ams-completion`**~~ →
  **RESOLVED 2026-08-29 (STEP 6 batch 2).** Baseline had 10 stacked violations
  (fail-fast linter masked 9 behind the `src/components/monolith` one). All 10 fixed —
  see "Imports / References Updated". `architecture:check` now exits 0. None were caused
  by this cleanup (verified against stashed clean tree).
- `.gitignore` contains `/Adarsh-Shipping-and-Services-Management-Software/` (a
  self-named nested dir ignore) and `/scrap/`, `/artifacts/`, `/brain/`,
  `/graphify-out/`, `/_cleanup_review/` — pre-wired scratch ignores. Note: the
  planned per-module `Scrap/` folders are **capital-S** (`src/modules/*/Scrap/`), so
  the lowercase `/scrap/` ignore will NOT hide them — they stay tracked, as intended.

---

## Design System Consolidation

### Design System Audit Status

| Metric | Value |
|---|---|
| Modules inspected (design pass) | 0 / 25 |
| Pages inspected | 0 |
| CSS files inventoried | 15 (paths recorded below) |
| Reusable UI patterns found | see `scratchpad-design-system-audit.md` (prior pass) |

### CSS file inventory (pre-classification)

| File | Size | Likely class |
|---|---|---|
| `src/styles/monolith-tokens.css` | 12 KB | **Foundation — keep** (token layer) |
| `src/styles/monolith-system.css` | 493 KB | **DS core — keep** (component + utility CSS) |
| `src/styles/legacy-compatibility.css` | 52 KB | Transitional — audit for removal candidates |
| `src/styles/modules/accounting.css` | — | classify: layout vs visual redefinition |
| `src/styles/modules/cha-expense.css` | — | classify |
| `src/styles/modules/communication-admin.css` | — | classify |
| `src/styles/modules/crm.css` | — | classify (hosts `--mnx-*` vars per prior audit) |
| `src/styles/modules/freight-forwarding.css` | 524 | ✅ **classified — KEEP as module-local.** 35 `.ff-*` selectors, ~112 layout-prop lines vs ~52 visual (px=14, hex=0 — token-clean). Selectors are grid/page/panel/toolbar layout composition = legitimate per PHASE 10. No DS extraction needed. |
| `src/styles/modules/people.css` | — | classify |
| `src/styles/modules/performance.css` | — | classify |
| `src/app/globals.css` | — | keep (global entry) |
| `src/app/(dashboard)/admin/design-system/design-system.css` | — | keep (showcase-local) |
| `src/app/(dashboard)/admin/design-system/design-system-catalogue.css` | — | keep (showcase-local) |
| `src/components/dev-console/dev-console.css` | — | keep (dev-only tool) |
| `src/modules/auth/components/animated-login.module.css` | — | classify (only `.module.css` in repo) |

### Components Added to Design System

_None yet._

### Existing Components Improved

| Component | Change | Reason | Date |
|---|---|---|---|
| Decorative icon containers (CSS) | Unified ~40 divergent module icon-box classes + `mnx-icon-badge`/`mnx-icon-chip`/`mnx-performance-summary` heading onto one spec (box `--mn-icon-surface-size-md`, radius `--mn-icon-radius`, soft semantic tint, `[data-hue]` aware); page-header tier kept larger. `<MonolithIcon />` is the canonical primitive. | User request: unify icon design across monolith pages | 2026-08-29 |
| `foundation.tsx` `MonolithSurface` / `MonolithBadge` / `MonolithAction` / `MonolithIconAction` | Added `@deprecated` JSDoc pointing to canonical `Card` / `Badge` / `Button` (+ prop-value maps). No runtime change; existing call-sites still work. | STEP 5 — single API per pattern for new code | 2026-08-29 |

### Icons Centralized

- Canonical primitive: `src/components/ui/monolith-icon.tsx` (`<MonolithIcon />`,
  `.mnx-icon`). Wraps `lucide-react`. Tone/surface/size API.
- 2026-08-29: CSS-level convergence of legacy decorative icon classes (see above).
- Remaining: audit direct `lucide-react` imports (~384 files) — keep functional
  inline icons, route decorative usage through `<MonolithIcon />`.

### Modules Fully Migrated (design system)

- [ ] (none)

---

## Validation Performed

| Check | Command | Result (2026-08-29, after STEP 6 batch 2) |
|---|---|---|
| Residual path refs | `grep` for old `@/components/monolith/<sub>` + moved paths | ✅ none (catalogue subpaths intentionally preserved) |
| Architecture | `npm run architecture:check` | ✅ **exit 0** — GREEN (baseline was RED; 10 pre-existing violations cleared) |
| TypeScript | `npx tsc --noEmit` | ✅ **exit 0** |
| ESLint | `npx eslint` on changed files | ✅ **0 errors** (10 warnings, all pre-existing raw-`<button>` `no-restricted-syntax` in `monolith-app-shell.tsx`, not introduced here) |
| DS coverage | `npm run design-system:verify` | not run this batch |
| Tests | `npm test` | not run (needs staging DB env) |
| Production build | `npm run build` | ✅ **exit 0** (2026-08-29, after STEP 5 + STEP 6 freight-forwarding/accounting). `prisma generate` + `next build` both clean; full app route table generated. |

> STEP 6 batch 2 scope: 24 `git mv` renames + `index.ts` repoint + 84 import-path
> rewrites + 35 duplicate-import merges + 10 targeted cross-module import fixes + 3
> barrel `index.ts` additions + 1 doc-comment reword. `tsc` + `architecture:check` +
> `eslint` all green. No behavior/feature changes. `@/components/monolith` public API
> unchanged (verified: 111 barrel importers untouched).

### Baseline note

`npm run architecture:check` was **RED on `ams-completion` before any cleanup** (10
stacked violations, fail-fast masked 9). This batch makes it GREEN. That means
`npm run quality` (`audit:structure && design-system:verify && lint && test && build`)
can now progress past its first gate.

---

## Final Cleanup Summary

_To be completed at STEP 12._

```
Total modules inspected:        0 / 25
Total files reorganized:        0
Total files moved to Scrap:     0
Total files moved to Extra files: 0
Total files deleted:            0
Build status:                   pending
```
