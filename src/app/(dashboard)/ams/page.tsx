import { ModuleHome } from "@/components/module-home";
import { auth } from "@/lib/auth";
import { getNow } from "@/lib/clock";
import { db } from "@/lib/db";
import { getVisibleSectionById } from "@/lib/navigation";
import { loadCaps } from "@/lib/rbac";
import { listDueAppraisals } from "@/modules/ams/service";
import { redirect } from "next/navigation";

function monthBounds(year: number, month: number) {
  const start = new Date(year, month, 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(year, month + 1, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export default async function AMSPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const now = await getNow();
  const year = now.getFullYear();
  const month = now.getMonth();
  const caps = await loadCaps(session.user.id);
  const canSeeAdminOverview = Boolean(
    caps["admin.org.manage"] ||
    caps["ams.appraisal.assign_reviewers"] ||
    caps["ams.cycle.manage"] ||
    caps["ams.criteria.manage"]
  );
  const { start: monthStart, end: monthEnd } = monthBounds(year, month);

  const statContext = session.user.orgId
    ? canSeeAdminOverview
      ? await Promise.all([
          listDueAppraisals(session.user.orgId, year, month).then((rows) => rows.length),
          db.appraisalCycle.count({ where: { orgId: session.user.orgId } }),
          db.appraisalCriterion.count({ where: { orgId: session.user.orgId } }),
          db.appraisalReviewer.count({ where: { userId: session.user.id } }),
          db.appraisal.count({ where: { employeeId: session.user.id } }),
        ]).then(([dueCount, cycleCount, criteriaCount, myReviewCount, myAppraisalCount]) => ({
          description: `Coordinate cycles, reviews, and criteria from one workspace.${dueCount > 0 ? ` ${dueCount} appraisal items are due this month.` : " There are no appraisal items due this month."}`,
          stats: [
            { label: "Due this month", value: dueCount.toString(), tone: "amber" as const },
            { label: "Cycles", value: cycleCount.toString(), tone: "teal" as const },
            { label: "Criteria", value: criteriaCount.toString(), tone: "blue" as const },
            { label: "My active tasks", value: (myReviewCount + myAppraisalCount).toString(), tone: "slate" as const },
          ],
        }))
      : await Promise.all([
          db.appraisal.count({
            where: {
              employeeId: session.user.id,
              dueDate: { gte: monthStart, lte: monthEnd },
            },
          }),
          db.appraisal.count({
            where: {
              employeeId: session.user.id,
              stage: "SELF_ASSESSMENT_OPEN",
            },
          }),
          db.appraisalReviewer.count({
            where: {
              userId: session.user.id,
              kind: { not: "MANAGEMENT" },
            },
          }),
          db.appraisal.count({ where: { employeeId: session.user.id } }),
        ]).then(([myDueCount, selfAssessmentOpenCount, myReviewCount, myAppraisalCount]) => ({
          description: `Track your appraisal journey and complete only the work assigned to you.${myDueCount > 0 ? ` ${myDueCount} of your appraisal items are due this month.` : " You have no appraisal items due this month."}`,
          stats: [
            { label: "My due this month", value: myDueCount.toString(), tone: "amber" as const },
            { label: "Self assessments open", value: selfAssessmentOpenCount.toString(), tone: "teal" as const },
            { label: "My reviews", value: myReviewCount.toString(), tone: "blue" as const },
            { label: "My appraisals", value: myAppraisalCount.toString(), tone: "slate" as const },
          ],
        }))
    : {
        description: "Track your appraisal journey and complete only the work assigned to you.",
        stats: [],
      };
  const section = getVisibleSectionById(caps, "ams");

  const quickLinks =
    section?.items.map((item) => ({
      href: item.href,
      label: item.label,
      icon: item.icon,
      description:
        item.href === "/ams/appraisals"
          ? "Manage appraisal workflows, due items, and employee review stages."
          : item.href === "/ams/my-reviews"
            ? "Open the reviews assigned to you and keep feedback moving."
            : item.href === "/ams/my-appraisal"
              ? "Track your own appraisal journey and complete self-assessments."
              : item.href === "/ams/cycles"
                ? "Set up and maintain the appraisal cycles for your organisation."
                : "Maintain the criteria structure used across appraisal phases.",
    })) ?? [];

  return (
    <ModuleHome
      title="Appraisal Management"
      description={statContext.description}
      stats={statContext.stats}
      quickLinks={quickLinks}
      pageIcon={section?.icon}
    />
  );
}
