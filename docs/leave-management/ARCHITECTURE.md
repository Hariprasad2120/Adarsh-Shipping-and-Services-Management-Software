# Leave Management — Architecture (Phase 4)

Decision locked (user-approved): **extend in place, consolidate onto one service layer**.
No parallel schema. No new tenant model. No new scheduler mechanism.

---

## 1. Consolidation plan — Surface A vs Surface B

Current state: `src/modules/attendance/service.ts` (admin/approver) and
`src/modules/hrms/service.ts` (employee self-service) both read/write
`LeaveType`/`LeaveBalance`/`LeaveRequest` directly, with divergent permission
checks and notification `kind` strings.

**Target state**: one module owns all leave domain logic.

- New module: `src/modules/leave/` — becomes the single source of truth.
  - `src/modules/leave/policy.ts` — policy CRUD, versioning, applicability
  - `src/modules/leave/ledger.ts` — ledger writes, balance materialization
  - `src/modules/leave/calculation.ts` — the one calculation service (§38 of spec)
  - `src/modules/leave/eligibility.ts` — applicability engine
  - `src/modules/leave/request.ts` — request lifecycle state machine
  - `src/modules/leave/approval.ts` — approval routing engine
  - `src/modules/leave/compoff.ts` — comp-off
  - `src/modules/leave/accrual.ts` — accrual/reset/carry-forward/expiry (invoked by cron)
  - `src/modules/leave/audit.ts` — thin wrapper writing `HrmsAuditLog`
- `src/modules/attendance/service.ts` — leave-related exports (`getLeaveTypes`,
  `createLeaveType`, `getLeaveBalances`, `getLeaveRequests`, `createLeaveRequest`,
  `decideLeaveRequest`, `initLeaveBalancesForUser`) become **thin re-exports**
  from `src/modules/leave/*` for backward compatibility with existing call
  sites, then are migrated off and deleted once all callers point at
  `src/modules/leave/*` directly. Non-leave exports (`punchIn`, OT, holidays,
  monthly report) stay untouched.
- `src/modules/hrms/service.ts` — `applyLeave`/`getLeaveTrackerSummary` become
  thin re-exports of `src/modules/leave/request.ts` equivalents, same
  migrate-then-delete plan.
- API routes: `/api/attendance/leaves*` and `/api/hrms/leave/*` both keep
  working (both are already-shipped, real consumers) but internally call the
  same `src/modules/leave/*` functions. New unified permission checks are
  added to Surface B's POST route (`attendance.leave.request`) closing the
  gap flagged in audit §3.2.
- Notification `kind` strings unified to the Surface A vocabulary
  (`LEAVE_REQUEST_SUBMITTED`, `LEAVE_DECISION`) plus new kinds added for
  cancellation/extension/comp-off/accrual/expiry-warning. Surface B's
  `LEAVE_SUBMITTED` kind is retired.
- A new unified endpoint set is added under `/api/leave/*` (matching the new
  module name) for anything genuinely new (calculation preview, cancellation,
  extension, comp-off, grants, ledger inspection) rather than overloading the
  two legacy route trees further. Existing `/api/attendance/leaves*` and
  `/api/hrms/leave/*` remain as compatibility routes calling into
  `src/modules/leave/*`.

This avoids a big-bang rewrite: both live frontends keep working throughout,
each function is migrated one at a time, tested, then the old file's export
becomes a re-export, verified with `grep` for remaining direct callers before
deletion.

---

## 2. Ledger design

Core principle (spec §4): balance is a financial ledger, not a mutable counter.

```prisma
model LeaveLedgerEntry {
  id             String   @id @default(cuid())
  orgId          String
  userId         String
  leaveTypeId    String
  policyVersionId String?
  type           String   // OPENING_BALANCE | ACCRUAL | MANUAL_CREDIT | MANUAL_DEBIT |
                           // LEAVE_RESERVED | LEAVE_CONSUMED | LEAVE_RELEASED |
                           // CARRY_FORWARD | CARRY_FORWARD_EXPIRY | ENCASHMENT | RESET |
                           // COMP_OFF_CREDIT | COMP_OFF_EXPIRY | ADJUSTMENT |
                           // CANCELLATION_REVERSAL | POLICY_MIGRATION | IMPORT | LOP_CONVERSION
  quantity       Float    // signed: positive = credit, negative = debit
  unit           String   // DAY | HOUR
  effectiveDate  DateTime @db.Date
  balanceBefore  Float
  balanceAfter   Float
  requestId      String?  // LeaveRequest.id when applicable
  source         String   // SYSTEM | SCHEDULER | ADMIN | EMPLOYEE | IMPORT
  actorId        String?  // User.id who caused this entry (null for scheduler)
  reason         String?
  metadata       Json?
  idempotencyKey String   @unique  // e.g. "accrual:{userId}:{leaveTypeId}:{period}"
  createdAt      DateTime @default(now())

  org           Organisation      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  user          User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  leaveType     LeaveType         @relation(fields: [leaveTypeId], references: [id])
  request       LeaveRequest?     @relation(fields: [requestId], references: [id])

  @@index([orgId, userId, leaveTypeId])
  @@index([userId, leaveTypeId, effectiveDate])
}
```

`LeaveBalance` is **kept** (existing FK target for `User`/`LeaveType`, existing
callers) but reinterpreted as a **materialized snapshot** derived from the
ledger, plus a `version: Int @default(0)` column added for optimistic
locking:

```prisma
model LeaveBalance {
  id          String @id @default(cuid())
  userId      String
  leaveTypeId String
  year        Int
  balance     Float          // materialized = sum of ledger entries for this user/type/year
  version     Int    @default(0)   // NEW — optimistic lock
  updatedAt   DateTime @updatedAt  // NEW
  ...
}
```

**Concurrency protection**: every balance mutation is wrapped in a single
Prisma `$transaction`: read `LeaveBalance` + `version`, compute new balance,
`updateMany({ where: { id, version }, data: { balance, version: { increment: 1 } } })`
— if `count === 0`, the transaction retries (version conflict = concurrent
write). Ledger row insert and balance update happen in the same DB
transaction. `idempotencyKey` unique constraint prevents duplicate scheduler
runs and duplicate approval callbacks from double-writing (catch the unique
violation, treat as already-applied, return existing entry).

Reserved-vs-consumed: `LEAVE_RESERVED` is written at submission time (soft
hold, prevents two concurrent requests both thinking they have the balance);
converts to `LEAVE_CONSUMED` on approval or `LEAVE_RELEASED` on
rejection/cancellation. This directly fixes the audit's flagged race
(`updateMany({ decrement })` with no lock).

---

## 3. Policy versioning

```prisma
model LeavePolicyVersion {
  id                String    @id @default(cuid())
  leaveTypeId       String
  version           Int
  status            String    // DRAFT | PUBLISHED | ARCHIVED
  classification    String    // PAID | UNPAID | ON_DUTY | RESTRICTED_HOLIDAY | PARTIALLY_PAID
  entitlementModel  String    // FIXED | EXPERIENCE_BASED | GRANT_BASED | ATTENDANCE_BASED
  unit              String    // DAY | HOUR
  roundingMode      String    @default("NONE") // NONE | NEAREST | UP | DOWN
  roundingIncrement Float?    // e.g. 0.5, 0.25
  effectiveFrom     DateTime  @db.Date
  effectiveUntil    DateTime? @db.Date
  configuration     Json      // entitlement tiers, accrual cadence, reset/carry-forward/
                               // encashment rules, restriction rules, sandwich config,
                               // clubbing rules, approval routing — structured sub-shapes
                               // documented in DATA_MODEL.md, not freeform like the old
                               // accrualRule field
  publishedAt       DateTime?
  publishedById     String?
  createdAt         DateTime  @default(now())

  leaveType LeaveType @relation(fields: [leaveTypeId], references: [id], onDelete: Cascade)
  applicabilityRules LeaveApplicabilityRule[]

  @@unique([leaveTypeId, version])
  @@index([leaveTypeId, status])
}
```

Modeled after `AccountingApprovalPolicy`'s versioned-JSON-configuration shape
(per audit §11 recommendation) but scoped to Leave. `configuration` is
structured JSON with a Zod schema validating it on write (not raw freeform) —
sub-shapes for entitlement tiers, accrual, reset/carry-forward/encashment,
restrictions, sandwich/clubbing, and approval routing are each their own Zod
object, documented field-by-field in `DATA_MODEL.md`. This satisfies spec
§37's "avoid storing unstructured JSON for everything" while keeping schema
migrations manageable (one JSON column vs. 15 new tables) — a pragmatic
middle ground given the codebase's existing pattern of Json config columns
(`WorkingCalendar.breaks`, `Shift.breakRules`, `OtSettings.compOffSlabs`) all
follow this precedent.

A published version's `configuration` is immutable — editing creates a new
`DRAFT` version. `LeaveRequest` and `LeaveLedgerEntry` both carry
`policyVersionId` so historical interpretation never shifts retroactively
(spec §8).

`LeaveType` itself stays as the stable identity (name, code, org) with a
`activeVersionId` pointer added.

---

## 4. Applicability engine

```prisma
model LeaveApplicabilityRule {
  id               String   @id @default(cuid())
  policyVersionId  String
  mode             String   // INCLUDE | EXCLUDE
  dimension        String   // BRANCH | DEPARTMENT | DIVISION | DESIGNATION | EMPLOYMENT_TYPE | EMPLOYEE
  value            String   // id or literal match value
  createdAt        DateTime @default(now())

  policyVersion LeavePolicyVersion @relation(fields: [policyVersionId], references: [id], onDelete: Cascade)

  @@index([policyVersionId])
}
```

Flat include/exclude rows (AND across dimensions, OR within a dimension's
multiple rows) rather than a nested condition-tree — matches this codebase's
general preference for simple relational rows over generic rule-engine
abstractions (no such engine exists elsewhere in the repo). `previewApplicability(policyVersionId)`
in `eligibility.ts` runs the rule set against `db.user.findMany` and returns
matching employees — this is the "Preview Applicability" action from spec §12.
Explicit per-employee override (§13) is a separate table:

```prisma
model EmployeeLeaveOverride {
  id              String    @id @default(cuid())
  userId          String
  leaveTypeId     String
  field           String    // MAX_BALANCE | EXTRA_ENTITLEMENT | RESTRICTION_EXEMPT | OPENING_BALANCE_CORRECTION
  value           Json
  reason          String
  effectiveFrom   DateTime  @db.Date
  effectiveUntil  DateTime?
  actorId         String
  createdAt       DateTime  @default(now())

  @@index([userId, leaveTypeId])
}
```

---

## 5. Request lifecycle & approval routing

`LeaveRequest.status` becomes a constrained value set (kept as `String` —
matches existing repo convention of string-status over Prisma enums seen
throughout, e.g. `PayrollBatch.status`, `AttendancePunch.status` — enforced by
a state-machine function in `request.ts`, not a DB enum, avoiding an enum
migration on a table with existing string data):

`DRAFT → SUBMITTED → PENDING_APPROVAL → APPROVED | REJECTED`, plus
`CANCEL_PENDING → CANCELLED`, `EXTENSION_PENDING`, `WITHDRAWN`, `EXPIRED`.
Transition table lives in `request.ts` as an explicit adjacency map; any
transition not in the map throws.

New fields added to `LeaveRequest` (additive migration): `policyVersionId`,
`computedDurationUnits: Float`, `paidUnits: Float`, `lopUnits: Float`,
`currentApprovalStepId String?`, `cancelledAt`, `cancelReason`,
`extendedFromRequestId String?` (self-relation for extension history).

Approval routing (spec §20, up to 10 sequential levels):

```prisma
model LeaveApprovalStep {
  id              String   @id @default(cuid())
  requestId       String
  sequence        Int
  approverType    String   // MANAGER | MANAGERS_MANAGER | DEPARTMENT_HEAD | ROLE | NAMED_USER | HR
  approverUserId  String?
  status          String   // PENDING | APPROVED | REJECTED | SKIPPED | DELEGATED
  decidedById     String?
  decidedAt       DateTime?
  comment         String?
  slaDueAt        DateTime?

  request LeaveRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  @@index([requestId, sequence])
}
```

Steps are materialized at submission time from the policy version's
`configuration.approvalRouting` rule set (criteria: duration thresholds,
LOP-involvement, department) — evaluated once, snapshotted as concrete steps,
so a later policy edit never changes an in-flight request's routing. This is
new work; no existing generic approval framework was found to reuse (audit
§11 — `AccountingCapabilityPolicy` is Accounting-specific and not
generalized).

---

## 6. Comp-off

```prisma
model CompOffCredit {
  id              String    @id @default(cuid())
  orgId           String
  userId          String
  earnedDate      DateTime  @db.Date   // date the extra work happened
  sourceType      String    // WEEKEND_WORK | HOLIDAY_WORK | OVERTIME | MANUAL_GRANT
  sourceOtRecordId String?             // links to existing OtRecord where applicable
  units           Float
  unit            String    // DAY | HOUR
  status          String    // PENDING_APPROVAL | APPROVED | REJECTED | CONSUMED | EXPIRED
  expiresAt       DateTime?
  approvedById    String?
  createdAt       DateTime  @default(now())

  @@index([orgId, userId, status])
}
```

Approved `CompOffCredit` rows generate a `COMP_OFF_CREDIT` ledger entry
against a dedicated `LeaveType` (e.g. org's "Compensatory Off" type) so
consumption flows through the same request/ledger machinery as any other
leave type — satisfies spec §23's requirement that comp-off be consumable as
leave, not a disconnected float (fixes audit gap #7). `sourceOtRecordId`
preserves the attendance record that generated the entitlement, per spec.

---

## 7. Attachments

```prisma
model LeaveRequestAttachment {
  id            String   @id @default(cuid())
  requestId     String
  driveFileId   String   // reuses src/modules/hrms/document-drive.ts uploadFile()
  fileName      String
  uploadedById  String
  createdAt     DateTime @default(now())

  request LeaveRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
}
```

Closes audit gap #9 — reuses the existing Google-Drive-backed
`document-drive.ts` uploader rather than a new storage layer.

---

## 8. Integration points

- **Attendance**: on `APPROVED`, write `AttendancePunch.status = "LEAVE"` (or
  `"HALF_DAY"`) for each covered date via a new `applyLeaveToAttendance()` in
  `leave/attendance-bridge.ts` — the existing status vocabulary already
  supports this (audit §2.3), just never wired.
- **Payroll**: LOP units computed in `calculation.ts` create/update
  `EmployeeLop` rows keyed by `payrollMonth` (existing model, currently manual
  entry only) instead of a new payroll table — closes audit gap #8 without
  touching `PayrollBatch`/Accounting internals. Respect existing payroll-lock
  semantics: if a `PayrollBatch` for the affected month is `FINALIZED`/`PAID`,
  block LOP auto-write and flag for manual correction (matches spec §31).
- **Holidays/WorkingCalendar/Shift**: `calculation.ts` is the one place that
  reads `Holiday` + `WorkingCalendar`/`ShiftAssignment` to determine
  working-day-ness per date, per spec §24's precedence order (shift →
  exceptional day → holiday → weekly off → leave → policy rules).
- **Notifications/Audit**: every state-changing function in
  `src/modules/leave/*` calls `notify()`/`notifyMany()` (existing pipe) and
  `writeLeaveAudit()` (new thin wrapper around `HrmsAuditLog`, closes audit
  gap #11).
- **Scheduler**: `src/app/api/cron/leave-accrual/route.ts` (new, follows
  existing `requireCronSecret()` pattern) invoked daily; internally
  idempotent per policy's accrual cadence via `idempotencyKey`. Separate
  `src/app/api/cron/leave-expiry/route.ts` for carry-forward
  expiry/reset-at-year-boundary processing.

---

## 9. What is explicitly deferred (not blocking Phase 5 start)

- Compliance packs (Phase 10) — schema for `LeaveComplianceTemplate` designed
  but not populated until Phase 2/3 research lands.
- Calendar (Google/O365) push integration — abstraction point only
  (`availabilityStatus` field on policy), no provider wired, per spec §34
  ("do not tightly couple").
- Multi-calendar-per-branch (`WorkingCalendar` is still singleton-per-org) —
  flagged as a known limitation, not required by spec's Definition of Done.

---

## 10. Migration safety

All schema changes are additive (`prisma migrate dev` with new
tables/columns, no drops, no renames of `LeaveType`/`LeaveBalance`/
`LeaveRequest`'s existing columns). `LeaveRequest.status` values already in
production data (`pending`/`approved`/`rejected`) remain valid under the new
state machine (mapped 1:1 to `PENDING_APPROVAL`/`APPROVED`/`REJECTED` — the
state machine accepts both casings during a transition window, then a
backfill script normalizes existing rows). `LeaveBalance` gets a backfill
migration writing one `OPENING_BALANCE` ledger entry per existing row so
history isn't silently lost when the ledger goes live.
