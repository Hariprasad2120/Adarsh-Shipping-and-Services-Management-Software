# Page Patterns

Canonical structures live in `.stitch/PAGE-PATTERNS.md` (authoritative). This file is the
docs-tree pointer + the route→pattern assignment worked out during migration.

## Summary

~290 routes → **11 patterns** + specialised:

| Pattern | ~Routes | Anchor route | Canonical frame |
|---|---|---|---|
| DATA TABLE | 110 | `/accounting/sales-invoices` | `Operational*` family |
| CREATE / EDIT FORM | 55 | `/hrms/employees/new`, `/accounting/journal-entries/new` | `WorkspaceField` + new `FormSection`/`LineItemsEditor` |
| SETTINGS | 50 | `/payroll/settings` (+~40 children) | new `SettingsLayout`/`SettingsNav` |
| ENTITY DETAIL | 35 | `/hrms/employees/[id]` | new `DetailHeader` + `Tabs` |
| REPORT / ANALYTICS | 15 | `/accounting/profit-loss` | new `ReportControls` + `OperationalTable` |
| INDEX / LIST | 12 | `/hrms/employees` | new `FilterToolbar` + `DataTable` |
| WORKFLOW / PROCESS | 6 | `/cha/process/[quoteId]` | new `StageRail` |
| DASHBOARD | 3 | `/dashboard` | new `AttentionList`/`Metric`/`QuickActions`/`ActivityFeed` |
| CALENDAR | 3 | `/attendance/leaves/team-calendar` | new `CalendarGrid`/`CalendarToolbar` |
| KANBAN | 2 | `/crm/deals` | new `KanbanBoard`/`Column`/`Card` |
| WIZARD | 2 | `/freight-forwarding/create-booking` | new `StepIndicator` |
| Specialised | ~10 | login, mail/chat/drive, maps, PDF viewer, catalogue | module-owned, tokens + canonical frame |

## Migration order (brief Phase 19)

1. **DASHBOARD** — design + approve first (drives token/component decisions).
2. **DATA TABLE** — largest surface; `Operational*` already exists, so mostly consolidation.
3. **CREATE / EDIT FORM** — 55 routes, many NON_COMPLIANT (raw `<input>` heavy: accounting
   config/admin has 87).
4. **SETTINGS** — 50 routes, one new layout unlocks all.
5. **ENTITY DETAIL** → **LIST** → **REPORT** → **WORKFLOW** → **KANBAN** → **CALENDAR** → **WIZARD**.

Per pattern: design once (Stitch) → build canonical components → migrate anchor route →
QA (Phase 17) → apply to remaining routes in the pattern → update this table's status.

## Route → pattern assignment

Populated during migration. Seed from `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`
(101 NON_COMPLIANT routes are highest priority within each pattern).
