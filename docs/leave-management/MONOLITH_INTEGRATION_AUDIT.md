# Monolith Integration Audit — Leave Management (Phase 1)

Audit date: 2026-08-14
Scope: `e:/New folder/Adarsh-Shipping-and-Services-Management-Software` ("Monolith Engine")
Purpose: Ground-truth inventory of everything Leave/HR/Attendance-adjacent that already
exists in the codebase, plus the reusable platform patterns (RBAC, notifications, audit
logging, settings UI, multi-tenancy) a new Leave Management module must plug into. This
document is descriptive only — no implementation decisions are made here.

---

## 1. Stack Summary

- **Framework**: Next.js `16.2.6`, App Router (`src/app`), route groups `(dashboard)` for
  authenticated pages and `api/` for route handlers. Both Turbopack and Webpack dev modes
  are wired via `scripts/start-local-dev.mjs`.
- **ORM / DB**: Prisma `^7.8.0` (new `prisma-client` generator, output to
  `src/generated/prisma`), PostgreSQL via `@prisma/adapter-pg` + a hand-instrumented `pg`
  `Pool` (see `src/lib/db.ts`). No Prisma middleware/extension for row-level tenant
  scoping — every model just carries an `orgId` column and callers filter by it manually.
- **Auth**: `next-auth@5.0.0-beta.31` (`src/lib/auth.ts`) with `Credentials` (bcrypt
  password hash) and `Google` OAuth providers. Session carries `user.id`, `user.orgId`.
  `src/lib/auth-actions.ts` holds server actions for login/session mutation.
- **Testing**: Vitest `^4.1.6` — `npm test` runs `vitest run` (via
  `scripts/run-with-staging-env.ts` to point at a staging DB), plus a separate
  `vitest.ui.config.ts` for UI-focused specs (`npm run test:ui`). Module-local tests live
  under `src/modules/<module>/__tests__/*.test.ts` (see
  `src/modules/hrms/__tests__/*` for the convention).
- **Styling / design system**: Tailwind CSS v4, plus a large first-party design-system
  layer enforced by custom scripts (`scripts/verify-design-system-coverage.mjs`,
  `scripts/verify-catalogue-style-boundary.mjs`, `scripts/verify-code-organization.mjs`)
  run via `npm run design-system:verify` / `npm run architecture:check`. Radix UI
  primitives (`@radix-ui/react-dropdown-menu`, `@radix-ui/react-icons`), `lucide-react`
  and `@carbon/icons-react` for icons, `framer-motion`/`gsap` for animation,
  `react-hook-form` + `@hookform/resolvers` + `zod` for forms.
- **Background jobs / scheduler**: No queue product (no BullMQ/Agenda/node-cron running
  in-process). Scheduled work is modeled as **Vercel Cron-triggered API routes** under
  `src/app/api/cron/*` (e.g. `email-flush`, `crm-reminders`, `appraisal-trigger`,
  `todo-reminders`, `tracking-alerts`, `cha-filing-query-reminders`,
  `google-chat-retry`, `justdial-import`). Each route is protected by
  `requireCronSecret(req)` from `src/lib/security.ts`. No leave-specific cron route
  exists today (no accrual-runner, no carry-forward job).
- **File storage**: Google Drive-backed, via `src/lib/google-drive-client.ts` and
  `uploadFile()` consumed by `src/modules/hrms/document-drive.ts` (used for HR document
  attachments). No S3/Blob/local-disk storage layer found.
- **Notification system**: First-party `Notification`/`NotificationActivity` Prisma
  models + `src/modules/notifications/service.ts` (`notify`, `notifyMany`,
  `createNotification`, `getUsersWithPermission`), re-exported through the thin
  `src/lib/notify.ts` facade. In-app only by default; optional email piggybacks on the
  same call via `email: true`.
- **Email system**: Provider-agnostic `sendEmail()` in `src/lib/email.ts`, defaulting to
  Resend (`EMAIL_PROVIDER=resend`, needs `RESEND_API_KEY`) with an SMTP fallback path.
  Outbound mail is also queued through an `EmailQueue` Prisma model and flushed by the
  `api/cron/email-flush` route calling `flushEmailQueue()`.

---

## 2. Existing Leave/HR/Attendance Data Model

All models below are read directly from `prisma/schema.prisma` (10,323 lines total).

### 2.1 Leave-specific models

```prisma
// prisma/schema.prisma:833
model LeaveType {
  id             String  @id @default(cuid())
  orgId          String
  name           String
  paid           Boolean @default(true)
  defaultBalance Float   @default(0)
  accrualRule    Json?   // { frequency: "monthly", amount: 1.5, ... } — freeform, unused by any code path today

  org      Organisation   @relation(fields: [orgId], references: [id], onDelete: Cascade)
  balances LeaveBalance[]
  requests LeaveRequest[]

  @@unique([orgId, name])
  @@index([orgId])
}

// prisma/schema.prisma:849
model LeaveBalance {
  id          String @id @default(cuid())
  userId      String
  leaveTypeId String
  year        Int
  balance     Float

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  leaveType LeaveType @relation(fields: [leaveTypeId], references: [id], onDelete: Cascade)

  @@unique([userId, leaveTypeId, year])
  @@index([userId])
}

// prisma/schema.prisma:863
model LeaveRequest {
  id          String   @id @default(cuid())
  userId      String
  leaveTypeId String
  fromDate    DateTime @db.Date
  toDate      DateTime @db.Date
  halfDay     Boolean  @default(false)
  status      String   @default("pending") // pending | approved | rejected | cancelled
  approverId  String?
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user      User      @relation("LeaveRequester", fields: [userId], references: [id], onDelete: Cascade)
  approver  User?     @relation("LeaveApprover", fields: [approverId], references: [id])
  leaveType LeaveType @relation(fields: [leaveTypeId], references: [id])

  @@index([userId])
  @@index([approverId])
}
```

Observations:
- `LeaveBalance` is a **flat yearly counter** (`balance: Float`), not a ledger. No
  transaction rows recording accrual/deduction/expiry events — every decrement is a
  destructive `updateMany({ data: { balance: { decrement } } })` (see §3.1). No audit
  trail of balance changes beyond the generic `HrmsAuditLog`.
  `LeaveType.accrualRule` (Json) is declared but **no code reads or writes it** —
  it is a dead/unimplemented field.
- `LeaveRequest.status` is a raw `String`, not an enum, with `"cancelled"` listed in the
  comment but never set by any service function found.
- No half-day *session* (AM/PM) granularity — only a single `halfDay: Boolean` flag,
  and separately `fromHalf`/`toHalf` booleans exist only in the Zod validator
  (`src/modules/hrms/validators.ts`) and are collapsed into that one boolean before
  reaching the DB (`halfDay: data.fromHalf || data.toHalf`), so first/last-day half-day
  distinctions are lost at persistence time.
- No `LeaveRequest` day-count/computed-duration column — duration is recomputed ad hoc
  wherever needed (see `decideLeaveRequest`, §3.1).
- No comp-off, sandwich-rule, LOP-linkage, or attachment/document relation on
  `LeaveRequest` itself (attachments are referenced only in the Zod schema as
  `attachmentIds: z.array(z.string()).optional()` but never persisted anywhere).
- No approval-chain/multi-level-approver model for leave — a single `approverId` column.

### 2.2 Holiday / Calendar / Shift / OT models

```prisma
// prisma/schema.prisma:884
model Holiday {
  id          String   @id @default(cuid())
  orgId       String
  branchId    String?
  date        DateTime @db.Date
  name        String
  holidayType String   @default("COMPANY") // COMPANY | NATIONAL | RESTRICTED | WEEKEND

  org    Organisation @relation(fields: [orgId], references: [id], onDelete: Cascade)
  branch Branch?      @relation(fields: [branchId], references: [id])

  @@index([orgId, date])
}

// prisma/schema.prisma:1195
model WorkingCalendar {
  id                    String @id @default("global")
  orgId                 String @unique
  workStart             String @default("09:00")
  workEnd               String @default("18:00")
  timezone              String @default("Asia/Kolkata")
  graceMinutes          Int    @default(15)
  graceBeforeStartMins  Int    @default(0)
  graceAfterEndMins     Int    @default(15)
  defaultWorkingMinutes Int    @default(480)
  minOvertimeMinutes    Int    @default(0)
  workingDays           String @default("1,2,3,4,5,6") // Monday to Saturday
  breaks                Json?

  org Organisation @relation(fields: [orgId], references: [id], onDelete: Cascade)
}

// prisma/schema.prisma:1212
model OtSettings {
  id            String @id @default("global")
  orgId         String @unique
  standardHours Float  @default(8.0)
  otRate        Float  @default(1.5)
  graceMinutes  Int    @default(15)
  compOffSlabs  Json?  // comp-off rules/slabs — declared, not consumed by any leave code path

  org Organisation @relation(fields: [orgId], references: [id], onDelete: Cascade)
}

// prisma/schema.prisma:2425
model Shift {
  id                     String   @id @default(cuid())
  orgId                  String
  name                   String
  startTime              String
  endTime                String
  expectedWorkingMinutes Int      @default(480)
  graceBeforeStartMins   Int      @default(0)
  graceAfterEndMins      Int      @default(15)
  minOvertimeMinutes     Int      @default(0)
  workingDays            String   @default("1,2,3,4,5")
  breakRules             Json?
  isActive               Boolean  @default(true)
  isDefault              Boolean  @default(false)
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  org         Organisation      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  assignments ShiftAssignment[]
  otRecords   OtRecord[]

  @@unique([orgId, name])
  @@index([orgId, isActive])
}

// prisma/schema.prisma:2450
model ShiftAssignment {
  id        String    @id @default(cuid())
  userId    String
  shiftId   String
  startDate DateTime  @db.Date
  endDate   DateTime? @db.Date
  ...
  @@index([userId, startDate, endDate])
}
```

Both `WorkingCalendar` and `OtSettings` are **singleton-per-org rows** (`id String @id
@default("global")`, `orgId String @unique`), not versionable policy configs — there is
exactly one calendar and one OT policy per org, no branch/department overrides, no
effective-dated history. `OtSettings.compOffSlabs` (Json) is declared but not consumed
by any leave/comp-off code path found in `src/modules` or `src/app`.

### 2.3 Attendance / punch models

```prisma
// prisma/schema.prisma:791
model AttendancePunch {
  id     String    @id @default(cuid())
  userId String
  date   DateTime  @db.Date
  inAt   DateTime?
  outAt  DateTime?
  source String    @default("web") // web | biometric | manual
  status              String? // PRESENT | HALF_DAY | ABSENT | HOLIDAY | LEAVE | WEEKLY_OFF
  lateMinutes         Int     @default(0)
  earlyLeavingMinutes Int     @default(0)
  workingHours        Float?
  biometricSynced     Boolean @default(false)
  @@unique([userId, date])
}

// prisma/schema.prisma:811
model AttendancePunchEvent {
  id             String   @id @default(cuid())
  orgId          String
  userId         String
  attendanceDate DateTime @db.Date
  punchedAt      DateTime
  source         String   @default("web") // web | biometric | mobile | import | manual
  eventType      String   @default("PUNCH") // CHECK_IN | CHECK_OUT | BREAK_OUT | BREAK_IN | PUNCH | CORRECTION
  status         String?  // VALID | DUPLICATE | IGNORED | NEEDS_REVIEW
  deviceId       String?
  notes          String?
  metadata       Json?
  ...
}
```

`AttendancePunch.status` already has a `"LEAVE"` enum value in its comment, i.e. the
attendance day-status roll-up is the natural integration point for "this day is covered
by an approved leave," but no code currently writes `"LEAVE"` into that column from the
leave approval flow (`decideLeaveRequest` only touches `LeaveBalance`, it never touches
`AttendancePunch`).

Other adjacent models found: `OtRecord` (2450+, daily OT/attendance computation with
`compOffDays: Float` field — comp-off is tracked as a raw float count here, disconnected
from `LeaveType`/`LeaveBalance`), `AttendanceRegularization` (punch-correction requests,
own PENDING/APPROVED/REJECTED workflow), `EmployeeLop` (loss-of-pay days per payroll
month, manually entered), `AttendanceBreak`, `AttendancePermissionRequest` (short-leave/
permission-slip requests, separate from `LeaveRequest`), `AttendanceSession` (mobile
GPS/face-auth session tracking), `ShiftAssignment`.

### 2.4 Audit / HR-adjacent

```prisma
// prisma/schema.prisma:2931
model HrmsAuditLog {
  id        String   @id @default(cuid())
  orgId     String
  userId    String
  action    String  // e.g. PUNCH_IN, LEAVE_APPROVED, TICKET_RESOLVED
  details   Json?
  createdAt DateTime @default(now())
  user      User     @relation("HrmsAuditLogs", fields: [userId], references: [id], onDelete: Cascade)
}
```

The doc-comment explicitly names `LEAVE_APPROVED` as an example action, but grepping the
codebase shows **no call site actually writes `HrmsAuditLog` rows from the leave flow**
today (`decideLeaveRequest` / `applyLeave` do not call it). The table exists and is
schema-ready but is not wired into leave.

---

## 3. Existing Leave-Related APIs / Pages

There are **two independent, non-integrated leave surfaces** sharing the same three
tables (`LeaveType`, `LeaveBalance`, `LeaveRequest`). This is the most important finding
of this audit — see §12.

### 3.1 Surface A — `src/modules/attendance/service.ts` (org-admin oriented)

File: `src/modules/attendance/service.ts` (275 lines). Key exports:
- `getLeaveTypes(orgId)` → cached read via `getCachedLeaveTypes` (`src/lib/cache.ts`)
- `createLeaveType(orgId, { name, paid, defaultBalance })`
- `getLeaveBalances(userId, year)`
- `initLeaveBalancesForUser(userId, orgId, year)` — batch `createMany` with
  `skipDuplicates: true`, seeds one `LeaveBalance` row per `LeaveType.defaultBalance`
- `getLeaveRequests(orgId, { userId?, status?, approverId? })` — scopes via
  `where.user = { orgId }`
- `createLeaveRequest(userId, { leaveTypeId, fromDate, toDate, halfDay, notes })` — on
  create, resolves approvers via
  `getUsersWithPermission(orgId, "attendance.leave.approve")` and calls `notifyMany`
  with `kind: "LEAVE_REQUEST_SUBMITTED"`
- `decideLeaveRequest(requestId, approverId, decision)` — the only place balance is
  mutated: computes `days = ceil((toDate - fromDate) / 86400000) + 1`, `deduct = halfDay
  ? 0.5 : days`, then `db.leaveBalance.updateMany({ where: { userId, leaveTypeId, year:
  fromDate.getFullYear() }, data: { balance: { decrement: deduct } } })`. Then calls
  `notify()` with `kind: "LEAVE_DECISION"` and `email: true`.

Consuming routes:
- `src/app/api/attendance/leave-types/route.ts` — `GET` (any authenticated user in org),
  `POST` gated by `requirePermission(userId, "attendance.leave.manage")`
- `src/app/api/attendance/leaves/route.ts` — `GET` supports `?mine=true` /
  `?userId=`/`?status=`/`?approverId=`; `POST` gated by
  `requirePermission(userId, "attendance.leave.request")`, body validated with a local
  zod schema (`leaveTypeId, fromDate, toDate, halfDay, notes`)
- `src/app/api/attendance/leaves/[id]/route.ts` — `POST` decision endpoint, gated by
  `requirePermission(userId, "attendance.leave.approve")`, body `{ decision: "approved"
  | "rejected" }`
- `src/app/api/attendance/holidays/route.ts` — holiday CRUD, backed by
  `getHolidays`/`createHoliday` in the same service file

Frontend:
- `src/app/(dashboard)/attendance/leaves/page.tsx` + `leaves-client.tsx` — admin/
  approver-facing leave workspace (request list, approve/reject actions)
- `src/app/(dashboard)/attendance/settings/page.tsx` — links out to `/attendance/leaves`
  as "Leave workflow" under a `PeopleSection`/`PeopleLinkGrid` composition (see §9)
- `src/app/(dashboard)/attendance/punch/punch-card.tsx` — employee daily punch UI, not
  leave-specific but shares the `AttendancePunch` status vocabulary that includes
  `"LEAVE"`

### 3.2 Surface B — `src/modules/hrms/service.ts` (employee self-service / "PeoplePlus HRMS")

File: `src/modules/hrms/service.ts`. Key exports (leave section, ~line 323-391):
- `getLeaveTrackerSummary(userId, orgId)` — returns `{ balances, requests }` for the
  current year, reading the **same** `LeaveBalance`/`LeaveRequest` tables as Surface A
- `applyLeave(userId, orgId, data)` — validated by
  `LeaveRequestSchema` (`src/modules/hrms/validators.ts:15`):
  `{ leaveTypeId, fromDate, toDate, reason, fromHalf, toHalf, attachmentIds? }`. Creates
  a `LeaveRequest` with `halfDay: fromHalf || toHalf`, `notes: reason`. Notifies
  approvers the same way as Surface A (`kind: "LEAVE_SUBMITTED"`, note the **different
  notification kind string** from Surface A's `"LEAVE_REQUEST_SUBMITTED"`). Does **not**
  perform any balance validation/deduction on submit (deduction only happens through
  Surface A's `decideLeaveRequest`).

Consuming routes:
- `src/app/api/hrms/leave/requests/route.ts` — `POST` only, calls `applyLeave`
- `src/app/api/hrms/leave/summary/route.ts` — `GET`, calls `getLeaveTrackerSummary`

Frontend:
- `src/modules/hrms/components/leave-tracker.tsx` — employee self-service leave tracker
  widget, consumed inside the "PeoplePlus HRMS" module UI (`src/modules/hrms/components/*`,
  reached via `src/app/(dashboard)/hrms/*` route tree — separate route tree from
  `/attendance/*`)

**Gap between the two surfaces**: Surface B has no decision/approve endpoint of its own
— an approver must go through Surface A's `/attendance/leaves/[id]` route to
approve/reject a request that was submitted via Surface B's `/api/hrms/leave/requests`.
There is no `attendance.leave.request` permission check on Surface B's POST route (it
only checks the session exists), while Surface A enforces
`attendance.leave.request`/`.approve`/`.manage` permission keys. Two different
notification `kind` strings (`LEAVE_REQUEST_SUBMITTED` vs `LEAVE_SUBMITTED`) mean any
future notification-preference UI would have to special-case both.

### 3.3 Other attendance/holiday-adjacent routes (not leave, but overlapping surface)

- `src/app/api/attendance/punch/route.ts`, `src/app/api/attendance/day-punches/route.ts`
- `src/app/api/attendance/ot/route.ts`, `.../ot/[id]/route.ts`
- `src/app/api/attendance/sync/biometric/route.ts`,
  `.../sync/biometric/live/route.ts`
- `src/app/api/hrms/attendance/month/route.ts`, `.../attendance/punch/route.ts`
- `src/app/api/mobile/hrms/attendance/{check-in,check-out,history}/route.ts` — a third,
  mobile-specific attendance surface (does not touch leave tables directly)
- `src/app/(dashboard)/attendance/{ot,reports,timesheets,biometric-sync}/page.tsx`

---

## 4. Organization/Employee Model

### 4.1 Tenant/org structure

```prisma
// prisma/schema.prisma:12
model Organisation {
  id     String  @id @default(cuid())
  name   String
  slug   String  @unique
  active Boolean @default(true)
  ...
  @@index([slug])
}

// prisma/schema.prisma:210
model Branch {
  id    String @id @default(cuid())
  orgId String
  name  String
  code  String
  @@unique([orgId, code])
}

// prisma/schema.prisma:246
model Department {
  id    String @id @default(cuid())
  orgId String
  name  String
  code  String
  divisions Division[]
  users     User[]
  @@unique([orgId, code])
}

// prisma/schema.prisma:260
model Division {
  id           String @id @default(cuid())
  orgId        String
  departmentId String
  name         String
  @@unique([departmentId, name])
}
```

Hierarchy is `Organisation → Branch` (parallel) and `Organisation → Department →
Division` (nested); `User` links to `orgId`, `branchId`, `departmentId`, `divisionId`
independently (not a single FK chain).

### 4.2 RBAC structure

```prisma
// prisma/schema.prisma:277
model Role {
  id       String  @id @default(cuid())
  orgId    String
  name     String
  isSystem Boolean @default(false)
  @@unique([orgId, name])
}

model Permission {
  id    String @id @default(cuid())
  key   String @unique   // e.g. "attendance.leave.approve"
  label String
  group String
}

model RolePermission {
  roleId       String
  permissionId String
  @@id([roleId, permissionId])
}
```

`UserRole` (many-to-many `User`↔`Role`, referenced from `User.roles`) is the join used
by `loadUserPermissions` (§7).

### 4.3 User model — eligibility-relevant fields

From `model User` (`prisma/schema.prisma:315`):

```prisma
model User {
  id              String    @id @default(cuid())
  orgId           String?
  email           String    @unique
  name            String
  active          Boolean   @default(true)
  designation     String?
  branchId        String?
  departmentId    String?
  divisionId      String?
  managerId       String?   // reporting manager
  tlId            String?   // team lead (separate from manager)
  employmentType  String?   // freeform string, no enum
  employeeNumber  Int?      @unique
  firstName       String?
  lastName        String?
  dob             DateTime?
  gender          String?
  ...
  org        Organisation? @relation(fields: [orgId], references: [id])
  branch     Branch?       @relation(fields: [branchId], references: [id])
  department Department?   @relation(fields: [departmentId], references: [id])
  division   Division?     @relation(fields: [divisionId], references: [id])
  manager    User?         @relation("ManagerReports", fields: [managerId], references: [id])
  reports    User[]        @relation("ManagerReports")
  tl         User?         @relation("TLReports", fields: [tlId], references: [id])
  tlReports  User[]        @relation("TLReports")

  employmentRecord EmploymentRecord?
  ...
  leaveBalances  LeaveBalance[]
  leaveRequests  LeaveRequest[] @relation("LeaveRequester")
  leaveApprovals LeaveRequest[] @relation("LeaveApprover")
}
```

Joining date, exit date, grade and CTC live in a **separate one-to-one model**, not on
`User` itself:

```prisma
// prisma/schema.prisma:693
model EmploymentRecord {
  id                   String    @id @default(cuid())
  userId               String    @unique
  joinDate             DateTime
  exitDate             DateTime?
  grade                String?
  ctc                  Float?
  priorExperienceYears Float?    @default(0)
  payrollMeta          Json?
  basic          Float? @default(0)
  hra            Float? @default(0)
  conveyance     Float? @default(0)
  transport      Float? @default(0)
  travelling     Float? @default(0)
  fixedAllowance Float? @default(0)
  stipend        Float? @default(0)
}
```

A future entitlement engine that needs "years of service" or "confirmation date" for
proration/eligibility rules must join through `EmploymentRecord.joinDate` /
`priorExperienceYears`, not `User` directly. There is also
`EmployeeHrmsProfile { userId, data: Json, customValues: Json? }` — a freeform bag
used for extended profile fields defined via `EmployeeProfileField` (org-configurable
custom fields, section/type/options/position) — this is where org-specific eligibility
attributes (e.g. a custom "confirmation date" field) would currently have to live if not
modeled as a first-class column.

`employmentType` is an unconstrained `String?` — no enum of PERMANENT/CONTRACT/
PROBATION/INTERN exists anywhere in the schema, meaning any leave-policy eligibility
rule keyed off employment type today would have to match on free text.

---

## 5. Payroll Integration Points

```prisma
// prisma/schema.prisma:5688
model PayrollBatch {
  id               String   @id @default(cuid())
  orgId            String
  month            DateTime @db.Date
  status           String   @default("DRAFT") // DRAFT | FINALIZED | PAID
  totalAmount      Decimal  @default(0.0) @db.Decimal(18, 4)
  journalEntryId   String?
  sourceSnapshotId String?
  sourceRunId      String?
  sourceRunVersion Int?

  org            Organisation              @relation(fields: [orgId], references: [id], onDelete: Cascade)
  journalEntry   JournalEntry?             @relation(fields: [journalEntryId], references: [id], onDelete: SetNull)
  sourceSnapshot AccountingSourceSnapshot? @relation(fields: [sourceSnapshotId], references: [id], onDelete: Restrict)

  @@unique([orgId, month])
  @@unique([orgId, sourceRunId, sourceRunVersion])
}
```

`PayrollBatch` lives in the **Accounting module's schema block**, is a monthly,
org-scoped, single-status-lifecycle batch (`DRAFT → FINALIZED → PAID`) that links to a
`JournalEntry` (GL posting) and an `AccountingSourceSnapshot` (the accounting module's
idempotent-source-of-truth pattern, see `AccountingIntegrationInbox`/`Outbox` models).
There is **no field on `PayrollBatch` or any join table connecting it to `EmployeeLop`,
`LeaveRequest`, `LeaveBalance`, or `OtRecord`** — LOP days (`EmployeeLop.lopDays`) are
entered manually per `payrollMonth` with no automated linkage from unpaid-leave
approvals. This means:
- No existing code path converts an approved *unpaid* `LeaveRequest` into an
  `EmployeeLop` row.
- No existing code path feeds leave-encashment or leave-balance-at-payout into
  `PayrollBatch`/`AccountingSourceSnapshot`.
- The `AccountingSourceSnapshot`/inbox-outbox idempotent-integration pattern used
  elsewhere in Accounting (e.g. `accountingPayrollRunSnapshots` on `Organisation`) is
  the closest existing reusable pattern *if* leave-to-payroll integration is designed to
  follow the same idempotent-snapshot approach, but nothing wires leave into it today.

---

## 6. RBAC/Permissions Pattern

Central implementation: `src/lib/rbac.ts` (382 lines).

Core primitives:
```ts
export async function can(userId: string, permissionKey: string): Promise<boolean>
export async function canAll(userId: string, keys: string[]): Promise<boolean>
export async function requirePermission(userId: string, permissionKey: string): Promise<void> // throws ForbiddenError
export async function loadCaps(userId: string): Promise<Caps> // serialisable {key: true} map for client nav gating
```

Permission keys are dotted strings resolved from DB (`UserRole → RolePermission →
Permission.key`) via a raw SQL join, wrapped in three cache layers: an in-process
`Map` (`permMemCache`, 5 min TTL) → Next.js `unstable_cache` (tag
`rbac:user-permissions`, `revalidate: 300`) → DB fallback. `invalidateRbacCache()`
clears both when roles/permissions change.

The Accounting module additionally layers a **department-based permission-bundle
override** on top of the base key set
(`getDepartmentScopedPermissionKeys`/`ACCOUNTING_FULL_PERMISSION_BUNDLE`/
`ACCOUNTING_READ_PERMISSION_BUNDLE`) plus a **backward-compat expansion table**
(`PERMISSION_COMPATIBILITY`, `expandPermissionKeys`) that lets old coarse-grained
permission keys imply newer fine-grained ones. This is Accounting-specific logic bolted
onto the generic RBAC loader — leave permissions (`attendance.leave.request`,
`attendance.leave.approve`, `attendance.leave.manage`) do **not** currently have any
such compatibility/bundle expansion; they are checked as plain flat keys.

Existing leave permission keys in use (found via route/service grep, not from a static
seed list): `attendance.leave.request`, `attendance.leave.approve`,
`attendance.leave.manage`.

Route-handler usage example (`src/app/api/attendance/leaves/[id]/route.ts`):
```ts
const { session, error } = await getSessionOrUnauth();
if (error) return error;
await requirePermission(session!.user.id, "attendance.leave.approve");
```

`AccountingCapabilityPolicy` (`prisma/schema.prisma:4671`) is a **separate, more
sophisticated capability system** than the base `Role`/`Permission` tables — it models
per-org, versioned, approval-gated capability grants (fields include
`createdById`/`approvedById`/`rejectedById`/`revokedById` relations back to `User`).
This is Accounting-specific and not generalized as a shared framework; a new Leave
module should use the base `Role`/`Permission`/`RolePermission`/`requirePermission()`
pattern, not attempt to reuse `AccountingCapabilityPolicy` directly.

---

## 7. Notification Pattern

Models: `Notification`, `NotificationActivity` (`prisma/schema.prisma:572`, `:612`).
Service: `src/modules/notifications/service.ts`, thin re-export facade at
`src/lib/notify.ts`.

```ts
// src/lib/notify.ts
export {
  notify,
  notifyMany,
  flushEmailQueue,
  createNotification,
  recordNotificationActivity,
} from "@/modules/notifications/service";
```

```ts
// src/modules/notifications/service.ts
export async function notify(params: CreateNotificationParams): Promise<void> {
  await createNotification(params);
}
export async function notifyMany(userIds: string[], params: Omit<CreateNotificationParams, "userId">): Promise<void> {
  await Promise.all(userIds.map((userId) => createNotification({ ...params, userId })));
}
export async function getUsersWithPermission(orgId: string, permissionKey: string) {
  const rows = await db.userRole.findMany({
    where: { role: { orgId, permissions: { some: { permission: { key: permissionKey } } } } },
    select: { userId: true },
  });
  return [...new Set(rows.map((row) => row.userId))];
}
```

`CreateNotificationParams` supports `kind`, `title`, `body`, `link`, `payload` (JSON),
`priority`, `requiresAck`, and an `email: true` flag that (per `decideLeaveRequest`
usage) triggers an email send alongside the in-app notification. `variant`/`appearance`
drive presentation styling via `src/modules/notifications/policy.ts`.

Real call sites from the leave flow (both are the actual reuse examples for a new
module):
```ts
// src/modules/attendance/service.ts — createLeaveRequest()
const approverIds = await getUsersWithPermission(request.user.orgId, "attendance.leave.approve");
await notifyMany(recipientIds, {
  orgId: request.user.orgId,
  kind: "LEAVE_REQUEST_SUBMITTED",
  title: `Leave request from ${request.user.name}`,
  body: `${request.user.name} submitted a ${request.leaveType.name} leave request.`,
  link: "/attendance/leaves",
  payload: { leaveRequestId: request.id, requesterId: request.user.id },
});

// decideLeaveRequest()
await notify({
  userId: req.userId,
  orgId: req.user.orgId ?? undefined,
  kind: "LEAVE_DECISION",
  title: `Leave ${decision}: ${req.leaveType.name}`,
  body: `Your leave request from ${req.fromDate.toDateString()} to ${req.toDate.toDateString()} was ${decision}.`,
  link: "/attendance/leaves",
  email: true,
  payload: { leaveRequestId: req.id, decision, approverId },
});
```

`getUsersWithPermission` is itself the reusable pattern for "notify everyone who can
approve X" — a new module reuses this directly rather than hand-rolling approver
discovery.

---

## 8. Audit Log Pattern

There are **at least four different audit-log shapes** in the codebase, not one
consistent pattern:

```prisma
// Generic HR — simple, currently unused by leave code despite the doc-comment example
model HrmsAuditLog {
  id        String   @id @default(cuid())
  orgId     String
  userId    String
  action    String   // e.g. PUNCH_IN, LEAVE_APPROVED, TICKET_RESOLVED
  details   Json?
  createdAt DateTime @default(now())
}

// Accounting — full before/after diff capture
model AccountingAuditLog {
  id           String   @id @default(cuid())
  orgId        String
  userId       String
  action       String
  entityType   String
  entityId     String
  beforeValues Json?
  afterValues  Json?
  timestamp    DateTime @default(now())
}

// CHA (customs/freight) module — state-machine-flavored, job-scoped
model ChaAuditLog {
  id         String   @id @default(cuid())
  orgId      String
  jobId      String?
  entityType String
  entityId   String
  event      String
  actorId    String
  timestamp  DateTime @default(now())
  prevState  String?
  newState   String?
  remarks    String?
  metadata   Json?
}
```

(A fourth, `AppraisalAuditLog`, and a fifth, `CustomerPortalAuditLog`, also exist —
each module in this codebase has hand-rolled its own audit table rather than sharing
one.) For Leave, `HrmsAuditLog` is the natural home by domain (it already lives in the
same schema block as `LeaveType`/`LeaveRequest`/`Holiday`, and its own action-example
comment names `LEAVE_APPROVED`), but note it is schema-only today — **no code currently
inserts into it from the leave flow**, so "reuse" here means "start writing to a table
that already exists" rather than "extend an already-working integration." If richer
before/after diffing is required (e.g. for compliance evidence on balance mutations),
the `AccountingAuditLog` shape (`beforeValues`/`afterValues` Json) is the better
template to imitate, even though it lives in a different module.

---

## 9. Settings UI Conventions

Example: `src/app/(dashboard)/attendance/settings/page.tsx` — a server component that
composes a shared "People workspace" component set from
`src/modules/people/components/people-workspace.tsx`:

```tsx
import {
  PeopleActionLink, PeopleLinkCard, PeopleLinkGrid, PeopleSection,
  PeopleSectionHeader, PeopleSummary, PeopleSummaryGrid,
} from "@/modules/people/components/people-workspace";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AttendanceSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <>
      <PeopleSummaryGrid>
        <PeopleSummary icon={...} label="Control areas" value={controlAreas.length} detail="..." />
        ...
      </PeopleSummaryGrid>
      <PeopleSection>
        <PeopleSectionHeader eyebrow="Configuration workspace" title="..." description="..." actions={<PeopleActionLink href="/attendance/punch">Open punch workspace</PeopleActionLink>} />
        <PeopleLinkGrid>
          {controlAreas.map((area) => <PeopleLinkCard key={area.href} {...area} />)}
        </PeopleLinkGrid>
      </PeopleSection>
    </>
  );
}
```

This settings page is a **hub/index page** (auth check → redirect, summary tiles, then a
grid of link-cards to sub-workspaces), not a form itself — the actual leave policy
configuration (creating `LeaveType`s) happens inside `/attendance/leaves` via
`leaves-client.tsx`, which was not fully read in this pass but is confirmed to exist at
`src/app/(dashboard)/attendance/leaves/leaves-client.tsx`. Other settings trees worth
knowing about for pattern comparison: `src/app/(dashboard)/hrms/settings`,
`src/app/(dashboard)/accounting/settings`, `src/app/(dashboard)/admin/settings`, each
with their own `page.tsx` + `*-client.tsx` split (server page fetches/authorizes, client
component owns interactive state) — this server/client split is the dominant page
convention throughout the app, and forms use `react-hook-form` + `zod` resolvers
(`@hookform/resolvers`) per `package.json`.

---

## 10. Multi-tenancy Enforcement Pattern

There is **no database-level tenant isolation** (no Postgres RLS policies found, no
Prisma client extension/middleware auto-injecting `orgId`). `src/lib/db.ts` constructs a
single shared `PrismaClient` (via `@prisma/adapter-pg`) with no tenant-scoping wrapper —
every model simply carries a plain `orgId String` (or `orgId String?` on `User`) column,
and **every query is manually scoped by the calling service function**. Examples:

```ts
// src/modules/attendance/service.ts — getLeaveRequests()
const where: Record<string, unknown> = {};
...
where.user = { orgId };   // scoped via the related User, not a direct column filter
return db.leaveRequest.findMany({ where, ... });
```

```ts
// src/lib/rbac.ts — loadPermissionBundleFromDb()
db.$queryRaw`... WHERE ur."userId" = ${userId}` // permission loading is user-scoped, not org-scoped directly
```

Because `LeaveRequest`/`LeaveBalance` don't carry `orgId` directly (only `LeaveType` and
`Holiday` do), any query against them must join through `user.orgId` or
`leaveType.orgId` to stay tenant-safe — there is no compile-time guard against a
developer forgetting this join. `session.user.orgId` (from next-auth) is the source of
truth passed into every service function; there is no separate tenant-context
middleware. `isPlatformAdmin: Boolean` on `User` is the only cross-tenant escape hatch
found in the schema (used for platform-level administration, not leave-relevant).

---

## 11. Reuse Recommendations

Reuse as-is, do not rebuild:
- **RBAC primitives** — `can`/`canAll`/`requirePermission`/`loadCaps` from
  `src/lib/rbac.ts`, and the `Role`/`Permission`/`RolePermission`/`UserRole` tables.
  Define new leave permission keys (extending the existing
  `attendance.leave.request`/`.approve`/`.manage` set) rather than inventing a parallel
  permission model.
- **Notification delivery** — `notify()`/`notifyMany()`/`getUsersWithPermission()` from
  `src/modules/notifications/service.ts` (via `src/lib/notify.ts`). Do not build a
  second notification pipe; add new `kind` values and reuse `email: true` for
  decision emails.
- **Email queue/send** — `sendEmail()` (`src/lib/email.ts`) and `EmailQueue` +
  `flushEmailQueue()` + the `api/cron/email-flush` cron route pattern, for anything
  beyond the notify()-triggered email path (e.g. digest emails, reminder emails).
- **Cron scheduling mechanism** — the `src/app/api/cron/*` route + `requireCronSecret()`
  + Vercel Cron pattern is the only scheduler in this codebase; a leave accrual-runner
  or carry-forward job should be added as `src/app/api/cron/leave-accrual/route.ts`
  (or similar), not as a new in-process scheduler.
- **Org/Branch/Department/Division/User/EmploymentRecord models** — as the identity and
  eligibility source; do not duplicate org-structure fields onto new leave models,
  reference `userId`/`orgId` and join.
- **`Holiday`, `WorkingCalendar`, `Shift`, `ShiftAssignment`** — reuse for
  working-day/holiday-aware leave-duration calculation rather than reimplementing
  calendar logic. Note `WorkingCalendar`/`OtSettings` are singleton-per-org — a leave
  module needing multiple calendars (e.g. per-branch) will need new modeling here, see
  Gaps.
- **Settings-hub UI pattern** — `PeopleSection`/`PeopleSummaryGrid`/`PeopleLinkGrid`/
  `PeopleLinkCard` from `src/modules/people/components/people-workspace.tsx`, and the
  server-page-authorizes/client-component-owns-state split used throughout
  `src/app/(dashboard)/**/settings/page.tsx` + `*-client.tsx`.
- **`getSessionOrUnauth`/`ok`/`err` API helpers** (`src/lib/api-helpers.ts`, referenced
  from `src/app/api/attendance/leaves/route.ts`) for consistent route-handler response
  shaping.
- **`react-hook-form` + `zod` resolver** convention for all new forms/wizards.

Extend, don't replace:
- **`LeaveType`/`LeaveBalance`/`LeaveRequest`** — the base identifiers and relations
  (`orgId` on `LeaveType`, `userId`+`leaveTypeId` on balance/request) are sound
  foundations; the flat-balance/no-ledger/no-enum-status shortcomings (§12) need
  additive migration, not a parallel schema.
- **`HrmsAuditLog`** — start writing to it from leave actions (approve/reject/
  balance-adjust) using the existing `action`/`details` shape; if before/after diffing
  is required, look at `AccountingAuditLog`'s `beforeValues`/`afterValues` shape as the
  template for a possible `HrmsAuditLog` field addition.

Do not reuse directly (adjacent module, different concerns):
- `AccountingCapabilityPolicy` / `AccountingApprovalPolicy` — sophisticated
  versioned-policy-with-approval-gate models, but tightly coupled to the Accounting
  module's document types and posting flow. Study their *shape* (versioned JSON
  `configuration`, `effectiveFrom`/`effectiveTo`, `isActive`) as a design reference for
  a future leave-policy-versioning table, but do not add foreign keys into the
  Accounting tables.
- `PayrollBatch` — reference its `orgId`/`month` keying conventions, but there is no
  existing integration point to hook into; a leave→payroll bridge is new work (§12).

---

## 12. Gaps — what must be built new

1. **Unify or formally reconcile the two leave surfaces.** Surface A
   (`src/modules/attendance/service.ts` + `/api/attendance/leaves*`,
   `/attendance/leaves` UI) and Surface B (`src/modules/hrms/service.ts` + `/api/hrms/
   leave/*`, `leave-tracker.tsx`) both read/write the same three tables but have
   divergent permission checks, divergent notification `kind` strings, and Surface B
   has no approve/reject endpoint of its own. This is the single biggest architectural
   decision for the next phase (see final summary).

2. **Real balance ledger.** `LeaveBalance.balance: Float` is a mutable counter with no
   transaction history — no record of individual accrual events, deductions,
   adjustments, encashments, or expiries. A production module needs an append-only
   ledger table (accrual/debit/credit/adjustment/expiry entries) with the current
   balance as a derived/materialized value, plus concurrency-safe mutation (the current
   `updateMany({ decrement })` has no optimistic-lock/row-version protection against
   concurrent approvals racing on the same balance).

3. **Accrual engine.** `LeaveType.accrualRule: Json?` is declared but never read by any
   code — there is no monthly/anniversary-based accrual runner, no cron job crediting
   balances, no carry-forward-at-year-end logic, no encashment/lapse logic at year
   boundary.

4. **Leave policy versioning / effective-dating.** `LeaveType` has no
   effective-from/to, no branch/department/employment-type scoping, no proration rules
   for mid-year joiners (only `EmploymentRecord.joinDate` exists to compute against, but
   nothing consumes it for leave). Compare to `AccountingApprovalPolicy`'s
   versioned-JSON-configuration pattern, which is a reasonable template but does not
   exist yet for leave.

5. **Approval routing beyond a single approver.** `LeaveRequest.approverId` is one
   column; there's no multi-level approval chain, no delegate/out-of-office reassignment,
   no manager-vs-HR-vs-both routing, unlike `AccountingApprovalPolicy`'s configurable
   policy engine (which itself is Accounting-specific and not a generic framework — see
   §11).

6. **Sandwich-leave rules, weekend/holiday-aware duration calculation.** Duration is
   currently `ceil((toDate-fromDate)/86400000)+1` — a naive calendar-day count with no
   subtraction of weekly-offs/holidays and no sandwich-rule (leave spanning a weekend
   counts the weekend too) policy logic, despite `Holiday` and `WorkingCalendar` data
   existing to support such a calculation.

7. **Comp-off as a first-class, leave-integrated concept.** `OtRecord.compOffDays` and
   `OtSettings.compOffSlabs` exist on the OT side, but there is no model connecting
   earned comp-off to a `LeaveType`/`LeaveBalance` that an employee could actually apply
   as leave — comp-off and leave are two disconnected systems today.

8. **LOP / payroll integration.** No automated conversion of an approved unpaid
   `LeaveRequest` into an `EmployeeLop` row for the relevant `payrollMonth`; no
   `PayrollBatch` linkage at all from leave (§5). This is new integration work end to
   end.

9. **Attachment persistence.** `LeaveRequestSchema.attachmentIds` (Surface B validator)
   is accepted but never persisted or related to `LeaveRequest` — there's no
   `LeaveRequestAttachment` model or Google-Drive-document linkage wired up despite
   `src/modules/hrms/document-drive.ts` existing for other HR document flows.

10. **Compliance / statutory leave packs** (e.g. state-specific Shops & Establishments
    Act rules, maternity/paternity statutory entitlements, restricted-holiday quotas) —
    nothing in the schema or code encodes jurisdiction-specific compliance rules; this
    is greenfield.

11. **Audit trail wiring.** `HrmsAuditLog` exists but is not populated by any current
    leave code path (§8) — instrumentation must be added, not just reused.

12. **Cancellation flow.** `LeaveRequest.status` comment lists `"cancelled"` as a valid
    state but no service function sets it — employee-initiated cancellation/withdrawal
    of a pending or even approved (with balance reversal) request does not exist.

13. **Employment-type-aware eligibility.** `User.employmentType` is a free-text
    `String?` with no enum/lookup table — any policy that varies by
    permanent/contract/probation status needs this formalized first.

---

## Summary for stakeholders

**Stack**: Next.js 16 App Router, Prisma 7 / PostgreSQL, next-auth v5, Vitest, Tailwind
v4 + first-party design system, Vercel-Cron-based job scheduling (no queue product),
Google Drive file storage, Resend/SMTP email with an `EmailQueue` outbox.

**What already exists for leave**: `LeaveType`/`LeaveBalance`/`LeaveRequest` tables are
real and functional — there are two working, independently deployed CRUD+approval
surfaces built on them (`src/modules/attendance/service.ts` for admin/approver use,
`src/modules/hrms/service.ts` for employee self-service), each with live API routes and
UI. This is **not a stub** — employees can submit leave, approvers can approve/reject,
and balances do decrement on approval, with in-app + email notifications firing
correctly through the shared notification pipeline. However, it is a **thin MVP**: a
single flat balance counter with no ledger/audit trail, no accrual engine, naive
calendar-day duration math with no holiday/weekend awareness, a single-approver model,
no payroll/comp-off/attachment integration, and — critically — the two surfaces are not
reconciled with each other (different permission gates, different notification `kind`
strings, no shared approval endpoint).

**Biggest architectural decision for the next phase**: whether to (a) consolidate onto
one of the two existing surfaces and extend the current flat-balance `LeaveRequest`/
`LeaveBalance` tables in place with additive migrations (ledger table, accrual fields,
policy versioning), preserving the existing notification/RBAC wiring and both sets of
API consumers, or (b) design a new parallel ledger-based Leave module (new tables,
new service layer) and migrate/retire the two existing surfaces onto it. Given the
depth of already-wired integration (RBAC keys in active use, notifications firing,
two live frontend consumers), extending in place is very likely the lower-risk path —
but that decision, and the plan for reconciling Surface A vs Surface B in the process,
is the one this audit deliberately leaves open for the design phase.
