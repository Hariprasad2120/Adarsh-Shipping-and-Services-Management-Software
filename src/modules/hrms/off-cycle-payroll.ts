import { db } from "@/lib/db";
import { acceptApprovedPayrollRun } from "@/modules/accounting/integration-adapters";

// Phase 20: off-cycle payroll — special one-time payments (bonus, arrear,
// correction, special payment) processed outside the regular monthly cycle.
// Reuses the same Accounting posting boundary as the regular run
// (acceptApprovedPayrollRun) with payrollType: "OFF_CYCLE" so there is only
// one GL-posting path (docs/payroll/MONOLITH_PAYROLL_INTEGRATION_MAP.md).
//
// v1 simplification: off-cycle amounts are posted gross = net (no statutory
// deduction/component breakdown applied). This is a real, intentional
// limitation — statutory treatment of off-cycle payments is Phase 26 work.
export type OffCycleEntryInput = {
  employeeId: string;
  amount: number;
  componentLabel: string;
};

export async function listOffCyclePayrollBatches(orgId: string) {
  return db.payrollBatch.findMany({
    where: { orgId, type: "OFF_CYCLE" },
    include: { journalEntry: { select: { id: true, voucherNo: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createOffCyclePayrollRun(
  orgId: string,
  actorId: string,
  input: {
    payDate: string;
    reason: string;
    entries: OffCycleEntryInput[];
  },
) {
  if (input.entries.length === 0) {
    throw new Error("Add at least one employee payment to process an off-cycle run.");
  }
  const payDate = new Date(input.payDate);
  if (Number.isNaN(payDate.getTime())) {
    throw new Error("Invalid pay date");
  }

  const employeeIds = input.entries.map((e) => e.employeeId);
  const employees = await db.user.findMany({
    where: { id: { in: employeeIds }, orgId },
    select: { id: true },
  });
  const validIds = new Set(employees.map((e) => e.id));
  for (const entry of input.entries) {
    if (!validIds.has(entry.employeeId)) {
      throw new Error("One or more employees do not belong to this organisation.");
    }
    if (!(entry.amount > 0)) {
      throw new Error("Every off-cycle payment amount must be greater than zero.");
    }
  }

  const settings = await db.accountingSettings.findUnique({
    where: { orgId },
    select: { defaultSalaryExpenseAccountId: true, defaultSalaryPayableAccountId: true },
  });
  if (!settings?.defaultSalaryExpenseAccountId || !settings.defaultSalaryPayableAccountId) {
    throw new Error("Accounting defaults are incomplete. Configure salary expense and salary payable accounts first.");
  }

  const total = input.entries.reduce((sum, e) => sum + e.amount, 0);
  const runKey = `${payDate.toISOString().slice(0, 10)}-${Date.now()}`;

  const lines = [
    {
      componentCode: "OFF_CYCLE_GROSS_EARNINGS",
      accountId: settings.defaultSalaryExpenseAccountId,
      debit: total.toFixed(2),
      credit: "0.00",
    },
    {
      componentCode: "OFF_CYCLE_NET_PAYABLE",
      accountId: settings.defaultSalaryPayableAccountId,
      debit: "0.00",
      credit: total.toFixed(2),
    },
  ];

  return acceptApprovedPayrollRun({
    orgId,
    actorId,
    approvedById: actorId,
    approvedAt: new Date().toISOString(),
    correlationId: `hrms-payroll-offcycle-${runKey}`,
    currencyCode: "INR",
    eventId: `hrms-payroll-offcycle-${runKey}-approved-v1`,
    lines,
    payPeriodStart: payDate,
    payPeriodEnd: payDate,
    runId: `HRMS-PAYROLL-OFFCYCLE-${runKey}`,
    runVersion: 1,
    payrollType: "OFF_CYCLE",
  });
}
