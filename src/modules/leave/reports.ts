import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

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
    const accrued = (
      entries.find((e) => e.leaveTypeId === lt.id && e.type === "ACCRUAL")?._sum.quantity ?? new Prisma.Decimal(0)
    ).toNumber();
    const consumed = Math.abs(
      (
        entries.find((e) => e.leaveTypeId === lt.id && e.type === "LEAVE_CONSUMED")?._sum.quantity ??
        new Prisma.Decimal(0)
      ).toNumber(),
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
      totalLeaveTaken: Math.abs((consumed._sum.quantity ?? new Prisma.Decimal(0)).toNumber()),
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

/** Report 10: Carry Forward — CARRY_FORWARD ledger entries in a period. */
export async function getCarryForwardReport(filters: ReportFilters) {
  return db.leaveLedgerEntry.findMany({
    where: {
      orgId: filters.orgId,
      type: "CARRY_FORWARD",
      ...(filters.leaveTypeId ? { leaveTypeId: filters.leaveTypeId } : {}),
      ...(filters.fromDate || filters.toDate
        ? { effectiveDate: { ...(filters.fromDate ? { gte: filters.fromDate } : {}), ...(filters.toDate ? { lte: filters.toDate } : {}) } }
        : {}),
    },
    include: { user: { select: { name: true, employeeNumber: true } }, leaveType: { select: { name: true } } },
    orderBy: { effectiveDate: "desc" },
  });
}

/** Report 11: Encashment — ENCASHMENT ledger entries, payroll-handoff shaped. */
export async function getEncashmentReport(filters: ReportFilters) {
  const entries = await db.leaveLedgerEntry.findMany({
    where: {
      orgId: filters.orgId,
      type: "ENCASHMENT",
      ...(filters.leaveTypeId ? { leaveTypeId: filters.leaveTypeId } : {}),
      ...(filters.fromDate || filters.toDate
        ? { effectiveDate: { ...(filters.fromDate ? { gte: filters.fromDate } : {}), ...(filters.toDate ? { lte: filters.toDate } : {}) } }
        : {}),
    },
    include: { user: { select: { name: true, employeeNumber: true } }, leaveType: { select: { name: true } } },
    orderBy: { effectiveDate: "desc" },
  });
  return entries.map((e) => ({
    userId: e.userId,
    name: e.user.name,
    employeeNumber: e.user.employeeNumber,
    leaveTypeName: e.leaveType.name,
    units: e.quantity.abs().toNumber(),
    effectiveDate: e.effectiveDate,
    source: (e.metadata as { encashmentSource?: string } | null)?.encashmentSource ?? null,
  }));
}

/** Report 12: Comp-Off — all CompOffCredit rows with status. */
export async function getCompOffReport(filters: ReportFilters) {
  return db.compOffCredit.findMany({
    where: {
      orgId: filters.orgId,
      ...(filters.fromDate || filters.toDate
        ? { earnedDate: { ...(filters.fromDate ? { gte: filters.fromDate } : {}), ...(filters.toDate ? { lte: filters.toDate } : {}) } }
        : {}),
    },
    include: { user: { select: { name: true, employeeNumber: true } } },
    orderBy: { earnedDate: "desc" },
  });
}

/** Report 13: Accrual History — ACCRUAL ledger entries in a period. */
export async function getAccrualHistoryReport(filters: ReportFilters) {
  return db.leaveLedgerEntry.findMany({
    where: {
      orgId: filters.orgId,
      type: "ACCRUAL",
      ...(filters.leaveTypeId ? { leaveTypeId: filters.leaveTypeId } : {}),
      ...(filters.fromDate || filters.toDate
        ? { effectiveDate: { ...(filters.fromDate ? { gte: filters.fromDate } : {}), ...(filters.toDate ? { lte: filters.toDate } : {}) } }
        : {}),
    },
    include: { user: { select: { name: true, employeeNumber: true } }, leaveType: { select: { name: true } } },
    orderBy: { effectiveDate: "desc" },
    take: 5000,
  });
}

/** Report 14: Balance Adjustments — MANUAL_CREDIT/MANUAL_DEBIT/ADJUSTMENT ledger entries. */
export async function getBalanceAdjustmentsReport(filters: ReportFilters) {
  return db.leaveLedgerEntry.findMany({
    where: {
      orgId: filters.orgId,
      type: { in: ["MANUAL_CREDIT", "MANUAL_DEBIT", "ADJUSTMENT"] },
      ...(filters.leaveTypeId ? { leaveTypeId: filters.leaveTypeId } : {}),
      ...(filters.fromDate || filters.toDate
        ? { effectiveDate: { ...(filters.fromDate ? { gte: filters.fromDate } : {}), ...(filters.toDate ? { lte: filters.toDate } : {}) } }
        : {}),
    },
    include: {
      user: { select: { name: true, employeeNumber: true } },
      leaveType: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Report 15: Scheduler Runs — LeaveSchedulerRun history (observability, spec §44). */
export async function getSchedulerRunsReport(filters: ReportFilters) {
  return db.leaveSchedulerRun.findMany({
    where: { orgId: filters.orgId },
    orderBy: { startedAt: "desc" },
    take: 500,
  });
}

/** Report 16: Expired Leave — CARRY_FORWARD_EXPIRY and COMP_OFF_EXPIRY entries (distinct from "Expiring" which is forward-looking). */
export async function getExpiredLeaveReport(filters: ReportFilters) {
  return db.leaveLedgerEntry.findMany({
    where: {
      orgId: filters.orgId,
      type: { in: ["CARRY_FORWARD_EXPIRY", "COMP_OFF_EXPIRY"] },
      ...(filters.leaveTypeId ? { leaveTypeId: filters.leaveTypeId } : {}),
      ...(filters.fromDate || filters.toDate
        ? { effectiveDate: { ...(filters.fromDate ? { gte: filters.fromDate } : {}), ...(filters.toDate ? { lte: filters.toDate } : {}) } }
        : {}),
    },
    include: { user: { select: { name: true, employeeNumber: true } }, leaveType: { select: { name: true } } },
    orderBy: { effectiveDate: "desc" },
  });
}

/** Report 17: Policy Assignment — which employees are covered by which published policy, via live applicability evaluation. */
export async function getPolicyAssignmentReport(filters: ReportFilters) {
  const leaveTypes = await db.leaveType.findMany({
    where: { orgId: filters.orgId, activeVersionId: { not: null } },
  });

  const { isPolicyApplicableToUser } = await import("@/modules/leave/eligibility");
  const users = await db.user.findMany({
    where: { orgId: filters.orgId, active: true },
    select: { id: true, name: true, employeeNumber: true },
  });

  const results = [];
  for (const leaveType of leaveTypes) {
    if (!leaveType.activeVersionId) continue;
    const assignedUsers = [];
    for (const user of users) {
      const applicable = await isPolicyApplicableToUser(leaveType.activeVersionId, user.id);
      if (applicable) assignedUsers.push({ userId: user.id, name: user.name, employeeNumber: user.employeeNumber });
    }
    results.push({ leaveTypeId: leaveType.id, leaveTypeName: leaveType.name, assignedCount: assignedUsers.length, assignedUsers });
  }
  return results;
}

/** Report 18: Compliance Exceptions — published policies whose entitlement is below a statutory minimum (spec §27's checkPolicyCompliance, aggregated across all policies for the org rather than one at a time). */
export async function getComplianceExceptionsReport(filters: ReportFilters, jurisdictionCountry: string, jurisdictionState?: string) {
  const { checkPolicyCompliance } = await import("@/modules/leave/compliance");

  const publishedVersions = await db.leavePolicyVersion.findMany({
    where: { status: "PUBLISHED", leaveType: { orgId: filters.orgId } },
    include: { leaveType: true },
  });

  const exceptions = [];
  for (const version of publishedVersions) {
    const results = await checkPolicyCompliance(version.id, jurisdictionCountry, jurisdictionState ?? null, version.classification);
    const flagged = results.filter((r) => r.belowMinimum);
    if (flagged.length > 0) {
      exceptions.push({ leaveTypeId: version.leaveTypeId, leaveTypeName: version.leaveType.name, version: version.version, issues: flagged });
    }
  }
  return exceptions;
}

/**
 * Report 19: Employee Jurisdiction Assignment (spec §35 multi-jurisdiction
 * support) — shows every active employee's deterministically-resolved
 * jurisdiction (branch's jurisdiction, falling back to the org default,
 * falling back to unassigned) and groups them, so HR can see at a glance
 * which jurisdictions actually have employees before running compliance
 * checks per jurisdiction, and which employees have NO jurisdiction
 * configured at all (a real gap to close, not silently ignored).
 */
export async function getEmployeeJurisdictionReport(filters: ReportFilters) {
  const { resolveEmployeeJurisdiction } = await import("@/modules/leave/compliance");

  const employees = await db.user.findMany({
    where: { orgId: filters.orgId, active: true },
    select: { id: true, name: true, employeeNumber: true, branchId: true, branch: { select: { name: true } } },
  });

  const rows = [];
  for (const employee of employees) {
    const jurisdiction = await resolveEmployeeJurisdiction(employee.id);
    rows.push({
      userId: employee.id,
      name: employee.name,
      employeeNumber: employee.employeeNumber,
      branchName: employee.branch?.name ?? null,
      jurisdictionCountry: jurisdiction?.country ?? null,
      jurisdictionState: jurisdiction?.state ?? null,
      unassigned: !jurisdiction,
    });
  }

  const byJurisdiction = new Map<string, number>();
  for (const row of rows) {
    const key = row.jurisdictionCountry ? `${row.jurisdictionCountry}${row.jurisdictionState ? `/${row.jurisdictionState}` : ""}` : "UNASSIGNED";
    byJurisdiction.set(key, (byJurisdiction.get(key) ?? 0) + 1);
  }

  return {
    employees: rows,
    summary: [...byJurisdiction.entries()].map(([jurisdiction, count]) => ({ jurisdiction, count })),
    unassignedCount: rows.filter((r) => r.unassigned).length,
  };
}

/**
 * Report 19: Stale Leave Balances — employees who hold a non-zero balance
 * for a leave type they are no longer applicable to under its current
 * published policy. The complement of Report 17 (which shows who IS
 * currently assigned): this surfaces the drift left behind by an employee
 * move (branch/department/designation change) where a balance was earned
 * under the old assignment and never explicitly zeroed — HR review, never
 * an automatic write, since a lateral move should not silently forfeit
 * genuinely-earned leave (spec closure-pass "applicability re-evaluation
 * on employee move").
 */
export async function getStaleLeaveBalancesReport(filters: ReportFilters, year: number) {
  const { isPolicyApplicableToUser } = await import("@/modules/leave/eligibility");

  const balances = await db.leaveBalance.findMany({
    where: {
      year,
      leaveType: { orgId: filters.orgId, activeVersionId: { not: null } },
      balance: { not: 0 },
    },
    include: {
      user: { select: { id: true, name: true, employeeNumber: true, active: true } },
      leaveType: { select: { id: true, name: true, activeVersionId: true } },
    },
  });

  const stale = [];
  for (const balance of balances) {
    if (!balance.leaveType.activeVersionId) continue;
    if (!balance.user.active) continue; // exited employees are a separate concern (employee-exit.ts), not a "move" drift
    const applicable = await isPolicyApplicableToUser(balance.leaveType.activeVersionId, balance.userId);
    if (applicable) continue;
    stale.push({
      userId: balance.userId,
      userName: balance.user.name,
      employeeNumber: balance.user.employeeNumber,
      leaveTypeId: balance.leaveTypeId,
      leaveTypeName: balance.leaveType.name,
      year,
      balance: balance.balance.toNumber(),
    });
  }
  return stale;
}
