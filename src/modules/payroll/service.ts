import { db } from "@/lib/db";
import { getPayrollBatches } from "@/modules/accounting/service";
import {
  getPayrollWorkspaceData,
  type PayrollBatchSummary,
  type PayrollWorkspaceData,
} from "@/modules/hrms/payroll";
import { listSalaryRevisionSummaries } from "@/modules/hrms/salary-revisions";
import { listIncentiveEntries } from "@/modules/incentives/service";

type PayrollMeta = {
  paymentMode?: string | null;
};

export type PayrollEmployeeProfile = {
  id: string;
  employeeNumber: string;
  employeeName: string;
  designation: string | null;
  departmentName: string | null;
  branchName: string | null;
  employmentType: string | null;
  joinDate: string | null;
  exitDate: string | null;
  paymentMode: string | null;
  annualCtc: number;
  monthlyGross: number;
  bankName: string | null;
  bankAccountMasked: string | null;
  ifscMasked: string | null;
  panMasked: string | null;
  uanMasked: string | null;
  payrollEligibility:
    | "PAYROLL_ACTIVE"
    | "ON_HOLD"
    | "EXITED"
    | "NOT_ELIGIBLE";
  runStatus: "READY" | "REVIEW" | "NOT_IN_PERIOD";
  issueCount: number;
};

export type PayrollCostTrendPoint = {
  monthKey: string;
  label: string;
  netPay: number;
  tds: number;
  benefits: number;
  deductions: number;
};

export type PayrollModuleSnapshot = {
  period: PayrollWorkspaceData["period"];
  workspace: PayrollWorkspaceData;
  batches: PayrollBatchSummary[];
  employees: PayrollEmployeeProfile[];
  incentives: Awaited<ReturnType<typeof listIncentiveEntries>>;
  salaryRevisions: Awaited<ReturnType<typeof listSalaryRevisionSummaries>>;
  settings: {
    defaultSalaryExpenseConfigured: boolean;
    defaultSalaryPayableConfigured: boolean;
    defaultBankConfigured: boolean;
  };
  currentMonth: {
    incentiveCount: number;
    approvedIncentiveAmount: number;
    payrollBatchCount: number;
    approvedBatchCount: number;
    postedBatchCount: number;
    employeesMissingPaymentSetup: number;
    employeesMissingSalarySetup: number;
    employeesReady: number;
    employeesInReview: number;
    employeesWithPan: number;
    employeesWithUan: number;
    activeEmployeeCount: number;
  };
  loans: {
    supported: boolean;
    reason: string;
  };
  costTrend: PayrollCostTrendPoint[];
};

export function parsePayrollPeriod(searchPeriod: string | undefined) {
  if (!searchPeriod) return new Date();
  const match = searchPeriod.match(/^(\d{4})-(\d{2})$/);
  if (!match) return new Date();
  const [, year, month] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1));
}

function startOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function asNumber(value: unknown) {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function maskSuffix(value: string | null | undefined, visibleDigits = 4) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length <= visibleDigits) return trimmed;
  return `${"*".repeat(Math.max(0, trimmed.length - visibleDigits))}${trimmed.slice(-visibleDigits)}`;
}

function normalizePayrollMeta(raw: unknown): PayrollMeta {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as PayrollMeta;
}

export function formatPayrollMoney(value: number) {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPayrollMonth(isoDate: string) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(isoDate));
}

export function formatPayrollDate(isoDate: string | null) {
  if (!isoDate) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(isoDate));
}

function monthsBack(from: Date, count: number) {
  const months: Date[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    months.push(new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - i, 1)));
  }
  return months;
}

async function buildPayrollCostTrend(
  orgId: string,
  monthDate: Date,
  months = 6,
): Promise<PayrollCostTrendPoint[]> {
  const points = await Promise.all(
    monthsBack(monthDate, months).map(async (monthStart) => {
      const workspace = await getPayrollWorkspaceData(orgId, monthStart);
      return {
        monthKey: workspace.period.key,
        label: new Intl.DateTimeFormat("en-IN", {
          month: "short",
          year: "2-digit",
          timeZone: "UTC",
        }).format(monthStart),
        netPay: workspace.summary.netPayroll,
        tds: workspace.summary.tdsLiability,
        benefits: roundMoney(
          workspace.summary.epfLiability + workspace.summary.esiLiability,
        ),
        deductions: workspace.summary.employeeDeductions,
      } satisfies PayrollCostTrendPoint;
    }),
  );
  return points;
}

export async function getPayrollModuleSnapshot(orgId: string, monthDate: Date) {
  const monthStart = startOfUtcMonth(monthDate);
  const monthEnd = endOfUtcMonth(monthDate);

  const [workspace, batches, salaryRevisions, incentives, employees, settings, costTrend] =
    await Promise.all([
      getPayrollWorkspaceData(orgId, monthStart),
      getPayrollBatches(orgId),
      listSalaryRevisionSummaries(orgId),
      listIncentiveEntries(orgId),
      db.user.findMany({
        where: { orgId },
        select: {
          id: true,
          name: true,
          employeeNumber: true,
          designation: true,
          employmentType: true,
          active: true,
          bankName: true,
          bankAccount: true,
          ifsc: true,
          pan: true,
          uan: true,
          branch: { select: { name: true } },
          department: { select: { name: true } },
          employmentRecord: {
            select: {
              joinDate: true,
              exitDate: true,
              ctc: true,
              payrollMeta: true,
            },
          },
        },
        orderBy: [{ employeeNumber: "asc" }, { name: "asc" }],
      }),
      db.accountingSettings.findUnique({
        where: { orgId },
        select: {
          defaultSalaryExpenseAccountId: true,
          defaultSalaryPayableAccountId: true,
          defaultBankAccountId: true,
        },
      }),
      buildPayrollCostTrend(orgId, monthStart),
    ]);

  const workspaceRows = new Map(workspace.rows.map((row) => [row.employeeId, row]));
  const currentMonthIncentives = incentives.filter(
    (entry) => entry.eligibleDate >= monthStart && entry.eligibleDate <= monthEnd,
  );

  const employeeProfiles: PayrollEmployeeProfile[] = employees.map((employee) => {
    const row = workspaceRows.get(employee.id);
    const employment = employee.employmentRecord;
    const payrollMeta = normalizePayrollMeta(employment?.payrollMeta);
    const joinDate = employment?.joinDate?.toISOString() ?? null;
    const exitDate = employment?.exitDate?.toISOString() ?? null;

    let payrollEligibility: PayrollEmployeeProfile["payrollEligibility"] =
      "NOT_ELIGIBLE";
    if (!employee.active) {
      payrollEligibility = "ON_HOLD";
    } else if (employment?.exitDate && employment.exitDate < monthStart) {
      payrollEligibility = "EXITED";
    } else if (
      employment?.joinDate &&
      employment.joinDate <= monthEnd &&
      (!employment.exitDate || employment.exitDate >= monthStart)
    ) {
      payrollEligibility = "PAYROLL_ACTIVE";
    }

    return {
      id: employee.id,
      employeeNumber:
        employee.employeeNumber == null ? "-" : String(employee.employeeNumber),
      employeeName: employee.name,
      designation: employee.designation,
      departmentName: employee.department?.name ?? null,
      branchName: employee.branch?.name ?? null,
      employmentType: employee.employmentType,
      joinDate,
      exitDate,
      paymentMode: row?.paymentMode ?? payrollMeta.paymentMode ?? null,
      annualCtc: asNumber(employment?.ctc),
      monthlyGross: row?.grossMonthly ?? (employment?.ctc ? roundMoney(employment.ctc / 12) : 0),
      bankName: employee.bankName,
      bankAccountMasked: maskSuffix(employee.bankAccount),
      ifscMasked: maskSuffix(employee.ifsc),
      panMasked: maskSuffix(employee.pan),
      uanMasked: maskSuffix(employee.uan),
      payrollEligibility,
      runStatus: row?.status ?? "NOT_IN_PERIOD",
      issueCount: row?.issues.length ?? 0,
    };
  });

  return {
    period: workspace.period,
    workspace,
    batches: batches.map((batch) => ({
      id: batch.id,
      month: batch.month.toISOString(),
      type: batch.type,
      status: batch.status,
      totalAmount: asNumber(batch.totalAmount),
      journalVoucherNo: batch.journalEntry?.voucherNo ?? null,
      journalEntryId: batch.journalEntry?.id ?? null,
      createdAt: batch.createdAt.toISOString(),
      updatedAt: batch.updatedAt.toISOString(),
    })),
    employees: employeeProfiles,
    incentives,
    salaryRevisions,
    settings: {
      defaultSalaryExpenseConfigured: Boolean(
        settings?.defaultSalaryExpenseAccountId,
      ),
      defaultSalaryPayableConfigured: Boolean(
        settings?.defaultSalaryPayableAccountId,
      ),
      defaultBankConfigured: Boolean(settings?.defaultBankAccountId),
    },
    currentMonth: {
      incentiveCount: currentMonthIncentives.length,
      approvedIncentiveAmount: roundMoney(
        currentMonthIncentives
          .filter((entry) => ["APPROVED", "PAID"].includes(entry.status))
          .reduce((sum, entry) => sum + asNumber(entry.amount), 0),
      ),
      payrollBatchCount: workspace.hasApprovedBatch || workspace.hasPostedBatch ? 1 : 0,
      approvedBatchCount: workspace.hasApprovedBatch ? 1 : 0,
      postedBatchCount: workspace.hasPostedBatch ? 1 : 0,
      employeesMissingPaymentSetup: employeeProfiles.filter(
        (employee) =>
          employee.payrollEligibility === "PAYROLL_ACTIVE" &&
          (!employee.paymentMode || !employee.bankAccountMasked),
      ).length,
      employeesMissingSalarySetup: employeeProfiles.filter(
        (employee) =>
          employee.payrollEligibility === "PAYROLL_ACTIVE" &&
          employee.monthlyGross <= 0,
      ).length,
      employeesReady: workspace.summary.readyEmployees,
      employeesInReview: workspace.summary.reviewEmployees,
      employeesWithPan: employeeProfiles.filter((employee) => employee.panMasked).length,
      employeesWithUan: employeeProfiles.filter((employee) => employee.uanMasked).length,
      activeEmployeeCount: employees.filter((employee) => employee.active).length,
    },
    loans: {
      supported: true,
      reason: "Loan CRUD and repayment tracking are live. Automatic EMI deduction in the pay-run calc engine is not yet wired in.",
    },
    costTrend,
  } satisfies PayrollModuleSnapshot;
}
