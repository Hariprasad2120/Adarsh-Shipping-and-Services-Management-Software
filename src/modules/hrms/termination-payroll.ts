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
  // Phase 34 (Zoho edit-screen parity, page 00068): optional manual overrides.
  // When omitted, Base Days/Payable Days keep deriving from the employee's
  // HRMS last working day, unchanged from the original v1 behaviour.
  baseDaysOverride?: number;
  payableDaysOverride?: number;
  // "+Add LOP" — reduces payable days for this settlement. There is no
  // concept of a separate "past period" LOP register for exited employees
  // (only regular-payroll LOP is sourced from HRMS attendance/leave), so
  // this models a single LOP adjustment, not Zoho's distinct
  // "Adjust Past LOP" flow — that is a genuine gap, noted in the UI.
  lopDays?: number;
};

export type TerminationSettlement = Awaited<ReturnType<typeof computeSettlement>>;

// Phase 34: per-employee display metadata persisted on PayrollBatch.metadata
// for TERMINATION / BULK_TERMINATION batches — the GL lines these batches
// post stay aggregate (v1 simplification noted above), so this is the only
// place employee-level detail (payslip/TDS-sheet style rows, LWD) exists.
export type TerminationBatchMetadata = {
  notes: string | null;
  payDate: string;
  entries: Array<{
    employeeId: string;
    employeeName: string;
    employeeNumber: string;
    lastWorkingDay: string;
    baseDays: number;
    payableDays: number;
    grossEarnings: number;
    deductionsTotal: number;
    deductions: { label: string; amount: number }[];
    noticePay: { mode: "PAY" | "RECOVER"; amount: number } | null;
    netPay: number;
  }>;
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

// TERMINATION batches are individual settlements; BULK_TERMINATION batches
// are the same computation applied to several exiting employees in one run
// (schema comment at prisma/schema.prisma PayrollBatch.type). Both are
// listed together here and split by `type` by callers (pay-runs list page).
export async function listTerminationPayrollBatches(orgId: string) {
  return db.payrollBatch.findMany({
    where: { orgId, type: { in: ["TERMINATION", "BULK_TERMINATION"] } },
    include: { journalEntry: { select: { id: true, voucherNo: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTerminationPayrollBatch(orgId: string, batchId: string) {
  return db.payrollBatch.findFirst({
    where: { id: batchId, orgId, type: { in: ["TERMINATION", "BULK_TERMINATION"] } },
    include: { journalEntry: { select: { id: true, voucherNo: true } } },
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
      employeeNumber: true,
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
  const daysInMonth = entry.baseDaysOverride && entry.baseDaysOverride > 0 ? entry.baseDaysOverride : monthEnd.getUTCDate();
  const derivedPayableDays = lwd.getUTCDate();
  const payableDaysBeforeLop =
    entry.payableDaysOverride && entry.payableDaysOverride >= 0 ? entry.payableDaysOverride : derivedPayableDays;
  const payableDays = Math.max(0, roundMoney(payableDaysBeforeLop - asNumber(entry.lopDays)));

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
    employeeNumber: employee.employeeNumber == null ? "-" : String(employee.employeeNumber),
    lastWorkingDay: lwd,
    payableDays,
    daysInMonth,
    proratedRegularPay,
    additionalEarnings,
    deductionsTotal,
    deductions: entry.deductions ?? [],
    noticePay: entry.noticePay ?? null,
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
  options?: { payDate?: string; notes?: string },
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
  const payDate = options?.payDate ? new Date(options.payDate) : latestLwd;
  const runKey = `${latestLwd.toISOString().slice(0, 10)}-${Date.now()}`;

  // Phase 34: TERMINATION (single employee) vs BULK_TERMINATION (more than
  // one) — schema already distinguishes these types
  // (prisma/schema.prisma PayrollBatch.type); previously every settlement
  // was written as "TERMINATION" regardless of entry count.
  const payrollType = settlements.length > 1 ? "BULK_TERMINATION" : "TERMINATION";
  const runIdPrefix = payrollType === "BULK_TERMINATION" ? "HRMS-PAYROLL-BULKTERMINATION" : "HRMS-PAYROLL-TERMINATION";

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

  const metadata: TerminationBatchMetadata = {
    notes: options?.notes ?? null,
    payDate: payDate.toISOString(),
    entries: settlements.map((s) => ({
      employeeId: s.employeeId,
      employeeName: s.employeeName,
      employeeNumber: s.employeeNumber,
      lastWorkingDay: s.lastWorkingDay.toISOString(),
      baseDays: s.daysInMonth,
      payableDays: s.payableDays,
      grossEarnings: s.grossEarnings,
      deductionsTotal: s.deductionsTotal,
      deductions: s.deductions,
      noticePay: s.noticePay,
      netPay: s.netPay,
    })),
  };

  const result = await acceptApprovedPayrollRun({
    orgId,
    actorId,
    approvedById: actorId,
    approvedAt: new Date().toISOString(),
    correlationId: `hrms-payroll-termination-${runKey}`,
    currencyCode: "INR",
    eventId: `hrms-payroll-termination-${runKey}-approved-v1`,
    lines,
    payPeriodStart: payDate,
    payPeriodEnd: payDate,
    runId: `${runIdPrefix}-${runKey}`,
    runVersion: 1,
    payrollType,
    metadata,
  });

  return { settlements, batchId: result.batchId as string | null };
}

// ---------------------------------------------------------------------------
// Phase 34: pre-finalize draft (Zoho reference page 00068's Edit screen).
//
// acceptApprovedPayrollRun (above) is an immutable, hash-verified GL posting
// boundary — a termination batch does not exist in this system before it is
// posted, so there is no "DRAFT PayrollBatch" to edit. This draft table is a
// separate, additive pre-stage: a preparer composes/edits LWD, base/payable
// days, additional earnings, deductions and notice pay here (saved as they
// go, "Save Draft"), and "Save and Continue" finalizes the draft into a real
// PayrollBatch by calling createTerminationPayrollRun above — the GL-posting
// logic itself is untouched.
// ---------------------------------------------------------------------------

export type TerminationDraftEntry = {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  lastWorkingDay: string;
  baseDays: number;
  payableDays: number;
  lopDays: number;
  bonus: number;
  stipend: number;
  overtime: number;
  leaveEncashment: number;
  incentives: number;
  gratuity: number;
  deductions: { label: string; amount: number }[];
  noticePay: { mode: "PAY" | "RECOVER"; amount: number } | null;
};

export async function listTerminationDrafts(orgId: string) {
  return db.terminationPayrollDraft.findMany({
    where: { orgId, status: "DRAFT" },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTerminationDraft(orgId: string, draftId: string) {
  return db.terminationPayrollDraft.findFirst({ where: { id: draftId, orgId } });
}

export async function createTerminationDraft(orgId: string, actorId: string, employeeIds: string[]) {
  if (employeeIds.length === 0) {
    throw new Error("Select at least one exiting employee.");
  }
  const employees = await db.user.findMany({
    where: { id: { in: employeeIds }, orgId, employmentRecord: { exitDate: { not: null } } },
    select: {
      id: true,
      name: true,
      employeeNumber: true,
      employmentRecord: { select: { exitDate: true } },
    },
  });
  if (employees.length === 0) {
    throw new Error("None of the selected employees have a last working day set in HRMS.");
  }

  const entries: TerminationDraftEntry[] = await Promise.all(
    employees.map(async (emp) => {
      const preview = await computeSettlement(orgId, { employeeId: emp.id });
      return {
        employeeId: emp.id,
        employeeName: emp.name,
        employeeNumber: emp.employeeNumber == null ? "-" : String(emp.employeeNumber),
        lastWorkingDay: preview.lastWorkingDay.toISOString(),
        baseDays: preview.daysInMonth,
        payableDays: preview.payableDays,
        lopDays: 0,
        bonus: 0,
        stipend: 0,
        overtime: 0,
        leaveEncashment: 0,
        incentives: 0,
        gratuity: 0,
        deductions: [],
        noticePay: null,
      };
    }),
  );

  const latestLwd = entries.reduce(
    (latest, e) => (e.lastWorkingDay > latest ? e.lastWorkingDay : latest),
    entries[0]!.lastWorkingDay,
  );

  return db.terminationPayrollDraft.create({
    data: {
      orgId,
      status: "DRAFT",
      payDate: new Date(latestLwd),
      notes: null,
      entries: entries as unknown as object,
      createdById: actorId,
    },
  });
}

export async function updateTerminationDraft(
  orgId: string,
  draftId: string,
  input: { payDate?: string; notes?: string; entries: TerminationDraftEntry[] },
) {
  const draft = await db.terminationPayrollDraft.findFirst({ where: { id: draftId, orgId } });
  if (!draft) throw new Error("Draft not found");
  if (draft.status !== "DRAFT") throw new Error("This settlement has already been finalized.");

  return db.terminationPayrollDraft.update({
    where: { id: draftId },
    data: {
      payDate: input.payDate ? new Date(input.payDate) : draft.payDate,
      notes: input.notes ?? draft.notes,
      entries: input.entries as unknown as object,
    },
  });
}

export async function finalizeTerminationDraft(orgId: string, actorId: string, draftId: string) {
  const draft = await db.terminationPayrollDraft.findFirst({ where: { id: draftId, orgId } });
  if (!draft) throw new Error("Draft not found");
  if (draft.status !== "DRAFT") throw new Error("This settlement has already been finalized.");

  const entries = draft.entries as unknown as TerminationDraftEntry[];
  const inputs: TerminationEntryInput[] = entries.map((e) => ({
    employeeId: e.employeeId,
    bonus: e.bonus,
    stipend: e.stipend,
    overtime: e.overtime,
    leaveEncashment: e.leaveEncashment,
    incentives: e.incentives,
    gratuity: e.gratuity,
    deductions: e.deductions,
    noticePay: e.noticePay ?? undefined,
    baseDaysOverride: e.baseDays,
    payableDaysOverride: e.payableDays,
    lopDays: e.lopDays,
  }));

  const { batchId } = await createTerminationPayrollRun(orgId, actorId, inputs, {
    payDate: draft.payDate ? draft.payDate.toISOString() : undefined,
    notes: draft.notes ?? undefined,
  });

  await db.terminationPayrollDraft.update({
    where: { id: draftId },
    data: { status: "FINALIZED", batchId },
  });

  return batchId;
}

export async function discardTerminationDraft(orgId: string, draftId: string) {
  const draft = await db.terminationPayrollDraft.findFirst({ where: { id: draftId, orgId } });
  if (!draft) throw new Error("Draft not found");
  if (draft.status !== "DRAFT") throw new Error("This settlement has already been finalized.");
  await db.terminationPayrollDraft.delete({ where: { id: draftId } });
}
