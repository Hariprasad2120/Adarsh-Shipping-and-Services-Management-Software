<!-- BEGIN:nextjs-agent-rules -->
Mandatory Monolith UI rules

Before creating, changing, or reviewing any user-facing UI, read:

docs/MONOLITH_UI_DESIGN_SYSTEM.md

docs/engineering/CODE_ORGANIZATION.md when present

docs/engineering/PERFORMANCE.md when present

The current production component implementations and /admin/design-system are authoritative. The dashboard is the composition reference and CHA is the operational reference.

Implement shared UI in the approved owner folders under src/components; implement genuine module compositions under src/modules/<module>/components. src/components/monolith is the public aggregation/catalogue boundary and must not contain a second component implementation.

Do not add new selectors to src/styles/legacy-compatibility.css. Do not claim a route is migrated without current source and runtime verification.

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:design-system -->
# Design System — Monolith Engine

The active Monolith design system is sourced from `C:\Users\SilverCloud\Documents\Monolith-Design-System-Source` and implemented in this repo through `src/app/globals.css` plus reusable primitives in `src/components/monolith/`.

## Themes

Support exactly three themes everywhere:
- Light: Signal Yellow `#F9D972`
- Night: true black with Signal Yellow
- Violet: violet primary/highlight palette only

Theme values are `light`, `night`, and `violet`. Persist the selected value in `localStorage` as `theme`, and apply `theme-light`, `theme-night`, or `theme-violet` on the root document/app shell.

## UI Rules

- Use only `src/components/monolith/` for reusable visual primitives.
- Do not import from the removed legacy UI namespace; that old directory has been removed.
- Do not use the removed legacy classes: removed legacy class families.
- Do not use old cyan/orange brand styling as a default UI language. Primary actions and active states follow the current theme accent.
- New reusable visual patterns must be added to the Monolith design system layer before page usage.
- Preserve business logic while replacing presentation. Routes, RBAC, forms, server actions, workflows, filters, pagination, and notifications must continue to work.

## Required Verification For UI Work

1. New Monolith primitives used where a shared primitive exists.
2. Light, Night, and Violet themes checked.
3. Desktop, tablet, and mobile layouts checked.
4. No legacy the removed legacy UI namespace imports.
5. No legacy removed legacy class families, old token utility classes, or old design-token imports.
6. Existing functionality and permissions preserved.
<!-- END:design-system -->

<!-- BEGIN:graphify -->
# Codebase Analysis — graphify

This project has a pre-built knowledge graph at `graphify-out/graph.json` (4351 nodes, 10640 edges, 244 communities).
Always use Graphify when analyzing this codebase, especially before making architectural changes, tracing dependencies, modifying workflows, or understanding module relationships.

## Session Start Protocol

At the start of every new session, check if `graphify-out/graph.json` exists. If it does:
1. Silently confirm the graph is available
2. Notify the user: "Knowledge graph available (`graphify-out/graph.json`). Ask me anything about the codebase architecture."
3. Be ready to answer structural questions from the graph without re-scanning files

## When to Use graphify

Use `graphify query "<question>"` (via the Skill tool with `skill: "graphify"`) instead of grep/glob/read when the question is:
- "What calls X?" / "What does X depend on?"
- "Which modules touch Y?"
- "How does data flow through Z?"
- "What is the relationship between A and B?"
- "Where is concept X implemented?"
- Cross-cutting questions that span multiple files or modules

Use grep/read/glob when you need exact line numbers, current file contents, or verifying whether specific code exists now.

## Key Architecture Facts (from graph)

- `requirePermission()` — 478 edges, touches every module. Single RBAC gate. Its absence on any route/action is a bug.
- `getSessionOrUnauth()` — 189 edges. Primary session check.
- `ok()` / `err()` — Result-type wrappers used across all server actions.
- `getNow` — 142 edges. Centralized time source (used instead of `new Date()` for testability).
- `can()` — 88 edges. Capability check (distinct from `requirePermission`).

## Community Map (top modules)

| Community | Module |
|-----------|--------|
| CHA Filing Actions / CHA Service Layer | Customs House Agent filing workflow |
| Google Workspace Services | Gmail, Calendar, Drive, Chat integration |
| AMS Audit Logs / AMS Appraisals Service | Annual Management System |
| Accounting Service / Accounting Actions | Finance & accounting |
| CRM Contacts UI / CRM Deals Pipeline | Sales CRM |
| HRMS Dashboard Portal / HRMS Letters | Human Resources |
| Biometric Attendance | Attendance tracking |
| Android Mobile Components / Android API Client | Mobile CRM app |
| Identity & Auth / RBAC Permissions | Auth + permissions |

## Updating the Graph

When significant new code is added, run `/graphify . --update` to incrementally update the graph without full rebuild.
<!-- END:graphify -->

<!-- BEGIN:product-catalogue -->
# Product Catalogue Update Rule

Before completing any Monolith Engine task that adds, modifies, or removes features, routes, API endpoints, or database models, the product catalogue **MUST** be updated.

## Steps

1. After finishing code changes, run: `npm run catalogue:update`
2. Verify the catalogue is current: `npm run catalogue:check`
3. If the manual feature registry needs updates (new features, status changes), edit `docs/product-feature-registry.json`

## Key Files

| File | Purpose |
|---|---|
| `PRODUCT_CATALOGUE.md` | Master product reference (manually maintained) |
| `docs/product-feature-registry.json` | Manual feature/status registry (manually maintained) |
| `docs/product-catalogue.json` | Auto-generated machine-readable catalogue |
| `docs/product-catalogue.generated.md` | Auto-generated human-readable catalogue |
| `scripts/update-product-catalogue.ts` | Scanner script |
| `scripts/check-product-catalogue.ts` | Validation script |
| `src/lib/catalogue-data.ts` | In-app catalogue data for `/product-catalogue` page |

## Rule

No feature change is considered complete unless:
1. `npm run catalogue:update` has been run successfully
2. `npm run catalogue:check` shows 0 errors
3. If adding new modules/features, `docs/product-feature-registry.json` is updated
<!-- END:product-catalogue -->
