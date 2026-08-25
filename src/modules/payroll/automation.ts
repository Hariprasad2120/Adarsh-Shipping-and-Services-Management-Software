import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { createNotification } from "@/modules/notifications/service";

// Scoped payroll automation: a fixed set of real payroll lifecycle triggers
// wired to real existing actions (notification, to-do task) — not a
// generic workflow engine (trigger/action/schedule builder). Every rule an
// org creates just says "when X happens in payroll, do Y" for one of these
// X's and Y's; there's no way to define a new trigger type or action type
// from the UI.
export type PayrollAutomationTrigger =
  | "LOAN_FULLY_REPAID"
  | "SALARY_REVISION_APPROVED"
  | "NEW_PAYROLL_EMPLOYEE"
  | "PAYROLL_RUN_OVERDUE";

export type PayrollAutomationSubject = {
  type: "EMPLOYEE" | "LOAN" | "SALARY_REVISION" | "PAYROLL_BATCH";
  id: string;
  employeeId: string; // who the event is about, used to resolve NOTIFY_MANAGER
  summary: string; // human-readable, goes into the notification/to-do body
  link?: string;
};

async function resolveHrUserIds(orgId: string): Promise<string[]> {
  const users = await db.user.findMany({ where: { orgId, active: true }, select: { id: true } });
  const checks = await Promise.all(users.map(async (u) => ((await can(u.id, "hrms.salary.manage")) ? u.id : null)));
  return checks.filter((id): id is string => id !== null);
}

export async function fireAutomation(orgId: string, trigger: PayrollAutomationTrigger, subject: PayrollAutomationSubject) {
  const rules = await db.payrollAutomationRule.findMany({ where: { orgId, trigger, enabled: true } });
  if (rules.length === 0) return;

  for (const rule of rules) {
    try {
      let recipientIds: string[] = [];
      if (rule.actionType === "NOTIFY_MANAGER") {
        const employee = await db.user.findUnique({ where: { id: subject.employeeId }, select: { managerId: true } });
        recipientIds = employee?.managerId ? [employee.managerId] : [];
      } else if (rule.actionType === "NOTIFY_HR" || rule.actionType === "CREATE_TODO") {
        recipientIds = await resolveHrUserIds(orgId);
      }

      if (recipientIds.length === 0) {
        await db.payrollAutomationLog.create({
          data: { ruleId: rule.id, orgId, subjectType: subject.type, subjectId: subject.id, outcome: "SKIPPED", detail: "No recipient resolved (no manager set, or no HR-permissioned users)" },
        });
        continue;
      }

      if (rule.actionType === "CREATE_TODO") {
        const config = (rule.actionConfig ?? {}) as { dueInDays?: number };
        const dueInDays = config.dueInDays ?? 3;
        const dueDate = new Date();
        dueDate.setUTCDate(dueDate.getUTCDate() + dueInDays);
        await db.todoTask.createMany({
          data: recipientIds.map((userId) => ({
            userId,
            orgId,
            title: subject.summary,
            dueDate,
          })),
        });
      } else {
        await Promise.all(
          recipientIds.map((userId) =>
            createNotification({
              userId,
              orgId,
              kind: `PAYROLL_AUTOMATION_${trigger}`,
              title: subject.summary,
              link: subject.link,
            }),
          ),
        );
      }

      await db.payrollAutomationLog.create({
        data: { ruleId: rule.id, orgId, subjectType: subject.type, subjectId: subject.id, outcome: "EXECUTED", detail: `${recipientIds.length} recipient(s)` },
      });
    } catch (error) {
      await db.payrollAutomationLog.create({
        data: {
          ruleId: rule.id,
          orgId,
          subjectType: subject.type,
          subjectId: subject.id,
          outcome: "FAILED",
          detail: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
}
