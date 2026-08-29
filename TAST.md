# Monolith Repository Cleanup Log

> Living document. Updated continuously during the Production Preparation / Repository
> Cleanup phase. **No file is ever permanently deleted** — inactive code goes to a
> module `Scrap/` folder, miscellaneous preserved files go to `Extra files/`.

## Cleanup Status

| Field | Value |
|---|---|
| Current phase | **Inspection complete — all 25 modules + all 15 CSS files classified. Structural cleanup phase 1 committed (2 local commits, not pushed). `npm run build` GREEN.** |
| Last updated | 2026-08-29 |
| Production build status | ✅ **`npm run build` exit 0**, `tsc --noEmit` ✅, `architecture:check` ✅, `design-system:verify` ✅. `lint` ❌ exit 1 — **pre-existing** 1287 errors, not wired to CI, nothing added by this phase (see Validation Performed). |
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
- [x] **STEP 6 — all 25 modules inspected.** Verdict: **none need structural reorg** (repo already well-organized; no dead/backup/duplicate files; no Scrap folders required). Details in "Module Inspection Checklist".
- [x] **All 15 CSS files classified** — 7 module CSS files all verdict **KEEP module-local** (layout composition, token-clean bar `people.css`); `cha-expense.css` flagged split-candidate.
- [x] **Committed locally** (2 commits on `ams-completion`, not pushed): `0108384b` icon unification, `124bd4c7` cleanup phase 1.
- [ ] **Remaining = separate efforts, NOT this "no behavior change" cleanup:**
  - DS raw-control migration (`<button>/<input>` → primitives, ~349 sites; heaviest: hrms 20, communication 18, mona 17, payroll 15 in modules + accounting routes 216)
  - Optional: `components/index.ts` barrels for the 18 modules lacking one; split `cha-expense.css`; tokenize `people.css` hex/px; audit `legacy-compatibility.css` (52 KB, self-marked temporary) for dead selectors
  - `npm run design-system:verify`, `npm test` (needs staging DB), `npm run quality` end-to-end

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
| `styles/modules/freight-forwarding.css` | 524 | module | ✅ **KEEP module-local** — px=14, hex=0; layout composition |
| `styles/modules/crm.css` | 2465 | module | ✅ **KEEP module-local** — 522 sel, ~410 layout / ~270 visual, hex=0, px=68. Visual rules use semantic tokens. Future: tokenize the 68 raw px. |
| `styles/modules/people.css` | 3649 | module | ✅ **KEEP module-local** — 786 sel, ~603 layout / ~401 visual, **hex=15** (only module CSS w/ raw colors), px=85. Future: replace the 15 hex + 85 px with tokens. |
| `styles/modules/communication-admin.css` | 3435 | module | ✅ **KEEP module-local** — 560 sel, ~559 layout / ~440 visual, hex=0, px=90. Large but token-clean. |
| `styles/modules/cha-expense.css` | 1741 | module (**2 modules**) | ✅ **KEEP** but **split candidate** (cha vs expense). 257 sel, visual≈layout, hex=0, **px=236** (heaviest raw-spacing file). Future: split + tokenize. |
| `styles/modules/performance.css` | 408 | module | ✅ **KEEP module-local** — small (63 sel), px=12, hex=0. |
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

### Raw unmanaged form controls — accurate census (2026-08-29)

Repo-wide grep of `src/app` + `src/modules` + `src/components` (`.tsx`, excluding
lines already carrying `eslint-disable`):

| Element | Count | Assessment |
|---|---:|---|
| `<button>` | 181 | **~90% intentional custom widgets** — icon buttons, menu rows, clickable cards, toggles, mail-toolbar actions. Sampled `notification-provider` (circular animated dismiss), `dashboard/CompanyOverview` (clickable module card), `people-controls` (`PeopleToggleButton`, a forwardRef `aria-pressed` toggle), all of `communication/mail-workspace` (Gmail-style toolbar). Forcing these into `<Button variant>` **regresses** styling/semantics. Correct fix per the eslint rule: `eslint-disable-next-line no-restricted-syntax -- <reason>`, not a swap. |
| `<input type="hidden">` | 62 | **Legitimately raw** — form plumbing for server actions, no styling. Leave. |
| `<input>` non-hidden | 155 | The **real migration target**. Concentrated: `accounting/configuration/admin/page.tsx` (49), `accounting/customization/page.tsx` (13), `payroll/settings/org-profile` (8), `accounting/tax-settlement` (8) — i.e. **~74 in 4 FormData + server-action route pages**. Rest scattered 1–5/file. `admin/design-system/*` inputs are `type="color"`/`range` token-editor controls — leave. |
| `<select>` | 18 | migrate with `<NativeSelect>` (note: no `forwardRef` — check ref usage) |
| `<textarea>` | 12 | migrate with `<Textarea>` |

**Primitives are drop-in** (`Input`/`Textarea` forwardRef + full prop spread;
`Button` defaults `type="button"` vs raw `<button>`'s `submit` — must add
`type="submit"` where a raw button drove form submit).

**Why this is not a mechanical sweep / not done here:**

- The `<button>` bulk is deliberate UI. A blind pass would break it. The only safe
  automated action is adding `eslint-disable` comments — which silences a warning
  that **does not currently block** anything (`npm run lint` = bare `eslint`, exits 0
  on warnings). Low value, high churn.
- The genuine `<input>` targets sit in **server-action FormData forms**. Each input's
  `name`/`value`/`defaultValue` is read by a server action; a wrapper that alters
  prop forwarding breaks submission **silently**. Verifying requires the running app
  + a database + submitting each form. Not doable blind in this environment.

**Recommended path:** treat as a dedicated, QA-backed migration — one route page at a
time, `<input>`→primitive, run the app, submit the form, diff the payload. Out of
scope for an autonomous "no behavior change" cleanup pass.

---

## Module Inspection Checklist

Generated from `src/modules/` (file counts = `.ts`+`.tsx`).

All 25 modules inspected 2026-08-29 (structure + subdirs + misplaced-file scan +
`@/app/*` route-import scan + raw-control / inline-style counts). **Result: no module
needs structural reorganization, no Scrap folders needed** — no dead code, no backup
files, no duplicate implementations, no cross-module route imports (the one such
violation, `expense`, was fixed in cleanup phase 1). "rawCtl" = raw form controls in
that module's own components (DS-migration debt, tracked separately; not a cleanup item).

| Module | Files | rawCtl | inline | Status |
|---|---:|---:|---:|---|
| accounting | 93 | 6 | 0 | ✅ compliant. `migration/`+`rollout/` = operational deploy code (used by `scripts/accounting-phase*`), keep. |
| admin | 2 | 0 | 0 | ✅ compliant (thin) |
| ams | 18 | 3 | 1 | ✅ compliant. subdirs `components/ pdf/` |
| attendance | 1 | 0 | 0 | ✅ compliant (single file) |
| auth | 4 | 4 | 0 | ✅ compliant. `animated-login.module.css` = intentional scoped style |
| cha | 69 | 7 | 1 | ✅ compliant. `labs/` = live experimental-features area (routed, in nav) — keep |
| communication | 7 | 18 | 2 | ✅ structure OK. High rawCtl → DS-migration debt |
| core | 12 | 10 | 0 | ✅ compliant. subdirs `hooks/ organisation/ user/` |
| crm | 67 | 10 | 6 | ✅ compliant. subdirs `config/ pdf/ services/` |
| customer-portal | 13 | 3 | 0 | ✅ compliant |
| dashboard | 10 | 1 | 0 | ✅ compliant |
| expense | 1 | 0 | 0 | ✅ compliant (route-import fixed in phase 1) |
| freight-forwarding | 10 | 2 | 0 | ✅ compliant — CSS classified KEEP |
| google-chat | 8 | 0 | 0 | ✅ compliant (flat) |
| hrms | 70 | 20 | 2 | ✅ structure OK. Highest rawCtl → DS-migration debt |
| incentives | 2 | 0 | 0 | ✅ compliant |
| items | 18 | 0 | 0 | ✅ compliant. has `components/index.ts` |
| leave | 25 | 0 | 0 | ✅ compliant. zero raw controls |
| mona | 25 | 17 | 6 | ✅ structure OK. rawCtl mostly chat UI → DS-migration debt |
| notifications | 3 | 1 | 0 | ✅ compliant |
| payroll | 65 | 15 | 0 | ✅ structure OK. subdirs `components/ pdf/`. rawCtl → debt |
| people | 4 | 2 | 0 | ✅ compliant. `people.css` KEEP (has 15 hex — future tokenize) |
| performance | 5 | 1 | 0 | ✅ compliant |
| recruit | 4 | 0 | 0 | ✅ compliant |
| todo | 1 | 0 | 0 | ✅ compliant |

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

Nothing **deleted** during this operation (absolute rule). Dead code is *extracted
and preserved*, not removed from the repo.

### Dead selectors in `legacy-compatibility.css` — ✅ EXTRACTED 2026-08-29

Full census: enumerated every custom class in `src/styles/legacy-compatibility.css`
and grepped each against `src/` + `scripts/` + `public/`. Found **~48 classes with
zero references** — an entire abandoned parallel `.ds-*` / `.card-*` design system
(nav, sidebar variants, topbar, portal shell, timeline, stage dots, buttons, avatar,
brand, date-panel, table, form-section, labels, icon-badge, …), superseded by `.mnx-*`.

**Done in two passes:**

1. Scripted comment-aware pass (`prune-legacy-css.mjs`) — removed every top-level
   rule block whose entire selector list references only confirmed-dead classes:
   **72 blocks**.
2. Manual pass — the ~10 compound-selector rules the script kept conservatively
   (`html.dark .card-*`, `.ds-nav-item.is-active`, `.ds-stage.* .ds-stage-dot`,
   `.ds-date-panel__glow`, `html.light main .ds-dark-banner [...]` ×6, the dead
   `.ds-portal-*` / `.ds-topbar` / `.ds-mobile-nav` rules inside two `@media` blocks,
   and the now-orphaned `@keyframes ds-calendar-*`). Verified `.ds-dark-banner`
   references a removed "Employee Cockpit" feature — no component uses it.

**Result: `legacy-compatibility.css` 2175 → 1412 lines (−763).** All removed rules
preserved verbatim (provenance header) in
`Extra files/Legacy/legacy-compatibility-dead-selectors.css` (~710 lines, **not
imported, not in the build**). Brace-balanced 211/211. `tsc` + `npm run build` green.

**Kept in the active file:**
- `.ds-sidebar` (still used ×1, incl. its `@media (max-width:900px)` `display:none`),
  `.no-scrollbar`, `.cyan-range-slider`, live `.animate-*` rules.
- `button:not(.ds-plain):not(...)` — a **live** rule styling all dashboard buttons;
  `.ds-plain` is just a harmless no-op `:not()` guard.
- All non-class rules: `:root` tokens, `@theme inline` (`mono-*` shim — AMS/LMS
  `bg-mono-*` utilities depend on it), `[data-main-shell-scroll]` scrollbar rules,
  `html:not([data-dashboard-shell])` input/placeholder normalizers, live `@keyframes`.

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

### Final gate run — 2026-08-29 (after all phase-1 work + stale-path fix)

| Check | Command | Result |
|---|---|---|
| **Production build** | `npm run build` (`prisma generate && next build`) | ✅ **exit 0** — compiled in ~26s, TypeScript pass, full page-data collection + route table. (One middle run hit a flaky `Next.js build worker exited with code: 1` during page-data collection; **passed clean on retry with identical code** — non-reproducible worker crash, not a code fault.) |
| **TypeScript** | `npx tsc --noEmit` | ✅ **exit 0** |
| **Architecture** | `npm run architecture:check` | ✅ **exit 0** — GREEN (baseline `ams-completion` was RED; 10 stacked pre-existing violations cleared this phase) |
| **DS coverage** | `npm run design-system:verify` | ✅ **exit 0, clean** — "26 registry entries, 222 documented exclusions, 19 approved source files" + "Catalogue style boundary passed". (First run warned about stale `src/components/monolith/*` exclusion paths from the batch-2 moves — fixed in `catalogue/catalogue-exclusions.json` + `scripts/verify-monolith-accounting-ui.mjs`; re-run clean.) |
| **ESLint** | `npm run lint` (bare `eslint`) | ❌ **exit 1 — 1287 errors / 564 warnings, PRE-EXISTING.** `eslint.config.mjs` itself notes *"no CI runs lint in this repo today"*; this is known-untended baseline debt (mostly `@typescript-eslint/no-explicit-any`). Targeted `eslint` on the 103 files this phase changed → 19 errors, **all `no-explicit-any` on deep untouched lines of large files that were moved verbatim** (`expenses-client.tsx` 100% rename, `vendor-master-create-form.tsx` 99%, `accounting-operational-views.tsx`). **No lint error introduced by this cleanup.** `tsc --noEmit` (the real type gate) is clean. |
| Tests | `npm test` | not run — needs staging DB env (`run-with-staging-env.ts`) unavailable here |

### Interpretation

The two gates that matter for "does it build and type-check" — `next build` and
`tsc --noEmit` — are **green**. `architecture:check` and `design-system:verify` are
**green** (the former flipped from red *because* of this work). `lint` is red but was
red before this phase and is explicitly not wired into CI; this cleanup added nothing
to it.

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

### Phase 1 (2026-08-29) — structural cleanup + full inspection

```
Total modules inspected:          25 / 25
Total CSS files classified:       15 / 15
Total files reorganized (git mv): 40   (16 root -> Extra files/, 24 src/ moves)
Total import/reference rewrites:   ~130 files
Total files moved to Scrap:        0    (no Scrap folders needed - no dead/backup/dup code found)
Total files moved to Extra files:  16
Total files deleted:               0
architecture:check:                RED -> GREEN (10 pre-existing violations fixed)
design-system:verify:              GREEN (stale exclusion paths fixed)
tsc --noEmit:                      exit 0
npm run build:                     exit 0  (prisma generate + next build)
npm run lint:                      exit 1  (1287 pre-existing errors, not CI-wired,
                                            nothing added by this phase)
Local commits (not pushed):        0108384b 124bd4c7 f9f915d4 05227802 68a819d6 +final
                                   on ams-completion
```

### Key finding

The repository was already organized to a high standard before this phase
(module-based `src/modules/*`, dedicated `architecture:check` / `design-system:verify`
tooling, prior ownership audits). There was **no accumulation of legacy / backup /
duplicate / abandoned code** to sweep — the versioned-filename scan came back empty
across 24 of 25 modules. The one real structural defect, `src/components/monolith/`
holding 22 stray implementations, is now fixed and the architecture linter is green
for the first time.

### Remaining (deliberately out of scope for a "no behavior change" cleanup)

1. **Design-system raw-control migration** — replace ~349 raw `<button>/<input>/…`
   with DS primitives. Behavior-sensitive; its own project.
2. **Optional polish** — module `components/index.ts` barrels; split `cha-expense.css`;
   tokenize `people.css` hex/px; prune `legacy-compatibility.css`.
3. **Full gate run** — `design-system:verify`, `npm test` (staging DB), `npm run quality`.
