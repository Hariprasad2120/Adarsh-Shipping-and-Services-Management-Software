# Page UX Audit

Method (brief Phase 4): for each surface — why does it exist, what is the user doing, what
must be visible, what is secondary/moved/merged/removed, what is missing. Every section gets
KEEP / MODIFY / MOVE / MERGE / REMOVE + priority P0–P4 + frequency.

First target: `/dashboard`. Others audited per-pattern during migration.

---

## `/dashboard`

**Why it exists:** personal operations home for every employee. **User goal:** "What needs
me, what do I do next." **Frequency:** CONSTANT (first page after login).

Data sources (must be preserved): `getMe`, `getDashboardWidgets`,
`getDashboardModuleSnapshot` (RBAC-filtered), `getDashboardCommandCenterSnapshot`.
Client: `portal-client.tsx` (335) → `AttendanceCommand` (415) + tabs → `DashboardOverview`
(449) / `DashboardTeam` (239) / `DashboardOrganization` (631).

### Section classification

| # | Current section (class) | What it does | Verdict | Priority | Freq | Notes |
|---|---|---|---|---|---|---|
| 1 | Profile identity card — avatar mark, "Welcome back,", `<h1>{name}</h1>`, designation, employee no (`.mnx-dashboard-identity-card`) | vanity header | **REMOVE** | P4 | RARE | Identity belongs in sidebar/account. Zero action. Eats first viewport. |
| 2 | Dept / branch / manager chips (`.mnx-dashboard-context`) | profile metadata | **REMOVE** (or MOVE to account) | P4 | EXCEPTION | |
| 3 | Hero insight grid — Priority queue / Leave desk / Helpdesk watch, values `padStart(2,"0")` (`.mnx-dashboard-insight-grid`) | 3 stat tiles | **MERGE** into #7 attention queue | P1 | DAILY | Duplicates #8 metrics + #10 exceptions. Renders big "00" when zero — anti-pattern. |
| 4 | Attendance panel — `LIVE ATTENDANCE`, status, badge, date row, running clock, "time worked", detail line, action buttons, "Today's guide" footer, celebration + action-burst animations (`.mnx-attendance-panel`, `.mnx-dashboard-timer`, `.mnx-celebration`, `.mnx-attendance-action-burst`) | punch in/out + status | **MODIFY → compact** | P1 | DAILY | Keep: current status + one primary punch button + elapsed time (small). Remove: celebration burst, 6-span action burst, "Today's guide", oversized clock, decorative pulse. |
| 5 | Workspace tabs — My space / Team / Organization (`.mnx-dashboard-tabs`, native `<button>`, 33 CSS rules) | switch views | **MODIFY** | P2 | OCCASIONAL | Keep tabs, use canonical `Tabs`. "Organization" (directory) is arguably not dashboard — candidate to MOVE to `/hrms/org-structure`. |
| 6 | Overview metrics — Announcements / Pending tasks / Upcoming holidays, `padStart(2,"0")` (`.mnx-dashboard-metrics`) | 3 stat cards | **MERGE / REMOVE** | P3 | OCCASIONAL | Announcements+holidays are P3 info, not metrics. Pending tasks belongs in attention queue. Collapse. |
| 7 | *(missing)* Attention queue — approvals, exceptions, tasks needing action, in one ranked list | — | **ADD** | **P0** | CONSTANT | The reason the page exists. Currently scattered across #3, #10, #11. `commandCenterSnapshot.attentionItems` already provides the data. |
| 8 | Command feed — Latest announcement + Priority focus cards (`.mnx-feed-panel`, `.mnx-dashboard-announcement-shadow`) | 2 large cards | **MERGE** | P3 | OCCASIONAL | Announcement → collapsed secondary. Priority focus → into #7. |
| 9 | Task pipeline — 5 recent tasks + "Open task workspace" link (`.mnx-task-list`) | task preview | **MERGE** into #7 (tasks needing action) + keep link | P1 | DAILY | |
| 10 | Recent activity table (`.mnx-table-card`, raw `<table>`) | operational movement log | **KEEP** (→ `ActivityFeed` / `OperationalDataTable`) | P2 | DAILY | Legit. Move below attention queue. |
| 11 | Exceptions panel — "Needs attention", `attentionItems.slice(0,4)` (`.mnx-dashboard-brief-panel`) | urgent items | **MERGE** into #7 | **P0** | CONSTANT | This IS the attention queue, half-built and buried in the aside. |
| 12 | Quick launch — 6 module shortcut links (`.mnx-dashboard-launch-list`) | launcher | **KEEP** (→ `QuickActions`, compact) | P2 | DAILY | |
| 13 | Company calendar — next holiday feature block (`.mnx-holiday-panel`) | next holiday | **MODIFY → one line** | P3 | OCCASIONAL | One row, not a featured block with big date stamp. Collapse when none. |
| 14 | Analytics & Workflows — 3 `DashboardInsightCard` mini bar charts (module pulse, appraisal stages, attendance signals) | analytics strip | **MOVE** below the fold / to a `/dashboard/insights` or module analytics | P2 | OCCASIONAL | Never before actionable work (UX-RULES). |
| 15 | Module command center — `ModuleCommandCenter` grid of module cards (`.mnx-module-card`, 30 CSS rules) | module nav | **MODIFY** | P2 | OCCASIONAL | Overlaps sidebar + #12. Compact, or fold into QuickActions. |
| 16 | 13 SVG feature graphics (`graphics/*.tsx`, `.mnx-*-graphic` 14+22 CSS rules each) | decoration | **REMOVE** from dashboard | P4 | EXCEPTION | Pure decoration. Keep files for marketing/catalogue if wanted; not on the ops home. |
| 17 | Team tab — reportees + live attendance (`DashboardTeam`) | manager view | **KEEP** (lazy) | P2 | OCCASIONAL | Fine as a tab. |
| 18 | Organization tab — employee directory + org structure (`DashboardOrganization`, 631 lines) | directory | **MOVE** to `/hrms/org-structure` / `/hrms/employees` | P3 | RARE | Not a dashboard concern; it's a full directory pattern. |

### Missing (brief: "what is missing")

- A single ranked **attention queue** as the top section (P0).
- Clear "you're all clear" quiet state when the queue is empty (not big zero cards).
- Deadlines / due-today rollup (P1).
- Keyboard shortcut to punch + to jump to first attention item.

### Target dashboard structure (feeds Stitch variants)

```
WorkspacePageHeader        eyebrow "Operations" · h1 (no name) · primary action = punch (contextual)
AttentionQueue [P0]        ranked: approvals + exceptions + tasks-needing-action; quiet state when empty
TodayStrip [P1]            compact attendance status + elapsed + punch · deadlines rollup
[ QuickActions ][P2]       [ ActivityFeed ][P2]      (two columns; collapse to one on tablet)
SecondaryAccordion [P3]    Announcements · Next holiday · (collapsed by default)
--- below fold / separate route ---
Analytics [P2]             the 3 insight charts
Team / Organization        tabs or move Organization out entirely
```

---

## Other patterns — audited during migration

`INDEX/LIST`, `DATA TABLE`, `ENTITY DETAIL`, `FORM`, `SETTINGS`, `WORKFLOW`, `WIZARD`,
`REPORT`, `CALENDAR`, `KANBAN`, `APPROVALS` — each gets a section here when its anchor route
is audited (see `.stitch/ROUTES.md` for anchors and `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`
for the 101 NON_COMPLIANT routes that drive priority).
