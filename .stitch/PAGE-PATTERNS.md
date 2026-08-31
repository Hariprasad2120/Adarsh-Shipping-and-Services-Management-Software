# PAGE-PATTERNS.md — Canonical application page patterns

~290 routes collapse into **11 patterns**. Design each pattern once; migrate every route in
it against that structure. Each pattern maps to existing canonical components
(`src/components/layout/workspace.tsx`, `src/components/data-display/*`).

Shared frame for every authenticated pattern:
`WorkspacePage` (max width 75rem, standard gutters) → `WorkspacePageHeader`
(eyebrow, h1, description, primary action slot, optional graphic).

---

## 1. DASHBOARD — `/dashboard`, `/crm/dashboard`

```
WorkspacePageHeader           (no hero; eyebrow + h1 + primary action)
AttentionQueue                (P0: approvals, exceptions, tasks needing action; collapses when empty)
TodayStrip                    (compact: attendance status + punch action, deadlines)
QuickActions + ActivityFeed   (two columns; QuickActions = compact list)
SecondaryAccordion            (P3: announcements, calendar — collapsed by default)
```
Canonical: `WorkspaceSectionHeading`, `AttentionList` (new), `Metric` (new, compact),
`QuickActions` (new), `ActivityFeed` (new), `OperationalDataTable` for the activity table.

## 2. INDEX / LIST — browse & find, moderate density

```
WorkspacePageHeader           (primary action: New <entity>)
FilterToolbar                 (SearchField | filters | sort | view switch)
List or card grid
Pagination footer
```
Canonical: `FilterToolbar` (new, wraps `filter-menu.tsx` + `SearchField`), `DataTable`
or directory grid, `EmptyState`.

## 3. DATA TABLE — dense operational queues (accounting, CRM lists, CHA jobs)

```
WorkspacePageHeader           (primary action + optional secondary)
MetricStrip                   (optional: 2–4 connected summary metrics, static)
FilterToolbar
OperationalDataTable
  OperationalDataTableHeader / Wrap / Table / Head / Cell / PrimaryCell / Status / RowAction
OperationalDataTableFooter    (pagination)
OperationalTableEmpty
```
Canonical: the full `Operational*` family already exists. Row action = trailing kebab.

## 4. ENTITY DETAIL — `/hrms/employees/[id]`, `/crm/deals/[id]`, `/cha/jobs/[jobId]`

```
DetailHeader                  (entity name, key IDs, status badge, primary action, actions menu)
SummaryStrip                  (key facts as a compact definition row)
Tabs                          (Overview | Related data 1 | Related data 2 | History | ...)
  each tab: WorkspaceSectionHeading + WorkspacePanel content
```
Canonical: `DetailHeader` (new), `Tabs` (`src/components/ui/tabs.tsx`), `WorkspacePanel`.

## 5. CREATE / EDIT FORM — `/*/new`, `/*/[id]/edit`

```
WorkspacePageHeader           (h1: New <entity> / Edit <entity>)
FormSection[]                 (titled groups: WorkspaceField + Input/Select/Textarea/DateInput/Checkbox)
LineItemsEditor               (only for documents: invoices, journal entries, POs)
FormFooter                    (left: Cancel · right: Save primary; destructive separated)
```
Canonical: `WorkspaceField`, `WorkspaceInput/Textarea/Select/Checkbox`, `DateInput`,
`FormSection` (new), `LineItemsEditor` (new — reuse across accounting docs).

## 6. WORKFLOW / PROCESS — `/cha/process/[quoteId]`, `/freight-forwarding/process/[quoteId]`

```
WorkspacePageHeader           (entity + overall progress)
StageRail                     (horizontal or vertical; current stage highlighted, done collapsed)
CurrentStagePanel             (the one next action + its form)
StageHistory                  (collapsed)
```
Canonical: `StageRail` (new), `WorkspacePanel`, canonical form components.

## 7. WIZARD — `/freight-forwarding/create-booking`

```
WorkspacePageHeader
StepIndicator                 (1..n, linear)
StepPanel                     (one step's fields)
WizardFooter                  (Back · Next/Finish)
```
Canonical: `StepIndicator` (new, sibling of `StageRail`), form components.

## 8. SETTINGS — `/payroll/settings/**`, `/*/settings`

```
SettingsLayout
  SettingsNav (left: sections)
  SettingsPanel (right: selected section only)
    WorkspaceSectionHeading + WorkspaceField groups
    SectionSaveBar (per-section save state; unsaved-changes guard)
```
Canonical: `SettingsLayout` + `SettingsNav` + `SectionSaveBar` (new). Reuse across the
~40 payroll settings routes and every other `/settings`.

## 9. REPORT / ANALYTICS — `/accounting/profit-loss`, `/ams/analytics`, `/attendance/reports`

```
WorkspacePageHeader           (primary action: Export)
ReportControls                (period, entity, grouping — a FilterToolbar variant)
ReportBody                    (statement table and/or chart; print-friendly)
```
Canonical: `ReportControls` (new), `OperationalTable` for statement rows, a single chart
component (pick one — see DESIGN.md). No chart before the numbers.

## 10. CALENDAR — `/attendance/leaves/team-calendar`, `/communication/calendar`, `/crm/events`

```
WorkspacePageHeader
CalendarToolbar               (view switch: month/week; date nav; filters)
CalendarGrid
SidePanel                     (selected day / event detail + action)
```
Canonical: `CalendarGrid` + `CalendarToolbar` (new). One calendar implementation app-wide.

## 11. KANBAN / PIPELINE — `/crm/deals`, `/crm/leads`

```
WorkspacePageHeader           (primary action: New <entity>)
FilterToolbar
KanbanBoard
  KanbanColumn[] (stage header + count + WIP; cards draggable)
  KanbanCard (compact: name, value, owner, age)
```
Canonical: `KanbanBoard` / `KanbanColumn` / `KanbanCard` (new).

---

## Specialised (keep module-owned, still use tokens + canonical frame)

- **AUTHENTICATION** — `/(auth)/login`, `/customer-portal/login` (animated login CSS module).
- **Rich mail / chat / drive** — `/communication/mail`, `/chat`, `/drive`.
- **Maps** — `/hrms/location-tracking`, `/hrms/tracking`.
- **PDF / document viewers** — `/accounting/documents/[id]`, letters view.
- **Design-system catalogue** — `/admin/design-system`.

## Pattern → route-count (approx)

| Pattern | Routes |
|---|---|
| DATA TABLE | ~110 |
| CREATE / EDIT FORM | ~55 |
| SETTINGS | ~50 |
| ENTITY DETAIL | ~35 |
| REPORT / ANALYTICS | ~15 |
| INDEX / LIST | ~12 |
| WORKFLOW / PROCESS | ~6 |
| DASHBOARD | 3 |
| CALENDAR | 3 |
| KANBAN | 2 |
| WIZARD | 2 |
| Specialised | ~10 |
