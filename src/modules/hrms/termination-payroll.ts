import { db } from "@/lib/db";
import { acceptApprovedPayrollRun } from "@/modules/accounting/integration-adapters";

// Phase 21: Final Settlement / Termination payroll (individual and bulk —
// bulk is simply a termination run with more than one employee entry, same
// underlying calculation, matching the captured Zoho behavior
// docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md pages 00067-00069/00072).
//
// HRMS owns exit/termination status — this reads EmploymentRecord.exitDate
// as a precondition rather than writing it (an employee must already be
// marked as exiting in HRMS before a settlement can be processed).
// v1 simplification: statutory deduction recompute on the prorated amount is
// not applied — additional earnings/deductions are posted as entered. Full
// statutory treatment is Phase 26 work.
export type TerminationEntryInput = {
  employeeId: string;
  bonus?: number;
  stipend?: number;
  overtime?: number;
  leaveEncashment?: number;
  incentives?: number;
  gratuity?: number;
  deductions?: { label: string; amount: number }[];
  noticePay?: { mode: "PAY" | "RECOVER"; amount: number };
};

function endOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}
function asNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

export async function listTerminationPayrollBatches(orgId: string) {
  return db.payrollBatch.findMany({
    where: { orgId, type: "TERMINATION" },
    include: { journalEntry: { select: { id: true, voucherNo: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function listExitingEmployees(orgId: string) {
  return db.user.findMany({
    where: { orgId, employmentRecord: { exitDate: { not: null } } },
    select: {
      id: true,
      name: true,
      employeeNumber: true,
      employmentRecord: { select: { exitDate: true, ctc: true, basic: true, hra: true } },
    },
    orderBy: { name: "asc" },
  });
}

async function computeSettlement(orgId: string, entry: TerminationEntryInput) {
  const employee = await db.user.findFirst({
    where: { id: entry.employeeId, orgId },
    select: {
      name: true,
      employmentRecord: {
        select: {
          exitDate: true,
          basic: true,
          hra: true,
          conveyance: true,
          transport: true,
          travelling: true,
          fixedAllowance: true,
        },
      },
    },
  });
  if (!employee?.employmentRecord?.exitDate) {
    throw new Error(
      `${employee?.name ?? "Employee"} has no last working day set in HRMS — set the exit date there before processing a settlement.`,
    );
  }

  const lwd = employee.employmentRecord.exitDate;
  const monthEnd = endOfUtcMonth(lwd);
  const daysInMonth = monthEnd.getUTCDate();
  const payableDays = lwd.getUTCDate();

  const monthlyGross =
    asNumber(employee.employmentRecord.basic) +
    asNumber(employee.employmentRecord.hra) +
    asNumber(employee.employmentRecord.conveyance) +
    asNumber(employee.employmentRecord.transport) +
    asNumber(employee.employmentRecord.travelling) +
    asNumber(employee.employmentRecord.fixedAllowance);

  const proratedRegularPay = roundMoney((monthlyGross / daysInMonth) * payableDays);

  const additionalEarnings = roundMoney(
    asNumber(entry.bonus) +
      asNumber(entry.stipend) +
      asNumber(entry.overtime) +
      asNumber(entry.leaveEncashment) +
      asNumber(entry.incentives) +
      asNumber(entry.gratuity),
  );
  const deductionsTotal = roundMoney((entry.deductions ?? []).reduce((sum, d) => sum + asNumber(d.amount), 0));
  const noticePayDelta =
    entry.noticePay?.mode === "PAY"
      ? asNumber(entry.noticePay.amount)
      : entry.noticePay?.mode === "RECOVER"
        ? -asNumber(entry.noticePay.amount)
        : 0;

  const grossEarnings = roundMoney(proratedRegularPay + additionalEarnings + Math.max(0, noticePayDelta));
  const netPay = roundMoney(
    Math.max(0, grossEarnings - deductionsTotal + Math.min(0, noticePayDelta)),
  );

  return {
    employeeId: entry.employeeId,
    employeeName: employee.name,
    lastWorkingDay: lwd,
    payableDays,
    daysInMonth,
    proratedRegularPay,
    additionalEarnings,
    deductionsTotal,
    noticePayDelta,
    grossEarnings,
    netPay,
  };
}

export async function previewTerminationSettlement(orgId: string, entry: TerminationEntryInput) {
  return computeSettlement(orgId, entry);
}

export async function createTerminationPayrollRun(
  orgId: string,
  actorId: string,
  entries: TerminationEntryInput[],
) {
  if (entries.length === 0) {
    throw new Error("Add at least one employee to process a settlement.");
  }

  const settlements = await Promise.all(entries.map((entry) => computeSettlement(orgId, entry)));

  const settings = await db.accountingSettings.findUnique({
    where: { orgId },
    select: { defaultSalaryExpenseAccountId: true, defaultSalaryPayableAccountId: true },
  });
  if (!settings?.defaultSalaryExpenseAccountId || !settings.defaultSalaryPayableAccountId) {
    throw new Error("Accounting defaults are incomplete. Configure salary expense and salary payable accounts first.");
  }

  const totalGross = roundMoney(settlements.reduce((sum, s) => sum + s.grossEarnings, 0));
  const totalNet = roundMoney(settlements.reduce((sum, s) => sum + s.netPay, 0));
  const totalDeductions = roundMoney(totalGross - totalNet);

  const latestLwd = settlements.reduce(
    (latest, s) => (s.lastWorkingDay > latest ? s.lastWorkingDay : latest),
    settlements[0]!.lastWorkingDay,
  );
  const runKey = `${latestLwd.toISOString().slice(0, 10)}-${Date.now()}`;

  const lines: Array<{ componentCode: string; accountId: string; debit: string; credit: string }> = [
    {
      componentCode: "TERMINATION_GROSS_EARNINGS",
      accountId: settings.defaultSalaryExpenseAccountId,
      debit: totalGross.toFixed(2),
      credit: "0.00",
    },
  ];
  if (totalDeductions > 0) {
    lines.push({
      componentCode: "TERMINATION_DEDUCTIONS",
      accountId: settings.defaultSalaryPayableAccountId,
      debit: "0.00",
      credit: totalDeductions.toFixed(2),
    });
  }
  lines.push({
    componentCode: "TERMINATION_NET_PAYABLE",
    accountId: settings.defaultSalaryPayableAccountId,
    debit: "0.00",
    credit: totalNet.toFixed(2),
  });

  await acceptApprovedPayrollRun({
    orgId,
    actorId,
    approvedById: actorId,
    approvedAt: new Date().toISOString(),
    correlationId: `hrms-payroll-termination-${runKey}`,
    currencyCode: "INR",
    eventId: `hrms-payroll-termination-${runKey}-approved-v1`,
    lines,
    payPeriodStart: latestLwd,
    payPeriodEnd: latestLwd,
    runId: `HRMS-PAYROLL-TERMINATION-${runKey}`,
    runVersion: 1,
    payrollType: "TERMINATION",
  });

  return settlements;
}
