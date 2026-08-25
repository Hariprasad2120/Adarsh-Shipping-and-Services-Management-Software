"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";

type ActionResponse = { ok: true } | { ok: false; error: string };

// Only these two triggers are actually wired to a real event in the code
// (loan-actions.ts, salary-revision-actions.ts, payroll.ts's auto-deduction
// path). NEW_PAYROLL_EMPLOYEE and PAYROLL_RUN_OVERDUE aren't offered here
// yet — there's no single, unambiguous existing call site to hook them to
// without adding a cron/scheduling layer this repo doesn't have.
const WIRED_TRIGGERS = ["LOAN_FULLY_REPAID", "SALARY_REVISION_APPROVED"] as const;
const ACTION_TYPES = ["NOTIFY_MANAGER", "NOTIFY_HR", "CREATE_TODO"] as const;

export async function listAutomationRules(orgId: string) {
  return db.payrollAutomationRule.findMany({ where: { orgId }, orderBy: { createdAt: "desc" } });
}

export async function listAutomationLogs(orgId: string, limit = 20) {
  return db.payrollAutomationLog.findMany({
    where: { orgId },
    orderBy: { triggeredAt: "desc" },
    take: limit,
  });
}

export async function createAutomationRuleAction(input: {
  trigger: string;
  actionType: string;
  dueInDays?: number;
}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    if (!WIRED_TRIGGERS.includes(input.trigger as (typeof WIRED_TRIGGERS)[number])) {
      return { ok: false, error: "This trigger isn't wired to a real event yet" };
    }
    if (!ACTION_TYPES.includes(input.actionType as (typeof ACTION_TYPES)[number])) {
      return { ok: false, error: "Unknown action type" };
    }

    await db.payrollAutomationRule.create({
      data: {
        orgId,
        trigger: input.trigger,
        actionType: input.actionType,
        actionConfig: input.actionType === "CREATE_TODO" ? { dueInDays: input.dueInDays ?? 3 } : undefined,
        createdById: session.user.id,
      },
    });

    revalidatePath("/payroll/settings/automation");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to create automation rule" };
  }
}

export async function toggleAutomationRuleAction(id: string, enabled: boolean): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const rule = await db.payrollAutomationRule.findFirst({ where: { id, orgId }, select: { id: true } });
    if (!rule) return { ok: false, error: "Rule not found" };
    await db.payrollAutomationRule.update({ where: { id: rule.id }, data: { enabled } });

    revalidatePath("/payroll/settings/automation");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to update rule" };
  }
}

export async function deleteAutomationRuleAction(id: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const rule = await db.payrollAutomationRule.findFirst({ where: { id, orgId }, select: { id: true } });
    if (!rule) return { ok: false, error: "Rule not found" };
    await db.payrollAutomationRule.delete({ where: { id: rule.id } });

    revalidatePath("/payroll/settings/automation");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to delete rule" };
  }
}
