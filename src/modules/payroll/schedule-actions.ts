"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";

const DEFAULT_WORKING_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

export async function getPayrollSchedule(orgId: string) {
  const [schedule, hasProcessedRun] = await Promise.all([
    db.payrollScheduleSettings.findUnique({ where: { orgId } }),
    db.payrollBatch.findFirst({
      where: { orgId, status: { in: ["FINALIZED", "PAID"] } },
      select: { id: true },
    }),
  ]);

  return {
    schedule,
    locked: Boolean(hasProcessedRun),
  };
}

function nextPayDates(payDayOfMonth: number, count: number) {
  const now = new Date();
  const dates: { periodLabel: string; payDate: Date }[] = [];
  let cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  for (let i = 0; i < count; i += 1) {
    const periodLabel = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(cursor);
    const nextMonth = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    const payDate = new Date(Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth(), Math.min(payDayOfMonth, 28)));
    dates.push({ periodLabel, payDate });
    cursor = nextMonth;
  }
  return dates;
}

export async function getUpcomingPayrolls(payDayOfMonth: number) {
  return nextPayDates(payDayOfMonth, 2);
}

type ActionResponse = { ok: true } | { ok: false; error: string };

export async function savePayrollScheduleAction(input: {
  workingDays: string[];
  payDayOfMonth: number;
  firstPayPeriod: string;
}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const hasProcessedRun = await db.payrollBatch.findFirst({
      where: { orgId, status: { in: ["FINALIZED", "PAID"] } },
      select: { id: true },
    });
    if (hasProcessedRun) {
      return { ok: false, error: "Pay Schedule cannot be edited once you process the first pay run." };
    }

    if (input.payDayOfMonth < 1 || input.payDayOfMonth > 28) {
      return { ok: false, error: "Pay day must be between 1 and 28" };
    }
    if (input.workingDays.length === 0) {
      return { ok: false, error: "Select at least one working day" };
    }

    const firstPayPeriod = new Date(input.firstPayPeriod);
    if (Number.isNaN(firstPayPeriod.getTime())) {
      return { ok: false, error: "Invalid first pay period" };
    }

    await db.payrollScheduleSettings.upsert({
      where: { orgId },
      update: {
        workingDays: input.workingDays,
        payDayOfMonth: input.payDayOfMonth,
        firstPayPeriod,
      },
      create: {
        orgId,
        workingDays: input.workingDays.length > 0 ? input.workingDays : DEFAULT_WORKING_DAYS,
        payDayOfMonth: input.payDayOfMonth,
        firstPayPeriod,
      },
    });

    revalidatePath("/payroll/settings/pay-schedule");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to save pay schedule" };
  }
}
