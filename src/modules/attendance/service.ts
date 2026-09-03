import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { appendAttendancePunchEvent, calculateOtForPunch } from "@/lib/ot";
import { getAttendanceMonthBounds, toAttendanceDate } from "@/lib/attendance-date";
import { getCachedLeaveTypes } from "@/lib/cache";
import { submitLeaveRequest, decideLeaveRequest as decideLeaveRequestV2 } from "@/modules/leave/request";

// ─── Punch ────────────────────────────────────────────────────────────────────

export async function punchIn(userId: string, date: Date) {
  const now = await getNow();
  const attendanceDate = toAttendanceDate(date);
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { orgId: true },
  });
  const punch = await db.attendancePunch.upsert({
    where: { userId_date: { userId, date: attendanceDate } },
    update: { inAt: now },
    create: { userId, date: attendanceDate, inAt: now, source: "web" },
  });
  if (user?.orgId) {
    await appendAttendancePunchEvent(userId, user.orgId, attendanceDate, {
      punchedAt: now,
      source: "web",
      eventType: "CHECK_IN",
      metadata: { origin: "attendance.service.punchIn" },
    });
  }
  await calculateOtForPunch(userId, attendanceDate);
  return punch;
}

export async function punchOut(userId: string, date: Date) {
  const now = await getNow();
  const attendanceDate = toAttendanceDate(date);
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { orgId: true },
  });
  const punch = await db.attendancePunch.upsert({
    where: { userId_date: { userId, date: attendanceDate } },
    update: { outAt: now },
    create: { userId, date: attendanceDate, outAt: now, source: "web" },
  });
  if (user?.orgId) {
    await appendAttendancePunchEvent(userId, user.orgId, attendanceDate, {
      punchedAt: now,
      source: "web",
      eventType: "CHECK_OUT",
      metadata: { origin: "attendance.service.punchOut" },
    });
  }
  await calculateOtForPunch(userId, attendanceDate);
  return punch;
}

export async function getMonthAttendance(userId: string, year: number, month: number) {
  const { start: from, end: to } = getAttendanceMonthBounds(year, month);
  return db.attendancePunch.findMany({
    where: { userId, date: { gte: from, lte: to } },
    orderBy: { date: "asc" },
  });
}

// ─── Leave types ──────────────────────────────────────────────────────────────

export async function getLeaveTypes(orgId: string) {
  return getCachedLeaveTypes(orgId);
}

export async function createLeaveType(orgId: string, data: {
  name: string; paid: boolean; defaultBalance: number;
}) {
  return db.leaveType.create({ data: { orgId, ...data } });
}

// ─── Leave balances ───────────────────────────────────────────────────────────

export async function getLeaveBalances(userId: string, year: number) {
  return db.leaveBalance.findMany({
    where: { userId, year },
    include: { leaveType: true },
  });
}

/**
 * Initializes opening leave balances for a new employee. Posts one
 * OPENING_BALANCE ledger entry per applicable, published leave-type policy
 * via postLedgerEntry — never writes LeaveBalance.balance directly, so
 * every opening balance has a matching ledger row from day one (closes the
 * gap where legacy seeding created balances with zero audit trail).
 */
export async function initLeaveBalancesForUser(userId: string, orgId: string, year: number) {
  const { postLedgerEntry } = await import("@/modules/leave/ledger");
  const { getActivePolicyVersion } = await import("@/modules/leave/policy");
  const { isPolicyApplicableToUser } = await import("@/modules/leave/eligibility");

  const types = await db.leaveType.findMany({ where: { orgId } });
  const asOf = new Date(year, 0, 1);

  for (const type of types) {
    const version = await getActivePolicyVersion(type.id, asOf);
    if (!version) continue;
    const applicable = await isPolicyApplicableToUser(version.id, userId);
    if (!applicable) continue;

    await postLedgerEntry({
      orgId,
      userId,
      leaveTypeId: type.id,
      policyVersionId: version.id,
      type: "OPENING_BALANCE",
      quantity: type.defaultBalance,
      effectiveDate: asOf,
      year,
      source: "SYSTEM",
      reason: "Initial balance on eligibility for this leave policy",
      idempotencyKey: `opening-balance:${userId}:${type.id}:${year}`,
    });
  }
}

// ─── Leave requests ───────────────────────────────────────────────────────────

export async function getLeaveRequests(orgId: string, filters?: {
  userId?: string; status?: string; approverId?: string;
}) {
  const where: Record<string, unknown> = {};
  if (filters?.userId) where.userId = filters.userId;
  if (filters?.status) where.status = filters.status;
  if (filters?.approverId) where.approverId = filters.approverId;

  // Scope to org via user
  where.user = { orgId };

  return db.leaveRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true } },
      leaveType: true,
      approver: { select: { id: true, name: true } },
    },
  });
}

// NOTE: createLeaveRequest/decideLeaveRequest are now thin compatibility
// wrappers around src/modules/leave/request.ts — the consolidated leave
// engine (ledger-backed, policy-versioned, multi-step approval). Kept here
// so existing callers (src/app/api/attendance/leaves*) keep working
// unchanged. See docs/leave-management/ARCHITECTURE.md §1.
export async function createLeaveRequest(userId: string, data: {
  leaveTypeId: string; fromDate: Date; toDate: Date; halfDay: boolean; notes?: string;
  onDutyLocation?: string; onDutyReference?: string;
  dayPart?: "FULL" | "HALF" | "QUARTER"; fromTime?: string; toTime?: string;
}) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { orgId: true } });
  if (!user.orgId) throw new Error("User has no organisation");
  const { request } = await submitLeaveRequest({
    orgId: user.orgId,
    userId,
    leaveTypeId: data.leaveTypeId,
    fromDate: data.fromDate,
    toDate: data.toDate,
    halfDay: data.halfDay,
    dayPart: data.dayPart,
    fromTime: data.fromTime,
    toTime: data.toTime,
    notes: data.notes,
    onDutyLocation: data.onDutyLocation,
    onDutyReference: data.onDutyReference,
  });
  return request;
}

export async function decideLeaveRequest(
  requestId: string,
  approverId: string,
  decision: "approved" | "rejected"
) {
  return decideLeaveRequestV2({
    requestId,
    approverId,
    decision: decision === "approved" ? "APPROVED" : "REJECTED",
  });
}

// ─── OT ───────────────────────────────────────────────────────────────────────

export async function createOTEntry(userId: string, data: {
  date: Date; hours: number; notes?: string;
}) {
  return db.oTEntry.create({ data: { userId, ...data, status: "pending" } });
}

export async function decideOT(
  entryId: string,
  orgId: string,
  approverId: string,
  decision: "approved" | "rejected",
) {
  // Tenant guard: the OT entry's employee must be in the approver's org.
  const entry = await db.oTEntry.findFirst({
    where: { id: entryId, user: { orgId } },
    select: { id: true },
  });
  if (!entry) throw new Error("Not found");
  return db.oTEntry.update({
    where: { id: entryId },
    data: { status: decision, approverId },
  });
}

export async function getOTEntries(orgId: string, filters?: { userId?: string; status?: string }) {
  const where: Record<string, unknown> = {};
  if (filters?.userId) where.userId = filters.userId;
  if (filters?.status) where.status = filters.status;
  where.user = { orgId };

  return db.oTEntry.findMany({
    where,
    orderBy: { date: "desc" },
    include: { user: { select: { id: true, name: true } } },
  });
}

// ─── Holidays ─────────────────────────────────────────────────────────────────

export async function getHolidays(orgId: string, year: number, branchId?: string) {
  return db.holiday.findMany({
    where: {
      orgId,
      date: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31) },
      OR: [{ branchId: null }, { branchId: branchId ?? null }],
    },
    orderBy: { date: "asc" },
    include: { branch: true },
  });
}

export async function createHoliday(orgId: string, data: {
  date: Date; name: string; branchId?: string;
}) {
  return db.holiday.create({ data: { orgId, ...data } });
}

// ─── Report ───────────────────────────────────────────────────────────────────

export async function getMonthlyReport(orgId: string, year: number, month: number) {
  const users = await db.user.findMany({
    where: { orgId, active: true },
    select: { id: true, name: true, designation: true },
  });

  const { start: from, end: to } = getAttendanceMonthBounds(year, month);

  const punches = await db.attendancePunch.findMany({
    where: { userId: { in: users.map((u) => u.id) }, date: { gte: from, lte: to } },
  });

  const byUser = new Map(users.map((u) => [u.id, { user: u, days: 0, lateCount: 0 }]));
  for (const p of punches) {
    const entry = byUser.get(p.userId);
    if (entry) entry.days++;
  }

  return [...byUser.values()];
}
