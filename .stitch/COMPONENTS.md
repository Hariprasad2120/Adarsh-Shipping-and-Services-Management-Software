# COMPONENTS.md — Canonical component registry (Stitch mapping)

Full ownership audit: `docs/ui-component-and-style-ownership-audit.md` (3,600 lines).
Live catalogue: `/admin/design-system`. This file maps Stitch design elements → existing
canonical components, and lists the NEW canonical components the redesign introduces.

Rule (brief Phase 13): before implementing any Stitch element, check if a canonical
component exists. If yes → reuse. If no → build the reusable canonical component first,
register it in the catalogue, then use it. Never build `dashboard-special-*`,
`crm-one-off-*`, etc.

---

## EXISTING canonical components — reuse these

### Primitives — `src/components/ui/`
Button · Badge · Card · Alert · Input · Textarea · Label · Tabs · Tooltip · Separator ·
Skeleton · Modal · Sheet · Sidebar · DropdownMenu · DropdownSelect · NativeSelect ·
NeonCheckbox · DateInput · MonolithIcon · FolderIcon · Collapsible.
Foundation (`foundation.tsx`): MonolithPage, MonolithSpecLabel, MonolithEmptyState +
**deprecated** MonolithSurface / MonolithBadge / MonolithAction / MonolithIconAction
(migrate to Card / Badge / Button).

### Layout / workspace — `src/components/layout/workspace.tsx` (25 exports)
WorkspacePage · WorkspacePageHeader · WorkspaceSectionHeading · WorkspacePanel ·
WorkspacePanelHeader · WorkspaceMetric · WorkspaceField · WorkspaceInput · WorkspaceTextarea ·
WorkspaceSelect · WorkspaceCheckbox · WorkspaceProgress · WorkspaceAction · WorkspaceBadge ·
WorkspaceAlert · WorkspaceTable · WorkspaceEmptyTableRow · WorkspaceState · icons.
Also: `customer-portal-workspace.tsx`, `workspace-dialog.tsx` (WorkspaceDialogLayer).

### Data display — `src/components/data-display/`
OperationalDataTable · OperationalDataTableHeader · OperationalDataTableWrap ·
OperationalTable · OperationalTableHead · OperationalTableCell · OperationalPrimaryCell ·
OperationalStatus · OperationalMode · OperationalRowAction · OperationalTableEmpty ·
OperationalDataTableFooter · operational-linked-row · dashboard-insights
(DashboardInsightCard/Grid/MiniBarChart/SegmentList) · operations-overview.

### Feedback — `src/components/feedback/`
workspace-states (WorkspaceLoadingState / WorkspaceErrorState) · loading-screen ·
app-route-loading · warning-indicator-popover · development-build-watermark.

### Forms — `src/components/forms/`
filter-menu · file-upload/* · vendor-master-create-form · development/*.

### Navigation — `src/components/navigation/`
monolith-app-sidebar · monolith-search-command · breadcrumb-label · clickable-row ·
navigation-progress · scroll-navigator.

### Module-specific wrappers (pattern, don't copy across modules)
`Cha*` (ChaWorkspaceFrame, ChaRoutePageHeader, ChaMetrics, ChaPanel, ChaModal, …),
`Accounting*`, `Crm*`, `Admin*`, `Communication*` — each delegates to the shared layer.

---

## NEW canonical components the redesign introduces

Target folders (brief Phase 13): `ui/ layout/ forms/ data-display/ feedback/ navigation/
overlays/ patterns/`.

| Component | Folder | Replaces / consolidates | Pattern |
|---|---|---|---|
| `AttentionList` / `AttentionItem` | patterns | dashboard exceptions panel, ad-hoc "needs attention" lists | DASHBOARD, APPROVALS |
| `Metric` (compact) + `MetricStrip` | data-display | `.mnx-metric-card`, `WorkspaceMetric` heavy variant, `DashboardInsightCard` stat footer | all |
| `QuickActions` | patterns | `.mnx-dashboard-launch-list`, quick-launch panel | DASHBOARD |
| `ActivityFeed` | data-display | `.mnx-table-card` recent-activity table, per-module activity lists | DASHBOARD, DETAIL |
| `FilterToolbar` | forms | per-page search+filter bars, `.mnx-search-field` variants | LIST, TABLE, REPORT |
| `SearchField` | forms | `.mnx-search-field` (14 rule blocks), team/directory search wrappers | many |
| `PageHeader` (thin, if `WorkspacePageHeader` insufficient) | layout | raw `<h1>` headers on NON_COMPLIANT routes | all |
| `DetailHeader` | patterns | route-local entity headers | ENTITY DETAIL |
| `SummaryStrip` | data-display | ad-hoc definition rows | ENTITY DETAIL |
| `FormSection` | forms | route-local fieldset styling | FORM |
| `FormFooter` / `SectionSaveBar` | forms | route-local save/cancel rows | FORM, SETTINGS |
| `LineItemsEditor` | forms | per-document line tables (invoices, JE, PO) | FORM (heavy) |
| `SettingsLayout` + `SettingsNav` | layout | ~40 payroll settings pages + other `/settings` | SETTINGS |
| `StageRail` | patterns | `.mnx-activity-node`, CHA/FF process step UIs | WORKFLOW |
| `StepIndicator` | patterns | booking wizard steps | WIZARD |
| `KanbanBoard` / `KanbanColumn` / `KanbanCard` | patterns | CRM deals/leads board | KANBAN |
| `CalendarGrid` / `CalendarToolbar` | patterns | `.mnx-schedule-calendar` (15 blocks), team-calendar, comms calendar | CALENDAR |
| `ReportControls` | forms | report param bars | REPORT |
| `EmptyState` (promote foundation's) | feedback | route-local empty markup, big zero cards | all |

Each new component: build → export from owner barrel → expose via
`src/components/monolith/index.ts` if public → add catalogue entry in
`src/components/monolith/catalogue` → `npm run design-system:verify`.

---

## Status legend
`CANONICAL` (built, registered) · `KEEP` · `MERGE` (fold into canonical) · `REBUILD` ·
`LEGACY` (works, migrate away) · `REMOVE-LATER` · `UNKNOWN`.

Per-component status tracked in `docs/ui-audit/component-audit.md`.
