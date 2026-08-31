# Migration Status — Stitch UX System Redesign

Branch: `ui/stitch-system-redesign`. Started 2026-08-31.

Related (existing) migration tracking — this redesign builds on, not replaces:
- `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md` — 407 route-states, 267 COMPLIANT / 36 PARTIAL
  / 101 NON_COMPLIANT / 3 SPECIALISED (regenerate: `node scripts/audit-ui-routes.mjs`).
- `docs/ui-migration-status.md`, `docs/ui-migration-handoff.md`.

Status ladder: `NOT AUDITED → AUDITED → STITCH DESIGNED → APPROVED → IMPLEMENTED → QA PASSED → COMPLETE`.

---

## Phase progress (brief FIRST EXECUTION list)

| # | Task | Status |
|---|---|---|
| 1 | Validate Stitch MCP access | DONE — `stitch` connected; tools available after session restart |
| 2 | Audit repository architecture | DONE — see `.stitch/SITE.md` |
| 3 | Create route inventory | DONE — `route-inventory.md`, `.stitch/ROUTES.md` (354 pages, ~290 routes) |
| 4 | Audit design system / global CSS | DONE — `css-audit.md` (globals.css 38,605 lines; token layer KEEP) |
| 5 | Audit dashboard UX | DONE — `page-ux-audit.md` (18 sections classified) |
| 6 | Audit dashboard components | DONE — `component-audit.md` |
| 7 | Create `.stitch` workspace | DONE — metadata.json, SITE.md, ROUTES.md, DESIGN.md, UX-RULES.md, PAGE-PATTERNS.md, COMPONENTS.md, next-prompt.md, designs/ |
| 8 | DESIGN.md draft | DONE — `.stitch/DESIGN.md` (v0, references `--mn-*` tokens) |
| 9 | UX-RULES.md | DONE — `.stitch/UX-RULES.md` |
| 10 | Import existing dashboard into Stitch | PARTIAL — no code-to-design tool in this MCP build; DESIGN.md uploaded as design system `34d797abba684e5099d8ad3c2d5d6345`; current-state captured in `page-ux-audit.md` instead |
| 11 | Generate 3 dashboard variants | DONE — A/B/C generated, project `14247991428455987859`, screenshots + HTML in `.stitch/designs/` |
| 12 | Save Stitch metadata | DONE — `.stitch/metadata.json` |
| 13 | Present variants + recommendation | DONE — recommendation **Variant B**; **AWAITING USER APPROVAL** |

## Pattern migration (after dashboard approval)

| Pattern | Anchor | Status |
|---|---|---|
| DASHBOARD | `/dashboard` | AUDITED |
| DATA TABLE | `/accounting/sales-invoices` | NOT AUDITED |
| CREATE / EDIT FORM | `/hrms/employees/new` | NOT AUDITED |
| SETTINGS | `/payroll/settings` | NOT AUDITED |
| ENTITY DETAIL | `/hrms/employees/[id]` | NOT AUDITED |
| REPORT / ANALYTICS | `/accounting/profit-loss` | NOT AUDITED |
| INDEX / LIST | `/hrms/employees` | NOT AUDITED |
| WORKFLOW / PROCESS | `/cha/process/[quoteId]` | NOT AUDITED |
| KANBAN | `/crm/deals` | NOT AUDITED |
| CALENDAR | `/attendance/leaves/team-calendar` | NOT AUDITED |
| WIZARD | `/freight-forwarding/create-booking` | NOT AUDITED |

## New canonical components

All `NOT STARTED`. List: `design-system-candidates.md`. First build set (dashboard):
`AttentionList`, `Metric`+`MetricStrip`, `QuickActions`, `ActivityFeed`, `TodayStrip`,
`EmptyState`.

## Legacy CSS removed

None yet. Log every removed selector here with the grep proving zero usage.

## Production changes so far

**None.** Branch contains only `.stitch/` + `docs/ui-audit/` additions. `/dashboard` and all
routes untouched.
