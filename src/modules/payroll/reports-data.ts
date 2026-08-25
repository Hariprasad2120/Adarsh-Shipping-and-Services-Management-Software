import { db } from "@/lib/db";
import { deriveGrossMonthly, getPayrollWorkspaceData } from "@/modules/hrms/payroll";

function asNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
function roundMoney(value: number) {
  return Number(value.toFixed(2));
}
function startOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}
function endOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

// ---------------------------------------------------------------------------
// Scheduled Earning Summary — each active employee's recurring monthly
// earning components (Basic/HRA/Conveyance/Transport/Travelling/Fixed
// Allowance/Stipend), the same fields deriveGrossMonthly already sums for
// regular payroll. This is real per-employee employment-record data, not a
// separate "scheduled earnings" ledger (this codebase has none), presented
// as the recurring/fixed counterpart to the Variable Pay report below.
// ---------------------------------------------------------------------------
export async function getScheduledEarningSummary(orgId: string, monthDate: Date) {
  const monthStart = startOfUtcMonth(monthDate);
  const monthEnd = endOfUtcMonth(monthDate);
  const users = await db.user.findMany({
    where: {
      orgId,
      active: true,
      employmentRecord: {
        is: {
          joinDate: { lte: monthEnd },
          OR: [{ exitDate: null }, { exitDate: { gte: monthStart } }],
        },
      },
    },
    select: {
      id: true,
      name: true,
      employeeNumber: true,
      employmentRecord: {
        select: {
          ctc: true,
          basic: true,
          hra: true,
          conveyance: true,
          transport: true,
          travelling: true,
          fixedAllowance: true,
          stipend: true,
          payrollMeta: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return users
    .filter((u) => u.employmentRecord)
    .map((u) => {
      const er = u.employmentRecord!;
      return {
        employeeId: u.id,
        employeeName: u.name,
        employeeNumber: u.employeeNumber == null ? "-" : String(u.employeeNumber),
        basic: roundMoney(asNumber(er.basic)),
        hra: roundMoney(asNumber(er.hra)),
        conveyance: roundMoney(asNumber(er.conveyance)),
        transport: roundMoney(asNumber(er.transport)),
        travelling: roundMoney(asNumber(er.travelling)),
        fixedAllowance: roundMoney(asNumber(er.fixedAllowance)),
        stipend: roundMoney(asNumber(er.stipend)),
        grossMonthly: roundMoney(deriveGrossMonthly(er)),
      };
    })
    .filter((row) => row.grossMonthly > 0);
}

// ---------------------------------------------------------------------------
// Variable Pay Earnings Report — approved/paid IncentiveEntry rows within the
// period, the same table the CRM/HRMS incentive workflow already writes to.
// ---------------------------------------------------------------------------
export async function getVariablePayEarningsReport(orgId: string, monthDate: Date) {
  const monthStart = startOfUtcMonth(monthDate);
  const monthEnd = endOfUtcMonth(monthDate);
  const entries = await db.incentiveEntry.findMany({
    where: {
      orgId,
      eligibleDate: { gte: monthStart, lte: monthEnd },
      status: { in: ["APPROVED", "PAID"] },
    },
    include: {
      employee: { select: { id: true, name: true, employeeNumber: true } },
    },
    orderBy: [{ eligibleDate: "desc" }],
  });

  return entries.map((e) => ({
    id: e.id,
    employeeId: e.employeeId,
    employeeName: e.employee?.name ?? "Unknown",
    employeeNumber: e.employee?.employeeNumber == null ? "-" : String(e.employee?.employeeNumber),
    incentiveType: e.incentiveType,
    referenceLabel: e.referenceLabel,
    amount: asNumber(e.amount),
    status: e.status,
    eligibleDate: e.eligibleDate.toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// Full and Final Settlement Report — every finalized termination/bulk
// termination batch's per-employee settlement detail, as persisted on
// PayrollBatch.metadata by createTerminationPayrollRun.
// ---------------------------------------------------------------------------
export async function getFullAndFinalSettlementReport(orgId: string) {
  const batches = await db.payrollBatch.findMany({
    where: { orgId, type: { in: ["TERMINATION", "BULK_TERMINATION"] } },
    orderBy: { month: "desc" },
  });

  type Entry = {
    employeeId: string;
    employeeName: string;
    employeeNumber: string;
    lastWorkingDay: string;
    baseDays: number;
    payableDays: number;
    grossEarnings: number;
    deductionsTotal: number;
    netPay: number;
  };

  return batches.flatMap((batch) => {
    const metadata = batch.metadata as { entries?: Entry[]; payDate?: string } | null;
    const entries = Array.isArray(metadata?.entries) ? metadata!.entries : [];
    return entries.map((entry) => ({
      batchId: batch.id,
      batchStatus: batch.status,
      payDate: metadata?.payDate ?? batch.month.toISOString(),
      employeeId: entry.employeeId,
      employeeName: entry.employeeName,
      employeeNumber: entry.employeeNumber,
      lastWorkingDay: entry.lastWorkingDay,
      payableDays: entry.payableDays,
      grossEarnings: entry.grossEarnings,
      deductionsTotal: entry.deductionsTotal,
      netPay: entry.netPay,
    }));
  });
}

// ---------------------------------------------------------------------------
// EPF ECR Report — the per-employee rows the government's Electronic Challan
// cum Return format expects (UAN, wages, EPF contribution split), built from
// the same live payroll workspace the EPF Summary report already uses, plus
// the employee's UAN on file.
// ---------------------------------------------------------------------------
export async function getEpfEcrReport(orgId: string, monthDate: Date) {
  const workspace = await getPayrollWorkspaceData(orgId, monthDate);
  const employeeIds = workspace.rows.map((r) => r.employeeId);
  const users = await db.user.findMany({
    where: { id: { in: employeeIds } },
    select: { id: true, uan: true },
  });
  const uanByEmployee = new Map(users.map((u) => [u.id, u.uan]));

  const rows = workspace.rows
    .filter((r) => r.epfAmount > 0)
    .map((r) => ({
      employeeId: r.employeeId,
      employeeName: r.employeeName,
      employeeNumber: r.employeeNumber,
      uan: uanByEmployee.get(r.employeeId) || "Not on file",
      grossWages: r.grossEarnings,
      employeeShare: r.epfEmployeeAmount,
      employerShare: r.epfEmployerAmount,
      totalContribution: r.epfAmount,
    }));

  return { period: workspace.period, rows };
}

// ---------------------------------------------------------------------------
// Investment Declaration Report / Proof of Investment Report — both read the
// same EmployeeInvestmentDeclaration + lines table (already used by
// investment-declaration-actions.ts for the approvals workflow). Proof of
// Investment is filtered to lines that have actually been reviewed
// (approved/partially approved/rejected) — the amount a reviewer verified is
// the closest real "proof accepted" figure this schema tracks; there is no
// separate document-upload/proof-submission table to report from.
// ---------------------------------------------------------------------------
export async function getInvestmentDeclarationReport(orgId: string, fiscalYear: string) {
  const declarations = await db.employeeInvestmentDeclaration.findMany({
    where: { orgId, fiscalYear },
    include: { lines: true },
  });
  const employeeIds = declarations.map((d) => d.employeeId);
  const employees = await db.user.findMany({
    where: { id: { in: employeeIds } },
    select: { id: true, name: true, employeeNumber: true },
  });
  const employeeMap = new Map(employees.map((e) => [e.id, e]));

  return declarations.map((d) => {
    const employee = employeeMap.get(d.employeeId);
    return {
      employeeId: d.employeeId,
      employeeName: employee?.name ?? "Unknown",
      employeeNumber: employee?.employeeNumber == null ? "-" : String(employee?.employeeNumber),
      taxRegime: d.taxRegime ?? "-",
      status: d.status,
      declaredTotal: roundMoney(d.lines.reduce((sum, l) => sum + asNumber(l.declaredAmount), 0)),
      approvedTotal: roundMoney(
        d.lines.reduce((sum, l) => sum + asNumber(l.approvedAmount ?? 0), 0),
      ),
      lines: d.lines.map((l) => ({
        category: l.category,
        description: l.description,
        declaredAmount: l.declaredAmount,
        approvedAmount: l.approvedAmount,
        status: l.status,
      })),
    };
  });
}

export async function getProofOfInvestmentReport(orgId: string, fiscalYear: string) {
  const declarations = await getInvestmentDeclarationReport(orgId, fiscalYear);
  return declarations.flatMap((d) =>
    d.lines
      .filter((l) => l.status === "APPROVED" || l.status === "PARTIALLY_APPROVED" || l.status === "REJECTED")
      .map((l) => ({
        employeeId: d.employeeId,
        employeeName: d.employeeName,
        employeeNumber: d.employeeNumber,
        category: l.category,
        description: l.description ?? "-",
        declaredAmount: l.declaredAmount,
        verifiedAmount: l.approvedAmount ?? 0,
        status: l.status,
      })),
  );
}

// ---------------------------------------------------------------------------
// Activity Logs — HrmsAuditLog, the one real activity/audit trail table in
// this codebase (used org-wide by leave, on-duty, letters, face-enrollment,
// document-drive etc). Filtered to the selected month so it lines up with
// the rest of the Reports Centre's period-driven pages.
// ---------------------------------------------------------------------------
export async function getActivityLogReport(orgId: string, monthDate: Date) {
  const monthStart = startOfUtcMonth(monthDate);
  const monthEnd = endOfUtcMonth(monthDate);
  const logs = await db.hrmsAuditLog.findMany({
    where: { orgId, createdAt: { gte: monthStart, lte: monthEnd } },
    include: { user: { select: { name: true, employeeNumber: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return logs.map((log) => ({
    id: log.id,
    userName: log.user?.name ?? "Unknown",
    employeeNumber: log.user?.employeeNumber == null ? "-" : String(log.user?.employeeNumber),
    action: log.action,
    details: log.details ? JSON.stringify(log.details) : "",
    createdAt: log.createdAt.toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// Annual Professional Tax Report / Form 24Q — both need a fiscal-year (Apr
// to Mar) view of a per-month liability the payroll workspace already
// computes live for one month at a time. There is no separate stored annual
// ledger, so this walks the 12 (or fewer, if the fiscal year is still in
// progress) months sequentially and sums the real per-employee figures —
// same computation the single-month EPF/ESI/PT/TDS Summary reports use, just
// accumulated. Sequential (not Promise.all) so a 12-month pull doesn't burst
// the DB connection pool the way a heavier report page might.
// ---------------------------------------------------------------------------
function fiscalYearMonths(fiscalYearStartYear: number) {
  const now = new Date();
  const months: Date[] = [];
  for (let i = 0; i < 12; i++) {
    const month = new Date(Date.UTC(fiscalYearStartYear, 3 + i, 1));
    if (month > now) break;
    months.push(month);
  }
  return months;
}

export function fiscalYearLabel(fiscalYearStartYear: number) {
  return `${fiscalYearStartYear}-${String((fiscalYearStartYear + 1) % 100).padStart(2, "0")}`;
}

export async function getAnnualProfessionalTaxReport(orgId: string, fiscalYearStartYear: number) {
  const months = fiscalYearMonths(fiscalYearStartYear);
  const byEmployee = new Map<
    string,
    { employeeName: string; employeeNumber: string; total: number; monthsWithLiability: number }
  >();
  for (const month of months) {
    const workspace = await getPayrollWorkspaceData(orgId, month);
    for (const row of workspace.rows) {
      if (row.professionalTaxAmount <= 0) continue;
      const current = byEmployee.get(row.employeeId) ?? {
        employeeName: row.employeeName,
        employeeNumber: row.employeeNumber,
        total: 0,
        monthsWithLiability: 0,
      };
      current.total = roundMoney(current.total + row.professionalTaxAmount);
      current.monthsWithLiability += 1;
      byEmployee.set(row.employeeId, current);
    }
  }
  return {
    fiscalYear: fiscalYearLabel(fiscalYearStartYear),
    monthsCovered: months.length,
    rows: [...byEmployee.entries()].map(([employeeId, v]) => ({ employeeId, ...v })),
  };
}

export async function getForm24QReport(orgId: string, fiscalYearStartYear: number) {
  const months = fiscalYearMonths(fiscalYearStartYear);
  const quarterOf = (monthIndexInFy: number) => Math.floor(monthIndexInFy / 3) + 1; // Apr-Jun=Q1 ... Jan-Mar=Q4
  const byEmployeeQuarter = new Map<
    string,
    { employeeName: string; employeeNumber: string; quarters: Record<string, number> }
  >();
  for (let i = 0; i < months.length; i++) {
    const workspace = await getPayrollWorkspaceData(orgId, months[i]!);
    const quarterLabel = `Q${quarterOf(i)}`;
    for (const row of workspace.rows) {
      if (row.tdsAmount <= 0) continue;
      const current = byEmployeeQuarter.get(row.employeeId) ?? {
        employeeName: row.employeeName,
        employeeNumber: row.employeeNumber,
        quarters: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
      };
      current.quarters[quarterLabel] = roundMoney((current.quarters[quarterLabel] ?? 0) + row.tdsAmount);
      byEmployeeQuarter.set(row.employeeId, current);
    }
  }
  return {
    fiscalYear: fiscalYearLabel(fiscalYearStartYear),
    monthsCovered: months.length,
    rows: [...byEmployeeQuarter.entries()].map(([employeeId, v]) => ({
      employeeId,
      employeeName: v.employeeName,
      employeeNumber: v.employeeNumber,
      q1: v.quarters.Q1 ?? 0,
      q2: v.quarters.Q2 ?? 0,
      q3: v.quarters.Q3 ?? 0,
      q4: v.quarters.Q4 ?? 0,
      total: roundMoney((v.quarters.Q1 ?? 0) + (v.quarters.Q2 ?? 0) + (v.quarters.Q3 ?? 0) + (v.quarters.Q4 ?? 0)),
    })),
  };
}
