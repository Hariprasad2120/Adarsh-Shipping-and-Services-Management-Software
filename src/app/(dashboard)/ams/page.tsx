import { ModuleHome } from "@/components/module-home";
import { auth } from "@/lib/auth";
import { getNow } from "@/lib/clock";
import { db } from "@/lib/db";
import { getVisibleSectionById } from "@/lib/navigation";
import { loadCaps } from "@/lib/rbac";
import { listDueAppraisals } from "@/modules/ams/service";
import { redirect } from "next/navigation";

export default async function AMSPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const now = await getNow();
  const year = now.getFullYear();
  const month = now.getMonth();
  const [caps, dueCount, cycleCount, criteriaCount, myReviewCount, myAppraisalCount] = session.user.orgId
    ? await Promise.all([
        loadCaps(session.user.id),
        listDueAppraisals(session.user.orgId, year, month).then((rows) => rows.length),
        db.appraisalCycle.count({ where: { orgId: session.user.orgId } }),
        db.appraisalCriterion.count({ where: { orgId: session.user.orgId } }),
        db.appraisalReviewer.count({ where: { userId: session.user.id } }),
        db.appraisal.count({ where: { employeeId: session.user.id } }),
      ])
    : [await loadCaps(session.user.id), 0, 0, 0, 0, 0];
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
      description={`Coordinate cycles, reviews, and criteria from one workspace.${dueCount > 0 ? ` ${dueCount} appraisal items are due this month.` : " There are no appraisal items due this month."}`}
      stats={[
        { label: "Due this month", value: dueCount.toString(), tone: "amber" },
        { label: "Cycles", value: cycleCount.toString(), tone: "teal" },
        { label: "Criteria", value: criteriaCount.toString(), tone: "blue" },
        {
          label: "My active tasks",
          value: (myReviewCount + myAppraisalCount).toString(),
          tone: "slate",
        },
      ]}
      quickLinks={quickLinks}
    />
  );
}
