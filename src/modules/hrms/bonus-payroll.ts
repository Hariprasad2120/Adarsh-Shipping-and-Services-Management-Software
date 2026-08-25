import { db } from "@/lib/db";
import { acceptApprovedPayrollRun } from "@/modules/accounting/integration-adapters";
import { deriveGrossMonthly } from "./payroll";

// Statutory Bonus (Payment of Bonus Act, 1965 — central law). Paid as an
// annual off-cycle batch, reusing the same GL-posting boundary as regular/
// off-cycle/termination runs (acceptApprovedPayrollRun, payrollType:
// "BONUS") so there is still only one posting path.
//
// v1 simplification, same class as off-cycle's documented one: uses each
// employee's CURRENT basic/gross rather than a month-by-month history, and
// counts months employed within the fiscal year from join/exit dates —
// it does not re-check eligibility gross for each past month individually.
// Real-world bonus computation also has state minimum-wage floors on the
// calculation wage this doesn't model; admins can adjust the preview before
// confirming.

function fiscalYearBounds(fiscalYear: string) {
  const match = fiscalYear.match(/^(\d{4})-(\d{2})$/);
  if (!match) throw new Error("Fiscal year must look like \"2026-27\"");
  const startYear = Number(match[1]);
  const start = new Date(Date.UTC(startYear, 3, 1)); // April 1
  const end = new Date(Date.UTC(startYear + 1, 2, 31)); // March 31
  return { start, end };
}

function monthsEmployedInRange(joinDate: Date, exitDate: Date | null, rangeStart: Date, rangeEnd: Date) {
  const effectiveStart = joinDate > rangeStart ? joinDate : rangeStart;
  const effectiveEnd = exitDate && exitDate < rangeEnd ? exitDate : rangeEnd;
  if (effectiveStart > effectiveEnd) return 0;
  const months =
    (effectiveEnd.getUTCFullYear() - effectiveStart.getUTCFullYear()) * 12 +
    (effectiveEnd.getUTCMonth() - effectiveStart.getUTCMonth()) +
    1;
  return Math.max(0, Math.min(12, months));
}

export type BonusPreviewEntry = {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  monthsEmployed: number;
  calculationWage: number;
  bonusAmount: number;
};

export async function computeStatutoryBonusPreview(orgId: string, fiscalYear: string): Promise<BonusPreviewEntry[]> {
  const config = await db.payrollStatutoryBonusConfig.findUnique({ where: { orgId } });
  if (!config?.enabled) return [];

  const { start, end } = fiscalYearBounds(fiscalYear);
  const employees = await db.user.findMany({
    where: {
      orgId,
      active: true,
      employmentRecord: { is: { joinDate: { lte: end }, OR: [{ exitDate: null }, { exitDate: { gte: start } }] } },
    },
    select: {
      id: true,
      name: true,
      employeeNumber: true,
      employmentRecord: {
        select: { joinDate: true, exitDate: true, basic: true, ctc: true, hra: true, conveyance: true, transport: true, travelling: true, fixedAllowance: true, stipend: true, payrollMeta: true },
      },
    },
  });

  const entries: BonusPreviewEntry[] = [];
  for (const employee of employees) {
    const record = employee.employmentRecord;
    if (!record) continue;
    const grossMonthly = deriveGrossMonthly(record);
    if (grossMonthly <= 0 || grossMonthly > config.eligibilityWageCeiling) continue;

    const monthsEmployed = monthsEmployedInRange(record.joinDate, record.exitDate, start, end);
    if (monthsEmployed <= 0) continue;

    const basic = record.basic ?? 0;
    const calculationWage = Math.min(basic > 0 ? basic : grossMonthly, config.calculationWageCeiling);
    const bonusAmount = Number((calculationWage * monthsEmployed * (config.percent / 100)).toFixed(2));
    if (bonusAmount <= 0) continue;

    entries.push({
      employeeId: employee.id,
      employeeName: employee.name,
      employeeNumber: employee.employeeNumber == null ? "-" : String(employee.employeeNumber),
      monthsEmployed,
      calculationWage,
      bonusAmount,
    });
  }

  return entries.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}

export async function listBonusPayrollBatches(orgId: string) {
  return db.payrollBatch.findMany({
    where: { orgId, type: "BONUS" },
    include: { journalEntry: { select: { id: true, voucherNo: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createStatutoryBonusPayrollRun(
  orgId: string,
  actorId: string,
  input: { fiscalYear: string; payDate: string; entries: Array<{ employeeId: string; amount: number }> },
) {
  if (input.entries.length === 0) {
    throw new Error("No eligible employees to include in this bonus run.");
  }
  const payDate = new Date(input.payDate);
  if (Number.isNaN(payDate.getTime())) throw new Error("Invalid pay date");

  const employeeIds = input.entries.map((e) => e.employeeId);
  const employees = await db.user.findMany({ where: { id: { in: employeeIds }, orgId }, select: { id: true } });
  const validIds = new Set(employees.map((e) => e.id));
  for (const entry of input.entries) {
    if (!validIds.has(entry.employeeId)) throw new Error("One or more employees do not belong to this organisation.");
    if (!(entry.amount > 0)) throw new Error("Every bonus amount must be greater than zero.");
  }

  const settings = await db.accountingSettings.findUnique({
    where: { orgId },
    select: { defaultSalaryExpenseAccountId: true, defaultSalaryPayableAccountId: true, bonusPayableAccountId: true },
  });
  if (!settings?.defaultSalaryExpenseAccountId || !settings.defaultSalaryPayableAccountId) {
    throw new Error("Accounting defaults are incomplete. Configure salary expense and salary payable accounts first.");
  }

  const total = input.entries.reduce((sum, e) => sum + e.amount, 0);
  const runKey = `${input.fiscalYear}-${Date.now()}`;
  const payableAccountId = settings.bonusPayableAccountId || settings.defaultSalaryPayableAccountId;

  const lines = [
    {
      componentCode: "STATUTORY_BONUS_EXPENSE",
      accountId: settings.defaultSalaryExpenseAccountId,
      debit: total.toFixed(2),
      credit: "0.00",
    },
    {
      componentCode: "STATUTORY_BONUS_PAYABLE",
      accountId: payableAccountId,
      debit: "0.00",
      credit: total.toFixed(2),
    },
  ];

  return acceptApprovedPayrollRun({
    orgId,
    actorId,
    approvedById: actorId,
    approvedAt: new Date().toISOString(),
    correlationId: `hrms-payroll-bonus-${runKey}`,
    currencyCode: "INR",
    eventId: `hrms-payroll-bonus-${runKey}-approved-v1`,
    lines,
    payPeriodStart: payDate,
    payPeriodEnd: payDate,
    runId: `HRMS-PAYROLL-BONUS-${runKey}`,
    runVersion: 1,
    payrollType: "BONUS",
  });
}
