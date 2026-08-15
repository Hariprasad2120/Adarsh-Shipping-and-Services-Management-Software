# Leave Management — Final Report

Built on **Monolith Engine** (Next.js 16 App Router, Prisma 7 / PostgreSQL, next-auth v5). All 13 phases of the build plan passed self-review (task file: `docs/leave-management/TASKFILE.md`).

---

## Research

Studied Zoho People's public Leave Service documentation (17 capability areas, 22 of 25 sources official `help.zoho.com`/`zoho.com`) as a functional benchmark — never copied UI, text, or branding. Cross-referenced against a full audit of Monolith's existing code to produce a 41-row gap analysis before any schema was touched.

Separately researched Indian statutory leave law (Maternity Benefit Act, Shops & Establishments Acts for Tamil Nadu/Maharashtra/Gujarat/Delhi, Factories Act §79) from `.gov.in`/India Code sources, since the org's `legalJurisdiction` is Tamil Nadu. Every finding is labeled solidly-verified or flagged-for-legal-review — nothing was guessed.

## Existing system audit

Found **two independent, non-reconciled leave surfaces** already live in Monolith, both reading/writing the same three tables (`LeaveType`, `LeaveBalance`, `LeaveRequest`):

- **Surface A** (`src/modules/attendance/service.ts`) — admin/approver oriented
- **Surface B** (`src/modules/hrms/service.ts`) — employee self-service, with a real permission gap (no `attendance.leave.request` check on submission)

Both worked, but the balance was a flat mutable float with no transaction history, duration math ignored holidays/weekends, and `LeaveType.accrualRule` was a dead field nothing ever read.

## Architecture

Decision (user-approved): **extend in place, consolidate onto one service layer** — no parallel schema, no rewrite. New module `src/modules/leave/` becomes the single source of truth; both legacy surfaces became thin compatibility wrappers so neither live frontend broke during the migration.

## Database

10 new tables, additive-only changes to `LeaveType`/`LeaveBalance`/`LeaveRequest`:

`LeavePolicyVersion` (versioned, immutable-once-published policy config) · `LeaveApplicabilityRule` · `EmployeeLeaveOverride` · `LeaveLedgerEntry` (append-only financial ledger) · `LeaveApprovalStep` · `CompOffCredit` · `LeaveGrant` · `LeaveRequestAttachment` · `LeaveSchedulerRun` · `LeaveComplianceTemplate`.

Migration generated via read-only diff against the live database (never `migrate dev`, which would have forced a full schema reset due to pre-existing, unrelated drift) — saved unapplied at `prisma/migrations/20260814090000_leave_management_ledger_policy_engine/`.

## Backend

**Ledger** (`ledger.ts`) — append-only, optimistic-locked, idempotency-key deduped. Reserve-at-submit → consume-or-release-at-decision → reversal-at-cancel.

**Policy** (`policy.ts`, `policy-config.schema.ts`) — Zod-validated structured config; publishing freezes a version, editing always creates a new one.

**Calculation** (`calculation.ts`) — the one authoritative duration/pay engine: holiday/weekend-aware, sandwich rule, four negative-balance modes, partial-pay slabs, half-day handling. Reuses the existing `working-hours.ts` calendar logic rather than reimplementing it.

**Request lifecycle** (`request.ts`, `approval.ts`, `restrictions.ts`) — explicit state machine, up to 10-step approval routing (6 approver types), clubbing/restriction validation against real existing requests, cancellation with reversal, extension.

**Comp-off & grants** (`compoff.ts`, `grants.ts`) — comp-off now consumable as real leave through the same ledger, not a disconnected float.

**Integration** (`attendance-bridge.ts`, `payroll-bridge.ts`, `accrual.ts`, `reset.ts`) — writes `AttendancePunch.status = "LEAVE"` on approval, converts LOP into `EmployeeLop` respecting payroll locks, monthly accrual, and a precomputed-per-employee reset scheduler (calendar/financial/anniversary/monthly cadences) — the design was explicitly delegated to the build's judgment mid-project and built for query efficiency at scale.

**Reports** (`reports.ts`) — 9 report functions: balance, ledger, requests, utilization, department summary, upcoming leave, LOP, expiring leave, approval turnaround.

**Compliance** (`compliance.ts`) — flags policy configurations below a statutory minimum; every result carries the "HR/legal review recommended" disclaimer, never claims compliance outright.

## Frontend

Extended the real, already-live `attendance/leaves` page rather than building a parallel UI: added server-side calculation preview, toast feedback, and cancellation. Added new pages — **Leave Types & Policies** (create/publish with applicability and restriction inputs), **HR Operations Console** (balance adjustment, grants, comp-off approval — three tabs, all ledger-audited), and **Team Leave Calendar** (manager view with automatic overlap detection, privacy-safe — shows dates and type, never the reason).

## Testing

51 tests across 8 files. Notably: a mocked-`$transaction` test that provably shows a duplicate idempotency key does *not* double-credit, and that a simulated concurrent version conflict correctly triggers a retry landing on the right final balance. Writing the authorization test suite **found and fixed a real, previously-unguarded security gap** — `decideLeaveRequest` had no check preventing a requester from approving their own leave.

## Security

Every state-changing function writes to `HrmsAuditLog`. Self-approval is blocked at the domain layer (not just via RBAC). LOP writes respect payroll locks rather than silently corrupting closed periods. Attachments reuse the existing Google-Drive-backed storage with owner-only access.

## Final QA

Lint (3 real issues found and fixed), full-repo typecheck, production build ("Compiled successfully"), and design-system coverage check all pass clean. One pre-existing, unrelated `architecture:check` failure was investigated and confirmed via `git status` to predate this session — not a leave management defect.

## Remaining limitations (genuine, not unfinished core work)

- **Live database is write-denied** at the Postgres role level for the configured credential — confirmed by a direct failed write attempt, not assumed. The generated migration is correct and additive but unapplied; someone with DB admin access needs to reconcile pre-existing migration-history drift before any `prisma migrate deploy` (for any module) can be trusted again.
- **Full 9-step policy wizard UI** (visual entitlement-tier editor, visual approval-routing builder) is not built — the API and Zod schema fully support it; the current form covers the common cases with sensible defaults.
- **Compliance templates require legal counsel sign-off** before any `LeaveComplianceTemplate` row is promoted from `DRAFT` — this is not a gap, it's how the feature is designed to work.
- **Carry-forward/reset math is unit-tested for its scheduling** (`nextResetDate` computation) but not yet exercised end-to-end against a live database.

## Verification steps

1. `npx prisma validate` — confirms schema is valid.
2. `npx tsc --noEmit` — confirms whole repo typechecks.
3. `npm run build` — confirms production build succeeds.
4. `npx vitest run --config <ad-hoc config including src/modules/leave/__tests__>` — 51 tests, all leave-module logic.
5. Once a writable database is available: apply `prisma/migrations/20260814090000_leave_management_ledger_policy_engine/migration.sql` manually after a backup, then run `npx tsx scripts/seed-leave-compliance-templates.ts`.
6. Visit `/attendance/settings` → Leave workflow / Leave types & policies / HR leave operations / Team leave calendar to exercise the UI end to end.
