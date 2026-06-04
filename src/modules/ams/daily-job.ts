import { db } from "@/lib/db";
import { notifyMany } from "@/lib/notify";
import { dueOnDate } from "./due-dates";
import { createAppraisalForEmployee, openPastDeadlineAssessments, advancePastDeadlineStages, notifyStalePendingReviewers } from "./service";

const EXEMPT_PERMISSION_KEYS = ["ams.appraisal.management_review", "admin.org.manage"];

export async function runAppraisalDailyJob(now: Date): Promise<{ created: number; opened: number; selfAdvanced: number; reviewerAdvanced: number }> {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const orgs = await db.organisation.findMany({
    where: { active: true },
    select: { id: true },
  });

  let created = 0;

  for (const org of orgs) {
    const employees = await db.user.findMany({
      where: { orgId: org.id, active: true },
      include: {
        employmentRecord: true,
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });

    for (const emp of employees) {
      const rec = emp.employmentRecord;
      if (!rec || rec.exitDate) continue;

      const exempt = emp.roles.some((ur) =>
        ur.role.permissions.some((rp) => EXEMPT_PERMISSION_KEYS.includes(rp.permission.key))
      );
      if (exempt) continue;

      const slot = dueOnDate(rec.joinDate, rec.priorExperienceYears ?? 0, today);
      if (!slot) continue;

      const appraisal = await createAppraisalForEmployee(org.id, emp.id, slot.dueDate, slot.kind);

      const notifyRoles = await db.role.findMany({
        where: { orgId: org.id, name: { in: ["Admin", "HR"] } },
        include: { userRoles: true },
      });
      const userIds = [...new Set(notifyRoles.flatMap((r) => r.userRoles.map((ur) => ur.userId)))];

      await notifyMany(userIds, {
        orgId: org.id,
        kind: "APPRAISAL_DUE",
        title: `Appraisal due: ${emp.name}`,
        body: `An appraisal is due for ${emp.name} (${slot.kind}).`,
        link: `/ams/appraisals/${appraisal.id}`,
        email: true,
      });

      created++;
    }
  }

  const opened = await openPastDeadlineAssessments();
  const { selfAdvanced, reviewerAdvanced } = await advancePastDeadlineStages();
  await notifyStalePendingReviewers();

  return { created, opened, selfAdvanced, reviewerAdvanced };
}
