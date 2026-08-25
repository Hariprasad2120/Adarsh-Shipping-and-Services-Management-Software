# Monolith UI migration handoff

Last updated: 2026-08-25

## 2026-08-25 Queue header deduplication handoff

Removed the repeated secondary queue heading pattern from freight-style
operational table pages so routes keep one primary page title while additional
helper copy moves behind the shared `!` disclosure.

Delivered:

- updated `src/components/data-display/operational-data-table.tsx` so
  `OperationalDataTableHeader` now supports:
  - `hideIdentity` for action-only/supplemental headers;
  - a shared inline `!` disclosure for table helper copy through the existing
    Monolith `mnx-card-info` treatment;
  - optional description/info content without forcing a second visible title
    block;
- updated `src/modules/crm/components/service-enquiries/service-enquiry-queue.tsx`
  so CRM freight/customs queue tables no longer repeat the queue name and
  eyebrow inside the table header when the page already provides that identity;
- updated `src/app/(dashboard)/freight-forwarding/process/page.tsx` so the
  freight forwarding process queue now keeps the single page header and exposes
  the workflow explanation through the `!` disclosure instead of a second
  visible heading stack.

Verification on Tuesday, August 25, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; .\node_modules\.bin\eslint.cmd "src/components/layout/workspace.tsx" "src/components/data-display/operational-data-table.tsx" "src/modules/crm/components/service-enquiries/service-enquiry-queue.tsx" "src/app/(dashboard)/freight-forwarding/process/page.tsx" --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed.

Known limits:

- this pass fixes the shared operational queue/table-header pattern, but other
  pages that still intentionally compose `WorkspacePageHeader` plus their own
  distinct section headings may need separate review if the second heading is
  not actually redundant;
- runtime browser verification for representative queue pages in Light, Night,
  and Violet themes is still pending in this Codex session.

## 2026-08-25 HRMS employee directory notifications-style alignment handoff

Aligned `/hrms/employees` to the flatter notifications-centre presentation so
the employee directory now uses tighter stacked section cards, solid header
bands, and denser employee rows instead of the older roomy grouped table cards.

Delivered:

- updated `src/app/(dashboard)/hrms/employees/page.tsx` so the route now uses a
  dedicated employee-directory page container with tighter vertical rhythm;
- updated `src/app/(dashboard)/hrms/employees/employee-directory-actions.tsx`
  so the directory controls now render as a dedicated filter/action panel with:
  - a notifications-style toolbar heading and helper copy;
  - a compact visible-count pill in the panel header;
  - the existing filter menu, export action, quick-add action, and full
    onboarding action preserved;
  - the total count moved into the same compact toolbar row instead of floating
    separately;
- updated `src/app/(dashboard)/hrms/employees/employee-list.tsx` so grouped
  employee sections now:
  - stack with a smaller gap between cards;
  - use solid shared header bands for each role group;
  - show compact `visible` count pills instead of bracketed counts;
  - use tighter table cell padding and flatter section framing;
- updated `src/styles/modules/people.css` with route-owned employee directory
  styling for:
  - the new filter/action panel shell;
  - compact section-card spacing;
  - solid grey/light muted section headers and theme-aware inverse behavior in
    darker themes through shared header tokens;
  - flatter employee row hover treatment and reduced row padding.

Verification on Tuesday, August 25, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; .\node_modules\.bin\eslint.cmd "src/app/(dashboard)/hrms/employees/page.tsx" "src/app/(dashboard)/hrms/employees/employee-list.tsx" "src/app/(dashboard)/hrms/employees/employee-directory-actions.tsx" --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed.

Known limits:

- runtime browser verification for `/hrms/employees` in Light, Night, and
  Violet themes is still pending in this Codex session;
- this pass preserves the grouped employee-by-role directory structure and does
  not convert the page into one single ungrouped stream, since the role-group
  segmentation appears intentional for HR operations.

## 2026-08-25 Todo notifications-centre alignment handoff

Reworked `/todo` so the personal task workspace now uses the same general
filter-and-stream composition as the notifications centre, with a denser card
stack and more compact task records.

Delivered:

- updated `src/app/(dashboard)/todo/todo-client.tsx` so the route now:
  - uses a notifications-style page header and removes the older hero graphic
    and top metrics strip;
  - introduces a dedicated `Filter task history` panel with shared Monolith
    fields for task status, reminder state, and free-text search;
  - renders the task stream through a notifications-style result panel with
    compact status chips, record metadata, right-aligned actions, and an
    expandable detail section for reminder and checklist content;
  - keeps all existing task CRUD, completion toggles, reminder handling, and
    checklist editing behavior intact while shifting the visual composition;
- updated `src/styles/monolith-system.css` so:
  - todo and notification card stacks now use a tighter shared vertical gap;
  - shared card-like list items use a smaller bottom margin for denser stacking;
  - todo record detail spacing is reduced and the expanded section now uses a
    cleaner divider treatment;
  - the todo filter shell now aligns with the shared notifications filter form.

Verification on Tuesday, August 25, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; .\node_modules\.bin\eslint.cmd "src/app/(dashboard)/todo/todo-client.tsx" --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed.

Known limits:

- runtime browser verification for `/todo` against the notifications route in
  Light, Night, and Violet themes is still pending in this Codex session;
- older focused UI tests that assert the previous todo hero graphic/header
  composition will need updating in a follow-up test-maintenance pass if they
  are still intentionally enforcing the pre-alignment design.

## 2026-08-25 Shared header card and alignment normalization handoff

Standardized the shared Monolith page and table header treatment so table
column headers render as a dedicated 2D header band and route headers align
more consistently with the content beneath them.

Delivered:

- updated `src/styles/monolith-system.css` so:
  - shared workspace and dashboard pages now define one `--mnx-content-edge`
    spacing token for top-level header alignment;
  - `mnx-page-header`, `mnx-toolbar`, `mnx-table-toolbar`,
    `mnx-operational-table-header`, `mnx-table-card > header`,
    `mnx-panel-heading`, and `mnx-organization-header` now inherit that shared
    content edge instead of some routes collapsing all header padding to zero;
  - shared table column headers for `mnx-workspace-table`,
    `mnx-accounting-table`, and `mnx-table-card` now render as a dedicated
    theme-aware 2D header band with its own surface, border, and rounded outer
    corners;
  - Light theme uses the new muted grey header-card treatment with darker text,
    while Night and Violet inherit the inverse darker surface plus lighter text
    through the same shared variables.

Verification on Tuesday, August 25, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed.

Known limits:

- runtime browser verification across representative routes with large table
  surfaces and custom module headers is still pending in this Codex session;
- routes with intentionally module-owned custom list/grid compositions that do
  not use the shared table primitives will need separate follow-up if they
  should adopt the same header-card language.

## 2026-08-25 Shared Monolith table row normalization handoff

Normalized the shared Monolith table presentation so operational and workspace
tables across the app use the flatter continuous-row format instead of the
later floating-card row treatment.

Delivered:

- updated `src/styles/monolith-system.css` in the shared table styling layer so:
  - `mnx-workspace-table`, `mnx-table-card`, and related people-table row cells
    no longer render as individually rounded floating cards;
  - shared table rows now use continuous horizontal separators, transparent row
    surfaces, and no cell box-shadows by default;
  - first and last table cells no longer force rounded outside corners or side
    borders;
  - the shared hover state keeps the accent-highlight behavior, but now reads
    as a flat row highlight rather than a lifted card;
  - Night and Violet themes inherit the same flatter row structure through the
    same shared token-driven border treatment;
- this change is intended to propagate the same row format across Monolith
  table-driven surfaces such as queues, approval tables, notifications lists
  that use the shared table primitives, and other operational workspace tables
  instead of requiring route-by-route overrides.

Verification on Tuesday, August 25, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed.

Known limits:

- runtime browser verification across representative routes such as `/todo`,
  `/notifications`, approval workspaces, and queue pages is still pending in
  this Codex session;
- routes that do not use the shared Monolith table primitives and instead
  render custom card lists will keep their existing module-owned layouts until
  separately migrated.

## 2026-08-25 Shared card info-disclosure handoff

Moved shared card helper copy behind a small in-card `!` disclosure so
functional explanations no longer stay permanently expanded inside panel and
metric cards across the Monolith workspace system.

Delivered:

- updated `src/components/layout/workspace.tsx` so:
  - `WorkspacePanelHeader` now renders card descriptions through a shared
    `!` disclosure in the card action corner instead of always showing the
    helper paragraph under the title;
  - non-link `WorkspaceMetric` cards now render their helper/detail text
    through the same shared disclosure control;
  - linked/actionable metric cards keep their inline detail copy so the
    shared metric link remains valid and does not nest a second interactive
    control inside the clickable surface;
- updated `src/styles/monolith-system.css` with the shared Monolith disclosure
  trigger and popover treatment, including the compact circular `!` control,
  floating explanatory surface, and mobile alignment behavior;
- updated `src/components/layout/workspace.test.tsx` with focused coverage for
  the shared metric and panel disclosure markup;
- regenerated:
  - `docs/ui-route-audit.md`
  - `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`

Verification on Tuesday, August 25, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; .\\node_modules\\.bin\\eslint.cmd 'src/components/layout/workspace.tsx' 'src/components/layout/workspace.test.tsx' --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit plus migration status docs;
- focused Vitest for `src/components/layout/workspace.test.tsx` could not run
  because repository test startup is guarded by the existing
  `.env.staging.local` requirement in `vitest.config.ts`;
- repo TypeScript was already green earlier in this session after the header
  simplification batch, and this disclosure batch is limited to the shared
  workspace primitives plus stylesheet/test updates.

## 2026-08-25 Freight forwarding queue visual alignment handoff

Aligned `/freight-forwarding/process` to the approved demand-intake queue composition so the route now reads like the provided reference instead of a generic quote handoff table.

Delivered:

- rebuilt `src/app/(dashboard)/freight-forwarding/process/page.tsx` so the route now:
  - uses the demand-intake page-header copy shown in the reference;
  - renders a search + apply toolbar and visible-records summary inside the shared `OperationalDataTableHeader`;
  - presents the queue in the same higher-density column structure as the reference: `Reference`, `Customer`, `Mode`, `Direction`, `Route`, `Commodity`, `Assignment`, `Status`, and `Open`;
  - keeps the queue truthful by deriving `Mode`, `Direction`, and processing status from the existing quote snapshot and workflow-conversion data instead of inventing new backend fields;
  - supports server-rendered filtering through the `search` query parameter;
- extended `src/modules/crm/quote-process.ts` so queue rows retain the existing raw quote snapshot alongside the workflow context, allowing the freight queue to display shipment metadata already captured by CRM;
- updated `src/styles/modules/freight-forwarding.css` with freight-owned queue styling for:
  - the process-toolbar layout;
  - the compact `Open` row action treatment;
  - the soft highlighted first-row state that matches the provided reference more closely.

Verification on Tuesday, August 25, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; .\node_modules\.bin\eslint.cmd "src/app/(dashboard)/freight-forwarding/process/page.tsx" "src/modules/crm/quote-process.ts" --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated `docs/ui-route-audit.md` plus
  `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated `docs/ui-component-and-style-ownership-audit.md`.

Known limits:

- runtime browser verification for `/freight-forwarding/process` across Light, Night, and Violet themes is still pending in this Codex session;
- the screenshot includes slightly richer queue-language examples such as explicit `Quote Draft` and `Rates Requested` states, but this pass intentionally keeps status labels bounded to the real freight conversion workflow data already stored on the quote.

## 2026-08-25 Monolith header copy simplification handoff

Shortened the shared Monolith page-header copy so route titles and descriptions
read faster and stop repeating the same module language across the app shell.

Delivered:

- updated the shared route metadata in:
  - `src/modules/admin/components/admin-workspace.tsx`
  - `src/modules/cha/components/workspace/cha-workspace.tsx`
  - `src/modules/communication/components/workspace/communication-workspace.tsx`
  - `src/modules/performance/components/performance-workspace.tsx`
  - `src/modules/people/components/people-workspace.tsx`
  - `src/modules/crm/components/workspace/crm-workspace.tsx`
  - `src/modules/accounting/components/accounting-workspace.tsx`
- simplified top-level hub titles such as `Admin`, `CRM`, `Accounting`,
  `HRMS`, `Attendance`, `Communication`, `Appraisals`, and `Learning` in place
  of longer `command centre` phrasing;
- shortened route descriptions across the shared workspaces to compact
  task-first summaries instead of long repeated operational sentences;
- tightened standalone route headers in:
  - `src/app/(dashboard)/payroll/layout.tsx`
  - `src/app/(dashboard)/my-payroll/layout.tsx`
  - `src/app/(dashboard)/notifications/page.tsx`
  - `src/app/(dashboard)/product-catalogue/page.tsx`
  - `src/app/(dashboard)/todo/todo-client.tsx`
  - `src/modules/freight-forwarding/components/freight-forwarding-workspace.tsx`
  - `src/modules/freight-forwarding/components/freight-forwarding-workspace-client.tsx`
- updated the focused workspace metadata tests so the shared title assertions
  match the new shorter headers.

Verification on Tuesday, August 25, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated `docs/ui-route-audit.md` plus
  `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`;
- focused ESLint on the touched files completed with no errors, but still
  reports pre-existing shared-workspace warnings for intentional/raw controls in:
  `src/app/(dashboard)/todo/todo-client.tsx`,
  `src/modules/accounting/components/accounting-workspace.tsx`,
  `src/modules/admin/components/admin-workspace.tsx`,
  `src/modules/cha/components/workspace/cha-workspace.test.tsx`,
  `src/modules/communication/components/workspace/communication-workspace.tsx`,
  `src/modules/crm/components/workspace/crm-workspace.tsx`, and
  `src/modules/performance/components/performance-workspace.tsx`;
- focused Vitest for the touched workspace metadata tests could not run because
  repository test startup is guarded by the existing `.env.staging.local`
  requirement in `vitest.config.ts`.

## 2026-08-25 Dashboard shell truthfulness sweep handoff

Completed another dashboard truthfulness pass across the shared shell pieces
that sit above and around the three main dashboard workspaces.

Delivered:

- updated `src/app/(dashboard)/dashboard/portal-client.tsx` and
  `src/app/(dashboard)/dashboard/_components/attendance-command.tsx` so the
  attendance hero now:
  - receives the live module snapshot and only shows the `Product Catalogue`
    action lane when that module is actually visible to the current role;
  - replaces invented hero fallbacks such as `Team member`,
    `General operations`, and `Head office` with explicit neutral states:
    `Designation not assigned`, `Department not assigned`, and
    `Branch not assigned`;
- updated
  `src/app/(dashboard)/dashboard/_components/dashboard-organization.tsx` so
  the organization directory and people moments no longer imply synthetic
  organization data:
  - employee names now fall back to `Name not recorded`;
  - designation, department, and branch values are left blank until rendered,
    where the UI now says `Designation not assigned`,
    `Department not assigned`, and `Location not assigned` instead of
    inventing role/office defaults;
- updated
  `src/app/(dashboard)/dashboard/_components/module-command-center.tsx` so the
  zero-module state is now a neutral `No dashboard modules are enabled yet`
  message instead of implying the workspace is already ready;
- updated `src/modules/dashboard/service.ts` so the freight-forwarding module
  summary now uses the more truthful tertiary metric label `workspace routes`
  instead of `ready screens`.

Verification on Tuesday, August 25, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; .\\node_modules\\.bin\\eslint.cmd 'src/app/(dashboard)/dashboard/portal-client.tsx' 'src/app/(dashboard)/dashboard/_components/attendance-command.tsx' 'src/app/(dashboard)/dashboard/_components/dashboard-organization.tsx' 'src/app/(dashboard)/dashboard/_components/module-command-center.tsx' 'src/modules/dashboard/service.ts' --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  currently fails on missing generated Prisma model files under
  `src/generated/prisma/models/**`, which is a repository environment/state
  issue outside this dashboard UI batch.

## 2026-08-25 Dashboard team truthfulness handoff

Tightened the `/dashboard` `Team` workspace so it no longer invents team
directory values and now distinguishes a genuinely empty reporting line from a
search result that simply returned no matches.

Delivered:

- updated `src/modules/hrms/service.ts` so `getTeamReportees(...)` no longer
  fabricates fallback team values:
  - removed the hardcoded `"Chennai"` branch fallback;
  - stopped forcing a synthetic `"Associate"` designation when the employee
    record has no designation assigned;
- updated
  `src/app/(dashboard)/dashboard/_components/dashboard-team.tsx` so the team
  tab now:
  - shows a truthful `No direct reportees assigned` empty state when the user
    has no current reportees instead of rendering an empty filterable table;
  - preserves the existing `No matching reportees` search/filter empty state
    only for the case where live team data exists but the current query/filter
    removes all rows;
  - renders `Designation not assigned` and `Location not assigned` in the table
    when the underlying employee records are incomplete instead of implying a
    default team role or office;
  - uses the shared `Input` primitive for the search field and documents the
    intentional raw filter-chip buttons used for the current pressed-state
    dashboard pattern.

Verification on Tuesday, August 25, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; .\\node_modules\\.bin\\eslint.cmd 'src/app/(dashboard)/dashboard/_components/dashboard-team.tsx' 'src/modules/hrms/service.ts' --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed.

## 2026-08-25 Dashboard organization policies truthfulness handoff

Removed the remaining synthetic policy-document placeholders from the
`Organization` workspace inside `/dashboard` so the route no longer pretends a
central company handbook library exists when the dashboard has no live source
for it yet.

Delivered:

- updated
  `src/app/(dashboard)/dashboard/_components/dashboard-organization.tsx` so the
  `Policies` tab no longer renders the earlier fake downloadable policy list;
- replaced that list with a truthful dashboard policy hub that:
  - explicitly states that a centralized company policy library is not yet
    connected to the dashboard;
  - links users to the live operational policy workspaces that actually exist
    today:
    `/attendance/leaves/policies`,
    `/hrms/location-tracking`, and
    `/hrms/reimbursement`;
  - keeps the organization workspace inside the current Monolith shared card,
    button, and content patterns instead of introducing a one-off treatment.

Verification on Tuesday, August 25, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; .\\node_modules\\.bin\\eslint.cmd 'src/app/(dashboard)/dashboard/_components/dashboard-organization.tsx' --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  still fails on the unchanged repository-wide button-variant mismatch in
  `src/modules/payroll/components/report-toolbar.tsx` (`"secondary"` is no
  longer a valid shared button variant at lines 89 and 101).

Known limits:

- the dashboard still does not have a live centralized company policy-document
  datasource; this batch makes that absence explicit instead of masking it with
  placeholders;
- browser verification for this dashboard route was reported complete by the
  user outside this Codex run and was therefore not repeated in-tool here.

## 2026-08-25 Dashboard command-center data foundation handoff

Extended `/dashboard` so the main `My space` workspace now pulls from a
dedicated dashboard command-center aggregation layer instead of relying only on
the earlier personal HR landing widgets.

Delivered:

- added `src/modules/dashboard/command-center.ts` as a server-only shared
  dashboard aggregation layer that now prepares:
  - a live `Needs your attention` queue from overdue personal To-Do tasks,
    important personal notifications, urgent open help-desk items, and pending
    leave or OT approvals when the user can act on them;
  - a permission-aware `Organization pulse` metric strip derived from the
    existing role-visible module snapshot;
  - live AMS stage distribution counts for the active appraisal workflow;
  - live attendance signals for checked-in staff, active breaks, pending leave
    queue pressure, and upcoming holidays;
  - a recent activity feed combining announcements, personal notifications, and
    recent appraisal audit movement when AMS is visible;
- extended `src/modules/dashboard/types.ts` with typed command-center snapshot
  contracts so the dashboard route no longer passes this batch as ad hoc data;
- updated `src/app/(dashboard)/dashboard/page.tsx` so `/dashboard` now loads the
  new command-center snapshot on the server beside the existing user profile,
  widgets, and module snapshot data;
- updated `src/app/(dashboard)/dashboard/portal-client.tsx` and
  `src/app/(dashboard)/dashboard/_components/dashboard-overview.tsx` so the
  `My space` tab now:
  - shows the live attention queue, org pulse, appraisal pipeline, attendance
    pulse, and recent activity sections through the existing dashboard insight
    and workspace primitives;
  - removes the earlier synthetic weekly schedule output from the main overview
    tab and replaces it with live module-coverage and quick-launch framing;
- updated `src/app/(dashboard)/dashboard/module-dashboard.test.ts` so the
  focused dashboard guardrail reflects the new command-center data flow and the
  removal of the synthetic schedule helper.

Verification on Tuesday, August 25, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; .\\node_modules\\.bin\\eslint.cmd 'src/modules/dashboard/command-center.ts' 'src/modules/dashboard/types.ts' 'src/app/(dashboard)/dashboard/page.tsx' 'src/app/(dashboard)/dashboard/portal-client.tsx' 'src/app/(dashboard)/dashboard/_components/dashboard-overview.tsx' 'src/app/(dashboard)/dashboard/module-dashboard.test.ts' --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit plus migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the unchanged repository-wide `src/components/monolith`
  ownership baseline outside this dashboard batch;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx vitest run 'src/app/(dashboard)/dashboard/module-dashboard.test.ts' --reporter verbose`:
  still fails at startup on the unchanged repository guard that requires
  `.env.staging.local`.

Known limits:

- runtime browser verification for `/dashboard` across Light, Night, and Violet
  themes is still pending in this Codex session;
- the dashboard route still retains broader migration debt in the `Team` and
  `Organization` tabs, including the current organization policies view, which
  still needs a non-placeholder backing source or a stricter truthful empty
  state before the full route can be considered complete;
- the new command-center batch intentionally reuses current workflow routes for
  drill-downs and does not yet add dedicated deep-link filtered search-parameter
  routes for every attention item or appraisal stage.

## 2026-08-25 Multi-theme token-driven sidebar tint & hoverable-card handoff

Refactored the navigation sidebar background tint and item hoverable-card lift interaction in `src/styles/monolith-system.css` using semantic design tokens (`var(--mnx-accent)`, `var(--mnx-accent-soft)`, `var(--mnx-card)`, `var(--mnx-surface)`, `var(--mnx-border)`) to ensure automatic, seamless color styling across **Light, Night/Dark, and Violet themes**.

Delivered:
- updated `.mnx-sidebar` container background to use `color-mix(in srgb, var(--mnx-accent-soft) 32%, var(--mnx-surface))` gradient tint and border-right `color-mix(in srgb, var(--mnx-accent) 22%, var(--mnx-border))`;
- updated `.mnx-sidebar-entry`, `.mnx-sidebar-subnav > a`, `.mnx-sidebar-subnav-item > a`, `.mnx-mona-card`, and `.mnx-sidebar-user` to use token-based gradient card backgrounds and borders;
- verified `@tailwindcss/postcss` compilation and `npm run design-system:verify` with 0 errors across Light, Night, and Violet theme variants.

## 2026-08-25 Mona desktop pet handoff

Added a live Mona desktop-pet layer to the authenticated Monolith shell so the
existing assistant now behaves more like a dynamic workspace companion instead
of only a floating FAB plus chat panel.

Delivered:

- added `src/modules/mona/components/mona-desktop-pet.tsx` as a Mona-owned
  floating companion that:
  - renders a theme-aware animated pseudo-3D pet with layered orbit rings,
    bobbing motion, a speech bubble, and a draggable docked surface;
  - persists its dragged position locally so the pet behaves like a desktop
    companion across Monolith workspaces;
  - exposes quick controls for `Assist here`, workspace search, chat toggle,
    and notifications access from the same floating control layer;
  - can open the existing Mona chat and send a route-specific help prompt so
    the pet can immediately assist with the active workspace context;
- added `src/modules/mona/pet-events.ts` as the small client-side event bridge
  for route-awareness, notification reactions, and shell search opening;
- updated `src/modules/core/components/monolith-app-shell.tsx` so the shell now:
  - mounts the desktop pet beside the existing Mona chat;
  - dispatches route-context updates to the pet whenever the active Monolith
    workspace changes;
  - listens for the pet search-open event so the existing workspace search
    command can be triggered from the pet controls;
- updated `src/modules/notifications/components/notification-provider.tsx` so
  newly surfaced local or remote notification toasts emit pet reaction events,
  allowing Mona to switch into an alert/help posture when new Monolith activity
  arrives;
- updated `src/styles/monolith-system.css` with shared Monolith styling for the
  new desktop-pet shell, bubble, animated pseudo-3D body, utility controls,
  and responsive floating layout.

Verification on Tuesday, August 25, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; .\\node_modules\\.bin\\eslint.cmd 'src/modules/mona/components/mona-desktop-pet.tsx' 'src/modules/mona/pet-events.ts' --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed.

Known limits:

- this pass keeps Mona’s new desktop-pet interactions client-side and
  route-aware, but it does not introduce deeper server-side action execution
  for every Monolith module beyond opening chat, surfacing notifications,
  triggering workspace search, and sending route-specific assistance prompts;
- the shell and notification provider still contain older raw-button lint
  warnings if linted as whole files with `--max-warnings=0`; those warnings were
  not introduced by this desktop-pet batch;
- manual runtime browser verification across Light, Night, and Violet themes is
  still pending in this Codex session.

## 2026-08-25 Sidebar container mint tint & hoverable-card item lift handoff

Applied a distinct soft mint color tint to the entire navigation sidebar container (`.mnx-sidebar`) and scoped the signature hoverable card effect (`background: linear-gradient(180deg, #eefaf3, #f7fcf9)`, border `#d8e9dd`, shadow `0 10px 24px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)`, `translateY(-1px)`) specifically to the interactive sidebar items.

Delivered:
- updated `.mnx-sidebar` in `src/styles/monolith-system.css` with a soft mint background gradient (`linear-gradient(180deg, #f7fcf9 0%, #edf7f1 100%)`) and border-right `#d8e9dd` to make the sidebar stand out distinctly from the main page area;
- applied plain resting state and lift-to-card hover/focus interactions across `.mnx-sidebar-entry`, `.mnx-sidebar-subnav > a`, `.mnx-sidebar-subnav-item > a`, `.mnx-mona-card`, and `.mnx-sidebar-user`;
- verified PostCSS compilation and design system coverage (`npm run design-system:verify`) with 0 errors.

## 2026-08-25 CRM masters command-centre rework handoff

Reworked `/crm/masters` from a basic tab-plus-table page into a fuller masters
command centre with flatter 2D surfaces, non-scrolling workspace switching,
and stronger governance framing inspired by current Zoho-style ERP master-data
management patterns while preserving the existing CRM item embed plus the
current structured import and manual-entry behavior.

Delivered:

- rebuilt `src/modules/crm/components/masters/crm-masters-workspace.tsx` so the
  page now:
  - keeps the existing master tabs, item workspace embedding, spreadsheet
    upload, template download, export, import mapping, import progress, and
    single-entry creation flows intact;
  - replaces the old horizontal tab rail with a wrapped workspace-card switcher
    so tabs do not rely on horizontal scrolling;
  - adds a top summary strip for structured-master coverage, managed record
    volume, embedded item scale, and latest-import visibility;
  - reframes each structured master as a managed register with coverage,
    data-quality, and import-discipline cards plus a search or status-filter
    workbench;
  - adds an attention queue for inactive or incomplete records and clearer
    reference-management guidance so operators can see cleanup needs faster;
  - keeps the overall surface treatment plain and flat instead of using glossy
    or elevated card styling;
- updated `src/styles/modules/crm.css` with CRM-owned styling for:
  - the wrapped workspace-card grid;
  - flat governance and operations cards;
  - the masters search field, attention rail, focus tags, and responsive
    no-scroll workspace layout;
- regenerated:
  - `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`;
  - `docs/ui-route-audit.md`;
  - `docs/ui-component-and-style-ownership-audit.md`.

ERP/reference framing used in this batch:

- official Zoho Inventory and Zoho CRM help or product pages reviewed on
  Tuesday, August 25, 2026 informed the added import-mapping emphasis,
  duplicate-aware bulk maintenance posture, process-specific module framing,
  and item or inventory-management signals.

Verification on Tuesday, August 25, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; .\\node_modules\\.bin\\eslint.cmd 'src/modules/crm/components/masters/crm-masters-workspace.tsx' --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit plus migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit.

Known limits:

- runtime browser verification across Light, Night, and Violet themes is still
  pending in this Codex session;
- this pass improves framing, filtering, visibility, and operator guidance for
  the Masters route without introducing persistent backend models for approval
  workflows, ownership assignments, or master-record history beyond the current
  in-memory client-side behaviors already used by the page.

## 2026-08-25 CHA dashboard hoverable job-row handoff

Adjusted the shared operational table interaction so linked shipment rows in the
CHA dashboard read as plain table rows at rest and lift into a hoverable-card
treatment on pointer or keyboard focus.

Delivered:

- updated `src/styles/monolith-system.css` so shared
  `.mnx-operational-linked-row` rows inside `.mnx-table-card` now:
  - remain visually flat when idle;
  - switch to per-cell surface fill, rounded outer corners, and a soft bordered
    hover/focus shell when the row is interactive;
  - preserve the existing semantic table structure, keyboard navigation, and
    `OperationalLinkedRow` click behavior without changing CHA business logic.

Verification on Tuesday, August 25, 2026:

- source inspection only in this Codex session; no targeted runtime browser
  verification or automated CSS visual test was run after the stylesheet change.

Known limits:

- the hoverable-card treatment applies to shared operational linked rows, so any
  other route using the same canonical linked-row pattern inside
  `OperationalDataTable` will inherit the same interaction;
- Light, Night, and Violet runtime verification is still pending in this Codex
  session.

## 2026-08-25 CRM enquiry commercial-summary compaction handoff

Refined the CRM enquiry commercial worksheet header so the rate-acquisition area
uses a denser control-strip composition instead of the earlier oversized summary
plus flat status-card layout.

Delivered:

- updated `src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx` so the
  enquiry commercial surface now:
  - keeps the existing business logic, workflow statuses, and rate-request data;
  - compresses the oversized worksheet summary into a two-part command strip
    with inline pending-department and next-milestone context;
  - adds a compact right-side control board for requests, responses, finalized
    buy-rate snapshots, and costing state;
  - converts the workflow stage cards into numbered mini-stage panels so the
    progression reads faster while consuming less vertical space;
  - rebuilds the enquiry mail composer into a communication-style full-width
    compose sheet with header controls, address rows, subject line, note strip,
    larger message editor, and a footer send bar while preserving CRM-specific
    recipient chips, reporting-CC handling, template reset, and send-to-agents
    workflow behavior;
  - updated `src/styles/modules/crm.css` with CRM module-owned styles for the new
  summary shell, command-board tiles, compact stage-step presentation, and the
  communication-inspired enquiry compose sheet plus bottom suggestion dock.

Verification on Tuesday, August 25, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; .\\node_modules\\.bin\\eslint.cmd 'src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx' --max-warnings=0`:
  passed.

Known limits:

- this pass intentionally focuses on visual density and workflow readability for
  the CRM enquiry commercial header area; it does not change the downstream
  mail composer, response capture, comparison logic, or pricing workflow;
- runtime browser verification across Light, Night, and Violet themes is still
  pending in this Codex session.

## 2026-08-25 CRM enquiry full-width cardless workspace handoff

Flattened the CRM enquiry commercial workflow so the page reads as one full-width
 operating workspace instead of a stack of boxed cards.

Delivered:

- updated `src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx` so the
  enquiry workflow now:
  - removes the remaining `CrmPanel` card wrappers from the commercial summary,
    stage tracker, composer, worksheet, comparison, pricing, and pricing-lock
    sections;
  - swaps the remaining rounded bordered pricing and warning tiles inside the
    enquiry workflow for flat section bands and metric rows;
  - keeps all existing CRM enquiry functionality, rate workflow actions,
    comparison logic, recommendation flow, pricing controls, and quotation
    creation behavior intact while changing the visual composition only;
- updated `src/styles/modules/crm.css` so the CRM enquiry workflow now:
  - uses full-width section spacing, lighter dividers, and flatter vertical
    rhythm instead of repeated card shells;
  - flattens suggestion, preview, response, comparison, recommendation, and
    pricing sub-surfaces into aligned rows and section bands;
  - preserves responsive behavior while letting the pricing metrics and enquiry
    workflow sections use more of the available width.

Verification on Tuesday, August 25, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; .\\node_modules\\.bin\\eslint.cmd 'src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx' --max-warnings=0`:
  passed.

Known limits:

- this pass focuses on removing card-heavy treatment and improving spacing,
  typography rhythm, and section alignment inside the CRM enquiry page without
  changing any business logic;
- runtime browser verification across Light, Night, and Violet themes is still
  pending in this Codex session.

## 2026-08-25 Attendance command centre rework handoff

Reworked `/attendance` from a lightweight attendance summary page into a fuller
attendance command centre with control-tower framing closer to modern ERP
attendance workspaces while staying inside the People module design system and
the existing attendance services.

Delivered:

- rebuilt `src/app/(dashboard)/attendance/page.tsx` so the attendance home now:
  - expands beyond the earlier personal summary into a command-centre layout
    that surfaces daily capture posture, leave and overtime exceptions,
    biometric sync recency, workforce reporting coverage, and month-end
    attendance readiness;
  - keeps the route inside the shared `PeopleWorkspaceFrame` and reuses
    `PeopleSummary`, `PeopleSection`, `PeopleSectionHeader`, `PeopleTable`,
    `PeopleStatus`, `PeopleActionLink`, and the shared dashboard-insight
    components instead of introducing route-local primitives;
  - adds operational lane grouping for punch capture, leave control,
    overtime/settings, and sync/reporting so the module reads like a managed
    attendance console instead of a flat shortcut board;
  - adds an approvals or request watchlist plus month-to-date attendance
    leaders so operators can act without leaving the home route immediately;
- updated `src/styles/modules/people.css` with module-owned attendance command
  centre styling for:
  - the command-grid and priority-rail composition;
  - attendance lane cards and responsive operational link groups;
  - watchlist cards and closure checkpoint panels;
  - desktop, tablet, and mobile collapse behavior;
- regenerated:
  - `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`;
  - `docs/ui-route-audit.md`;
  - `docs/ui-component-and-style-ownership-audit.md`.

ERP/reference framing used in this batch:

- real-time attendance capture, biometric sync, leave plus overtime tracking,
  policy controls, and payroll-ready attendance reporting were aligned with the
  current Zoho People attendance-management reference pages and help content
  reviewed on Tuesday, August 25, 2026.

Verification on Tuesday, August 25, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; .\\node_modules\\.bin\\eslint.cmd 'src/app/(dashboard)/attendance/page.tsx' --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit plus migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run build`:
  passed, with the unchanged Turbopack NFT tracing warning through
  `next.config.ts` and
  `src/app/api/customer-portal/document-versions/[id]/route.ts`;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the unchanged repository-wide `src/components/monolith`
  ownership baseline outside this attendance batch.

Known limits:

- runtime browser verification across Light, Night, and Violet themes is still
  pending in this Codex session;
- this pass intentionally improved attendance command-centre framing and route
  composition without changing attendance business logic, permission keys,
  server actions, sync APIs, payroll bridges, or downstream attendance tools;
- the dashboard now surfaces stronger operational signals from currently
  available attendance data, but deeper regularization, shift-roster, or
  exception-remediation workflows would still require additional persistent
  service contracts before the home route can perform those actions directly.

## 2026-08-25 HRMS organisation tree and dashboard organization handoff

Reworked `/hrms/org-structure` and the main `/dashboard` organization tab so
both now expose a fuller organisation-tree and employee-tree experience instead
of limiting users to the earlier structure registry or lightweight placeholder
tree boards.

Delivered:

- added `src/modules/hrms/components/organisation-tree-explorers.tsx` as the
  shared HRMS-owned production implementation for:
  - an organisation tree explorer that reads real branch, department, and
    division data;
  - an employee tree explorer that reads real reporting-manager mappings and
    shows leadership, direct reports, and second-line visibility;
- updated `src/modules/hrms/components/organisation-structure-workspace.tsx`
  so `/hrms/org-structure` now:
  - keeps the existing structure control centre for branch/department/division
    management;
  - adds Monolith tabs for `Control centre`, `Organisation tree`, and
    `Employee tree`;
  - reuses the new shared tree explorer implementations inside the HRMS route
    instead of introducing a second page-local tree system;
- updated `src/app/(dashboard)/hrms/org-structure/page.tsx` and
  `src/modules/core/user/service.ts` so the page now loads active employee
  hierarchy context together with the organisation structure;
- rebuilt
  `src/app/(dashboard)/dashboard/_components/dashboard-organization.tsx` so
  the main dashboard organization workspace now:
  - adds a real `Organisation tree` tab beside the employee tree;
  - replaces the earlier placeholder tree layouts with the same shared HRMS
    tree explorers;
  - adds a direct launch into `/hrms/org-structure` from the dashboard
    overview;
- updated `src/styles/modules/people.css` with module-owned styling for the new
  hierarchy explorers, selection cards, focus panels, and responsive tree
  layouts;
- regenerated:
  - `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`;
  - `docs/ui-route-audit.md`;
  - `docs/ui-component-and-style-ownership-audit.md`.

Verification on Tuesday, August 25, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; .\\node_modules\\.bin\\eslint.cmd 'src/modules/hrms/components/organisation-tree-explorers.tsx' 'src/modules/hrms/components/organisation-structure-workspace.tsx' 'src/app/(dashboard)/hrms/org-structure/page.tsx' 'src/app/(dashboard)/dashboard/_components/dashboard-organization.tsx' 'src/modules/core/user/service.ts' --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit plus migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the unchanged repository-wide `src/components/monolith`
  ownership baseline outside this HRMS/dashboard batch.

Known limits:

- runtime browser verification across Light, Night, and Violet themes is still
  pending in this Codex session;
- the employee tree reflects current reporting-manager data, so employees
  without complete manager mappings remain visible but do not form a deeper
  reporting chain until that underlying data is present.

## 2026-08-25 HRMS employee user-control workspace handoff

Reworked `/hrms/users` from a simple employee login list into a more advanced
access-governance workspace that feels closer to a mature ERP employee-control
console while staying within the existing Monolith HRMS design system and the
current `/api/hrms/employees` contract.

Delivered:

- rebuilt `src/modules/hrms/components/users-table.tsx` so the route now:
  - adds an access-posture KPI strip for total employees, enabled logins,
    pending activation, exceptions, and privileged accounts;
  - introduces governance segments for all employees, enabled, pending
    activation, disabled, exceptions, and privileged access;
  - adds search plus department, role, and employment-state filtering inside
    the shared Monolith control system;
  - upgrades the directory into a fuller operational register with access
    posture, organisational context, role visibility, lifecycle context, and
    exception surfacing per employee;
  - keeps bulk enable/disable actions while also adding clearer row-level
    enable/disable controls and profile drill-through actions;
  - surfaces invite failures, expired invites, missing roles, missing
    department data, missing manager chains for privileged users, and exited
    employees with active access as remediation cues instead of leaving them
    hidden in the raw list;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` after the UI batch.

Verification on Tuesday, August 25, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; .\\node_modules\\.bin\\eslint.cmd 'src/modules/hrms/components/users-table.tsx' --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/modules/hrms/components/users-table.tsx'`:
  passed, with only the existing Git LF/CRLF working-copy warning;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit plus migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run build`:
  passed, with the existing Turbopack NFT tracing warning through
  `next.config.ts` and
  `src/app/api/customer-portal/document-versions/[id]/route.ts`;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the unchanged repository-wide `src/components/monolith`
  ownership baseline outside this HRMS route batch.

Known limits:

- the backend still supports employee-list fetch plus enable/disable login
  updates only, so this pass improves governance framing and operational
  control presentation without yet adding resend-invite, role-edit, approval
  workflow, session-forensics, or policy-configuration actions;
- runtime browser verification across Light, Night, and Violet themes is still
  pending in this Codex session.

## 2026-08-25 HRMS help desk shared-services rework handoff

Reworked `/hrms/helpdesk` from a basic HR case form into a more advanced
internal shared-services workspace that better frames HR help desk operations
and IT support-desk functions inside the Monolith design system.

Delivered:

- rebuilt `src/modules/hrms/components/helpdesk-view.tsx` so the route now:
  - reframes the experience as a combined HR and IT service desk;
  - adds service-lane switching between HR help desk and IT support desk;
  - introduces service-template cards inspired by modern ERP/help-desk intake;
  - surfaces queue-health metrics for open work, SLA risk, and overdue items;
  - adds category ownership framing, knowledge coverage, and advanced
    operating-function panels;
  - upgrades the request register with desk and SLA columns plus queue filters;
  - upgrades the conversation area with handling guidance and SLA posture;
- updated `src/modules/people/components/people-workspace.tsx` so the shared
  page header for `/hrms/helpdesk` now reflects the broader HR + IT service
  desk framing;
- updated `src/styles/modules/people.css` so the page now has module-owned
  styling for the help-desk shell, intake cards, category board, queue tools,
  and responsive detail layout.

Verification on Tuesday, August 25, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; .\\node_modules\\.bin\\eslint.cmd 'src/modules/hrms/components/helpdesk-view.tsx' 'src/modules/people/components/people-workspace.tsx' --max-warnings=0`:
  passed;

Known limits:

- the backend contract is still the existing HR cases API, so this batch
  improves the operational workspace and IT support framing without yet adding
  true IT-specific data fields, assignment controls, watchers, attachments, or
  admin-side SLA configuration;
- runtime browser verification across Light, Night, and Violet themes is still
  pending in this Codex session.

## 2026-08-25 HRMS onboarding command-center handoff

Rebuilt `/hrms/onboarding` from a passive placeholder into a working onboarding
operations workspace that feels closer to a mature ERP onboarding module while
staying inside the current Monolith design system and existing service
contracts.

Delivered:

- updated `src/modules/hrms/components/onboarding-view.tsx` so the route now:
  - replaces the old coming-soon state with a full onboarding command center;
  - uses shared `WorkspaceMetric`, `WorkspacePanel`, `WorkspaceSectionHeading`,
    `PeopleSection`, `PeopleTable`, `OperationalDataTable`, and `Tabs`
    primitives instead of a route-local reimplementation;
  - frames advanced onboarding operations including lifecycle stages, journey
    queue, template library, owner matrix, compliance gates, portal/invitation
    posture, and escalation guidance;
  - wires the existing `/api/hrms/onboarding` GET/POST contract into a live
    `My record` tab so personal, contact, financial, and statutory details can
    be updated from the page and reflected back into the onboarding checklist;
  - uses `/api/hrms/employees?active=true` to enrich the HR journey view with
    active employee context when available, while keeping a safe fallback
    operating model when richer onboarding data is not yet present in the repo.

Verification on Tuesday, August 25, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; .\\node_modules\\.bin\\eslint.cmd 'src/modules/hrms/components/onboarding-view.tsx' --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  still fails on unchanged repository baseline issues outside this onboarding
  batch:
  - `src/app/(dashboard)/hrms/helpdesk/page.tsx` missing
    `@/modules/hrms/components/helpdesk-view`;
  - `src/modules/hrms/components/user-control-page.tsx` missing
    `@/modules/hrms/components/users-table`;
  - `src/modules/hrms/payroll.ts` missing required
    `PayrollEmployeeRow` amount fields.

Known limits:

- manual runtime verification across Light, Night, and Violet themes is still
  pending in this Codex session;
- the route now has real profile-completion editing and richer operational
  framing, but broader backend onboarding entities such as dedicated checklist
  templates, owner assignments, escalations, and document workflows still need
  service-layer expansion if the team wants those sections to become fully
  persistent;
- this pass intentionally did not change RBAC, onboarding APIs, employee
  schemas, or invitation behavior.

## 2026-08-25 HRMS command centre rework handoff

Reworked `/hrms` from a shortcut-first summary page into a fuller HRMS command
centre with a denser control-tower layout, operational workload framing, and
grouped launch lanes more aligned with modern ERP-style people operations.

Delivered:

- updated `src/app/(dashboard)/hrms/page.tsx` so the HRMS home now:
  - expands its server-side summary queries beyond headcount into live service,
    payroll, document, access, travel, work-report, and recruitment signals;
  - replaces the older lightweight overview with an executive command-centre
    section that surfaces workforce footprint, attention queues, and compliance
    or rollout signals in one scan;
  - adds priority action cards for approvals, service escalations, payroll
    governance, and talent or activation flow;
  - reorganizes the HRMS navigation into managed operational lanes instead of
    presenting the route primarily as a flat shortcut board;
  - keeps the recent employee directory visible as part of the main command
    surface;
- updated `src/styles/modules/people.css` so the HRMS dashboard now has:
  - a split command-grid layout with a supporting priority rail;
  - module-owned lane cards and operational metric tiles;
  - responsive collapse behavior for desktop, tablet, and mobile;
  - token-driven panel styling that stays inside the People module stylesheet
    instead of adding anything to legacy compatibility CSS;
- regenerated:
  - `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`;
  - `docs/ui-route-audit.md`;
  - `docs/ui-component-and-style-ownership-audit.md`.

Verification on Tuesday, August 25, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; .\\node_modules\\.bin\\eslint.cmd 'src/app/(dashboard)/hrms/page.tsx' --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/app/(dashboard)/hrms/page.tsx' 'src/styles/modules/people.css'`:
  passed, with only existing CRLF warning output from Git;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed the route + migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and refreshed the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  still fails on the unchanged repository baseline because
  `src/app/(dashboard)/hrms/helpdesk/page.tsx` and
  `src/app/(dashboard)/hrms/onboarding/page.tsx` import missing module files
  that predate this dashboard rework;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the unchanged repository baseline because
  `src/components/monolith/**` contains pre-existing implementation files that
  violate the enforced ownership rule outside this batch.

Known limits:

- the refreshed static audit still marks `/hrms` as `NON_COMPLIANT` because it
  conservatively flags route-local `article` composition plus one remaining
  link-as-button styling pattern in the current source, even though the page is
  now built on the shared People workspace frame and module stylesheet;
- runtime browser verification across Light, Night, and Violet themes is still
  pending in this Codex session;
- this pass intentionally focused on the HRMS home command-centre framing and
  did not redesign downstream HRMS workspaces such as approvals, help desk,
  payroll detail, or recruitment detail routes.

## 2026-08-25 Dashboard composition spacing and declutter handoff

Reworked `/dashboard` so the HR landing page uses a cleaner full-width
composition with clearer reading order, lighter section framing, tighter font
hierarchy, and less stacked card clutter.

Delivered:

- updated `src/app/(dashboard)/dashboard/_components/dashboard-overview.tsx`
  so the personal workspace now:
  - replaces the old spotlight-card stack with a flatter command brief layout;
  - keeps quick-launch and live-signal content in a tighter supporting rail;
  - converts the metrics band into a lighter inline summary instead of boxed
    cards;
  - keeps the feed, task, schedule, and holiday areas but presents them as a
    more organized operational grid with less visual noise;
- updated `src/styles/monolith-system.css` so the protected dashboard route
  now:
  - uses a broader, less boxed hero composition;
  - reduces heavy borders, radii, and shadows across dashboard-owned sections;
  - improves spacing rhythm and heading/body font balance;
  - gives the content more usable horizontal width;
  - preserves responsive collapse behavior while keeping the new flatter
    composition intact.

Verification on Tuesday, August 25, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; .\\node_modules\\.bin\\eslint.cmd 'src/app/(dashboard)/dashboard/_components/dashboard-overview.tsx' --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/app/(dashboard)/dashboard/_components/dashboard-overview.tsx' 'src/styles/monolith-system.css'`:
  passed, with only existing CRLF warning output from Git.

Known limits:

- runtime browser verification for `/dashboard` across Light, Night, and
  Violet themes is still pending in this Codex session;
- this batch intentionally focused on the active "My space" dashboard
  composition and shared dashboard shell styling, not a deeper content rewrite
  of the Team or Organization tabs.

## 2026-08-25 CRM Phase 2 compose recipient-chip handoff

Refined the Phase 2 rate-request composer so recipient entry now feels closer
to a modern mail client, with selected agents added directly inside the compose
header instead of feeling detached from the message workspace.

Delivered:

- updated `src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx`
  so the compose pane now:
  - renders a mail-style `To` row with inline selected-recipient chips;
  - lets users remove recipients directly from the compose header;
  - moves agent search into that same `To` area so adding agents happens inside
    the compose experience;
  - keeps the CRM agent master list as the supporting suggestion panel;
  - simplifies the earlier detached preview wording into a send-batch preview;
- updated `src/styles/modules/crm.css` so the Phase 2 composer now has:
  - structured `To`, `Cc`, and `Subject` header rows;
  - chip styling for selected recipients;
  - inline compose search styling;
  - lighter mail-surface framing that better supports the compose-first layout.

Verification on Tuesday, August 25, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; .\\node_modules\\.bin\\eslint.cmd 'src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx' --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx' 'src/styles/modules/crm.css'`:
  passed, with only existing CRLF warning output from Git.

Known limits:

- runtime browser verification across Light, Night, and Violet themes is still
  pending in this Codex session;
- this pass improves recipient-entry flow and compose presentation, but does
  not yet add keyboard-autocomplete navigation or a floating suggestion popover
  inside the `To` field itself.

## 2026-08-25 CRM Phase 2 inline recipient suggestions handoff

Extended the Phase 2 compose header again so matching agent suggestions now
appear directly below the `To` field, making recipient selection happen inside
the compose surface instead of relying on the side list first.

Delivered:

- updated `src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx`
  so the mail-style `To` row now:
  - derives unselected recipient suggestions from the current search term;
  - shows a compact clickable suggestion tray directly under the inline search;
  - allows agents to be added into the recipient chips from that tray in one
    step;
- updated `src/styles/modules/crm.css` so the inline suggestion tray now has:
  - compact mail-like suggestion pills/cards;
  - hover feedback aligned to the compose surface;
  - structured spacing under the `To` row without breaking responsive layout.

Verification on Tuesday, August 25, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; .\\node_modules\\.bin\\eslint.cmd 'src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx' --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx' 'src/styles/modules/crm.css'`:
  passed, with only existing CRLF warning output from Git.

Known limits:

- runtime browser verification across Light, Night, and Violet themes is still
  pending in this Codex session;
- keyboard arrow-key navigation and enter-to-select behavior for the suggestion
  tray are still not implemented in this pass.

## 2026-08-24 CRM enquiry detail sequencing and spacing handoff

Reshaped `/crm/enquiries/[id]` so the enquiry detail experience reads as a
single full-width operational workspace instead of a left-detail / right-card
split, and gated the commercial worksheet so later phases stay hidden until the
previous action is completed.

Delivered:

- rebuilt `src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx`
  into a sequential layout with:
  - one shared route header surface;
  - wider summary metrics and action framing;
  - full-width enquiry detail composition;
  - a consolidated notes/activity/audit/calls section instead of the old
    stacked right-column card rail;
- updated
  `src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx`
  so the enquiry commercial flow now:
  - shows the request composer first;
  - reveals response capture only after requests exist;
  - reveals comparison/finalization only after structured responses exist;
  - reveals pricing/quote creation only after buy rates are finalized;
  - shows locked-step guidance in place of future controls instead of dumping
    every phase on first load.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx' --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx' --max-warnings=0`:
  still fails on pre-existing route debt in the file, including long-standing
  `any` props/state and the existing `setLocalCalls(calls)` effect pattern that
  predates this UI pass;
- runtime browser verification across Light, Night, and Violet themes is still
  pending in this Codex session.

Known limits:

- this pass intentionally did not widen into a full typing cleanup for
  `enquiry-detail-client.tsx`;
- `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md` and `docs/ui-route-audit.md`
  already classify `/crm/enquiries/[id]` as `COMPLIANT`; this batch changes the
  composition and workflow flow, but does not change that route-family status;
- the route still needs manual visual QA for desktop, tablet, and mobile with
  real enquiry data.

## 2026-08-24 CRM Phase 2 composer priority refinement handoff

Applied a small follow-up refinement to the Phase 2 rate-request composer so
agent selection feels denser and the compose workspace gets more visual
priority.

Delivered:

- updated `src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx`
  so the recipient pane and compose pane use explicit compact/priority classes,
  and increased the email body editing area;
- updated `src/styles/modules/crm.css` so the Phase 2 split now favors compose
  width, the recipient list is shorter and denser, and the compose controls use
  roomier spacing and a larger body editor.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; .\\node_modules\\.bin\\eslint.cmd 'src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx' --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx' 'src/styles/modules/crm.css'`:
  passed, with only existing CRLF warning output from Git.

Known limits:

- this follow-up only refines the Phase 2 composer emphasis and does not change
  later commercial stages;
- runtime browser/theme verification is still pending in this Codex session.

## 2026-08-24 CRM enquiry commercial workflow Phase 12 pricing governance

Completed the twelfth CRM enquiry commercial batch by hardening quotation
creation and approval against stale enquiry pricing, while keeping the existing
saved pricing worksheet and quote approval flow intact.

Delivered:

- added `src/modules/crm/services/quote-pricing-governance.service.ts` so CRM
  quotes can compute whether they are aligned to the current enquiry pricing
  worksheet, stale against a newer worksheet, missing pricing evidence, or
  unlinked from an enquiry workflow;
- extended the quote workflow snapshot typing in
  `src/modules/crm/components/quotes/lib/types.ts` so
  `sourceQuotationSnapshot` can preserve structured pricing trace data;
- updated `src/modules/crm/actions.ts` and
  `src/app/(dashboard)/crm/quotes/new/page.tsx` so new quote versions now store
  pricing trace metadata and refuse creation from linked enquiries when the
  pricing worksheet is stale or missing relative to the current finalized
  revision;
- updated `src/modules/crm/approval-workflow.ts` and
  `src/modules/crm/components/ApprovalActionBar.tsx` so manager submission,
  manager approval, and recorded customer decisions now block on stale pricing
  and show visible guidance in the approval bar;
- updated `src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx`
  so stale pricing snapshots no longer expose quote-creation actions until the
  worksheet is re-saved against the latest finalized revision;
- updated `src/app/(dashboard)/crm/quotes/[quoteId]/page.tsx` and
  `src/modules/crm/components/quotes/QuoteDetailsPage.tsx` so the internal
  quote detail workspace now shows pricing freshness status, source revision
  linkage, and approval blocking context directly in the workflow section.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/crm/services/quote-pricing-governance.service.ts' 'src/modules/crm/components/quotes/lib/types.ts' 'src/modules/crm/rate-workflow.ts' 'src/app/(dashboard)/crm/quotes/new/page.tsx' 'src/modules/crm/approval-workflow.ts' 'src/modules/crm/components/quotes/NewQuotePage.tsx' 'src/modules/crm/components/ApprovalActionBar.tsx' 'src/app/(dashboard)/crm/quotes/[quoteId]/page.tsx' 'src/modules/crm/components/quotes/QuoteDetailsPage.tsx' 'src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx' --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed.

Known limits:

- runtime browser verification across Light, Night, and Violet themes is still
  pending in this Codex session;
- full repo `tsc --noEmit` is currently blocked by the unchanged generated
  `.next` route-validator baseline around `/my-payroll`;
- public quote sharing remains blocked by the existing share-token schema
  dependency in `src/modules/crm/share.ts`, so customer-share hardening is not
  finished yet.

## 2026-08-24 CRM enquiry commercial workflow Phase 11 pricing worksheet

Completed the eleventh CRM enquiry commercial batch by adding a persisted
pricing worksheet on top of the finalized buy-rate snapshot, so quotation
seeding now uses stored sell-rate decisions instead of directly reading the
editable charge worksheet.

Delivered:

- added `src/modules/crm/services/pricing-snapshot.service.ts` so the CRM
  workflow now builds a pricing snapshot from the current finalized buy-rate
  revision with:
  - line-level sell-rate overrides;
  - quantity controls;
  - worksheet and line notes;
  - calculated buy total, sell total, margin amount, and margin percent;
  - linkage back to the finalized buy-rate revision label and id;
- extended `src/modules/crm/rate-workflow.ts` so saved enquiry workflow JSON
  now preserves:
  - the pricing snapshot record;
  - normalized pricing lines and totals;
  - `PRICING` status derivation;
  - quote-line seeding from the stored sell-rate worksheet;
- updated `src/modules/crm/actions.ts` with
  `saveEnquiryPricingSnapshotAction` so users can persist the pricing worksheet
  from the enquiry panel before entering the quote form;
- rebuilt the Phase 11 portion of
  `src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx`
  so the worksheet now shows:
  - buy/sell/margin summary cards;
  - editable sell-rate controls per finalized line;
  - quantity controls and pricing notes;
  - stale-pricing warnings when a new finalized revision exists;
  - quote-entry actions that now rely on the saved pricing snapshot;
- updated `src/app/(dashboard)/crm/quotes/new/page.tsx` and
  `src/modules/crm/components/quotes/lib/types.ts` so quote creation receives
  pricing snapshot metadata and starts from saved sell rates when available;
- extended `src/modules/crm/__tests__/rate-workflow.test.ts` with a focused
  pricing snapshot and quote-seeding scenario.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/crm/services/pricing-snapshot.service.ts' 'src/modules/crm/services/finalized-buy-rate.service.ts' 'src/modules/crm/rate-workflow.ts' 'src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx' 'src/app/(dashboard)/crm/quotes/new/page.tsx' 'src/modules/crm/components/quotes/lib/types.ts' 'src/modules/crm/__tests__/rate-workflow.test.ts' --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx vitest run 'src/modules/crm/__tests__/rate-workflow.test.ts'`:
  blocked by the existing repository guard because `.env.staging.local` is
  required before `vitest.config.ts` will load.

Known limits:

- runtime browser verification across Light, Night, and Violet themes is still
  pending in this Codex session;
- live pricing-worksheet validation still needs real-user review of sell-rate
  editing, stale-snapshot refresh behavior, and pricing-based quote seeding on
  production-like enquiries;
- this batch intentionally stops before any later pricing governance and quote
  approval hardening beyond the saved worksheet foundation.

## 2026-08-24 CRM enquiry commercial workflow Phase 10 finalized buy-rate snapshot

Completed the tenth CRM enquiry commercial batch by converting the stored Phase
9 recommendation decision into immutable finalized buy-rate revisions and
exposing the controlled costing unlock in the existing CRM worksheet flow.

Delivered:

- added `src/modules/crm/services/finalized-buy-rate.service.ts` so the CRM
  workflow now rebuilds the saved comparison decision into a versioned
  finalized snapshot with:
  - line-level vendor and response provenance;
  - preserved original amount, currency, and unit;
  - normalized base-currency totals;
  - validity, carrier, routing, and transit context;
  - recommendation-vs-override traceability;
- extended `src/modules/crm/rate-workflow.ts` so saved enquiry workflow JSON
  now preserves:
  - finalized buy-rate revision history;
  - the current finalized version pointer;
  - backward-compatible status derivation for `RATE_FINALIZED`;
  - costing-lock defaults aligned to finalized snapshot availability;
- updated `src/modules/crm/actions.ts` with
  `finalizeEnquiryBuyRatesAction` so users can append immutable `R1`, `R2`,
  and later revisions while moving the enquiry into `RATE_FINALIZED` and
  unlocking costing for the next phase;
- rebuilt the Phase 10 portion of
  `src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx`
  so the worksheet now shows:
  - costing locked vs unlocked state;
  - current finalized-version summary;
  - optional revision notes;
  - finalize and re-finalize actions;
  - stored finalized-version history cards;
- extended `src/modules/crm/__tests__/rate-workflow.test.ts` with a focused
  finalized snapshot scenario.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/crm/services/finalized-buy-rate.service.ts' 'src/modules/crm/services/best-rate-recommendation.service.ts' 'src/modules/crm/rate-workflow.ts' 'src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx' 'src/modules/crm/__tests__/rate-workflow.test.ts' --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx vitest run 'src/modules/crm/__tests__/rate-workflow.test.ts'`:
  blocked by the existing repository guard because `.env.staging.local` is
  required before `vitest.config.ts` will load.

Known limits:

- runtime browser verification across Light, Night, and Violet themes is still
  pending in this Codex session;
- live finalized-buy-rate validation still needs real-user review of revision
  history behavior, override-based finalization, and downstream costing use of
  the unlocked snapshot;
- this batch intentionally stops before Phase 11 pricing worksheet and margin
  control composition.

## 2026-08-24 CRM enquiry commercial workflow Phase 9 best-rate recommendation

Completed the ninth CRM enquiry commercial batch by layering a configurable
best-rate recommendation and explicit human override capture onto the existing
comparison workspace, without unlocking buy-rate finalization ahead of Phase
10.

Delivered:

- added `src/modules/crm/config/rate-recommendation-settings.json` so the
  recommendation weights and mixed-selection penalty now live in configuration
  instead of React code;
- added `src/modules/crm/services/best-rate-recommendation.service.ts` so the
  CRM workflow now scores:
  - landed buy cost;
  - mandatory-charge completeness;
  - validity quality;
  - response speed;
  - historical reliability from the Phase 8 agent-intelligence layer;
- extended `src/modules/crm/rate-workflow.ts` so saved enquiry workflow JSON
  now preserves:
  - recommendation metadata;
  - recommendation reasons;
  - recommended whole-agent or mixed-charge selections;
  - accepted vs overridden decision state with override reason/note capture;
- updated `src/modules/crm/actions.ts` with:
  - `generateEnquiryBestRateRecommendationAction`;
  - `saveEnquiryRateRecommendationDecisionAction`;
- rebuilt the comparison area inside
  `src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx`
  so the worksheet now shows:
  - a dedicated Phase 9 recommendation panel;
  - generation and refresh controls;
  - explanation-first recommendation output;
  - explicit accept and override actions;
  - override reason and override note capture;
- expanded `src/styles/modules/crm.css` with recommendation-panel layout styles;
- extended `src/modules/crm/__tests__/rate-workflow.test.ts` with a focused
  recommendation-service scenario.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/crm/services/best-rate-recommendation.service.ts' 'src/modules/crm/rate-workflow.ts' 'src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx' 'src/modules/crm/__tests__/rate-workflow.test.ts' --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx vitest run 'src/modules/crm/__tests__/rate-workflow.test.ts'`:
  blocked by the existing repository guard because `.env.staging.local` is
  required before `vitest.config.ts` will load.

Known limits:

- runtime browser verification across Light, Night, and Violet themes is still
  pending in this Codex session;
- live recommendation-quality validation still needs real-user review of
  whole-agent versus mixed recommendations plus the new override-reason capture;
- this batch intentionally stops before Phase 10 finalized buy-rate versioning
  and the controlled costing unlock.

## 2026-08-24 CRM enquiry commercial workflow Phase 8 agent recommendation engine

Completed the eighth CRM enquiry commercial batch by extending the existing
agent-recipient composer with contextual ranking and transparent performance
history, while keeping the implementation inside the current CRM worksheet flow.

Delivered:

- added `src/modules/crm/services/agent-recommendation.service.ts` so the CRM
  workflow now computes contextual recommendation profiles from historical
  enquiry workflow data, including:
  - request count;
  - response rate;
  - median response time;
  - complete rate;
  - clarification rate;
  - competitiveness;
  - selection rate;
  - booking rate;
  - operational outcome rate where available;
  - rate-validity quality;
- updated `src/modules/crm/actions.ts` so the existing
  `listRateRequestRecipientsAction` now accepts the current lead context and
  returns ranked agent recommendations alongside the existing recipient list;
- updated `src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx`
  so the existing recipient cards now show:
  - recommendation badge or rank;
  - similar-enquiry count;
  - explanation-first recommendation copy;
  - quick response, competitiveness, and selection metrics;
- expanded `src/styles/modules/crm.css` with the small recipient-insight styles
  needed for the existing recipient cards;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` after the UI batch.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint src/modules/crm/services/agent-recommendation.service.ts src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed, including design-system coverage and catalogue-style boundary checks;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit plus migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit.

Known limits:

- runtime browser verification across Light, Night, and Violet themes is still
  pending in this Codex session;
- live recommendation-quality validation still needs larger production-history
  review and real-user feedback on ranking usefulness;
- this batch intentionally stops before Phase 9 AI-assisted best-rate
  recommendation and manual override capture.

## 2026-08-24 CRM enquiry commercial workflow Phase 7 comparison workspace

Completed the seventh CRM enquiry commercial batch so the enquiry worksheet can
compare competing agent replies deterministically, calculate landed buy costs,
and persist a whole-agent or per-charge recommendation without pretending
incomplete replies are cheaper than they really are.

Delivered:

- added `src/modules/crm/config/rate-comparison-settings.json` as the
  configurable Phase 7 comparison settings asset with base-currency and
  exchange-rate extension points;
- added `src/modules/crm/services/rate-comparison.service.ts` so the CRM
  workflow now supports:
  - preserved original rate values for review;
  - deterministic normalization for W/M, BL, shipment, KG, and container
    charges;
  - minimum-charge and tax-aware comparable cost calculations;
  - mandatory-charge completeness handling;
  - mismatched-currency, invalid-unit, unclear-inclusion, container-mismatch,
    and validity-risk detection;
  - whole-agent landed buy-cost summaries and mixed per-charge recommendations;
- extended `src/modules/crm/rate-workflow.ts` so the enquiry workflow snapshot
  now preserves saved comparison choices inside the existing JSON model;
- updated `src/modules/crm/actions.ts` with
  `saveEnquiryRateComparisonSelectionAction` so users can persist:
  - whole-agent selections;
  - per-charge selections;
  - comparison save metadata;
- rebuilt the comparison area inside
  `src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx`
  so the worksheet now shows:
  - landed buy-cost cards per responding agent;
  - a charge-by-charge comparison matrix;
  - deterministic best-cell recommendations;
  - selection-mode switching between entire-agent and per-charge decisions;
  - saveable comparison outcomes;
- expanded `src/styles/modules/crm.css` with the comparison-grid, selection, and
  landed-cost styles;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` after the UI batch.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint src/modules/crm/services/rate-comparison.service.ts src/modules/crm/services/standard-buy-rates.service.ts src/modules/crm/services/rate-response-parser.service.ts src/modules/crm/rate-workflow.ts src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed, including design-system coverage and catalogue-style boundary checks;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit plus migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  still reports an unrelated payroll/accounting repository baseline outside the
  CRM Phase 7 files, so the directly rebuilt comparison/workflow/UI files
  remain the meaningful validation scope for this batch.

Known limits:

- runtime browser verification across Light, Night, and Violet themes is still
  pending in this Codex session;
- live mailbox acceptance still needs manual verification for mixed-currency
  comparison behavior, W/M quantity realism on production enquiry data, and the
  resulting whole-agent versus mixed recommendations;
- this batch intentionally stops before Phase 8 agent-performance scoring and
  enquiry-time recommendation intelligence.

## 2026-08-24 CRM enquiry commercial workflow Phase 6 standard buy-rate master

Completed the sixth CRM enquiry commercial batch so the enquiry worksheet can
apply a configurable standard buy-rate master when vendor replies say standard
charges apply, while still preserving any explicit agent amount as the winning
value.

Delivered:

- added `src/modules/crm/config/standard-buy-rates.json` as the configurable
  Phase 6 source of truth for confidently mapped standard rates from
  `Standard rates in quote.docx`;
- added `src/modules/crm/services/standard-buy-rates.service.ts` so the CRM
  workflow now supports:
  - scenario-based standard-master filtering;
  - branch and effective-date windows;
  - latest-version selection across multiple revisions;
  - standard-charge phrase detection for `standard charges applicable` and
    `as agreed`;
  - best-match line-level standard reference resolution;
- extended `src/modules/crm/rate-workflow.ts` so saved structured responses now
  preserve:
  - response-level standard-rate signals;
  - line-level standard-rate references;
  - explicit-agent-override metadata;
- updated `src/modules/crm/services/rate-response-parser.service.ts` so parsed
  drafts can:
  - apply standard-master values to missing amounts;
  - create additional standard lines when the reply only signals standard
    charges;
  - keep standard references attached even when an explicit agent amount is
    already present;
- updated `src/modules/crm/actions.ts` so reviewed standard references persist
  inside the same enquiry workflow JSON model while avoiding Prisma schema
  conflicts with the parallel monolith agent;
- rebuilt the structured response review area inside
  `src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx`
  so the worksheet now shows:
  - parser badges for the detected standard-charge trigger;
  - line-level standard-master reference cards;
  - explicit-override versus standard-applied status;
  - backing document excerpts for the mapped standard rate;
- expanded `src/styles/modules/crm.css` with the standard-reference review
  styles;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` after the UI batch.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint src/modules/crm/services/standard-buy-rates.service.ts src/modules/crm/services/rate-response-parser.service.ts src/modules/crm/rate-workflow.ts src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed, including design-system coverage and catalogue-style boundary checks;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit plus migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit.

Known limits:

- runtime browser verification across Light, Night, and Violet themes is still
  pending in this Codex session;
- live mailbox acceptance still needs manual verification for the new Phase 6
  standard-charge scenarios, including `standard charges applicable`,
  `as agreed`, expired standards, multiple revisions, and explicit agent
  overrides;
- this batch intentionally stops before Phase 7 comparison normalization and
  downstream pricing intelligence.

## 2026-08-24 CRM enquiry commercial workflow Phase 5 AI-assisted response parsing

Completed the fifth CRM enquiry commercial batch so the enquiry worksheet can
now draft structured rate responses from Gmail replies and supported attachment
text before the salesperson performs the final review.

Delivered:

- added `src/modules/crm/services/rate-response-parser.service.ts` as the
  dedicated Phase 5 parser service, keeping extraction logic out of React and
  server actions while supporting:
  - email plain-text and HTML parsing;
  - spreadsheet text extraction;
  - DOCX text extraction;
  - best-effort PDF text extraction;
  - AI-assisted parsing when `OPENAI_API_KEY` is configured;
  - deterministic fallback parsing when AI is unavailable or incomplete;
  - explicit `Not Provided` handling for missing fields instead of invented
    values;
- extended `src/modules/crm/rate-workflow.ts` so saved structured responses now
  preserve:
  - parser status;
  - parser model and run time;
  - overall confidence;
  - source document lists;
  - parser warnings;
  - line-level evidence, confidence labels, review status, quantity/container
    text, free-days text, and missing-field markers;
- updated `src/modules/crm/actions.ts` with:
  - `parseEnquiryAgentResponseDraftAction` to load the latest non-bounce Gmail
    reply, download its non-inline attachments, and return a structured draft
    from the parser service;
  - extended `saveEnquiryAgentResponseAction` so reviewed parser metadata is
    persisted into the same deterministic response record used by the manual
    workflow;
- rebuilt the structured response area inside
  `src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx`
  so the worksheet now includes:
  - `Parse latest reply` actions from the Agent Responses table;
  - in-editor re-parse support for the selected request;
  - parser summary blocks with source coverage and warnings;
  - line-level evidence and confidence review inside the existing capture form;
- expanded `src/styles/modules/crm.css` with parser summary and evidence panel
  styles;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` after the UI batch.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint src/modules/crm/services/rate-response-parser.service.ts src/modules/crm/rate-workflow.ts src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx --max-warnings=0`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed, including design-system coverage and catalogue-style boundary checks;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit plus migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint src/modules/crm/actions.ts --max-warnings=0`:
  still reports the unchanged repository baseline of many existing
  `@typescript-eslint/no-explicit-any` violations across that long legacy
  action file, so the directly rebuilt parser/workflow/UI files remain the
  meaningful targeted lint evidence for this batch.

Known limits:

- runtime browser verification across Light, Night, and Violet themes is still
  pending in this Codex session;
- live mailbox acceptance still needs manual verification across the prompt
  scenarios for plain text, HTML tables, PDFs, spreadsheets, multiple
  currencies, ambiguous charges, omitted units, revised rates, changed-subject
  replies, reply-all, alternate contacts, bounces, duplicate sync, and
  multiple agents replying;
- DOCX and PDF extraction remain best-effort and depend on the parser host's
  available runtime capabilities;
- this batch intentionally stops before Phase 6 standard-rate-master handling
  and `standard charges applicable` override logic.

## 2026-08-24 CRM enquiry commercial workflow Phase 4 structured manual response capture

Completed the fourth CRM enquiry commercial batch so the enquiry worksheet no
longer stops at reply detection. The commercial workflow can now persist
deterministic structured rate responses, let the salesperson capture charge
lines manually without AI, and reuse confirmed external charge aliases against
the canonical enquiry charge model.

Delivered:

- extended `src/modules/crm/rate-workflow.ts` so the enquiry workflow snapshot
  now parses and exposes:
  - `rateResponses` for structured agent-response records;
  - `chargeAliases` for confirmed external-to-canonical charge mappings;
  - canonical charge option derivation and alias-based suggestion helpers for
    the worksheet UI;
- updated `src/modules/crm/actions.ts` with
  `saveEnquiryAgentResponseAction` so the CRM workflow can:
  - save deterministic response headers like received time, currency, validity,
    carrier, routing, transit, and remarks;
  - normalize and store many response line items with canonical charge linkage
    plus original external descriptions;
  - persist reusable alias confirmations from the salesperson;
  - move the enquiry workflow into `RATE_COMPARISON` after a structured
    response is captured;
  - avoid Prisma schema edits by writing the Phase 4 model into
    `lead.enquiryDetails.rateWorkflow` JSON, which reduces conflict risk while
    another monolith agent is active in parallel;
- rebuilt the Agent Responses area inside
  `src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx`
  so the worksheet now includes:
  - `Capture rates` entry points per tracked request;
  - a structured manual response form for response metadata;
  - repeatable response line cards for original description, canonical charge,
    amount, currency, unit, basis, minimum, tax, inclusion state, and notes;
  - alias-confirmation toggles and structured save actions;
- expanded `src/styles/modules/crm.css` with the manual-capture layout,
  line-card, table-action, and alias-toggle styles required by the Phase 4 UI;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` after the UI batch.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint --no-cache --format stylish -- 'src/modules/crm/rate-workflow.ts' 'src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed, including design-system coverage and catalogue-style boundary checks;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit plus migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint --no-cache --format stylish -- 'src/modules/crm/actions.ts'`:
  still reports the unchanged repository baseline of many existing
  `@typescript-eslint/no-explicit-any` violations across that long legacy
  action file, so the directly rebuilt CRM workflow files remain the meaningful
  targeted lint evidence for this batch.

Known limits:

- runtime browser verification across Light, Night, and Violet themes is still
  pending in this Codex session;
- live mailbox acceptance cases from Phase 3 still need manual verification:
  same-thread reply, changed subject, reply-all, alternate contact, bounce,
  duplicate sync, and multiple agents replying;
- this batch intentionally stops before Phase 5 AI extraction, confidence
  scoring, and parser-assisted pricing intelligence.

## 2026-08-24 CRM enquiry commercial workflow Phase 3 email tracking and reply correlation

Completed the third CRM enquiry commercial batch so the enquiry worksheet no
longer stops at outbound mail logging. The commercial workflow can now retain
message and thread identifiers, sync Gmail thread activity back into the
enquiry, classify replies and bounces with stronger matching signals than
subject-only logic, and surface a usable Agent Responses table with direct
thread links.

Delivered:

- extended `src/modules/crm/rate-workflow.ts` so each stored rate-request
  record now supports:
  - Gmail `messageId` and `threadId`;
  - delivery state;
  - best-effort open metadata placeholders;
  - reply status and reply timestamp;
  - bounce state;
  - reply message/source tracking;
  - last sync and reply-notification markers;
- updated `src/modules/crm/actions.ts` so:
  - new outbound requests now store `threadId` immediately when Gmail returns
    it;
  - `syncEnquiryRateRequestResponsesAction` resolves threads using the strongest
    available identifiers in this order:
    1. stored thread ID;
    2. search fallback using recipient, enquiry reference, and subject signals;
    3. sender and subject correlation on candidate threads;
  - inbound post-send messages are classified into reply or bounce outcomes;
  - new replies notify the enquiry salesperson and reporting manager using the
    existing notification system;
  - CRM timeline events capture newly detected reply activity;
- rebuilt the sent-history area inside
  `src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx`
  into a Phase 3 `Agent Responses` table showing:
  - `Agent`;
  - `Status`;
  - `Sent`;
  - `Opened`;
  - `Replied`;
  - `Response Time`;
  - `Thread`;
  and added a worksheet-level `Sync agent responses` action;
- expanded `src/styles/modules/crm.css` with the response-table and sync-header
  styles needed by the Phase 3 UI;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` after the UI batch.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint --no-cache --format stylish -- 'src/modules/crm/rate-workflow.ts' 'src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed, including design-system coverage and catalogue-style boundary checks;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit plus migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint --no-cache --format stylish -- 'src/modules/crm/actions.ts'`:
  still reports the unchanged repository baseline of many existing
  `@typescript-eslint/no-explicit-any` violations across that long legacy
  action file, so the directly rebuilt CRM workflow UI files remain the
  meaningful targeted lint evidence for this batch.

Known limits:

- open tracking remains best-effort and is not represented as guaranteed human
  reading;
- live mailbox acceptance cases are still pending manual verification:
  same-thread reply, changed subject, reply-all, alternate contact, bounce,
  duplicate sync, and multiple agents replying;
- this batch intentionally stops before Phase 4 structured manual rate storage,
  canonical charge aliasing, and extraction-entry workflows;
- runtime browser verification across Light, Night, and Violet themes is still
  pending in this Codex session.

## 2026-08-24 CRM enquiry commercial workflow Phase 2 rate-request composer

Completed the second CRM enquiry commercial batch so `/crm/enquiries/[id]`
and the lead-side enquiry worksheet now move beyond staged placeholders for
agent outreach. The commercial worksheet can now load recipients from the CRM
agent/vendor master, generate the user-approved LCL/FCL/Air enquiry formats,
apply reporting-manager CC behavior from the HRMS hierarchy, and log outbound
rate requests directly into the enquiry workflow state.

Delivered:

- extended `src/modules/crm/rate-workflow.ts` so the enquiry workflow snapshot
  now parses and exposes tracked outbound rate-request records alongside the
  dynamic department charge model;
- updated `src/modules/crm/actions.ts` with:
  - `listRateRequestRecipientsAction` to load active CRM agent/vendor records
    with email addresses plus reporting-manager and TL CC details from the
    current user profile;
  - `sendEnquiryRateRequestsAction` to send separate Gmail messages per selected
    agent, persist the request log into the enquiry workflow JSON, update
    service-enquiry status to `RATES_REQUESTED`, and add CRM timeline plus
    communication audit history;
- rebuilt
  `src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx`
  so the enquiry commercial area now includes:
  - agent master search and multi-select;
  - automatic reporting CC visibility;
  - editable email subject/body generation using the provided LCL, FCL, and Air
    formats with `{{recipientName}}` salutation substitution;
  - outbound send actions and tracked send history;
  - the existing dynamic worksheet and quotation compatibility controls;
- expanded `src/styles/modules/crm.css` with the supporting Phase 2 commercial
  composer, recipient-list, preview, reporting, and history layouts;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` after the UI batch.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint --no-cache --format stylish -- 'src/modules/crm/rate-workflow.ts' 'src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed, including design-system coverage and catalogue-style boundary checks;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit plus migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint --no-cache --format stylish -- 'src/modules/crm/actions.ts'`:
  still reports the unchanged repository baseline of many existing
  `@typescript-eslint/no-explicit-any` violations in that long legacy action
  file, so this batch records targeted lint evidence for the directly rebuilt UI
  files instead of claiming the whole actions file is newly clean.

Known limits:

- runtime browser verification across Light, Night, and Violet themes is still
  pending in this Codex session;
- this batch intentionally stops before Phase 3 reply ingestion, response
  normalization, rate comparison, recommendation scoring, and costing-lock
  finalization;
- worksheet-specific attachment upload, draft save, and rich preview are not
  separately rebuilt here because the existing Communication workspace already
  owns those broader compose capabilities.

## 2026-08-24 CRM enquiry commercial workflow Phase 1 foundation

Implemented the Phase 1 CRM enquiry commercial foundation so `/crm/enquiries/[id]`
no longer presents the old six-field worksheet as if costing were already the
primary workflow. The enquiry commercial area now frames the work correctly as
rate acquisition pending, uses a scenario-driven dynamic charge catalogue, and
keeps later workflow lanes visible but intentionally staged.

Delivered:

- rebuilt `src/modules/crm/rate-workflow.ts` around a dynamic enquiry charge
  model driven by `Direction + Mode + Load Type`, with seeded charge lists for
  Import/Export LCL, FCL, and Air scenarios;
- preserved backward compatibility by continuing to write legacy flat `rates`
  alongside the richer worksheet snapshot so the current quote flow still works;
- updated `src/modules/crm/actions.ts` so saved department worksheets now store
  dynamic charge rows, a commercial workflow status, and the derived charge
  context inside the enquiry workflow snapshot and `pricingSnapshot`;
- rebuilt
  `src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx`
  so the enquiry commercial area now shows:
  - a `Rate acquisition pending` summary;
  - staged placeholders for Rate Requests, Agent Responses, Rate Comparison,
    and locked Costing;
  - department-specific dynamic charge rows;
  - `Add additional charge` support;
  - legacy quotation compatibility actions without making costing look finished;
- added CRM module-owned commercial worksheet styles to
  `src/styles/modules/crm.css`;
- added `src/modules/crm/__tests__/rate-workflow.test.ts` for scenario seeding
  and additional-charge preservation coverage;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md`.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint --no-cache --format stylish -- 'src/modules/crm/rate-workflow.ts' 'src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx' 'src/modules/crm/__tests__/rate-workflow.test.ts'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed, including design-system coverage and catalogue-style boundary checks;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit plus migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run build`:
  passed; the existing Turbopack NFT tracing warning remained from
  `next.config.ts` through
  `src/app/api/customer-portal/document-versions/[id]/route.ts`;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the unchanged repository baseline that
  `src/components/monolith` contains implementation files outside the allowed
  barrel/catalogue-only contract;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx vitest run 'src/modules/crm/__tests__/rate-workflow.test.ts' --reporter verbose`:
  blocked by the repository guard in `vitest.config.ts`, which refuses test
  startup unless `.env.staging.local` is present.

Known limits:

- runtime browser verification across Light, Night, and Violet themes is still
  pending in this Codex session;
- Phase 1 intentionally stops before tracked outbound agent mail, reply
  correlation, response parsing, comparison, and buy-rate costing;
- `email format.pdf` still needs manual review if its exact wording is required
  before Phase 2 mail-template implementation begins.

## 2026-08-24 CRM leads register design-system completion

Finished the `/crm/leads` migration pass so the leads register now uses the
shared CRM and workspace state/action contract end-to-end instead of keeping a
route-local empty state and leftover inline utility composition.

Delivered:

- updated `src/app/(dashboard)/crm/leads/page.tsx` so the empty register state
  now renders the canonical `WorkspaceState` with a shared `CrmActionLink`
  primary action instead of a custom route-local block;
- removed the remaining page-local utility-heavy row presentation from the lead
  list by moving company/contact/timer/source/owner presentation into CRM-owned
  module classes;
- added the corresponding CRM module selectors in `src/styles/modules/crm.css`
  for the lead company cell, contact stack, timer stack, timer value, and
  small-text ownership/source treatments;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md`; the fresh route audit now
  classifies `/crm/leads` as `COMPLIANT`.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint --no-cache --format stylish -- 'src/app/(dashboard)/crm/leads/page.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint --no-cache --format stylish -- 'src/app/(dashboard)/crm/leads/page.tsx' 'src/styles/modules/crm.css'`:
  reported the unchanged repository limitation that the stylesheet is ignored
  because no matching ESLint configuration is supplied for CSS files;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed, including design-system coverage and catalogue-style boundary checks;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit plus migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit.

Known limits:

- manual browser verification across Light, Night, and Violet themes is still
  pending in this Codex session, so this batch records source and verification
  evidence but not fresh runtime screenshots;
- this pass completes `/crm/leads`, but other CRM routes such as
  `/crm/contacts`, `/crm/calls`, `/crm/efficiency`, `/crm/products`, and
  `/crm/vendors` still remain outside full compliance in the current audit.

## 2026-08-24 CRM enquiry detail header spacing fix

Tightened the top enquiry detail status/assignment card so the content and
action area sit on a cleaner two-column rhythm instead of reading like a wide
slab with broken spacing.

Delivered:

- updated `src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx`
  so the header panel now uses a responsive grid instead of a loose
  `justify-between` flex row;
- grouped the title and owner metadata with a steadier vertical rhythm and made
  the owner line wrap as discrete inline pieces instead of one long sentence;
- aligned the action area to the same responsive structure and tightened the
  follow-up owner-assignment surface so it wraps cleanly without stretching the
  header awkwardly.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed, including design-system coverage and catalogue-style boundary checks.

## 2026-08-24 shared tab selected-label contrast fix

Fixed the shared Monolith tab treatment so selected CRM detail tabs no longer
lose their labels against the light selected surface when the tab trigger is
implemented with a primary `WorkspaceAction` or `CrmButton`.

Delivered:

- updated `src/styles/monolith-system.css` so shared tab hover/focus and
  selected states now force the semantic strong foreground color with
  `!important`, ensuring the tab state owns its foreground even when the
  underlying trigger variant applies a stronger button color contract;
- this specifically restores readable selected labels for CRM detail workspaces
  such as lead and enquiry related-list tabs that use `CrmButton` inside
  `CrmTabs`.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed, including design-system coverage and catalogue-style boundary checks.

## 2026-08-24 CRM in-call enquiry dialog spacing and width pass

Adjusted the CRM in-call enquiry dialog so the working surface is wider and the
form reads with more breathing room instead of compressing controls into a
crowded scroll area.

Delivered:

- updated `src/app/(dashboard)/crm/leads/[id]/interested-modal.tsx` so the
  dialog uses the shared workspace-size CRM dialog surface instead of the
  narrower wide variant;
- added CRM module-owned enquiry dialog spacing rules in
  `src/styles/modules/crm.css` for the dialog width, tab strip padding, body
  padding, internal card spacing, and taller control rhythm;
- removed an accidental duplicate Sea-form `Direction` row that was binding the
  Air state inside the Sea tab and making the enquiry flow feel unnecessarily
  cluttered.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint --no-cache --format stylish -- 'src/app/(dashboard)/crm/leads/[id]/interested-modal.tsx'`:
  still reports the unchanged file-local `@typescript-eslint/no-explicit-any`
  findings already present in the modal;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed, including design-system coverage and catalogue-style boundary checks;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit plus migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the unchanged repository baseline that
  `src/components/monolith` contains implementation files outside the allowed
  barrel/catalogue-only contract.

## 2026-08-24 full-width tab and two-surface workspace standardization

Standardized the tabbed Monolith workspace pattern so tab strips now use the
full available workspace width and tabbed operational pages no longer default to
split desktop sidebars that leave the active tab content constrained to a
narrow column.

Delivered:

- updated `src/components/ui/tabs.tsx` to use a design-system tab contract
  instead of route-local utility styling, so shared tabs now inherit Monolith
  surface, spacing, and active-state behavior from the global system;
- updated `src/styles/monolith-system.css` to define a shared full-width tab
  treatment across the active tab families, including:
  `mnx-tabs`, `mnx-dashboard-tabs`, `mnx-performance-tabs`,
  `mnx-crm-tabs`, `mnx-ownership-tabs`, `mnx-reimbursement-tabs`,
  `mnx-organization-tabs`, `mnx-admin-tabs`, and `mnx-catalogue-tabs`;
- converted those tab systems to equal-width grid tracks so each tab fills the
  row instead of sizing only to its text content;
- aligned the tab buttons to the same simplified Monolith card language with
  only two dominant surface types in play: compact metric cards and primary
  content surfaces;
- updated `src/styles/modules/people.css` so the tabbed HRMS workspaces that
  were still using split desktop shells now default to full-width content flow,
  including the ownership, reimbursement, and location-tracking shells;
- reduced multi-card fragmentation in those tabbed HRMS workspaces by
  collapsing several repeated card grids to single-column content flow, so
  related content reads as one primary surface sequence rather than many small
  panels competing on the same row;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md`; this shared-style batch did
  not materially change route classification.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint --no-cache --format stylish -- 'src/components/ui/tabs.tsx' 'src/styles/monolith-system.css' 'src/styles/modules/people.css'`:
  completed without code errors; ESLint reported the unchanged repository
  limitation that CSS files are ignored because no matching configuration is
  supplied for them;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed, including design-system coverage and catalogue-style boundary checks;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit plus migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the unchanged repository baseline that
  `src/components/monolith` contains implementation files outside the allowed
  barrel/catalogue-only contract.

Known limits:

- manual browser verification across Light, Night, and Violet themes is still
  pending in this Codex session, so this entry records source-level and
  design-system verification but not fresh runtime screenshots;
- this batch standardizes the shared tab and full-width tabbed-workspace rules,
  but it does not yet rewrite every older non-tabbed route that still uses
  route-local card fragmentation outside those shared workspace families.

## 2026-08-24 shared workspace metric hover standardization

Standardized the shared Monolith workspace metric cards so summary cards no
longer read like fixed slabs in CHA-style workspaces and instead inherit a
consistent soft hover-surface treatment across the shared metric primitive.

Delivered:

- updated `src/styles/monolith-system.css` so `WorkspaceMetric` now uses a
  shared hover treatment for all metric cards, with a soft accent wash,
  stronger border, and elevated shadow while keeping non-actionable metrics
  visually calm and without motion;
- kept actionable metrics on the same shared visual system while preserving
  their existing keyboard/focus contract;
- removed the CHA-only joined-strip metric wrapper treatment from
  `src/styles/modules/cha-expense.css`, including the fused container border,
  shared slab background, and vertical divider lines, so CHA metrics now render
  as standard separated Monolith cards;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md`; this shared-style batch did
  not materially change route classification.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed, including design-system coverage and catalogue-style boundary checks;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit plus migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the unchanged repository baseline that
  `src/components/monolith` contains implementation files outside the allowed
  barrel/catalogue-only contract;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx vitest run src/components/layout/workspace.test.tsx --reporter verbose`:
  blocked by the repository guard in `vitest.config.ts`, which refuses test
  startup unless `.env.staging.local` is present for guarded execution.

Known limits:

- manual browser verification across Light, Night, and Violet themes is still
  pending in this Codex session, so this entry records source-level and
  design-system verification but not fresh runtime screenshots;
- this batch standardizes the shared workspace metric system and CHA metric
  composition, but it does not yet rewrite unrelated route-local cards that do
  not use the shared `WorkspaceMetric` primitive.

## 2026-08-24 HRMS fuel reimbursement workspace rework

Reworked `/hrms/reimbursement` from a sparse single-table claim list into a
fuller fuel reimbursement control center that feels closer to a modern ERP
expense desk while staying inside the current reimbursement API and policy
model.

Delivered:

- rebuilt `src/modules/hrms/components/reimbursement-admin-view.tsx` around
  canonical People, Workspace, and Operational table primitives instead of a
  duplicate local page header and bare table shell;
- added a connected reimbursement command surface with KPI metrics, summary
  cards, queue-health alerts, overview/review/policy tabs, and a selected-claim
  detail workbench for approval and payout actions;
- added richer operational framing inspired by current mileage-management
  patterns from Zoho Expense, including visible policy governance, payout
  readiness, aged pending review, historical rate awareness, and rejection-note
  capture;
- extended the client data load to consume the existing
  `/api/hrms/reimbursement?type=history` policy history feed alongside claims
  and the active rate so admins can see both current and historic mileage
  policy context;
- replaced the old reject flow with a reason-capture modal and upgraded the
  policy modal so rate management reads like an administrative control rather
  than a standalone button;
- added module-owned reimbursement styles to `src/styles/modules/people.css`
  for the command board, signal cards, queue workbench, detail timeline,
  policy history cards, governance lists, and responsive stacking behavior;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md`; the fresh route audit
  continues to classify `/hrms/reimbursement` as `COMPLIANT`.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint --no-cache --format stylish -- 'src/modules/hrms/components/reimbursement-admin-view.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit plus migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed, including design-system coverage and catalogue-style boundary checks;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the unchanged repository baseline that
  `src/components/monolith` contains implementation files outside the allowed
  barrel/catalogue-only contract.

Known limits:

- the redesign intentionally stays within the current backend contract, so it
  does not introduce new persistence for multi-stage approval routing, payout
  batches, receipt OCR, manual odometer entry, maps, or accounting export;
- manual browser verification across Light, Night, and Violet themes is still
  pending in this Codex session, so this entry records source and verification
  gates but not fresh runtime evidence;
- reimbursement policy updates still activate immediately because the current
  API stores a new active rate record but does not yet expose future-dated rate
  scheduling.

## 2026-08-24 HRMS on-duty command-center rework

Reworked `/hrms/on-duty-admin` from a sparse pending-only approval list into a
fuller on-duty command center that better matches advanced ERP attendance
operations while preserving the existing on-duty lifecycle, approvals, trip
tracking, and reimbursement contracts.

Delivered:

- expanded `src/app/api/hrms/on-duty/route.ts` from a pending-approvals-only
  payload into a manager-scoped dashboard snapshot that now returns pending
  requests, active trips, recent request history, unresolved on-duty tracking
  alerts, reimbursement claims, and summary metrics without changing the
  underlying workflow rules;
- rebuilt `src/modules/hrms/components/on-duty-admin-view.tsx` around People
  and Workspace primitives instead of a duplicate route-local header plus a few
  raw cards, so the page now reads like an operational desk with approval,
  live-trip, exception, settlement, and audit lanes;
- added richer management framing using existing backend evidence already
  present in the repo: approval queue cards, active trip supervision, GPS
  exception review, reimbursement visibility, searchable recent history, and a
  route-audit modal for waypoint inspection;
- added module-owned styling in `src/styles/modules/people.css` for the new
  on-duty lane cards, split workbench layout, alert/claim stacks, manager
  watchlist, audit toolbar, and route-review presentation;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md`; the fresh route audit still
  classifies `/hrms/on-duty-admin` as `COMPLIANT`.

Reference direction:

- the operational framing was guided by currently published Zoho People
  attendance, approvals, and on-duty materials reviewed on Monday, August 24,
  2026, especially their emphasis on request approvals, attendance trail
  continuity, and report-oriented workforce control, but the implementation
  stays within Monolith's existing contracts and component system.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint --no-cache --format stylish -- 'src/app/api/hrms/on-duty/route.ts' 'src/modules/hrms/components/on-duty-admin-view.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  still fails on the current repository baseline because
  `src/app/(dashboard)/hrms/reimbursement/page.tsx` references
  `@/modules/hrms/components/reimbursement-admin-view`, which is currently
  missing from the checkout;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit plus migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed, including design-system coverage and catalogue-style boundary checks;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the unchanged repository baseline that
  `src/components/monolith` contains implementation files outside the allowed
  barrel/catalogue-only contract;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run build`:
  compiles successfully through Turbopack build creation, then fails on the
  same unrelated reimbursement workspace type error already noted above.

Known limits:

- manual browser verification across Light, Night, and Violet themes is still
  pending in this Codex session, so this batch claims source-audit compliance
  but not fresh runtime screenshot evidence;
- the desk now frames advanced operational functions using existing payloads,
  but it does not yet introduce new backend capabilities such as reassignment,
  multi-level approval routing, persisted SLA rules, map canvases, or claim
  adjudication directly from this screen;
- route metrics such as average distance are derived from the recent request
  history slice returned to this workspace, not from a dedicated historical BI
  aggregation model.

## 2026-08-24 standalone Payroll module carve-out

Added a new top-level `/payroll` module so Payroll now exists as its own
standalone dashboard section while still consuming canonical HRMS, Attendance,
Leave, OT, Incentive, and Accounting data sources instead of duplicating those
engines.

Delivered:

- added standalone Payroll navigation and module-control wiring through
  `src/lib/navigation.ts` and
  `src/modules/core/organisation/module-config.ts`;
- added a dedicated Payroll route family under
  `src/app/(dashboard)/payroll/**`, including:
  `layout.tsx`, `page.tsx`, `pay-runs/page.tsx`, `employees/page.tsx`,
  `compensation/page.tsx`, `inputs/page.tsx`, `compliance/page.tsx`,
  `payments/page.tsx`, `payslips/page.tsx`, `loans/page.tsx`,
  `reports/page.tsx`, and `settings/page.tsx`;
- added `src/modules/payroll/service.ts` as the standalone Payroll read-model
  aggregator over existing HRMS payroll runs, employee compensation, incentives,
  accounting batch history, and payroll readiness fields;
- added `src/modules/payroll/components/payroll-module-nav.tsx` plus
  `src/modules/payroll/constants.ts` to give Payroll its own route-level
  section navigation rather than living only as an HRMS subpage;
- kept `/hrms/payroll` as the existing implementation surface while exposing
  the same pay-run workspace under `/payroll/pay-runs`, so the module is now
  standalone without breaking the current HRMS-owned route;
- extended payroll and accounting action revalidation so approvals and postings
  refresh the standalone module pages as well as the older HRMS route;
- added `docs/payroll/SCREEN_CAPABILITY_MAP.md` to map concrete scrape screens
  from the local payroll corpus into Monolith routes and implementation status.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint --format stylish -- 'src/app/(dashboard)/payroll/**/*.tsx' 'src/modules/payroll/**/*.ts' 'src/modules/payroll/**/*.tsx' 'src/lib/navigation.ts' 'src/modules/core/organisation/module-config.ts' 'src/modules/hrms/payroll-actions.ts'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit plus migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed, including design-system coverage and catalogue-style boundary checks.

Known limits:

- static route audit now records mixed status across the new standalone Payroll
  family: `/payroll/pay-runs` and `/payroll/reports` are `COMPLIANT`,
  `/payroll/compliance`, `/payroll/employees`, and `/payroll/loans` are
  `PARTIAL`, and `/payroll`, `/payroll/compensation`, `/payroll/inputs`,
  `/payroll/payments`, `/payroll/payslips`, and `/payroll/settings` are still
  `NON_COMPLIANT`, so the new module is functionally present but still needs a
  follow-up design-system cleanup pass;
- the standalone module now covers dashboard, pay runs, employees,
  compensation, inputs, compliance, payments, payslips, reports, settings, and
  loans as native route areas, but several of those remain orchestration and
  readiness surfaces over existing data rather than full Zoho-level engines;
- employee loans, salary advances, statutory filing outputs, payslip document
  generation, tax proof workflows, off-cycle orchestration, and pay-schedule
  persistence are still pending deeper backend implementation.

## 2026-08-24 HRMS payroll operations workspace rework

Reworked `/hrms/payroll` from a thin batch-oriented payroll stub into an
Monolith-native HRMS payroll operations workspace that compiles live employee,
leave, attendance, OT, incentive, and manual LOP inputs before handing an
immutable approved snapshot to Accounting.

Delivered:

- added `src/modules/hrms/payroll.ts` as the HRMS-owned payroll aggregation and
  approval service, including employee-level calculation helpers, period
  summaries, validation issue generation, and immutable Accounting handoff line
  construction;
- added `src/modules/hrms/payroll-actions.ts` so payroll approval now runs
  through a dedicated HRMS server action boundary instead of the old
  Accounting-owned compile/create path;
- rebuilt `src/app/(dashboard)/hrms/payroll/page.tsx` and
  `src/app/(dashboard)/hrms/payroll/payroll-client.tsx` around canonical
  People and Workspace primitives, with period controls, KPI summaries,
  employee pay register search/filtering, validation blockers, and batch
  timeline controls;
- preserved the existing Accounting posting boundary: HRMS now approves the
  run, Accounting still posts the accrual journal through the existing
  `finalizePayrollBatchAction` flow;
- aligned People workspace metadata and HRMS navigation copy from "Payroll
  Batches" to the broader "Payroll" / "Payroll operations" framing;
- added `src/modules/hrms/__tests__/payroll.test.ts` to cover the pure payroll
  row calculation contract for proration and validation failures;
- added `docs/payroll/REFERENCE_ANALYSIS.md` and
  `docs/payroll/FEATURE_MATRIX.md` to capture the scrape-corpus findings and
  product research trail;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md`; the fresh route audit now
  classifies `/hrms/payroll` as `COMPLIANT`.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint --format stylish -- 'src/app/(dashboard)/hrms/payroll/page.tsx' 'src/app/(dashboard)/hrms/payroll/payroll-client.tsx' 'src/modules/hrms/payroll.ts' 'src/modules/hrms/payroll-actions.ts' 'src/modules/hrms/__tests__/payroll.test.ts' 'src/modules/people/components/people-workspace.tsx' 'src/lib/navigation.ts'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit plus migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed, including design-system coverage and catalogue-style boundary checks;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx vitest run src/modules/hrms/__tests__/payroll.test.ts`:
  blocked by the repository guard in `vitest.config.ts`, which refuses test
  startup unless `.env.staging.local` is present for guarded execution.

Known limits:

- this batch establishes a real payroll run foundation, but it does not yet
  implement the broader requested payroll surface such as statutory engines,
  loan/advance recovery, reimbursement integration, payslips, payment file
  generation, or employee self-service release flows;
- manual browser verification across Light, Night, and Violet themes is still
  pending in this Codex session, so this batch claims source-audit compliance
  but not fresh runtime theme evidence;
- guarded Vitest startup prevented execution of the new unit test in this
  session without the required `.env.staging.local` file.

## 2026-08-24 HRMS ownership and reporting workspace rework

Reworked `/hrms/ownership` from a route-local tabbed assignment page into a
module-owned ownership and reporting control centre that feels closer to an
advanced ERP people-governance workspace while preserving the existing
permission gate and assignment actions.

Delivered:

- moved the route implementation into
  `src/modules/hrms/components/ownership-reporting-workspace.tsx` so the page
  now lives in an approved HRMS module owner instead of a large route-local
  page implementation;
- replaced the older inline tabs, raw cards, and basic side form with a richer
  People-framed workspace composed from canonical `WorkspaceSectionHeading`,
  `WorkspacePanelHeader`, `WorkspacePanel`, `WorkspaceAction`,
  `WorkspaceInput`, `WorkspaceSelect`, and People summary/table patterns;
- added ERP-style reporting coverage framing including KPI summaries,
  exception-first alerts, overview cards, TL roster management, manager
  oversight lanes, department alignment reporting, searchable workbench pools,
  and governance side panels without changing the underlying database contracts;
- moved the server actions into `src/modules/hrms/ownership-actions.ts` and
  left `src/app/(dashboard)/hrms/ownership/actions.ts` as a route-level
  re-export so feature modules no longer depend on route implementations;
- added module-owned styling in `src/styles/modules/people.css` for the new
  ownership tabs, summary cards, roster cards, selection workbenches,
  governance panels, responsive shell, and department coverage table;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md`; the fresh route audit now
  classifies `/hrms/ownership` as `COMPLIANT`.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint --no-cache --format stylish -- 'src/app/(dashboard)/hrms/ownership/page.tsx' 'src/app/(dashboard)/hrms/ownership/actions.ts' 'src/modules/hrms/ownership-actions.ts' 'src/modules/hrms/components/ownership-reporting-workspace.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false --incremental false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit plus migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed, including design-system coverage and catalogue-style boundary checks;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the unchanged repository baseline that
  `src/components/monolith` contains implementation files outside the allowed
  barrel/catalogue-only contract;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run build`:
  passed, with the unchanged Turbopack NFT tracing warning from `next.config.ts`
  through `src/app/api/customer-portal/document-versions/[id]/route.ts`.

Known limits:

- manual browser verification across Light, Night, and Violet themes is still
  pending in this Codex session, so this batch does not claim fresh runtime
  theme/viewport evidence even though source audits and build gates passed;
- the richer ownership workspace adds filtering, framing, and governance views
  around the current TL and manager assignment contracts, but it does not yet
  introduce new backend capabilities such as drag-and-drop org charts, approval
  routing rules, historical reporting-line snapshots, or import/export flows;
- broader repository baselines outside this batch remain unchanged, including
  the existing `architecture:check` failure described above.

## 2026-08-24 HRMS GPS tracking command-center rework

Reworked `/hrms/tracking` from a sparse attendance snapshot into a fuller GPS
operations command center that better matches modern ERP and workforce-tracking
patterns while preserving the existing backend payload and route ownership.

Delivered:

- rebuilt `src/modules/hrms/components/tracking-dashboard-view.tsx` around
  shared People and Workspace primitives instead of a duplicate local page
  header plus loosely spaced raw cards;
- added a live control-tower summary with connected Monolith metrics for
  checked-in coverage, live streams, open exceptions, on-duty missions, and
  face-auth coverage;
- derived richer operational insights from the existing API response, including
  heartbeat freshness, stale/offline session detection, integrity-risk counts,
  tracking coverage, cadence, per-employee exception posture, and a searchable
  workforce feed;
- added dedicated operations panels for alert triage, tracking health,
  on-duty missions, and governance framing so the page now reads like an actual
  tracking management surface instead of a static list;
- added module-owned tracking styles to `src/styles/modules/people.css` for the
  command-center shell, KPI cards, alert queue, health cards, table status
  pills, trip cards, governance grid, and responsive mobile stacking;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` after the route batch.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint --no-cache --format stylish -- 'src/modules/hrms/components/tracking-dashboard-view.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit plus migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed, including design-system coverage and catalogue-style boundary checks;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the unchanged repository baseline that
  `src/components/monolith` contains implementation files outside the allowed
  barrel/catalogue-only contract;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run build`:
  did not complete in this session because Next reported that another build
  process was already running, so no new route-specific build failure was
  captured from this batch.

Known limits:

- the redesign intentionally derives advanced control-tower behavior from the
  current `/api/hrms/tracking` payload only, so true map canvases, persisted
  geofence editors, dispatch reassignment, route replay, and alert-resolution
  workflows were not introduced in this pass;
- manual runtime browser verification across Light, Night, and Violet themes is
  still pending in this Codex session;
- the regenerated source audit continues to classify `/hrms/tracking` as
  `COMPLIANT`, but this entry does not claim a fresh runtime-verified migration
  completion because in-browser validation was not completed here.

## 2026-08-24 Shared workspace divider restraint pass

Refined the shared Monolith workspace separator contract so single-surface
pages stop drawing stray horizontal rules directly above card-like panels and
metric strips unless a route explicitly opts back into that divider.

Delivered:

- updated `src/styles/monolith-system.css` so
  `.mnx-workspace-page[data-workspace-surface="single"]` still supports the
  shared horizontal divider language, but now suppresses that rule for shared
  panel, table-card, and metrics surfaces by default;
- added a lightweight opt-in/opt-out contract using
  `data-workspace-divider="line"` and `data-workspace-divider="none"` so future
  route work can restore or suppress a divider intentionally instead of
  inheriting a naked rule line automatically;
- removed the older blanket top-border rule that was reapplying separators to
  direct workspace panels and table cards even when the line was visually too
  close to adjacent surfaces.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed, including design-system coverage and catalogue-style boundary checks.

Known limits:

- manual browser verification is still pending in this Codex session because
  the in-app browser runtime reported that no controllable browser was
  available for `http://localhost:3000`;
- this pass changes the shared default separator behavior only and does not yet
  add route-specific `data-workspace-divider` overrides for any page that may
  want to reintroduce a divider intentionally.

## 2026-08-24 Shared development-build watermark and catalogue options

Added a shared development-build watermark for the floating Mona launcher and
registered multiple visual options in the Admin Design System so the team can
review alternate treatments from one production-backed component.

Delivered:

- added `src/components/feedback/development-build-watermark.tsx`, a shared
  build-status surface that reads from the public app version when present and
  otherwise falls back to the repository version, while also exposing three
  approved visual variants: `glass-chip`, `signal-bar`, and `stacked-card`;
- updated `src/modules/mona/components/mona-chat.tsx` so the live app renders
  the shared development-build watermark directly above the bottom-right Mona
  chat launcher without introducing route-local placement logic;
- exported the new shared watermark through `src/components/monolith/index.ts`
  so the supported Monolith UI API and the design-system catalogue can consume
  the same implementation;
- updated `src/components/monolith/catalogue/shared-catalogue.tsx` with a live
  production specimen that shows all three watermark design directions side by
  side on `/admin/design-system`, giving stakeholders multiple visible options
  to choose from while the runtime continues to use one default treatment;
- updated `src/styles/monolith-system.css` with the shared floating-stack,
  watermark, and design-system showcase styling using existing semantic theme
  tokens so the component remains legible in Light, Night, and Violet themes.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint --no-cache --format stylish -- 'src/components/feedback/development-build-watermark.tsx' 'src/modules/mona/components/mona-chat.tsx' 'src/components/monolith/catalogue/shared-catalogue.tsx' 'src/components/monolith/index.ts'`:
  completed with the unchanged existing `no-restricted-syntax` raw-button
  warnings in `src/modules/mona/components/mona-chat.tsx`; no new lint errors
  were introduced by this batch;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed, including the design-system coverage and catalogue-style boundary
  checks.

Known limits:

- the live runtime currently uses the default `glass-chip` treatment above the
  Mona launcher, while the alternate `signal-bar` and `stacked-card` variants
  are exposed in the design-system catalogue for visual review rather than as a
  persisted end-user preference;
- the watermark shows the shared app version and a fallback `local` build label
  unless a public build-number environment value is supplied;
- manual browser verification across Light, Night, and Violet themes is still
  pending in this Codex session.

## 2026-08-24 HRMS organisation structure workspace rework

Reworked `/hrms/org-structure` from a prompt-driven two-column CRUD list into a
fuller HRMS structure-management workspace that feels closer to a modern ERP
setup surface while staying inside the existing Monolith People frame and
current backend contracts.

Delivered:

- moved the route implementation into
  `src/modules/hrms/components/organisation-structure-workspace.tsx` so the
  page now lives in the approved HRMS module ownership area instead of a
  route-local manager file;
- replaced browser `prompt` and `confirm` flows with canonical
  `WorkspaceDialog` create, edit, and delete dialogs for branches,
  departments, and divisions, wiring the existing `POST`, `PATCH`, and
  `DELETE` organisation APIs rather than changing backend behavior;
- added searchable structure exploration, scope filtering, selected-department
  blueprint framing, structure-health callouts, and summary metrics so
  administrators can review and manage the organisation hierarchy from one
  connected control surface;
- added module-owned styling to `src/styles/modules/people.css` for the new
  organisation workspace shell, explorer cards, branch registry, blueprint
  rail, health list, and responsive mobile behavior;
- removed the obsolete route-local
  `src/app/(dashboard)/hrms/org-structure/org-structure-manager.tsx`
  implementation after migrating the page to the HRMS module component;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` after the route batch.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint --no-cache --format stylish 'src/app/(dashboard)/hrms/org-structure/page.tsx' 'src/modules/hrms/components/organisation-structure-workspace.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false --incremental false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route + migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the unchanged repository baseline that
  `src/components/monolith` contains implementation files outside the allowed
  barrel/catalogue-only contract;
- runtime browser verification remained blocked in this Codex session because
  the browser runtime reported no available controllable browser backends
  (`agent.browsers.list()` returned `[]`);
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run build`:
  started, but no result was captured before the long-running process was
  manually interrupted in this session.

Known limits:

- the richer workspace currently operates on the existing organisation APIs
  only, so advanced ERP behaviors such as bulk import/export, drag-and-drop
  hierarchy rearrangement, department heads, or branch-to-department
  assignment matrices were not introduced in this batch;
- static audit classification remains `COMPLIANT` for `/hrms/org-structure`,
  but manual runtime verification across Light, Night, and Violet themes is
  still pending because no browser backend was available;
- broader repository baselines outside this batch remain unchanged, including
  the existing `architecture:check` failure described above.

## 2026-08-24 Design-system governance and unverified-design queue

Turned the admin design system into a living governance surface by adding a
reviewable unverified-design queue, repository-backed discovery, persisted
review decisions, and a dedicated `/admin/design-system/unverified-designs`
route while keeping replacements intentionally developer-safe.

Delivered:

- replaced the older admin design-system route implementation with
  `src/app/(dashboard)/admin/design-system/design-system-client.tsx`, a
  production-backed catalogue shell that keeps the official inventory, review
  summary metrics, approved-from-queue patterns, and the unverified-design
  entry point in one Monolith-owned experience;
- updated `src/app/(dashboard)/admin/design-system/page.tsx` to use the
  enforced catalogue-only stylesheet boundary through
  `design-system-catalogue.css` and to load a repository discovery snapshot
  instead of relying on the older disconnected route-local showcase markup;
- added `src/app/(dashboard)/admin/design-system/unverified-designs/page.tsx`
  so the governance queue has its own route under the existing design-system
  family rather than being hidden behind a static section;
- added
  `src/modules/admin/components/design-system-governance.ts`, which scans
  active route/module source for reusable unregistered patterns, groups likely
  duplicate families, tracks recurring token deviations, and persists review
  decisions to `storage/design-system-governance/reviews.json` without a
  database migration;
- added `src/app/(dashboard)/admin/design-system/actions.ts` so admin users can
  approve patterns, mark them for manual review, or map them to approved
  alternatives, with those decisions revalidating both design-system routes;
- updated `src/modules/admin/components/admin-workspace.tsx` so the dedicated
  design-system route family is not wrapped by the standard admin workspace
  chrome;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md`, which now reflect 292 page
  routes and the new `/admin/design-system/unverified-designs` entry.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint --no-cache --format stylish -- 'src/app/(dashboard)/admin/design-system/page.tsx' 'src/app/(dashboard)/admin/design-system/design-system-client.tsx' 'src/app/(dashboard)/admin/design-system/actions.ts' 'src/app/(dashboard)/admin/design-system/unverified-designs/page.tsx' 'src/modules/admin/components/design-system-governance.ts' 'src/modules/admin/components/admin-workspace.tsx'`:
  passed, with only the unchanged pre-existing raw-input wrapper warning in
  `src/modules/admin/components/admin-workspace.tsx`;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit plus migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed, including the catalogue coverage and catalogue-style boundary checks;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the unchanged repository baseline that
  `src/components/monolith` contains implementation files outside the allowed
  barrel/catalogue-only contract;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run build`:
  passed, with the unchanged Turbopack NFT tracing warning from `next.config.ts`
  through `src/app/api/customer-portal/document-versions/[id]/route.ts`.

Known limits:

- the review queue persists governance decisions and approved/replaced status,
  but actual source-code replacement is still intentionally surfaced as
  developer review because runtime-safe automatic UI rewrites are not supported
  by the current architecture;
- current unverified previews are source-derived live specimens rather than
  isolated imports of every route-local implementation, which keeps the feature
  operational without pretending every active production fragment can be safely
  executed in catalogue isolation;
- manual browser verification across Light, Night, and Violet themes is still
  pending in this Codex session.

## 2026-08-24 Shared text containment and workflow stage wrapping pass

Stabilized the shared text-containment contracts that were letting long enum
labels, badges, and action labels escape their containers, and fixed the
`/product-catalogue` workflow stage navigation that was reproducing the
reported `DUE_NOTIFIED` / `SELF_ASSESSMENT_OPEN` overflow screenshot.

Delivered:

- updated `src/styles/monolith-system.css` so shared page headers, panel
  headers, actions, badges, chips, text actions, and operational activity copy
  now opt into `min-width: 0` style containment and wrap long dynamic text with
  `overflow-wrap: anywhere` / `word-break: break-word` instead of assuming a
  single-line label;
- updated the shared `mnx-button` contract so non-icon buttons can grow
  vertically for longer labels while icon-mode buttons keep their fixed compact
  footprint;
- updated `src/components/layout/workspace.tsx` to expose dedicated
  `mnx-page-header-copy-body` and `mnx-panel-header-copy` hooks so canonical
  page/panel header text columns can shrink and wrap safely without colliding
  with actions;
- updated `src/app/(dashboard)/product-catalogue/page.tsx` so the workflow
  stage buttons now use an explicit `[index] [content] [icon]` structure rather
  than relying on a looser inline span layout;
- updated `src/styles/monolith-system.css` with the matching
  `mnx-catalogue-stage-button-*` rules so long raw stage names such as
  `SELF_ASSESSMENT_OPEN` wrap inside their cards and the workflow grid stacks to
  one column on narrower widths;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` after the responsive batch.

Verification on Monday, August 24, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint --no-cache --format stylish -- 'src/components/layout/workspace.tsx' 'src/app/(dashboard)/product-catalogue/page.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route + migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the unchanged repository baseline that
  `src/components/monolith` contains implementation files outside the allowed
  barrel/catalogue-only contract;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  coverage passed, but the unchanged repository baseline still fails because
  `design-system-catalogue.css` is missing;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx vitest run 'src/components/layout/workspace.test.tsx' --reporter verbose`:
  remains blocked by the repository guard that `.env.staging.local` is
  required for guarded test execution;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run build`:
  passed, with the existing Turbopack NFT tracing warning from `next.config.ts`
  through `src/app/api/customer-portal/document-versions/[id]/route.ts`.

Known limits:

- runtime browser verification in this Codex session is still pending, so this
  pass does not claim a full manual zoom/viewport sweep across every route
  family;
- the regenerated static audits still classify `/product-catalogue` as
  `NON_COMPLIANT` because the route continues to own significant bespoke visual
  composition beyond this responsive containment repair;
- broader repository baselines outside this batch remain unchanged, including
  the previously known `architecture:check`, `design-system:verify`, and
  guarded Vitest prerequisites noted above.

## 2026-08-21 Module composition responsive containment pass

Stabilized the shared module-card and module-composition specimens so the
dashboard command-center cards and the `/admin/design-system` module specimens
stop collapsing into unreadable narrow columns at constrained widths and higher
browser zoom levels.

Delivered:

- updated `src/styles/monolith-system.css` so the shared dashboard
  `mnx-module-grid` now uses intrinsic responsive columns instead of the older
  dense 12-column layout, which lets module cards naturally fall back between
  one, two, and more columns based on actual available width;
- updated the shared `mnx-module-card` contract in
  `src/styles/monolith-system.css` with container-query behavior so narrower
  cards stack their art and content vertically, supporting stats collapse to a
  single column, footer actions wrap, and key labels/headings are allowed to
  wrap instead of colliding or ellipsizing away important content;
- updated shared People and Performance specimen grids in
  `src/styles/monolith-system.css` to use auto-fit minimum widths so embedded
  preview cards stay readable inside catalogue/specimen containers;
- wrapped the production module specimens in
  `src/components/monolith/catalogue/module-catalogue.tsx` with a dedicated
  responsive specimen container and added catalogue-owned responsive containment
  styles so CHA section headings, People summaries, and AMS performance cards
  adapt to embedded-card widths more like real production usage;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` after the responsive batch.

Verification on Friday, August 21, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint --no-cache --format stylish -- 'src/components/monolith/catalogue/module-catalogue.tsx' 'src/app/(dashboard)/dashboard/_components/module-command-center.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route + migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the unchanged repository baseline that
  `src/components/monolith` contains implementation files outside the allowed
  barrel/catalogue-only contract;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  coverage passed, but the unchanged repository baseline still fails because
  `design-system-catalogue.css` is missing;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx vitest run 'src/app/(dashboard)/dashboard/module-dashboard.test.ts' --reporter verbose`:
  blocked by the repository guard that `.env.staging.local` is required for
  guarded test execution;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run build`:
  passed, with the existing Turbopack NFT tracing warning from `next.config.ts`
  through `src/app/api/customer-portal/document-versions/[id]/route.ts`.

Known limits:

- runtime browser verification in this Codex session is still blocked because
  the Browser runtime reported no available controllable browser backends even
  though the local app server was already running at `http://localhost:3000`;
- this pass fixes the shared grid/card/specimen containment that caused the
  reported overlap on the module composition surfaces, but it does not claim a
  fresh manual route-by-route responsive audit across every authenticated module
  family in-browser for this session;
- broader repository baselines outside this batch remain unchanged, including
  the previously known `architecture:check` and
  `design-system:verify` failures noted above.

## 2026-08-21 Shared trial checkout design-system pattern

Added a reusable Monolith checkout/trial composition pattern and registered a
live specimen in `/admin/design-system` so subscription-style billing and
payment flows can be built from one shared contract instead of route-local
markup.

Delivered:

- added `src/components/layout/trial-checkout.tsx` with the shared checkout
  composition primitives for the two-column shell, section headings, responsive
  field rows, payment method cards, summary card, trial timeline, and price
  list;
- exported the shared checkout primitives through
  `src/components/monolith/index.ts` so routes and the design-system catalogue
  can consume the same production API;
- added a live specimen to
  `src/components/monolith/catalogue/shared-catalogue.tsx` that mirrors the
  requested trial-checkout structure using canonical Monolith controls and
  safe mock content;
- added the production styling for the checkout pattern to
  `src/styles/monolith-system.css`, including desktop/mobile layout behavior,
  payment-option emphasis, right-rail timeline rhythm, pricing rows, and legal
  confirmation treatment.

Verification on Friday, August 21, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint --no-cache --format stylish -- 'src/components/layout/trial-checkout.tsx' 'src/components/monolith/catalogue/shared-catalogue.tsx' 'src/components/monolith/index.ts'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  still fails on the unchanged repository baseline that
  `design-system-catalogue.css` is missing, while the design-system coverage
  check itself passed.

Current status after this pattern addition:

- the requested checkout style is now available as a reusable shared Monolith
  pattern instead of only a route-local mockup;
- `/admin/design-system` now includes a live specimen for the pattern so future
  payment/trial routes can reference the same production implementation;
- no route migration status changed in this batch because this pass added
  shared UI infrastructure rather than migrating a user-facing route.

## 2026-08-21 Dashboard hero spacing and de-card pass

Refined the `/dashboard` operations hero so the welcome area reads as one
intentional workspace surface instead of an outer card containing a second
boxed inner card.

Delivered:

- updated `src/app/(dashboard)/dashboard/_components/attendance-command.tsx`
  so the hero now uses a flatter single-surface composition with a live status
  pill, a compact insight grid for priority counts, and a more deliberate
  `Primary pulse` plus `Action queue` layout instead of the tighter ticker-only
  block;
- updated `src/styles/monolith-system.css` so the dashboard page-shell removes
  the nested inner-card treatment from the identity area, increases spacing
  between the hero content zones, and adds responsive styling for the new
  insight/action layouts across desktop and mobile widths.

Verification on Friday, August 21, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint --no-cache --format stylish -- 'src/app/(dashboard)/dashboard/_components/attendance-command.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed.

Current dashboard status after this pass:

- `/dashboard` remains the composition reference route, but the hero now has
  cleaner spacing and a flatter structure that should remove the visible
  nested-card feel from the left identity block;
- the action presentation is denser and easier to scan, with one featured
  operational pulse and a clearer supporting queue rather than a mostly empty
  scrolling window;
- manual runtime verification in Light, Night, and Violet themes is still
  pending in this Codex session.

## 2026-08-19 Communication chat full-height shell alignment

Adjusted the `/communication/chat` workspace shell so it fills the available
route canvas more like the mail tab, removes the remaining chat gradients, and
brings the left sidebar composition closer to the provided Google Chat
reference.

Delivered:

- updated `src/app/(dashboard)/communication/chat/page.tsx` so the sidebar now
  consumes its full grid column instead of keeping a narrower fixed width,
  which removes the blank strip between the chat rail and the conversation
  pane;
- updated `src/styles/modules/communication-admin.css` so the chat shell now
  uses a full-height layout contract, solid surfaces instead of gradients
  across the shell/sidebar/header/feed/composer/context rail, and flatter
  Google-Chat-style sidebar treatment for the shortcuts and list regions;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` after the chat shell batch.

Verification on Wednesday, August 19, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/communication/chat/page.tsx'`:
  completed with only the pre-existing stale `eslint-disable` warnings already
  present in the file; no new lint errors were introduced by this batch;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route + migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the unchanged repository baseline that
  `src/components/monolith` contains implementation files outside the allowed
  barrel/catalogue-only contract;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  still fails on the unchanged repository baseline that
  `design-system-catalogue.css` is missing.

Current communication chat status after the shell alignment batch:

- `/communication/chat` still needs broader source cleanup to leave the
  `NON_COMPLIANT` static-audit status, but it now uses the available vertical
  space more like `/communication/mail` and no longer leaves the visible blank
  gutter between the sidebar and the conversation pane;
- the visual treatment is now flatter and closer to the reference, with the
  gradients removed from the active chat shell surfaces;
- manual runtime verification in Light, Night, and Violet themes is still
  pending in this Codex session because no in-app browser target was available.

## 2026-08-19 Communication chat reference-shell rework

Reworked the `/communication/chat` visual shell to track the provided
reference more closely while staying inside the approved Communication
workspace frame, shared action/input primitives, and module-owned styling.

Delivered:

- updated `src/app/(dashboard)/communication/chat/page.tsx` so the chat route
  now presents a Gmail-style left command rail with a prominent `New chat`
  action, clearer shortcuts, more reference-aligned DM/space list treatment,
  a denser conversation header, softer message bubble rhythm, and a rounder
  composer/footer treatment without changing the existing chat sync, SSE,
  polling, typing, read-state, or modal workflows;
- updated `src/styles/modules/communication-admin.css` so the Communication
  module owns the revised pane proportions, sidebar/header spacing, feed and
  composer containment, selected-row emphasis, and details-panel surface
  treatment using Monolith semantic tokens rather than route-local legacy CSS;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` after the chat batch.

Verification on Wednesday, August 19, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/communication/chat/page.tsx'`:
  completed with only the pre-existing stale `eslint-disable` warnings already
  present in the chat page; no new lint errors were introduced by this batch;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route + migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the unchanged repository baseline that
  `src/components/monolith` contains implementation files outside the allowed
  barrel/catalogue-only contract;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  still fails on the unchanged repository baseline that
  `design-system-catalogue.css` is missing.

Current communication chat status after the reference-shell rework:

- `/communication/chat` remains `NON_COMPLIANT` in the static audit, but the
  route now follows the requested visual reference more closely across the
  sidebar, conversation header, feed, composer, and context panel shell;
- the batch stayed intentionally inside the existing route so business logic,
  Google Workspace integrations, and interaction contracts remain intact;
- manual runtime verification in Light, Night, and Violet themes is still
  pending in this Codex session because no in-app browser target was available.

## 2026-08-19 Communication chat repair pass

Stabilized the `/communication/chat` workspace after the latest alignment pass
so active conversations resolve to real people more reliably and the three-pane
chat shell keeps the center thread and composer visible inside the fixed-height
workspace.

Delivered:

- updated `src/app/api/communication/chat/list/route.ts` so DM identity
  resolution now uses the full active-user workspace mapping, cached Chat-space
  links, and safer fallback labels instead of surfacing generic `Google DM` /
  org-profile names in the sidebar;
- updated `src/app/api/communication/chat/messages/route.ts`,
  `src/app/api/communication/chat/sse/route.ts`, and
  `src/app/api/communication/chat/check-new/route.ts` so sender/toast names use
  the same real-user resolution path more consistently and avoid regressing to
  generic Chat labels when Google returns tenant profile names;
- updated `src/app/api/communication/chat/space/members/route.ts` so the
  members panel resolves current-user and employee identities more accurately,
  which also fixes current-user membership detection for space actions;
- updated `src/app/(dashboard)/communication/chat/page.tsx` and
  `src/styles/modules/communication-admin.css` so the grid/flex chat panes use
  explicit `min-height` containment and safer DM fallback labels, preventing
  the center conversation/feed/composer area from collapsing out of view in the
  aligned workspace shell;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` after the chat repair batch.

Verification on Wednesday, August 19, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/api/communication/chat/list/route.ts' 'src/app/api/communication/chat/messages/route.ts' 'src/app/api/communication/chat/sse/route.ts' 'src/app/api/communication/chat/check-new/route.ts' 'src/app/api/communication/chat/space/members/route.ts' 'src/app/(dashboard)/communication/chat/page.tsx'`:
  completed with the pre-existing chat-page warnings for stale/unused
  `eslint-disable` directives only; no new lint errors remain in the repaired
  files;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route + migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the unchanged repository baseline that
  `src/components/monolith` contains implementation files outside the allowed
  barrel/catalogue-only contract;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  still fails on the unchanged repository baseline that
  `design-system-catalogue.css` is missing.

Current communication chat status after the repair pass:

- `/communication/chat` remains the same route family, but its DM/member/sender
  naming is now materially more stable across sidebar rows, message feeds,
  member drawers, and toast updates;
- the center chat shell now has explicit layout containment for the feed and
  composer, which should address the blank middle pane / missing type-bar issue
  caused by the alignment pass;
- manual runtime verification in the browser is still pending in this Codex
  session because no in-app browser target was available.

## 2026-08-19 Communication Overview command-centre rebuild

Rebuilt the Communication Overview route into a denser command-centre dashboard
that follows the approved reference hierarchy while staying inside the existing
Monolith Communication shell, shared workspace primitives, and module-owned UI
contracts.

Delivered:

- replaced the old lightweight `/communication` summary route in
  `src/app/(dashboard)/communication/page.tsx` with a real dashboard backed by
  live Gmail, Calendar, Google Chat, job-workspace, Drive-readiness, and
  communication-audit data instead of static mock metrics;
- added the module-owned
  `src/modules/communication/components/communication-overview-dashboard.tsx`
  composition for the new KPI band, activity tabs, upcoming meetings rail,
  quick actions, activity-overview analytics, Drive coverage, and operational
  alerts panels;
- extended `src/styles/modules/communication-admin.css` with Communication-owned
  overview layout/styling hooks for the new command-centre grid, cards, tabs,
  activity rows, health ring, analytics tiles, and alert layouts using existing
  Monolith tokens and theme semantics;
- updated `src/app/(dashboard)/communication/mail/page.tsx` and
  `src/modules/communication/components/mail-workspace.tsx` so Overview email
  rows can deep-link into a specific Gmail thread via `threadId` without
  dropping users at the top of the inbox;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` after the overview batch.

Verification on Wednesday, August 19, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/communication/page.tsx' 'src/app/(dashboard)/communication/mail/page.tsx' 'src/modules/communication/components/communication-overview-dashboard.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route + migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the unchanged repository baseline that
  `src/components/monolith` contains implementation files outside the allowed
  barrel/catalogue-only contract;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  still fails on the unchanged repository baseline that
  `design-system-catalogue.css` is missing.

Current Communication Overview status after the regenerated audit:

- `/communication` remains `COMPLIANT` in the static audit after the dashboard
-level rebuild;
- no new shared design-system primitive was introduced in this batch, so the
  work stayed within module-owned Communication compositions rather than adding
  new catalogue entries;
- the route now surfaces real workspace connection, inbox, meetings, chat,
  Drive-readiness, and alert data while leaving unsupported quota/storage
  percentages out of the UI;
- manual browser verification in Light, Night, and Violet themes is still
  pending in this Codex session.

## 2026-08-19 Communication chat interface alignment pass

Refined the Communication chat workspace so the chat tab reads closer to the
provided team-chat reference while still preserving the existing Google Chat
sync, polling, SSE, DM, job-space, and space-management behavior.

Delivered:

- updated `src/app/(dashboard)/communication/chat/page.tsx` so the three-pane
  chat shell now uses clearer design-system action treatment in the chat header
  and job-context actions, adds explicit workspace data hooks for the sidebar,
  header, feed, composer, and context rail, and aligns the search and status
  controls more closely to the requested reference layout;
- updated `src/styles/modules/communication-admin.css` with module-owned chat
  composition styling for the three-column workspace, softened sidebar/header
  gradients, denser search and tab treatment, a more structured message-feed
  canvas, a roomier composer, and a cleaner right-context rail using Monolith
  semantic tokens;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` after the chat batch.

Verification on Wednesday, August 19, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/communication/chat/page.tsx' 'src/styles/modules/communication-admin.css'`:
  completed with existing/harmless warnings in the chat page for now-unused
  `eslint-disable` directives and the known stylesheet-config warning that the
  CSS file is ignored by the current ESLint configuration;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route + migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  still fails on the unchanged repository baseline that
  `design-system-catalogue.css` is missing.

Current communication chat status after the regenerated audit:

- `/communication/chat` remains `NON_COMPLIANT` in the static audit, but the
  flagged visual utility count dropped from 729 to 713 and direct
  button-styled links dropped from 6 to 3;
- the route still needs a deeper follow-up pass to move more of the remaining
  route-local composition into clearer design-system or module-owned shared
  contracts;
- manual browser verification in Light, Night, and Violet themes is still
  pending in this Codex session.

## 2026-08-18 Communication mail Gmail-style workspace rebuild

Rebuilt the Communication mail experience into a module-owned Gmail-style
workspace so the route now reads and behaves like a modern mailbox instead of
the previous route-local split pane implementation.

Delivered:

- replaced the oversized route-local mail page with the thin
  `src/app/(dashboard)/communication/mail/page.tsx` wrapper that now delegates
  to the module-owned `CommunicationMailWorkspace` in
  `src/modules/communication/components/mail-workspace.tsx`;
- rebuilt the mail UI into a Gmail-inspired three-pane workspace with a
  rounded search header, compose sheet, folder rail, category tabs, threaded
  message list, reading pane, inline reply flow, attachment handling, label
  management, and keyboard shortcuts aligned to familiar Gmail patterns;
- extended the Gmail integration layer in `src/lib/google-gmail-client.ts` so
  the mailbox can fetch fuller thread sets, create drafts, send multipart mail
  with attachments, manage labels, and download attachments cleanly through the
  app APIs;
- added `src/app/api/communication/mail/draft/route.ts` and
  `src/app/api/communication/mail/attachment/route.ts`, and updated
  `src/app/api/communication/mail/send/route.ts` to support Gmail-style draft,
  send, and attachment workflows from the rebuilt workspace;
- expanded `src/styles/modules/communication-admin.css` with the
  `mnx-gmail-*` component styles needed for the new module-owned mailbox
  composition;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` after the mail batch.

Verification on Tuesday, August 18, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/lib/google-gmail-client.ts' 'src/modules/communication/components/mail-workspace.tsx' 'src/app/(dashboard)/communication/mail/page.tsx' 'src/app/api/communication/mail/draft/route.ts' 'src/app/api/communication/mail/attachment/route.ts' 'src/app/api/communication/mail/send/route.ts'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and now classifies `/communication/mail` as `COMPLIANT`;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and refreshed the ownership audit for the new mail workspace owner;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  still fails on the pre-existing Leave module baseline in
  `src/modules/leave/**`, unrelated to this communication mail batch.

Current communication status after the regenerated audit:

- `/communication/mail` is now classified as `COMPLIANT` in the route audit;
- the mail workspace is now owned by
  `src/modules/communication/components/mail-workspace.tsx`, with route
  composition reduced to a business-layout wrapper;
- manual browser verification in Light, Night, and Violet themes is still
  pending in this Codex session;
- the ownership audit still surfaces some route-local raw HTML usage inside the
  new workspace composition, which should be treated as a follow-up refinement
  pass rather than a blocker to the route migration result.

## 2026-08-18 Communication lighter-route cleanup

Cleaned up the smaller Communication routes so the family now has a clearer
split between the lightweight pages that already fit the shared Monolith
workspace contracts and the heavier mail/chat/job-collaboration pages that
still need dedicated migration passes.

Delivered:

- updated `src/app/(dashboard)/communication/page.tsx` so the overview route
  now uses canonical link-action treatment for the mailbox shortcut and no
  longer keeps a route-local record card wrapper for upcoming meetings;
- updated `src/app/(dashboard)/communication/meetings/page.tsx` so the
  upcoming meeting register now uses the shared record container contract
  without the flagged raw `article` wrapper;
- updated `src/app/(dashboard)/communication/search/page.tsx` so the job
  result action now uses canonical `ButtonLink` treatment and all three result
  lists no longer rely on flagged raw record wrappers;
- updated `src/app/(dashboard)/communication/drive/page.tsx` so the back
  navigation uses the canonical link-action contract instead of route-local
  button styling;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` after the communication
  batch.

Verification on Tuesday, August 18, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/communication/page.tsx' 'src/app/(dashboard)/communication/meetings/page.tsx' 'src/app/(dashboard)/communication/search/page.tsx' 'src/app/(dashboard)/communication/drive/page.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route + migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  still fails on the pre-existing Leave module baseline in
  `src/modules/leave/**`, unrelated to this communication batch.

Current communication status after the regenerated audit:

- `/communication`, `/communication/meetings`, and `/communication/search` are
  now classified as `COMPLIANT`;
- `/communication/drive` and `/communication/job-spaces` remain
  `NON_COMPLIANT` because the static audit still sees styled link surfaces that
  need a more explicit canonical action/composition pass;
- `/communication/mail` and `/communication/chat` remain the heaviest
  non-compliant routes and should be handled in dedicated follow-up batches;
- `/communication/error` remains `PARTIAL` in the static audit even though it
  routes through `CommunicationErrorState`, so that audit rule likely needs a
  closer look during a later route-state cleanup pass.

## 2026-08-14 Shared navbar command search

Rebuilt the authenticated Monolith navbar search into a shared, role-aware
command surface so people can search across the workspaces and pages available
to their permissions instead of only scanning a small section list.

Delivered:

- added `src/components/navigation/monolith-search-command.tsx` as the shared
  production command palette owner for navbar search;
- extended `src/lib/navigation.ts` so search entries are derived from the same
  RBAC, module, and feature-gated navigation registry that drives sidebar
  visibility, which keeps hidden destinations out of the navbar search;
- updated `src/modules/core/components/monolith-app-shell.tsx` so the topbar
  search now opens the shared command palette instead of the previous
  route-local quick-navigation overlay;
- updated `src/components/monolith/catalogue/shared-catalogue.tsx` and
  `src/components/monolith/index.ts` so the search surface is documented as a
  shared production component;
- refreshed `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` after this shell/search UI
  batch.

Verification on Friday, August 14, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/lib/navigation.ts' 'src/lib/navigation.test.ts' 'src/components/navigation/monolith-search-command.tsx' 'src/modules/core/components/monolith-app-shell.tsx' 'src/components/monolith/catalogue/shared-catalogue.tsx'`:
  completed with the existing `monolith-app-shell.tsx` raw-button warnings that
  predate this batch;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  pending rerun after the final search-catalogue icon typing adjustment in this
  session;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed the route inventory;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and refreshed the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the long-standing repository baseline that
  `src/components/monolith` contains compatibility implementations outside the
  allowed barrel/catalogue-only contract;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  still fails on the unchanged baseline that `design-system-catalogue.css` is
  missing.

Known limits:

- the shared navbar search is now a strong master search for Monolith
  workspaces and registered pages, but it does not yet index live business
  records such as individual employees, customers, jobs, or quotes because
  those domain search APIs are separate work;
- manual browser verification in Light, Night, and Violet themes is still
  pending in this Codex session.

## 2026-08-14 Shared searchable dropdown contract

Standardized the shared Monolith dropdown interaction so routes using
`DropdownSelect` now follow one searchable, type-to-filter pattern instead of
relying on route-local dropdown behavior.

Delivered:

- updated `src/components/ui/dropdown-select.tsx` so the shared dropdown now
  opens from typed input, focuses an in-menu search field, narrows options live
  against labels and values, preserves scroll selection, and shows a canonical
  empty state when nothing matches;
- updated `src/styles/monolith-system.css` so the searchable dropdown uses
  shared spacing, sticky search treatment, focus styles, and empty-state
  typography instead of ad hoc route styling;
- updated `src/components/monolith/catalogue/shared-catalogue.tsx` so the
  design-system catalogue documents the searchable dropdown contract with a live
  specimen.

Verification on Friday, August 14, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint src/components/ui/dropdown-select.tsx src/components/monolith/catalogue/shared-catalogue.tsx`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed.

Known limits:

- this batch standardizes the shared `DropdownSelect` owner and every current
  route that consumes it, but it does not migrate every native HTML
  `<select>`/`NativeSelect` usage in the repository to the searchable contract;
- manual browser verification across every `DropdownSelect` consumer is still
  pending in this Codex session.

## 2026-08-14 Product catalogue and freight button contract cleanup

Replaced broken route-local button implementations with canonical design-system
actions so Product Catalogue and Freight Forwarding no longer depend on
hardcoded raw button markup for the affected controls.

Delivered:

- updated `src/app/(dashboard)/product-catalogue/page.tsx` so the route now
  uses shared `Button`, `ButtonLink`, and interactive `WorkspacePanel`
  contracts for the workflow/outcomes CTAs, module selection cards, workflow
  view switch, module tabs, and stage selectors instead of route-local raw
  buttons;
- updated
  `src/modules/freight-forwarding/components/freight-forwarding-create-booking-client.tsx`
  so the MBL/HBL detail switcher now uses shared `Button` variants instead of
  raw segmented buttons;
- updated `src/styles/monolith-system.css` so Product Catalogue tab/stage
  styling now targets canonical `.mnx-button` contracts and the segmented
  mobile rule also applies to design-system buttons;
- refreshed `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` after this UI batch.

Verification on Friday, August 14, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/product-catalogue/page.tsx' 'src/modules/freight-forwarding/components/freight-forwarding-create-booking-client.tsx' 'src/components/ui/button.tsx' 'src/styles/monolith-system.css'`:
  completed with the existing global-stylesheet warning that
  `src/styles/monolith-system.css` is ignored by the current ESLint config;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed the route inventory;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and refreshed the ownership audit.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  button cleanup is source-verified and static-check-verified rather than
  manually browser-checked in Light, Night, and Violet themes;
- Product Catalogue still contains broader route-local composition that remains
  tracked by the migration audit even though the broken hardcoded button set was
  replaced in this pass.

## 2026-08-09 Dashboard final authority cleanup

Rebuilt the protected `/dashboard` route’s final visual authority so the page
fully uses the available workspace width and no longer gets partially broken by
older duplicated dashboard rules later in the shared stylesheet.

Delivered:

- kept the protected dashboard on the route-specific
  `mnx-dashboard-page-shell` hook in
  `src/app/(dashboard)/dashboard/portal-client.tsx`;
- added a final end-of-file authoritative dashboard block in
  `src/styles/monolith-system.css` under the route-specific
  `.mnx-dashboard-page-shell` selector family so the protected dashboard now
  wins on page width, hero layout, spotlight composition, metrics layout,
  lower grid spans, panel padding, and mobile reflow;
- converted the action stream treatment into a denser, card-like live bulletin
  viewport with clear item hierarchy, explicit current/next slide states, and a
  cleaner vertical ticker presentation that is no longer visually vague or
  overridden back to an expanded list;
- refreshed `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` after the dashboard batch.

Verification on Sunday, August 9, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed the route inventory;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and refreshed the ownership audit.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so this
  final dashboard authority cleanup is source-verified and static-check-verified
  rather than manually browser-checked in Light, Night, and Violet themes;
- this pass intentionally establishes a route-specific final override layer for
  the protected dashboard rather than refactoring every earlier legacy dashboard
  selector out of the shared stylesheet in the same batch.

## 2026-08-09 Dashboard full-width composition follow-up

Expanded the protected `/dashboard` composition so the wider canvas is used by
the spotlight and lower content bands instead of only the hero.

Delivered:

- updated `src/app/(dashboard)/dashboard/portal-client.tsx` so the protected
  dashboard route now opts into a dashboard-specific width hook through
  `mnx-dashboard-page-shell`;
- updated `src/styles/monolith-system.css` so the protected dashboard can use a
  wider centered canvas, the hero columns allocate more space to the main
  workspace narrative, the spotlight band expands proportionally, and the lower
  dashboard cards now use a 12-column layout with balanced panel spans;
- slightly increased the highlighted module-strip spacing so the wider layout
  still feels deliberate rather than sparse.

Verification on Sunday, August 9, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so this
  full-width dashboard follow-up is source-verified and type-verified rather
  than manually browser-checked in Light, Night, and Violet themes;
- this pass rebalances the dashboard composition only and does not change team
  or organization route logic.

## 2026-08-09 Dashboard action-stream ticker refinement

Refined the protected `/dashboard` hero so the action stream now behaves like a
true live-updates ticker and the dashboard entry experience reads closer to the
current Monolith card and motion language.

Delivered:

- updated `src/app/(dashboard)/dashboard/_components/attendance-command.tsx`
  so the hero action stream now carries per-item live-status chips, a dedicated
  live-updates header, and ticker timing driven by the number of active items
  instead of the older flat duplicated list treatment;
- updated `src/styles/monolith-system.css` so the dashboard action stream now
  renders as a bordered card-like viewport with one update advancing at a time,
  hover/focus pause behavior, stronger item hierarchy, and mobile-safe stacked
  metadata while still respecting reduced-motion handling;
- refreshed `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` after the dashboard UI
  batch so the repository audit artifacts remain current for this session.

Verification on Sunday, August 9, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/dashboard/_components/attendance-command.tsx' 'src/styles/monolith-system.css'`:
  completed with only the existing configuration warning that the global CSS
  file is ignored because no ESLint configuration matches it;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed the route inventory;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and refreshed the ownership audit.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  dashboard ticker refinement is source-verified and static-check-verified
  rather than manually browser-checked in Light, Night, and Violet themes;
- this pass focused on the protected dashboard hero action stream and shared
  dashboard styling ownership, and it does not rework unrelated team or
  organization dashboard panels.

## 2026-08-09 Product catalogue design-system cleanup

Refined `/product-catalogue` so the route follows the Monolith panel, card,
and spacing rhythm more closely instead of relying on mostly unstyled route
layout flow.

Delivered:

- updated `src/app/(dashboard)/product-catalogue/page.tsx` to use the shared
  `ButtonLink` contract for the internal catalogue jump actions, promoted the
  intro/benefits/CTA sections into `WorkspacePanel` surfaces, and added route
  class hooks for the page header, index panel, capability grid, and CTA
  actions;
- added the missing production styling for the catalogue route in
  `src/styles/monolith-system.css`, covering the catalogue hero header,
  filter/index layout, module selection cards, intro panel, capability cards,
  workflow/manual layout, dossier/interactions grids, benefits cards, CTA
  panel, and mobile responsive behavior;
- preserved the existing catalogue data, workflow switching logic, filters,
  print action, and CTA navigation behavior while tightening alignment and
  reducing excess whitespace.

Verification on Sunday, August 9, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/product-catalogue/page.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  refreshed product catalogue route is source-verified and static-check
  verified rather than manually browser-checked in Light, Night, and Violet
  themes;
- this pass improves the route’s production presentation and spacing, but it
  does not regenerate the repository-wide audit documents or reclassify the
  route-family status matrix in this session.

## 2026-08-09 Shared workspace metric card standardization

Standardized the shared Monolith summary metric presentation so routes using
`WorkspaceMetric` now render the same card treatment across admin, customer
portal, CHA/CRM wrappers, freight forwarding, todo, root, and other workspace
surfaces.

Delivered:

- updated `src/components/layout/workspace.tsx` so `WorkspaceMetric` now uses a
  stable header/body anatomy with explicit metric value and detail wrappers for
  consistent alignment across numeric and text values;
- updated `src/styles/monolith-system.css` so `.mnx-workspace-metrics` now
  renders as a responsive grid of individual design-system cards instead of the
  older connected strip, with shared icon chips, header dividers, spacing, and
  actionable hover/focus treatment;
- removed the communication-only summary-card fork and switched
  `src/app/(dashboard)/communication/page.tsx` back to the shared
  `WorkspaceMetric` primitive so Communication now inherits the same canonical
  metric design as the rest of Monolith;
- extended `src/components/layout/workspace.test.tsx` to cover the updated
  shared metric anatomy.

Verification on Sunday, August 9, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/components/layout/workspace.tsx' 'src/components/layout/workspace.test.tsx' 'src/app/(dashboard)/communication/page.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  still fails because `design-system-catalogue.css` is currently missing, which
  is unrelated to this shared metric change;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx vitest run 'src/components/layout/workspace.test.tsx' --reporter verbose`:
  is blocked by the repository guard that requires `.env.staging.local` before
  Vitest startup in this environment.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  shared metric card rollout is source-verified and static-check-verified
  rather than manually checked across Light, Night, and Violet themes;
- this pass standardizes routes already built on `WorkspaceMetric`; it does not
  migrate unrelated non-compliant pages that still use different route-local
  summary implementations.

## 2026-08-08 Admin design system blank reset

Reset `/admin/design-system` to a blank starting point so new design system
content can be added incrementally from scratch.

Delivered:

- replaced the existing catalogue render in
  `src/app/(dashboard)/admin/design-system/page.tsx` with an empty authorized
  route response while preserving the existing login and RBAC gate;
- deleted the old route-local catalogue implementation file
  `src/app/(dashboard)/admin/design-system/design-system-client.tsx`;
- deleted the old route-local stylesheet
  `src/app/(dashboard)/admin/design-system/design-system-catalogue.css`.

Verification on Saturday, August 8, 2026:

- source-verified that the route no longer imports or renders the previous
  catalogue UI;
- authenticated browser runtime is not attached in this Codex session, so the
  blank state is source-verified rather than manually browser-checked.

## 2026-08-08 Admin design system staging stylesheet

Added a dedicated blank stylesheet for `/admin/design-system` so new page-level
design-system work can be styled there first before approved patterns are
promoted into shared owners.

Delivered:

- created `src/app/(dashboard)/admin/design-system/design-system.css` as the
  new blank staging stylesheet for that route;
- updated `src/app/(dashboard)/admin/design-system/page.tsx` to import the new
  stylesheet while keeping the route otherwise blank.

Verification on Saturday, August 8, 2026:

- source-verified that the admin design system route now imports the new blank
  stylesheet and still renders no page content.

## 2026-08-08 CHA global CSS ownership cleanup

Removed CHA-only selectors from the shared Monolith stylesheet so the global
layer no longer carries CHA page styling for unrelated routes.

Delivered:

- moved the remaining live CHA-only heading/layout selectors from
  `src/styles/monolith-system.css` into the module owner
  `src/styles/modules/cha-expense.css`;
- removed the duplicated shared/global `mnx-cha-*` selector block from
  `src/styles/monolith-system.css`, leaving generic shared operations styling
  in the shared layer and CHA page styling in the CHA module stylesheet;
- preserved the active CHA workspace classes used by
  `src/modules/cha/components/workspace/cha-workspace.tsx`,
  `src/modules/cha/components/workspace/cha-operations-shared.tsx`, and the
  CHA job/detail routes while dropping older unused global-only CHA selectors.

Verification on Saturday, August 8, 2026:

- source ownership verified with targeted selector search before and after the
  change;
- authenticated browser runtime is not attached in this Codex session, so this
  cleanup is source-verified rather than manually browser-checked.

## 2026-08-07 CHA document stage tab-flow refinement

Refined the `/cha/jobs/[jobId]` document-collection workspace so operators move
through document categories and requirements one by one instead of scanning
large repeated cards.

Delivered:

- updated `src/app/(dashboard)/cha/jobs/[jobId]/job-workspace-client.tsx` so
  the document stage now uses visible category tabs, compact requirement tabs
  inside the active category, and one focused requirement panel at a time;
- preserved the existing upload, preview, delete, exemption, N/A, customer
  submission acceptance, and quick-upload flows while moving them into the new
  category-first navigation model;
- updated `src/styles/modules/cha-expense.css` with module-owned category-tab,
  requirement-tab, and compact count styling so document groups are easier to
  identify and spacing stays tighter.

Verification on Friday, August 7, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/cha/jobs/[jobId]/job-workspace-client.tsx' 'src/styles/modules/cha-expense.css'`:
  still reports the long-standing baseline `@typescript-eslint/no-explicit-any`
  issues already present in `job-workspace-client.tsx`; this refinement did not
  introduce a new focused lint failure.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  new tab-flow document workspace is source-verified and type-verified rather
  than manually browser-checked in Light, Night, and Violet themes;
- this pass intentionally changes the document-stage presentation only and does
  not alter route classification, server actions, or workflow rules.

## 2026-08-07 CHA new-job popup restoration

Restored the shared popup treatment for CHA job creation so the dedicated
`/cha/jobs/new` route now presents the existing create-job modal instead of the
full-page variant.

Delivered:

- updated `src/app/(dashboard)/cha/jobs/new/new-job-client.tsx` so the route
  no longer wraps the form in an extra page header/back action shell;
- switched the route wrapper back to `CreateJobDialog` with `variant="dialog"`
  so the page uses the same popup design language already established for CHA
  create flows;
- preserved the existing close/back behavior by continuing to push the caller
  back to the provided `backHref` when the popup closes.

Verification on Friday, August 7, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/cha/jobs/new/new-job-client.tsx' 'src/app/(dashboard)/cha/jobs/new/page.tsx' 'src/app/(dashboard)/cha/process/[quoteId]/cha-process-job-client.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  popup restoration is source-verified and static-check-verified rather than
  manually browser-checked in Light, Night, and Violet themes.

## 2026-08-07 CHA workspace rhythm and dashboard interaction refresh

Reworked the CHA jobs workspace and the protected `/dashboard` command surfaces
so they feel less cramped, more aligned, and more interactive without changing
route structure, business logic, or permissions.

Delivered:

- updated `src/app/(dashboard)/cha/jobs/jobs-client.tsx` so CHA Jobs now uses a
  single shared `Queue command desk` for search, filters, and new-job actions
  instead of repeating crowded controls inside both active and completed table
  headers;
- updated `src/styles/modules/cha-expense.css` so the CHA module now gets a
  stronger connected metrics strip, cleaner command-panel spacing, better table
  panel rhythm, and more responsive control stacking across the workspace;
- updated `src/app/(dashboard)/dashboard/_components/dashboard-overview.tsx`
  so the main dashboard now opens with a `Today's command brief` spotlight,
  quick-launch links, and a live signal stack instead of going straight from
  module cards into flatter legacy panels;
- updated `src/app/(dashboard)/dashboard/_components/module-command-center.tsx`
  so module cards now surface a highlighted top row, clearer live-state meta,
  and richer secondary action context;
- updated `src/app/(dashboard)/dashboard/portal-client.tsx` so the dashboard
  tab switcher now includes a visible active-workspace intro band to make the
  personal, team, and organization surfaces feel more guided;
- updated `src/styles/monolith-system.css` with the shared dashboard spotlight,
  launch-link, module-spotlight, and tab-intro styling needed for the new
  interaction model;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` after the UI batch.

Verification on Friday, August 7, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/cha/jobs/jobs-client.tsx' 'src/app/(dashboard)/dashboard/portal-client.tsx' 'src/app/(dashboard)/dashboard/_components/dashboard-overview.tsx' 'src/app/(dashboard)/dashboard/_components/module-command-center.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed the route inventory;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and refreshed the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  CHA and dashboard presentation refresh is source-verified and static-check
  verified rather than manually checked in Light, Night, and Violet themes;
- this pass intentionally focused on the CHA workspace rhythm and the protected
  `/dashboard` composition layer, so other CHA routes inherit the spacing and
  panel improvements from shared module styling but were not each manually
  restaged route-by-route in this session;
- unrelated existing worktree changes were preserved and left untouched.

## 2026-08-07 CHA job hero card alignment refinement

Refined the `/cha/jobs/[jobId]` top summary card so the job identity and
metadata align more clearly across desktop and smaller screens without changing
workflow logic, permissions, or server behavior.

Delivered:

- updated `src/app/(dashboard)/cha/jobs/[jobId]/job-workspace-client.tsx` so
  the hero now uses a dedicated identity/action header and a structured
  metadata board instead of one stretched horizontal strip;
- promoted the customer block into a featured summary card and aligned the
  remaining owner, manager, date, type, and reference blocks into a responsive
  grid for better reading rhythm and less crowding;
- added module-owned CHA styles in `src/styles/modules/cha-expense.css` for the
  new hero header, copy action, responsive meta grid, and balanced card spacing
  using existing Monolith/Frappe tokens.

Verification on Friday, August 7, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/cha/jobs/[jobId]/job-workspace-client.tsx'`:
  still fails on pre-existing baseline issues in that long-lived file,
  including older `@typescript-eslint/no-explicit-any` violations unrelated to
  this card refinement;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  still fails on the current repository baseline because
  `src/app/(dashboard)/cha/jobs/jobs-client.tsx` references
  `setOpenFilterTable`, which is unrelated to this hero-card change.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  refined CHA job card is source-verified rather than manually browser-checked
  in Light, Night, and Violet themes;
- this pass intentionally stays within the existing CHA job workspace route and
  does not change surrounding workflow panels or the route migration
  classification.

## 2026-08-07 attendance punch detail refinement

Refined the `/attendance/punch` day-detail experience so the monthly punch view
stays aligned under dense attendance and overtime data without changing route
logic, permissions, or the Monolith/Frappe visual system.

Delivered:

- updated `src/app/(dashboard)/attendance/punch/punch-card.tsx` so the
  timeline grid now uses a wider hours column and a full-width track, which
  prevents overtime visuals from colliding with worked-hours text in crowded
  rows;
- removed the floating inline overtime text from the timeline bar and kept OT
  minutes readable through the dedicated OT column and the right-side overtime
  summary, eliminating the overlap seen in the attendance month view;
- softened the right-side day-detail header and session markers by removing the
  extra card-like icon chips while preserving the same token family, spacing,
  and attendance status language;
- added a compact `Day pulse` summary strip in the right-side detail area so
  first-in, last-out, and worked time surface immediately in a cleaner,
  design-system-consistent way.

Verification on Friday, August 7, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/attendance/punch/punch-card.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  attendance punch refinements are source-verified and static-check-verified
  rather than manually browser-checked in Light, Night, and Violet themes;
- the route inventory and migration status classification were not changed by
  this focused presentation fix, so the existing audit documents remain current.

## 2026-08-07 module dashboard rework batch

Reworked the module home dashboards so they behave more like operational
command centres and less like shortcut menus, while preserving the underlying
navigation, permissions, and route structure.

Delivered:

- added `src/components/data-display/dashboard-insights.tsx` as a lightweight
  shared dashboard visual layer for compact insight cards, bar charts, trend
  bars, and segmented workload summaries using existing Monolith tokens;
- registered the new shared dashboard insight component in
  `src/components/monolith/index.ts` and
  `src/components/monolith/catalogue/shared-catalogue.tsx`;
- added shared production styling for the dashboard insight layer in
  `src/styles/monolith-system.css`;
- reworked `src/app/(dashboard)/hrms/page.tsx` so HRMS now opens with workforce
  coverage and people-service attention signals before showing route links;
- reworked `src/app/(dashboard)/attendance/page.tsx` so Attendance now starts
  with monthly punch rhythm, leave outcomes, and approval/reporting pressure;
- reworked `src/app/(dashboard)/ams/page.tsx` so AMS now leads with appraisal
  workload visuals before the action-lane cards;
- reworked `src/modules/performance/components/lms-view.tsx` so LMS now opens
  with learning pipeline and category mix insights before the full catalogue;
- reworked `src/modules/freight-forwarding/components/freight-forwarding-workspace-client.tsx`
  so Freight Forwarding home and registries now surface booking completeness
  and processing posture before the tables;
- reworked `src/app/(dashboard)/hrms/recruit/page.tsx` so Recruit now behaves
  like a real employer/career dashboard using live hiring and private jobseeker
  counts instead of only workspace cards;
- reworked `src/app/(dashboard)/admin/page.tsx` so Admin now opens with
  governance and policy signals before the administration link grid;
- added a lighter dashboard-focused hierarchy improvement to
  `src/app/(dashboard)/accounting/page.tsx`;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` after the dashboard batch.

Verification on Friday, August 7, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint ...` over the
  touched dashboard/component files: passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed the route inventory;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and refreshed the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the long-standing baseline that `src/components/monolith`
  contains legacy non-barrel production files; this dashboard batch did not
  introduce that condition.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  dashboard rework is source-verified and static-check-verified rather than
  manually browser-verified across Light, Night, and Violet themes;
- some module home routes such as `CHA`, `Communication`, and `CRM` already had
  stronger operational dashboards and were therefore only lightly touched or
  left structurally intact in this batch;
- the repository still contains unrelated user/worktree changes outside this
  dashboard pass and they were intentionally preserved.

## 2026-08-07 Shared button theme normalization

Normalized the shared Monolith button system so action buttons stay visually
consistent across light/dark theme changes and accent swaps without changing
page logic or route structure.

Delivered:

- updated `src/styles/monolith-system.css` so the shared `.mnx-button`
  foundation now uses Frappe token-driven surface, border, foreground, and
  disabled states instead of older mixed gradient/shadow assumptions;
- rebuilt the shared button variants
  (`.mnx-button-primary`, `.mnx-button-accent`, `.mnx-button-secondary`,
  `.mnx-button-outline`, `.mnx-button-ghost`, `.mnx-button-destructive`) to
  use quieter Frappe-style primary, soft, neutral, outline, and semantic
  danger treatments with correct hover/active parity in both light and dark
  themes;
- aligned shared filter-pill buttons (`.mnx-filter-button`, `.filter-button`)
  with the same token system so toolbar actions such as filter/export controls
  no longer drift into mismatched backgrounds or unreadable counter pills;
- normalized shared icon action buttons
  (`.mnx-icon-button`, `.mnx-icon-button-dark`, `.mnx-icon-button-danger`) so
  compact controls now share the same theme-safe contrast model as the main
  button family.

Verification on Friday, August 7, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed.

Known limits:

- this batch intentionally fixed the shared production button contract first,
  which improves the majority of Monolith actions immediately, but some
  route-local raw `button` and `Link` implementations with direct utility color
  classes still remain in non-compliant routes and should be migrated to the
  canonical button primitives in follow-up work;
- no authenticated browser runtime is attached in this Codex session, so the
  updated button states are source-verified and static-check-verified rather
  than manually checked across every route family.

## 2026-08-07 Frappe-inspired shared theme foundation

Rebased the shared Monolith presentation layer onto a Frappe-inspired token
system so the product now trends toward the quieter Frappe UI / Espresso feel
 without changing route structure, business logic, or data flow.

Delivered:

- added `frappe_docker/design/frappe-ui-design-system.css` as the new shared
  source-of-truth token file for light/dark theme surfaces, restrained accent
  palettes (`blue`, `green`, `amber`, `violet`), semantic status colors,
  compact spacing, radii, typography, focus rings, and elevation;
- rewrote `src/styles/monolith-tokens.css` to map the existing `--mn-*`
  semantic contract onto the new `--frappe-*` variables instead of keeping the
  older decorative Monolith palette and gradients;
- updated `src/app/globals.css` and `src/app/layout.tsx` so the Frappe token
  file is imported globally, the app root is wrapped with the `frappe-ui`
  class, and the initial document script now normalizes legacy persisted
  `light` / `night` / `violet` theme values into the new
  `data-theme="light|dark"` and `data-accent="blue|green|amber|violet"`
  document attributes;
- updated `src/modules/core/components/monolith-app-shell.tsx` so the
  authenticated shell theme provider now persists the normalized light/dark
  theme plus accent choice, while preserving compatibility with older saved
  theme values;
- refreshed the canonical shared shell and primitive styling in
  `src/styles/monolith-system.css` so navigation, topbar, buttons, inputs,
  selects, cards, page headers, tables, dialogs, floating menus, and the
  command palette now use denser spacing, softer radii, quieter surfaces, and
  accent-driven active states instead of the previous glossy/high-motion look;
- removed repeated hardcoded dropdown spacing/radius utility values in
  `src/components/ui/dropdown-menu.tsx` by routing the menu chrome through
  shared Monolith/Frappe-aware CSS hooks instead;
- updated the customer portal theme control usage in
  `src/modules/customer-portal/components/client-actions.tsx` so it now uses
  the normalized `light` / `dark` theme options rather than the older
  `night` / `violet` theme identifiers;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` for this styling batch.

Verification on Friday, August 7, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed the route inventory;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and refreshed the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint ...` over the
  touched UI files passed for code-bearing files; CSS files were reported as
  ignored by the current ESLint configuration rather than failing lint.

Known limits:

- `npm run architecture:check` still fails on the long-standing repository
  baseline that `src/components/monolith` contains many non-barrel production
  files; this pass did not introduce that ownership condition;
- `npm run build` is currently blocked by an already-running `next build`
  process in the environment, so this batch is type-verified and
  design-system-verified but not freshly build-verified in this session;
- no authenticated browser runtime is attached in this Codex session, so the
  new Frappe-style light/dark/accent presentation is source-verified and
  static-check-verified rather than manually browser-checked across desktop,
  tablet, and mobile;
- substantial legacy styling still exists in module-specific stylesheets and
  `src/styles/legacy-compatibility.css`, even though the shared shell and
  canonical primitives now inherit the new Frappe-oriented foundation.

## 2026-08-06 CRM to Freight/CHA process handoff flow

Replaced the placeholder Freight Forwarding and CHA `Process` routes with a
real queue-first operational handoff flow from CRM quotations.

Delivered:

- updated `src/modules/crm/approval-workflow.ts` and
  `src/modules/crm/approval-actions.ts` so quotation `Create Booking` now
  queues Freight and CHA work into `PROCESSING_PENDING`, and each module now
  has a dedicated completion action that writes back the real Freight booking
  or CHA job only after processing starts from its `Process` route;
- added `src/modules/crm/quote-process.ts`-driven process queue pages at
  `src/app/(dashboard)/freight-forwarding/process/page.tsx` and
  `src/app/(dashboard)/cha/process/page.tsx` so both modules now show
  quote-only handoff data instead of creating downstream records immediately;
- added detail routes at
  `src/app/(dashboard)/freight-forwarding/process/[quoteId]/page.tsx` and
  `src/app/(dashboard)/cha/process/[quoteId]/page.tsx` so teams open the quote
  from the process queue, choose transaction mode or create the CHA job there,
  and complete the downstream record from that dedicated process surface;
- updated
  `src/modules/freight-forwarding/components/freight-forwarding-create-booking-client.tsx`
  so the Freight create-booking page can run in a process-completion mode with
  quote-prefilled values, a custom title, custom back link, and final
  redirection into the created transaction;
- updated `src/modules/cha/components/create-job-dialog.tsx` and
  `src/app/(dashboard)/cha/jobs/new/new-job-client.tsx` so the page-form CHA
  job creation flow accepts quote-prefilled defaults and can report the created
  job back into the CRM quotation handoff;
- updated `src/modules/crm/components/ApprovalActionBar.tsx` so quotations in
  `BOOKING_CREATED` open the dedicated Freight or CHA process page while the
  record is still waiting in the process queue;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` so the process queue and
  detail routes are reflected in the current migration inventory.

Verification on Thursday, August 6, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed the route matrix for the new process detail routes;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed.

Known limits:

- focused ESLint still fails if `src/modules/cha/components/create-job-dialog.tsx`
  is included because that long-lived file already carries pre-existing
  `react-hooks/set-state-in-effect` and `@typescript-eslint/no-explicit-any`
  violations outside this process-handoff change;
- no authenticated browser runtime is attached in this Codex session, so the
  new queue pages and process detail flows are source-verified and
  type-verified rather than manually browser-verified in Light, Night, and
  Violet themes.

## 2026-08-06 Freight Forwarding and CHA process routes

Added dedicated empty `Process` pages for both Freight Forwarding and CHA so
each module now has a stable route ready for future workflow implementation.

Delivered:

- added `src/app/(dashboard)/freight-forwarding/process/page.tsx` as a
  tokenized Freight Forwarding workspace page with a canonical header, section,
  panel, and empty state;
- added `src/app/(dashboard)/cha/process/page.tsx` as a CHA workspace route
  with the shared CHA route header contract and an empty-state section;
- updated `src/lib/navigation.ts` so both modules expose `Process` in their
  sidebar navigation;
- updated `src/lib/route-labels.ts`,
  `src/modules/cha/components/workspace/cha-workspace.tsx`, and
  `src/modules/cha/components/workspace/cha-workspace.test.tsx` so the new CHA
  route has the correct label and route metadata;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` so both new routes are
  reflected in the current migration inventory.

Verification on Thursday, August 6, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/cha/process/page.tsx' 'src/app/(dashboard)/freight-forwarding/process/page.tsx' 'src/lib/navigation.ts' 'src/lib/route-labels.ts' 'src/modules/cha/components/workspace/cha-workspace.tsx' 'src/modules/cha/components/workspace/cha-workspace.test.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed the route matrix with the new process routes;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  new pages are source-verified and type-verified rather than manually checked
  in Light, Night, and Violet themes.

## 2026-08-05 CHA dedicated new-job page

Replaced the popup-first CHA job creation entry points with a dedicated
`/cha/jobs/new` route while keeping the existing create-job form logic as the
single source of truth.

Delivered:

- added `src/app/(dashboard)/cha/jobs/new/page.tsx` and
  `src/app/(dashboard)/cha/jobs/new/new-job-client.tsx` so CHA now has a real
  create-job workspace route with a route header and back-to-jobs action;
- updated `src/modules/cha/components/create-job-dialog.tsx` so the existing
  CHA create-job implementation can render either as the original modal or as a
  full-page surface, preserving the existing form fields, job-type/shipment-type
  creation helpers, draft restore behavior, and server action integration;
- updated `src/modules/cha/components/dashboard-create-job.tsx`,
  `src/app/(dashboard)/cha/page.tsx`, and
  `src/app/(dashboard)/cha/jobs/jobs-client.tsx` so the Dashboard and Jobs
  `New Job` actions now navigate to `/cha/jobs/new` instead of opening the
  popup;
- updated `src/app/(dashboard)/cha/jobs/page.tsx` so legacy
  `/cha/jobs?new=true` requests redirect into `/cha/jobs/new`, preserving old
  deep links and customer-create return flows;
- updated CHA route metadata and breadcrumb labels in
  `src/modules/cha/components/workspace/cha-workspace.tsx`,
  `src/modules/cha/components/workspace/cha-workspace.test.tsx`, and
  `src/lib/route-labels.ts`;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` so the new
  `/cha/jobs/new` route is recorded in the route inventory.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/cha/page.tsx' 'src/app/(dashboard)/cha/jobs/page.tsx' 'src/app/(dashboard)/cha/jobs/jobs-client.tsx' 'src/app/(dashboard)/cha/jobs/new/page.tsx' 'src/app/(dashboard)/cha/jobs/new/new-job-client.tsx' 'src/modules/cha/components/dashboard-create-job.tsx' 'src/modules/cha/components/workspace/cha-workspace.tsx' 'src/modules/cha/components/workspace/cha-workspace.test.tsx' 'src/lib/route-labels.ts'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed the route matrix with the new `/cha/jobs/new` page;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed.

Known limits:

- focused ESLint still fails if `src/modules/cha/components/create-job-dialog.tsx`
  is included because that long-lived file already carries pre-existing
  `react-hooks/set-state-in-effect` and `@typescript-eslint/no-explicit-any`
  violations outside this routing change;
- no authenticated browser runtime is attached in this Codex session, so the
  new page flow is source-verified and type-verified rather than manually
  browser-verified in Light, Night, and Violet themes.

## 2026-08-05 CRM quotation create-booking operational handoff fix

Fixed the broken CRM quotation `Create Booking` flow so a customer-approved
quotation now launches real downstream operational records instead of only
writing a freight placeholder reference.

Delivered:

- updated `src/modules/crm/approval-workflow.ts` so quote conversion now
  creates a real Freight Forwarding `FREIGHT_BOOKING` draft transaction with
  prefilled customer, enquiry/job reference, port, Incoterm, commodity, and
  internal handoff notes;
- preserved the existing CHA job creation path and now store direct Freight
  transaction linkage (`freightTransactionId` and `freightBookingGroupId`)
  beside the CHA job linkage in the quote workflow conversion snapshot;
- updated `src/modules/crm/components/quotes/lib/types.ts` so the quote
  workflow conversion contract exposes the direct Freight transaction and
  booking-group references;
- updated `src/modules/crm/components/ApprovalActionBar.tsx` so `Create
  Booking` first shows a routing summary dialog, then after conversion exposes
  direct `Process CHA Job` and `Process Freight Booking` actions;
- updated
  `src/modules/freight-forwarding/components/freight-forwarding-workspace-client.tsx`
  so Workspace Home and the transaction registries now expose explicit
  `Process` actions instead of passive text-only next-step hints;
- updated `src/app/(dashboard)/cha/jobs/jobs-client.tsx` so the CHA jobs
  register now exposes a direct `Process` action per row, matching the
  requested downstream workflow handoff more clearly.

Verification on Wednesday, August 5, 2026:

- pending focused ESLint for the touched CRM, Freight Forwarding, and CHA UI
  files in this session.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  repaired handoff is source-verified only and still needs manual browser
  verification in Light, Night, and Violet themes;
- the Freight Forwarding handoff currently creates a prefilled HBL-side draft
  transaction and opens the existing transaction detail page for continuation;
  it does not yet introduce the later dedicated post-conversion booking wizard
  the user plans to design.

## 2026-08-05 CRM quote detail submit action visibility

Kept the CRM quote detail submit action in the main toolbar so users can always
see where quote submission lives alongside the other top-row actions.

Delivered:

- updated `src/modules/crm/components/quotes/QuoteDetailsPage.tsx` so the
  `Submit For Approval` control now stays in the visible toolbar next to Edit,
  Mails, Share, and PDF/Print;
- updated the same header panel to allow visible overflow so the three-dot
  dropdown menu can render outside the toolbar card instead of being folded
  back into the panel bounds;
- updated `src/lib/rbac.ts` so the migrated CRM quote workflow permissions map
  back to the older seeded `crm.invoice.manage` grant, allowing current CRM
  users to submit draft quotes for approval without waiting for a role reseed;
- updated `src/app/(dashboard)/crm/quotes/[quoteId]/page.tsx` so the submit
  dialog manager dropdown now lists active org users with `Manager` and
  `Admin` roles, plus platform admins, instead of only the narrower approval
  permission lookup;
- updated `src/modules/crm/components/quotes/QuoteDetailsPage.tsx` so the
  quote header card adds extra bottom padding and a higher stacking context
  while the three-dot actions menu is open, keeping Delete and Workflow
  preferences fully visible;
- updated the same quote detail component so the left-rail filters now stay
  hidden until the quote-view dropdown is opened, and the collapsed rail uses
  a dedicated compact layout instead of the broken squeezed header state;
- preserved the existing CRM dialog and approval server action flow, but now
  disable the button instead of removing it when the quote is not a submittable
  draft or the current user lacks submit access.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/lib/rbac.ts' 'src/modules/crm/components/quotes/QuoteDetailsPage.tsx' 'src/app/(dashboard)/crm/quotes/[quoteId]/page.tsx'`:
  passed.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so this
  toolbar update is source-verified only and still needs manual browser
  verification in Light, Night, and Violet themes.

## 2026-08-05 CRM quote detail logistics section

Added the missing logistics summary block to the CRM quote details workspace so
users can see the shipping context recorded during quote creation without going
back into edit mode.

Delivered:

- updated `src/app/(dashboard)/crm/quotes/[quoteId]/page.tsx` so the detail
  serializer now forwards `portOfLoadingCountry` and
  `portOfDestinationCountry` in addition to the existing logistics fields;
- updated `src/modules/crm/components/quotes/lib/types.ts` so the quote detail
  contract includes the full logistics shape used by the detail view;
- updated `src/modules/crm/components/quotes/QuoteDetailsPage.tsx` so the
  page renders a dedicated `Logistics Details` card with port, country,
  Incoterm, container, commodity, and weight values using the existing shared
  detail-card treatment.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/crm/quotes/[quoteId]/page.tsx' 'src/modules/crm/components/quotes/QuoteDetailsPage.tsx' 'src/modules/crm/components/quotes/lib/types.ts'`:
  passed.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  logistics section is source-verified and lint-verified rather than manually
  browser-verified in Light, Night, and Violet themes.

## 2026-08-05 CRM quote detail layout fix

Refined the CRM quote detail presentation so the route behaves like a normal
Monolith CRM workspace instead of rendering a second full-screen shell inside
the existing page frame.

Delivered:

- updated `src/modules/crm/components/quotes/QuoteDetailsPage.tsx` so the page
  now uses a contained two-column workspace layout instead of nested
  `min-h-screen` shells;
- moved the left-side quote register onto a standard CRM panel treatment and
  replaced the vertical collapsed `QUOTE LIST` label with a compact horizontal
  state that no longer reads like a broken UI;
- softened the quote detail header scale and spacing so the title, status, and
  total sit inside a shared CRM surface rather than a custom route-wide chrome;
- converted the major quote detail sections to shared CRM composition patterns,
  so versioning, workflow, summary panels, and the detail/activity workspace
  now flow through `CrmSection`, `CrmPanel`, and shared CRM status surfaces;
- replaced the raw manager approval `<select>` with `CrmSelect` to keep the
  submission dialog on the shared CRM form-control contract.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/crm/components/quotes/QuoteDetailsPage.tsx'`:
  passed.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  quote detail fix is source-verified and lint-verified rather than manually
  browser-verified in Light, Night, and Violet themes.

## 2026-08-05 Accounting quotations workspace redesign

Reworked the Accounting quotations route into a cleaner split workspace that
keeps the quotation register and selected quotation detail in one place while
preserving the existing quotation and note workflows.

Delivered:

- updated `src/app/(dashboard)/accounting/quotations/page.tsx` so the route now
  resolves an active quotation from `?quote=` and loads the permission-aware
  quotation detail payload needed for embedded actions;
- added `src/app/(dashboard)/accounting/quotations/quotation-presentation.ts`
  to share the serialized quotation presentation shape between the embedded
  workspace detail and the standalone quotation detail route;
- rewrote `src/app/(dashboard)/accounting/quotations/quotations-client.tsx`
  into a register-plus-detail workspace with a searchable left-side quotation
  list, a cleaner selected quotation summary surface, and the existing note
  management flow still available on the same route;
- refreshed
  `src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx`
  so the detail surface now supports both the standalone route and the
  embedded quotations workspace while continuing to use the existing Accounting
  approval, dispatch, decision, duplication, and conversion actions;
- updated `src/app/(dashboard)/accounting/quotations/[id]/page.tsx` so the
  standalone detail route shares the same serialized quotation presentation and
  now requests the quotation-create capability required for duplication;
- added the quotations workspace layout styles to
  `src/styles/modules/accounting.css` using Accounting module tokens and
  canonical Monolith surfaces instead of route-local ad hoc styling;
- updated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md` with the current source
  verification status for this quotations batch.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/accounting/quotations/page.tsx' 'src/app/(dashboard)/accounting/quotations/quotations-client.tsx' 'src/app/(dashboard)/accounting/quotations/quotation-presentation.ts' 'src/app/(dashboard)/accounting/quotations/[id]/page.tsx' 'src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed in this session;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/app/(dashboard)/accounting/quotations/page.tsx' 'src/app/(dashboard)/accounting/quotations/quotations-client.tsx' 'src/app/(dashboard)/accounting/quotations/quotation-presentation.ts' 'src/app/(dashboard)/accounting/quotations/[id]/page.tsx' 'src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx' 'src/styles/modules/accounting.css'`:
  passed, aside from normal Windows line-ending warnings in this worktree.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  redesigned quotations workspace is source-verified and lint/typecheck-verified
  rather than manually browser-verified in Light, Night, and Violet themes;
- the new quotations workspace intentionally prioritizes the important
  quotation actions and keeps less-frequent note work under the existing
  secondary tab instead of duplicating every note action into the split detail
  surface.

## 2026-08-05 Shared document dropzone and Freight Forwarding attachment panel

Added a new shared document-upload dropzone and applied it to the Freight
Forwarding Reference document panel.

Delivered:

- added `src/components/forms/file-upload/document-dropzone-field.tsx` as a
  new shared Monolith upload surface with drag-and-drop, browse, and selected
  file preview support;
- exported the component through `src/components/monolith/index.ts` and added a
  live specimen to `src/components/monolith/catalogue/shared-catalogue.tsx`;
- added the shared dropzone styling to `src/styles/monolith-system.css` using
  Monolith tokens and the existing yellow highlight gradient language;
- updated
  `src/modules/freight-forwarding/components/freight-forwarding-booking-page.tsx`
  so the Reference document panel now uses the shared dropzone in place of the
  raw browser file input while keeping the Attachment name field above it;
- added the Freight Forwarding layout hook for the new dropzone in
  `src/styles/modules/freight-forwarding.css`.

Verification on Wednesday, August 5, 2026:

- pending focused ESLint, TypeScript, design-system verification, and targeted
  `git diff --check` after the component and Freight Forwarding integration
  patch in this session.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  new dropzone is source-verified and still needs manual browser verification
  in Light, Night, and Violet themes;
- the Freight Forwarding Reference document panel still treats the selected
  file as local client state only because the booking attachment upload
  backend is not yet wired.

## 2026-08-05 Freight Forwarding dedicated create-booking page

Replaced the popup-first Freight Forwarding booking start with a dedicated
create-booking page that lets users choose MBL, HBL, or both and fill the
matching transaction details before records are created.

Delivered:

- rewrote `src/app/(dashboard)/freight-forwarding/create-booking/page.tsx` so
  `/freight-forwarding/create-booking` is now a real workspace route instead of
  an automatic redirect, with server-loaded Freight Forwarding reference data
  and optional `?mode=` preselection;
- updated `src/app/(dashboard)/freight-forwarding/create-booking/[documentType]/page.tsx`
  so legacy `/create-booking/mbl` and `/create-booking/hbl` entry points now
  redirect into the new dedicated page with the correct transaction mode;
- added
  `src/modules/freight-forwarding/components/freight-forwarding-create-booking-client.tsx`
  as the new page client that keeps transaction mode selection on-page and
  renders MBL, HBL, or both transaction-detail forms in one workflow;
- extended
  `src/modules/freight-forwarding/components/freight-forwarding-booking-page.tsx`
  so the shared Freight Forwarding form can be reused as an embedded
  create-booking editor without its own standalone header or save action;
- added `createFreightBookingWithDetailsAction` in
  `src/modules/freight-forwarding/actions.ts` so the dedicated page can create
  fully populated MBL/HBL transaction records directly instead of first
  creating empty drafts from the older modal flow;
- updated `src/modules/freight-forwarding/components/freight-forwarding-workspace.tsx`,
  `src/modules/freight-forwarding/components/freight-forwarding-workspace-client.tsx`,
  and `src/app/(dashboard)/freight-forwarding/settings/page.tsx` so every
  Freight Forwarding `Create Booking` entry point now opens the dedicated page
  instead of the previous popup-based start path;
- updated `src/styles/modules/freight-forwarding.css` with dedicated layout
  styling for the new mode selector and stacked create-booking transaction
  sections;
- updated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md` with the current source
  verification status for this create-booking batch.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/freight-forwarding/create-booking/page.tsx' 'src/app/(dashboard)/freight-forwarding/create-booking/[documentType]/page.tsx' 'src/app/(dashboard)/freight-forwarding/settings/page.tsx' 'src/modules/freight-forwarding/actions.ts' 'src/modules/freight-forwarding/service.ts' 'src/modules/freight-forwarding/components/freight-forwarding-booking-page.tsx' 'src/modules/freight-forwarding/components/freight-forwarding-create-booking-client.tsx' 'src/modules/freight-forwarding/components/freight-forwarding-workspace.tsx' 'src/modules/freight-forwarding/components/freight-forwarding-workspace-client.tsx' 'src/modules/freight-forwarding/components/index.ts'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  still fails on the repo's existing
  `src/modules/crm/components/masters/crm-masters-workspace.tsx` errors where
  `"xl"` is not assignable to `WorkspaceDialogSize`; those failures predate
  this Freight Forwarding batch;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  still fails on the repo's existing unregistered visual export
  `src/components/ui/button.tsx#ButtonLink`, which predates this batch;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/app/(dashboard)/freight-forwarding/create-booking/page.tsx' 'src/app/(dashboard)/freight-forwarding/create-booking/[documentType]/page.tsx' 'src/app/(dashboard)/freight-forwarding/settings/page.tsx' 'src/modules/freight-forwarding/actions.ts' 'src/modules/freight-forwarding/service.ts' 'src/modules/freight-forwarding/components/freight-forwarding-booking-page.tsx' 'src/modules/freight-forwarding/components/freight-forwarding-create-booking-client.tsx' 'src/modules/freight-forwarding/components/freight-forwarding-workspace.tsx' 'src/modules/freight-forwarding/components/freight-forwarding-workspace-client.tsx' 'src/modules/freight-forwarding/components/index.ts' 'src/styles/modules/freight-forwarding.css'`:
  passed, aside from normal Windows line-ending warnings in this worktree.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  new dedicated create-booking route is source-verified and lint-verified
  rather than manually browser-verified in Light, Night, and Violet themes;
- the current create-booking page now creates fully populated draft
  transactions, but it does not yet add new field-level validation beyond the
  existing form-control constraints already present in the shared Freight
  Forwarding booking form.

## 2026-08-05 Freight Forwarding data cleanup route

Added a dedicated Freight Forwarding settings sub-route for data management and
an admin-only delete-all action for Freight Forwarding records.

Delivered:

- added `src/app/(dashboard)/freight-forwarding/settings/data/page.tsx` as a
  `Data management` workspace under Freight Forwarding settings, with live
  transaction, booking-group, and MBL/HBL split counts;
- added
  `src/app/(dashboard)/freight-forwarding/settings/data/delete-freight-forwarding-data-action.tsx`
  for the client-side destructive action flow with a required confirmation
  phrase of `DELETE ALL FREIGHT DATA`;
- added `deleteAllFreightForwardingDataAction` in
  `src/modules/freight-forwarding/actions.ts` so the purge deletes all
  `FREIGHT_BOOKING` transactions for the current organisation plus their
  linked `crmApprovalLog` records, then revalidates the Freight Forwarding
  workspace, register, settings, and booking routes;
- updated `src/app/(dashboard)/freight-forwarding/settings/page.tsx` so the
  main Freight Forwarding settings page now links to the new `Data` route;
- updated `src/lib/route-labels.ts` and regenerated
  `docs/ui-route-audit.md`, `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`, and
  `docs/ui-component-and-style-ownership-audit.md` so the new route is
  reflected in the route inventory.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/freight-forwarding/actions.ts' 'src/app/(dashboard)/freight-forwarding/settings/page.tsx' 'src/app/(dashboard)/freight-forwarding/settings/data/page.tsx' 'src/app/(dashboard)/freight-forwarding/settings/data/delete-freight-forwarding-data-action.tsx' 'src/lib/route-labels.ts'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed the migration matrix with the new
  `/freight-forwarding/settings/data` route;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/modules/freight-forwarding/actions.ts' 'src/app/(dashboard)/freight-forwarding/settings/page.tsx' 'src/app/(dashboard)/freight-forwarding/settings/data/page.tsx' 'src/app/(dashboard)/freight-forwarding/settings/data/delete-freight-forwarding-data-action.tsx' 'src/lib/route-labels.ts'`:
  passed, aside from normal Windows line-ending warnings in this worktree.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  new Freight Forwarding data route is source-verified and lint-verified
  rather than browser-verified across Light, Night, and Violet themes;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`
  still fails on pre-existing repo compile errors outside this page batch,
  including:
  `src/modules/crm/components/masters/crm-masters-workspace.tsx` dialog-size
  `"xl"` issues,
  `src/modules/freight-forwarding/components/freight-forwarding-booking-page.tsx`
  `ContainerRow` resolution,
  and existing `freight-forwarding-workspace-client.tsx` symbol and button
  variant errors;
- the delete-all action is intentionally restricted to users who satisfy
  `admin.org.manage`, so non-admin Freight Forwarding users can review the
  counts on the page but cannot run the destructive purge.

## 2026-08-05 Module settings route expansion

Added first-class settings routes for modules that previously exposed
operational workspaces without a dedicated settings destination.

Delivered:

- added `src/app/(dashboard)/attendance/settings/page.tsx` with an Attendance
  settings workspace that links into attendance controls for overtime,
  leave-management, biometric sync, and month-end reporting;
- added `src/app/(dashboard)/ams/settings/page.tsx` and
  `src/app/(dashboard)/lms/settings/page.tsx` so the Performance/Learning
  workspace now includes dedicated settings overviews for appraisal governance
  and learning-program administration;
- added `src/app/(dashboard)/crm/settings/page.tsx` and
  `src/app/(dashboard)/freight-forwarding/settings/page.tsx` so CRM and
  Freight Forwarding now expose settings workspaces tied to their existing
  operational control surfaces;
- updated `src/lib/navigation.ts`, `src/lib/route-labels.ts`,
  `src/modules/people/components/people-workspace.tsx`,
  `src/modules/performance/components/performance-workspace.tsx`, and
  `src/modules/crm/components/workspace/crm-workspace.tsx` so the new routes
  appear as native module destinations with the correct header metadata and
  sidebar labels;
- regenerated `docs/ui-route-audit.md`,
  `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`, and
  `docs/ui-component-and-style-ownership-audit.md` after the route inventory
  changed.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/attendance/settings/page.tsx' 'src/app/(dashboard)/ams/settings/page.tsx' 'src/app/(dashboard)/lms/settings/page.tsx' 'src/app/(dashboard)/crm/settings/page.tsx' 'src/app/(dashboard)/freight-forwarding/settings/page.tsx' 'src/lib/navigation.ts' 'src/lib/route-labels.ts' 'src/modules/people/components/people-workspace.tsx' 'src/modules/performance/components/performance-workspace.tsx' 'src/modules/crm/components/workspace/crm-workspace.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed the migration matrix with the new settings routes;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/app/(dashboard)/attendance/settings/page.tsx' 'src/app/(dashboard)/ams/settings/page.tsx' 'src/app/(dashboard)/lms/settings/page.tsx' 'src/app/(dashboard)/crm/settings/page.tsx' 'src/app/(dashboard)/freight-forwarding/settings/page.tsx' 'src/lib/navigation.ts' 'src/lib/route-labels.ts' 'src/modules/people/components/people-workspace.tsx' 'src/modules/performance/components/performance-workspace.tsx' 'src/modules/crm/components/workspace/crm-workspace.tsx'`:
  passed, aside from normal Windows line-ending warnings in this worktree.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  new settings routes are source-verified and lint-verified rather than
  browser-verified across Light, Night, and Violet themes;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`
  still fails on the repo's existing
  `src/modules/crm/components/masters/crm-masters-workspace.tsx` errors where
  `"xl"` is not assignable to `WorkspaceDialogSize`; those failures predate
  this batch and were left unchanged here;
- the regenerated static audit still classifies the new AMS, LMS, CRM, and
  Freight Forwarding settings routes as non-compliant heuristically, so those
  routes still need manual runtime review and any follow-up component-audit
  reconciliation if the team wants the static classification fully aligned.

## 2026-08-05 Freight Forwarding transaction detail spacing regression

Adjusted the embedded Freight Forwarding transaction detail surface so it keeps
the intended panel padding without oversizing the shared form controls.

Delivered:

- updated `src/styles/modules/freight-forwarding.css` so
  `.ff-booking-content-embedded` uses a roomier embedded-only wrapper padding;
- removed the embedded detail override that was increasing
  `.mnx-field-control` and `.mnx-field-textarea` padding beyond the canonical
  Monolith field height;
- added embedded-only panel-body padding selectors for the Freight Forwarding
  detail surface so section content sits correctly inside each panel while the
  standalone `/freight-forwarding/create-booking` route is unchanged.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/styles/modules/freight-forwarding.css'`:
  passed.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  updated Freight Forwarding detail spacing is source-verified and still needs
  manual browser verification in Light, Night, and Violet themes.

## 2026-08-05 Freight Forwarding transaction field padding

Increased the internal padding of the form controls on the embedded Freight
Forwarding transaction details page so the detail editor fields read more
comfortably.

Delivered:

- updated `src/styles/modules/freight-forwarding.css` so the embedded
  transaction-detail variant applies larger padding to
  `.mnx-field-control` and `.mnx-field-textarea`;
- kept the padding override scoped to `.ff-booking-page-embedded` so the
  standalone create-booking route is unchanged.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/styles/modules/freight-forwarding.css' 'docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md' 'docs/ui-migration-handoff.md'`:
  passed, aside from normal Windows line-ending warnings in this worktree.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  updated field padding is source-verified and still needs manual browser
  verification in Light, Night, and Violet themes.

## 2026-08-05 Freight Forwarding transaction detail design-system polish

Adjusted the embedded Freight Forwarding transaction detail editor so it reads
more like a Monolith detail surface and less like the full create-booking page.

Delivered:

- updated `src/modules/freight-forwarding/components/freight-forwarding-booking-page.tsx`
  so the embedded transaction-detail variant now applies dedicated wrapper
  classes instead of sharing the exact same presentation hooks as the
  standalone create-booking page;
- updated `src/styles/modules/freight-forwarding.css` so the embedded detail
  variant gets extra padding around the details content and lighter-weight
  section, panel, and field-label typography.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/freight-forwarding/components/freight-forwarding-booking-page.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/styles/modules/freight-forwarding.css'`:
  returns the repo's existing "File ignored because no matching configuration
  was supplied" warning, so the stylesheet is not directly linted by the
  current ESLint setup;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/modules/freight-forwarding/components/freight-forwarding-booking-page.tsx' 'src/styles/modules/freight-forwarding.css' 'docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md' 'docs/ui-migration-handoff.md'`:
  passed, aside from normal Windows line-ending warnings in this worktree.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  updated transaction details page is source-verified and still needs manual
  browser verification in Light, Night, and Violet themes.

## 2026-08-05 Freight Forwarding dual-detail switch

Added an in-page switch on the dedicated Freight Forwarding transaction detail
screens so bookings created with both MBL and HBL can move between the linked
detail views without going back to the register.

Delivered:

- updated `src/modules/freight-forwarding/components/freight-forwarding-transaction-detail-client.tsx`
  so the shared detail shell now resolves the current booking group and shows
  `MBL Details` and `HBL Details` actions only when the booking mode is
  `BOTH` and both linked transactions exist;
- kept MBL-only and HBL-only transactions unchanged, so one-sided bookings do
  not render the new detail switch.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/freight-forwarding/components/freight-forwarding-transaction-detail-client.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/modules/freight-forwarding/components/freight-forwarding-transaction-detail-client.tsx' 'docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md' 'docs/ui-migration-handoff.md'`:
  passed, aside from normal Windows line-ending warnings in this worktree.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  new switch is source-verified and will need manual browser verification in
  Light, Night, and Violet themes.

## 2026-08-05 Freight Forwarding workspace data-table alignment

Aligned the Freight Forwarding workspace booking registers to the production
operational data-table system so the Home, MBL, and HBL lists now use the same
Monolith table language as other operational workspaces.

Delivered:

- updated
  `src/modules/freight-forwarding/components/freight-forwarding-workspace-client.tsx`
  so Workspace Home now renders booking groups with
  `OperationalDataTable`, `OperationalTable`, `OperationalPrimaryCell`,
  `OperationalStatus`, and `OperationalLinkedRow` instead of a custom stacked
  button list;
- updated the same client so the MBL and HBL registry tabs now use the same
  operational table primitives for transaction number, customer, booking link,
  status, and last-updated metadata;
- removed the Freight Forwarding module CSS that only supported the older
  custom booking-list/table presentation and kept the create-booking dialog on
  a narrowly-scoped module-owned style hook.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/freight-forwarding/components/freight-forwarding-workspace-client.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/modules/freight-forwarding/components/freight-forwarding-workspace-client.tsx' 'src/styles/modules/freight-forwarding.css'`:
  passed.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  updated Freight Forwarding tables are source-verified and lint-verified
  rather than browser-verified across Light, Night, and Violet themes;
- this pass changes the booking-register presentation only and does not alter
  Freight Forwarding business logic, booking creation flow, or transaction
  detail routing.

## 2026-08-05 Freight Forwarding dedicated transaction detail pages

Moved Freight Forwarding transaction editing out of the MBL/HBL register pages
so the list views stay operational and the transaction form opens on its own
page.

Delivered:

- updated `src/modules/freight-forwarding/components/freight-forwarding-workspace-client.tsx`
  so the MBL and HBL sidebar tabs behave as transaction registers and open a
  dedicated route when a row is selected;
- added
  `src/modules/freight-forwarding/components/freight-forwarding-transaction-detail-client.tsx`
  as the shared transaction detail shell for viewing, saving, connecting, and
  disconnecting MBL/HBL records;
- added `src/app/(dashboard)/freight-forwarding/mbl/[transactionId]/page.tsx`
  and `src/app/(dashboard)/freight-forwarding/hbl/[transactionId]/page.tsx` so
  each transaction now has a dedicated view/update page;
- updated the freight forwarding route pages so the list screens only load the
  data needed for the register and no longer mount the booking editor inline at
  the bottom.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/freight-forwarding/components/freight-forwarding-workspace-client.tsx' 'src/modules/freight-forwarding/components/freight-forwarding-transaction-detail-client.tsx' 'src/modules/freight-forwarding/components/index.ts' 'src/app/(dashboard)/freight-forwarding/page.tsx' 'src/app/(dashboard)/freight-forwarding/mbl/page.tsx' 'src/app/(dashboard)/freight-forwarding/hbl/page.tsx' 'src/app/(dashboard)/freight-forwarding/mbl/[transactionId]/page.tsx' 'src/app/(dashboard)/freight-forwarding/hbl/[transactionId]/page.tsx'`:
  passed;

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  new Freight Forwarding detail-route flow is source-verified and lint-verified
  rather than browser-verified in Light, Night, and Violet themes;
- the separate request to restyle the Freight Forwarding booking registers to
  more closely match the CHA jobs table is not included in this specific pass.

## 2026-08-05 CRM Masters upload workflow expansion

Expanded the CRM Masters workspace from static placeholder tabs into a working
client-side master-register workflow for the non-item master tabs.

Delivered:

- rewrote `src/modules/crm/components/masters/crm-masters-workspace.tsx` so
  Agent, Charge, Port, State, Terminal, and Vessel masters now share one
  structured master-register flow instead of separate placeholder panels;
- added workbook parsing with `xlsx`, first-sheet ingestion, source-header
  discovery, and an explicit field-mapping dialog before import proceeds;
- added a live import-progress dialog with animated progress, rolling
  success/failed/skipped counts, row-level remarks, and a completion summary;
- persisted the latest client-side import run per master tab so users can still
  review counts and logs after closing the modal;
- added `Add Entry` for every structured master tab, with a single-entry dialog
  generated from the active master headings;
- kept `Item Master` on the existing dedicated item register while the other
  master tabs now use the new shared import/export/add-entry workflow;
- updated `src/styles/modules/crm.css` with dedicated Masters workflow styles
  for mapping, progress, result cards, logs, and single-entry form layouts.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/crm/components/masters/crm-masters-workspace.tsx'`:
  passed;
- targeted `git diff --check` for
  `src/modules/crm/components/masters/crm-masters-workspace.tsx` and
  `src/styles/modules/crm.css`:
  passed, aside from the normal Windows line-ending warnings in this worktree.

Known limits:

- this pass is fully client-side: imported records, logs, and single-entry
  additions live in browser state and are not yet persisted through a CRM API or
  database-backed master-data service;
- workbook parsing currently uses the first sheet only and assumes header-driven
  tabular data;
- there is no authenticated browser runtime attached in this Codex session, so
  the new import dialogs and progress animation are source-verified and
  lint-verified rather than browser-verified in Light, Night, and Violet themes.

## 2026-08-05 CRM quotation manager-customer approval workflow and destination conversion

Redesigned the CRM quotation detail experience and replaced the older generic
quote approval path with an explicit manager approval stage, customer decision
capture, and downstream booking/job conversion tracking.

Delivered:

- updated `src/modules/crm/approval-workflow.ts` and
  `src/modules/crm/approval-actions.ts` so CRM quotations now move through:
  `DRAFT` -> `PENDING_MANAGER_APPROVAL` -> `PENDING_CUSTOMER_APPROVAL` ->
  `CUSTOMER_APPROVED` -> `BOOKING_CREATED`, while both manager rejection and
  customer rejection return the record to `DRAFT` with structured remarks,
  actor, and timestamp metadata stored in the quotation snapshot;
- updated `src/app/(dashboard)/crm/quotes/[quoteId]/page.tsx`,
  `src/modules/crm/components/ApprovalActionBar.tsx`, and
  `src/modules/crm/components/quotes/QuoteDetailsPage.tsx` so the quotation
  detail page now shows clearer workflow sections for manager approval details,
  customer approval details, pending actions, notifications, audit summary, and
  booking/job conversion status, with only valid actions exposed for the
  current quotation state;
- updated quote status typing and filter data in
  `src/modules/crm/components/quotes/lib/types.ts`,
  `src/modules/crm/components/quotes/lib/quote-list-data.ts`, and
  `src/modules/crm/components/quotes/QuotesIndexPage.tsx` so the CRM quotation
  list now understands the new manager/customer approval states and booking
  conversion state instead of only the older generic labels;
- wired `Create Booking` for customer-approved quotations so Customs Clearance
  conversions create a real CHA job through the existing CHA service with
  generated CHA job numbers, while Freight Forwarding conversions create a
  persisted freight booking placeholder record inside the quotation snapshot;
- updated `src/app/(dashboard)/freight-forwarding/page.tsx` and
  `src/modules/freight-forwarding/components/freight-forwarding-workspace.tsx`
  so the Freight Forwarding module now lists those testing-phase converted
  booking placeholders and exposes a visible `Process Booking` action that is
  intentionally disabled until the dedicated Freight Forwarding booking form is
  implemented.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/crm/approval-workflow.ts' 'src/modules/crm/approval-actions.ts' 'src/app/(dashboard)/crm/quotes/[quoteId]/page.tsx' 'src/modules/crm/components/ApprovalActionBar.tsx' 'src/modules/crm/components/quotes/QuoteDetailsPage.tsx' 'src/modules/crm/components/quotes/QuotesIndexPage.tsx' 'src/modules/crm/components/quotes/lib/types.ts' 'src/modules/crm/components/quotes/lib/quote-list-data.ts' 'src/modules/freight-forwarding/components/freight-forwarding-workspace.tsx' 'src/app/(dashboard)/freight-forwarding/page.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/modules/crm/approval-workflow.ts' 'src/modules/crm/approval-actions.ts' 'src/app/(dashboard)/crm/quotes/[quoteId]/page.tsx' 'src/modules/crm/components/ApprovalActionBar.tsx' 'src/modules/crm/components/quotes/QuoteDetailsPage.tsx' 'src/modules/crm/components/quotes/QuotesIndexPage.tsx' 'src/modules/crm/components/quotes/lib/types.ts' 'src/modules/crm/components/quotes/lib/quote-list-data.ts' 'src/modules/freight-forwarding/components/freight-forwarding-workspace.tsx' 'src/app/(dashboard)/freight-forwarding/page.tsx'`:
  passed aside from the normal Windows CRLF warnings in this worktree.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  redesigned quotation detail route and the Freight Forwarding starter list are
  source-verified, lint-verified, and type-verified rather than manually
  browser-verified in Light, Night, and Violet themes;
- Freight Forwarding still does not have its final booking form or persisted
  operational booking model yet, so `Process Booking` is intentionally a
  visible disabled placeholder while the testing-phase booking list is derived
  from approved quotation conversion metadata;
- the older generic quote status values such as `PENDING_APPROVAL`,
  `APPROVED`, `SENT`, `CUSTOMER_VIEWED`, `ACCEPTED`, and `INVOICED` are still
  preserved in legacy helper paths for backward compatibility, but the updated
  quotation detail and index views normalize them into the new manager/customer
  workflow states.

## 2026-08-05 Freight forwarding booking workspace

Added a real Freight Forwarding booking route at
`/freight-forwarding/create-booking`, wired the existing `Create Booking`
workspace action to that route, and built the booking screen around canonical
Monolith workspace panels and form controls instead of a route-local visual
one-off.

Delivered:

- added `src/app/(dashboard)/freight-forwarding/create-booking/page.tsx` and
  `src/modules/freight-forwarding/components/freight-forwarding-booking-page.tsx`
  so the Freight Forwarding module now opens a booking worksheet that follows
  the provided PDF structure for shipment details, liner details, voyage
  details, party details, agent details, cargo/container details, attachments,
  and notes;
- added MBL and HBL side tabs in the booking workspace so users can switch the
  active bill-of-lading workflow while keeping the rest of the booking sheet in
  the same operational context;
- added `src/modules/freight-forwarding/booking-reference.ts` to centralize
  dropdown content built from existing in-repo references plus verified public
  shipping references for Incoterms, common container types, and freight-term
  labels;
- added `src/styles/modules/freight-forwarding.css` and imported it from
  `src/app/globals.css` so the new freight-forwarding layout has a dedicated
  module style owner instead of relying on compatibility CSS.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/freight-forwarding/booking-reference.ts' 'src/modules/freight-forwarding/components/freight-forwarding-booking-page.tsx' 'src/modules/freight-forwarding/components/freight-forwarding-workspace.tsx' 'src/app/(dashboard)/freight-forwarding/create-booking/page.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/modules/freight-forwarding/booking-reference.ts' 'src/modules/freight-forwarding/components/freight-forwarding-booking-page.tsx' 'src/modules/freight-forwarding/components/freight-forwarding-workspace.tsx' 'src/modules/freight-forwarding/components/index.ts' 'src/app/(dashboard)/freight-forwarding/create-booking/page.tsx' 'src/styles/modules/freight-forwarding.css' 'src/app/globals.css'`:
  passed aside from normal Windows CRLF warnings;
- full repo TypeScript verification could not be used as the success criterion
  for this batch because it is currently blocked by pre-existing CRM compile
  issues unrelated to the Freight Forwarding module, including missing
  `@/modules/crm/components/ApprovalActionBar` imports and existing
  `approval-workflow.ts` errors.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  new booking route is source-verified and lint-verified rather than
  browser-verified across Light, Night, and Violet themes;
- the `Create` action on the booking page is still intentionally non-persistent,
  because this pass focused on the route, layout, and field coverage requested
  from the PDF and did not introduce a new booking database workflow.

## 2026-08-05 CRM freight/customs split-rate quotation workflow

Split the CRM service-enquiry pricing flow so freight forwarding and customs
clearance rates are now managed as department-owned rate sets, and wired the
CRM quote flow to create versioned quotations from those rate sets instead of
overwriting the last quote in place.

Delivered:

- added `src/modules/crm/rate-workflow.ts` as a shared workflow helper for
  freight-only, customs-only, combined, and newly-added-only quote modes,
  including department submission tracking and quote-version lineage metadata;
- added
  `src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx`
  and replaced the duplicated inline worksheets in
  `src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx` and
  `src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx` so the active
  pricing UI now exposes only:
  `Ocean Freight`, `CFS Charges`, `VGM Charges`,
  `Customs Clearance Charges`, `DO Charges`, and `BL Charges`;
- updated the freight-forwarding and customs-clearance queue detail routes to
  pass department context into the shared enquiry detail client, so each queue
  can restrict rate entry to its own department while still showing pending and
  recreate-quotation states;
- updated `saveEnquiryRatesAction` in `src/modules/crm/actions.ts` so each
  department saves only its own rates, the merged enquiry snapshot is kept for
  compatibility, service-enquiry pricing snapshots are department-specific, and
  lead timeline events now identify which department updated rates;
- updated `src/app/(dashboard)/crm/quotes/new/page.tsx`,
  `src/modules/crm/components/quotes/NewQuotePage.tsx`, and
  `saveQuoteAction` so linked CRM quotes can be created in
  freight-only/customs-only/combined/newly-added-only modes and are now saved as
  `V1`, `V2`, `V3`, etc. using the existing CRM quote lineage fields
  `sourceQuotationId`, `sourceQuotationVersion`, `sourceQuotationNumber`, and
  `sourceQuotationSnapshot`;
- updated the CRM quote list and quote detail data loaders to show the latest
  visible version per quote family while also surfacing version history and root
  quote number information on the quote detail page.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/crm/rate-workflow.ts' 'src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx' 'src/app/(dashboard)/crm/quotes/new/page.tsx' 'src/modules/crm/components/quotes/NewQuotePage.tsx' 'src/app/(dashboard)/crm/quotes/page.tsx' 'src/modules/crm/components/quotes/lib/types.ts'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/modules/crm/rate-workflow.ts' 'src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx' 'src/modules/crm/actions.ts' 'src/modules/crm/service.ts' 'src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx' 'src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx' 'src/app/(dashboard)/crm/freight-forwarding/[serviceEnquiryId]/page.tsx' 'src/app/(dashboard)/crm/customs-clearance/[serviceEnquiryId]/page.tsx' 'src/app/(dashboard)/crm/quotes/new/page.tsx' 'src/modules/crm/components/quotes/NewQuotePage.tsx' 'src/app/(dashboard)/crm/quotes/page.tsx' 'src/app/(dashboard)/crm/quotes/[quoteId]/page.tsx' 'src/modules/crm/components/quotes/QuoteDetailsPage.tsx' 'src/modules/crm/components/quotes/lib/types.ts'`:
  passed aside from the normal worktree CRLF warnings on Windows.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the new
  split-rate tabs, recreate-quotation path, and version-history surfaces are
  source-verified and command-verified rather than browser-verified in Light,
  Night, and Violet themes;
- targeted ESLint still fails on several older CRM detail files such as
  `src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx`,
  `src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx`, and
  `src/app/(dashboard)/crm/quotes/[quoteId]/page.tsx` because those files carry
  pre-existing `@typescript-eslint/no-explicit-any` debt unrelated to this pass;
- this pass intentionally used the existing CRM quote lineage fields rather than
  adding a new database table, so full audit visibility is stored across version
  records plus `sourceQuotationSnapshot` metadata instead of a separate bespoke
  quotation-version entity.

## 2026-08-05 CRM quote form design-system alignment

Aligned the shared CRM quote creation and edit experience used by
`/crm/quotes/new` and `/crm/quotes/[quoteId]/edit` so the page now composes the
approved CRM workspace panels and shared Monolith actions instead of relying on
its older standalone quote-form chrome.

Delivered:

- updated `src/modules/crm/components/quotes/NewQuotePage.tsx` to remove the
  duplicate local route header, add a CRM workspace intro section, and wrap the
  form flow in shared `CrmSection`, `CrmPanel`, `CrmStatus`, and shared
  button-link actions;
- updated `src/modules/crm/components/quotes/CustomerSection.tsx`,
  `QuoteMetaSection.tsx`, and `ShippingDetailsSection.tsx` so each block now
  uses the canonical `WorkspacePanelHeader` treatment rather than raw section
  headings;
- updated `src/modules/crm/components/quotes/LineItemsTable.tsx`,
  `NotesAndTermsSection.tsx`, and `FixedActionBar.tsx` so the pricing table,
  customer-notes/totals area, and output actions follow shared Monolith panel
  headers and button variants more closely;
- relabeled the metadata `Reference#` field to `Enquiry Number` while
  preserving the existing field binding and quote-save behavior.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/crm/components/quotes/NewQuotePage.tsx' 'src/modules/crm/components/quotes/CustomerSection.tsx' 'src/modules/crm/components/quotes/QuoteMetaSection.tsx' 'src/modules/crm/components/quotes/ShippingDetailsSection.tsx' 'src/modules/crm/components/quotes/LineItemsTable.tsx' 'src/modules/crm/components/quotes/NotesAndTermsSection.tsx' 'src/modules/crm/components/quotes/FixedActionBar.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/modules/crm/components/quotes/NewQuotePage.tsx' 'src/modules/crm/components/quotes/CustomerSection.tsx' 'src/modules/crm/components/quotes/QuoteMetaSection.tsx' 'src/modules/crm/components/quotes/ShippingDetailsSection.tsx' 'src/modules/crm/components/quotes/LineItemsTable.tsx' 'src/modules/crm/components/quotes/NotesAndTermsSection.tsx' 'src/modules/crm/components/quotes/FixedActionBar.tsx'`:
  passed aside from the normal worktree CRLF warnings;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed `docs/ui-route-audit.md` plus
  `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and refreshed `docs/ui-component-and-style-ownership-audit.md`;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the pre-existing repository-wide code-organization guard that
  reports existing implementation files under `src/components/monolith`;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  still fails on the existing unregistered shared export
  `src/components/ui/button.tsx#ButtonLink`.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so this
  pass is source-verified and command-verified rather than browser-verified in
  Light, Night, and Violet themes across desktop, tablet, and mobile;
- this pass keeps the underlying CRM quote field structure, save flow, and
  approval behavior intact, so deeper route-local control implementations such
  as the custom quote combobox and item autocomplete remain for a later shared
  component extraction pass if needed.

## 2026-08-05 CRM Masters sidebar workspace addition

Added a new `Masters` entry to the shared CRM sidebar so users can open a
dedicated master-data workspace from the module navigation.

Delivered:

- updated `src/lib/navigation.ts` so the CRM section now exposes `/crm/masters`
  as a shared sidebar item using the authoritative navigation model;
- updated `src/modules/crm/components/workspace/crm-workspace.tsx` so
  `/crm/masters` renders first-class CRM route metadata instead of the generic
  fallback header copy;
- added `src/app/(dashboard)/crm/masters/page.tsx` and
  `src/modules/crm/components/masters/crm-masters-workspace.tsx` so the new
  sidebar entry now opens a dedicated CRM workspace with the master tabs,
  including a migrated `Item Master` tab alongside Agent Master, Charge
  Master, Port Master, State Master, Terminal Master, and Vessel Master;
- updated `src/app/(dashboard)/crm/items/page.tsx` to redirect the old
  standalone Items landing page into `/crm/masters?tab=item-master`, so the
  legacy entry point now resolves into the Masters workspace instead of keeping
  a separate top-level register;
- updated `src/lib/navigation.ts` so CRM no longer shows a separate sidebar
  `Items` entry once that register is represented under `Masters` as
  `Item Master`;
- updated `src/modules/crm/components/records/crm-workspace-page.tsx` so the
  catch-all CRM workspace page presents a specific `Masters` badge, summary,
  and description when that sidebar item is opened;
- added a regression assertion in `src/lib/navigation.test.ts` so the CRM
  sidebar model keeps the `Masters` workspace discoverable.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx vitest run src/lib/navigation.test.ts --reporter verbose`:
  blocked by the repository's guarded test bootstrap because
  `.env.staging.local` is not present in this session;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/lib/navigation.ts' 'src/lib/navigation.test.ts' 'src/modules/crm/components/workspace/crm-workspace.tsx' 'src/modules/crm/components/records/crm-workspace-page.tsx' 'src/app/(dashboard)/crm/masters/page.tsx' 'src/modules/crm/components/masters/crm-masters-workspace.tsx' 'src/modules/crm/components/workspace/crm-workspace.test.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed `docs/ui-route-audit.md` plus
  `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and refreshed `docs/ui-component-and-style-ownership-audit.md`;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  still fails on pre-existing unrelated CRM errors in
  `src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx`,
  `src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx`, and
  `src/modules/crm/actions.ts`.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so this
  navigation update is source-verified and lint-verified rather than
  browser-verified in Light, Night, and Violet themes;
- the new `Masters` tabs currently provide the dedicated CRM workspace shell and
  tab switching only for the newly added master areas; `Item Master` is the
  only tab in this pass that embeds an existing working register.

## 2026-08-05 CRM service-enquiry queue design-system alignment

Aligned the shared CRM service-enquiry queue surface used by
`/crm/freight-forwarding` and `/crm/customs-clearance` so the queue now uses
the approved operational table/header/button/input system instead of a
standalone CRM panel and raw table markup.

Delivered:

- updated `src/modules/crm/components/service-enquiries/service-enquiry-queue.tsx`
  to collapse the separate heading, search card, and list card into one shared
  `OperationalDataTable` composition;
- replaced the route-local search field and table shell with
  `OperationalDataTableHeader`, shared `Input`, shared button actions,
  `OperationalVisibleRecords`, `OperationalTable*` cells, and
  `OperationalStatus`;
- made each queue row use the shared `OperationalLinkedRow` contract while
  preserving the explicit `Open` action button for direct navigation.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/crm/components/service-enquiries/service-enquiry-queue.tsx' 'src/app/(dashboard)/crm/freight-forwarding/page.tsx' 'src/app/(dashboard)/crm/customs-clearance/page.tsx'`:
  passed.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so this
  pass is source-verified and lint-verified rather than browser-verified in
  Light, Night, and Violet themes;
- the visible-records chip currently reflects the filtered queue length because
  the page does not yet provide a separate unfiltered total count for these
  service queues.

## 2026-08-05 CRM enquiries and leads table action-column removal

Removed the rightmost action column from the CRM enquiries and leads registers
so both tables now rely on the existing linked primary cells instead of a
separate eye/delete action rail.

Delivered:

- updated `src/app/(dashboard)/crm/enquiries/page.tsx` to remove the `Actions`
  header and row action cell while preserving the linked enquiry number as the
  navigation path into each enquiry record;
- updated `src/app/(dashboard)/crm/leads/page.tsx` to remove the `Actions`
  header and row action cell, including the inline view and delete controls,
  while preserving the linked lead name as the navigation path into each lead
  record;
- aligned the empty-state `colSpan` values in both tables with the new six-
  column layouts.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/crm/enquiries/page.tsx' 'src/app/(dashboard)/crm/leads/page.tsx'`:
  passed.

Known limits:

- this change intentionally removes the inline lead delete affordance from the
  leads register, so deletion now depends on any remaining lead-detail workflow
  rather than the list view;
- no authenticated browser runtime is attached in this Codex session, so the
  result is source-verified and lint-targeted rather than browser-verified in
  Light, Night, and Violet themes.

## 2026-08-05 CRM enquiries and leads whole-row navigation follow-up

Made the full enquiry and lead register rows actionable so users can open a
record by clicking anywhere across the row, not just the primary text cell.

Delivered:

- added `src/components/data-display/operational-linked-row.tsx` as a shared
  data-display owner component that gives operational table rows link-like
  click and keyboard behavior while keeping route pages server-rendered;
- updated `src/app/(dashboard)/crm/enquiries/page.tsx` and
  `src/app/(dashboard)/crm/leads/page.tsx` to use the shared clickable row
  wrapper for each record row instead of inline text links;
- updated `src/styles/monolith-system.css` so actionable rows show pointer
  cursor feedback and a visible focus treatment.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/components/data-display/operational-linked-row.tsx' 'src/app/(dashboard)/crm/enquiries/page.tsx' 'src/app/(dashboard)/crm/leads/page.tsx'`:
  passed.

Known limits:

- this pass only applies the shared whole-row interaction to the CRM enquiries
  and leads registers touched here; other operational tables still keep their
  existing interaction patterns unless migrated separately;
- no authenticated browser runtime is attached in this Codex session, so the
  result is source-verified and lint-verified rather than browser-verified in
  Light, Night, and Violet themes.

## 2026-08-05 CRM enquiry detail tab-shell cleanup follow-up

Removed the grey container background and border around the CRM enquiry-detail
right-rail tab actions so the pill actions sit directly on the page surface.

Delivered:

- updated `src/styles/monolith-system.css` to remove the shared `.mnx-crm-tabs`
  shell border, background, radius, and inner padding while keeping the tab
  row layout and horizontal scrolling behavior intact.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx' 'src/modules/crm/components/workspace/crm-workspace.tsx'`:
  still fails on pre-existing route debt in `enquiry-detail-client.tsx`,
  primarily long-standing `@typescript-eslint/no-explicit-any` findings and the
  existing `react-hooks/set-state-in-effect` warning around `setLocalCalls(calls)`.

Known limits:

- because `.mnx-crm-tabs` is a shared CRM tab-shell style, the same chrome
  removal also applies to other CRM surfaces that use `CrmTabs`;
- no authenticated browser runtime is attached in this Codex session, so the
  result is source-verified only.

## 2026-08-05 CRM lead detail tab-shell alignment follow-up

Aligned the lead detail page's related-lists tab strip with the shared CRM tab
pattern already used by the enquiry detail page.

Delivered:

- updated `src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx` to
  replace the older underlined route-local tab buttons with shared `CrmTabs`
  and compact `CrmButton` pills;
- kept the lead-specific `Files` tab intact while renaming the common tabs to
  match the enquiry detail wording more closely, including `Summary` and
  `Tasks`.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx' 'src/modules/crm/components/workspace/crm-workspace.tsx'`:
  still fails on pre-existing route debt in `lead-detail-wrapper.tsx`,
  primarily long-standing `@typescript-eslint/no-explicit-any` findings and
  existing `react-hooks/set-state-in-effect` warnings.

Known limits:

- this follow-up aligns the lead detail tab strip with the enquiry detail page,
  but the wider lead detail screen still retains substantial older route-local
  composition beyond the tab area;
- no authenticated browser runtime is attached in this Codex session, so the
  result is source-verified only.

## 2026-08-05 CRM enquiry and lead tab-section surface cleanup

Removed the remaining grey outer surface behind the right-rail tab and content
sections on both CRM enquiry and lead detail pages.

Delivered:

- updated `src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx`
  so the related-lists container no longer renders the default CRM panel
  background, border, or shadow;
- updated `src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx` to drop
  the route-local grey boxed wrapper around the tabs and content section.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx' 'src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx'`:
  still fails on pre-existing route debt in both legacy detail files,
  primarily long-standing `@typescript-eslint/no-explicit-any` findings and
  existing `react-hooks/set-state-in-effect` warnings.

Known limits:

- this pass removes the outer grey container surface only; inner summary/info
  cards within the active tabs remain unchanged;
- no authenticated browser runtime is attached in this Codex session, so the
  result is source-verified only.

## 2026-08-05 CRM duplicate page-level loading cleanup

Removed the extra CRM item-detail loading screen so CRM pages rely on the
shared `crm/loading.tsx` route loader instead of stacking a second local page
loader on top of it.

Delivered:

- updated `src/app/(dashboard)/crm/items/[id]/page.tsx` to remove the local
  client `loading` state and inline `Loading...` screen;
- switched the item lookup to a direct synchronous read so the route now either
  renders the item detail immediately or falls through to `notFound()`.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/crm/items/[id]/page.tsx'`:
  passed.

Known limits:

- this cleanup removes the duplicate page-level loader I found in the CRM route
  family, but it does not affect button-level pending states such as upload or
  action spinners inside CRM workflows;
- no authenticated browser runtime is attached in this Codex session, so the
  result is source-verified and lint-verified rather than browser-verified.

## 2026-08-04 CRM enquiry-detail design-system composition follow-up

Moved the main `/crm/enquiries/[id]` detail experience further onto the shared
CRM design-system composition path while preserving the existing enquiry
actions, follow-up workflow, worksheet logic, and email simulation behavior.

Delivered:

- updated `src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx`
  so the visible top-level experience now uses shared `CrmActionLink`,
  `CrmPanel`, `CrmSection`, `CrmField`, and `CrmStatus` primitives for the
  command bar, enquiry hero, follow-up scheduling surface, main detail section,
  worksheet section, automation section, reminder card, and right-rail tab
  shell;
- replaced the older route-local tab underline treatment in the right rail with
  shared CRM button variants, so the summary/notes/tasks/audit/time/calls tabs
  now follow the approved monolith action styling more closely;
- preserved the route's current business logic, owner reassignment flow,
  worksheet save behavior, and automation/test tooling while changing the page
  composition and visual ownership.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx' 'src/app/(dashboard)/crm/enquiries/[id]/page.tsx'`:
  still fails on pre-existing route debt in `enquiry-detail-client.tsx`,
  primarily `@typescript-eslint/no-explicit-any` and the existing
  `react-hooks/set-state-in-effect` finding around `setLocalCalls(calls)`.

Known limits:

- this pass focuses on the main visible page composition shown in the enquiry
  detail workspace; deeper sub-surfaces inside the long legacy client component,
  including perishable/worksheet internals and some nested utility blocks,
  still retain older route-local field/layout markup;
- no authenticated browser runtime is attached in this Codex session, so the
  migration is source-verified only and still needs Light, Night, and Violet
  runtime verification across desktop, tablet, and mobile.

## 2026-08-04 CRM enquiries shared filter-menu follow-up

Replaced the enquiry register's one-off `Apply` search submit control with the
shared operational filter-menu pattern, and moved the enquiry-type filtering
into that same datatable toolbar.

Delivered:

- added `src/modules/crm/components/enquiries/enquiry-register-toolbar.tsx` as
  a module-owned CRM toolbar composition built on the shared
  `OperationalDataTableHeader`, compact search field, shared filter-menu
  dropdown, active-filter summary row, and CRM command actions;
- updated `src/app/(dashboard)/crm/enquiries/page.tsx` to use the new toolbar,
  preserving the existing `search` and `type` query semantics while removing
  the duplicate lower enquiry-type filter strip;
- kept the current enquiry dataset behavior intact while exposing the filter
  choices directly through the datatable's canonical filter control.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/crm/enquiries/page.tsx' 'src/modules/crm/components/enquiries/enquiry-register-toolbar.tsx'`:
  passed.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so this
  follow-up is source-verified and lint-verified rather than browser-verified
  in Light, Night, and Violet themes;
- this pass keeps the current enquiry filters limited to the existing
  `search`, `perishable`, and `future follow-up` controls rather than adding
  new server-side filter dimensions.

## 2026-08-04 CRM action-link button-element follow-up

Updated the CRM action wrapper so CRM command-bar actions now render the shared
design-system `Button` element instead of a CRM-specific link wrapper.

Delivered:

- updated `src/modules/crm/components/workspace/crm-workspace.tsx` so
  `CrmActionLink` now uses the shared `Button` component and client-side router
  navigation for its `href`;
- preserved the shared Monolith button variants and compact/default sizing
  contract already used by the CRM toolbar actions, while changing the rendered
  element from link markup to a real button element.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/crm/components/workspace/crm-workspace.tsx'`:
  passed.

Known limits:

- this follow-up intentionally changes the CRM action wrapper implementation
  without touching unrelated route-local text links, tab links, or row-action
  links elsewhere in CRM;
- no authenticated browser runtime is attached in this Codex session, so the
  fix is source-verified and lint-verified rather than browser-verified in
  Light, Night, and Violet themes.

## 2026-08-04 CRM enquiries operational table alignment handoff

Aligned `/crm/enquiries` with the shared operational data-table system used by
 CHA instead of keeping the older route-local CRM toolbar and table shell.

Delivered:

- updated `src/app/(dashboard)/crm/enquiries/page.tsx` to replace the custom
  page-level header/card stack with the shared
  `OperationalDataTable`/`OperationalDataTableHeader`/`OperationalVisibleRecords`
  shell;
- converted the enquiries toolbar to the shared compact search field plus
  operational apply button, while keeping the page's actual supported filters:
  `search` and `type` (`all`, `perishable`, `future_follow`);
- replaced the custom enquiry-type pills with the shared operational filter
  group treatment and kept their counts in sync with the current route data;
- moved the list body onto the shared operational table primitives so enquiry
  actions now use the same row-action contract as the CHA data tables;
- regenerated `docs/ui-route-audit.md`,
  `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`, and
  `docs/ui-component-and-style-ownership-audit.md`.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/crm/enquiries/page.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed the route inventory;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed.

Known limits:

- the route still preserves CRM-specific enquiry row content and status/flag
  wording instead of collapsing everything into the exact CHA jobs column
  model, because the underlying enquiry data shape is different;
- this pass did not add new filter capabilities beyond the existing `search`
  and `type` query parameters already supported by the page logic.

## 2026-08-04 CRM leads filter-menu and operational toolbar handoff

Aligned `/crm/leads` with the same shared operational toolbar/filter treatment
 now used by the CRM enquiries register, while preserving the existing lead
 query behavior.

Delivered:

- added `src/modules/crm/components/leads/lead-register-toolbar.tsx` as a
  module-owned composition that uses the shared operational table header,
  visible-records block, compact search field, shared filter-menu dropdown, and
  active-filter link summary;
- updated `src/app/(dashboard)/crm/leads/page.tsx` to replace the old native
  status select and route-local apply/reset controls with the shared filter-menu
  pattern while preserving the existing `search`, `status`, and `tab` query
  semantics;
- moved the lead tab strip onto the shared operational filter-group treatment so
  the leads register now matches the CRM enquiries register and CHA table
  family more closely;
- regenerated `docs/ui-route-audit.md`,
  `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`, and
  `docs/ui-component-and-style-ownership-audit.md`.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/crm/leads/page.tsx' 'src/modules/crm/components/leads/lead-register-toolbar.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed the route inventory;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed.

Known limits:

- the leads route still keeps its CRM-specific row content, delete action, and
  lead-status cooldown logic rather than adopting the CHA jobs data model;
- this pass does not add saved-view persistence to CRM leads; the shared
  filter-menu usage here is visual and interaction-aligned only.

## 2026-08-04 Shared primary button spacing and label-color fix

Fixed the shared primary button CSS so icon-plus-label actions stop drifting
 away from the approved Monolith button look when the label is wrapped in a
 `span`.

Delivered:

- updated `src/styles/monolith-system.css` to remove
  `justify-content: space-between` from `.mnx-button-primary`, which was
  creating the oversized gap between the icon and text;
- updated `src/styles/monolith-system.css` to stop coloring
  `.mnx-button-primary > span:not(.mnx-button-spinner)`, which was turning
  wrapped button labels into the accent color instead of keeping the standard
  primary-button label color;
- preserved icon tinting for the icon element itself, so the fix only corrects
  label spacing and label color without changing unrelated button behavior.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/crm/components/leads/lead-register-toolbar.tsx' 'src/app/(dashboard)/crm/enquiries/page.tsx' 'src/app/(dashboard)/crm/leads/page.tsx' 'src/modules/crm/components/workspace/crm-workspace.tsx'`:
  passed.

Known limits:

- no browser runtime is attached in this Codex session, so this shared visual
  correction is source-verified and lint-verified rather than screenshot- or
  theme-verified in Light, Night, and Violet;
- if any route intentionally relied on the old broken primary-button label tint
  or forced icon-label separation, it will now inherit the corrected shared
  button behavior instead.

## 2026-08-04 CRM action-link compact toolbar sizing fix

Fixed the CRM action-link wrapper so toolbar links can use the same compact
 button size contract as CHA operational toolbar actions instead of always
 falling back to the larger default shell.

Delivered:

- updated `src/modules/crm/components/workspace/crm-workspace.tsx` so
  `CrmActionLink` now accepts `size="compact"` and applies the shared
  `mnx-button-compact` contract;
- updated `src/modules/crm/components/leads/lead-register-toolbar.tsx` so
  `Lead Sources` and `Create Lead` use the compact toolbar button size instead
  of the default oversized shell;
- updated `src/app/(dashboard)/crm/enquiries/page.tsx` so the enquiries toolbar
  actions use the same compact size contract.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/crm/components/workspace/crm-workspace.tsx' 'src/modules/crm/components/leads/lead-register-toolbar.tsx' 'src/app/(dashboard)/crm/enquiries/page.tsx'`:
  passed.

Known limits:

- this fixes the CRM toolbar action-link size mismatch, but it does not change
  the global Monolith button typography contract beyond the earlier shared
  primary-button spacing/color correction;
- no authenticated browser runtime is attached in this Codex session, so the
  change is source-verified and lint-verified rather than browser-verified in
  Light, Night, and Violet themes.

## 2026-08-04 Shared ButtonLink architecture fix

Centralized button-styled navigation links onto one shared design-system
 primitive so module wrappers stop reconstructing Monolith button classes by
 hand and drifting away from the catalogue button behavior.

Delivered:

- updated `src/components/ui/button.tsx` to export a shared `ButtonLink`
  primitive backed by the same `buttonVariants` contract as the shared `Button`
  component;
- updated `src/modules/crm/components/workspace/crm-workspace.tsx`,
  `src/modules/cha/components/workspace/cha-workspace.tsx`,
  `src/modules/people/components/people-workspace.tsx`,
  `src/modules/performance/components/performance-workspace.tsx`, and
  `src/modules/accounting/components/accounting-workspace.tsx` so their
  action-link wrappers now delegate to `ButtonLink` instead of manually
  assembling `mnx-button*` classes;
- updated `src/components/feedback/workspace-states.tsx`,
  `src/modules/crm/components/service-enquiries/service-enquiry-queue.tsx`, and
  `src/modules/crm/components/service-enquiries/service-enquiry-detail.tsx` to
  replace direct button-like `Link` class strings with the shared `ButtonLink`
  primitive;
- kept the CRM leads and enquiries toolbar actions on these shared wrappers so
  future button-style fixes now land through a single source of truth.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/components/ui/button.tsx' 'src/components/feedback/workspace-states.tsx' 'src/modules/crm/components/workspace/crm-workspace.tsx' 'src/modules/cha/components/workspace/cha-workspace.tsx' 'src/modules/people/components/people-workspace.tsx' 'src/modules/performance/components/performance-workspace.tsx' 'src/modules/accounting/components/accounting-workspace.tsx' 'src/modules/crm/components/service-enquiries/service-enquiry-queue.tsx' 'src/modules/crm/components/service-enquiries/service-enquiry-detail.tsx' 'src/modules/crm/components/leads/lead-register-toolbar.tsx' 'src/app/(dashboard)/crm/leads/page.tsx' 'src/app/(dashboard)/crm/enquiries/page.tsx'`:
  passed.

Known limits:

- this centralizes the shared button-link path for the main workspace wrappers
  and the CRM routes touched here, but other direct `mnx-button*` usages that
  render actual `<button>` elements remain intentionally unchanged;
- no authenticated browser runtime is attached in this Codex session, so this
  architectural fix is source-verified and lint-verified rather than browser-
  verified in Light, Night, and Violet themes.

## 2026-08-04 Shared filter-menu interaction cleanup follow-up

Adjusted the shared filter menu interaction so open sections can be collapsed
again, the option list scrolls without a visible scrollbar, the in-panel
search row is removed, and the `Save view` control now uses the shared
design-system button contract.

Delivered:

- updated `src/components/forms/filter-menu.tsx` so accordion sections can be
  fully closed, the internal search row is removed, and the header action uses
  the shared `Button` component;
- updated `src/styles/monolith-system.css` so only the option list scrolls and
  the scrollbar stays visually hidden;
- removed the no-longer-needed section search flags from
  `src/app/(dashboard)/cha/jobs/jobs-client.tsx`;
- updated `src/components/forms/filter-menu.test.tsx` to reflect the new
  no-search shared markup.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/components/forms/filter-menu.tsx' 'src/components/forms/filter-menu.test.tsx' 'src/app/(dashboard)/cha/jobs/jobs-client.tsx' 'src/app/(dashboard)/cha/customers/customers-filter-bar.tsx'`:
  passed.

## 2026-08-04 Shared filter-menu compact sizing follow-up

Tightened the newly refreshed shared filter menu after runtime feedback so the
panel is smaller, the typography is less oversized, the internal scrollbar is
gone, and the broken top `Select a view` control has been removed.

Delivered:

- updated `src/components/forms/filter-menu.tsx` to remove the unused view
  selector props/markup from the shared panel;
- updated `src/styles/monolith-system.css` so the shared filter panel now uses
  a smaller overall footprint, smaller heading/control/option text, and no
  internal scrolling regions;
- updated `src/app/(dashboard)/cha/jobs/jobs-client.tsx` and
  `src/app/(dashboard)/cha/customers/customers-filter-bar.tsx` so the current
  filter menu dropdown width is narrower.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/components/forms/filter-menu.tsx' 'src/components/forms/filter-menu.test.tsx' 'src/app/(dashboard)/cha/jobs/jobs-client.tsx' 'src/app/(dashboard)/cha/customers/customers-filter-bar.tsx'`:
  passed.

## 2026-08-04 Shared accordion filter-menu refresh handoff

Replaced the temporary button-only shared filter trigger with a new Monolith
accordion filter menu patterned after the provided reference: large title,
top view selector, right-side action link, collapsible filter groups, in-panel
search, and checkbox-style option rows.

Delivered:

- updated `src/components/forms/filter-menu.tsx` so `FilterMenu` once again
  opens shared dropdown content and `CategorizedFilterMenuPanel` now renders
  the new accordion/filter-list treatment instead of the earlier category-card
  panel;
- updated `src/styles/monolith-system.css` with the new shared filter-menu
  layout and option-row styling;
- migrated `src/app/(dashboard)/cha/jobs/jobs-client.tsx` to feed the shared
  filter menu with grouped section data for stage, status, priority, branch,
  job type, and assignment filters;
- migrated `src/app/(dashboard)/cha/customers/customers-filter-bar.tsx` to the
  same shared grouped-section contract for status, portal access, and balance;
- updated `src/components/forms/filter-menu.test.tsx` to cover the new shared
  accordion markup contract.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/components/forms/filter-menu.tsx' 'src/components/forms/filter-menu.test.tsx' 'src/app/(dashboard)/cha/jobs/jobs-client.tsx' 'src/app/(dashboard)/cha/customers/customers-filter-bar.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx vitest run 'src/components/forms/filter-menu.test.tsx' --reporter verbose`:
  could not start because the repository's guarded Vitest configuration still
  requires `.env.staging.local` before test execution.

Open follow-up:

- the new top-right `Save view` action is currently visual/shared-layout only;
  persistent saved-filter-view behavior is not yet wired for these routes;
- no authenticated browser backend is attached in this Codex session, so the
  change is source-verified and lint-verified rather than runtime-verified in
  Light, Night, and Violet themes.

## 2026-08-04 Shared filter-menu removal handoff

Removed the current shared design-system filter dropdown behavior while
preserving the existing filter trigger button styling and count chip.

Delivered:

- updated `src/components/forms/filter-menu.tsx` so `FilterMenu` now renders
  only the existing Monolith filter button and no longer mounts the dropdown
  menu content/panel;
- preserved the shared trigger contract used across current consumers, so the
  visible button remains in place on routes that already use the shared
  filter-menu primitive.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/components/forms/filter-menu.tsx'`:
  passed.

Open follow-up:

- `CategorizedFilterMenuPanel` and its styling remain in the repository but are
  no longer reachable through the shared `FilterMenu` trigger; they can be
  removed in a later cleanup pass if you want the unused menu implementation
  deleted as well;
- no authenticated browser backend is attached in this Codex session, so the
  change is source-verified and lint-verified rather than runtime-verified in
  Light, Night, and Violet themes.

## 2026-08-04 Design-system categorized filter-menu handoff

Redesigned the shared Monolith filter-menu pattern so category selection now
happens through a dropdown and the selected category reveals its matching
sub-filter options directly underneath, instead of relying on the older
side-by-side category rail.

Delivered:

- updated `src/components/forms/filter-menu.tsx` to add the shared
  `CategorizedFilterMenuPanel` helper on top of the existing `FilterMenu`
  trigger contract;
- added shared categorized filter-menu styling in
  `src/styles/monolith-system.css` for the new header, category summary,
  selector, option stack, and footer regions;
- migrated `src/app/(dashboard)/cha/jobs/jobs-client.tsx` so the operational
  jobs register filter menu now uses the new dropdown category selector and
  reveals the active category's sub-options below it;
- migrated `src/app/(dashboard)/cha/customers/customers-filter-bar.tsx` to the
  same categorized filter-menu pattern so the customer register follows the
  same design-system interaction;
- added `src/components/forms/filter-menu.test.tsx` to cover the shared
  categorized panel markup contract;
- regenerated `docs/ui-route-audit.md`,
  `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`, and
  `docs/ui-component-and-style-ownership-audit.md`.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/components/forms/filter-menu.tsx' 'src/components/forms/filter-menu.test.tsx' 'src/app/(dashboard)/cha/jobs/jobs-client.tsx' 'src/app/(dashboard)/cha/customers/customers-filter-bar.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed the route inventory;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx vitest run 'src/components/forms/filter-menu.test.tsx' --reporter verbose`:
  could not start because the repository's guarded Vitest configuration still
  requires `.env.staging.local` before test execution.

Open follow-up:

- the new categorized panel is live in the CHA jobs and customers filter menus,
  but other filter-menu consumers such as HRMS employee directory, AMS
  appraisals, and customs masters still use their earlier flat or custom menu
  layouts and can be migrated onto the same shared pattern in a follow-up pass;
- no authenticated browser backend is attached in this Codex session, so the
  redesign is source-verified and lint-verified rather than runtime-verified in
  Light, Night, and Violet themes.

## 2026-08-04 CRM leads operational-table and header-icon handoff

Aligned the `/crm/leads` index page more closely with the shared Monolith data
display and action contracts while removing the icon that was rendering before
the route heading.

Delivered:

- updated `src/app/(dashboard)/crm/leads/page.tsx` to replace the local
  `CrmTable` presentation with the shared
  `OperationalDataTable`, `OperationalDataTableWrap`, `OperationalTable`,
  `OperationalPrimaryCell`, `OperationalStatus`, `OperationalTableEmpty`, and
  `OperationalDataTableFooter` components;
- migrated the primary page actions on the route to the approved CRM button
  contracts by using shared `CrmButton` / `CrmActionLink` primitives instead of
  keeping the previous route-local button treatment around the main filters and
  create action;
- updated `src/modules/crm/components/workspace/crm-workspace.tsx` so the
  `/crm/leads` page header no longer renders the leading icon while preserving
  the standard CRM header treatment on the rest of the workspace;
- regenerated `docs/ui-route-audit.md`,
  `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`, and
  `docs/ui-component-and-style-ownership-audit.md`.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/crm/leads/page.tsx' 'src/modules/crm/components/workspace/crm-workspace.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed the current route inventory;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed.

Open follow-up:

- the fresh static audit still marks `/crm/leads` as `NON_COMPLIANT` because
  the route continues to own several directly styled `Link` elements for tab
  navigation and other action-like links; the main table and primary actions
  now use the shared design-system contracts, but the tab/navigation treatment
  still needs a canonical replacement to clear the remaining audit finding;
- no authenticated browser backend is attached in this Codex session, so the
  change is source-verified and lint-verified rather than runtime-verified in
  Light, Night, and Violet themes.

## 2026-08-04 CRM service-enquiry routing foundation handoff

Added the first normalized CRM routing layer for freight forwarding and customs
clearance so interested leads now create durable service work items instead of
relying only on mixed `CrmLead.enquiryDetails` JSON.

Delivered:

- added Prisma enums and `CrmServiceEnquiry` in `prisma/schema.prisma` plus
  additive migration
  `prisma/migrations/20260804113000_add_crm_service_enquiries/`;
- added `src/modules/crm/services/service-enquiry-routing.service.ts` with the
  transactional `routeQualifiedEnquiry(...)` orchestration and normalized
  queue/detail queries;
- updated `src/modules/crm/actions.ts` so interested-lead conversion now routes
  through the centralized service-enquiry transaction and mirrors rate-sheet
  saves into normalized `pricingSnapshot` state;
- added the new CRM routes
  `src/app/(dashboard)/crm/freight-forwarding/**` and
  `src/app/(dashboard)/crm/customs-clearance/**`;
- added module-owned CRM service-enquiry UI in
  `src/modules/crm/components/service-enquiries/**`;
- updated `src/modules/crm/components/workspace/crm-workspace.tsx`,
  `src/lib/navigation.ts`, and `src/lib/route-labels.ts` so the new routes are
  first-class CRM workspaces in shared chrome and navigation;
- added permission catalogue entries to `prisma/seed.ts`;
- added `docs/architecture/adr-crm-service-enquiry-routing.md` and
  `docs/crm-freight-customs-implementation.md`;
- regenerated `docs/ui-route-audit.md`,
  `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`, and
  `docs/ui-component-and-style-ownership-audit.md`.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx prisma format`: passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx prisma validate`: passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx prisma generate`: passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed in this session after the service-enquiry additions;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint ...` over the new
  service-enquiry files, CRM workspace metadata, navigation, route labels, and
  db singleton: passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed route inventory for the new CRM pages;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the pre-existing repository-wide `src/components/monolith`
  ownership baseline, not on this CRM routing pass.

Open follow-up:

- direct enquiry creation, quote linkage by `serviceEnquiryId`, normalized
  freight/customs pricing records, and job conversion are still deferred;
- the new CRM pages are source-verified and type-verified in this session, but
  no authenticated browser backend is attached for Light/Night/Violet runtime
  verification.

## 2026-08-04 Freight Forwarding module scaffold handoff

Added a new first-class `Freight Forwarding` dashboard module and routed it
through the same Monolith registration points used by the existing operational
modules, while intentionally keeping its internal workspace blank for now.

Delivered:

- added `src/app/(dashboard)/freight-forwarding/page.tsx` as the new protected
  route;
- added `src/modules/freight-forwarding/components/freight-forwarding-workspace.tsx`
  and `src/modules/freight-forwarding/components/index.ts` so the module owns
  its workspace composition under `src/modules/<module>/components`;
- updated `src/modules/core/organisation/module-config.ts` so
  `freight-forwarding` is treated as a managed toggleable module and
  `/freight-forwarding` is protected by the dashboard shell's module-enable
  gate;
- updated `src/lib/navigation.ts` and `src/lib/route-labels.ts` so the new
  module appears in primary navigation, command search, and topbar route
  labeling;
- updated `src/modules/dashboard/types.ts`,
  `src/modules/dashboard/service.ts`, and
  `src/app/(dashboard)/dashboard/_components/module-command-center.tsx` so the
  dashboard module card can render the new module with a zero-state summary;
- updated `src/lib/navigation.test.ts` with a managed-path assertion for the
  new module and removed a pre-existing malformed stray `it(...)` stub that was
  making the test file unparsable;
- regenerated `docs/ui-route-audit.md`,
  `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`, and
  `docs/ui-component-and-style-ownership-audit.md` so the new route family is
  reflected in the current source audit.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/core/organisation/module-config.ts' 'src/lib/navigation.ts' 'src/modules/dashboard/types.ts' 'src/modules/dashboard/service.ts' 'src/app/(dashboard)/dashboard/_components/module-command-center.tsx' 'src/lib/route-labels.ts' 'src/lib/navigation.test.ts' 'src/modules/freight-forwarding/components/freight-forwarding-workspace.tsx' 'src/modules/freight-forwarding/components/index.ts' 'src/app/(dashboard)/freight-forwarding/page.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit and migration matrix;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the existing repository-wide `src/components/monolith`
  ownership baseline, not on the Freight Forwarding module scaffold;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  still fails on the existing unrelated Accounting recurring/customization,
  customer-advances, incentives, and Prisma-model baseline issues outside this
  module addition;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx vitest run 'src/lib/navigation.test.ts'`:
  could not start because the repository's guarded Vitest configuration
  requires `.env.staging.local` before test execution.

Open follow-up:

- the Freight Forwarding module currently exposes only its blank landing
  workspace; no sub-routes, data model, permissions, or workflow actions were
  added in this pass;
- no authenticated browser backend is attached in this Codex session, so the
  new module was source-verified and shell-wired rather than screenshot-verified
  in Light, Night, and Violet themes.

## 2026-08-04 CRM lead detail creator-data handoff

Switched the CRM lead detail `Business Card Details` panel away from imported
lead-source fields and onto the internal employee record for the user who
created the lead, so the page now shows in-system creator metadata for every
lead detail view.

Delivered:

- updated `src/modules/crm/service.ts` so `getLead(...)` enriches
  `lead.createdBy` with internal user data including `employeeNumber`,
  `designation`, `personalPhone`, and the related organisation name;
- updated `src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx` so the
  `Business Card Details` panel now shows `Created By`, `Employee ID`,
  `Email`, `Designation`, `Organisation`, and `Mobile` from the creator's
  employee profile instead of imported lead fields such as Justdial company
  text, external designation, and imported phone values;
- preserved fallback behavior so the panel still renders safely when creator
  data is partially missing.

Verification on Tuesday, August 4, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/crm/service.ts' 'src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx'`:
  still fails on the existing baseline `no-explicit-any`, unused import, and
  React effect issues already present in those CRM files, not on the new
  creator-data wiring.

Open follow-up:

- no authenticated browser backend is attached in this Codex session, so the
  CRM lead detail change is source-verified rather than screenshot-verified in
  Light, Night, and Violet themes;
- other CRM surfaces still use mixed imported lead data and internal user data,
  so this pass only changes the lead detail `Business Card Details` panel.

## 2026-08-04 CHA customers operational-table migration handoff

Moved the CHA customer register off the page-local `ChaTable` markup and onto
the shared Monolith operational data-table contract so the route now uses the
same production table family as the rest of the CHA workspace.

Delivered:

- updated `src/app/(dashboard)/cha/customers/page.tsx` to replace the local
  bordered table wrapper and raw table cells with
  `OperationalDataTable`, `OperationalDataTableWrap`, `OperationalTable`,
  `OperationalPrimaryCell`, `OperationalStatus`,
  `OperationalTableEmpty`, and `OperationalDataTableFooter`;
- preserved the existing search/filter bar, metrics, permissions, CRM view
  link, edit link, and delete action behavior while aligning the register with
  the approved design-system table structure;
- regenerated `docs/ui-route-audit.md`,
  `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`, and
  `docs/ui-component-and-style-ownership-audit.md`.

Verification on Tuesday, August 4, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/cha/customers/page.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit and migration matrix;
- `NODE_OPTIONS=--max-old-space-size=8192 node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run design-system:verify`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  still fails on the existing unrelated Accounting recurring/customization,
  CRM incentives, HRMS incentives, recurring-sales-invoice, and incentives
  service baseline errors;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run architecture:check`:
  still fails on the pre-existing repository-wide `src/components/monolith`
  ownership baseline, not on the CHA customers route change.

Open follow-up:

- the fresh static route audit still marks `/cha/customers` as
  `NON_COMPLIANT` because two `Link` elements still carry direct button-style
  classes for row actions; the table structure itself is now on the canonical
  operational data-table contract.
- no authenticated browser backend is attached in this Codex session, so
  runtime Light/Night/Violet verification for `/cha/customers` remains
  source-verified rather than screenshot-verified.

## 2026-08-03 HR letters browser-PDF preview handoff

Removed the in-app HR Letters preview implementation so letter previews now
open through the browser's native PDF viewer instead of rendering inside HRMS
modals, surfaces, or embedded iframes.

Delivered:

- added `src/app/api/hrms/letters/preview/route.ts` and
  `generateHRLetterPreviewPdf(...)` in
  `src/modules/hrms/letters-service.ts` so HR can generate a real preview PDF
  from the selected DOCX template and current field values before saving or
  issuing;
- updated
  `src/modules/hrms/components/letter-preparation-page.tsx` so `Preview
  letter` now generates the PDF and opens it in a separate browser tab instead
  of toggling the old preview modal;
- updated `src/modules/hrms/components/letters-view.tsx` so the review modal
  no longer embeds draft or issued previews inline and instead provides
  browser-viewer actions for draft preview generation and issued PDFs;
- updated `src/app/(dashboard)/hrms/letters/view/[id]/page.tsx` so the
  employee-facing portal now offers `Open PDF Viewer` and download actions
  instead of embedding the PDF inside the page;
- removed the unused preview-only components
  `src/modules/hrms/components/letter-document-preview-modal.tsx` and
  `src/modules/hrms/components/letter-document-preview-surface.tsx`;
- regenerated `docs/ui-route-audit.md`,
  `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`, and
  `docs/ui-component-and-style-ownership-audit.md`.

Verification on Monday, August 3, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/hrms/components/letter-preparation-page.tsx' 'src/modules/hrms/components/letters-view.tsx' 'src/modules/hrms/components/letters-shared.ts' 'src/modules/hrms/letters-service.ts' 'src/app/api/hrms/letters/preview/route.ts' 'src/app/(dashboard)/hrms/letters/view/[id]/page.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit and migration matrix;
- `NODE_OPTIONS=--max-old-space-size=8192 node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run design-system:verify`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  still fails for existing unrelated Accounting, CRM, HRMS incentives, and
  Incentives service baseline type errors;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run architecture:check`:
  still fails on the pre-existing repository-wide Monolith component ownership
  baseline under `src/components/monolith`, not on the HR letters preview
  changes.

Open follow-up:

- preview PDFs are generated as temporary public files under
  `public/import-output/letters/previews/`; this change does not yet add a
  cleanup lifecycle for those preview artifacts;
- no authenticated browser automation backend is attached in this Codex
  session, so runtime confirmation is code-verified and action-wired but not
  screenshot-verified in-app.

## 2026-08-03 HR letters preparation route migration

Moved the HR letter drafting workflow out of the modal stack and into a
dedicated dashboard route so draft creation now follows the same page-based
Monolith workspace pattern as the rest of the application.

Delivered:

- added `src/app/(dashboard)/hrms/letters/prepare/page.tsx` as the new
  authenticated preparation route;
- added
  `src/modules/hrms/components/letter-preparation-page.tsx` to host the full
  draft setup flow with shared design-system page chrome, action buttons, and
  a dedicated `Preview letter` action;
- added `src/modules/hrms/components/letters-shared.ts` so both the draft
  preparation page and the existing review flow reuse the same template preview
  rendering logic;
- updated `src/modules/hrms/components/letters-view.tsx` so the main `Prepare
  Letter` action routes to the new page instead of opening a modal, while the
  existing registry and approval review behavior remain intact.

Verification on Monday, August 3, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/hrms/components/letters-view.tsx' 'src/modules/hrms/components/letter-preparation-page.tsx' 'src/modules/hrms/components/letters-shared.ts' 'src/app/(dashboard)/hrms/letters/prepare/page.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 node scripts/audit-ui-routes.mjs`:
  regenerated `docs/ui-route-audit.md` and
  `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md` to include the new route;
- `NODE_OPTIONS=--max-old-space-size=8192 node scripts/generate-ui-component-style-audit.mjs`:
  regenerated `docs/ui-component-and-style-ownership-audit.md`.

## 2026-08-03 border normalization and HR letters source-actions cleanup

Reduced one recurring Monolith UI regression pattern where route-local border
utilities were bypassing the shared border contract and producing heavier
outlines than the approved design system surfaces.

Delivered:

- updated `src/styles/monolith-system.css` to normalize active raw
  `border-mono-border*`, `divide-mono-border*`, and direct
  `border-[var(--mnx-border)]*` utility usages back onto the shared Monolith
  border tone instead of letting each route vary border strength ad hoc;
- removed the extra outlined container around the HR Letters `Source DOCX
  actions` block in `src/modules/hrms/components/letters-view.tsx` so the
  actions now sit on a softer elevated surface without the heavy rounded
  outline shown in the reported screenshot;
- preserved the earlier HR Letters toolbar button migration so those editor
  controls still use the canonical shared `Button` primitive.

Verification on Monday, August 3, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/hrms/components/letters-view.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  still fails for existing unrelated repository-wide TypeScript issues in
  Accounting, CRM, HRMS incentives, and incentives service files that were not
  touched in this border pass.

Open follow-up:

- this change normalizes the most common raw border anti-pattern centrally, but
  the repository still contains many route-local hand-authored border/layout
  combinations that should be migrated route by route to canonical shared
  surfaces and field controls for full design-system compliance;
- no browser backend is attached in this Codex session, so visual verification
  remains source-verified and lint-verified rather than screenshot-tested in
  app.

## 2026-08-03 HR letters draft submission handoff

Patched the live HR Letters workflow so new drafts can finally leave the
registry and enter the approval inbox.

Delivered:

- added a `Submit for Review` action to draft rows in
  `src/modules/hrms/components/letters-view.tsx`;
- added the same action inside the draft review modal so operators can submit
  after checking the captured field values;
- left the existing review/issue controls unchanged for `HR_REVIEW`,
  `LEGAL_REVIEW`, `MGMT_APPROVAL`, and `READY_TO_ISSUE`.

Verification on Monday, August 3, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/hrms/components/letters-view.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  still fails for unrelated existing repository-wide TypeScript issues outside
  HR Letters;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run architecture:check`:
  still fails because tracked generated screenshots and `verification.json`
  remain under `artifacts/ui-migration/final-runtime/`.

## 2026-08-01 accounting workspace catalog handoff

Reduced the current Accounting route sprawl by moving the live workspace list
into one module-owned catalog and wiring both the shared sidebar and the
`/accounting` landing hub to that same source.

Delivered:

- added `src/modules/accounting/workspace-catalog.ts` as the canonical source
  for present Accounting workspace labels, permissions, grouping, route
  matching, descriptions, and card icons;
- updated `src/lib/navigation.ts` so the Accounting sidebar now consumes that
  module-owned catalog instead of maintaining a separate inline route list;
- updated `src/app/(dashboard)/accounting/page.tsx` so the landing hub uses the
  same catalog for workflow descriptions and icons;
- added a regression assertion in `src/lib/navigation.test.ts` so visible
  Accounting nav items continue to mirror the catalog.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/workspace-catalog.ts' 'src/lib/navigation.ts' 'src/lib/navigation.test.ts' 'src/app/(dashboard)/accounting/page.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted `git diff --check` for the touched Accounting catalog and navigation
  files: passed, aside from the normal Windows line-ending warnings in the
  worktree.

## 2026-08-01 accounting route discoverability handoff

Audited the dashboard route tree against the shared navigation and confirmed
the current Accounting complaint was a discoverability gap rather than missing
route files.

Delivered:

- compared the top-level Accounting routes in
  `src/app/(dashboard)/accounting/**/page.tsx` against the canonical Accounting
  nav section;
- found that `/accounting/configuration/admin` was a real top-level workspace
  but was not exposed from the shared Accounting navigation;
- updated `src/lib/navigation.ts` so `Configuration Admin` is now visible in
  the Accounting sidebar and automatically appears on the `/accounting`
  workspace landing page that is derived from the same section data;
- updated the Accounting landing-page route metadata in
  `src/app/(dashboard)/accounting/page.tsx`;
- added a regression check in `src/lib/navigation.test.ts` to keep both
  configuration routes discoverable.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run src/lib/navigation.test.ts`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/lib/navigation.ts' 'src/lib/navigation.test.ts' 'src/app/(dashboard)/accounting/page.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted `git diff --check` for the touched navigation and Accounting files:
  passed, aside from the normal Windows line-ending warnings in the worktree.

## 2026-08-01 global single-font handoff

Unified the live website typography to one family so every shared token path
now resolves to Geist Sans instead of mixing the earlier sans, display, and
mono variants.

Delivered:

- removed the extra Geist Mono loader from `src/app/layout.tsx`, leaving the
  root app shell to load only the Geist Sans webfont;
- repointed `--mn-font-sans`, `--mn-font-display`, and `--mn-font-mono` in
  `src/styles/monolith-tokens.css` to the same sans family;
- aligned the legacy compatibility theme aliases in
  `src/styles/legacy-compatibility.css` to that same sans family so older
  utility-driven surfaces do not reintroduce the removed font;
- replaced the remaining direct production stylesheet references and the CHA
  expenses SVG text fallback so they consume the shared token instead of
  separate hardcoded family names.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/layout.tsx' 'src/app/(dashboard)/cha/expenses/expenses-client.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted `git diff --check` for the touched typography files: passed, aside
  from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- browser-based visual confirmation across all routes remains manual in this
  session because no Codex browser backend is attached, so this handoff should
  be treated as code-verified but still needing live UI review.

## 2026-08-01 workspace spacing handoff

Normalized the shared vertical spacing rhythm across workspace pages so the
distance between page headers, section headings, navigation strips, and the
next surface no longer varies by module or silently disappears on shells that
were using an undefined spacing token.

Delivered:

- added `--mn-space-7`, `--mn-layout-workspace-stack-gap`, and
  `--mn-layout-workspace-stack-gap-mobile` in
  `src/styles/monolith-tokens.css`;
- updated `src/styles/monolith-system.css` so `WorkspacePage` now provides the
  shared page stack gap and the core customer portal, communication/admin, CHA,
  Accounting, People, Performance, and CRM shells all align to it;
- synced the module-owned stylesheet mirrors in
  `src/styles/modules/{accounting,cha-expense,communication-admin,crm,people,performance}.css`
  to the same contract;
- reduced the admin design-system catalogue page stack gap to the shared
  workspace value so its headings and specimens match the production page
  spacing used elsewhere.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted `git diff --check` for the touched token and stylesheet files:
  passed, aside from the normal Windows line-ending warnings in the worktree;
- targeted ESLint on the touched CSS files produced only expected repository
  “file ignored because no matching configuration was supplied” warnings and no
  errors.

Open follow-up:

- visual browser confirmation remains manual in this session because no Codex
  browser backend is attached, so the fix was verified through the shared style
  contract and repository checks rather than screenshot automation.

## 2026-08-01 global loading-screen handoff

Unified route-level loading so the airplane preloader now acts as the common
loading screen across the app instead of being limited to the root loader while
dashboard and portal segments still rendered their own skeleton states.

Delivered:

- added `src/components/feedback/app-route-loading.tsx` to centralize route
  loading copy and reuse the shared `LoadingScreen`;
- replaced the existing route-segment loaders under `src/app` so dashboard,
  module, and customer-portal segments now use the same airplane preloader;
- added missing top-level loaders for `(auth)`, `customer-portal`,
  `google-chat-link`, `invite`, and `verify`, which extends the same loading
  screen to those page families during navigation and initial segment
  resolution.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted ESLint for the shared loader component and touched `loading.tsx`
  files: passed;
- targeted `git diff --check` for the touched loader files: passed, aside from
  the normal Windows line-ending warnings in the worktree.

Open follow-up:

- interactive browser confirmation is still session-blocked because this Codex
  run does not have an attached browser backend, so the loading screen behavior
  was verified by static route-segment wiring rather than in-browser automation.

## 2026-08-01 Accounting demo bootstrap and setup-guide continuation
## 2026-08-01 merge recovery and startup handoff

Completed a dedicated Accounting demo workflow that Finance/Admin can trigger
from Admin Settings, plus the shared bootstrap fixes needed for that workflow
to post cleanly through the canonical engine.

Delivered:

- added `src/modules/accounting/demo.ts` to seed an idempotent July 2026
  Accounting walkthrough into the current organisation using dedicated demo
  maker/approver users, demo customer/vendor masters, bank metadata, posted
  documents, posted payments, and posted manual journals;
- added `seedAccountingDemoMonthAction` in
  `src/modules/accounting/actions.ts` and surfaced it in
  `src/app/(dashboard)/admin/settings/page.tsx`,
  `src/app/(dashboard)/admin/settings/settings-client.tsx`, and
  `src/components/monolith/admin-workspace.tsx` so Admin Settings now exposes a
  clear Accounting-specific demo button and result summary;
- hardened `src/modules/accounting/legacy-bootstrap.ts` so missing
  `AccountingAccountControl` rows are automatically created for active posting
  ledgers, with party requirements now limited to the configured trade
  receivable/payable control ledgers instead of every payable-like account;
- extended `src/lib/catalogue-data.ts` and
  `src/app/(dashboard)/product-catalogue/page.tsx` with a detailed Accounting
  implementation guide covering prerequisites, setup sequence, July 2026 demo
  runbook, and working checks.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/demo.ts' 'src/modules/accounting/legacy-bootstrap.ts' 'src/app/(dashboard)/admin/settings/page.tsx' 'src/app/(dashboard)/admin/settings/settings-client.tsx' 'src/components/monolith/admin-workspace.tsx' 'src/app/(dashboard)/product-catalogue/page.tsx' 'src/lib/catalogue-data.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- live `seedAccountingDemoMonth(...)` run for
  `hr@adarshshipping.in` / org `cmr4m8jb10000ysbwuoj2bvvx`: passed and produced
  2 posted canonical documents, 2 posted payments, 3 posted manual journals,
  and balanced July 2026 totals of debit `892850.00` and credit `892850.00`;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed; the build
  still prints the existing unrelated Turbopack NFT tracing warning through
  `next.config.ts` and
  `src/app/api/customer-portal/document-versions/[id]/route.ts`.

Known limits:

- the new demo bootstrap seeds the current active organisation rather than
  creating a separate org that users can switch into;
- `src/modules/accounting/actions.ts` still has the existing repository-wide
  `no-explicit-any` lint baseline and was not cleaned up in this pass.

## 2026-08-01 Accounting FX revaluation draft continuation

Completed the last open 9.18 Accounting FX automation gap by turning close-date
review into a controlled draft-journal workflow instead of leaving it as
manual-only evidence.

Delivered:

- extended `src/modules/accounting/foreign-exchange.ts` so close runs can now
  resolve configured FX gain/loss posting accounts, convert realized and
  unrealized review rows into balanced journal lines, create a normal draft
  journal through the existing maker-checker journal service, and persist the
  draft lineage/status back onto the close run;
- updated `src/app/(dashboard)/accounting/currency-adjustments/page.tsx` so
  the close-run table now uses the richer FX workspace data, supports `Refresh
  FX review`, allows `Create FX draft` after review evidence exists, and links
  directly to the resulting journal detail route;
- added focused unit coverage in
  `src/modules/accounting/__tests__/foreign-exchange.test.ts` for happy-path
  draft creation and missing-account safeguards;
- added `vitest.unit.config.ts` so mocked unit suites like the new FX draft
  coverage can run locally without requiring the repository's staging-database
  Vitest bootstrap.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/foreign-exchange.ts' 'src/app/(dashboard)/accounting/currency-adjustments/page.tsx' 'src/modules/accounting/__tests__/foreign-exchange.test.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run --config vitest.unit.config.ts src/modules/accounting/__tests__/foreign-exchange.test.ts src/modules/accounting/__tests__/tax-settlement.test.ts src/modules/accounting/__tests__/phase9-late-slices.test.ts --reporter verbose`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed; Turbopack
  still reports the existing unrelated NFT tracing warning through
  `next.config.ts` and
  `src/app/api/customer-portal/document-versions/[id]/route.ts`, but the build
  completed successfully.

Known limits:

- browser verification remains intentionally skipped for the remaining Phase 9
  slices per current instruction;
- Phase 9 implementation is now complete through 9.23, with only optional
  authenticated browser QA left if a browser backend returns in a later
  session.

## 2026-08-01 Accounting foreign-exchange review continuation

Continued the remaining 9.18 Accounting FX parity by adding realized and
unrealized review behavior on top of the earlier currency-control and
tax-settlement workspaces.

Delivered:

- added `src/modules/accounting/foreign-exchange.ts` so Accounting can now
  compute open foreign-currency revaluation exposure from approved historical
  and latest FX rates, compute realized settlement variance from actual
  payment allocations, and record a close-run FX review snapshot into
  `AccountingPeriodCloseRun`;
- updated `src/app/(dashboard)/accounting/currency-adjustments/page.tsx` so
  the route now shows unrealized and realized FX review tables plus a
  controlled `Record FX review` action for open, ready, and reopened close
  runs;
- tightened `src/modules/accounting/tax-settlement.ts` so final close now
  requires a matching FX review snapshot when foreign-currency exposure or
  settlement variance exists for the close date;
- extended `src/modules/accounting/phase9-workspaces.ts` and
  `src/modules/accounting/__tests__/tax-settlement.test.ts` so row-version and
  guarded close behavior stay covered.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/foreign-exchange.ts' 'src/modules/accounting/tax-settlement.ts' 'src/app/(dashboard)/accounting/currency-adjustments/page.tsx' 'src/modules/accounting/phase9-workspaces.ts' 'src/modules/accounting/__tests__/tax-settlement.test.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/modules/accounting/__tests__/tax-settlement.test.ts' 'src/modules/accounting/__tests__/phase9-late-slices.test.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed; Turbopack
  still reports the existing unrelated NFT tracing warning through
  `next.config.ts` and
  `src/app/api/customer-portal/document-versions/[id]/route.ts`, but the build
  completed successfully.

Known limits:

- browser verification remains intentionally skipped for the remaining Phase 9
  slices per current instruction;
- the largest remaining 9.18 FX gap is now automatic journalized revaluation
  posting rather than realized/unrealized review and close-evidence control.

## 2026-08-01 Accounting tax-settlement behavior continuation

Continued the 9.18 Accounting parity work by adding operational filing-period
and period-close transitions on top of the earlier tax-settlement visibility
workspace.

Delivered:

- added `src/modules/accounting/tax-settlement.ts` so statutory filing periods
  can now move through guarded `OPEN -> READY -> FILED` transitions with
  report-availability checks, live report snapshots, acknowledgement-reference
  enforcement, audit logging, and row-version protection;
- added guarded close-run transitions so period-close runs can now move through
  `OPEN/REOPENED -> READY -> CLOSED` and `CLOSED -> REOPENED`, with blocking
  checks for overlapping open filing periods and missing transaction-lock
  coverage before final close;
- updated `src/app/(dashboard)/accounting/tax-settlement/page.tsx` so Finance
  operators can now execute those controlled filing and close transitions
  directly from the live settlement workspace instead of returning to
  configuration-admin CRUD;
- extended `src/modules/accounting/phase9-workspaces.ts` and added
  `src/modules/accounting/__tests__/tax-settlement.test.ts` so row-version
  data and focused transition coverage back the new operational behavior.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/tax-settlement.ts' 'src/app/(dashboard)/accounting/tax-settlement/page.tsx' 'src/modules/accounting/__tests__/tax-settlement.test.ts' 'src/modules/accounting/phase9-workspaces.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/modules/accounting/__tests__/tax-settlement.test.ts' 'src/modules/accounting/__tests__/phase9-late-slices.test.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed; Turbopack
  still reports the existing unrelated NFT tracing warning through
  `next.config.ts` and
  `src/app/api/customer-portal/document-versions/[id]/route.ts`, but the build
  completed successfully.

Known limits:

- browser verification remains intentionally skipped for the remaining Phase 9
  slices per current instruction;
- the largest remaining 9.18 gap is now deeper foreign-exchange parity,
  especially realized/unrealized revaluation behavior, rather than missing
  filing or close transition controls.

## 2026-08-01 Banking overview and account workspace foundation handoff

The existing `/accounting/banking` route now behaves as a real Banking
overview instead of only a liquid-ledger transfer hub, and it now has a linked
account transaction workspace under `/accounting/banking/[bankAccountId]`.

Delivered:

- added `src/modules/accounting/banking-service.ts`,
  `src/modules/accounting/banking-actions.ts`, and
  `src/modules/accounting/banking-shared.ts`;
- rebuilt `src/app/(dashboard)/accounting/banking/page.tsx` and
  `src/app/(dashboard)/accounting/banking/banking-client.tsx` so Banking now
  reads `AccountingBankAccount` plus posted ledger data, supports search/date/
  status filtering, shows separate Amount in Bank and Amount in Books values,
  masks account identifiers before browser delivery, and exposes only working
  actions;
- added `src/app/(dashboard)/accounting/banking/[bankAccountId]/page.tsx` and
  `bank-account-client.tsx` so each bank account now has a posted-book
  transactions view with deterministic ordering, opening carry-forward running
  balance, and source-document links where the repository already has routes;
- reused the existing `saveAccountingBankAccount` configuration boundary for
  create/update/inactivate operations instead of creating a second Banking
  persistence path;
- added focused Banking tests in
  `src/modules/accounting/__tests__/banking-service.test.ts` and
  `src/app/(dashboard)/accounting/banking/banking-client.test.tsx`.

Files:

- `src/modules/accounting/banking-shared.ts`
- `src/modules/accounting/banking-service.ts`
- `src/modules/accounting/banking-actions.ts`
- `src/modules/accounting/__tests__/banking-service.test.ts`
- `src/app/(dashboard)/accounting/banking/page.tsx`
- `src/app/(dashboard)/accounting/banking/banking-client.tsx`
- `src/app/(dashboard)/accounting/banking/banking-client.test.tsx`
- `src/app/(dashboard)/accounting/banking/[bankAccountId]/page.tsx`
- `src/app/(dashboard)/accounting/banking/[bankAccountId]/bank-account-client.tsx`

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/banking-shared.ts' 'src/modules/accounting/banking-service.ts' 'src/modules/accounting/banking-actions.ts' 'src/modules/accounting/__tests__/banking-service.test.ts' 'src/app/(dashboard)/accounting/banking/page.tsx' 'src/app/(dashboard)/accounting/banking/banking-client.tsx' 'src/app/(dashboard)/accounting/banking/banking-client.test.tsx' 'src/app/(dashboard)/accounting/banking/[bankAccountId]/page.tsx' 'src/app/(dashboard)/accounting/banking/[bankAccountId]/bank-account-client.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/modules/accounting/__tests__/banking-service.test.ts' 'src/app/(dashboard)/accounting/banking/banking-client.test.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed; the build
  still prints the existing Turbopack NFT tracing warning through
  `next.config.ts` and
  `src/app/api/customer-portal/checklist-files/[id]/route.ts`, but Banking no
  longer introduces any client/server boundary build failure.

Known limits:

- no real bank connectors, automatic import, statement inbox, rule engine,
  reconciliation, deposit capture, or undo-import flow was started in this
  slice;
- the Banking manage dialogs stay within the existing `AccountingBankAccount`
  shape and configuration metadata rather than inventing unsupported schema or
  direct balance writes;
- route denial still follows the existing Accounting access-gate behavior,
  rather than rendering a Banking-local denied view, because the route is
  guarded before page rendering.

## 2026-08-01 Accounting dashboard late-phase visibility continuation

Continued the 9.20 to 9.23 acceptance work by upgrading the main Accounting
landing route so the newer statutory, reporting, integration, and
customization slices are visible from `/accounting` instead of only in leaf
workspaces.

Delivered:

- updated `src/app/(dashboard)/accounting/page.tsx` so the dashboard now loads
  live summaries from the currency-control, tax-settlement, report-builder,
  integrations, and customization workspaces in parallel with the existing
  operational queue metrics;
- added a Phase 9 controls metric band for foreign-currency subledgers, open
  filing periods, active export profiles, active source mappings, and active
  custom metadata;
- added dashboard tables for connected late-phase workspaces and recent
  statutory filing / close checkpoints so the Accounting landing route reflects
  the broader Phase 9 surface area rather than only core drafts, approvals,
  allocations, and audit activity.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/accounting/page.tsx' 'src/modules/accounting/phase9-workspaces.ts' 'src/app/(dashboard)/accounting/currency-adjustments/page.tsx' 'src/app/(dashboard)/accounting/tax-settlement/page.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/modules/accounting/__tests__/operational-access.test.ts' 'src/modules/accounting/__tests__/operational-ui.architecture.test.ts' 'src/modules/accounting/__tests__/phase9-late-slices.test.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed.

Open follow-up:

- browser verification remains intentionally skipped for the remaining Phase 9
  slices per current instruction;
- the largest remaining gaps are now deeper behavioral parity in the 9.18
  close/tax/FX area and any final specification-derived assertions that still
  need explicit test coverage.

## 2026-08-01 Accounting tax-settlement and currency-control continuation

Continued the 9.18 Accounting parity work by turning the earlier
currency/locking/tax foundations into live operational control surfaces for
Finance.

Delivered:

- extended `src/modules/accounting/phase9-workspaces.ts` with
  `getAccountingCurrencyControlWorkspace()` and
  `getAccountingTaxSettlementWorkspace()` so Accounting now has
  server-authoritative workspace queries for functional-currency controls,
  foreign-currency customer/vendor subledgers, filing periods, validated tax
  profiles, GST summary snapshots, period-close checkpoints, and current
  transaction-lock dates;
- updated `src/app/(dashboard)/accounting/currency-adjustments/page.tsx` so
  the route now shows foreign-currency profile visibility and recent close-run
  checkpoints alongside the earlier FX evidence view;
- added `src/app/(dashboard)/accounting/tax-settlement/page.tsx` with live
  Monolith metrics, GST reporting snapshot cards, filing-period and close-run
  tables, and workflow connectors into reports, transaction locking,
  configuration admin, and currency controls;
- updated `src/components/monolith/accounting-workspace.tsx`,
  `src/lib/navigation.ts`, and
  `src/modules/accounting/operational-access.ts` so
  `/accounting/tax-settlement` is routed, labeled, and permission-gated as a
  first-class Accounting workspace;
- updated `src/modules/accounting/__tests__/operational-access.test.ts` and
  `src/modules/accounting/__tests__/operational-ui.architecture.test.ts` so
  the new route is included in shared operational assertions.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/phase9-workspaces.ts' 'src/app/(dashboard)/accounting/currency-adjustments/page.tsx' 'src/app/(dashboard)/accounting/tax-settlement/page.tsx' 'src/components/monolith/accounting-workspace.tsx' 'src/modules/accounting/operational-access.ts' 'src/lib/navigation.ts' 'src/modules/accounting/__tests__/operational-access.test.ts' 'src/modules/accounting/__tests__/operational-ui.architecture.test.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/modules/accounting/__tests__/operational-access.test.ts' 'src/modules/accounting/__tests__/operational-ui.architecture.test.ts' 'src/modules/accounting/__tests__/phase9-late-slices.test.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed.

Open follow-up:

- browser verification remains intentionally skipped for the remaining Phase 9
  slices per current instruction;
- with the local dev server stopped, the earlier `.next\\monolith-dev-3.stderr.log`
  lock is no longer blocking build verification;
- the next highest-value work is deeper 9.18 behavioral parity for tax
  settlement / FX automation and any remaining 9.20 to 9.23 acceptance gaps.

## 2026-08-01 Accounting late-phase workspaces and API continuation

Continued Accounting Phase 9 past the 9.15 purchases slice by wiring the
missing late-phase operational surfaces across approvals, communications,
customization, report builder, integrations, and slice-derived tests.

Delivered:

- added additive persisted Accounting customization registries in
  `prisma/schema.prisma` plus
  `prisma/migrations/20260801000310_accounting_phase9_customization_and_automation/migration.sql`
  for `AccountingCustomFieldDefinition`, `AccountingAutomationRule`, and
  `AccountingWorkspaceModule`;
- added `src/modules/accounting/customization.ts` and
  `src/modules/accounting/phase9-workspaces.ts` so Accounting now has
  server-authoritative customization CRUD plus late-phase workspace summary
  queries;
- added live Monolith routes `/accounting/customization`,
  `/accounting/communications`, `/accounting/report-builder`, and
  `/accounting/integrations`, and expanded `/accounting/approvals` with
  workflow coverage summary;
- added authenticated Accounting API endpoints for approval summaries,
  communications, report catalog, integrations, custom fields, automation
  rules, and workspace modules;
- updated shared Accounting route metadata, navigation, and access control so
  the new routes behave as first-class Finance workspaces;
- added focused late-slice tests in
  `src/modules/accounting/__tests__/phase9-late-slices.test.ts` and extended
  the existing operational route architecture tests to include the new routes.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/customization.ts' 'src/modules/accounting/phase9-workspaces.ts' 'src/app/(dashboard)/accounting/customization/page.tsx' 'src/app/(dashboard)/accounting/communications/page.tsx' 'src/app/(dashboard)/accounting/report-builder/page.tsx' 'src/app/(dashboard)/accounting/integrations/page.tsx' 'src/app/(dashboard)/accounting/approvals/page.tsx' 'src/app/api/accounting/approvals/summary/route.ts' 'src/app/api/accounting/communications/route.ts' 'src/app/api/accounting/reports/catalog/route.ts' 'src/app/api/accounting/custom-fields/route.ts' 'src/app/api/accounting/custom-fields/[id]/route.ts' 'src/app/api/accounting/automation-rules/route.ts' 'src/app/api/accounting/automation-rules/[id]/route.ts' 'src/app/api/accounting/workspace-modules/route.ts' 'src/app/api/accounting/workspace-modules/[id]/route.ts' 'src/app/api/accounting/integrations/route.ts' 'src/components/monolith/accounting-workspace.tsx' 'src/modules/accounting/operational-access.ts' 'src/lib/navigation.ts' 'src/lib/db.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/modules/accounting/__tests__/operational-access.test.ts' 'src/modules/accounting/__tests__/operational-ui.architecture.test.ts' 'src/modules/accounting/__tests__/phase9-late-slices.test.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed;
- targeted `git diff --check` for the touched late-phase files: passed, aside
  from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- browser verification remains intentionally skipped for the remaining slices
  per current instruction;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by the
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- deeper 9.18 multi-currency, subaccounts, locking, and tax-settlement parity
  is still the largest remaining specification gap after this continuation.

## 2026-08-01 Accounting debit-note and correction-route continuation

Continued the 9.15 Purchases lifecycle work by closing the customer-side
debit-note visibility gap and aligning the shared correction-route metadata
with its mixed customer/vendor behavior.

Delivered:

- added
  `src/app/(dashboard)/accounting/debit-notes/customer-note-drafts-client.tsx`
  and updated `src/app/(dashboard)/accounting/debit-notes/page.tsx` so
  customer debit-note drafts now appear alongside vendor debit-note drafts and
  the canonical debit-note register;
- updated `src/modules/accounting/service.ts` so customer-note listings now
  include original invoice references for source-lineage display;
- normalized `src/components/monolith/accounting-workspace.tsx`,
  `src/lib/navigation.ts`, and
  `src/modules/accounting/operational-access.ts` so the shared
  `/accounting/credit-notes` route now reads as mixed customer/vendor coverage
  instead of sales-only.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/accounting/debit-notes/page.tsx' 'src/app/(dashboard)/accounting/debit-notes/customer-note-drafts-client.tsx' 'src/app/(dashboard)/accounting/debit-notes/vendor-note-drafts-client.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted `git diff --check` for the touched debit-note and correction-route
  files: passed, aside from the normal Windows line-ending warnings in the
  worktree.

Open follow-up:

- browser verification is intentionally skipped for the remaining slices per
  current instruction;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by the
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- the next 9.15 work should focus on deeper canonical payable-party mapping and
  any remaining vendor-settlement edge cases rather than basic correction-route
  coverage.

## 2026-08-01 Accounting expenses and reimbursements continuation

Continued the 9.15 Purchases lifecycle work by giving Accounting a live Finance
view over upstream operational expense and reimbursement payout queues.

Delivered:

- added `src/app/(dashboard)/accounting/expenses/page.tsx` with live Monolith
  metrics, workflow connectors, and queue tables for CHA operational expenses
  and HR fuel reimbursements that are payable-ready;
- updated `src/components/monolith/accounting-workspace.tsx`,
  `src/lib/navigation.ts`, and
  `src/modules/accounting/operational-access.ts` so `/accounting/expenses`
  behaves as a first-class Accounting route;
- intentionally kept payout execution in `/expense` and
  `/hrms/reimbursement` because those source workflows still own approval,
  proof, and party identity and do not yet resolve automatically into canonical
  customer or supplier payment-entry parties.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/accounting/expenses/page.tsx' 'src/components/monolith/accounting-workspace.tsx' 'src/lib/navigation.ts' 'src/modules/accounting/operational-access.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed;
- targeted `git diff --check` for the touched Accounting expenses files:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- browser verification is intentionally skipped for the remaining slices per
  current instruction;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by the
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- the next 9.15 work should focus on any remaining vendor-settlement edge
  cases and on whether non-supplier payouts need explicit canonical payable
  party mapping for direct Accounting payment creation.

## 2026-08-01 Accounting vendor-credit and AP-settlement continuation

Continued the 9.15 Purchases lifecycle work by closing the vendor credit-note
draft visibility gap and improving the AP settlement handoff into vendor
payments.

Delivered:

- updated `src/app/(dashboard)/accounting/credit-notes/new/page.tsx` so both
  customer and supplier original-invoice pickers now use real posted invoice
  states instead of the impossible legacy `APPROVED` / `SUBMITTED` filter;
- added
  `src/app/(dashboard)/accounting/credit-notes/vendor-credit-drafts-client.tsx`
  and updated `src/app/(dashboard)/accounting/credit-notes/page.tsx` so vendor
  credit-note drafts now appear in Accounting with direct submit-to-canonical
  actions and canonical review links once prepared;
- updated `src/app/(dashboard)/accounting/payment-entries/new/page.tsx` and
  `new-payment-client.tsx` so vendor disbursement drafts can now open scoped to
  a supplier and specific purchase invoice, preloading the bill outstanding
  amount into both the payment amount and the initial allocation;
- updated `src/app/(dashboard)/accounting/purchase-invoices/[id]/page.tsx` and
  `src/app/(dashboard)/accounting/vendor-payments/page.tsx` so AP operators can
  jump directly from an open bill or the vendor-payment workspace into the
  scoped settlement flow.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/accounting/credit-notes/page.tsx' 'src/app/(dashboard)/accounting/credit-notes/new/page.tsx' 'src/app/(dashboard)/accounting/credit-notes/vendor-credit-drafts-client.tsx' 'src/app/(dashboard)/accounting/payment-entries/new/page.tsx' 'src/app/(dashboard)/accounting/payment-entries/new/new-payment-client.tsx' 'src/app/(dashboard)/accounting/purchase-invoices/[id]/page.tsx' 'src/app/(dashboard)/accounting/vendor-payments/page.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed;
- targeted `git diff --check` for the touched vendor-credit and AP-settlement
  files: passed, aside from the normal Windows line-ending warnings in the
  worktree.

Open follow-up:

- browser verification is intentionally skipped for the remaining slices per
  current instruction;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by the
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- direct expense-entry / reimbursement parity and any remaining AP settlement
  edge cases should be the next 9.15 targets.

## 2026-08-01 Accounting recurring-bill continuation

Continued the 9.15 Purchases lifecycle work by turning the dormant
`RecurringExpense` foundation into a live recurring-bill workflow that
generates draft purchase invoices instead of legacy direct posting.

Delivered:

- added additive recurring-bill run persistence in `prisma/schema.prisma` plus
  `prisma/migrations/20260801000300_accounting_phase9_recurring_expense_runs/migration.sql`;
- added `src/modules/accounting/recurring-expenses.ts` and
  `src/modules/accounting/recurring-expense-actions.ts` so Accounting can now
  create recurring bill profiles, process due occurrences, generate one-off
  draft purchase invoices, skip due dates, pause/resume profiles, and record
  generated / skipped / failed run lineage with idempotency keys;
- added `src/app/(dashboard)/accounting/recurring/recurring-expense-client.tsx`
  and updated `src/app/(dashboard)/accounting/recurring/page.tsx` so the live
  recurring workspace now hosts both recurring sales invoices and recurring
  bills in one Monolith operational route;
- updated `src/lib/db.ts` so the Prisma singleton refresh guard recognizes the
  new recurring-expense run delegate.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/recurring-expenses.ts' 'src/modules/accounting/recurring-expense-actions.ts' 'src/app/(dashboard)/accounting/recurring/page.tsx' 'src/app/(dashboard)/accounting/recurring/recurring-expense-client.tsx' 'src/app/(dashboard)/accounting/recurring/recurring-sales-client.tsx' 'src/lib/db.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed;
- targeted `git diff --check` for the touched recurring-bill files: passed,
  aside from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- browser verification is intentionally skipped for the remaining slices per
  current instruction;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by the
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- vendor-credit, expense, and settlement parity are still open in 9.15 and
  should be the next targets.

## 2026-08-01 Accounting vendor debit-note continuation

Continued the 9.15 Purchases lifecycle work by exposing vendor debit-note
drafts inside Accounting and fixing the purchase-side original-invoice
selection path.

Delivered:

- updated `src/app/(dashboard)/accounting/debit-notes/new/page.tsx` so both
  customer and supplier original-invoice pickers now use real posted invoice
  states instead of the impossible legacy `APPROVED` / `SUBMITTED` filter;
- added
  `src/app/(dashboard)/accounting/debit-notes/vendor-note-drafts-client.tsx`
  and updated `src/app/(dashboard)/accounting/debit-notes/page.tsx` so vendor
  debit-note drafts now appear in a dedicated draft register with direct
  submit-to-canonical actions and canonical review links once prepared;
- updated `src/modules/accounting/service.ts` so vendor-note listings now
  include original purchase-invoice references for AP correction lineage.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/accounting/debit-notes/page.tsx' 'src/app/(dashboard)/accounting/debit-notes/new/page.tsx' 'src/app/(dashboard)/accounting/debit-notes/vendor-note-drafts-client.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted `git diff --check` for the touched debit-note files: passed, aside
  from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends even
  though the local app itself is healthy;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by the
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- recurring-bill, vendor-credit, expense, and settlement parity are still open
  in 9.15 and should be the next targets.

## 2026-08-01 Accounting purchase-order continuation

Started the 9.15 Purchases lifecycle work by turning purchase orders into a
true supplier-side Accounting workflow with draft purchase-invoice conversion.

Delivered:

- added additive purchase-order lineage persistence in `prisma/schema.prisma`
  plus
  `prisma/migrations/20260801000250_accounting_phase9_purchase_order_purchase_invoice_lineage/migration.sql`;
- added `src/modules/accounting/purchase-orders.ts` and
  `src/modules/accounting/purchase-order-actions.ts` so Accounting can now
  load supplier-aware purchase-order detail and convert eligible purchase
  orders into normal draft purchase invoices with duplicate prevention and an
  explicit mixed-tax safeguard;
- added `src/app/(dashboard)/accounting/purchase-orders/[id]/page.tsx` and
  `src/app/(dashboard)/accounting/purchase-orders/[id]/detail-client.tsx` so
  the Monolith now exposes supplier terms, order lines, linked-bill lineage,
  and one-click draft-bill conversion from the Accounting side;
- updated `src/app/(dashboard)/accounting/_components/commercial-documents-page.tsx`
  and `src/modules/crm/service.ts` so purchase-order rows now show the supplier
  instead of a customer account and expose a review action into the new detail
  route;
- updated `src/components/monolith/accounting-workspace.tsx` so
  `/accounting/purchase-orders/[id]` has dedicated route metadata.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/purchase-orders.ts' 'src/modules/accounting/purchase-order-actions.ts' 'src/app/(dashboard)/accounting/purchase-orders/[id]/page.tsx' 'src/app/(dashboard)/accounting/purchase-orders/[id]/detail-client.tsx' 'src/app/(dashboard)/accounting/_components/commercial-documents-page.tsx' 'src/components/monolith/accounting-workspace.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed.

Open follow-up:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends even
  though the local app itself is healthy;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by the
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- recurring-bill, vendor-credit, expense, and settlement parity are still open
  in 9.15 and should be the next targets.

## 2026-08-01 Accounting customer-advance and sales-receipt continuation

Continued the 9.14 Sales lifecycle work by closing the remaining
retainer-invoice / customer-advance and sales-receipt gaps on top of the
canonical customer-receipt flow.

Delivered:

- added additive accounting customer-advance / retainer request persistence in
  `prisma/schema.prisma` plus
  `prisma/migrations/20260801000240_accounting_phase9_customer_advance_requests/migration.sql`;
- added `src/modules/accounting/customer-advances.ts` and
  `src/modules/accounting/customer-advance-actions.ts` so Accounting can now
  create customer-advance and retainer requests, summarize linked canonical
  receipt coverage by legacy-payment lineage, generate controlled receipt
  drafts against the remaining balance, and cancel untouched requests;
- added a live Monolith `/accounting/customer-advances` workspace in
  `src/app/(dashboard)/accounting/customer-advances/page.tsx` and
  `src/app/(dashboard)/accounting/customer-advances/customer-advances-client.tsx`
  with request intake, remaining-balance metrics, linked draft/canonical
  receipt lineage, and direct receipt-draft generation into the existing
  payment-entry approval flow;
- added dedicated `/accounting/sales-receipts` and
  `/accounting/sales-receipts/new` entry points, and updated
  `/accounting/customer-receipts` so sales receipts now have an explicit route
  and direct navigation into the customer-advances workspace;
- updated `src/lib/db.ts` so the Prisma singleton refresh guard recognizes the
  new customer-advance delegates;
- updated `tsconfig.json` so repo-wide TypeScript now compiles against stable
  `.next/types` output instead of the earlier corrupted `.next/dev/types`
  artifacts, and `next-env.d.ts` is already aligned with `.next/types`.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/customer-advances.ts' 'src/modules/accounting/customer-advance-actions.ts' 'src/app/(dashboard)/accounting/customer-advances/page.tsx' 'src/app/(dashboard)/accounting/customer-advances/customer-advances-client.tsx' 'src/app/(dashboard)/accounting/sales-receipts/page.tsx' 'src/app/(dashboard)/accounting/customer-receipts/page.tsx' 'src/lib/db.ts' 'src/components/monolith/accounting-workspace.tsx' 'src/modules/accounting/operational-access.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx next typegen`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed;
- targeted `git diff --check` for the touched accounting sales files: passed,
  aside from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends even
  though the local app itself is healthy;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by the
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- 9.15 Purchases lifecycle parity is now the next active Phase 9 target.

## 2026-08-01 Manual journal contact-required enforcement continuation

The manual-journal contact toggle in ledger master is now enforced as a real
data requirement rather than a UI hint only.

Delivered:

- updated
  `src/app/(dashboard)/accounting/journal-entries/new/new-jv-client.tsx` so any
  line whose selected ledger has `allowJournalContact` enabled now marks the
  contact selector as required, blocks draft save when empty, and surfaces a
  matching operator-facing warning;
- updated `src/modules/accounting/service.ts` with shared
  `assertJournalContactRequirements(...)` validation so manual-journal drafts
  reject incomplete contact payloads during create and re-check the same rule
  again before posting older drafts.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted `git diff --check` for the touched manual-journal files: passed,
  aside from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- targeted ESLint including `src/modules/accounting/service.ts` is still
  blocked by that file's pre-existing broad `@typescript-eslint/no-explicit-any`
  backlog rather than this journal-contact change;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/modules/accounting/__tests__/posting-boundary.architecture.test.ts'`
  is still failing on its older unrelated expectation that `service.ts`
  contains `QUOTATION_CONVERSION_GATED`;
- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends even
  though the local app remains healthy.

## 2026-08-01 Accounting quotation draft edit affordance continuation

Standardized the current Monolith draft-edit affordance for the quotation
workspace, which is the draft flow in this area that already has a real update
service behind it.

Delivered:

- added shared `AccountingDraftEditLink` to
  `src/components/monolith/accounting-workspace.tsx` so draft-edit actions use
  a common Monolith button pattern;
- updated `src/app/(dashboard)/accounting/quotations/page.tsx` so the route now
  accepts `?edit={draftId}`, loads that quotation draft, and passes a serialized
  editable payload into the client workspace;
- updated `src/app/(dashboard)/accounting/quotations/quotations-client.tsx` so
  the quotation dialog can open in edit mode, prefill the current draft,
  persist through `updateQuotationAction`, and expose `Edit draft` links in the
  draft register rows;
- updated
  `src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx`
  so draft detail now exposes the same shared `Edit draft` affordance and
  routes back into the register edit dialog.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/components/monolith/accounting-workspace.tsx' 'src/app/(dashboard)/accounting/quotations/page.tsx' 'src/app/(dashboard)/accounting/quotations/quotations-client.tsx' 'src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted `git diff --check` for the touched quotation workspace files:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- only quotation drafts currently have a true draft-update backend in this
  Monolith slice, so other draft-detail pages still need service-layer edit
  support before the same shared edit action can be enabled there without
  misleading operators;
- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends even
  though the local app remains healthy.

## 2026-08-01 HRMS and CRM incentive workspace addition

Added a new cross-module incentive workflow with CRM as the submission desk and
HRMS as the main operating workspace.

Delivered:

- added `IncentiveEntry` in `prisma/schema.prisma` and migration
  `prisma/migrations/20260801000210_add_incentive_entries/migration.sql`;
- added the shared incentive service and validators in
  `src/modules/incentives/service.ts` and
  `src/modules/incentives/validators.ts`;
- added `src/app/api/crm/incentives/route.ts` for CRM list/create and
  `src/app/api/hrms/incentives/route.ts` for HRMS list/update;
- added
  `src/app/(dashboard)/crm/incentives/page.tsx`
  and
  `src/app/(dashboard)/crm/incentives/incentives-client.tsx`
  so CRM users can submit employee incentive inputs;
- added
  `src/app/(dashboard)/hrms/incentives/page.tsx`
  and
  `src/app/(dashboard)/hrms/incentives/incentives-client.tsx`
  so HRMS can perform the main review and status-processing work;
- updated `src/lib/navigation.ts`,
  `src/components/monolith/crm-workspace.tsx`, and
  `src/components/monolith/people-workspace.tsx` so the new CRM route and the
  HRMS `Incentive` subheading are visible and correctly titled.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/components/monolith/crm-workspace.test.tsx' 'src/components/monolith/people-workspace.test.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/crm/incentives/page.tsx' 'src/app/(dashboard)/crm/incentives/incentives-client.tsx' 'src/app/(dashboard)/hrms/incentives/page.tsx' 'src/app/(dashboard)/hrms/incentives/incentives-client.tsx' 'src/app/api/crm/incentives/route.ts' 'src/app/api/hrms/incentives/route.ts' 'src/modules/incentives/service.ts' 'src/modules/incentives/validators.ts' 'src/lib/navigation.ts' 'src/components/monolith/crm-workspace.tsx' 'src/components/monolith/people-workspace.tsx' 'src/components/monolith/crm-workspace.test.tsx' 'src/components/monolith/people-workspace.test.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted `git diff --check` for the incentive files: passed, aside from the
  normal Windows line-ending warnings in the worktree.

Open follow-up:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends even
  though the local app is healthy;
- the first incentive slice intentionally uses CRM reference text plus employee
  selection rather than deep automatic deal-commission calculation logic, so
  richer formula-based payout rules can be added later without reworking the
  new route structure.

## 2026-08-01 HRMS help desk workspace continuation

Replaced the current static `/hrms/helpdesk` notice page with a real Monolith
workspace on top of the existing HR case service.

Delivered:

- added `src/components/hrms/helpdesk-view.tsx`, which loads the current HR
  case register, category FAQs, case detail, and comment timeline from the live
  `/api/hrms/hr-cases` endpoints;
- updated `src/app/(dashboard)/hrms/helpdesk/page.tsx` so the route now
  requires `hrms.helpdesk.read` and renders the new live workspace instead of
  the old informational notice;
- archived the former notice-only route in
  `OLD UI code/src/app/(dashboard)/hrms/helpdesk/page.tsx`.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/hrms/helpdesk/page.tsx' 'src/components/hrms/helpdesk-view.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `git diff --check -- 'src/app/(dashboard)/hrms/helpdesk/page.tsx' 'src/components/hrms/helpdesk-view.tsx' 'OLD UI code/src/app/(dashboard)/hrms/helpdesk/page.tsx' 'docs/ui-migration-status.md' 'docs/ui-migration-handoff.md'`:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends even
  though the local app is healthy;
- the current backend still exposes comment updates only for case follow-up, so
  this slice intentionally does not invent assignment or status-edit controls
  that the service does not support yet.

## 2026-07-31 Accounting quotation lifecycle foundation continuation

Continued the 9.14 Sales lifecycle work by replacing the quotations route's
earlier draft-only behavior with a server-authoritative lifecycle foundation
and a dedicated detail route.

Delivered:

- added `src/modules/accounting/quotations.ts` for quotation draft save/edit,
  clone, approval, send, accept/decline, expiry, audit, and partial
  quotation-to-sales-invoice conversion;
- updated `src/modules/accounting/service.ts` and
  `src/modules/accounting/actions.ts` so the route uses the new lifecycle layer
  and accepts partial conversion quantities;
- updated `src/app/(dashboard)/accounting/quotations/page.tsx` and
  `src/app/(dashboard)/accounting/quotations/quotations-client.tsx` so the
  quotations register now uses route-level RBAC, keeps create-quotation payload
  compatibility, and links into quotation details;
- added
  `src/app/(dashboard)/accounting/quotations/[id]/page.tsx`
  and
  `src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx`
  so quotation approval, dispatch, decision, cancellation, duplication, audit,
  and partial conversion all have a dedicated Monolith detail surface.

Verification on Friday, July 31, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/accounting/quotations/page.tsx' 'src/app/(dashboard)/accounting/quotations/quotations-client.tsx' 'src/app/(dashboard)/accounting/quotations/[id]/page.tsx' 'src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx' 'src/modules/accounting/quotations.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:verify`:
  passed;
- `git diff --check -- 'src/app/(dashboard)/accounting/quotations/page.tsx' 'src/app/(dashboard)/accounting/quotations/quotations-client.tsx' 'src/app/(dashboard)/accounting/quotations/[id]/page.tsx' 'src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx' 'src/modules/accounting/actions.ts' 'src/modules/accounting/service.ts' 'src/modules/accounting/quotations.ts' 'prisma/schema.prisma' 'prisma/migrations/20260731000130_accounting_phase9_quotation_lifecycle_foundation/migration.sql'`:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends even
  though the local app is healthy on `http://127.0.0.1:3000`;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` is currently blocked
  by a locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:safety-scan`
  still reports pre-existing repository findings outside this quotation slice;
- the broader 9.14 through 9.23 lifecycle slices remain open.

## 2026-08-01 Accounting recurring sales-invoice continuation

Continued the 9.14 Sales lifecycle work by replacing the guarded recurring
placeholder with a real recurring sales-invoice profile workspace and
server-authoritative draft generation flow.

Delivered:

- added additive recurring sales-invoice profile, line, and run persistence via
  `prisma/migrations/20260801000230_accounting_phase9_recurring_sales_invoice_profiles/migration.sql`;
- added `src/modules/accounting/recurring-sales-invoices.ts` and
  `src/modules/accounting/recurring-sales-invoice-actions.ts` so recurring
  profiles now support profile creation, deterministic due-date identity,
  generated draft-invoice lineage, skip, pause, resume, cancel, failure
  tracking, and optional email queueing when auto-send is configured;
- updated `src/lib/db.ts` so the Prisma singleton refresh guard picks up the
  new recurring delegates after schema changes;
- replaced `src/app/(dashboard)/accounting/recurring/page.tsx` with a live
  Monolith recurring-invoice workspace and added
  `src/app/(dashboard)/accounting/recurring/recurring-sales-client.tsx`;
- archived the old policy-gate-only recurring route in
  `OLD UI code/src/app/(dashboard)/accounting/recurring/page.tsx`;
- updated `task.md` again so overall/current-slice progress reflects the new
  recurring-invoice completion slice.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/lib/db.ts' 'src/modules/accounting/recurring-sales-invoices.ts' 'src/modules/accounting/recurring-sales-invoice-actions.ts' 'src/app/(dashboard)/accounting/recurring/page.tsx' 'src/app/(dashboard)/accounting/recurring/recurring-sales-client.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed.

Open follow-up:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends even
  though the local app is healthy on `http://127.0.0.1:3000`;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by a
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- the retainer-invoice / customer-advance and sales-receipt gaps in 9.14 are
  still open, followed by the 9.15 purchases lifecycle slice.

## 2026-08-01 Accounting quotation sales-order conversion continuation

Continued the 9.14 Sales lifecycle work by extending the accepted-quotation
conversion path into sales orders, rather than leaving that branch of the spec
open while only draft sales-invoice conversion existed.

Delivered:

- added additive quote-lineage fields to `CrmInvoice` and `CrmInvoiceItem`
  plus
  `prisma/migrations/20260801000220_accounting_phase9_quote_sales_order_lineage/migration.sql`;
- updated `src/modules/accounting/quotations.ts`,
  `src/modules/accounting/service.ts`, and
  `src/modules/accounting/actions.ts` so accepted quotations can now create
  confirmed `SALES_ORDER` records with quote snapshot lineage, copied line
  metadata, duplicate-prevention for exhausted quantities, and the same
  converted-quantity / quotation-status updates already used by invoice
  conversion;
- updated
  `src/app/(dashboard)/accounting/quotations/[id]/page.tsx`
  and
  `src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx`
  so the quotation detail route now offers sales-order conversion to users with
  `crm.invoice.manage`, alongside the existing draft-invoice conversion path;
- corrected `task.md` so the Phase 9 progress bars, current-slice label, and
  next-target narrative now reflect the active 9.14 state instead of the stale
  9.13-only view.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/quotations.ts' 'src/app/(dashboard)/accounting/quotations/[id]/page.tsx' 'src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed;
- `git diff --check -- 'prisma/schema.prisma' 'prisma/migrations/20260801000220_accounting_phase9_quote_sales_order_lineage/migration.sql' 'src/modules/accounting/quotations.ts' 'src/modules/accounting/service.ts' 'src/modules/accounting/actions.ts' 'src/app/(dashboard)/accounting/quotations/[id]/page.tsx' 'src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx' 'task.md'`:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends even
  though the local app is healthy on `http://127.0.0.1:3000`;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by a
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- linting `src/modules/accounting/actions.ts` and
  `src/modules/accounting/service.ts` still surfaces pre-existing
  `@typescript-eslint/no-explicit-any` debt outside the newly added sales-order
  conversion logic itself;
- the broader 9.14 recurring-invoice, retainer-invoice, and sales-receipt gaps,
  followed by the 9.15 purchases lifecycle slice, remain open.

## 2026-08-01 Accounting quotation delivery and portal continuation

Continued the 9.14 Sales lifecycle work by wiring quotation delivery into the
existing email queue and customer portal contracts, then adding a customer
portal quotations surface so portal-published quotations can actually be
reviewed and decided by the customer.

Delivered:

- updated `src/modules/accounting/quotations.ts` so quotation send now
  resolves customer email recipients for `EMAIL`, requires an active
  `AccountingPortalPublicationProfile` and active `CustomerPortalUser`
  recipients for `PORTAL`, and records explicit manual evidence for `MANUAL`;
- updated
  `src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx`
  so operators can choose the delivery mode before sending a quotation;
- added `src/modules/customer-portal/accounting-quotations.ts` plus
  `src/app/customer-portal/quotations/page.tsx` and
  `src/app/customer-portal/quotations/[id]/page.tsx` so portal-published
  quotations are visible to the customer;
- added `src/app/customer-portal/quotations/[id]/quotation-decision-panel.tsx`
  and updated `src/modules/customer-portal/accounting-quotations.ts` plus
  `src/modules/customer-portal/actions.ts` so portal recipients can accept or
  decline quotations directly from the detail view with portal-safe lifecycle
  and customer-scope checks;
- updated `src/app/customer-portal/_components/client-actions.tsx` and the
  portal quotation notification link target so the customer portal shell now
  exposes Quotations as a first-class destination and notifications deep-link
  into the published quotation itself.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/quotations.ts' 'src/modules/customer-portal/accounting-quotations.ts' 'src/app/customer-portal/quotations/page.tsx' 'src/app/customer-portal/quotations/[id]/page.tsx' 'src/app/customer-portal/_components/client-actions.tsx' 'src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/customer-portal/accounting-quotations.ts' 'src/modules/customer-portal/actions.ts' 'src/app/customer-portal/quotations/[id]/page.tsx' 'src/app/customer-portal/quotations/[id]/quotation-decision-panel.tsx' 'src/modules/accounting/quotations.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed.

Open follow-up:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends even
  though the local app is healthy on `http://127.0.0.1:3000`;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by a
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- the broader 9.14 through 9.23 lifecycle slices remain open.

## 2026-07-31 Accounting quotations shared-master continuation

Continued the 9.14 Sales lifecycle work by wiring the quotations workspace into
the shared Accounting payment-term and item-master foundations.

Delivered:

- updated `src/app/(dashboard)/accounting/quotations/page.tsx` so the route now
  fetches live `AccountingPaymentTerm` records;
- updated `src/app/(dashboard)/accounting/quotations/quotations-client.tsx`
  so quotation creation now captures shared payment terms and reuses the
  persisted `AccountingItemMaster` catalogue for line suggestions plus default
  rate/GST behavior;
- reused the same live item catalogue for the customer-note line editor on
  that workspace.

Verification on Friday, July 31, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/accounting/quotations/page.tsx' 'src/app/(dashboard)/accounting/quotations/quotations-client.tsx'`:
  passed;
- `git diff --check -- 'src/app/(dashboard)/accounting/quotations/page.tsx' 'src/app/(dashboard)/accounting/quotations/quotations-client.tsx'`:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Browser verification finding:

- the local app is healthy on `http://127.0.0.1:3000`, but the Codex browser
  runtime currently reports zero available browser backends (`agent.browsers.list()`
  returned `[]` after successful runtime setup), so authenticated browser
  verification cannot be completed from this session;
- this is a session-environment limitation, not a repo-side app-start failure.

Open follow-up:

- the broader 9.14 through 9.23 lifecycle slices remain open;
- this still does not complete Slices 9.13 through 9.23.

## 2026-07-31 Accounting quotation conversion continuation

Started the 9.14 Sales lifecycle continuation by replacing the current gated
quotation conversion with a working draft sales-invoice conversion path.

Delivered:

- updated `src/modules/accounting/service.ts` so an open quotation can now
  convert into a draft sales invoice, mark itself converted, and write an
  audit event, provided its lines share a single GST rate;
- updated `src/app/(dashboard)/accounting/quotations/page.tsx` so the
  quotations register reads the persisted subtotal field correctly;
- updated `src/app/(dashboard)/accounting/quotations/quotations-client.tsx`
  so newly created quotations normalize into the expected table row shape and
  the Convert action is exposed for the actual open/draft statuses.

Verification on Friday, July 31, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/accounting/quotations/page.tsx' 'src/app/(dashboard)/accounting/quotations/quotations-client.tsx'`:
  passed;
- `git diff --check -- 'src/modules/accounting/service.ts' 'src/app/(dashboard)/accounting/quotations/page.tsx' 'src/app/(dashboard)/accounting/quotations/quotations-client.tsx'`:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends, even
  though the local app is healthy on `http://127.0.0.1:3000`;
- quotation conversion is still intentionally limited to uniform GST-rate line
  mixes in this slice;
- this still does not complete Slices 9.13 through 9.23.

## 2026-07-31 Accounting invoice payment-method continuation

Continued the active Accounting Phase 9.13 shared-commercial work by wiring the
Accounting payment-method master into invoice and note entry, then persisting
the selected value on the canonical draft records.

Delivered:

- added additive `paymentMethod` schema and migration coverage for
  `SalesInvoice`, `PurchaseInvoice`, `CustomerNote`, and `VendorNote`;
- updated `src/components/monolith/accounting-invoice-form.tsx` so invoice and
  note entry now exposes live `AccountingPaymentMethod` options;
- updated
  `src/app/(dashboard)/accounting/sales-invoices/new/page.tsx`,
  `src/app/(dashboard)/accounting/purchase-invoices/new/page.tsx`,
  `src/app/(dashboard)/accounting/credit-notes/new/page.tsx`, and
  `src/app/(dashboard)/accounting/debit-notes/new/page.tsx`
  plus their current client wrappers so those routes fetch and pass
  `AccountingPaymentMethod` records into the shared form;
- updated `src/modules/accounting/service.ts` and
  `src/modules/accounting/validators.ts` so the selected payment method is
  accepted and stored on the canonical draft invoice/note records.

Verification on Friday, July 31, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run db:generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/components/monolith/accounting-invoice-form.tsx' 'src/app/(dashboard)/accounting/sales-invoices/new/page.tsx' 'src/app/(dashboard)/accounting/purchase-invoices/new/page.tsx' 'src/app/(dashboard)/accounting/credit-notes/new/page.tsx' 'src/app/(dashboard)/accounting/debit-notes/new/page.tsx' 'src/app/(dashboard)/accounting/sales-invoices/new/new-invoice-client.tsx' 'src/app/(dashboard)/accounting/purchase-invoices/new/new-invoice-client.tsx' 'src/app/(dashboard)/accounting/credit-notes/new/new-note-client.tsx' 'src/app/(dashboard)/accounting/debit-notes/new/new-note-client.tsx'`:
  passed;
- `git diff --check -- 'prisma/schema.prisma' 'prisma/migrations/20260731000120_accounting_phase9_invoice_note_payment_methods/migration.sql' 'src/modules/accounting/validators.ts' 'src/modules/accounting/service.ts' 'src/components/monolith/accounting-invoice-form.tsx' 'src/app/(dashboard)/accounting/sales-invoices/new/page.tsx' 'src/app/(dashboard)/accounting/purchase-invoices/new/page.tsx' 'src/app/(dashboard)/accounting/credit-notes/new/page.tsx' 'src/app/(dashboard)/accounting/debit-notes/new/page.tsx' 'src/app/(dashboard)/accounting/sales-invoices/new/new-invoice-client.tsx' 'src/app/(dashboard)/accounting/purchase-invoices/new/new-invoice-client.tsx' 'src/app/(dashboard)/accounting/credit-notes/new/new-note-client.tsx' 'src/app/(dashboard)/accounting/debit-notes/new/new-note-client.tsx'`:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends, even
  though the local app is healthy on `http://127.0.0.1:3000`;
- effective-dated pricing/rate consumption is still not fully wired through the
  shared-commercial document-entry surfaces;
- this still does not complete Slices 9.13 through 9.23.

## 2026-07-31 Accounting commercial document shared-master continuation

Continued the active Accounting Phase 9.13 shared-commercial work by wiring the
Accounting payment-term and price-list masters into sales-order and
purchase-order entry.

Delivered:

- updated `src/app/(dashboard)/accounting/_components/commercial-document-form-page.tsx`
  so the commercial-document page now fetches live `AccountingPaymentTerm` and
  `AccountingPriceList` records;
- updated `src/components/monolith/accounting-commercial-document-form.tsx`
  so the Accounting commercial document form uses live payment terms for
  due-date behavior and selected price lists for default line pricing and
  currency behavior;
- updated `src/modules/crm/actions.ts` so submitted commercial documents now
  persist selected terms through the existing `CrmInvoice.terms` field.

Verification on Friday, July 31, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/accounting/_components/commercial-document-form-page.tsx' 'src/components/monolith/accounting-commercial-document-form.tsx'`:
  passed;
- `git diff --check -- 'src/app/(dashboard)/accounting/_components/commercial-document-form-page.tsx' 'src/components/monolith/accounting-commercial-document-form.tsx' 'src/modules/crm/actions.ts'`:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- browser-level authenticated verification is still unavailable;
- this still does not complete Slices 9.13 through 9.23.

## 2026-07-31 Accounting invoice shared-master continuation

Continued the active Accounting Phase 9.13 shared-commercial work by wiring the
new Accounting payment-term and unit-of-measure masters into the live invoice
and note entry routes.

Delivered:

- updated `src/components/monolith/accounting-invoice-form.tsx` so the Terms
  selector and due-date calculation use live `AccountingPaymentTerm` options,
  with the earlier hardcoded terms retained only as fallback defaults;
- updated
  `src/app/(dashboard)/accounting/sales-invoices/new/page.tsx`,
  `src/app/(dashboard)/accounting/purchase-invoices/new/page.tsx`,
  `src/app/(dashboard)/accounting/credit-notes/new/page.tsx`, and
  `src/app/(dashboard)/accounting/debit-notes/new/page.tsx`
  so those routes now source units from `AccountingUnitOfMeasure` and terms
  from `AccountingPaymentTerm`;
- passed the new shared-master props through the current invoice/note client
  wrappers so the Monolith document-entry surfaces consume persisted Accounting
  commercial configuration rather than the older generic unit source and
  hardcoded term list.

Verification on Friday, July 31, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/components/monolith/accounting-invoice-form.tsx' 'src/app/(dashboard)/accounting/sales-invoices/new/page.tsx' 'src/app/(dashboard)/accounting/purchase-invoices/new/page.tsx' 'src/app/(dashboard)/accounting/credit-notes/new/page.tsx' 'src/app/(dashboard)/accounting/debit-notes/new/page.tsx' 'src/app/(dashboard)/accounting/sales-invoices/new/new-invoice-client.tsx' 'src/app/(dashboard)/accounting/purchase-invoices/new/new-invoice-client.tsx' 'src/app/(dashboard)/accounting/credit-notes/new/new-note-client.tsx' 'src/app/(dashboard)/accounting/debit-notes/new/new-note-client.tsx'`:
  passed;
- `git diff --check -- 'src/components/monolith/accounting-invoice-form.tsx' 'src/app/(dashboard)/accounting/sales-invoices/new/page.tsx' 'src/app/(dashboard)/accounting/purchase-invoices/new/page.tsx' 'src/app/(dashboard)/accounting/credit-notes/new/page.tsx' 'src/app/(dashboard)/accounting/debit-notes/new/page.tsx' 'src/app/(dashboard)/accounting/sales-invoices/new/new-invoice-client.tsx' 'src/app/(dashboard)/accounting/purchase-invoices/new/new-invoice-client.tsx' 'src/app/(dashboard)/accounting/credit-notes/new/new-note-client.tsx' 'src/app/(dashboard)/accounting/debit-notes/new/new-note-client.tsx'`:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- browser-level authenticated verification is still unavailable;
- effective-dated pricing and price-list lifecycle consumption are still not
  fully wired through document-entry and later lifecycle flows.

## 2026-07-31 Accounting item master persistence continuation

Continued the active Accounting Phase 9.13 shared-commercial work by replacing
the current Monolith Accounting item-master path with a persisted,
API-backed catalogue.

Delivered:

- added additive `AccountingItemMaster` Prisma schema and migration foundation;
- added authenticated item-master API handlers in
  `src/app/api/accounting/items/route.ts` and
  `src/app/api/accounting/items/[id]/route.ts`;
- added `src/lib/items/accounting-item-client.ts` as the shared client fetch
  helper for the new Accounting item-master surface;
- updated `src/components/monolith/accounting-items.tsx` so the register,
  create form, detail view, import flow, status updates, and delete action use
  the persisted item master;
- updated `src/components/monolith/accounting-invoice-form.tsx` and
  `src/components/monolith/accounting-commercial-document-form.tsx` so their
  live item suggestions and default rate/unit behavior come from the persisted
  Accounting catalogue instead of `src/lib/items/item-store.ts` and
  `src/lib/items/mock-data.ts`.

Verification on Friday, July 31, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run db:generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint src/components/monolith/accounting-items.tsx src/components/monolith/accounting-invoice-form.tsx src/components/monolith/accounting-commercial-document-form.tsx src/app/api/accounting/items/route.ts src/app/api/accounting/items/[id]/route.ts src/lib/items/accounting-item-client.ts src/modules/accounting/item-master.ts src/lib/db.ts`:
  passed;
- `git diff --check -- src/components/monolith/accounting-items.tsx src/components/monolith/accounting-invoice-form.tsx src/components/monolith/accounting-commercial-document-form.tsx src/app/api/accounting/items/route.ts src/app/api/accounting/items/[id]/route.ts src/lib/items/accounting-item-client.ts src/modules/accounting/item-master.ts src/lib/db.ts prisma/schema.prisma prisma/migrations/20260801000110_accounting_phase9_item_master_foundation/migration.sql`:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- no browser-level authenticated verification has been run because the in-app
  browser session is still unavailable;
- this does not complete Slices 9.13 through 9.23: deeper shared-commercial
  parity, full Sales and Purchases lifecycle coverage, approvals expansion,
  communications, reporting, API surface, and specification-derived tests are
  still open.

## 2026-07-31 item-table currency and exchange-rate alignment

Updated the current live item-table layouts so Currency and Exchange Rate are
explicit columns and the row controls stay on one line instead of stacking
under `Item Details`.

Delivered:

- rebuilt the shared Accounting item table in
  `src/components/monolith/accounting-invoice-form.tsx` so `Currency` and
  `Exchange Rate` now sit in their own columns beside `Item Details`, `Unit`,
  `Quantity`, `Rate`, `Tax`, `TDS`, and `Amount`;
- kept the Accounting item-table cells, headers, amount values, and unit helper
  action in single-line formatting;
- applied matching single-line column tightening to the CRM quote item table in
  `src/app/(dashboard)/crm/quotes/_components/LineItemsTable.tsx` and the CRM
  invoice item table in
  `src/app/(dashboard)/crm/invoices/invoice-form.tsx`.

Verification on Friday, July 31, 2026:

- `git diff --check -- 'src/components/monolith/accounting-invoice-form.tsx' 'src/app/(dashboard)/crm/quotes/_components/LineItemsTable.tsx' 'src/app/(dashboard)/crm/invoices/invoice-form.tsx'`:
  passed, aside from the usual Windows line-ending warnings in this worktree;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/components/monolith/accounting-invoice-form.tsx' 'src/app/(dashboard)/crm/quotes/_components/LineItemsTable.tsx' 'src/app/(dashboard)/crm/invoices/invoice-form.tsx'`:
  is still red on pre-existing lint debt in these legacy item-form files,
  including existing `no-explicit-any` and `react-hooks/set-state-in-effect`
  findings not introduced by this slice.

## 2026-07-31 accounting sidebar submenu format correction

Fixed the current Accounting shell regression where grouped submenu items no
longer matched the standard sidebar format after subsection headings were
introduced.

Delivered:

- widened the shared sidebar submenu selectors in
  `src/styles/monolith-system.css` so links inside
  `.mnx-sidebar-subnav-item` render with the same grid, spacing, hover, and
  active states as the older direct-child submenu links;
- updated the shared shell safeguard test in
  `src/app/(dashboard)/_components/dashboard-shell-layout.test.ts` to assert
  the grouped submenu wrapper and its CSS coverage.

Verification on Friday, July 31, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/app/(dashboard)/_components/dashboard-shell-layout.test.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/_components/dashboard-shell-layout.test.ts' 'src/styles/monolith-system.css'`:
  returned only the existing expected warning that the raw CSS file is ignored
  by the active ESLint config;
- `git diff --check -- 'src/styles/monolith-system.css' 'src/app/(dashboard)/_components/dashboard-shell-layout.test.ts'`:
  passed, aside from the normal Windows line-ending warnings in this worktree.

## 2026-07-31 Accounting Phase 9.13 restart and traceability correction

Re-opened the Accounting Phase 9 continuation after confirming the prior
`task.md` was stale: it marked Phase 9 complete at Slice 9.12, while the
attached continuation specification explicitly defines Slices 9.13 through 9.23
as remaining work.

Delivered:

- read the attached
  `Accounting_Software_Build_Specification (1).docx` end to end through local
  DOCX XML extraction;
- replaced the stale `task.md` with an in-progress tracker that now reflects
  9.13 as the active slice and lists 9.14 through 9.23 as remaining;
- created
  `docs/accounting/phase-9-specification-traceability.md` as the required
  continuation traceability record for the attached specification;
- added additive Prisma schema and migration foundation for shared commercial
  master data:
  `AccountingPaymentTerm`,
  `AccountingPaymentMethod`,
  `AccountingPriceList`,
  `AccountingUnitOfMeasure`, and
  `AccountingReportingTag`;
- wired those five new masters into the existing
  `src/modules/accounting/configuration-admin.ts`,
  `src/modules/accounting/configuration-admin-actions.ts`, and
  `src/app/(dashboard)/accounting/configuration/admin/page.tsx` flow so the
  admin workspace now has persisted Monolith forms and registers for them.

Files:

- `prisma/schema.prisma`
- `prisma/migrations/20260801000100_accounting_phase9_shared_commercial_masters_foundation/migration.sql`
- `docs/accounting/phase-9-specification-traceability.md`
- `task.md`

Verification on Friday, July 31, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run db:generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted ESLint for the touched configuration-admin files: passed;
- targeted `git diff --check` for the four touched files: passed.

Open follow-up:

- the current `/accounting/items` flow still uses the client-side
  `src/lib/items/item-store.ts` mock/localStorage path, so item-master parity
  remains a primary 9.13 blocker for the later Sales and Purchases slices;
- no claim is made yet that Slices 9.13 through 9.23 are complete.

## 2026-07-31 Accounting configuration admin Phase 9 completion

Completed the remaining Accounting Phase 9 continuation inside the already
migrated `/accounting/configuration/admin` workspace.

Delivered:

- Slice 9.10 cross-module integrations:
  - added canonical `AccountingSourceMappingProfile`;
  - surfaced read-only integration inbox, integration outbox, posting-attempt,
    and payroll-run-snapshot evidence in the admin workspace.
- Slice 9.11 reports and period close:
  - added canonical `AccountingPeriodCloseRun`;
  - added canonical `AccountingReportExportProfile`.
- Slice 9.12 portals, exports, and polish:
  - added canonical `AccountingPortalPublicationProfile`;
  - extended the existing Monolith configuration-admin route with the final
    Phase 9 control sections so all Phase 9 configuration surfaces now sit in
    one workspace.

Files:

- `prisma/schema.prisma`
- `prisma/migrations/20260801000040_accounting_phase9_close_portal_integration_foundation/migration.sql`
- `src/modules/accounting/configuration-admin.ts`
- `src/modules/accounting/configuration-admin-actions.ts`
- `src/app/(dashboard)/accounting/configuration/admin/page.tsx`
- `task.md`

Verification on Friday, July 31, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npm run db:generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- targeted ESLint for the touched Accounting configuration files: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:verify`:
  passed.

Notes:

- this is a continuation inside an already migrated route, not a new route
  migration batch;
- no production deployment was performed;
- no historical accounting migration was run.

## 2026-07-31 payments draft visibility and approval flow

Aligned the active Accounting payments flow with the reported operator issue:
saved drafts were being written to legacy `PaymentEntry` records but were not
visible on `/accounting/payments`, which only listed canonical
`AccountingPayment` rows.

Delivered:

- `/accounting/payments` now renders a `Draft payments` section using the
  existing shared legacy-draft register so editable payment drafts appear in the
  same workspace as canonical payments;
- `/accounting/payment-entries/new` now exposes explicit `Save as draft` and
  `Submit for approval` actions;
- direct submit now creates the legacy draft, submits it immediately through the
  existing adapter flow, and routes to the canonical payment detail page;
- draft create/submit actions now also revalidate `/accounting/payments`, so the
  workspace refreshes immediately after either action.

Files:

- `src/app/(dashboard)/accounting/payments/page.tsx`
- `src/app/(dashboard)/accounting/payment-entries/new/new-payment-client.tsx`
- `src/modules/accounting/actions.ts`

Verification:

- targeted ESLint for the touched files is still pending in this slice;
- no in-app browser instance is available, so authenticated visual verification
  remains blocked.

## 2026-07-31 Accounting configuration admin 9.9 follow-up

Extended the existing migrated `/accounting/configuration/admin` workspace for
Accounting Phase 9.9 customer/vendor finance controls. This is a continuation
inside an already migrated route, not a new route migration batch.

Delivered:

- added canonical `AccountingCustomerProfile` and `AccountingVendorProfile`
  schema foundations plus additive migrations for finance-owned CRM
  counterparty extensions;
- added contained configuration-admin save/query wiring for receivable/payable
  control accounts, currency, credit/payment terms, hold states, policy
  versions, statement-delivery mode, and optional vendor tax-profile linkage;
- added matching Monolith admin sections and tables on
  `/accounting/configuration/admin` without introducing any alternate customer,
  vendor, AR, or AP posting path.

Verification on Friday, July 31, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npm run db:generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- targeted ESLint for the touched Accounting configuration files: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:verify`:
  passed.

Blocked:

- full `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`
  is currently red in untouched files:
  `src/app/(dashboard)/accounting/accounts/accounts-client.tsx`,
  `src/app/(dashboard)/accounting/accounts/page.tsx`, and
  `src/modules/accounting/service.ts`;
- those TypeScript errors are outside the 9.9 files changed in this slice and
  should be treated as concurrent or pre-existing branch drift unless the next
  slice explicitly takes them on.

## Current state

- Branch: `main`.
- Final combined route inventory: **229 discovered, 228 migrated, 229
  source/type/test/build verified, 0 migration routes remaining**, across 14
  layouts.
- Protected reference: `/dashboard` was verified without redesign and is the
  one discovered route excluded from the migrated count.
- The production-browser audit covers the 213-route final-audit baseline. The
  16 later Accounting Phase 5 routes retain their documented authenticated
  theme/viewport evidence gap because no attached browser was available.
- All 12 customer portal routes now use the shared production portal shell,
  workspace compositions, theme provider, tables, forms, and mobile navigation.
- Both employee invitation routes now use the shared production public shell;
  the invitation validation, password policy, API calls, and redirects are
  unchanged.
- Legacy authenticated shells, duplicate data table/button components, unused
  landing/HRMS visual systems, obsolete theme providers/classes, Purple theme,
  Kiona font loading, and active legacy CSS compatibility selectors were
  removed after archival.
- The final source verifier and all eight module source verifiers pass.
- Production TypeScript and focused merge ESLint pass. The guarded optimized
  production build generates all 342 static pages.
- Production Playwright passes 60 checks across 17 module families, Light,
  Night, Violet, 1440 px desktop, and 390 px mobile coverage. It checks route
  ownership, the live Admin production catalogue, overflow, one-scroller
  boundaries, mobile navigation, theme tokens, page exceptions, and HTTP 500s.
- The combined full test suite was rerun against guarded staging: 410
  tests pass and three pre-existing CHA integration expectations remain red.
  Repository-wide lint was also run and retains the existing business-code
  backlog; no final-audit scoped lint finding remains.
- Browser evidence is stored in
  `artifacts/ui-migration/final-runtime/verification.json` with representative
  screenshots.

## Production component catalogue

The obsolete design-decision showcase at `/admin/design-system` was replaced
from source, not reskinned.

Implementation:

1. The catalogue imports production module namespaces and derives its complete
   index from their runtime exports.
2. It covers AppShell/theme, foundation, workspace, shared async state, People,
   Performance/Learning, CHA, Accounting, CRM, Communication, Admin, and
   public/authentication composition groups.
3. It renders real production primitives and representative module
   compositions, including menus, filters, warnings, dialogs, tables, uploads,
   summaries, details, status, public surfaces, and all 23 shared/module state
   variants.
4. `MonolithThemePicker` is now shared by the AppShell and catalogue. The
   catalogue intentionally exposes Light, Night, and Violet while using the
   shell's existing root classes and `localStorage.theme` persistence.
5. The obsolete `.mnx-showcase-*` CSS and
   `docs/design-system-showcase.md` were removed.

Backup:

- `OLD UI code/legacy-ui-before-admin-design-system-catalogue-4f93df4.zip`;
- source commit `4f93df4`;
- 38,803 bytes;
- SHA-256
  `643FF25A031F1B8ED7A50F6A04E643564BB77F698A817EF586CD32ACDEC82E34`;
- checksum, size, and required entries pass through
  `scripts/verify-monolith-design-system-catalogue.mjs`.

Verification:

- static catalogue/import/state/theme/archive gate: passed;
- route audit: 211 pages, 14 layouts, 198 migrated, 12 pending;
- scoped ESLint: passed;
- focused and full production TypeScript with the required heap: passed;
- 39 focused tests across 12 suites: passed;
- production build and all 315 application pages: passed;
- 9 authenticated Light/Night/Violet × desktop/tablet/mobile checks: passed;
- shared theme selection and persistence, 207 unique runtime components,
  module state selection, dialog open/Escape behavior, semantic theme tokens,
  application errors, and horizontal overflow: passed;
- 9 screenshots and
  `artifacts/ui-migration/design-system-catalogue/verification.json`: reviewed;
- full repository lint remains red on the existing 1,429-error business/module
  backlog; no catalogue-scoped lint finding remains;
- the build retains the six existing non-fatal broad filesystem/NFT trace
  warnings.

## Authentication and Miscellaneous route inventory

Repository page discovery, not navigation links, found exactly:

- `/`
- `/login`
- `/setup`
- `/verify/[id]`
- `/google-chat-link`

## Batch 007 implementation record

1. Archived the complete active legacy presentation before replacement in
   `OLD UI code/legacy-ui-before-monolith-auth-misc-db4bc60.zip`, then made a
   supplemental pre-change archive for the shared ScrollNavigator.
2. Added `src/components/monolith/public-workspace.tsx` as the centralized
   public shell, brand, stage, panel, header, inset, action, status, detail,
   and footer composition layer.
3. Rebuilt credential/Google SSO login, one-time organization setup, public
   secure-document verification, Google Chat account linking, and root module
   control from shared Monolith production components.
4. Preserved all authentication callbacks, remember-me behavior, session
   cleanup, root-account authorization, module-toggle PATCH operations, setup
   validation/API handling, verification reads and privacy masking, link-token
   verification/replacement, redirects, and error behavior.
5. Removed the obsolete 1,416-line login stylesheet and unused login visual
   type module. Isolated legacy global form rules from the public shell and
   suppressed the global ScrollNavigator only on this route family.
6. Added semantic Light/Night/Violet public styling and responsive behavior at
   desktop, tablet, and mobile widths without inline fixed-palette colors.
7. Added repeatable static/archive and production Playwright verifiers and
   regenerated the exhaustive route audit.

Backup evidence:

- Primary archive: 13 files, 62,758 bytes, SHA-256
  `7A958A708AA5CBCAC2797E9BA59E2CAE2AC2233573C8310AD9CC6F62C0A05C8B`.
- Supplemental ScrollNavigator archive: 1 file, 2,339 bytes, SHA-256
  `90B173D7BB29187683E4C7277D0E83F9B0F09F7FE65F0772FC5B4DD6D67ED84C`.
- Exact paths, counts, sizes, checksums, and required entries pass through
  `scripts/verify-monolith-auth-misc-ui.mjs`.

Verification evidence:

- static route/presentation/archive/protected-behavior verifier: passed;
- scoped ESLint for every changed TypeScript/TSX/MJS source: passed;
- focused and production TypeScript with the required 8 GB heap: passed;
- 9 focused public-workspace/foundation/workspace tests: passed;
- production build with Prisma generation, Next.js compilation, production
  TypeScript, and all 315 application routes: passed;
- 45 production route/theme/viewport checks: passed across all five routes,
  Light/Night/Violet, and 1440x1000 desktop, 1024x900 tablet, and 390x844
  mobile;
- safe login validation/password reveal and mocked Google Chat link-success
  interactions: passed;
- reversible public verification fixture cleanup: passed;
- 45 screenshots and
  `artifacts/ui-migration/auth-misc/verification.json`: reviewed.

The production build retains six existing non-fatal broad filesystem/NFT trace
warnings in HRMS/customer-portal code and `next.config.ts`. Repository-wide
`npm run lint -- --quiet` retains the documented pre-existing seed,
maintenance-script, hook-effect, and unrelated business-module backlog; Batch
007 scoped lint is clean.

## Communication, Admin, and Recruit route inventory

Repository discovery—not sidebar links—found:

- Communication: `/communication`, `/communication/calendar`,
  `/communication/chat`, `/communication/drive`,
  `/communication/google-chat-live-view`, `/communication/job-spaces`,
  `/communication/mail`, `/communication/meetings`, `/communication/search`,
  and `/communication/settings`.
- Admin: `/admin`, `/admin/data-tools`, `/admin/design-system`,
  `/admin/google-chat`, `/admin/notifications`, `/admin/passkeys`,
  `/admin/roles`, `/admin/sessions`, `/admin/settings`, and
  `/admin/simulation`.
- Recruit: all 15 routes rooted at `/hrms/recruit`, including audit, career,
  applications, assistant, jobs, profile, resumes, employer applications,
  candidates/new, jobs/new, and settings. These were already verified in
  Batch 002 and were re-tested without source changes.

## Batch 006 implementation record

1. Archived all active legacy Communication/Admin visual source before
   replacement.
2. Activated exact Communication/Admin paths in the shared Monolith shell and
   added centralized workspace frames, metadata, local navigation, semantic
   controls/tables, and asynchronous states.
3. Rebuilt the Communication overview, calendar, meetings, Drive, search,
   job spaces, live-view fallback/diagnostics, settings, Mail, and Chat
   presentation while preserving connected Google APIs and job workflows.
4. Rebuilt Admin overview, data import, Google Chat monitoring, notifications,
   passkeys, roles, sessions, settings, and simulation presentation while
   preserving RBAC, actions, validation, destructive confirmations, and data
   operations.
5. Replaced Mail/Chat route-local overlays with the shared focus-managed dialog
   layer and removed the obsolete Communication navbar from active source.
6. Added tablet/mobile behavior for dense Mail/Chat panes and corrected the
   shared Violet active-tab contrast found during screenshot review.
7. Regenerated the exhaustive route audit and added repeatable static and
   authenticated runtime verifiers.

- The expanded HRMS employee profile and its HRMS Settings custom-field
  builder are implemented, migrated to the database, and pass targeted lint,
  production TypeScript, focused tests, and the production build. A new
  interactive visual pass remains pending because the same Browser service
  currently exposes no browser instance.

## HRMS employee profile expansion

Implemented on 2026-07-29:

- `/hrms/employees/[id]` now presents the full editable employee record:
  basic and work information, reporting hierarchy, personal and identity
  details, contacts and addresses, separation, payroll, bank details, work
  experience, education, dependants, system audit fields, roles, and account
  actions.
- Its information sections are compact full-width horizontal cards stacked in
  sequence, using up to four value columns on desktop so short cards no longer
  inherit unused height from larger neighbouring sections.
- `/hrms/employees` now fills the inherited workspace width. Each role card
  uses an explicit nine-column desktop grid for combined employee identity,
  joining date, roles, department, location, employment status, login status,
  annual gross, and actions, with horizontal overflow retained for narrower
  viewports. The toolbar reports the current filtered total.
- Its centralized filter now covers broad employee search, role, branch,
  department, employee status, account status, and onboarding status. The
  broad search includes employee number, designation, organisation assignment,
  and role as well as name and email.
- The adjacent export action opens a shared Monolith dialog for XLS, XLSX,
  CSV, or TSV. The permission-checked server route exports up to 10,000 records
  from the exact current filter query, never includes password data, and
  guards employee-controlled cells against spreadsheet formula execution.
- A shared People Operations account toggle was added for authorised HR users.
  It prevents self-lockout, preserves organisation scoping, and routes account
  disablement through the existing session-revoking user update logic.
- Imported payroll JSON is retained as a non-destructive fallback while new
  edits persist to `EmployeeHrmsProfile` and the established `User` and
  `EmploymentRecord` fields.
- `/hrms/settings` now uses a two-column responsive composition; the new
  employee-profile column manages organisation-scoped text, long-text, number,
  date, select, and yes/no fields.
- Profile update validation enforces tenant-scoped organisation/reporting
  references, custom-field required/type/select contracts, and self-reporting
  prevention. Existing session revocation and appraisal synchronization remain
  active.
- Migration `20260729183000_add_employee_hrms_profiles` was applied
  successfully to the configured database.
- Archive:
  `OLD UI code/legacy-ui-before-hrms-employee-profile-expansion-20260729.zip`,
  9,468 bytes, SHA-256
  `96BB11CA91858C2E76E10D6825CB33CA40B188B4337F85F5465EDF5B77A047BA`.
- Directory archive:
  `OLD UI code/legacy-ui-before-hrms-employee-directory-expansion-20260729.zip`,
  6,845 bytes, SHA-256
  `438C73350E07CB606053F4767A33E173C302E693584E571CCAC1036D65871C0D`.
- Passed with the required 8 GB Node heap: Prisma generation, targeted ESLint,
  `npx tsc --noEmit`, three focused Vitest cases, and `npm run build` (316
  static pages). The build retains the existing non-fatal `next.config.ts` NFT
  trace warning.
- The directory alignment follow-up also passes targeted ESLint, production
  TypeScript, six focused People Operations/profile tests, the static 45-route
  verifier, diff hygiene, and a fresh 316-page production build.
- The filter/export follow-up passes targeted ESLint, production TypeScript,
  12 focused People Operations/profile/export tests, the 45-route verifier,
  and a 317-page production build that includes
  `/api/hrms/employees/export`.
- Browser setup and the one permitted availability query returned no browser
  instance, so interactive save/add-row/custom-field and
  Light/Night/Violet desktop/tablet/mobile checks, including the filter menu,
  export dialog, and a safe test download, must be run when a browser is
  attached.

## Accounting route inventory

Routes were discovered from repository page sources, not sidebar links:

- `/accounting`
- `/accounting/accounts`
- `/accounting/balance-sheet`
- `/accounting/banking`
- `/accounting/general-ledger`
- `/accounting/invoices-sales`
- `/accounting/invoices-sales/new`
- `/accounting/items`
- `/accounting/items/[id]`
- `/accounting/items/new`
- `/accounting/jobs`
- `/accounting/journal-entries`
- `/accounting/journal-entries/[id]`
- `/accounting/journal-entries/new`
- `/accounting/payment-entries`
- `/accounting/payment-entries/[id]`
- `/accounting/payment-entries/new`
- `/accounting/profit-loss`
- `/accounting/purchase-invoices`
- `/accounting/purchase-invoices/[id]`
- `/accounting/purchase-invoices/new`
- `/accounting/purchase-orders`
- `/accounting/purchase-orders/new`
- `/accounting/quotations`
- `/accounting/reports`
- `/accounting/sales-invoices`
- `/accounting/sales-invoices/[id]`
- `/accounting/sales-invoices/new`
- `/accounting/sales-orders`
- `/accounting/sales-orders/new`
- `/accounting/settings`
- `/accounting/trial-balance`

## Implementation record

1. Backed up the legacy Accounting route tree and its active CRM invoice-form,
   CRM delete-button, and shared item visual dependencies before replacement.
2. Activated exact `/accounting` and `/accounting/**` paths in the production
   Monolith shell.
3. Added the shared Accounting layout, route metadata/header, loading and error
   boundaries, metrics, semantic panels, sections, toolbars, forms, details,
   tables, statuses, dialogs, and responsive styles.
4. Replaced every Accounting route's old markup instead of applying a CSS skin.
5. Added centralized specialized components for:
   - sales and purchase invoice forms and details;
   - commercial invoice/order creation and registers;
   - item catalogue, item creation, and item details;
   - Accounting delete actions.
6. Migrated chart-of-accounts hierarchy, banking transfers, job costing,
   journal vouchers, payment allocations, quotations, customer notes,
   statements, registers, report execution/export, and settings.
7. Preserved authentication, organisation context, RBAC, service and Prisma
   reads, server actions, balanced-journal validation, invoice posting,
   payment allocation, note submission, quotation conversion, imports/exports,
   and CRM commercial-document integration.
8. Removed active Accounting imports from the legacy CRM invoice form, legacy
   CRM delete button, and legacy item presentation.
9. Updated the shell route gate, exhaustive route audit generator, route audit,
   migration status, focused workspace test, static verifier, and authenticated
   runtime verifier.

## CRM implementation

1. Discovered all 57 CRM routes by scanning every `src/app/**/page.tsx`; the
   inventory includes the catch-all plus approvals, calls, campaigns,
   contacts, customers, dashboard, deals, documents, efficiency, enquiries,
   events, forecasts, invoices, items, lead sources and JustDial, leads, price
   books, products, projects, purchase and sales orders, quotes, sales inbox,
   services, social, solutions, tasks, tickets, vendors, visits, and VOC.
2. Archived 131 active legacy CRM route, view, shared CRM, and item-presentation
   sources before presentation replacement.
3. Activated exact `/crm` and `/crm/**` paths in the production Monolith shell
   and replaced the legacy CRM layout with the centralized workspace frame.
4. Added centralized CRM route metadata and production components for
   workspace headers, connected metrics, numbered sections, panels, toolbars,
   tabs, actions, fields, controls, tables, record links, statuses, dialogs,
   and permission/configuration/empty/loading/error states.
5. Replaced raw route controls, tables, route-local overlays, fixed-palette
   utilities, inline colors, and legacy CRM visual class families with shared
   Monolith components and semantic theme tokens.
6. Migrated CRM dialogs for approvals, item creation/confirmation, lead
   remarks/conversion/follow-up/interest, perishable details, quote
   confirmation, and the JustDial viewport.
7. Added a scoped semantic boundary to the shared item views and retained the
   specialized Monolith Accounting item compositions from the parallel batch.
8. Removed verified obsolete active CRM visual imports and local page-width
   wrappers. No code in `OLD UI code` or `_design-reference` is compiled or
   imported.
9. Preserved authentication, RBAC/module gates, Prisma and data operations,
   server actions, validation, record lifecycle behavior, approvals, imports,
   notifications, and integrations.
10. Regenerated the exhaustive route audit and added repeatable CRM archive,
    presentation, route, and protected-behavior verification.

## Backup record

Archives:

`OLD UI code/legacy-ui-before-monolith-communication-admin-ed1bf68.zip`

- Source commit: `ed1bf68`.
- Original files: 45, with relative paths retained.
- Size: 130,499 bytes.
- SHA-256:
  `65DDD40D29C8FEA5AF6D86A00F71CBD3E1E4927E18DC5944F9AECF74D2303EC8`.
- Checksum, size, exact file count, and required entries pass through
  `scripts/verify-monolith-communication-admin-ui.mjs`.

`OLD UI code/legacy-ui-before-monolith-accounting-fd1cbe7.zip`

- Source commit: `fd1cbe7`.
- Original files: 68, with relative paths retained.
- ZIP entries including directories: 102.
- Size: 147,861 bytes.
- SHA-256:
  `B6B7D58BB2A20166829C80B1D395A521B30239159C06AC03ABFA9C1574939DFC`.
- Checksum, size, exact file count, and required entries pass through
  `scripts/verify-monolith-accounting-ui.mjs`.

## Accounting key files

- `docs/ui-route-audit.md`: regenerated route-by-route source record.
- `docs/ui-migration-status.md`: batch status, counts, archive, and quality log.
- `scripts/audit-ui-routes.mjs`: recognizes Accounting batch 005.
- `scripts/verify-monolith-accounting-ui.mjs`: route, archive, presentation,
  responsive-style, and protected-workflow static gate.
- `scripts/verify-monolith-accounting-runtime.mjs`: reversible fixtures and
  complete authenticated route/theme/viewport verification.
- `src/components/monolith/accounting-workspace.tsx`: centralized route
  metadata and Accounting production compositions.
- `src/components/monolith/accounting-invoice-form.tsx`: shared sales/purchase
  invoice editor.
- `src/components/monolith/accounting-invoice-detail.tsx`: shared invoice
  details and posting controls.
- `src/components/monolith/accounting-commercial-document-form.tsx`: shared
  CRM-backed invoice/order editor for Accounting aliases.
- `src/components/monolith/accounting-items.tsx`: catalogue register, item
  editor, and details.
- `src/app/(dashboard)/accounting/layout.tsx`: Accounting workspace boundary.
- `src/styles/monolith-system.css`: semantic Accounting theme and responsive
  presentation.

`OLD UI code/legacy-ui-before-monolith-crm-fd1cbe7.zip`

- Source commit: `fd1cbe7`.
- Original files: 131, with relative paths retained.
- Size: 282,113 bytes.
- SHA-256:
  `E24B74587E9D6FC8F596920BCAE7A69738685385B46E975CE94274A149E973C1`.
- Checksum, size, exact listing, and required entries pass through
  `scripts/verify-monolith-crm-ui.mjs`.

Earlier foundation and batch archives remain in `OLD UI code`, including the
uncommitted Batch 004 glass-correction archive.

CHA dialog reference archive:
`OLD UI code/legacy-ui-before-cha-dialog-reference-20260729-fd1cbe7.zip`

- 22 pre-correction CHA/shared floating-surface sources.
- Size: 197,905 bytes.
- SHA-256:
  `EBFB1DB5B9C49479391B94549DC047DABAA699AA13FDF4F10B3635CF638E4F0F`.
- Checksum, exact listing, and required entries pass through the Expense/CHA
  verifier.

## CRM and shared key files

- `docs/ui-route-audit.md`: exhaustive route-by-route source record.
- `docs/ui-migration-status.md`: current counts and verification gates.
- `scripts/audit-ui-routes.mjs`: recognizes all 57 CRM routes as migrated.
- `scripts/verify-monolith-crm-ui.mjs`: archive, route, presentation, semantic
  theme, and protected-behavior source gate.
- `src/components/monolith/crm-workspace.tsx`: centralized CRM metadata and
  workspace/control/table/dialog/state compositions.
- `src/components/monolith/crm-workspace.test.tsx`: shared CRM composition
  contract tests.
- `src/app/(dashboard)/crm/layout.tsx`: CRM workspace boundary.
- `src/app/(dashboard)/crm/loading.tsx` and `error.tsx`: centralized route
  states.
- `src/app/(dashboard)/_components/dashboard-shell-switcher.tsx`: exact CRM
  Monolith-shell activation.
- `src/styles/monolith-system.css`: CRM semantic and responsive presentation.
- `src/components/monolith/cha-workspace.tsx`: centralized CHA modal, custom
  select, native select, filter-menu, warning-popover, and dialog adapters.
- `src/components/cha/create-job-dialog.tsx`: reference-composed create/success
  dialogs and centralized autocomplete surfaces.
- `scripts/verify-monolith-expense-cha-ui.mjs`: exhaustive CHA popup/dropdown,
  behavior, and archive gate.

## Verification record

Passed:

Communication, Admin, and Recruit:

- static route/presentation/archive/protected-behavior verifier for all 20
  Communication/Admin routes and the 19 newly migrated surfaces;
- route audit: 211 pages, 14 layouts, 193 migrated, 17 pending;
- scoped ESLint for all changed production and migration sources;
- production TypeScript with the required 8 GB heap;
- 2 focused shared-workspace tests;
- production build with Prisma generation, Next.js compilation, production
  TypeScript, and all 315 application routes;
- 306 authenticated Playwright checks across 34 Communication, Admin, and
  Recruit routes, all three themes, and desktop/tablet/mobile widths;
- exact paths, workspace ownership, active semantic theme/tokens, standardized
  controls/tables, no legacy visual composition, no application/server errors,
  and no page-level horizontal overflow;
- 81 representative screenshots plus
  `artifacts/ui-migration/communication-admin/verification.json`;
- screenshot review across Light, Night, Violet, desktop, tablet, and mobile;
- `git diff --check`.

The full repository lint command was also executed. It remains red on the
documented pre-existing seed, maintenance-script, and unrelated business-module
backlog; Batch 006 scoped ESLint passes.

Accounting:

- `node scripts/verify-monolith-accounting-ui.mjs`;
- route audit: 211 pages, 13 layouts, 174 migrated, 36 pending;
- targeted ESLint for Accounting routes, shared Accounting components, shell,
  migration scripts, runtime script, and tests;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`;
- 22 tests in 5 focused Accounting/workspace/dialog/shell suites;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`;
- Prisma generation, Next.js compilation, production TypeScript, and 315
  static pages;
- 288 authenticated runtime checks:
  - 32 routes;
  - Light, Night, and Violet;
  - 1440×1000 desktop, 1024×900 tablet, and 390×844 mobile;
  - loaded item, journal, payment, sales-invoice, and purchase-invoice dynamic
    details;
  - exact path, final workspace/header, theme/tokens, standardized controls,
    browser/server errors, legacy composition, and horizontal overflow;
  - mobile quotation-dialog size and Escape dismissal;
  - 72 representative screenshots and
    `artifacts/ui-migration/accounting/verification.json`;
- temporary database fixture cleanup independently confirmed at zero;
- `git diff --check`.

The production build retains six existing non-fatal broad filesystem/NFT trace
warnings in HRMS/customer-portal code and `next.config.ts`. They are outside
the Accounting batch and do not affect compilation or the verified routes.

CRM and shared corrections:

- legacy archive checksum, size, and 131-file listing;
- route audit: 211 pages, 13 layouts, 174 migrated, 36 pending;
- static CRM verifier for all 57 routes and every dynamic route family;
- targeted ESLint for new infrastructure, boundaries, shell, verifier, and
  tests;
- `npx tsc --noEmit -p tsconfig.ui-migration.json`;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`;
- 21 focused tests in 7 suites;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`, including Prisma
  generation, Next.js compilation, production TypeScript, and 315 pages;
- production HTTP smoke for `/crm`, returning the expected authenticated `307`
  login redirect;
- `git diff --check`.

Repository-wide ESLint retains the known business-code backlog. The latest
scan reported 1,616 errors and 497 warnings, with the CRM-scoped scan reporting
222 errors and 98 warnings. Findings are concentrated in pre-existing
`no-explicit-any`, hook-effect, unused-symbol, and related debt in large CRM
lead/enquiry views and service/action modules. New migration infrastructure
passes targeted lint. No business behavior was rewritten merely to hide that
debt.

The build retains the existing non-fatal Turbopack broad file-trace warning
through `next.config.ts` and the customer-portal checklist-file route.

## Merge integration validation

The Accounting and CRM branches were reconciled additively on 2026-07-29.
Both route families remain active in the Monolith shell. Batch 007 subsequently
advanced the generated inventory to 211 pages, 14 layouts, 198 migrated routes,
and 12 pending routes.

Passed on the combined tree with the required 8 GB Node heap:

- Accounting, CRM, and Expense/CHA static migration verifiers;
- targeted ESLint for the merged audit, shell, and CRM infrastructure;
- production TypeScript with `npx tsc --noEmit`;
- 24 tests in 6 Accounting, CRM, CHA, dialog, and shell suites;
- production build, including Prisma generation, Next.js compilation,
  production TypeScript, and all 315 static pages;
- `git diff --check` for both working and staged changes.

The production build retains the six previously documented non-fatal broad
filesystem/NFT trace warnings in HRMS, customer-portal, and `next.config.ts`.

## Important constraints

- Do not redesign `/dashboard`.
- Do not modify Accounting or CRM permissions, validation, server actions,
  integrations, posting rules, or data operations for presentation-only work.
- Do not compile or import from `OLD UI code`.
- Do not compile, import, or modify `_design-reference`.
- Keep Node.js processes at `NODE_OPTIONS=--max-old-space-size=8192`.

## Remaining historical visual blocker

The production application started successfully at
`http://127.0.0.1:3100` with the required 8 GB Node heap. The Browser skill was
initialized against that URL. Browser selection reported `No browser is
available`; after reading the required troubleshooting documentation, the
one-time availability query `agent.browsers.list()` returned `[]`.

That historical connected-browser blocker applies to the earlier CRM and
Expense/CHA verification claims only. It does not apply to Batch 006, whose
local authenticated production Playwright matrix completed successfully.
The following earlier claims remain outstanding:

- Light, Night, Violet, and Purple visual verification for every CHA modal,
  native/custom select, filter, warning, autocomplete, and success surface;
- CHA desktop, tablet, and mobile popup/overflow/focus verification;
- authenticated loaded-state verification for all 57 CRM routes;
- Light, Night, and Violet visual verification;
- desktop, tablet, and mobile responsive verification;
- all 513 route/theme/viewport combinations;
- dynamic contact/customer/deal/enquiry/invoice/item/lead/quote/ticket state;
- dialog, popover, menu, overflow, exact-theme, and application-error runtime
  assertions;
- CRM and Expense/CHA visual-verification commits.

## Next action

Continue the remaining migration program:

1. Attach an in-app Browser instance and verify every reachable CHA
   dialog/dropdown family in Light, Night,
   Violet, and Purple at desktop, tablet, and mobile widths. Include create-job,
   success, permission, warning, filter, native/custom select, autocomplete,
   document, expense, workflow, and destructive-confirmation states.
2. Use authenticated, read-only fixtures for every dynamic CRM route.
3. Exercise all 57 CRM routes in Light, Night, and Violet at desktop, tablet, and
   mobile widths (513 combinations), asserting the exact path, CRM workspace,
   theme, absence of application errors, and no horizontal overflow.
4. Open every safe CRM dialog and representative dropdown, select, filter,
   warning, Mona, toast, and shared Batch 004 popup consumer. Verify themed
   glass, focus handling, one bounded content scroller, mobile safe-area
   behavior, and focus restoration without mutating workflow data.
5. Fix any visual defects, rerun static/type/test/build gates, and commit those
   verified earlier batches.
6. Migrate the 12 remaining discovered routes, all in the customer portal
   family, without changing protected `/dashboard`.

## 2026-07-29 HRMS employee invitation handoff

The employee invitation and self-service lifecycle is implemented, migrated,
and production-build clean.

Delivered:

- HR creates an inactive pending employee and sends a secure organisation
  invitation instead of assigning a temporary password.
- Invitation tokens are hashed at rest, expire after 72 hours by default, are
  revoked on resend, and are consumed exactly once in the same transaction that
  activates the employee and stores the bcrypt password hash.
- The public employee invite page validates the link, shows the organisation
  context, enforces a strong password, and redirects to a workspace-ready thank
  you page.
- Pending employees are visible in the Employee directory/profile immediately,
  including delivery, expiry, and resend states.
- The redundant `Onboard Employee` sidebar/dashboard entry was removed;
  invitation creation remains available only from the Employees directory.
- Employee self-service can update only the explicit server-side basic/KYC
  allowlist. Critical employment, organisation, bank, joining, reporting,
  salary, role, work-contact, custom, and system data remains HR-only.
- Generic user updates cannot bypass invitation acceptance by activating a
  pending invited user.
- The shell exposes `My employee profile` to employees who have employee-read
  capability.

Persistence:

- `EmployeeInvitation`, `User.emailVerifiedAt`, and `User.activatedAt` were
  added by `20260729201500_add_employee_invitations`.
- The migration was deployed successfully to the configured PostgreSQL
  database.
- Email delivery uses the existing Resend/SMTP provider configuration.

Verification:

- targeted ESLint: passed;
- production TypeScript: passed;
- focused HRMS invitation/profile/export tests: 19 passed;
- People Operations static verifier: 45 routes passed;
- route audit: 213 pages, 14 layouts;
- production build: 321 pages passed;
- full production-source tests: 208 passed and 3 unrelated CHA integration
  expectations failed;
- repository-wide ESLint remains blocked by the documented legacy backlog;
- browser selection returned no available browser (`[]`), so live Light, Night,
  and Violet visual/responsive checks remain pending.

Backup:

- `OLD UI code/legacy-ui-before-hrms-employee-invitations-20260729.zip`
- 24,105 bytes
- SHA-256
  `7A7B1DF27B5B3BD28CA363909E3920161B7E0A346F95D9652E88A69C1BDBA5CF`

Next visual action:

1. Attach an in-app Browser instance.
2. Verify `/hrms/employees/new`, invited Employee directory/profile states,
   `/invite/employee` with valid/invalid/expired/used tokens, the password
   requirement/error states, `/invite/employee/ready`, and employee
   self-service at desktop, tablet, and mobile widths in Light, Night, and
   Violet.
3. Confirm keyboard focus, no horizontal overflow, email failure/resend
   messaging, and that HR-only controls never enter edit mode for an employee.

## 2026-07-29 HRMS work report workflow handoff

The daily work report expansion is implemented and deployed to the configured
database.

Delivered:

- `/hrms/work-reports` uses a wide rectangular shared dialog with up to 25
  independent job/description line items.
- The dialog refreshes GPS on submission, resolves the current address with a
  coordinate fallback, and saves coordinates, accuracy, address, and a
  server-side timestamp. The address is read-only in the form.
- `/hrms/settings` now has a third Work Report Setup column for dynamic report
  fields, one-level versus two-level approval, and the approved-report OT
  requirement.
- The employee's existing primary manager is approval level 1 and secondary
  reporting manager is level 2. Level 2 remains waiting until level 1 approves.
- Managers receive durable notification-center records and queued email
  notifications. They can approve/reject from the report timeline or HRMS
  Approvals inbox. Employees receive the final decision.
- The Attendance OT engine emits `WORK_REPORT_REQUIRED` with zero OT whenever
  the setting is enabled and that date has no finally approved report. Final
  approval triggers recalculation for the report date.

Persistence:

- Migration `20260729233000_upgrade_work_reports` is deployed.
- `WorkReport` now stores repeatable items, dynamic values, and GPS evidence.
- `WorkReportApproval` stores level, waiting/pending/final state, decision time,
  and an enforced approver relation.
- `WorkReportSettings` and `WorkReportField` are organisation scoped.

Verification:

- targeted ESLint: passed with no findings;
- production TypeScript: passed;
- focused work-report and OT tests: 9 passed in 2 suites;
- People Operations static verifier: all 45 HRMS and Attendance routes passed;
- production build: 323 pages passed;
- database migration status: up to date;
- backup:
  `OLD UI code/legacy-ui-before-work-report-upgrade-20260729.zip`, 9,674 bytes,
  SHA-256
  `C2695E8858C51DFF58A2848C59C541745BD05225144490184E7AE23D2E91D490`;
- the existing non-fatal customer-portal NFT trace warning remains;
- browser selection returned no available browser (`[]`).

Next visual action:

1. Attach an in-app Browser instance.
2. Verify `/hrms/work-reports`, `/hrms/settings`, and `/hrms/approvals` at
   desktop, tablet, and mobile widths in Light, Night, and Violet.
3. Exercise add/remove line items, every dynamic field type, location allow/
   deny/timeout/refresh states, primary approval, secondary handoff, rejection,
   final decision notification, and OT recalculation.
4. Confirm focus trapping/restoration, one bounded dialog scroller, no
   horizontal overflow, and correct semantic-token contrast in every theme.

## 2026-07-29 HRMS document drive handoff

The HR document drive is reworked, backed by the configured organisation Shared
Drive, and deployed to the configured database.

Delivered:

- `Monolith HR Document Drive` is the managed main folder. It contains
  `My Space Files`, `Company Files`, and `Employee Shared`.
- My Space and Employee Shared provision employee folders named
  `Employee Name - ID {employeeNumber}`, falling back to the internal user ID.
- My Space is private to its owning employee inside HRMS.
- Company Files are visible organisation-wide, while only HR document
  administrators can upload them.
- Employee Shared is visible only to its employee, current primary/secondary
  reporting managers, and HR. Managers see only direct reports and cannot upload
  on a report's behalf; HR can.
- The API accepts real files up to 25 MB, uploads them to Drive, stores only the
  secure metadata/index in PostgreSQL, and removes an orphaned Drive file if the
  metadata transaction fails.
- No raw Drive ID or link reaches the client. Open/download requests repeat the
  access decision and proxy the bytes with no-store and nosniff headers. Only
  PDF and safe raster-image MIME types may render inline.
- Upload/download audit events are persisted.

Persistence:

- Migration `20260729234500_rework_hr_document_drive` is deployed.
- `HrDocumentDriveConfig` records the managed root/category folder IDs.
- `HrDocumentFolder` records the employee-category Drive folder mapping.
- `HrDocumentFile` records the protected file index and owner/uploader metadata.
- Final migration status reports the schema is up to date.

Verification:

- targeted ESLint: passed with no findings;
- production TypeScript: passed;
- focused document hierarchy/access tests: 7 passed;
- production build: all 323 pages passed;
- full suite: 222 passed, with one unrelated protected-dashboard visual
  expectation and three unrelated existing CHA integration expectations
  failing;
- backup:
  `OLD UI code/legacy-ui-before-hr-document-drive-rework-20260729.zip`, 5,933
  bytes, SHA-256
  `25E1C5B3DF3CFA282A1BA8694F697A44FFEEA898F5BFFE5620194F12E630F775`;
- browser selection returned no available browser (`[]`), so the page is not
  marked visually Verified.

Next visual action:

1. Attach an in-app Browser instance.
2. Verify `/hrms/files` at desktop, tablet, and mobile widths in Light, Night,
   and Violet.
3. Exercise empty, loading, search, upload, 25 MB validation, disconnected
   Drive, HR Company Files upload, employee self-upload, HR employee selection,
   manager direct-report selection, forbidden forged employee IDs, open, and
   download states.
4. Confirm table overflow, keyboard focus, no horizontal page overflow, semantic
   token contrast, and that My Space/Employee Shared controls never appear for
   an unauthorised user.

## 2026-07-29 HRMS quick add employee handoff

The minimal employee creation path is implemented on `/hrms/employees`.

Delivered:

- HR users with `hrms.employee.create` now see `Add Employee` and `Full
Onboarding` as separate choices.
- `Add Employee` opens the shared Monolith dialog and requires only Employee ID,
  first name, last name, and email.
- `Generate` reads the organisation's last Employee ID and proposes an unused
  numeric ID above the current global maximum. Manual IDs remain supported and
  are checked again on submission.
- The quick API assigns the default Employee role, creates an inactive pending
  user and empty HRMS profile, and sends the existing secure invitation.
- It deliberately does not create an `EmploymentRecord`. HR supplies the actual
  joining date and remaining details later from the employee profile, whose
  existing save flow creates that record and appraisal schedule.
- Email delivery failure preserves the pending employee and uses the existing
  resend action. Duplicate email/ID and permission checks are server-side.
- Full onboarding remains unchanged for cases where HR already has complete
  employment, organisation, salary, bank, and personal information.

Persistence:

- No schema or database migration was required.
- The existing User, EmployeeHrmsProfile, EmployeeInvitation, role, security
  event, and email delivery models are reused.

Verification:

- targeted ESLint: passed;
- production TypeScript: passed;
- focused quick-add/invitation/profile/export tests: 22 passed across 5 suites;
- production build: all 324 pages passed;
- backup:
  `OLD UI code/legacy-ui-before-hrms-quick-add-employee-20260729.zip`, 5,951
  bytes, SHA-256
  `C7E9AECEFC7886C09FE778959DD42F4F2C91C94E972C523ECCA94706E9EBB841`;
- the existing non-fatal customer-portal NFT trace warning remains;
- browser selection returned no available browser, so the quick dialog is not
  marked visually Verified.

Next visual action:

1. Attach an in-app Browser instance.
2. Verify `/hrms/employees` in Light, Night, and Violet at desktop, tablet, and
   mobile widths.
3. Exercise generated and manual IDs, duplicate email/ID responses, required
   fields, invalid email, invitation delivery success/failure, cancel, Escape,
   focus trap/restoration, and navigation to the new pending employee profile.
4. Confirm non-HR viewers never receive either creation action and forged quick
   API requests return the permission error.

## 2026-07-29 CHA Jobs datatable controls

The `/cha/jobs` Active and Completed Jobs datatable toolbars now match the
shared Monolith table reference: left-aligned icon search, right-aligned New Job
and Filter controls, no extra Apply Search button, and shared search/control
sizing.

Backup:
`OLD UI code/ui-iteration-backups/cha-jobs-datatable-controls-reference-20260729/`

Verification:

- targeted ESLint for `src/app/(dashboard)/cha/jobs/jobs-client.tsx`: passed;
- `npx tsc --noEmit -p tsconfig.ui-migration.json`: passed;
- `node scripts/verify-monolith-expense-cha-ui.mjs`: passed;
- visual verification remains covered by the existing CHA browser-instance
  blocker.

## 2026-07-29 Login animated character restore

The `/login` page was restored to the earlier animated Monolith character scene
by request, without changing login behavior. The restore is limited to the
login component, its CSS module, and the small scene type helper. Current
credential login, Google SSO, remember-me, callback URL safety, stale-session
cleanup, validation, success delay, and redirect behavior are preserved.

Backup:
`OLD UI code/ui-iteration-backups/login-animated-character-restore-20260729/`

## 2026-07-29 Dashboard module graphics correction

The protected `/dashboard` module command center graphics are repaired. The
merge had left the active React illustration components without their shared
`mnx-dashboard-graphic` and `mnx-dg-*` semantic CSS tokens, causing the card art
to render as broken outline fragments. The shared graphic token block and a
stable module-card art canvas are restored in `src/styles/monolith-system.css`.

Backup:
`OLD UI code/ui-iteration-backups/dashboard-module-graphics-fix-20260729/`

## 2026-07-29 CHA dashboard workspace style restore

The protected `/cha` command workspace styles are repaired. The active
components were still rendering the shared Monolith class names, but the merge
had dropped the CSS for the outside section headings, Assigned Jobs table
toolbar/search/filter/status text, and the Operations Overview pending action,
expiry, empty-state, job-reference, and recent-activity timeline surfaces.
The Assigned Jobs action controls were also normalized so New Job, Filter, View
All, and Settings use the Monolith datatable pill sizing rather than legacy
compact/unstyled controls.

Backup:
`OLD UI code/ui-iteration-backups/cha-dashboard-styles-restore-20260729/`

Follow-up backup:
`OLD UI code/ui-iteration-backups/cha-dashboard-action-buttons-fix-20260729/`

The follow-up button correction was then scoped back out of the global design
system primitives. `mnx-button-outline` and `mnx-filter-button` are no longer
globally restyled by this repair; only the CHA Assigned Jobs toolbar receives
the datatable-specific sizing.

Revert backup:
`OLD UI code/ui-iteration-backups/design-system-button-revert-20260729/`

## 2026-07-29 Monolith button and filter primitive recreation

The shared button and filter primitives have been recreated from the v11
reference source. `mnx-button` now carries the reference 48px pill proportions,
variant fills/shadows/borders, compact and disabled states, and 15px action
icons. `mnx-filter-button` / `filter-button` now carries the reference 35px
datatable filter control with the small accent count chip. The
`/admin/design-system` Actions and status preview now renders the same
reference button hierarchy plus text and icon action examples.

Backup:
`OLD UI code/ui-iteration-backups/monolith-buttons-filter-reference-recreate-20260729/`

## 2026-07-29 performance audit handoff

The performance pass preserves the active Monolith presentation. Create Job
options on `/cha/jobs` and Organization-tab data on `/dashboard` are now lazy;
their loading surfaces use existing shared components.

Passed: targeted ESLint, production TypeScript, 9 focused tests, 328-route
production build, public `/login` Playwright smoke, and a controlled Turbopack
Fast Refresh check with one page load and no console errors.

Blocked: authenticated theme/viewport and performance measurements require an
explicitly approved local/staging database and safe credentials. The repository
`.env` remote Neon target was deliberately not used.

## 2026-07-30 login credential-query fix

The `/login` double-entry symptom and credential-bearing URL were traced to the
browser's native pre-hydration form submission. The login controls now stay
disabled until hydration, the form declares POST as its safe native fallback,
and the client removes any legacy `email`, `password`, or `rememberMe` query
parameters without removing a valid `callbackUrl`.

Passed: hydrated and JavaScript-disabled Playwright checks, targeted ESLint,
the UI migration and production TypeScript projects, and `git diff --check`.
No real user credentials or remote database authentication were used during
verification. The historical Batch 007 static verifier remains stale against
the current root authentication source and stops on its unrelated literal
`await auth()` assertion; this fix does not modify the root flow.

Backup:
`OLD UI code/ui-iteration-backups/login-native-submit-credential-leak-fix-20260730/`

## 2026-07-30 performance phase 2 continuation

The current uncommitted performance tree now contains request-scoped dashboard
context, lazy Team/Organization data, two-query cached dashboard metrics,
side-effect-free widget reads, lazy/dynamic CHA Create Job options, visible-job
warning scoping, aggregated CHA metrics, joined activity actors, database/pool
telemetry, a dedicated non-overlapping Justdial worker, explicit Turbopack
scripts, and Playwright security/motion checks.

Measured local-staging latency targets pass. The exact measurements, pool/SQL
telemetry, commands and limitations are in
`docs/performance-phase-2-results.md`.

Do not mark this phase complete yet:

- measured complete-request query counts remain 29 for `/cha` and 22 for
  `/cha/jobs`, above the required maximum of eight;
- the full suite passes 283/286 tests, with the three previously recorded CHA
  fixture failures;
- repository-wide lint exceeded the 120-second run window;
- production per-query/pool telemetry still needs a representative run.

No commit, push, reset, stash, clean or discard operation was performed.

## 2026-07-30 Accounting Phase 5 handoff

Phase 5 operational Accounting UI and application integration is implemented
locally from required starting HEAD `2f37936b07cfea8b9f7b1c993d342811278b7af6`.
No commit, push, deployment, production/Neon/Zoho/provider connection, real-data
migration, or Phase 6 cutover was performed.

Primary implementation:

- centralized route access, exact-money helpers, bounded tenant read models,
  stable error mapping, and canonical server actions under
  `src/modules/accounting/operational-*`;
- shared operational registers, details, dialogs, policy gates, and exact money
  display under `src/components/monolith/accounting-operational-*`;
- operational routes listed in
  `docs/accounting/phase-5-operational-ui.md`;
- permission-aware navigation with existing functional Accounting routes
  retained;
- compatibility draft creation remains additive, while submit converges on the
  canonical Phase 4 adapters and canonical detail routes;
- manual journals use draft → independent checker → canonical engine;
- no Phase 5 schema or migration files.

Safety:

- all new operational reads are organization-scoped and bounded;
- all mutation actions reauthorize server-side;
- expected row versions protect approval, rejection, reversal, and outbox
  controls;
- exact decimal strings are preserved across UI boundaries;
- immediate-post controls and unreachable direct invoice/payment writer
  branches were removed;
- email and external publication remain disabled/not configured.

Backup:
`OLD UI code/legacy-ui-before-accounting-phase5-2f37936.zip`, SHA-256
`3260DD7EE1DAC71D3FB4AAE3AA149668A450EF9F944D817C2461679DD8D1C8A8`.

The verification table in `docs/accounting/phase-5-operational-ui.md` records
the final static, test, build, guarded staging, catalogue, and browser
availability results. Authenticated visual verification remains the only
environmental evidence gap because no in-app or attached browser was available.
## 2026-07-30 Accounting Phase 7 rollout-preparation handoff

Phase 7 is implemented as preparation only from required starting HEAD
`498eb8364858da2c45e2b4c86d09098ae05f2443`. No commit, push, PR, deployment,
production/Neon/Zoho/provider access, real-data access, port-5432 access,
database schema change, production migration, cutover, or go-live occurred.

Delivered:

- 20-decision fail-closed policy register;
- secret-free production configuration contract that rejects port 5432,
  provider/outbound enablement, staging fallback, incomplete authorization,
  and all Phase 7 production execution;
- versioned manifest integrity, deterministic go/no-go, backup readiness, and
  evidence-gated cutover state machine;
- deterministic small/medium/large synthetic profiles and a database-free
  in-memory rehearsal covering dry-run, interruption/resume, replay,
  reconciliation mismatch, and provider-disabled behavior;
- monitoring, alerts, role-based acceptance, deployment sequencing,
  rollback/forward-fix, hypercare, incident response, and future production
  smoke-test runbooks;
- complete requirements and security traceability.

Evidence:

- Phase 7 focused tests: 20 passed;
- Phase 6 independent rerun: 48 passed;
- guarded full suite: 410 passed; the same three unrelated CHA expectations
  failed (mock Drive attachment, estimated filing date, legacy direct-delete
  audit event);
- bounded 1,500-record benchmark: 62.54 ms dry-run, 64.75 ms in-memory
  execution, 1,423,384-byte heap delta, zero queries;
- TypeScript, targeted ESLint, Prisma format/validate, static verification,
  safety scan, `git diff --check`, and the 342-page production build passed.

Current rollout result remains `NO_GO`. Required next actions are external
policy decisions, accepted production configuration and authorization
evidence, backup/restore rehearsal evidence, a final real-source manifest under
an approved freeze, guarded canonical/database performance evidence, named
staffing, business/security/technical approvals, and a separately authorized
future production-enablement change.

## 2026-07-31 Accounting schema repair handoff

The root `.env` target and local staging test database are migrated and report
all 66 repository migrations up to date. The root target is Neon `neondb` in
`public`; credentials were not printed or changed.

Delivered:

- reconciled four historical migration records only after verifying their
  complete table footprint in PostgreSQL;
- deployed the pending canonical Accounting Phase 2–4 and Phase 6 chain plus
  the pre-existing Phase 9 migrations;
- added idempotent baseline and metadata-alignment migrations;
- added `accounting:schema:verify`, a read-only 70-model column/index/unique/
  foreign-key/migration verifier;
- added development and deployment preflight commands;
- added a Docker migrator service that must complete successfully before the
  application starts;
- sanitized the Accounting error boundary with a correlation ID, retry action,
  authenticated server-side diagnostic logging, and no raw browser-visible
  diagnostics.

Verification:

- schema format, validation, migration status, Client generation, and empty
  schema diff passed;
- schema verifier passed: 70 models, 1,076 indexes, 581 foreign keys, 24
  required migrations;
- production TypeScript, repair-scoped ESLint, focused boundary test, and
  production build passed;
- full tests returned 491 passed and the same three unrelated CHA failures;
- repository lint retains its existing 1,360-error/312-warning backlog;
- all 29 Accounting navigation routes returned an authentication redirect
  rather than 404/500, and server logs contain no P2021/missing-table/invalid
  Prisma invocation;
- authenticated visual and loaded-state verification is still blocked because
  no in-app browser instance was available.

No reset, seed, Zoho import, historical Accounting record migration, synthetic
transaction insert, destructive table/column operation, or credential change
was performed.

## 2026-07-31 localhost:3000 single-server handoff

Only one interactive Monolith server is permitted. Use `npm run dev` and review
changes at `http://localhost:3000`; do not start or recreate a staging web
application. `dev`, `dev:webpack`, and `dev:turbopack` explicitly pass port
3000 after the read-only Accounting schema preflight. `staging:dev`,
`staging:app:check`, and `staging:login:verify` now exit with a clear disabled
message. The staging environment runner permits only Prisma, tsx, and Vitest
command-line work.

The clean restart performed in this session:

- found the existing Monolith listener on port 3000 and no listener on 3100;
- stopped only the verified repository Next.js process tree;
- removed `.next`;
- regenerated Prisma Client;
- started `npm run dev` with the required 8 GB Node heap;
- confirmed Next.js loaded `.env` and announced
  `Local: http://localhost:3000`;
- reconfirmed port 3000 readiness and no port-3100 listener after the
  production build.

Database environment:

- Next.js and Prisma CLI resolve the root `.env`;
- Vitest uses `.env.staging.local` for isolated database tests only;
- UI audits use only the existing port-3000 app and never load the staging
  environment to start Next.js;
- safe target: Neon host
  `ep-lucky-paper-ao7k5ek6-pooler.c-2.ap-southeast-1.aws.neon.tech`, port 5432,
  database `neondb`, SSL enabled; credentials were not displayed.

All 66 migrations were already applied. The read-only Accounting verifier
passed 70 models, 1,076 indexes, 581 foreign keys, and all 24 required
Accounting migrations. No database mutation was required or attempted.

Validation passed: modified-script ESLint, Phase 9 static checks, 14 focused
tests, TypeScript, Prisma validate/status/generate, Accounting schema
verification, port-3000 readiness, and the 346-page production build.
Repository-wide lint remains red on the existing unrelated backlog.

All 16 requested Accounting URLs returned the expected same-origin HTTP 307
authentication redirect on port 3000, with no 404/500, port change,
missing-table message, or raw Prisma error in the server log.

Remaining browser gate: the in-app browser inventory returned no available
browser. Therefore the requested authenticated route rendering, stale-UI,
cross-tenant, mock-data, raw-error, redirect, and network-origin checks across
the 16 Accounting routes are not claimed. Once a browser is available, run
`npm run accounting:ui:verify` with normal-development `UI_TEST_EMAIL` and
`UI_TEST_PASSWORD`; the script is read-only, creates no fixtures, refuses
non-3000 targets, and records its result under
`artifacts/ui-migration/accounting/localhost-3000-verification.json`.

No commit, push, reset, seed, migration deploy, fixture insert, or environment
credential change was performed in this localhost-only slice.

## 2026-07-31 customer/vendor master continuation handoff

Finished the partial customer and vendor master implementation that had been
started locally.

Delivered:

- the CHA customer new/edit clients now compile cleanly with the GST
  auto-population flow and continue to wire `taxPreference` into the server
  actions;
- `/crm/customers`, `/crm/customers/new`, and
  `/crm/customers/[id]/edit` now redirect to the CHA customer master routes so
  there is one operational customer-maintenance surface instead of parallel CRM
  and CHA entry points;
- a shared `VendorMasterCreateForm` now powers vendor creation with GST-assisted
  name/address autofill on `/crm/vendors`;
- `/accounting/vendor-master` now exists as the Accounting-facing vendor
  register, with the same shared creation form available only to viewers who
  also hold `crm.vendor.manage`;
- `src/components/monolith/accounting-workspace.tsx` includes route metadata
  for the new Accounting vendor-master workspace.

Verification:

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`: passed;
- targeted ESLint for the touched customer/vendor/accounting files: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed with 349
  generated pages and the new `/accounting/vendor-master` route present;
- `git diff --check` for the touched files: passed.

Open follow-up:

- this continuation added one new route, so the historical top-level route
  counts in the migration audit docs are now stale until the next full audit
  regeneration;
- browser-backed visual verification is still blocked by the same missing
  in-app browser inventory.

## 2026-07-31 Accounting item master rework handoff

The Accounting item master was reworked to better match the requested
reference layout and data-entry flow without changing the existing protected
dashboard, reference project, or shared Monolith shell conventions.

Delivered:

- `/accounting/items` now renders as a denser item-master register focused on
  the operational columns shown in the reference: name, SKU, purchase
  description, purchase rate, description, rate, HSN/SAC, usage unit, and
  status, with image presence visible in the item identity cell;
- `/accounting/items/new` now provides a fuller item-master entry form with an
  item image drop/browse surface, sales and purchase sections, GST/tax default
  display, additional operational fields, inventory toggles, and
  multi-currency price rows;
- Preferred Vendor now pulls from the live shared vendor master by fetching
  Accounting-scoped CRM vendor records on the server page and passing them into
  the item form;
- the shared client-side item model and Zod validation now persist the extra
  item-master metadata needed by the new UI;
- the older CRM item dialog and CRM new-item page were updated only as needed
  to stay compatible with the expanded shared item schema.

Backup:

- `OLD UI code/ui-iteration-backups/accounting-item-master-rework-20260731/`
  contains the pre-change Accounting item-master component and new-item page
  backups taken before the rewrite.

Verification:

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`: passed;
- targeted ESLint for
  `src/components/monolith/accounting-items.tsx`,
  `src/app/(dashboard)/accounting/items/new/page.tsx`,
  `src/lib/items/types.ts`,
  `src/lib/items/validation.ts`,
  `src/components/items/NewItemDialog.tsx`, and
  `src/components/items/NewItemPage.tsx`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed with 349
  generated routes and the Accounting item and vendor-master routes present.

Blocked:

- authenticated browser verification is still blocked by the same missing
  in-app browser inventory, so no claim is made yet about pixel-level parity
  with the supplied screenshots across Light, Night, and Violet at all
  breakpoints.

## 2026-07-31 GST portal manual fallback handoff

Added a hybrid GST lookup fallback to the current customer/vendor master flows.

Delivered:

- the CHA customer new form, CHA customer edit form, and shared vendor-master
  create form now surface a `Verify on GST Portal` link next to GSTIN entry;
- when `fetchGstDetailsAction` fails because backend GST credentials are not
  configured, the forms now show a clear fallback message telling the operator
  to use the official public GST search portal and enter the values manually;
- the fallback note explicitly states that the public portal requires manual
  captcha verification, so this path is treated as assisted manual lookup
  rather than silent auto-population.

Files:

- `src/lib/gst-public-search.ts`
- `src/app/(dashboard)/cha/customers/new/new-customer-client.tsx`
- `src/app/(dashboard)/cha/customers/[id]/edit/edit-customer-client.tsx`
- `src/components/monolith/vendor-master-create-form.tsx`

Verification:

- targeted ESLint for the fallback helper and the three touched GST-aware
  client forms: passed.

Notes:

- a full `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` run is
  currently blocked by unrelated pre-existing `CustomerContactPayload` typing
  errors in `src/modules/crm/actions.ts`; this GST fallback change did not
  introduce new TypeScript errors in the touched files;
- authenticated browser verification remains blocked by the same missing
  in-app browser inventory.

## 2026-07-31 customer master contact and address expansion handoff

Extended the active CHA customer new/edit wizard to match the requested
operational contact and address flow.

Delivered:

- primary contact is now explicit in the Contact step and captures contact
  person name, designation, email, and phone;
- operators can add and remove additional contacts inline, and those save back
  into linked `CrmContact` rows on the customer account;
- the Address step now supports Billing, Shipping, and Courier addresses, with
  `Billing As Shipping` and `Billing As Courier` toggles;
- 6-digit Indian PIN entry now calls a new server-side lookup and auto-fills
  read-only City and State fields for all three address blocks;
- edit loading now includes active contacts plus courier/toggle metadata from
  the persisted remarks payload so the new fields round-trip on edit.

Files:

- `src/app/(dashboard)/cha/customers/new/new-customer-client.tsx`
- `src/app/(dashboard)/cha/customers/[id]/edit/edit-customer-client.tsx`
- `src/app/(dashboard)/cha/customers/[id]/edit/page.tsx`
- `src/modules/crm/actions.ts`

Verification:

- targeted ESLint for the touched customer files: passed;
- filtered `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` output
  showed no errors from the touched customer files or the new customer-master
  action changes.

Blocked:

- full production TypeScript remains blocked by unrelated pre-existing
  `src/components/monolith/vendor-master-create-form.tsx` failures;
- authenticated browser verification remains blocked by the same missing
  in-app browser instance.

## 2026-07-31 staging web runtime re-enabled handoff

At the user's request, the earlier single-server restriction is superseded.
The normal Monolith development server remains available at
`http://localhost:3000`, and `npm run staging:dev` now runs the same current
source at `http://127.0.0.1:3100` against the isolated local staging database.

Safety and isolation:

- the staging launcher validates the exact loopback PostgreSQL target at
  `127.0.0.1:56432/monolith_accounting_staging`;
- it binds Next.js only to `127.0.0.1:3100` and uses
  `.monolith-staging/next`, so it does not share port or build output with the
  port-3000 server;
- staging session, CSRF, and callback cookies use dedicated names so port-3000
  sessions cannot be decrypted or overwritten by port 3100;
- Accounting provider execution remains disabled;
- startup refuses configured outbound email or OAuth delivery credentials;
- staging database/admin passwords and the staging login password are removed
  from the Next.js child environment.

The staging database was healthy but seven Accounting Phase 9 migrations
behind the active source. `npm run staging:db:migrate` applied those migrations,
`npm run staging:db:status` reported all 73 migrations current, and
`npm run staging:db:verify` passed. Both `/login` endpoints returned HTTP 200,
and representative Accounting routes on ports 3000 and 3100 returned expected
HTTP 307 authentication redirects with no 404 or 500.

## 2026-07-31 customer master finance and KYC expansion handoff

Extended the same active CHA customer wizard further for multi-branch opening
balances and the extra cancelled-cheque document requirement.

Delivered:

- Finance now supports multiple branch opening-balance rows instead of a single
  branch/amount pair;
- the first row still maps onto the legacy account-level opening-balance fields
  for compatibility with existing readers, while the full list is stored in the
  customer remarks metadata as `openingBalancesByBranch`;
- KYC now includes `Cancelled Cheque` in both create and edit flows and in the
  review/status surfaces;
- create and update actions now persist the new branch-balance list and the new
  KYC document alongside the existing remarks/KYC metadata contract.

Files:

- `src/app/(dashboard)/cha/customers/new/new-customer-client.tsx`
- `src/app/(dashboard)/cha/customers/[id]/edit/edit-customer-client.tsx`
- `src/modules/crm/actions.ts`

Verification:

- targeted ESLint for the two touched customer wizard files remains clean;
- filtered `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` output
  showed no matches from the touched customer/customer-action branch-balance
  and cancelled-cheque changes.

Blocked:

- repository ESLint remains red on the pre-existing broad `no-explicit-any`
  backlog in `src/modules/crm/actions.ts`;
- full production TypeScript remains blocked by the unrelated pre-existing
  `src/components/monolith/vendor-master-create-form.tsx` failures;
- authenticated browser verification remains blocked by the same missing
  in-app browser instance.

## 2026-07-31 journal entries reference refresh handoff

Updated the active Accounting journal register and manual-journal draft route
to behave more like the supplied reference while preserving the current
business contract that journal creation only prepares a draft for separate
approval/posting.

Delivered:

- `/accounting/journal-entries` now accepts `search`, `status`, `dateFrom`,
  `dateTo`, and `page` query parameters and renders a denser manual-journal
  register with location, narration, amount, maker, and reporting-method
  visibility;
- `listCanonicalJournals` now resolves branch names and maker names and applies
  bounded search over voucher number, notes, source id/type, and branch name;
- `/accounting/journal-entries/new` now uses a fuller journal-header form,
  table-like line entry grid, inline remove actions, and a right-aligned totals
  summary card closer to the requested layout;
- the form still persists only posting date, branch, narration, and balanced
  lines because those are the real server-supported journal draft fields today;
- no unsupported reverse-date, attachment, recurring, or immediate-publish
  behavior was added.

Files:

- `src/app/(dashboard)/accounting/journal-entries/page.tsx`
- `src/app/(dashboard)/accounting/journal-entries/new/page.tsx`
- `src/app/(dashboard)/accounting/journal-entries/new/new-jv-client.tsx`
- `src/components/monolith/accounting-operational-views.tsx`
- `src/modules/accounting/operational-queries.ts`
- `src/styles/monolith-system.css`

Backup:

- `OLD UI code/ui-iteration-backups/journal-entries-reference-refresh-20260731/`

Verification:

- targeted ESLint for the touched journal route/query/view files: passed;
  the current ESLint configuration still prints its normal warning that the raw
  CSS file is ignored;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed with 351
  generated routes including the journal register and new-journal route;
- `git diff --check` for the touched files: passed.

Blocked:

- authenticated browser verification remains blocked by the same missing
  in-app browser instance, so no final claim is made yet about exact
  theme/viewport parity with the supplied screenshots.

### Follow-up: ledger contact toggle handoff

Extended the same journal work so ledger master now decides whether a manual
journal line can pick a contact/counterparty.

Delivered:

- added `allowJournalContact` to `Account` in `prisma/schema.prisma` and added
  migration `prisma/migrations/20260731113000_add_account_allow_journal_contact/migration.sql`;
- updated account creation in
  [accounts-client.tsx](C:/Users/SilverCloud/Documents/Adarsh-Shipping-and-Services-Management-Software/src/app/(dashboard)/accounting/accounts/accounts-client.tsx)
  to expose `Enable contact selection in manual journals`, and qualifying
  ledger rows now render a `Contact` badge in the chart;
- updated
  [new/page.tsx](C:/Users/SilverCloud/Documents/Adarsh-Shipping-and-Services-Management-Software/src/app/(dashboard)/accounting/journal-entries/new/page.tsx)
  and
  [new-jv-client.tsx](C:/Users/SilverCloud/Documents/Adarsh-Shipping-and-Services-Management-Software/src/app/(dashboard)/accounting/journal-entries/new/new-jv-client.tsx)
  so manual journal lines render the requested Contact column and enable it
  only when the selected ledger has the toggle enabled;
- the contact selector reuses the existing journal `partyType` / `partyId`
  contract and offers active customers, vendors, and employees.

Verification:

- targeted ESLint for the touched account/journal/validator files: passed;
- `npx prisma validate`: passed;
- `npx prisma generate`: passed;
- `git diff --check` for the touched files: passed.

Blocked:

- repository-wide ESLint on `src/modules/accounting/service.ts` still fails on
  the pre-existing broad `no-explicit-any` backlog unrelated to this slice;
- full production TypeScript is currently blocked by unrelated pre-existing
  Accounting page errors in `/accounting/bulk-update`,
  `/accounting/currency-adjustments`, and `/accounting/fixed-assets`;
- authenticated browser verification remains blocked by the same missing
  in-app browser instance.

## 2026-07-31 staging-to-Monolith Accounting integration handoff

Port 3000 and port 3100 already serve the same current source tree. The menu
difference was caused by RBAC/database drift: Monolith stored and granted only
18 original Accounting permissions to its system `Admin` role.

The new
`prisma/migrations/20260731235945_accounting_permission_catalogue_sync`
migration synchronizes all 67 Accounting permission definitions and grants
them only to system `Admin` roles. It does not broaden maker, checker,
Management, or custom roles. The migration was rehearsed on staging before
Monolith deployment.

Staging and Monolith now both report 75 migrations current, including banking,
recurring, permission synchronization, and the concurrently added asset
foundation. The Monolith schema verifier passed with zero failures, the system
Admin account resolves all 67 Accounting permissions, and 12 representative
routes returned expected HTTP 307 authentication redirects without 404/500.
Port 3000 was restarted to clear RBAC caches and is serving `/login` with HTTP
200 and no stderr; port 3100 remains available.

The Windows launcher also now treats an empty port-3000 listener check as a
successful result after restart. Authenticated browser verification remains
pending because no in-app browser is available.

## 2026-07-31 banking regrouping and workspace connectors handoff

Grouped the current Accounting bank functions under a single Banking subsection
and refreshed the Banking route into a proper hub without changing the existing
transfer business logic.

Delivered:

- `/accounting/banking` now goes through `requireAccountingRouteAccess` and the
  shared Accounting payments permission group in
  `src/modules/accounting/operational-access.ts`;
- shared Accounting navigation now supports second-level subsection labels via
  `sectionLabel`, and the Accounting workspace uses that to group
  `Overview`, `Payments`, `Customer Receipts`, `Vendor Payments`, and
  `Allocations` under `Banking`;
- the Banking page now shows connected workflow cards linking to the related
  banking pages plus header actions for `All payments` and `New payment draft`;
- the transfer modal on `/accounting/banking` still calls the existing
  `recordBankTransferAction` and is only surfaced when the user has payment
  preparation permission;
- the affected Banking route metadata now uses a consistent `Banking`
  eyebrow/title treatment in
  `src/components/monolith/accounting-workspace.tsx`.

Files:

- `src/app/(dashboard)/accounting/banking/page.tsx`
- `src/app/(dashboard)/accounting/banking/banking-client.tsx`
- `src/components/monolith/accounting-workspace.tsx`
- `src/components/monolith/app-shell.tsx`
- `src/lib/navigation.ts`
- `src/modules/accounting/operational-access.ts`
- `src/styles/monolith-system.css`

Backup:

- `OLD UI code/ui-iteration-backups/accounting-banking-grouping-20260731/`

Verification:

- targeted ESLint for the touched files: passed; the raw CSS file produced the
  current expected “ignored by config” warning only;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`: passed;
- targeted `git diff --check` for the touched files: passed, aside from the
  usual Windows line-ending warnings;
- default `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: blocked by
  `EBUSY` while unlinking `.next\\monolith-dev-3.stderr.log`, which is being
  held by the active local Next.js runtime rather than this Banking slice.

Blocked:

- no in-app browser instance is available, so authenticated visual verification
  of the regrouped Banking subsection and the Banking hub remains pending;
- if a clean production build artifact is needed in this same workspace, stop
  or isolate the active dev runtime first so `.next` is no longer locked.

## 2026-07-31 accountant regrouping and connected workspaces handoff

Grouped the accountant-facing Accounting tools under a single `Accountant`
subsection and created focused connector pages for the requested accountant
items that previously lacked dedicated routes.

Delivered:

- Accounting sidebar items now show the requested accountant grouping:
  `Manual Journals`, `Recurring Journals`, `Bulk Update`,
  `Currency Adjustments`, `Chart of Accounts`,
  `Transaction Locking`, and `Fixed Assets`;
- added new routes:
  `/accounting/bulk-update`,
  `/accounting/currency-adjustments`,
  `/accounting/transaction-locking`, and
  `/accounting/fixed-assets`;
- each new route uses Monolith sections plus the shared
  `AccountingWorkflowCards` component to connect into the real existing
  Accounting flows rather than dead placeholder pages;
- `/accounting/transaction-locking` uses the existing
  `updateTransactionLockAction` and current transaction-lock data, so lock
  updates remain functional from the new accountant workspace;
- `/accounting/currency-adjustments` surfaces live functional-currency and FX
  evidence data from `getAccountingConfigurationOverview`;
- `/accounting/fixed-assets` surfaces live fixed-asset readiness and the same
  depreciation capability gate already used by the existing depreciation route;
- `/accounting/accounts` and `/accounting/settings` now use the shared
  `requireAccountingRouteAccess` path instead of direct session checks.

Files:

- `src/lib/navigation.ts`
- `src/components/monolith/accounting-workspace.tsx`
- `src/components/monolith/accounting-workflow-cards.tsx`
- `src/modules/accounting/operational-access.ts`
- `src/app/(dashboard)/accounting/accounts/page.tsx`
- `src/app/(dashboard)/accounting/settings/page.tsx`
- `src/app/(dashboard)/accounting/bulk-update/page.tsx`
- `src/app/(dashboard)/accounting/currency-adjustments/page.tsx`
- `src/app/(dashboard)/accounting/fixed-assets/page.tsx`
- `src/app/(dashboard)/accounting/transaction-locking/page.tsx`
- `src/app/(dashboard)/accounting/transaction-locking/transaction-locking-client.tsx`
- `src/app/(dashboard)/accounting/banking/banking-client.tsx`
- `src/styles/monolith-system.css`

Backup:

- `OLD UI code/ui-iteration-backups/accounting-accountant-grouping-20260731/`

Verification:

- targeted ESLint for the touched accountant/nav/workspace files: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`: passed;
- targeted `git diff --check` for the touched files: passed, aside from the
  normal line-ending warnings in the current Windows worktree;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: still blocked by the
  active local Next.js runtime holding
  `.next\\monolith-dev-3.stderr.log` open (`EBUSY` on unlink), not by an
  accountant-route type or compile failure.

Blocked:

- no in-app browser instance is available, so authenticated visual verification
  of the new Accountant submenu and routes remains pending;
- these new accountant pages increase the Accounting route count, so the
  historical route-total summaries in the migration docs are stale until the
  next route-audit regeneration.

## 2026-07-31 chart of accounts reference refresh handoff

Reworked `/accounting/accounts` around the supplied chart-of-accounts
references so the route now behaves like an accountant workspace rather than a
basic tree plus form.

Delivered:

- the route now uses a split layout with a searchable filtered ledger hierarchy
  on the left and a live account detail pane on the right;
- selecting an account reloads the route with the chosen account context and
  shows live closing balance, opening totals, posted debit/credit totals, and
  rolled-up descendant balances for group accounts;
- recent transactions are now loaded from real `GeneralLedgerEntry` data for
  the selected account set, with transaction search and voucher/debit/credit
  filters in the detail pane;
- added Monolith `Add account` and `Edit account` dialogs to the chart page so
  account maintenance stays in-context;
- extended `updateAccount` so edits now persist `accountCode`,
  `parentAccountId`, `rootType`, `accountType`, `isGroup`, `isActive`,
  `allowJournalContact`, opening balances, and branch changes, with duplicate
  code, invalid parent, descendant-cycle, and group-child validation;
- added dedicated chart-of-accounts styling in
  `src/styles/monolith-system.css` for the hierarchy pane, balance hero, detail
  grid, and transaction workspace.

Files:

- `src/app/(dashboard)/accounting/accounts/page.tsx`
- `src/app/(dashboard)/accounting/accounts/accounts-client.tsx`
- `src/modules/accounting/service.ts`
- `src/styles/monolith-system.css`

Backup:

- `OLD UI code/ui-iteration-backups/accounting-chart-of-accounts-reference-refresh-20260731/`

Verification:

- targeted ESLint for the two chart page files: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`: passed;
- targeted `git diff --check` for the touched chart files: passed, aside from
  the normal Windows line-ending warnings in this worktree;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: failed before
  `next build` because `prisma generate` currently cannot validate
  untouched `prisma/schema.prisma` references to missing models
  `AccountingSourceMappingProfile`, `AccountingPeriodCloseRun`,
  `AccountingReportExportProfile`, and
  `AccountingPortalPublicationProfile`.

Blocked:

- no in-app browser instance is available, so authenticated screenshot
  verification against the supplied Chart of Accounts references remains
  pending;
- a clean production build is currently blocked by the unrelated Prisma schema
  validation errors above rather than by the chart-of-accounts implementation.

## 2026-07-31 optional note invoice-linking handoff

Original-invoice linking is now optional end to end for customer and vendor
credit/debit notes.

Delivered:

- the new shared
  `src/components/monolith/accounting-optional-invoice-link.tsx` control shows
  `Link with invoice` first and swaps to the invoice chooser only after it is
  pressed;
- `AccountingInvoiceForm` uses the control for all four note kinds:
  sales credit, sales debit, purchase credit, and purchase debit;
- the customer-adjustment dialog in `/accounting/quotations` now uses the same
  interaction instead of an always-visible selector;
- draft creation continues to persist `originalInvoiceId` as null when no
  invoice is chosen;
- canonical preparation now permits unlinked notes, derives their tax category
  from the current validated note policy/rule, and emits no causation or
  supporting-invoice reference; linked notes keep the existing posted-invoice,
  party, currency, policy, and correction-capacity checks;
- approval and rejection continue to require
  `accounting.correction.approve` based on debit/credit-note document type, so
  an unlinked note cannot fall back to the generic approval permission.

Files:

- `src/components/monolith/accounting-optional-invoice-link.tsx`
- `src/components/monolith/accounting-invoice-form.tsx`
- `src/app/(dashboard)/accounting/quotations/quotations-client.tsx`
- `src/modules/accounting/document-adapters.ts`
- `scripts/__tests__/accounting-phase4-documents-payments.integration.test.ts`

Backup:

- `OLD UI code/ui-iteration-backups/accounting-optional-invoice-link-20260731/`

Verification:

- TypeScript passed with the required 8 GB Node heap;
- server-render verification passed for the initial link-action state and the
  post-activation chooser state;
- focused unlinked-credit-note staging integration passed;
- ESLint passed for the new component and the changed quotation, adapter, and
  test files; the shared invoice form retains unrelated pre-existing lint errors
  from its earlier in-progress expansion;
- the full Phase 4 file cannot currently pass on staging because the database
  lacks `Account.allowJournalContact`; the new focused case passes independently;
- authenticated browser QA is pending because there is no available in-app
  browser instance.

## 2026-07-31 debit-note reason classification handoff

Debit-note reason choices now follow the liability effect of each note type.

Delivered:

- `src/components/monolith/accounting-note-reason-select.tsx` centralizes the
  reason selector and separate reason sets;
- `sales-debit` uses customer-liability increase reasons such as additional
  charges/underbilling, rate increases, tax short charged, and late fees;
- `purchase-debit` uses vendor-liability reduction reasons such as purchase
  returns, short supply, rejected goods, vendor overbilling, rebates, and tax
  overcharges;
- `AccountingInvoiceForm` selects the correct list from its fixed note kind;
- the `/accounting/quotations` adjustment dialog uses the sales-debit list only
  when `DEBIT` is selected and preserves its free-text credit-note reason;
- switching the dialog note type clears the previous reason so an incompatible
  credit reason cannot be submitted with a debit note.

Files:

- `src/components/monolith/accounting-note-reason-select.tsx`
- `src/components/monolith/accounting-note-reason-select.test.tsx`
- `src/components/monolith/accounting-invoice-form.tsx`
- `src/app/(dashboard)/accounting/quotations/quotations-client.tsx`

Backup:

- `OLD UI code/ui-iteration-backups/accounting-debit-note-reasons-20260731/`

Verification:

- targeted ESLint passed;
- focused Vitest coverage passed: 3 tests;
- TypeScript passed with the required 8 GB Node heap;
- authenticated visual QA remains pending because no in-app browser instance
  is available.

## 2026-07-31 purchase-credit reason classification handoff

The shared reason selector now treats purchase credit notes as vendor-liability
increases.

Delivered:

- added `purchaseCreditNoteReasons` in
  `src/components/monolith/accounting-note-reason-select.tsx`;
- the reasons cover vendor underbilling, rate increases, quantities received but
  not billed, vendor freight/handling, tax short charged, reversal of a purchase
  return or debit note, late charges, and purchase-invoice correction;
- `noteReasonsFor("purchase-credit")` now returns only this list, instead of the
  sales-credit list;
- focused coverage confirms purchase-credit reasons exclude both sales-return
  and vendor-liability-reduction choices.

Backup:

- `OLD UI code/ui-iteration-backups/accounting-purchase-credit-note-reasons-20260731/`

Verification:

- targeted ESLint passed;
- focused Vitest coverage passed: 4 tests;
- TypeScript passed with the required 8 GB Node heap;
- authenticated browser QA remains pending because no browser instance is
  available.

## 2026-08-01 journal draft editing and submitted review-flow handoff

Manual journals now use a clearer maker-checker path with draft editing,
explicit submission, and approve-or-reject review.

Delivered:

- `src/app/(dashboard)/accounting/journal-entries/[id]/page.tsx` now shows
  draft edit/submit controls only when the record is still `DRAFT`, the current
  user is the maker, and `accounting.journal.prepare` is granted;
- `src/app/(dashboard)/accounting/journal-entries/new/page.tsx` and
  `new-jv-client.tsx` support `?edit=<journalId>` draft hydration so the maker
  can revise an existing draft from the shared journal composer instead of a
  separate one-off screen;
- `src/modules/accounting/actions.ts` and
  `src/modules/accounting/service.ts` now split journal lifecycle work into
  create draft, update draft, submit for approval, approve/post, and reject;
- submitted journals are no longer editable and the approvals queue now reads
  from `SUBMITTED` status in
  `src/app/(dashboard)/accounting/approvals/page.tsx`;
- `src/components/monolith/accounting-operational-actions.tsx` now gives the
  checker two outcomes on submitted journals: `Approve and post` or `Reject`,
  with rejection requiring a reason and ending in `CANCELLED`;
- contact-enabled ledgers now require a selected contact before draft save,
  submission, or approval-posting can succeed.

Files:

- `src/app/(dashboard)/accounting/journal-entries/[id]/page.tsx`
- `src/app/(dashboard)/accounting/journal-entries/new/page.tsx`
- `src/app/(dashboard)/accounting/journal-entries/new/new-jv-client.tsx`
- `src/app/(dashboard)/accounting/journal-entries/page.tsx`
- `src/app/(dashboard)/accounting/approvals/page.tsx`
- `src/components/monolith/accounting-operational-actions.tsx`
- `src/modules/accounting/actions.ts`
- `src/modules/accounting/operational-actions.ts`
- `src/modules/accounting/operational-helpers.ts`
- `src/modules/accounting/service.ts`
- `src/modules/accounting/__tests__/posting-boundary.architecture.test.ts`

Verification:

- TypeScript passed with the required 8 GB Node heap;
- targeted ESLint passed for the touched journal UI/action/test files;
- the focused posting-boundary architecture test still has one unrelated
  historical failure because it expects `QUOTATION_CONVERSION_GATED` in
  `src/modules/accounting/service.ts`;
- authenticated browser QA is still pending because no in-app browser instance
  is available in this session.

## 2026-08-01 accounting sidebar heading alignment handoff

The shared Accounting navigation now matches the intended Banking and Accountant
grouping more closely instead of fragmenting those items across mixed headings.

Delivered:

- `src/lib/navigation.ts` now keeps sales invoices, sales credit notes,
  purchase invoices, purchase debit notes, and vendor master inside the Banking
  heading block alongside overview, payments, customer receipts, vendor
  payments, and allocations;
- General Ledger now carries the same Accountant section label as manual
  journals and the adjacent accountant tools, preventing the heading from
  restarting unexpectedly;
- Recurring Journals was moved into the main Accountant cluster so it behaves as
  part of the same control area instead of surfacing later as a separate label
  break;
- `src/components/monolith/accounting-workspace.tsx` now exposes Banking route
  chrome as `Overview` for `/accounting/banking` and `Payments` for
  `/accounting/payments`;
- `src/app/(dashboard)/accounting/banking/banking-client.tsx` now uses the same
  `Payments` wording in its connected-workflow shortcuts.

Files:

- `src/lib/navigation.ts`
- `src/components/monolith/accounting-workspace.tsx`
- `src/app/(dashboard)/accounting/banking/banking-client.tsx`

Verification:

- targeted ESLint passed for the touched navigation and Banking workspace files;
- TypeScript passed with the required 8 GB Node heap;
- authenticated browser QA remains pending because no in-app browser instance
  is available in this session.

## 2026-08-01 Banking foundation audit and hardening handoff

The Banking overview and account workspace foundation were audited after the
initial delivery, and the Banking slice now has tighter server-side invariants
plus fuller focused coverage.

Delivered:

- `src/modules/accounting/banking-service.ts` now validates supported account
  kinds, rejects duplicate bank-ledger mappings before persistence, blocks
  unsafe currency or ledger changes after dependent Banking activity exists,
  treats inactivation idempotently, and uses stricter posted-ledger filtering
  for book-balance and running-balance queries;
- the browser still receives only serializable DTOs and masked identifiers;
- `src/app/(dashboard)/accounting/banking/loading.tsx` now provides a Banking
  route loading state using the shared Monolith accounting loading surface;
- focused Banking tests now cover route read access, manage permission
  enforcement, masking edge cases, duplicate mapping protection, balance
  separation, and opening carry-forward behavior.

Files:

- `src/modules/accounting/banking-service.ts`
- `src/modules/accounting/__tests__/banking-service.test.ts`
- `src/modules/accounting/__tests__/banking-actions.test.ts`
- `src/modules/accounting/__tests__/banking-route-access.test.ts`
- `src/app/(dashboard)/accounting/banking/banking-client.test.tsx`
- `src/app/(dashboard)/accounting/banking/loading.tsx`

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/banking-shared.ts' 'src/modules/accounting/banking-service.ts' 'src/modules/accounting/banking-actions.ts' 'src/modules/accounting/__tests__/banking-service.test.ts' 'src/modules/accounting/__tests__/banking-actions.test.ts' 'src/modules/accounting/__tests__/banking-route-access.test.ts' 'src/app/(dashboard)/accounting/banking/page.tsx' 'src/app/(dashboard)/accounting/banking/banking-client.tsx' 'src/app/(dashboard)/accounting/banking/banking-client.test.tsx' 'src/app/(dashboard)/accounting/banking/loading.tsx' 'src/app/(dashboard)/accounting/banking/[bankAccountId]/page.tsx' 'src/app/(dashboard)/accounting/banking/[bankAccountId]/bank-account-client.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/modules/accounting/__tests__/banking-service.test.ts' 'src/modules/accounting/__tests__/banking-actions.test.ts' 'src/modules/accounting/__tests__/banking-route-access.test.ts' 'src/app/(dashboard)/accounting/banking/banking-client.test.tsx' --reporter verbose`:
  passed, 4 files / 22 tests;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed, while the
  existing Turbopack NFT tracing warning remains from `next.config.ts` through
  `src/app/api/customer-portal/checklist-files/[id]/route.ts`.

Known limits:

- Banking access denial still resolves through the shared
  `/accounting/access-denied` route gate before page rendering, not a
  Banking-local denied page;
- the explicit confirmation dialog itself is still exercised primarily through
  the shared dialog system and static Banking render coverage rather than a
  separate interactive Banking-specific browser test in this session;
- no connectors, statement imports, reconciliation, rules, or other later
  Banking phases were started here.

## 2026-08-01 Banking statement import and uncategorized review handoff

The Banking overview and account workspace now include the next functional
Banking phase: manual CSV statement import, statement import history, imported
Amount in Bank updates, and a read-only Uncategorized Transactions view.

Delivered:

- `src/modules/accounting/banking-import.ts` was added for CSV tokenization,
  explicit date-format parsing, decimal normalization, duplicate fingerprinting,
  bounded preview summarization, and tenant-scoped local storage under
  `storage/accounting-banking-imports`;
- `src/modules/accounting/banking-statements-service.ts` was added and
  `src/modules/accounting/banking-service.ts` / `src/modules/accounting/banking-actions.ts`
  were extended so Banking can preview and commit CSV statements, record
  account-scoped history, keep Amount in Bank tied only to completed statement
  imports, and surface uncategorized unresolved statement lines without posting
  journals;
- `src/app/(dashboard)/accounting/banking/statement-dialog.tsx` was added and
  both Banking clients now use it for a working Bank Statements experience from
  the overview and the per-account workspace;
- `src/app/(dashboard)/accounting/banking/[bankAccountId]/bank-account-client.tsx`
  now exposes a read-only `Uncategorized transactions` view with server-backed
  search, date filters, direction filters, pagination, and source-statement
  status data;
- focused Banking tests now cover 5 files / 26 tests, including the new
  `src/modules/accounting/__tests__/banking-import.test.ts` parser and
  duplicate-handling coverage.

Files:

- `src/modules/accounting/banking-import.ts`
- `src/modules/accounting/banking-statements-service.ts`
- `src/modules/accounting/banking-service.ts`
- `src/modules/accounting/banking-actions.ts`
- `src/modules/accounting/__tests__/banking-import.test.ts`
- `src/modules/accounting/__tests__/banking-service.test.ts`
- `src/app/(dashboard)/accounting/banking/page.tsx`
- `src/app/(dashboard)/accounting/banking/statement-dialog.tsx`
- `src/app/(dashboard)/accounting/banking/banking-client.tsx`
- `src/app/(dashboard)/accounting/banking/banking-client.test.tsx`
- `src/app/(dashboard)/accounting/banking/[bankAccountId]/page.tsx`
- `src/app/(dashboard)/accounting/banking/[bankAccountId]/bank-account-client.tsx`

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/banking-import.ts' 'src/modules/accounting/banking-statements-service.ts' 'src/modules/accounting/banking-service.ts' 'src/modules/accounting/banking-actions.ts' 'src/app/(dashboard)/accounting/banking/statement-dialog.tsx' 'src/app/(dashboard)/accounting/banking/banking-client.tsx' 'src/app/(dashboard)/accounting/banking/[bankAccountId]/bank-account-client.tsx' 'src/app/(dashboard)/accounting/banking/page.tsx' 'src/app/(dashboard)/accounting/banking/[bankAccountId]/page.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/modules/accounting/__tests__/banking-import.test.ts' 'src/modules/accounting/__tests__/banking-service.test.ts' 'src/modules/accounting/__tests__/banking-actions.test.ts' 'src/modules/accounting/__tests__/banking-route-access.test.ts' 'src/app/(dashboard)/accounting/banking/banking-client.test.tsx' --reporter verbose`:
  passed, 5 files / 26 tests;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed, while the
  existing Turbopack NFT tracing warning remains from `next.config.ts` through
  `src/app/api/customer-portal/document-versions/[id]/route.ts`.

Known limits:

- supported statement format is CSV only in this phase; no OFX/QFX/QIF/MT940,
  CAMT, XLSX, PDF, OCR, or connector import paths were started;
- the import flow is synchronous and bounded by file-size and row-count limits
  rather than using a separate Banking background job framework;
- the Banking UI deliberately omits rules, quick categorize, matching,
  reconciliation, undo import, and external connector controls until those
  backing services exist.

## 2026-08-04 Shared filter active-link design-system handoff

The compact filter summary row is now part of the shared filter design system
instead of being a CHA Jobs-only implementation.

Delivered:

- `src/components/forms/filter-menu.tsx` now exports `FilterActiveLinks`, a
  shared tiny text-link summary row for active filters and clear actions;
- `src/styles/monolith-system.css` now defines the compact active-link spacing,
  reduced row height, small font size, and hover/focus treatment for that
  shared summary pattern;
- `src/app/(dashboard)/cha/jobs/jobs-client.tsx` now consumes the shared
  summary component instead of route-local inline classes;
- `src/app/(dashboard)/cha/customers/customers-filter-bar.tsx` now shows the
  same compact active-filter summary row beneath the filter/search controls so
  CHA customer filters match the shared pattern.

Verification on Tuesday, August 4, 2026:

- pending focused ESLint on the touched shared filter files and CHA consumers in
  this pass.

Known limits:

- AMS appraisal filters and HRMS employee directory filters still use their
  existing custom panel bodies because they are not yet built on the shared
  categorized filter-panel pattern;
- this pass standardizes the compact active-filter summary treatment and does
  not change saved-view persistence behavior.

## 2026-08-09 CHA approvals workspace clarification handoff

The `/cha/approvals` route has been re-composed so the page reads like a real
decision workspace instead of two loosely spaced empty regions.

Delivered:

- `src/app/(dashboard)/cha/approvals/page.tsx` now uses shared
  `WorkspacePage`, `WorkspacePageHeader`, `WorkspaceMetric`, `WorkspacePanel`,
  `WorkspaceSectionHeading`, and `WorkspaceEmptyState` primitives;
- the route now shows a compact summary metric strip for checklist audits,
  deletion requests, and approval scope before the queue panels;
- both approval queues now live inside panelized surfaces with clearer section
  headings, badge counts, canonical empty states, and canonical `ButtonLink`
  actions instead of route-local button skins.

Verification on Sunday, August 9, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/cha/approvals/page.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed.

Known limits:

- manual browser verification is still pending in this Codex session;
- `docs/ui-route-audit.md` and `docs/ui-component-and-style-ownership-audit.md`
  have not yet been regenerated for this route after the composition change, so
  the migration status remains conservatively `PARTIAL` for now.

## 2026-08-09 Shared highlight standardization handoff

The cross-route accent highlight treatment has been normalized to a lighter,
shared reference so selected rows, hover rows, and accent-soft surfaces stop
shifting between darker and lighter variants across modules.

Delivered:

- `src/styles/monolith-system.css` now defines shared highlight variables:
  `--mnx-highlight-surface`, `--mnx-highlight-surface-soft`, and
  `--mnx-highlight-border`;
- shared utility treatments such as `mnx-bg-accent-soft` and
  `mnx-hover-accent` now use that same light highlight surface;
- shared selected-state patterns now use the same standard highlight tone,
  including Todo rows, Expenses queue rows, admin selected tabs/roles, and
  accounting account-structure rows;
- module overrides that previously kept darker/local accent highlight behavior
  were aligned in:
  `src/styles/modules/cha-expense.css`,
  `src/styles/modules/communication-admin.css`,
  `src/styles/modules/accounting.css`,
  and `src/styles/modules/crm.css`.

Verification on Sunday, August 9, 2026:

- no TypeScript-impacting code changed in this batch; focused verification was
  limited to stylesheet diff review and selector coverage inspection.

Known limits:

- this standardization fixes routes that inherit shared Monolith highlight
  utilities or the patched selected-state selectors, but a full runtime sweep of
  every route is still pending;
- any remaining page that uses route-local arbitrary color classes instead of
  shared highlight utilities may still need a targeted follow-up pass.

## 2026-08-09 Customer portal design-system uplift handoff

The customer portal now inherits the updated Monolith page-header and card
language instead of staying on the older portal-local surface treatment.

Delivered:

- `src/styles/monolith-system.css` now upgrades customer portal page headers,
  portal panels, portal interactive cards, portal title/icon treatments, and
  portal card-header/card-content spacing so dashboard/list/detail portal
  surfaces align with the current Monolith card system;
- `src/components/monolith/customer-portal-workspace.tsx` now uses a balanced
  auth-stage intro + panel composition for customer portal auth screens instead
  of leaving the old empty left column;
- `src/app/customer-portal/approvals/page.tsx`,
  `src/app/customer-portal/notifications/page.tsx`, and
  `src/app/customer-portal/quotations/page.tsx` now use shared customer portal
  panels and canonical workspace empty states instead of route-local legacy card
  shells;
- the customer portal dashboard, shipments list, shipment detail, quotations
  detail, and KYC workspace continue to use some route-local business
  composition, but now inherit the refreshed shared portal header/card styles.

Verification on Sunday, August 9, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/customer-portal/approvals/page.tsx' 'src/app/customer-portal/notifications/page.tsx' 'src/app/customer-portal/quotations/page.tsx' 'src/components/monolith/customer-portal-workspace.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  failed due to an existing generated Next dev typing issue:
  `.next/dev/types/validator.ts` reports that
  `.next/dev/types/routes.d.ts` is not a module.

Known limits:

- manual browser verification across the full customer portal route family is
  still pending in this Codex session;
- the dashboard and shipment detail workspaces still intentionally preserve
  some route-local business composition, even though they now inherit the
  refreshed shared portal surface treatment;
- `docs/ui-route-audit.md` and
  `docs/ui-component-and-style-ownership-audit.md` have not yet been
  regenerated after this customer portal batch.

## 2026-08-14 AMS spacing and design-system alignment handoff

The AMS route family received a focused spacing, alignment, and shared-surface
 pass so the main route wrappers lean on the production performance workspace
 primitives instead of mixing route-local card shells and ad hoc spacing.

Delivered:

- `src/app/(dashboard)/ams/page.tsx` now uses shared section actions and
  consistent card spacing for the AMS action-lane dashboard;
- `src/app/(dashboard)/ams/appraisals/page.tsx`,
  `src/app/(dashboard)/ams/assets/page.tsx`,
  `src/app/(dashboard)/ams/extensions/page.tsx`,
  `src/app/(dashboard)/ams/history/page.tsx`,
  `src/app/(dashboard)/ams/kpi/page.tsx`,
  `src/app/(dashboard)/ams/my-appraisal/page.tsx`,
  `src/app/(dashboard)/ams/my-appraisal/[id]/self-assessment/page.tsx`, and
  `src/app/(dashboard)/ams/slabs/page.tsx` now use
  `PerformanceSection`, `PerformanceSectionHeader`, shared workspace alerts,
  state blocks, and normalized inner padding instead of older mixed wrappers;
- `src/app/(dashboard)/ams/assets/[id]/page.tsx` was rebuilt onto the shared
  workspace composition with a consistent detail header, profile summary, and
  depreciation journal presentation;
- `src/app/(dashboard)/ams/extensions/page.tsx` and
  `src/app/(dashboard)/ams/extensions/extensions-client.tsx` were tightened so
  the page wrapper is typed cleanly and the targeted AMS lint pass closes
  without warnings;
- `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` were regenerated after the
  AMS batch.

Verification on Friday, August 14, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/ams/page.tsx' 'src/app/(dashboard)/ams/appraisals/page.tsx' 'src/app/(dashboard)/ams/assets/page.tsx' 'src/app/(dashboard)/ams/assets/[id]/page.tsx' 'src/app/(dashboard)/ams/history/page.tsx' 'src/app/(dashboard)/ams/slabs/page.tsx' 'src/app/(dashboard)/ams/my-appraisal/page.tsx' 'src/app/(dashboard)/ams/my-appraisal/[id]/self-assessment/page.tsx' 'src/app/(dashboard)/ams/kpi/page.tsx' 'src/app/(dashboard)/ams/extensions/page.tsx' 'src/app/(dashboard)/ams/extensions/extensions-client.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route + migration status docs;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit.

Known limits:

- static audit output improved, but several AMS routes remain conservatively
  classified as `PARTIAL` or `NON_COMPLIANT` because route-local business
  composition still uses raw headings, cards, or utility-heavy inner sections;
- no manual browser/runtime verification was completed in this Codex session,
  so visual confirmation across Light, Night, and Violet themes is still
  pending;
- broader repo baselines outside this AMS batch remain unchanged, including the
  previously known `architecture:check` and `design-system:verify` failures
  noted earlier in the migration stream.

## 2026-08-25 CRM enquiry shared-context compact rail handoff

What changed:

- `src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx` now renders
  the shared-context navigation from the `CrmSection` header actions so Notes,
  Tasks, Audit, Time, and Calls sit in a compact top-right utility rail instead
  of consuming a full-width row;
- the active context is surfaced in a small status pill while the existing tab
  content panels remain unchanged below, preserving all notes, activity, audit,
  time-tracker, and call behavior;
- `src/styles/modules/crm.css` adds route-local styling for the compact rail,
  pill counters, and mobile fallback so the control stays small on desktop and
  reflows cleanly on narrower widths.

Verification on Tuesday, August 25, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; .\node_modules\.bin\eslint.cmd 'src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx' 'src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx' --max-warnings=0`:
  failed because `src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx`
  already has pre-existing `@typescript-eslint/no-explicit-any` and
  `react-hooks/set-state-in-effect` violations in untouched areas of the file.

Known limits:

- no manual browser/runtime verification was completed in this Codex session, so
  final visual confirmation for the compact top-right rail across Light, Night,
  and Violet themes is still pending;
- the enquiry detail client still carries older lint debt unrelated to this
  layout adjustment, so a repo-clean lint pass will need a separate cleanup
  batch for that route.
