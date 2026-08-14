import { db } from "@/lib/db";

export interface ReportFilters {
  orgId: string;
  departmentId?: string;
  branchId?: string;
  leaveTypeId?: string;
  fromDate?: Date;
  toDate?: Date;
}

/** Report 1: Employee Leave Balance — current balance per employee per leave type. */
export async function getEmployeeLeaveBalanceReport(filters: ReportFilters, year: number) {
  const users = await db.user.findMany({
    where: {
      orgId: filters.orgId,
      active: true,
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
    },
    select: { id: true, name: true, employeeNumber: true, department: { select: { name: true } } },
  });

  const balances = await db.leaveBalance.findMany({
    where: {
      userId: { in: users.map((u) => u.id) },
      year,
      ...(filters.leaveTypeId ? { leaveTypeId: filters.leaveTypeId } : {}),
    },
    include: { leaveType: { select: { name: true, code: true } } },
  });

  return users.map((user) => ({
    userId: user.id,
    name: user.name,
    employeeNumber: user.employeeNumber,
    department: user.department?.name ?? null,
    balances: balances
      .filter((b) => b.userId === user.id)
      .map((b) => ({ leaveType: b.leaveType.name, code: b.leaveType.code, balance: b.balance })),
  }));
}

/** Report 2: Leave Transaction Ledger — full audit trail, filterable. */
export async function getLedgerReport(filters: ReportFilters) {
  return db.leaveLedgerEntry.findMany({
    where: {
      orgId: filters.orgId,
      ...(filters.leaveTypeId ? { leaveTypeId: filters.leaveTypeId } : {}),
      ...(filters.fromDate || filters.toDate
        ? {
            effectiveDate: {
              ...(filters.fromDate ? { gte: filters.fromDate } : {}),
              ...(filters.toDate ? { lte: filters.toDate } : {}),
            },
          }
        : {}),
    },
    include: {
      user: { select: { name: true, employeeNumber: true } },
      leaveType: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
}

/** Report 3: Leave Requests — all requests in range, any status. */
export async function getLeaveRequestsReport(filters: ReportFilters) {
  return db.leaveRequest.findMany({
    where: {
      user: {
        orgId: filters.orgId,
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      },
      ...(filters.leaveTypeId ? { leaveTypeId: filters.leaveTypeId } : {}),
      ...(filters.fromDate || filters.toDate
        ? {
            fromDate: { ...(filters.toDate ? { lte: filters.toDate } : {}) },
            toDate: { ...(filters.fromDate ? { gte: filters.fromDate } : {}) },
          }
        : {}),
    },
    include: {
      user: { select: { name: true, employeeNumber: true } },
      leaveType: { select: { name: true } },
      approver: { select: { name: true } },
    },
    orderBy: { fromDate: "desc" },
  });
}

/** Report 4: Leave Type Utilization — total consumed per leave type. */
export async function getLeaveTypeUtilizationReport(filters: ReportFilters, year: number) {
  const entries = await db.leaveLedgerEntry.groupBy({
    by: ["leaveTypeId", "type"],
    where: {
      orgId: filters.orgId,
      effectiveDate: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31) },
      type: { in: ["LEAVE_CONSUMED", "ACCRUAL"] },
    },
    _sum: { quantity: true },
  });

  const leaveTypes = await db.leaveType.findMany({ where: { orgId: filters.orgId } });

  return leaveTypes.map((lt) => {
    const accrued = entries.find((e) => e.leaveTypeId === lt.id && e.type === "ACCRUAL")?._sum.quantity ?? 0;
    const consumed = Math.abs(
      entries.find((e) => e.leaveTypeId === lt.id && e.type === "LEAVE_CONSUMED")?._sum.quantity ?? 0,
    );
    return {
      leaveTypeId: lt.id,
      leaveTypeName: lt.name,
      totalAccrued: accrued,
      totalConsumed: consumed,
      utilizationRate: accrued > 0 ? Math.round((consumed / accrued) * 100) : 0,
    };
  });
}

/** Report 5: Department Leave Summary. */
export async function getDepartmentLeaveSummaryReport(filters: ReportFilters, year: number) {
  const departments = await db.department.findMany({ where: { orgId: filters.orgId } });

  const results = [];
  for (const dept of departments) {
    const users = await db.user.findMany({ where: { departmentId: dept.id, active: true }, select: { id: true } });
    const userIds = users.map((u) => u.id);
    if (userIds.length === 0) {
      results.push({ departmentId: dept.id, departmentName: dept.name, employeeCount: 0, totalLeaveTaken: 0 });
      continue;
    }
    const consumed = await db.leaveLedgerEntry.aggregate({
      where: {
        userId: { in: userIds },
        type: "LEAVE_CONSUMED",
        effectiveDate: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31) },
      },
      _sum: { quantity: true },
    });
    results.push({
      departmentId: dept.id,
      departmentName: dept.name,
      employeeCount: userIds.length,
      totalLeaveTaken: Math.abs(consumed._sum.quantity ?? 0),
    });
  }
  return results;
}

/** Report 6: Upcoming Leave — approved leave starting in the next N days. */
export async function getUpcomingLeaveReport(filters: ReportFilters, daysAhead: number) {
  const now = new Date();
  const horizon = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  return db.leaveRequest.findMany({
    where: {
      user: { orgId: filters.orgId },
      status: { in: ["approved", "APPROVED"] },
      fromDate: { gte: now, lte: horizon },
    },
    include: { user: { select: { name: true } }, leaveType: { select: { name: true } } },
    orderBy: { fromDate: "asc" },
  });
}

/** Report 7: LOP Details — for payroll handoff. */
export async function getLopReport(filters: ReportFilters, payrollMonth: Date) {
  const users = await db.user.findMany({ where: { orgId: filters.orgId, active: true }, select: { id: true, name: true, employeeNumber: true } });
  const lopRecords = await db.employeeLop.findMany({
    where: { userId: { in: users.map((u) => u.id) }, payrollMonth },
  });
  return lopRecords
    .map((r) => {
      const user = users.find((u) => u.id === r.userId);
      return {
        userId: r.userId,
        name: user?.name ?? "Unknown",
        employeeNumber: user?.employeeNumber ?? null,
        lopDays: r.lopDays,
        remarks: r.remarks,
      };
    })
    .filter((r) => r.lopDays > 0);
}

/** Report 8: Expiring Leave — balances with carry-forward expiring soon. */
export async function getExpiringLeaveReport(filters: ReportFilters, daysAhead: number) {
  const now = new Date();
  const horizon = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const balances = await db.leaveBalance.findMany({
    where: {
      leaveType: { orgId: filters.orgId },
      nextResetDate: { gte: now, lte: horizon },
      balance: { gt: 0 },
    },
    include: { user: { select: { name: true } }, leaveType: { select: { name: true } } },
  });

  return balances.map((b) => ({
    userId: b.userId,
    name: b.user.name,
    leaveTypeName: b.leaveType.name,
    currentBalance: b.balance,
    resetDate: b.nextResetDate,
  }));
}

/** Report 9: Approval Turnaround — average time from submission to decision. */
export async function getApprovalTurnaroundReport(filters: ReportFilters) {
  const requests = await db.leaveRequest.findMany({
    where: {
      user: { orgId: filters.orgId },
      status: { in: ["approved", "APPROVED", "rejected", "REJECTED"] },
    },
    select: { id: true, createdAt: true, updatedAt: true, status: true },
  });

  if (requests.length === 0) return { averageTurnaroundHours: 0, sampleSize: 0 };

  const totalHours = requests.reduce(
    (sum, r) => sum + (r.updatedAt.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60),
    0,
  );

  return {
    averageTurnaroundHours: Math.round((totalHours / requests.length) * 10) / 10,
    sampleSize: requests.length,
  };
}
