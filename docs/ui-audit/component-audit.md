# Component Audit

Scope this pass: dashboard components + shared primitives touched by the dashboard redesign.
Full app-wide component/style ownership audit already exists at
`docs/ui-component-and-style-ownership-audit.md` (3,600 lines) — not duplicated here.

Status: `CANONICAL` · `KEEP` · `MERGE` · `REBUILD` · `LEGACY` · `REMOVE-LATER` · `UNKNOWN`.

---

## Dashboard route-local components (`src/app/(dashboard)/dashboard/`)

| Component | File | Lines | Used by | Problem | Canonical replacement | Status |
|---|---|---|---|---|---|---|
| `HrmsPortalClient` | portal-client.tsx | 335 | `/dashboard` page | orchestrator; native `<button>` tabs; `.mnx-dashboard-page-shell` (102 CSS rules) | keep as orchestrator; tabs → `Tabs`; shell CSS → pattern layout | REBUILD |
| `AttendanceCommand` | _components/attendance-command.tsx | 415 | portal-client | oversized panel, running clock, celebration + action-burst animation, "Today's guide", duplicated pending counts | new `TodayStrip` + compact attendance sub-component; punch logic preserved | REBUILD |
| `DashboardOverview` | _components/dashboard-overview.tsx | 449 | portal-client (myspace tab) | `padStart(2,"0")` zero cards; analytics before action; 3 count locations; many `.mnx-*` classes | decompose → `AttentionList` + `Metric` + `QuickActions` + `ActivityFeed` + secondary accordion | REBUILD |
| `ModuleCommandCenter` | _components/module-command-center.tsx | 214 | DashboardOverview | overlaps sidebar + quick launch; `.mnx-module-card` (30 rules) | fold into `QuickActions` or compact `ModuleGrid` | MERGE |
| `DashboardTeam` | _components/dashboard-team.tsx | 239 | portal-client (team tab) | route-local list styling | reuse `OperationalDataTable` / `DataTable` | REBUILD |
| `DashboardOrganization` | _components/dashboard-organization.tsx | 631 | portal-client (org tab) | full directory embedded in dashboard; `.mnx-directory-grid`, `.mnx-people-*` | MOVE to `/hrms/org-structure`; reuse DIRECTORY pattern | MOVE |
| `graphics/*.tsx` (13 files) | graphics/ | ~2000 | overview / module cards | pure decoration; `.mnx-*-graphic` CSS (14–22 rules each) | none — remove from dashboard | REMOVE-LATER |
| `dashboard-design-system.tsx` | _components/ | 328 | ? (design-system tab) | overlaps `/admin/design-system` | consolidate into admin catalogue | MERGE |
| `dashboard-organization.tsx` dup of people table | — | — | — | — | see people.css module | MERGE |

## Shared components the redesign consumes / creates

| Component | File | Status | Note |
|---|---|---|---|
| `DashboardInsightCard/Grid/MiniBarChart/SegmentList` | data-display/dashboard-insights.tsx | KEEP → move | Legit chart primitives; used only after actionable content or on analytics route. Pick 1 chart lib (DESIGN.md open q.1). |
| `WorkspacePageHeader` | layout/workspace.tsx | CANONICAL | dashboard header uses this (currently doesn't) |
| `WorkspaceSectionHeading` | layout/workspace.tsx | CANONICAL | already used in overview |
| `OperationalDataTable` family | data-display/ | CANONICAL | recent-activity + team tables migrate to this |
| `Tabs` | ui/tabs.tsx | CANONICAL | replace native-button dashboard tabs |
| `Badge` | ui/badge.tsx | CANONICAL | replace `.mnx-badge-*` string classes + `MonolithBadge` |
| `Button` | ui/button.tsx | CANONICAL | punch buttons already use it (with extra `.mnx-*` classes to strip) |
| `MonolithEmptyState` | ui/foundation.tsx | KEEP → promote to `EmptyState` in feedback/ | used for empty states; needs to be THE empty state, replacing big zero cards |
| `WorkspaceLoadingState` / `WorkspaceErrorState` | feedback/workspace-states.tsx | CANONICAL | tab loading/error already use these |
| `MonolithSurface` / `MonolithBadge` / `MonolithAction` / `MonolithIconAction` | ui/foundation.tsx | LEGACY (`@deprecated`) | migrate to Card / Badge / Button (DESIGN.md open q.2) |

## NEW canonical components (from this redesign) — build before use

`AttentionList` / `AttentionItem`, `Metric` (compact) + `MetricStrip`, `QuickActions`,
`ActivityFeed`, `TodayStrip`. Folders + full list in `.stitch/COMPONENTS.md`.
Each: build → export → catalogue entry → `npm run design-system:verify`.

## App-wide reusable-concept duplication (pointers, not re-derived)

See `docs/ui-component-and-style-ownership-audit.md` for the full matrix. Known clusters:
- Search inputs: `.mnx-search-field` + team/directory/module search wrappers → one `SearchField`.
- Metric/stat surfaces: `.mnx-metric-card`, `WorkspaceMetric`, `DashboardInsightCard` footer,
  per-module metric wrappers → one `Metric` + `MetricStrip`.
- Filter bars: per-page → one `FilterToolbar`.
- Row actions: multiple models → one trailing-kebab `OperationalRowAction`.
- Settings pages: ~40 payroll + others each hand-rolled → `SettingsLayout` + `SettingsNav`.
- Process/step UIs: `.mnx-activity-node`, CHA + FF → one `StageRail`.
- Calendars: `.mnx-schedule-calendar` + team-calendar + comms → one `CalendarGrid`.
