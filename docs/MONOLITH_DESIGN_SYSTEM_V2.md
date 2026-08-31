# Monolith Design System V2 — Productivity First

> Status: Proposed consolidation standard
> Branch: `design-system-v2-productivity`
> Scope: Every user-facing Monolith route, route state, module workspace, portal, dialog, form, table, navigation surface, dashboard-adjacent page, loading state, empty state, error state, and permission state.

## 1. Why V2 exists

Monolith already has a design system, but the repository audit shows that the product has accumulated too many visual owners, duplicated selectors, route-local recreations, and module-specific CSS contracts. V2 is therefore not a new visual skin and not a second component library. It is a consolidation of the existing system into a smaller, stricter, productivity-oriented language.

The objective is to make every page feel like one application while improving information hierarchy, speed of scanning, keyboard efficiency, action clarity, and density for professional users.

### Success criteria

A page is V2-compliant only when:

1. its shell, header, spacing, controls, statuses, tables, forms, dialogs, feedback, and empty/loading/error states come from canonical components;
2. the layout is appropriate for the user's task rather than copied from another module;
3. business logic, permissions, workflow rules, validation, server actions, and data ownership are unchanged;
4. no route-local visual primitive duplicates a shared component;
5. Light, Night, and Violet themes are supported entirely through semantic tokens;
6. keyboard navigation and visible focus are preserved;
7. the page remains usable at dense desktop widths and narrow mobile widths;
8. the Admin Design System catalogue renders the real production component;
9. route and runtime audits pass.

## 2. Product design principles

### 2.1 Productivity over decoration

Every visual element must help the user understand state, find information, or perform an action. Remove decorative cards, duplicate headings, oversized hero areas, redundant descriptions, non-interactive hover motion, excessive gradients, and visual chrome that consumes working space without adding meaning.

### 2.2 One page, one primary job

Every route must have one obvious primary task. Secondary actions should be grouped in a toolbar, overflow menu, side panel, or contextual action area rather than competing with the main CTA.

### 2.3 Progressive disclosure

Show the information required to make the current decision first. Advanced configuration, long metadata sets, audit detail, secondary filters, and rarely used fields should be collapsed, tabbed, placed in a drawer, or revealed contextually.

### 2.4 Dense but breathable

Monolith is enterprise software. It should support high information density without becoming visually noisy. Favor compact controls, 4px spacing rhythm, disciplined typography, clear grouping, sticky actions where useful, and strong table ergonomics.

### 2.5 State is more important than decoration

Users must immediately understand what is pending, blocked, overdue, approved, completed, rejected, inactive, draft, or requires attention. Status treatment must be semantic and consistent across modules.

### 2.6 Familiar interaction patterns

The same interaction should look and behave the same everywhere. A filter, date picker, row menu, file uploader, confirmation dialog, save action, warning, empty state, status badge, or pagination control must not change personality between modules.

### 2.7 Operational continuity

Long workflows must preserve user context. Navigation between workflow stages must not discard entered data, filters, selection, uploaded files, or scroll context unless the workflow explicitly requires a reset.

## 3. Foundations

### 3.1 Typography

Primary family: Geist Sans through the existing semantic font contract.

Use only these semantic roles:

- Display: rare, dashboard/editorial surfaces only.
- Page title: route identity, 24–28px equivalent.
- Section title: major content block, 18–20px equivalent.
- Panel title: 15–16px equivalent.
- Body: 14px default for enterprise workspaces.
- Control: 13–14px.
- Label: 12px, medium/semibold, never all-caps unless meaningfully categorical.
- Helper/meta: 12px.
- Numeric/stat: tabular-friendly, strong contrast, compact line-height.

Rules:

- Do not create route-local font sizes.
- Do not use more than three type sizes inside a normal panel.
- Avoid huge route titles that push working content below the fold.
- Descriptions should explain a decision or workflow, not restate the title.

### 3.2 Spacing

Base unit: 4px.

Approved rhythm:

- 4: micro alignment.
- 8: related inline content.
- 12: compact control grouping.
- 16: default component padding and mobile page gap.
- 20: standard workspace stack gap.
- 24: section separation.
- 32: major composition break.
- 40/48: rare large dashboard or onboarding separation.

Default workspace should prefer 16–24px structural spacing rather than large marketing-style whitespace.

### 3.3 Radius

Keep the existing semantic radius model but reduce visual softness:

- Control: 6px target.
- Panel: 8px target.
- Feature/onboarding surfaces: 10–12px maximum.
- Pills are reserved for statuses, tags, segmented controls, avatars, and intentionally pill-shaped actions.

### 3.4 Borders and elevation

Default surfaces should use borders, not shadows, to define structure.

- Level 0: canvas, no shadow.
- Level 1: standard panel, 1px semantic border.
- Level 2: floating menu/popover/sticky toolbar, small shadow.
- Level 3: modal/dialog, medium shadow.

Do not use glow effects or decorative shadows on static cards.

### 3.5 Color

Use the existing semantic families and preserve their meaning across every module:

- Primary / information: blue-cyan.
- Success: green.
- Warning: amber.
- Danger: red.
- Violet: people/leave-specific supporting semantic where appropriate.
- Orange: holiday/calendar-specific supporting semantic where appropriate.
- Teal: secondary/helpdesk-specific supporting semantic where appropriate.

Color must communicate meaning. Do not assign arbitrary module colors to primary actions or common controls.

Default workspace UI should remain mostly neutral. Semantic color is used for state, priority, current selection, actionable emphasis, and data visualization.

### 3.6 Motion

Motion should confirm interaction, not decorate the page.

- Button/control feedback: 120–160ms.
- Popover/drawer/dialog: 160–220ms.
- Sidebar width transition: 180–220ms.
- Avoid translating static cards on hover.
- Respect reduced motion.

## 4. Core shell

### 4.1 Application shell

The authenticated shell consists of:

1. Left navigation.
2. Compact global header.
3. Main workspace.
4. Optional context/inspector drawer.
5. Global feedback layer: toast, command palette, dialogs.

The shell must maximize working area. Header and sidebar should never dominate the viewport.

### 4.2 Sidebar

Desktop expanded target: 232–248px.
Collapsed target: 56–64px.

Structure:

- workspace/product switcher;
- primary modules;
- contextual module navigation;
- utilities/settings at bottom.

Rules:

- single icon family;
- one active-state treatment;
- icon + label alignment must be identical in flyouts and sidebar rows;
- submenu indentation and row heights are tokenized;
- collapsed flyout reproduces the exact same labels, order, icon sizing, and semantic state as the expanded tree;
- no independent styling per module.

### 4.3 Global header

Target height: 52–56px.

Allowed global controls:

- route breadcrumbs when useful;
- command/search trigger;
- global warnings/notifications;
- quick-create when global in scope;
- account menu.

Do not place route-specific form actions in the global header unless they must remain persistently available.

## 5. Canonical page anatomy

Every standard authenticated route should compose from this order:

1. `WorkspacePage`
2. `WorkspacePageHeader`
3. optional `ContextSummary`
4. optional `WorkspaceToolbar`
5. content sections
6. optional sticky `ActionBar`

### 5.1 Page header

Required:

- title;
- optional concise description;
- optional breadcrumb/back affordance;
- one primary action;
- secondary actions grouped separately.

Do not repeat the route title inside the first card.

### 5.2 Context summary

Use when users need important record/workflow context while taking action. Typical content:

- record ID;
- customer/employee/vendor;
- owner;
- current status;
- due date;
- last updated;
- critical warnings.

Prefer a compact inline or two-row summary over a large collection of disconnected cards.

### 5.3 Sections

A section exists only when it groups a meaningful task or information set. Avoid wrapping every small group in its own card.

Use:

- section heading;
- optional helper/action;
- content.

Nested cards should be avoided unless the inner item is independently actionable or has its own state.

## 6. Component system

### 6.1 Actions

Canonical variants:

- Primary: one per action area.
- Secondary: standard non-destructive action.
- Quiet: low-emphasis toolbar action.
- Ghost: icon/utility action.
- Danger: destructive action.

Sizes:

- Compact: 28–30px height.
- Default: 34–36px height.
- Large: onboarding/auth only.

All icon-only actions require a tooltip and accessible label.

### 6.2 Inputs

Canonical controls:

- TextField
- TextArea
- NumberField
- SearchField
- Select
- Combobox
- MultiSelect
- DatePicker
- DateRangePicker
- TimePicker
- Checkbox
- RadioGroup
- Switch
- FileUpload
- DocumentDropzone

Default control height: 34–36px.

Field anatomy:

- label;
- control;
- optional helper;
- validation/error.

Do not place placeholder text as the only label.

### 6.3 Forms

Use three form patterns only:

1. Compact form — filters, small dialogs, quick edit.
2. Standard form — normal create/edit pages.
3. Structured form — complex configuration and ERP records.

Structured forms should group fields by decision context, not database schema.

For large forms:

- use two-column layout on desktop where scanning benefits;
- place long text, tables, attachments, and complex selectors full width;
- use sticky save/cancel bar when the form exceeds one viewport;
- show unsaved state;
- preserve values when navigating within multi-stage workflows.

### 6.4 Tables

The table is the default component for dense operational data.

Required capabilities where relevant:

- sticky header;
- sortable columns;
- filters;
- search;
- column visibility;
- row selection;
- bulk actions;
- pagination or virtualisation;
- compact density;
- keyboard focus;
- row actions in a consistent final column;
- loading, empty, error states;
- responsive fallback.

Row height targets:

- Compact: 36–40px.
- Default: 44–48px.

Rules:

- use tabular numbers for financial/numeric values;
- align numbers right;
- status columns use the canonical status component;
- primary record identifier is the only strongly emphasized text by default;
- do not turn every cell into a badge;
- do not hide critical actions behind hover-only UI.

### 6.5 Cards and panels

Canonical surface types:

- Panel: general grouping.
- Metric: compact KPI/stat.
- Action card: clickable navigation/action surface.
- Summary card: compact record context.
- Insight card: dashboard analytical content.

Static cards must not lift on hover.

### 6.6 Status

Canonical semantic states:

- Neutral
- Draft
- Active
- Pending
- In progress
- Completed
- Approved
- Rejected
- Blocked
- Warning
- Overdue
- Failed
- Inactive

Status labels should be concise. Use icon + text for high-risk states and when color alone is insufficient.

### 6.7 Alerts and warnings

Three levels:

- Inline field/section notice.
- Page/context banner.
- Global notification/warning popover.

Warnings must include action only when the user can resolve or acknowledge them.

For expiry/due-date warnings, use a common contract:

- issue title;
- affected record;
- deadline/context;
- severity;
- `Acknowledge` secondary action when applicable;
- `Go to` primary/quiet action with navigation icon;
- no decorative underglow.

### 6.8 Dialog, drawer, popover

Use Dialog for decisions that must block the current task.
Use Drawer for editing or reviewing supporting context while preserving the page.
Use Popover for short contextual controls.
Use DropdownMenu for action lists.

Do not use a modal for large workflows that need full-page navigation.

### 6.9 Empty, loading, error, permission

Every data surface must explicitly implement:

- Skeleton/loading;
- Empty state;
- No-results state;
- Error state;
- Permission/access-denied state where relevant.

Empty states should include one clear next action if the user can resolve the condition.

## 7. Page templates

V2 reduces hundreds of routes into a small number of repeatable UX templates.

### Template A — Index / operational list

For jobs, employees, invoices, leads, enquiries, vendors, documents, requests.

Structure:

- PageHeader
- optional metrics row
- Toolbar: search, filters, view options, primary create action
- DataTable
- bulk action bar when selected

### Template B — Record detail

For customer, employee, job, invoice, shipment, lead, bank account.

Structure:

- back/breadcrumb
- PageHeader with record identity + status
- ContextSummary
- tabs only when there are genuinely separate information domains
- main information / workflow
- optional activity/history rail or drawer
- sticky actions when appropriate

### Template C — Create / edit form

Structure:

- PageHeader
- grouped Standard/StructuredForm
- attachments/related data sections
- sticky Save/Cancel bar

### Template D — Workflow / stage page

For CHA and other staged operational processes.

Structure:

- persistent record context
- compact stage navigator
- active-stage content
- dependency/blocking notice when prerequisites are incomplete
- Jump to required stage action
- Resume previous stage/action after prerequisite completion
- persistent form/upload state across stage navigation

### Template E — Dashboard / overview

Structure:

- editorial header
- 3–6 meaningful metrics maximum in primary view
- exception/attention panel
- operational charts/tables
- shortcuts only when frequently used

Avoid dashboards that are merely grids of navigation cards.

### Template F — Settings / administration

Structure:

- settings navigation
- title + description
- grouped configuration sections
- save behavior scoped to section or page
- advanced settings progressively disclosed

### Template G — Approval queue

Structure:

- queue counts
- filter/search
- compact review table/list
- side drawer for context
- Approve / Reject / Request changes action group

### Template H — Report / analytics

Structure:

- report title
- date/context controls
- KPI summary
- visualization
- underlying table
- export/share actions

### Template I — Portal

Customer-facing pages use the same tokens and components but a simplified shell with fewer controls, more guidance, and stronger mobile optimization.

## 8. Navigation and information architecture rules

- A route should not exist only because the database has an entity.
- Related low-frequency pages should be grouped under a settings or secondary navigation context.
- Avoid duplicate navigation links to the same task unless role context genuinely differs.
- Preserve deep links.
- Use breadcrumbs only when hierarchy helps orientation.
- Prefer tabs for peer subviews of the same object, not unrelated navigation.

## 9. Module application guidance

### Accounting

Accounting is primarily dense list, record, transaction form, report, and configuration UI. Prioritize table ergonomics, right-aligned numbers, compact filters, consistent document states, and structured forms. Remove repeated page-specific cards and direct raw inputs.

### Admin

Use the Settings template. Keep advanced platform configuration discoverable but visually secondary. The design-system catalogue must remain a catalogue of production components, not a second styling owner.

### AMS / Assets

Use index/detail templates with strong status, owner, location, lifecycle, and maintenance context. Use drawers for supporting history rather than overcrowding detail pages.

### Attendance / HRMS / People

People pages should prioritize identity, current status, schedule/attendance state, approvals, and employee actions. Avoid excessive colorful cards. Calendar and timeline states should use semantic color consistently.

### CHA / Expense

Use Workflow and Operational List templates. Keep job identity, customer, stage, deadlines, warnings, documents, and blocking dependencies continuously visible. CHA is the strongest operational reference but should be simplified to V2 density and canonical components.

### Communication

Use a productivity inbox model: thread list, active conversation, context/actions. Avoid card grids for message-heavy workflows.

### CRM

Use index/detail/pipeline templates. Pipeline uses controlled semantic stage accents; record detail uses a consistent context summary and activity panel. Do not let each CRM object invent a separate record layout.

### Freight Forwarding

Use operational list, quote/shipment detail, and workflow patterns consistent with CHA where interaction semantics match.

### Payroll / My Payroll

Highest migration priority because the route audit identifies a large non-compliant surface. Use structured forms, tabular payroll tables, employee context, pay-run workflow, approval queue, and report templates. Do not recreate Zoho/Frappe page-by-page; adapt workflows to canonical Monolith components.

### Customer Portal

Use simplified Portal templates with fewer controls, clearer progress/state, large mobile touch targets, and no internal-only operational clutter.

## 10. Migration strategy

The existing source audit covers 352 pages and 405 route/state rows. V2 migration should happen by canonical pattern, not by manually restyling 352 routes independently.

### Phase 0 — Freeze visual sprawl

- No new route-local UI primitives.
- No additions to legacy compatibility CSS.
- No new module-global selector unless it is true module composition.
- New visual components must enter the production registry and catalogue.

### Phase 1 — Reduce foundation

- Normalize typography scale.
- Normalize control height.
- Normalize radii.
- Neutralize default surfaces.
- Reduce unnecessary shadows and gradients.
- Define canonical density tokens.
- Preserve Light, Night, Violet.

### Phase 2 — Canonical primitives

Finalize and verify:

- Button / IconButton
- Input / TextArea
- Select / Combobox
- Checkbox / Radio / Switch
- DatePicker / Calendar
- FileUpload
- Badge / Status
- Alert
- Tooltip
- DropdownMenu
- Popover
- Dialog
- Drawer
- Tabs
- Pagination
- Skeleton
- Empty/Error/Permission states

### Phase 3 — Productivity composites

Finalize:

- WorkspacePage
- WorkspacePageHeader
- WorkspaceToolbar
- ContextSummary
- MetricStrip
- FilterBar
- OperationalDataTable
- StructuredForm
- StickyActionBar
- StageNavigator
- DependencyNotice
- ApprovalQueue
- RecordActivity

### Phase 4 — Migrate by page template

Migrate route families in batches. Each batch must remove route-local recreations instead of hiding them under new CSS.

Priority order from current audit risk:

1. Payroll
2. HRMS / People
3. CRM
4. Customer Portal
5. Accounting remaining exceptions
6. CHA remaining exceptions
7. AMS
8. Communication
9. Attendance
10. Freight Forwarding
11. low-volume miscellaneous/public routes

### Phase 5 — CSS ownership cleanup

Target end state:

- one token foundation;
- one shared production system layer;
- minimal module composition styles;
- no legacy compatibility stylesheet;
- no duplicate selectors across owners;
- catalogue CSS only arranges specimens.

### Phase 6 — Runtime QA

For each migrated route:

- desktop 1440px;
- laptop 1280px;
- tablet 768px;
- mobile 390px;
- Light theme;
- Night theme;
- Violet theme;
- keyboard-only path;
- loading/empty/error/permission states;
- long-content and overflow test;
- real workflow interaction;
- screenshot comparison where practical.

## 11. V2 acceptance checklist for every page

- [ ] Uses canonical page shell.
- [ ] Has one clear primary task.
- [ ] No duplicate page title.
- [ ] No unnecessary decorative card.
- [ ] Uses canonical typography.
- [ ] Uses semantic spacing/radius/color tokens.
- [ ] Uses canonical buttons and fields.
- [ ] Uses canonical table/list pattern.
- [ ] Uses canonical statuses and alerts.
- [ ] Supports loading/empty/error states.
- [ ] Supports Light/Night/Violet.
- [ ] Has visible keyboard focus.
- [ ] No hover-only critical action.
- [ ] Mobile layout remains usable.
- [ ] No business logic changed.
- [ ] No new legacy compatibility selector.
- [ ] No duplicated component implementation.
- [ ] Production component is represented in Admin Design System catalogue.
- [ ] Source audit passes.
- [ ] Runtime verification recorded.

## 12. Required engineering guardrails

Add CI/lint enforcement for:

- raw `<button>`, `<input>`, `<select>`, `<textarea>` in migrated UI unless explicitly exempted;
- hardcoded colors outside approved visualization cases;
- route-local font families;
- arbitrary radii and shadows;
- direct imports from a second component system;
- new legacy compatibility selectors;
- duplicate shared component implementations;
- unregistered visual exports;
- catalogue-only component implementations.

## 13. Definition of done

V2 is complete only when:

1. all active user-facing route/state rows are classified and runtime verified;
2. every standard page maps to one of the canonical page templates or has a documented specialized exception;
3. non-compliant and partial route counts are zero except approved specialized routes;
4. duplicate selector ownership has been removed;
5. legacy compatibility CSS is no longer imported;
6. the Admin Design System page is a live inventory of production components;
7. no page relies on visual behavior that exists only in route-local CSS;
8. Light, Night, Violet and responsive verification are complete;
9. product users can move between modules without learning a new visual language.

---

## Implementation note

This document intentionally does not prescribe a visual rewrite of the working dashboard. The dashboard remains a composition reference, while V2 applies its strongest lessons—hierarchy, focused information density, and connected operational storytelling—to the rest of the product in a more minimal enterprise form.
