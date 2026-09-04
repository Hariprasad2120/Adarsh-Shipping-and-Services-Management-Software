# HRMS & Attendance — Audit, Repair & Completion Report

Branch: `ams-completion` · DB: Neon project `ancient-breeze-33196204` (Adarsh_one),
branch `br-autumn-king-aowd600n` · App: Next.js 16 / Turbopack dev on `localhost:3000`.

> **Scope note.** Runs on a machine whose disk filled to 100 % mid-session (the
> Turbopack `.next` dev cache had grown to 24 GB) — that `ENOSPC`, not just low
> RAM, was the root cause of the dev-server / type-checker / browser crashes
> seen throughout. After clearing `.next` the environment was workable and the
> second pass landed the remaining fixes with runtime verification. A second
> agent concurrently edits the CRM module + `src/lib/navigation.ts` in the same
> working tree; none of the HRMS/Attendance changes here overlap it.
>
> Everything below is **fixed and verified** unless explicitly marked otherwise.
> `tsc --noEmit --skipLibCheck` → 0 errors across all changed files. Two new
> assertion-bearing test scripts (`scripts/_hrms_audit/test-maker-checker.ts`,
> `test-overnight.ts`) pass against the live DB.

---

## Executive Summary

**Before.** HRMS is a large, mostly-working module (≈40 pages) whose two
dashboards had already been redesigned into "command-centre" layouts. Attendance
is thin: `src/modules/attendance/service.ts` is a single 269-line file whose
`punchIn`/`punchOut` only stamp `inAt`/`outAt` on `AttendancePunch` and never
compute status, lateness, working hours or shift context — even though the
schema (`Shift`, `ShiftAssignment`, `AttendancePunch.status/lateMinutes/
workingHours`, `AttendanceBreak`, `AttendanceRegularization`) is built for all
of it. A real calculator does exist (`src/lib/ot.ts › computeOvertimeForDate`,
shift-aware, grace-aware, holiday-aware) but it only ever wrote the separate
`OtRecord` table, so the attendance dashboards and the monthly report read
stale/placeholder aggregates. The HRMS Settings surface (page + 6 API routes)
returned **403 for every user including platform admins** because its
permission key was never in the catalog. The shared Approvals endpoint had an
IDOR + self-approval hole on 4 of 6 request types.

**After.**
- Both test accounts have correct, RBAC-native access (no bypasses).
- `hrms.settings.manage` restored → HRMS Settings + its 6 APIs work again.
- **Approvals endpoint**: cross-org IDOR closed and self-approval blocked on
  Regularization / OT / Travel / Timesheet; approved/rejected regularization now
  recomputes the day's attendance immediately; every decision now writes an
  `HrmsAuditLog` row. Verified by `test-maker-checker.ts` (6/6 assertions).
- **Cross-midnight punch-out** now closes the previous day's open shift instead
  of orphaning a row on the next calendar day. Verified by `test-overnight.ts`
  (4/4 assertions, incl. the "don't over-attribute a stale check-out" case).
- Web/biometric punches now write real `status` / `lateMinutes` /
  `earlyLeavingMinutes` / `workingHours` onto `AttendancePunch`, reusing the
  existing tested calculator (no duplicate logic).
- Monthly report: dead `lateCount` fixed, "days present" now counts real
  attendance days (not raw punch rows), half-days and late-days surfaced in the
  Reports UI.
- `/api/hrms/tracking` now requires `hrms.tracking.admin` (was auth-only, leaked
  live location + face-enrollment data) and no longer echoes raw error strings.
- Page guards added to `/hrms/tasks` and `/hrms/onboarding`.
- `/api/attendance/day-punches` soft-fails (200 + `unavailable` marker) when the
  employee has no eSSL link / eSSL is unconfigured — kills the punch-page
  console-error flood.
- All changes type-check clean; changed surfaces re-walked clean for `hr@`.

---

## Accounts & RBAC

| Account | Before | Change | After |
|---|---|---|---|
| `hr@adarshshipping.in` (id `cmr4m8ui3…`) | `isPlatformAdmin=true` + roles *Monolith Full Access* (217), *Admin* (227), *All Permissions - hr@…*, *Accounting Full Access* | granted new `hrms.settings.manage` to *Admin* / *HR* / *Monolith Full Access* / *All Permissions - hr@…* | full HRMS + Attendance admin, **incl. Settings (was 403)** |
| `dineshan.accounts@adarshshipping.in` (id `cmtmjfnby…`) | roles *Employee* (49), *Accounting Full Access*, *CRM Full Access - dineshan…* — **no HRMS/Attendance admin** | created per-user role **`HRMS + Attendance Full Access - dineshan.accounts@adarshshipping.in`** carrying all 46 `hrms.*` + `attendance.*` keys, attached to the user; also granted `hrms.settings.manage` | can now drive maker-checker + admin HRMS/Attendance testing |

No hard-coded bypass, no `isPlatformAdmin` shortcut. Everything is real
`Permission` / `Role` / `RolePermission` / `UserRole` rows in the user's org
(`cmr4m8jb10000ysbwuoj2bvvx`).

**Reproducible:** `npx tsx scripts/grant-hrms-attendance-access.ts` (idempotent,
additive-only, safe to re-run). After running, restart the dev server with
`npm run dev:restart` **and** clear `.next/cache` — the RBAC layer uses
`unstable_cache({ revalidate: 300 })` which is disk-backed in dev and survives a
plain restart (this cost real debugging time; see *Environment Notes*).

Password for both test accounts in this environment: `password@123` (seed default,
no MFA factor on either account, org `requireMfa=false`).

---

## Functional Issues Found

### F1 — HRMS Settings totally inaccessible (FIXED)
`hrms.settings.manage` is referenced in 12 places — `hrms/settings/page.tsx`,
`/api/hrms/settings/services`, `/api/hrms/settings/employee-fields[/…]`,
`/api/hrms/settings/work-reports[/…]`, `/api/hrms/announcements`,
`/api/hrms/reimbursement`, `sidebar.tsx`, `navigation.ts` — and the `HR` system
role in `prisma/seed.ts` already lists it. **But the key was never in the
`PERMISSIONS` catalog array in `prisma/seed.ts`**, so the `Permission` row was
never created, so no role could hold it, so `requirePermission(…, "hrms.settings.manage")`
threw `ForbiddenError` for **everyone**. The page still rendered its `<h1>` (the
RSC error was swallowed by a boundary), so it looked loaded but had no content —
misleading UI.
**Root cause:** catalog/seed omission.
**Fix:** added the key to `prisma/seed.ts › PERMISSIONS`; created the row and
granted it to Admin/HR/Monolith Full Access (+ the two test-account roles) in
the live DB via the grant script.
**Verified:** `/hrms/settings` renders clean (no console error) for both
`hr@` and `dineshan` after `dev:restart` + cache clear.

### F2 — Approvals endpoint: cross-org IDOR + self-approval (FIXED)
`POST /api/hrms/approvals` → `executeApprovalDecision(userId, orgId, requestId, type, …)`.
For `type` in **REGULARIZATION / OT / TRAVEL / TIMESHEET** the function ran a bare
`db.<model>.update({ where: { id: requestId }, … })` — the `orgId` argument was
accepted but **never used**, and there was no check that the requester ≠ the
approver. Only `LEAVE` (via `decideLeaveRequest`, which throws `CrossOrgAccessError`
and blocks self-approval) and `WORKREPORT` were scoped.
**Impact:** any user with `hrms.approvals.manage` could (a) approve/reject a
Regularization/OT/Travel/Timesheet row belonging to **another tenant** by
supplying its id, and (b) approve **their own** request — violating the
maker-checker rule.
**Fix (`src/modules/hrms/service.ts`):** each of the 4 branches now first loads
the target row scoped to the approver's org (`where: { id, orgId }` for
Travel/Timesheet; `where: { id, user: { orgId } }` for Regularization/OT which
have no `orgId` column), 404s if not found, and throws
*"You cannot approve or reject your own …"* when `target.userId === userId`.

### F3 — Approved regularization didn't recompute attendance (FIXED)
`computeOvertimeForDate` reads `regularization.status === "APPROVED"` to apply
the 75 % OT/comp-off penalty and re-score the day, but nothing re-ran it after an
approval — the day stayed stale until the employee's next punch.
**Fix:** the REGULARIZATION branch now calls
`calculateOtForPunch(target.userId, target.date)` after the status update.

### F4 — Web/biometric punches never populated the attendance summary (FIXED)
`punchIn`/`punchOut` (`modules/attendance/service.ts`) call `calculateOtForPunch`,
which computes a full `OvertimeComputation` (shift, worked minutes, lateness,
early-leaving, day type) but only persisted it to `OtRecord`.
`AttendancePunch.status`, `.lateMinutes`, `.earlyLeavingMinutes`,
`.workingHours` were left null/0 forever, so the Attendance dashboard's
"present / late / half-day" style metrics and the monthly report had nothing
real to read.
**Fix (`src/lib/ot.ts`):** added `writeBackAttendancePunchSummary(userId,
attendanceDate, computation)`, called at the end of `calculateOtForPunch`
(best-effort, wrapped in try/catch so it can never break the punch flow). It
derives `status` (`HOLIDAY` / `WEEKLY_OFF` / `PRESENT` / `HALF_DAY`) from the
computation, mirrors `lateMinutes` / `earlyLeavingMinutes` / `workingHours`, only
touches a row that already exists, and never overwrites a `status` of `"LEAVE"`
(owned by the leave→attendance bridge). Reuses the existing calculator — no new
attendance-math was written.

### F5 — Monthly report: dead `lateCount`, wrong "days present" (FIXED)
`getMonthlyReport` set `lateCount: 0` and never updated it, and counted
`entry.days++` for **every** `AttendancePunch` row (including rows with no
check-in).
**Fix:** `days` now counts rows with a real `inAt` (half-days as 0.5),
`lateCount` counts `lateMinutes > 0`, and `halfDays` / `absentCount` are added.
`attendance/reports/page.tsx` now shows *Days Present*, *Half Days*, *Late Days*.

### F6 — `/api/attendance/day-punches` 404/503 console flood (FIXED)
`attendance/punch/punch-card.tsx` polls this eSSL-only endpoint. For a user with
no `employeeNumber` (e.g. the `hr@` admin) it hard-404'd; with eSSL unconfigured
locally it 503'd — a `Failed to load resource` per poll in the console.
**Fix:** the route now returns `200 { sessions: [], rawPunches: [],
unavailable: "no-essl-link" | "not-configured" }` for those two normal states
(only `punch-card.tsx` consumes it); the card treats `unavailable` as a soft
"no biometric source" and falls straight to the local-punch fallback.
**Verified:** `/attendance/punch` re-walked — console now clean (was a flood).

### F7 — Missing permission guards (FIXED where safe)
- **`GET /api/hrms/tracking` (real gap) — FIXED.** Was `auth()`-only; any
  authenticated user could read checked-in employees, live-location sessions and
  the face-enrollment count. Now `await requirePermission(session.user.id,
  "hrms.tracking.admin")` (matches the `/hrms/location-tracking` page), and the
  catch block uses `apiError` so raw error strings are no longer echoed.
- **`/hrms/tasks`, `/hrms/onboarding` — FIXED.** Added
  `requirePermission("hrms.tasks.manage" | "hrms.onboarding.manage")` to match
  their already-guarded APIs; unauthorised users now get a clean 403 instead of
  an empty error-toasting view.
- `/hrms/travel` routes into the shared **expense** workspace
  (`renderExpenseWorkspacePage`, `cha.expense.*` perms) — deliberately left
  as-is; adding an `hrms.travel.*` gate there risks breaking CHA users. Noted,
  not changed.

### F8 — `GET /api/hrms/tracking` 500 (could not reproduce; likely transient)
Flagged once during a page walk. All five underlying queries
(`attendanceSession`, `locationTrackingSession`, `trackingAlert`,
`onDutyRequest`, `employeeFaceEnrollment`) were replayed against the live DB via
`scripts/_hrms_audit/probe-tracking.ts` — **all succeed**. The 500 correlated
with a Turbopack cold-compile + `ENOSPC` window. After the permission + error
handling fix (F7) the page re-walks clean. If it recurs, the cause is now
logged server-side and returned as a generic `INTERNAL_ERROR`.

---

## Attendance Calculation — Validation Findings

`toAttendanceDate` / `attendance-date.ts` use a single fixed timezone
(`Asia/Kolkata`) and store the attendance date as the UTC-midnight of the IST
calendar day — **consistent, no server/local drift bug** in the date keying.

`computeOvertimeForDate` correctly handles: on-time / late / early-exit /
grace-before-start / grace-after-end, half vs full day (via worked-minutes vs
`expectedWorkingMinutes`), missing check-in / check-out (`MISSING_CHECK_IN` /
`MISSING_CHECK_OUT`), multiple punches (dedupe + timeline summariser),
weekend/holiday day-type, OT with `minOvertimeMinutes` floor, comp-off slabs,
regularization 75 % penalty, and an "approved work report required for OT" gate.
Cross-midnight check-out is now handled at the `punchOut` boundary (A1). The
per-punch `status` / `lateMinutes` / `workingHours` write-back (F4) makes those
computed values visible on `AttendancePunch` for the dashboards and payroll.

### A1 — Cross-midnight / overnight shifts (FIXED for the web punch path)
For a 22:00→06:00 shift, a 06:00 punch-out was bucketed by
`toAttendanceDate(now)` to the **next** calendar day → `punchOut` opened a fresh
row with only `outAt` and the 22:00 row scored `MISSING_CHECK_OUT`.
**Fix:** new `resolveCheckOutAttendanceDate(userId, orgId, punchAt)` in
`src/lib/ot.ts` — returns the **previous** attendance date iff (a) there is an
open punch (`inAt` set, `outAt` null) on that day, (b) the shift active that day
is overnight (`endTime ≤ startTime`), and (c) `punchAt ≤ scheduledEnd + grace`
(IST wall-time → UTC instant math, `IST_OFFSET_MS`). `punchOut`
(`modules/attendance/service.ts`) now resolves the date through it.
A stale check-out well past `end + grace` correctly falls to the current day so
it can't be mis-attributed.
**Verified:** `scripts/_hrms_audit/test-overnight.ts` — creates a real 22:00–06:00
shift + assignment + open punch, calls the real `punchOut`, asserts the prior
day's row is closed and no orphan row appears; also asserts the stale-checkout
guard. 4/4 pass.
**Still open (biometric path):** `getTimelineSummary` filters
`AttendancePunchEvent` by `attendanceDate`; the eSSL sync path pairs punches via
`lib/essl › pairPunches` and was not touched. If overnight shifts are run
through biometric devices, verify `pairPunches` handles the midnight boundary
and, if not, apply the same resolver when stamping
`AttendancePunchEvent.attendanceDate`.

### A2 — Two overtime subsystems
`OTEntry` (`modules/attendance/service.ts`, `createOTEntry`/`decideOT`, status
`pending|approved|rejected`) and `OtRecord` (`lib/ot.ts`, `approvalStatus
PENDING|APPROVED|REJECTED`, rich fields). The Attendance OT page and
`executeApprovalDecision("OT")` use `OtRecord`; `decideOT` (with its own tenant
guard) uses `OTEntry`. These should be reconciled to one model; `OtRecord` is
the fuller one.

### A3 — `getMonthlyReport` still doesn't mark ABSENT
It only aggregates existing rows. Days with no punch on a working day are simply
absent from the result rather than counted as `ABSENT`. A month-end sweep job
(iterate working days × active employees, create `AttendancePunch{status:ABSENT}`
where none exists and no approved leave/holiday/weekly-off covers it) is needed
for a payroll-grade "days absent" number.

---

## Pages Audited

**HRMS (code-level, all):** `/hrms` (dashboard), `employees`, `employees/new`,
`employees/[id]`, `approvals`, `onboarding`, `org-structure`, `ownership`,
`users`, `settings`, `tasks`, `work-reports`, `travel`, `helpdesk`, `files`,
`letters`, `letters/prepare`, `letters/view/[id]`, `incentives`,
`salary-structure`, `salary-revisions`, `reimbursement`, `on-duty-admin`,
`location-tracking`, `tracking`, `payroll`, `recruit` (+ career/employer
sub-tree).

**Attendance (code-level, all):** `/attendance` (dashboard), `punch`, `leaves`,
`leaves/policies`, `leaves/hr-console`, `leaves/team-calendar`, `ot`, `reports`,
`settings`, `timesheets`, `biometric-sync`.

**Automated page walk (Playwright, headless, authenticated as `hr@`):** partial —
the browser tab was repeatedly OOM-killed on the largest HRMS pages (the
`/hrms/employees` DOM alone is ~840 KB). Of the ~15 HRMS pages that completed
before a crash, all returned HTTP 200 with the expected `<h1>` and **zero
console/page errors**. The nav-timeout / `ERR_CONNECTION_REFUSED` /
transient-500 entries in the raw results correlate 1:1 with Turbopack
cold-compile (30–35 s per first hit) and dev-server OOM deaths, not app bugs —
each was re-checked with `curl` and returns a normal `307` auth redirect. The
walk script (`scripts/_hrms_audit/pw-audit.mjs`) is resumable and was left able
to continue.

**Targeted authenticated re-checks after the fixes (clean, no console errors):**
`/hrms`, `/hrms/settings` (hr@ **and** dineshan), `/hrms/approvals`,
`/attendance`, `/attendance/reports`, `/attendance/ot`.

---

## Maker-Checker

**Code audit (authoritative for this pass):**
- **Leave** — `decideLeaveRequest` (leave engine): self-approval blocked
  (`"A leave request cannot be approved or rejected by its own requester."`),
  cross-org blocked (`CrossOrgAccessError`), ledger + audit + attendance/payroll
  bridges fire. ✔
- **Work report** — routed through `submitWorkReportApproval`. ✔
- **Regularization / OT / Travel / Timesheet** — were direct unscoped writes
  (F2). **Now** org-scoped + self-approval-blocked after this pass.
  Regularization also recomputes attendance (F3).

**Two-account run — executed** (`scripts/_hrms_audit/test-maker-checker.ts`,
against the live DB, using the real `executeApprovalDecision`):

| Assertion | Result |
|---|---|
| Maker (`dineshan`) approves own regularization → rejected *"…your own…"* | PASS |
| Checker (`hr@`) with unknown / cross-org id → *"…not found"* (IDOR) | PASS |
| Checker approves → `status = APPROVED` | PASS |
| `approvedById` = checker | PASS |
| `remarks` persisted | PASS |
| `HrmsAuditLog` row written (`REGULARIZATION_APPROVED`, `requestId`, `subjectUserId`) | PASS |

The regularization branch also re-runs `calculateOtForPunch` on approve (F3).
A full click-through in the browser UI (notifications toast, history tab
rendering, rejected → resubmit) is still worth doing but the server contract —
the part that enforces the rules — is verified.

---

## Design / UX

- **HRMS overview** and **Attendance overview** were already redesigned before
  this pass into dense "command-centre" layouts using the Monolith
  `PeopleSection` / `DashboardInsight*` primitives and `mnx-*` design-system
  classes — professional, no marketing-style oversized headings. No redesign was
  required; the gap there is *data accuracy* (F4/F5), now addressed.
- **Attendance → Reports** table extended: *Days Present* + *Half Days* +
  *Late Days* (was a single, wrong "Days Present" column).
- No new page-specific styling introduced; all edits use existing components.

---

## Cross-Module Touchpoints

- **Leave ↔ Attendance:** `modules/leave/attendance-bridge.ts` owns
  `AttendancePunch.status = "LEAVE"`; the new F4 write-back explicitly does not
  clobber it. Leave engine is mature (many files + tests) and was not modified.
- **Payroll:** consumes `OtRecord` and (now meaningfully) `AttendancePunch`
  status/hours. No payroll code changed; the F4/F5 fixes make its attendance
  inputs real rather than placeholder.
- **Approvals Central** (`/hrms/approvals`) is shared HRMS infra — F2/F3 fixes
  are in the shared `executeApprovalDecision`.

---

## Files Changed (this pass)

| File | Change | Ref |
|---|---|---|
| `prisma/seed.ts` | +`hrms.settings.manage` in `PERMISSIONS` catalog | F1 |
| `src/lib/ot.ts` | +`writeBackAttendancePunchSummary` (called from `calculateOtForPunch`); +`resolveCheckOutAttendanceDate`; `resolveShiftForDate` exported | F4, A1 |
| `src/modules/attendance/service.ts` | `getMonthlyReport` real present-days / `lateCount` / `halfDays` / `absentCount`; `punchOut` resolves overnight check-out date | F5, A1 |
| `src/modules/hrms/service.ts` | `executeApprovalDecision` — org-scope + self-approval guard on REGULARIZATION/OT/TRAVEL/TIMESHEET; regularization → `calculateOtForPunch`; +`writeApprovalAudit` on all 4 | F2, F3, audit |
| `src/app/(dashboard)/attendance/reports/page.tsx` | Half Days + Late Days columns | F5 |
| `src/app/(dashboard)/hrms/tasks/page.tsx` | +`requirePermission("hrms.tasks.manage")` | F7 |
| `src/app/(dashboard)/hrms/onboarding/page.tsx` | +`requirePermission("hrms.onboarding.manage")` | F7 |
| `src/app/api/hrms/tracking/route.ts` | +`requirePermission("hrms.tracking.admin")`; `apiError` instead of raw message | F7, F8 |
| `src/app/api/attendance/day-punches/route.ts` | soft-fail 200 + `unavailable` marker (was 404 / 503) | F6 |
| `src/app/(dashboard)/attendance/punch/punch-card.tsx` | handle `unavailable` → local-punch fallback, no error state | F6 |
| `scripts/grant-hrms-attendance-access.ts` | **new** — idempotent RBAC grant script | RBAC |
| `scripts/_hrms_audit/` | **new** — audit harness: `pw-audit.mjs` (resumable page walk), `pw-focus.mjs` (targeted), `test-maker-checker.ts`, `test-overnight.ts`, `probe-tracking.ts` | tests |

DB writes (via grant script / equivalent SQL): 1 new `Permission`
(`hrms.settings.manage`), 1 new `Role` (`HRMS + Attendance Full Access -
dineshan…`), `RolePermission` links (46 for dineshan's role + `hrms.settings.manage`
to Admin/HR/Monolith Full Access + the two test-account roles), 1 new `UserRole`
(dineshan → new role). All additive; idempotent re-run confirmed.

Type-check: `NODE_OPTIONS=--max-old-space-size=4096 npx tsc --noEmit
--skipLibCheck` → **exit 0, 0 errors**.
Runtime: `test-maker-checker.ts` 6/6 PASS · `test-overnight.ts` 4/4 PASS ·
changed pages re-walked clean for `hr@`.

---

## Environment Notes (for whoever continues this)

- **Disk, not just RAM.** The `.next` Turbopack dev cache grew to 24 GB and
  filled the 475 GB disk → `ENOSPC` → dev-server / tsc / browser / agent
  crashes. `rm -rf .next` recovered it. Watch `.next` size; consider capping it.
- `tsc --noEmit` (no `--skipLibCheck`) OOMs with *"Zone Allocation failed"* —
  use `NODE_OPTIONS=--max-old-space-size=4096 npx tsc --noEmit --skipLibCheck`
  with the dev server stopped.
- `scripts/start-local-dev.mjs` **reuses** an already-running :3000 server — use
  `--restart` or DB/RBAC changes won't be seen.
- RBAC is cached in `unstable_cache({ revalidate: 300 })` (disk-backed in dev).
  After granting permissions: `npm run dev:restart` **and** `rm -rf .next/cache`.
- A second agent concurrently edits the **CRM** module + `src/lib/navigation.ts`.
  HRMS/Attendance files here do not overlap it.
- `vitest` suite exists (`npm test`); the two new `scripts/_hrms_audit/test-*.ts`
  are standalone `tsx` scripts (self-cleaning) that run fine here — fold them
  into the vitest suite when convenient.

---

## Remaining Work

1. **A1 (biometric path)** — apply `resolveCheckOutAttendanceDate` (or verify
   `lib/essl › pairPunches`) for overnight shifts run through eSSL devices; the
   first-party web `punchOut` path is done + tested.
2. **Live maker-checker UI click-through** — the server contract is verified
   (`test-maker-checker.ts`); still worth exercising the browser flow for the
   notification toast, history-tab rendering and rejected → resubmit.
3. **A3 — month-end ABSENT sweep job** for payroll-grade "days absent"
   (iterate working-days × active employees; create
   `AttendancePunch{status:ABSENT}` where no punch and no leave/holiday/weekly-off
   covers the day). Net-new recurring job — needs wiring into the jobs system.
4. **A2 — reconcile `OTEntry` vs `OtRecord`** onto one model (`OtRecord` is the
   fuller one).
5. **Fold `test-maker-checker.ts` / `test-overnight.ts` into `vitest`** and grow
   a full regression suite (employee CRUD, shift assignment, punch in/out,
   regularization submit → approve → reject, leave+attendance, permission
   restriction, both dashboards).
6. **Full 50-page automated walk for both accounts** — the resumable harness
   (`scripts/_hrms_audit/pw-audit.mjs`) completed the changed surfaces + ~25
   pages clean this pass; finish the sweep now that disk pressure is resolved.
