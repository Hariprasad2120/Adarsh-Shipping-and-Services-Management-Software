# Design System Candidates

New canonical components the redesign will add. Build → export from owner barrel → expose
via `src/components/monolith/index.ts` (if public) → catalogue entry in
`src/components/monolith/catalogue` → `npm run design-system:verify`. Never used before it's
canonical.

Target folder layout (brief Phase 13):
`src/components/{ui,layout,forms,data-display,feedback,navigation,overlays,patterns}/`.

| Candidate | Folder | Consolidates | Unlocks pattern | Priority |
|---|---|---|---|---|
| `AttentionList` + `AttentionItem` | patterns | dashboard exceptions panel, ad-hoc needs-attention lists | DASHBOARD, APPROVALS | P0 (dashboard) |
| `Metric` (compact) + `MetricStrip` | data-display | `.mnx-metric-card`, heavy `WorkspaceMetric`, `DashboardInsightCard` stat footer, per-module metric wrappers | all | P0 |
| `QuickActions` | patterns | `.mnx-dashboard-launch-list`, `ModuleCommandCenter` | DASHBOARD | P0 |
| `ActivityFeed` | data-display | `.mnx-table-card` recent-activity, per-module activity lists | DASHBOARD, DETAIL | P1 |
| `TodayStrip` | patterns | dashboard attendance hero (compacted) | DASHBOARD | P0 |
| `EmptyState` (promote `MonolithEmptyState`) | feedback | route-local empty markup, big zero-value cards | all | P0 |
| `SearchField` | forms | `.mnx-search-field` (14 blocks), team/directory/module search wrappers | LIST, TABLE, REPORT | P1 |
| `FilterToolbar` | forms | per-page search+filter+sort bars | LIST, TABLE, REPORT | P1 |
| `FormSection` | forms | route-local fieldset styling on 55 form routes | FORM | P1 |
| `FormFooter` + `SectionSaveBar` | forms | route-local save/cancel rows; per-section save on settings | FORM, SETTINGS | P1 |
| `LineItemsEditor` | forms | per-document line tables (sales/purchase invoices, journal entries, POs) | FORM (heavy) | P2 |
| `SettingsLayout` + `SettingsNav` | layout | ~40 payroll settings pages + every other `/settings` | SETTINGS | P1 |
| `DetailHeader` | patterns | route-local entity headers, raw `<h1>` | ENTITY DETAIL | P2 |
| `SummaryStrip` | data-display | ad-hoc definition/key-facts rows | ENTITY DETAIL | P2 |
| `StageRail` | patterns | `.mnx-activity-node`, CHA + FF process step UIs | WORKFLOW | P2 |
| `StepIndicator` | patterns | booking wizard steps | WIZARD | P3 |
| `ReportControls` | forms | report param bars | REPORT | P2 |
| `KanbanBoard` + `KanbanColumn` + `KanbanCard` | patterns | CRM deals/leads board | KANBAN | P3 |
| `CalendarGrid` + `CalendarToolbar` | patterns | `.mnx-schedule-calendar` (15 blocks), team-calendar, comms calendar | CALENDAR | P3 |
| `ModuleGrid` (compact) | navigation | `.mnx-module-card` (30 rules), `ModuleCommandCenter` | DASHBOARD chrome | P2 |

## Reconciliation (existing dup to resolve, not new)

- `foundation.tsx` deprecated trio → `Card` / `Badge` / `Button` (DESIGN.md open q.2).
- One chart library for REPORT/ANALYTICS (DESIGN.md open q.1) — no dedicated dep today.
- Row-action model: standardise on `OperationalRowAction` trailing kebab everywhere.

## Non-goals

- No new icon system (lucide is the app standard; carbon stays only where already used).
- No new color tokens — `--mn-*` covers it.
- No component under `src/app/**` — reusable code lives in `src/components/**`.
