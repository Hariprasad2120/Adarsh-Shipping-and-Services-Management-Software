import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { generatePayrollSummary } from "@/lib/ot";
import { acceptApprovedPayrollRun } from "@/modules/accounting/integration-adapters";
import { fireAutomation } from "@/modules/payroll/automation";

type PayrollBreakup = {
  employeePF?: number | null;
  employerPF?: number | null;
  esi?: number | null;
  esiEmployer?: number | null;
  professionalTax?: number | null;
  tax?: number | null;
  gratuity?: number | null;
  insurancePremium?: number | null;
};

type PayrollMeta = {
  monthlyGross?: number | null;
  paymentMode?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  stateCode?: string | null;
  breakup?: PayrollBreakup | null;
};

export type PayrollEmployeeRow = {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  designation: string | null;
  departmentName: string | null;
  branchName: string | null;
  paymentMode: string | null;
  grossMonthly: number;
  employmentDays: number;
  payableDays: number;
  presentDays: number;
  holidayDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  manualLopDays: number;
  partialPayDeductionDays: number;
  otHours: number;
  otAmount: number;
  incentives: number;
  reimbursements: number;
  loanEmiDeduction: number;
  grossEarnings: number;
  employeeDeductions: number;
  employerContributions: number;
  epfAmount: number;
  epfEmployeeAmount: number;
  epfEmployerAmount: number;
  esiAmount: number;
  esiEmployeeAmount: number;
  esiEmployerAmount: number;
  professionalTaxAmount: number;
  tdsAmount: number;
  lwfAmount: number;
  lwfEmployeeAmount: number;
  lwfEmployerAmount: number;
  netPay: number;
  status: "READY" | "REVIEW";
  issues: string[];
};

export type PayrollBatchSummary = {
  id: string;
  month: string;
  type: string;
  status: string;
  totalAmount: number;
  journalVoucherNo: string | null;
  journalEntryId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PayrollWorkspaceData = {
  period: {
    key: string;
    label: string;
    start: string;
    end: string;
    daysInMonth: number;
  };
  summary: {
    employeesInPayroll: number;
    readyEmployees: number;
    reviewEmployees: number;
    grossPayroll: number;
    employeeDeductions: number;
    employerContributions: number;
    netPayroll: number;
    overtimeAmount: number;
    lopImpact: number;
    incentives: number;
    reimbursements: number;
    loanEmiDeductions: number;
    complianceLiability: number;
    epfLiability: number;
    epfEmployeeLiability: number;
    epfEmployerLiability: number;
    esiLiability: number;
    esiEmployeeLiability: number;
    esiEmployerLiability: number;
    professionalTaxLiability: number;
    tdsLiability: number;
    lwfLiability: number;
    lwfEmployeeLiability: number;
    lwfEmployerLiability: number;
  };
  issues: Array<{
    employeeId: string;
    employeeName: string;
    issues: string[];
  }>;
  rows: PayrollEmployeeRow[];
  hasApprovedBatch: boolean;
  hasPostedBatch: boolean;
  existingBatch: PayrollBatchSummary | null;
  settingsConfigured: boolean;
};

function startOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function formatMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function daysBetweenInclusive(start: Date, end: Date) {
  const startUtc = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
  );
  const endUtc = Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate(),
  );
  return Math.max(0, Math.floor((endUtc - startUtc) / 86400000) + 1);
}

function clamp(value: number, min = 0, max = Number.POSITIVE_INFINITY) {
  return Math.min(Math.max(value, min), max);
}

function asNumber(value: unknown) {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === "object" && "toString" in (value as Record<string, unknown>)) {
    const parsed = Number(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function normalizePayrollMeta(raw: unknown): PayrollMeta {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as PayrollMeta;
}

export function deriveGrossMonthly(
  employmentRecord: {
    ctc: number | null;
    basic: number | null;
    hra: number | null;
    conveyance: number | null;
    transport: number | null;
    travelling: number | null;
    fixedAllowance: number | null;
    stipend: number | null;
    payrollMeta: Prisma.JsonValue | null;
  } | null,
) {
  if (!employmentRecord) return 0;
  const payrollMeta = normalizePayrollMeta(employmentRecord.payrollMeta);
  const metaGross = asNumber(payrollMeta.monthlyGross);
  if (metaGross > 0) return metaGross;

  const componentGross =
    asNumber(employmentRecord.basic) +
    asNumber(employmentRecord.hra) +
    asNumber(employmentRecord.conveyance) +
    asNumber(employmentRecord.transport) +
    asNumber(employmentRecord.travelling) +
    asNumber(employmentRecord.fixedAllowance) +
    asNumber(employmentRecord.stipend);
  if (componentGross > 0) return componentGross;

  return employmentRecord.ctc ? roundMoney(employmentRecord.ctc / 12) : 0;
}

function deriveMonthlyBreakup(
  employmentRecord: {
    basic: number | null;
    payrollMeta: Prisma.JsonValue | null;
  } | null,
  grossMonthly: number,
  epfConfig: {
    enabled: boolean;
    employeeContributionPercent: number;
    employerContributionPercent: number;
    restrictToWageCeiling: boolean;
    wageCeiling: number;
  },
  esiConfig: {
    enabled: boolean;
    employeeContributionPercent: number;
    employerContributionPercent: number;
    wageCeiling: number;
  },
  // Resolved by the caller from PayrollStatutoryPtSlab/LwfConfig against the
  // employee's branch jurisdictionState — a pure lookup, not something this
  // function needs to know how to do.
  ptAutoAmount: number,
  lwfAuto: { employee: number; employer: number },
) {
  const payrollMeta = normalizePayrollMeta(employmentRecord?.payrollMeta);
  const breakup = payrollMeta.breakup ?? {};
  const basic = asNumber(employmentRecord?.basic);
  const epfWage = epfConfig.restrictToWageCeiling ? Math.min(basic, epfConfig.wageCeiling) : basic;
  const employeePf =
    asNumber(breakup.employeePF) ||
    (epfConfig.enabled && basic > 0
      ? roundMoney(epfWage * (epfConfig.employeeContributionPercent / 100))
      : 0);
  const employerPf =
    asNumber(breakup.employerPF) ||
    (epfConfig.enabled && basic > 0
      ? roundMoney(epfWage * (epfConfig.employerContributionPercent / 100))
      : 0);
  // ESI applicability is a hard cutoff on gross wages (unlike EPF's wage-base
  // cap): once gross exceeds the ceiling the employee is not ESI-applicable
  // at all for the period, not just capped.
  const esiApplicable = esiConfig.enabled && grossMonthly > 0 && grossMonthly <= esiConfig.wageCeiling;
  const esi =
    asNumber(breakup.esi) ||
    (esiApplicable ? roundMoney(grossMonthly * (esiConfig.employeeContributionPercent / 100)) : 0);
  const esiEmployer =
    asNumber(breakup.esiEmployer) ||
    (esiApplicable ? roundMoney(grossMonthly * (esiConfig.employerContributionPercent / 100)) : 0);
  const professionalTax = asNumber(breakup.professionalTax) || ptAutoAmount;
  const tax = asNumber(breakup.tax);
  const gratuity =
    asNumber(breakup.gratuity) || (basic > 0 ? roundMoney(basic * 0.0481) : 0);
  const insurancePremium = asNumber(breakup.insurancePremium);
  const paymentMode = payrollMeta.paymentMode ?? null;
  const lwfEmployee = lwfAuto.employee;
  const lwfEmployer = lwfAuto.employer;

  return {
    paymentMode,
    employeePf,
    employerPf,
    esi,
    esiEmployer,
    professionalTax,
    lwfEmployee,
    lwfEmployer,
    tax,
    gratuity,
    insurancePremium,
    grossMonthly,
  };
}

function calculatePartialPayDeductionDays(
  records: Array<{ slabBreakdown: Prisma.JsonValue }>,
) {
  return roundMoney(
    records.reduce((sum, record) => {
      const slabs = Array.isArray(record.slabBreakdown) ? record.slabBreakdown : [];
      const current = slabs.reduce<number>((innerSum, slab) => {
        if (!slab || typeof slab !== "object") return innerSum;
        const payPercentage = asNumber((slab as Record<string, unknown>).payPercentage);
        const units = asNumber((slab as Record<string, unknown>).units);
        return innerSum + units * (1 - payPercentage / 100);
      }, 0);
      return sum + current;
    }, 0),
  );
}

export function calculatePayrollEmployeeRow(input: {
  employeeId: string;
  employeeNumber: string | null;
  employeeName: string;
  designation: string | null;
  departmentName: string | null;
  branchName: string | null;
  paymentMode: string | null;
  employmentDays: number;
  presentDays: number;
  holidayDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  manualLopDays: number;
  partialPayDeductionDays: number;
  otHours: number;
  otAmount: number;
  incentives: number;
  reimbursements: number;
  loanEmiDeduction?: number;
  grossMonthly: number;
  employeePf: number;
  employerPf: number;
  esi: number;
  esiEmployer: number;
  professionalTax: number;
  tax: number;
  gratuity: number;
  insurancePremium: number;
  lwfEmployee?: number;
  lwfEmployer?: number;
  hasBankAccount?: boolean;
}) {
  const issues: string[] = [];
  if (input.grossMonthly <= 0) issues.push("Missing monthly gross salary");
  if (input.paymentMode == null || input.paymentMode.trim() === "") {
    issues.push("Payment mode is not configured");
  }
  if (input.employmentDays <= 0) issues.push("Employee is outside the selected payroll period");
  if (input.paymentMode?.trim().toLowerCase() === "direct deposit" && !input.hasBankAccount) {
    issues.push("Bank account is not on file for direct deposit");
  }

  const nonPayableDays = roundMoney(
    input.unpaidLeaveDays + input.manualLopDays + input.partialPayDeductionDays,
  );
  const payableDays = clamp(
    roundMoney(input.employmentDays - nonPayableDays),
    0,
    input.employmentDays,
  );
  const payableRatio =
    input.employmentDays > 0 ? payableDays / input.employmentDays : 0;
  const proratedGross = roundMoney(input.grossMonthly * payableRatio);
  const grossEarnings = roundMoney(proratedGross + input.otAmount + input.incentives);
  // LWF is a flat statutory amount, not prorated by days worked (same
  // treatment as insurancePremium below) — real LWF cycles don't prorate
  // for partial months.
  const lwfEmployee = grossEarnings > 0 ? asNumber(input.lwfEmployee) : 0;
  const lwfEmployer = grossEarnings > 0 ? asNumber(input.lwfEmployer) : 0;
  const employeeDeductions = roundMoney(
    input.employeePf * payableRatio +
      input.esi * payableRatio +
      input.tax * payableRatio +
      (grossEarnings > 0 ? input.professionalTax : 0) +
      lwfEmployee,
  );
  const employerContributions = roundMoney(
    input.employerPf * payableRatio +
      input.esiEmployer * payableRatio +
      input.gratuity * payableRatio +
      input.insurancePremium +
      lwfEmployer,
  );
  // Loan EMI is a further non-statutory deduction (recovery of an employee
  // loan receivable). Capped at what's left after statutory deductions so a
  // low earner's EMI never drives net pay negative — the recovered amount
  // is what's actually reflected here, not the nominal EMI.
  const loanEmiDeduction = roundMoney(
    clamp(input.loanEmiDeduction ?? 0, 0, Math.max(0, grossEarnings - employeeDeductions)),
  );
  // Reimbursements are non-taxable and added after deductions, matching the
  // captured payslip formula "Net Pay (Earnings - Deductions + Reimbursements)".
  const netPay = roundMoney(
    Math.max(0, grossEarnings - employeeDeductions - loanEmiDeduction) + input.reimbursements,
  );
  const epfAmount = roundMoney((input.employeePf + input.employerPf) * payableRatio);
  const epfEmployeeAmount = roundMoney(input.employeePf * payableRatio);
  const epfEmployerAmount = roundMoney(input.employerPf * payableRatio);
  const esiAmount = roundMoney((input.esi + input.esiEmployer) * payableRatio);
  const esiEmployeeAmount = roundMoney(input.esi * payableRatio);
  const esiEmployerAmount = roundMoney(input.esiEmployer * payableRatio);
  const professionalTaxAmount = roundMoney(grossEarnings > 0 ? input.professionalTax : 0);
  const tdsAmount = roundMoney(input.tax * payableRatio);
  const lwfAmount = roundMoney(lwfEmployee + lwfEmployer);
  const lwfEmployeeAmount = roundMoney(lwfEmployee);
  const lwfEmployerAmount = roundMoney(lwfEmployer);

  return {
    employeeId: input.employeeId,
    employeeNumber: input.employeeNumber?.trim() || "-",
    employeeName: input.employeeName,
    designation: input.designation,
    departmentName: input.departmentName,
    branchName: input.branchName,
    paymentMode: input.paymentMode,
    grossMonthly: roundMoney(input.grossMonthly),
    employmentDays: input.employmentDays,
    payableDays,
    presentDays: input.presentDays,
    holidayDays: input.holidayDays,
    paidLeaveDays: roundMoney(input.paidLeaveDays),
    unpaidLeaveDays: roundMoney(input.unpaidLeaveDays),
    manualLopDays: roundMoney(input.manualLopDays),
    partialPayDeductionDays: roundMoney(input.partialPayDeductionDays),
    otHours: roundMoney(input.otHours),
    otAmount: roundMoney(input.otAmount),
    incentives: roundMoney(input.incentives),
    reimbursements: roundMoney(input.reimbursements),
    loanEmiDeduction,
    grossEarnings,
    employeeDeductions,
    employerContributions,
    epfAmount,
    epfEmployeeAmount,
    epfEmployerAmount,
    esiAmount,
    esiEmployeeAmount,
    esiEmployerAmount,
    professionalTaxAmount,
    tdsAmount,
    lwfAmount,
    lwfEmployeeAmount,
    lwfEmployerAmount,
    netPay,
    status: issues.length > 0 ? "REVIEW" : "READY",
    issues,
  } satisfies PayrollEmployeeRow;
}

function buildPayrollRunLines(
  settings: {
    defaultSalaryExpenseAccountId: string | null;
    defaultSalaryPayableAccountId: string | null;
    // Phase 32: optional statutory payable accounts, all falling back to
    // defaultSalaryPayableAccountId when unset. EPF/ESI post as combined
    // employee+employer liability lines (workspace tracks the split so the
    // remaining generic buckets below can be reduced by exactly those
    // amounts and the run still balances).
    tdsPayableAccountId?: string | null;
    professionalTaxPayableAccountId?: string | null;
    epfPayableAccountId?: string | null;
    esiPayableAccountId?: string | null;
    employeeLoanReceivableAccountId?: string | null;
    lwfPayableAccountId?: string | null;
  },
  workspace: PayrollWorkspaceData,
) {
  const expenseAccountId = settings.defaultSalaryExpenseAccountId;
  const payableAccountId = settings.defaultSalaryPayableAccountId;
  if (!expenseAccountId || !payableAccountId) {
    throw new Error(
      "Accounting defaults are incomplete. Configure salary expense and salary payable accounts first.",
    );
  }

  const lines: Array<{
    employeeId?: string | null;
    componentCode: string;
    accountId: string;
    debit: string;
    credit: string;
  }> = [];

  if (workspace.summary.grossPayroll > 0) {
    lines.push({
      componentCode: "GROSS_EARNINGS",
      accountId: expenseAccountId,
      debit: workspace.summary.grossPayroll.toFixed(2),
      credit: "0.00",
    });
  }
  if (workspace.summary.employerContributions > 0) {
    lines.push({
      componentCode: "EMPLOYER_CONTRIBUTIONS",
      accountId: expenseAccountId,
      debit: workspace.summary.employerContributions.toFixed(2),
      credit: "0.00",
    });
  }
  if (workspace.summary.reimbursements > 0) {
    // Reimbursements are added to net pay after deductions (non-taxable) but
    // are still a real expense — without this line the run would post
    // unbalanced by exactly the reimbursement total.
    lines.push({
      componentCode: "REIMBURSEMENTS",
      accountId: expenseAccountId,
      debit: workspace.summary.reimbursements.toFixed(2),
      credit: "0.00",
    });
  }
  if (workspace.summary.netPayroll > 0) {
    lines.push({
      componentCode: "NET_PAYABLE",
      accountId: payableAccountId,
      debit: "0.00",
      credit: workspace.summary.netPayroll.toFixed(2),
    });
  }
  if (workspace.summary.loanEmiDeductions > 0) {
    // Net payable above already reflects the EMI subtraction, so this line
    // rebalances the run: the cash the employee didn't receive is recovery
    // of the Employee Loan Receivable asset, not a new expense or payable.
    const loanReceivableAccountId = settings.employeeLoanReceivableAccountId || payableAccountId;
    lines.push({
      componentCode: "LOAN_EMI_RECOVERY",
      accountId: loanReceivableAccountId,
      debit: "0.00",
      credit: workspace.summary.loanEmiDeductions.toFixed(2),
    });
  }
  const tdsAccountId = settings.tdsPayableAccountId || payableAccountId;
  const ptAccountId = settings.professionalTaxPayableAccountId || payableAccountId;
  const epfAccountId = settings.epfPayableAccountId || payableAccountId;
  const esiAccountId = settings.esiPayableAccountId || payableAccountId;

  // EPF and ESI post as their own combined (employee + employer) liability
  // lines against their dedicated payable accounts — matching standard
  // Indian payroll practice of one PF/ESI payable per scheme, not split by
  // contributor. What's left in the generic employee/employer buckets below
  // is only what isn't itemized elsewhere (TDS, PT, EPF, ESI).
  if (workspace.summary.epfLiability > 0) {
    lines.push({
      componentCode: "EPF_PAYABLE",
      accountId: epfAccountId,
      debit: "0.00",
      credit: workspace.summary.epfLiability.toFixed(2),
    });
  }
  if (workspace.summary.esiLiability > 0) {
    lines.push({
      componentCode: "ESI_PAYABLE",
      accountId: esiAccountId,
      debit: "0.00",
      credit: workspace.summary.esiLiability.toFixed(2),
    });
  }
  const lwfAccountId = settings.lwfPayableAccountId || payableAccountId;
  if (workspace.summary.lwfLiability > 0) {
    lines.push({
      componentCode: "LWF_PAYABLE",
      accountId: lwfAccountId,
      debit: "0.00",
      credit: workspace.summary.lwfLiability.toFixed(2),
    });
  }

  const remainingEmployeeDeductions = roundMoney(
    workspace.summary.employeeDeductions -
      workspace.summary.tdsLiability -
      workspace.summary.professionalTaxLiability -
      workspace.summary.epfEmployeeLiability -
      workspace.summary.esiEmployeeLiability -
      workspace.summary.lwfEmployeeLiability,
  );
  if (remainingEmployeeDeductions > 0) {
    lines.push({
      componentCode: "EMPLOYEE_DEDUCTIONS",
      accountId: payableAccountId,
      debit: "0.00",
      credit: remainingEmployeeDeductions.toFixed(2),
    });
  }
  if (workspace.summary.tdsLiability > 0) {
    lines.push({
      componentCode: "TDS_PAYABLE",
      accountId: tdsAccountId,
      debit: "0.00",
      credit: workspace.summary.tdsLiability.toFixed(2),
    });
  }
  if (workspace.summary.professionalTaxLiability > 0) {
    lines.push({
      componentCode: "PT_PAYABLE",
      accountId: ptAccountId,
      debit: "0.00",
      credit: workspace.summary.professionalTaxLiability.toFixed(2),
    });
  }
  const remainingEmployerStatutory = roundMoney(
    workspace.summary.employerContributions -
      workspace.summary.epfEmployerLiability -
      workspace.summary.esiEmployerLiability -
      workspace.summary.lwfEmployerLiability,
  );
  if (remainingEmployerStatutory > 0) {
    lines.push({
      componentCode: "EMPLOYER_STATUTORY_PAYABLE",
      accountId: payableAccountId,
      debit: "0.00",
      credit: remainingEmployerStatutory.toFixed(2),
    });
  }

  return lines;
}

// Deterministic given current DB state; reused by getPayrollWorkspaceData
// (to size netPay) and approvePayrollRun (to record the same deductions as
// PAYROLL_DEDUCTION repayments once the run is accepted).
async function computeLoanEmiDeductions(orgId: string, monthStart: Date, monthEnd: Date) {
  const loans = await db.payrollLoan.findMany({
    where: { orgId, status: "OPEN" },
    include: { repayments: true },
  });
  const perLoan: Array<{ loanId: string; employeeId: string; amount: number; willCloseLoan: boolean }> = [];
  const byEmployee = new Map<string, number>();
  for (const loan of loans) {
    const alreadyRepaid = loan.repayments.reduce((sum, r) => sum + asNumber(r.amount), 0);
    const outstanding = roundMoney(loan.principalAmount - alreadyRepaid);
    if (outstanding <= 0) continue;
    const alreadyDeductedThisPeriod = loan.repayments.some(
      (r) => r.mode === "PAYROLL_DEDUCTION" && r.repaymentDate >= monthStart && r.repaymentDate <= monthEnd,
    );
    if (alreadyDeductedThisPeriod) continue;
    const amount = roundMoney(Math.min(loan.emiAmount, outstanding));
    if (amount <= 0) continue;
    perLoan.push({ loanId: loan.id, employeeId: loan.employeeId, amount, willCloseLoan: amount >= outstanding - 0.01 });
    byEmployee.set(loan.employeeId, roundMoney((byEmployee.get(loan.employeeId) ?? 0) + amount));
  }
  return { perLoan, byEmployee };
}

export async function getPayrollWorkspaceData(orgId: string, monthDate: Date) {
  const monthStart = startOfUtcMonth(monthDate);
  const monthEnd = endOfUtcMonth(monthDate);
  const [
    users,
    holidays,
    leaveRequests,
    partialPayRecords,
    incentives,
    batches,
    reimbursementClaims,
    settings,
    otSummary,
    epfConfigRow,
    esiConfigRow,
    ptSlabs,
    lwfConfigs,
    loanEmi,
  ] = await Promise.all([
      db.user.findMany({
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
          designation: true,
          active: true,
          bankAccount: true,
          branch: { select: { id: true, name: true, jurisdictionState: true } },
          department: { select: { name: true } },
          employmentRecord: {
            select: {
              joinDate: true,
              exitDate: true,
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
          punches: {
            where: { date: { gte: monthStart, lte: monthEnd } },
            select: { date: true, status: true },
          },
          lopRecords: {
            where: { payrollMonth: monthStart },
            select: { lopDays: true },
          },
        },
      }),
      db.holiday.findMany({
        where: {
          orgId,
          date: { gte: monthStart, lte: monthEnd },
        },
        select: { date: true, branchId: true },
      }),
      db.leaveRequest.findMany({
        where: {
          user: { orgId },
          status: { in: ["approved", "APPROVED"] },
          fromDate: { lte: monthEnd },
          toDate: { gte: monthStart },
        },
        select: {
          userId: true,
          leaveType: { select: { paid: true } },
          paidUnits: true,
          lopUnits: true,
          partialPaidUnits: true,
        },
      }),
      db.leavePartialPayRecord.findMany({
        where: {
          orgId,
          payrollMonth: monthStart,
        },
        select: {
          userId: true,
          slabBreakdown: true,
        },
      }),
      db.incentiveEntry.findMany({
        where: {
          orgId,
          eligibleDate: { gte: monthStart, lte: monthEnd },
          status: { in: ["APPROVED", "PAID"] },
        },
        select: {
          employeeId: true,
          amount: true,
        },
      }),
      db.payrollBatch.findMany({
        where: { orgId, month: monthStart, type: "REGULAR" },
        include: { journalEntry: { select: { id: true, voucherNo: true } } },
      }),
      db.fuelReimbursementClaim.findMany({
        where: { orgId, status: "APPROVED" },
        select: { id: true, userId: true, amount: true },
      }),
      db.accountingSettings.findUnique({
        where: { orgId },
        select: {
          defaultSalaryExpenseAccountId: true,
          defaultSalaryPayableAccountId: true,
          defaultBankAccountId: true,
        },
      }),
      generatePayrollSummary(orgId, monthStart),
      db.payrollStatutoryEpfConfig.findUnique({ where: { orgId } }),
      db.payrollStatutoryEsiConfig.findUnique({ where: { orgId } }),
      db.payrollStatutoryPtSlab.findMany({ where: { orgId } }),
      db.payrollStatutoryLwfConfig.findMany({ where: { orgId, enabled: true } }),
      computeLoanEmiDeductions(orgId, monthStart, monthEnd),
    ]);

  const epfConfig = {
    enabled: epfConfigRow?.enabled ?? true,
    employeeContributionPercent: epfConfigRow?.employeeContributionPercent ?? 12,
    employerContributionPercent: epfConfigRow?.employerContributionPercent ?? 12,
    restrictToWageCeiling: epfConfigRow?.restrictToWageCeiling ?? true,
    wageCeiling: epfConfigRow?.wageCeiling ?? 15000,
  };
  const esiConfig = {
    enabled: esiConfigRow?.enabled ?? false,
    employeeContributionPercent: esiConfigRow?.employeeContributionPercent ?? 0.75,
    employerContributionPercent: esiConfigRow?.employerContributionPercent ?? 3.25,
    wageCeiling: esiConfigRow?.wageCeiling ?? 21000,
  };

  const ptSlabsByState = new Map<string, typeof ptSlabs>();
  for (const slab of ptSlabs) {
    const list = ptSlabsByState.get(slab.state) ?? [];
    list.push(slab);
    ptSlabsByState.set(slab.state, list);
  }
  function resolvePtAmount(state: string | null | undefined, grossMonthly: number) {
    if (!state || grossMonthly <= 0) return 0;
    const slabs = ptSlabsByState.get(state);
    if (!slabs) return 0;
    const match = slabs.find(
      (s) => grossMonthly >= s.minGross && (s.maxGross == null || grossMonthly < s.maxGross),
    );
    return match ? match.monthlyAmount : 0;
  }
  const lwfByState = new Map(lwfConfigs.map((c) => [c.state, c]));
  function resolveLwfAmounts(state: string | null | undefined) {
    if (!state) return { employee: 0, employer: 0 };
    const config = lwfByState.get(state);
    if (!config) return { employee: 0, employer: 0 };
    return { employee: config.employeeAmount, employer: config.employerAmount };
  }

  const leaveByUser = new Map<
    string,
    { paidLeaveDays: number; unpaidLeaveDays: number }
  >();
  for (const request of leaveRequests) {
    const current = leaveByUser.get(request.userId) ?? {
      paidLeaveDays: 0,
      unpaidLeaveDays: 0,
    };
    current.paidLeaveDays += asNumber(request.paidUnits);
    current.unpaidLeaveDays += asNumber(request.lopUnits);
    leaveByUser.set(request.userId, current);
  }

  const partialPayByUser = new Map<string, Array<{ slabBreakdown: Prisma.JsonValue }>>();
  for (const record of partialPayRecords) {
    const existing = partialPayByUser.get(record.userId) ?? [];
    existing.push(record);
    partialPayByUser.set(record.userId, existing);
  }

  const incentiveByUser = new Map<string, number>();
  for (const incentive of incentives) {
    incentiveByUser.set(
      incentive.employeeId,
      roundMoney((incentiveByUser.get(incentive.employeeId) ?? 0) + asNumber(incentive.amount)),
    );
  }

  const reimbursementByUser = new Map<string, number>();
  for (const claim of reimbursementClaims) {
    reimbursementByUser.set(
      claim.userId,
      roundMoney((reimbursementByUser.get(claim.userId) ?? 0) + asNumber(claim.amount)),
    );
  }

  const otByUser = new Map(otSummary.map((row) => [row.employeeId, row]));

  const rows = users
    .map((user) => {
      const employmentRecord = user.employmentRecord;
      if (!employmentRecord) return null;

      const effectiveStart =
        employmentRecord.joinDate > monthStart ? employmentRecord.joinDate : monthStart;
      const effectiveEnd =
        employmentRecord.exitDate && employmentRecord.exitDate < monthEnd
          ? employmentRecord.exitDate
          : monthEnd;
      const employmentDays =
        effectiveStart <= effectiveEnd
          ? daysBetweenInclusive(effectiveStart, effectiveEnd)
          : 0;

      const userHolidays = holidays.filter((holiday) => {
        if (holiday.branchId && holiday.branchId !== user.branch?.id) return false;
        return holiday.date >= effectiveStart && holiday.date <= effectiveEnd;
      }).length;

      const presentDays = user.punches.filter((punch) => {
        const normalizedStatus = (punch.status ?? "PRESENT").toUpperCase();
        return normalizedStatus !== "ABSENT";
      }).length;

      const leave = leaveByUser.get(user.id) ?? {
        paidLeaveDays: 0,
        unpaidLeaveDays: 0,
      };
      const manualLopDays = roundMoney(
        user.lopRecords.reduce((sum, record) => sum + asNumber(record.lopDays), 0),
      );
      const partialPayDeductionDays = calculatePartialPayDeductionDays(
        partialPayByUser.get(user.id) ?? [],
      );
      const ot = otByUser.get(user.id);
      const grossMonthly = deriveGrossMonthly(employmentRecord);
      if (grossMonthly <= 0) return null;
      const ptAutoAmount = resolvePtAmount(user.branch?.jurisdictionState, grossMonthly);
      const lwfAuto = resolveLwfAmounts(user.branch?.jurisdictionState);
      const breakup = deriveMonthlyBreakup(employmentRecord, grossMonthly, epfConfig, esiConfig, ptAutoAmount, lwfAuto);

      return calculatePayrollEmployeeRow({
        employeeId: user.id,
        employeeNumber: user.employeeNumber ? String(user.employeeNumber) : null,
        employeeName: user.name,
        designation: user.designation,
        departmentName: user.department?.name ?? null,
        branchName: user.branch?.name ?? null,
        paymentMode: breakup.paymentMode,
        employmentDays,
        presentDays,
        holidayDays: userHolidays,
        paidLeaveDays: leave.paidLeaveDays,
        unpaidLeaveDays: leave.unpaidLeaveDays,
        manualLopDays,
        partialPayDeductionDays,
        otHours: ot?.totalOtHours ?? 0,
        otAmount: ot?.totalOtAmount ?? 0,
        incentives: incentiveByUser.get(user.id) ?? 0,
        reimbursements: reimbursementByUser.get(user.id) ?? 0,
        loanEmiDeduction: loanEmi.byEmployee.get(user.id) ?? 0,
        grossMonthly,
        employeePf: breakup.employeePf,
        employerPf: breakup.employerPf,
        esi: breakup.esi,
        esiEmployer: breakup.esiEmployer,
        professionalTax: breakup.professionalTax,
        tax: breakup.tax,
        gratuity: breakup.gratuity,
        insurancePremium: breakup.insurancePremium,
        lwfEmployee: breakup.lwfEmployee,
        lwfEmployer: breakup.lwfEmployer,
        hasBankAccount: Boolean(user.bankAccount),
      });
    })
    .filter((row): row is PayrollEmployeeRow => row !== null)
    .sort((left, right) => left.employeeName.localeCompare(right.employeeName));

  const existingBatchRecord = batches[0] ?? null;
  const existingBatch =
    existingBatchRecord == null
      ? null
      : {
          id: existingBatchRecord.id,
          month: existingBatchRecord.month.toISOString(),
          type: existingBatchRecord.type,
          status: existingBatchRecord.status,
          totalAmount: asNumber(existingBatchRecord.totalAmount),
          journalVoucherNo: existingBatchRecord.journalEntry?.voucherNo ?? null,
          journalEntryId: existingBatchRecord.journalEntry?.id ?? null,
          createdAt: existingBatchRecord.createdAt.toISOString(),
          updatedAt: existingBatchRecord.updatedAt.toISOString(),
        };

  const summary = {
    employeesInPayroll: rows.length,
    readyEmployees: rows.filter((row) => row.status === "READY").length,
    reviewEmployees: rows.filter((row) => row.status === "REVIEW").length,
    grossPayroll: roundMoney(rows.reduce((sum, row) => sum + row.grossEarnings, 0)),
    employeeDeductions: roundMoney(
      rows.reduce((sum, row) => sum + row.employeeDeductions, 0),
    ),
    employerContributions: roundMoney(
      rows.reduce((sum, row) => sum + row.employerContributions, 0),
    ),
    netPayroll: roundMoney(rows.reduce((sum, row) => sum + row.netPay, 0)),
    overtimeAmount: roundMoney(rows.reduce((sum, row) => sum + row.otAmount, 0)),
    lopImpact: roundMoney(
      rows.reduce(
        (sum, row) =>
          sum + row.grossMonthly - (row.grossEarnings - row.otAmount - row.incentives),
        0,
      ),
    ),
    incentives: roundMoney(rows.reduce((sum, row) => sum + row.incentives, 0)),
    reimbursements: roundMoney(rows.reduce((sum, row) => sum + row.reimbursements, 0)),
    loanEmiDeductions: roundMoney(rows.reduce((sum, row) => sum + row.loanEmiDeduction, 0)),
    complianceLiability: roundMoney(
      rows.reduce(
        (sum, row) => sum + row.employeeDeductions + row.employerContributions,
        0,
      ),
    ),
    epfLiability: roundMoney(rows.reduce((sum, row) => sum + row.epfAmount, 0)),
    epfEmployeeLiability: roundMoney(rows.reduce((sum, row) => sum + row.epfEmployeeAmount, 0)),
    epfEmployerLiability: roundMoney(rows.reduce((sum, row) => sum + row.epfEmployerAmount, 0)),
    esiLiability: roundMoney(rows.reduce((sum, row) => sum + row.esiAmount, 0)),
    esiEmployeeLiability: roundMoney(rows.reduce((sum, row) => sum + row.esiEmployeeAmount, 0)),
    esiEmployerLiability: roundMoney(rows.reduce((sum, row) => sum + row.esiEmployerAmount, 0)),
    professionalTaxLiability: roundMoney(
      rows.reduce((sum, row) => sum + row.professionalTaxAmount, 0),
    ),
    tdsLiability: roundMoney(rows.reduce((sum, row) => sum + row.tdsAmount, 0)),
    lwfLiability: roundMoney(rows.reduce((sum, row) => sum + row.lwfAmount, 0)),
    lwfEmployeeLiability: roundMoney(rows.reduce((sum, row) => sum + row.lwfEmployeeAmount, 0)),
    lwfEmployerLiability: roundMoney(rows.reduce((sum, row) => sum + row.lwfEmployerAmount, 0)),
  };

  return {
    period: {
      key: formatMonthKey(monthStart),
      label: formatMonthLabel(monthStart),
      start: monthStart.toISOString(),
      end: monthEnd.toISOString(),
      daysInMonth: daysBetweenInclusive(monthStart, monthEnd),
    },
    summary,
    issues: rows
      .filter((row) => row.issues.length > 0)
      .map((row) => ({
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        issues: row.issues,
      })),
    rows,
    hasApprovedBatch: batches.some((batch) => batch.status === "APPROVED_HRMS"),
    hasPostedBatch: batches.some((batch) =>
      ["FINALIZED", "PAID", "POSTED"].includes(batch.status),
    ),
    existingBatch,
    settingsConfigured: Boolean(
      settings?.defaultSalaryExpenseAccountId &&
        settings?.defaultSalaryPayableAccountId &&
        settings?.defaultBankAccountId,
    ),
  } satisfies PayrollWorkspaceData;
}

export async function approvePayrollRun(orgId: string, actorId: string, monthIso: string) {
  const monthDate = new Date(monthIso);
  const monthStart = startOfUtcMonth(monthDate);
  const workspace = await getPayrollWorkspaceData(orgId, monthStart);
  if (workspace.rows.length === 0) {
    throw new Error("No payroll-eligible employees were found for this period.");
  }
  if (workspace.issues.length > 0) {
    throw new Error(
      "Resolve payroll review issues before approving this run. Employees with missing salary or payment data are still present.",
    );
  }
  if (workspace.existingBatch) {
    throw new Error(
      `A payroll batch already exists for ${workspace.period.label}. Use the existing batch or the payroll correction workflow.`,
    );
  }

  const settings = await db.accountingSettings.findUnique({
    where: { orgId },
    select: {
      defaultSalaryExpenseAccountId: true,
      defaultSalaryPayableAccountId: true,
      defaultBankAccountId: true,
      tdsPayableAccountId: true,
      professionalTaxPayableAccountId: true,
      epfPayableAccountId: true,
      esiPayableAccountId: true,
      employeeLoanReceivableAccountId: true,
      lwfPayableAccountId: true,
    },
  });
  if (
    !settings?.defaultSalaryExpenseAccountId ||
    !settings.defaultSalaryPayableAccountId ||
    !settings.defaultBankAccountId
  ) {
    throw new Error(
      "Accounting defaults are incomplete. Configure salary expense, salary payable, and bank accounts first.",
    );
  }

  const runVersion = 1;
  const runKey = workspace.period.key.replace("-", "");
  const lines = buildPayrollRunLines(settings, workspace);
  if (lines.length < 2) {
    throw new Error("Payroll totals are not sufficient to create an approved run.");
  }

  const result = await acceptApprovedPayrollRun({
    orgId,
    actorId,
    approvedById: actorId,
    approvedAt: new Date().toISOString(),
    correlationId: `hrms-payroll-${runKey}`,
    currencyCode: "INR",
    eventId: `hrms-payroll-${runKey}-approved-v${runVersion}`,
    lines,
    payPeriodStart: workspace.period.start,
    payPeriodEnd: workspace.period.end,
    runId: `HRMS-PAYROLL-${runKey}`,
    runVersion,
  });

  // Phase 23: approved reimbursement claims that were folded into this run's
  // net pay are marked PAID now so they can never be pulled into a later run.
  const paidEmployeeIds = workspace.rows.filter((row) => row.reimbursements > 0).map((row) => row.employeeId);
  if (paidEmployeeIds.length > 0) {
    await db.fuelReimbursementClaim.updateMany({
      where: { orgId, userId: { in: paidEmployeeIds }, status: "APPROVED" },
      data: { status: "PAID", paidAt: new Date(), paidById: actorId },
    });
  }

  // Loan EMIs folded into this run's net pay are recorded as
  // PAYROLL_DEDUCTION repayments now, using the same deterministic
  // computation the workspace used to size netPay, so the next run's
  // outstanding balances are already correct and this period's loans
  // can't be double-deducted.
  const loanEmi = await computeLoanEmiDeductions(orgId, monthStart, endOfUtcMonth(monthStart));
  if (loanEmi.perLoan.length > 0) {
    const repaymentDate = new Date(workspace.period.end);
    await db.$transaction([
      ...loanEmi.perLoan.map((entry) =>
        db.payrollLoanRepayment.create({
          data: {
            loanId: entry.loanId,
            amount: entry.amount,
            repaymentDate,
            mode: "PAYROLL_DEDUCTION",
            notes: `Auto-deducted from ${workspace.period.label} payroll run`,
          },
        }),
      ),
      ...loanEmi.perLoan
        .filter((entry) => entry.willCloseLoan)
        .map((entry) => db.payrollLoan.update({ where: { id: entry.loanId }, data: { status: "CLOSED" } })),
    ]);

    const closedLoans = loanEmi.perLoan.filter((entry) => entry.willCloseLoan);
    if (closedLoans.length > 0) {
      await Promise.all(
        closedLoans.map((entry) =>
          fireAutomation(orgId, "LOAN_FULLY_REPAID", {
            type: "LOAN",
            id: entry.loanId,
            employeeId: entry.employeeId,
            summary: "A loan has been fully repaid via payroll deduction.",
            link: `/payroll/employees/${entry.employeeId}/loans`,
          }),
        ),
      );
    }
  }

  return result;
}
