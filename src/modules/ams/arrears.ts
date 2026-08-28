// Salary arrear owed when the appraisal meeting is held more than the configured
// buffer after the self-assessment was submitted. Ported from the standalone AMS
// (src/lib/arrears.ts) and made buffer-configurable via OrgAppraisalSettings.

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function calendarDaysBetween(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const end = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((end - start) / msPerDay);
}

export function isArrearEligible(selfSubmittedAt: Date, scheduledDate: Date, bufferDays: number): boolean {
  return scheduledDate > addDays(selfSubmittedAt, bufferDays);
}

export function computeArrearPeriod(
  selfSubmittedAt: Date,
  scheduledDate: Date,
  bufferDays: number,
): { periodFrom: Date; periodTo: Date; arrearDays: number } | null {
  const periodFrom = addDays(selfSubmittedAt, bufferDays);
  const periodTo = scheduledDate;
  const arrearDays = calendarDaysBetween(periodFrom, periodTo);
  if (arrearDays <= 0) return null;
  return { periodFrom, periodTo, arrearDays };
}

export function computeArrearAmount(
  annualIncrement: number,
  arrearDays: number,
): { dailyRate: number; arrearAmount: number } {
  const dailyRate = annualIncrement / 365;
  const arrearAmount = Math.round(dailyRate * arrearDays * 100) / 100;
  return { dailyRate, arrearAmount };
}

export function computeArrear(params: {
  selfSubmittedAt: Date;
  scheduledDate: Date;
  bufferDays: number;
  annualIncrement: number;
}): {
  periodFrom: Date;
  periodTo: Date;
  arrearDays: number;
  dailyRate: number;
  amount: number;
} | null {
  if (params.annualIncrement <= 0) return null;
  if (!isArrearEligible(params.selfSubmittedAt, params.scheduledDate, params.bufferDays)) return null;
  const period = computeArrearPeriod(params.selfSubmittedAt, params.scheduledDate, params.bufferDays);
  if (!period) return null;
  const { dailyRate, arrearAmount } = computeArrearAmount(params.annualIncrement, period.arrearDays);
  if (arrearAmount <= 0) return null;
  return {
    periodFrom: period.periodFrom,
    periodTo: period.periodTo,
    arrearDays: period.arrearDays,
    dailyRate,
    amount: arrearAmount,
  };
}

export const ARREAR_STATUS_LABELS: Record<string, string> = {
  PENDING_APPROVAL: "Pending approval",
  APPROVED: "Approved — awaiting payout",
  PAID: "Paid",
  REJECTED: "Rejected",
};
