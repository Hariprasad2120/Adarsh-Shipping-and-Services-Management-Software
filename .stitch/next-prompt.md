# next-prompt.md — Next Stitch iteration

## BLOCKED: Stitch MCP not connected

`stitch` MCP server is configured but returns `CONNECTION_CLOSED`. No `mcp__stitch__*`
tools are available. Phases 8, 12 (import existing dashboard, generate variants) cannot run.

### To unblock
1. Ensure `STITCH_API_KEY` is set as an OS/user env var **outside the repo** (a fresh,
   rotated key — the one pasted into chat earlier is compromised).
2. `claude mcp add stitch --scope user -- npx -y @_davideast/stitch-mcp proxy`
3. Fully restart Claude Code (child process inherits env only at launch).
4. Verify: `claude mcp list` → `stitch: ✔ Connected`.

---

## When unblocked — next iteration target

**Route:** `/dashboard`
**Page pattern:** DASHBOARD (`PAGE-PATTERNS.md` §1)
**Current purpose:** Personal operations home for every employee.
**UX audit:** `docs/ui-audit/page-ux-audit.md` (dashboard section). Key problems: giant
profile hero, oversized attendance panel with clock + celebration animation, pending counts
duplicated in 3 places, `padStart(2,"0")` renders big "00" zeros, analytics before action,
13 decorative module graphics.
**Required functionality (must survive redesign):**
- `getMe`, `getDashboardWidgets`, `getDashboardModuleSnapshot`, `getDashboardCommandCenterSnapshot`
  data contracts unchanged.
- Punch actions via `POST /api/hrms/attendance/punch` (`CHECK_IN` / `START_BREAK` /
  `CHECK_OUT` / `RESUME_WORK`); refresh via `/api/hrms/me` + `/api/hrms/dashboard`.
- Tab lazy-loads: team → `/api/hrms/team/reportees`, organization → `/api/dashboard/organization`.
- RBAC filtering of module snapshot preserved (`getVisibleSections`, `TOGGLEABLE_MODULE_SET`).
- CHA edition redirect (`isChaEdition()` → `/cha`).
**DESIGN.md rules:** semantic `--mn-*` tokens only; Geist; compact density; no new hex; kill
decorative motion.
**UX-RULES.md rules:** Global 1–11 + Dashboard section (attention-first ordering, compact
attendance, no big zero cards, single count instance, analytics last).
**Canonical components:** reuse `WorkspacePage`, `WorkspacePageHeader`,
`WorkspaceSectionHeading`, `OperationalDataTable`, `Tabs`, `Badge`, `Button`,
`WorkspaceLoadingState`/`ErrorState`. Build new: `AttentionList`, `Metric` (compact),
`QuickActions`, `ActivityFeed`.
**Responsive:** 3-col hub → 1-col at tablet; attention queue full-width always; tables
scroll in own container.

### Deliverable this iteration
1. Import current `/dashboard` render into Stitch (code-to-design), screen name `/dashboard`.
2. Generate 3 variants:
   - A — Maximum productivity / compact enterprise
   - B — Balanced enterprise dashboard
   - C — Information-dense command center
   All follow DESIGN.md + UX-RULES.md; differ on IA / hierarchy / density, not color.
3. Score against: task completion, information hierarchy, cognitive load, scannability,
   enterprise suitability, accessibility, responsive, design-system reusability.
4. Record project id + screen ids + versions in `metadata.json`.
5. Present variants + recommendation. **STOP for user approval before implementation.**

### After approval
Update SITE.md, ROUTES.md, COMPONENTS.md, `docs/ui-audit/*`, metadata.json, this file →
move to page-pattern migration (Phase 19), LIST/TABLE pattern first.
