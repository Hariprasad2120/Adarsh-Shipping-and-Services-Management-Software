import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { getNow } from "@/lib/clock";
import { notifyMany, getUsersWithPermission } from "@/modules/notifications/service";
import { calculateOtForPunch } from "@/lib/ot";
import { getAttendanceMonthBounds, toAttendanceDate } from "@/lib/attendance-date";

// ─── Punch ────────────────────────────────────────────────────────────────────

export async function punchIn(userId: string, date: Date) {
  const now = await getNow();
  const attendanceDate = toAttendanceDate(date);
  const punch = await db.attendancePunch.upsert({
    where: { userId_date: { userId, date: attendanceDate } },
    update: { inAt: now },
    create: { userId, date: attendanceDate, inAt: now, source: "web" },
  });
  await calculateOtForPunch(userId, attendanceDate);
  return punch;
}

export async function punchOut(userId: string, date: Date) {
  const now = await getNow();
  const attendanceDate = toAttendanceDate(date);
  const punch = await db.attendancePunch.upsert({
    where: { userId_date: { userId, date: attendanceDate } },
    update: { outAt: now },
    create: { userId, date: attendanceDate, outAt: now, source: "web" },
  });
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
  return db.leaveType.findMany({ where: { orgId }, orderBy: { name: "asc" } });
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

export async function initLeaveBalancesForUser(userId: string, orgId: string, year: number) {
  const types = await db.leaveType.findMany({ where: { orgId } });
  if (types.length === 0) return;

  // createMany with skipDuplicates replaces N sequential upserts with one
  // batch INSERT ... ON CONFLICT DO NOTHING, reducing round trips from N to 1.
  await db.leaveBalance.createMany({
    data: types.map((t) => ({
      userId,
      leaveTypeId: t.id,
      year,
      balance: t.defaultBalance,
    })),
    skipDuplicates: true,
  });
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

export async function createLeaveRequest(userId: string, data: {
  leaveTypeId: string; fromDate: Date; toDate: Date; halfDay: boolean; notes?: string;
}) {
  const request = await db.leaveRequest.create({
    data: { userId, ...data, status: "pending" },
    include: {
      user: { select: { id: true, name: true, orgId: true } },
      leaveType: { select: { name: true } },
    },
  });

  if (request.user.orgId) {
    const approverIds = await getUsersWithPermission(request.user.orgId, "attendance.leave.approve");
    const recipientIds = approverIds.filter((id) => id !== userId);
    if (recipientIds.length > 0) {
      await notifyMany(recipientIds, {
        orgId: request.user.orgId,
        kind: "LEAVE_REQUEST_SUBMITTED",
        title: `Leave request from ${request.user.name}`,
        body: `${request.user.name} submitted a ${request.leaveType.name} leave request.`,
        link: "/attendance/leaves",
        payload: {
          leaveRequestId: request.id,
          requesterId: request.user.id,
        },
      });
    }
  }

  return request;
}

export async function decideLeaveRequest(
  requestId: string,
  approverId: string,
  decision: "approved" | "rejected"
) {
  const req = await db.leaveRequest.update({
    where: { id: requestId },
    data: { status: decision, approverId },
    include: { leaveType: true, user: { select: { id: true, name: true, orgId: true } } },
  });

  // Deduct balance on approval
  if (decision === "approved") {
    const days =
      Math.ceil(
        (req.toDate.getTime() - req.fromDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
    const deduct = req.halfDay ? 0.5 : days;
    const year = req.fromDate.getFullYear();

    await db.leaveBalance.updateMany({
      where: { userId: req.userId, leaveTypeId: req.leaveTypeId, year },
      data: { balance: { decrement: deduct } },
    });
  }

  await notify({
    userId: req.userId,
    orgId: req.user.orgId ?? undefined,
    kind: "LEAVE_DECISION",
    title: `Leave ${decision}: ${req.leaveType.name}`,
    body: `Your leave request from ${req.fromDate.toDateString()} to ${req.toDate.toDateString()} was ${decision}.`,
    link: "/attendance/leaves",
    email: true,
    payload: {
      leaveRequestId: req.id,
      decision,
      approverId,
    },
  });

  return req;
}

// ─── OT ───────────────────────────────────────────────────────────────────────

export async function createOTEntry(userId: string, data: {
  date: Date; hours: number; notes?: string;
}) {
  return db.oTEntry.create({ data: { userId, ...data, status: "pending" } });
}

export async function decideOT(entryId: string, approverId: string, decision: "approved" | "rejected") {
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
