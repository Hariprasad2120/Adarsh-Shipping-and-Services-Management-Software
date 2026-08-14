import {
  PerformanceActionLink,
  PerformanceCard,
  PerformanceGrid,
  PerformanceSection,
  PerformanceSectionHeader,
  PerformanceSummary,
  PerformanceSummaryGrid,
} from "@/modules/performance/components/performance-workspace";
import {
  DashboardInsightCard,
  DashboardInsightGrid,
  DashboardMiniBarChart,
  DashboardSegmentList,
} from "@/components/data-display/dashboard-insights";
import { WorkspaceBadge } from "@/components/layout/workspace";
import { getSession } from "@/lib/auth";
import { getNow } from "@/lib/clock";
import { db } from "@/lib/db";
import { getVisibleSectionById } from "@/lib/navigation";
import { loadCaps } from "@/lib/rbac";
import { listDueAppraisals } from "@/modules/ams/service";
import {
  ArrowRight,
  ClipboardCheck,
  Gauge,
  Sparkles,
  Target,
} from "lucide-react";
import { redirect } from "next/navigation";

function monthBounds(year: number, month: number) {
  const start = new Date(year, month, 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(year, month + 1, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export default async function AMSPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const now = await getNow();
  const year = now.getFullYear();
  const month = now.getMonth();
  const caps = await loadCaps(session.user.id);
  const canSeeAdminOverview = Boolean(
    caps["admin.org.manage"] ||
    caps["ams.appraisal.assign_reviewers"] ||
    caps["ams.cycle.manage"] ||
    caps["ams.criteria.manage"],
  );
  const { start: monthStart, end: monthEnd } = monthBounds(year, month);

  const statContext = session.user.orgId
    ? canSeeAdminOverview
      ? await Promise.all([
          listDueAppraisals(session.user.orgId, year, month).then(
            (rows) => rows.length,
          ),
          db.appraisalCycle.count({ where: { orgId: session.user.orgId } }),
          db.appraisalCriterion.count({ where: { orgId: session.user.orgId } }),
          db.appraisalReviewer.count({ where: { userId: session.user.id } }),
          db.appraisal.count({ where: { employeeId: session.user.id } }),
        ]).then(
          ([
            dueCount,
            cycleCount,
            criteriaCount,
            myReviewCount,
            myAppraisalCount,
          ]) => ({
            description: `Coordinate cycles, reviews, and criteria from one workspace.${dueCount > 0 ? ` ${dueCount} appraisal items are due this month.` : " There are no appraisal items due this month."}`,
            stats: [
              {
                label: "Due this month",
                value: dueCount.toString(),
                tone: "amber" as const,
              },
              {
                label: "Cycles",
                value: cycleCount.toString(),
                tone: "teal" as const,
              },
              {
                label: "Criteria",
                value: criteriaCount.toString(),
                tone: "blue" as const,
              },
              {
                label: "My active tasks",
                value: (myReviewCount + myAppraisalCount).toString(),
                tone: "slate" as const,
              },
            ],
          }),
        )
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
        ]).then(
          ([
            myDueCount,
            selfAssessmentOpenCount,
            myReviewCount,
            myAppraisalCount,
          ]) => ({
            description: `Track your appraisal journey and complete only the work assigned to you.${myDueCount > 0 ? ` ${myDueCount} of your appraisal items are due this month.` : " You have no appraisal items due this month."}`,
            stats: [
              {
                label: "My due this month",
                value: myDueCount.toString(),
                tone: "amber" as const,
              },
              {
                label: "Self assessments open",
                value: selfAssessmentOpenCount.toString(),
                tone: "teal" as const,
              },
              {
                label: "My reviews",
                value: myReviewCount.toString(),
                tone: "blue" as const,
              },
              {
                label: "My appraisals",
                value: myAppraisalCount.toString(),
                tone: "slate" as const,
              },
            ],
          }),
        )
    : {
        description:
          "Track your appraisal journey and complete only the work assigned to you.",
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
  const dueMetric = Number(statContext.stats[0]?.value ?? 0);
  const openSelfAssessments = Number(statContext.stats[1]?.value ?? 0);
  const assignedReviews = Number(statContext.stats[2]?.value ?? 0);
  const personalLoad = Number(statContext.stats[3]?.value ?? 0);

  return (
    <>
      <PerformanceSummaryGrid>
        {statContext.stats.map((stat, index) => {
          const Icon =
            [ClipboardCheck, Gauge, Sparkles, Target][index] ?? Gauge;
          return (
            <PerformanceSummary
              key={stat.label}
              icon={<Icon aria-hidden="true" />}
              label={stat.label}
              value={stat.value}
              detail={
                index === 0 ? "Current appraisal month" : "Available to you"
              }
            />
          );
        })}
      </PerformanceSummaryGrid>

      <PerformanceSection>
        <PerformanceSectionHeader
          eyebrow="Performance control"
          title="Appraisal dashboard"
          description={`${statContext.description} The landing page now leads with workload visibility, not just route access.`}
        />
        <DashboardInsightGrid>
          <DashboardInsightCard
            eyebrow="Load shape"
            title="Active appraisal work"
            detail="This chart makes the current cycle pressure readable in one glance."
            chart={(
              <DashboardMiniBarChart
                items={[
                  { label: "Due now", value: dueMetric, tone: "warning" },
                  { label: "Self reviews open", value: openSelfAssessments, tone: "accent" },
                  { label: "Assigned reviews", value: assignedReviews, tone: "info" },
                  { label: "My total load", value: personalLoad, tone: "success" },
                ]}
              />
            )}
            footer={<span>{canSeeAdminOverview ? "Admin-capable view combines organisation and personal work." : "Employee view stays focused on your own appraisal commitments."}</span>}
          />
          <DashboardInsightCard
            eyebrow="Work split"
            title="Where effort is concentrated"
            detail="A segmented view clarifies whether the month is being driven by due dates, self assessments, or reviewer workload."
            chart={(
              <DashboardSegmentList
                items={[
                  { label: "Due this month", value: dueMetric, tone: "warning" },
                  { label: "Open self assessments", value: openSelfAssessments, tone: "accent" },
                  { label: "Reviewer tasks", value: assignedReviews, tone: "info" },
                ]}
              />
            )}
            footer={<span>Use this page to decide whether to push cycles, chase reviewers, or complete personal work first.</span>}
          />
        </DashboardInsightGrid>
      </PerformanceSection>

      <PerformanceSection>
        <PerformanceSectionHeader
          eyebrow="Workspace overview"
          title="Action lanes"
          description="All AMS tools remain available, but they now sit below the dashboard summary instead of replacing it."
          actions={
            <WorkspaceBadge variant="accent">
              {quickLinks.length} role-visible lanes
            </WorkspaceBadge>
          }
        />
        <PerformanceGrid className="px-5 pb-5">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <PerformanceCard key={item.href} className="h-full">
                <span className="mnx-icon-badge">
                  <Icon aria-hidden="true" />
                </span>
                <h2 className="mnx-title-3 mt-5">{item.label}</h2>
                <p className="mnx-text-muted mt-2 text-sm leading-6">
                  {item.description}
                </p>
                <div className="mt-5">
                  <PerformanceActionLink href={item.href}>
                    Open workspace <ArrowRight size={15} aria-hidden="true" />
                  </PerformanceActionLink>
                </div>
              </PerformanceCard>
            );
          })}
        </PerformanceGrid>
      </PerformanceSection>
    </>
  );
}
