import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { loadCaps } from "@/lib/rbac";
import {
  PeopleLinkCard,
  PeopleLinkGrid,
  PeopleSection,
  PeopleSectionHeader,
  PeopleSummary,
  PeopleSummaryGrid,
} from "@/modules/people/components/people-workspace";
import {
  DashboardInsightCard,
  DashboardInsightGrid,
  DashboardMiniBarChart,
  DashboardSegmentList,
} from "@/components/data-display/dashboard-insights";
import {
  getEmployerDashboardCounts,
} from "@/modules/recruit/employer-service";
import {
  getJobSeekerDashboardCounts,
} from "@/modules/recruit/jobseeker-service";

export default async function RecruitLandingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const caps = await loadCaps(session.user.id);
  const canEmployer = !!caps["recruit.view"];
  const canJobSeeker = !!caps["recruit.jobseeker.use"];
  const employerCounts =
    canEmployer && session.user.orgId
      ? await getEmployerDashboardCounts(session.user.orgId)
      : null;
  const jobSeekerCounts = canJobSeeker
    ? await getJobSeekerDashboardCounts(session.user.id)
    : null;

  const workspaces = [
    canEmployer
      ? {
          href: "/hrms/recruit/employer",
          title: "Employer workspace",
          description:
            "Monitor openings, applications, offers, and hiring automation from one operating surface.",
        }
      : null,
    canJobSeeker
      ? {
          href: "/hrms/recruit/career",
          title: "Career workspace",
          description:
            "Keep private applications, saved jobs, alerts, and resume tailoring separate from employer hiring data.",
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  const totalOpenings =
    (employerCounts?.openRequisitions ?? 0) +
    (employerCounts?.activeOpenings ?? 0);
  const totalApplications = employerCounts
    ? Object.values(employerCounts.applicationsByStage).reduce(
        (sum, value) => sum + value,
        0,
      )
    : jobSeekerCounts
      ? Object.values(jobSeekerCounts.applicationsByStatus).reduce(
          (sum, value) => sum + value,
          0,
        )
      : 0;

  return (
    <>
      <PeopleSummaryGrid>
        <PeopleSummary
          label="Visible workspaces"
          value={workspaces.length}
          detail="Recruit areas enabled for your role"
        />
        <PeopleSummary
          label="Open opportunities"
          value={totalOpenings}
          detail="Roles currently ready for applications or publishing"
        />
        <PeopleSummary
          label="Tracked applications"
          value={totalApplications}
          detail="Hiring or private application records visible from your access level"
        />
      </PeopleSummaryGrid>

      <PeopleSection>
        <PeopleSectionHeader
          eyebrow="Talent control"
          title="Recruitment dashboard"
          description="The landing page now starts with hiring or career signals, then keeps the workspace links underneath."
        />
        <DashboardInsightGrid>
          {employerCounts ? (
            <DashboardInsightCard
              eyebrow="Hiring demand"
              title="Employer pipeline"
              detail="Openings, candidate inflow, and approvals make this feel like a real hiring dashboard instead of a pair of entry cards."
              chart={(
                <DashboardMiniBarChart
                  items={[
                    { label: "Draft requisitions", value: employerCounts.openRequisitions, tone: "warning" },
                    { label: "Published openings", value: employerCounts.activeOpenings, tone: "success" },
                    { label: "New candidates", value: employerCounts.newCandidates, tone: "info" },
                    { label: "Offer approvals", value: employerCounts.offersAwaitingApproval, tone: "accent" },
                  ]}
                />
              )}
              footer={<span>{employerCounts.automationFailures} automation failures currently need a hiring-ops follow-up.</span>}
            />
          ) : null}
          {jobSeekerCounts ? (
            <DashboardInsightCard
              eyebrow="Private career flow"
              title="Career activity"
              detail="Saved jobs, new matches, and active alerts create a useful personal dashboard without exposing employer-only data."
              chart={(
                <DashboardSegmentList
                  items={[
                    { label: "New matching jobs", value: jobSeekerCounts.newMatchingJobs, tone: "info" },
                    { label: "Saved jobs", value: jobSeekerCounts.savedJobs, tone: "accent" },
                    { label: "Active alerts", value: jobSeekerCounts.activeAlerts, tone: "success" },
                    { label: "Tailored resumes", value: jobSeekerCounts.recentTailoredResumes, tone: "warning" },
                  ]}
                />
              )}
              footer={<span>The career side remains private and operationally separate from the employer dashboard.</span>}
            />
          ) : null}
          {employerCounts ? (
            <DashboardInsightCard
              eyebrow="Application load"
              title="Stage distribution"
              detail="A compact split helps hiring teams see whether the backlog is building in screening, interviews, or offer stages."
              chart={(
                <DashboardSegmentList
                  items={Object.entries(employerCounts.applicationsByStage)
                    .slice(0, 5)
                    .map(([label, value], index) => ({
                      label: label.replaceAll("_", " "),
                      value,
                      tone: (["neutral", "info", "accent", "warning", "success"] as const)[index] ?? "neutral",
                    }))}
              />
            )}
            />
          ) : null}
        </DashboardInsightGrid>
      </PeopleSection>

      <PeopleSection>
        <PeopleSectionHeader
          eyebrow="Action lanes"
          title="Recruit workspaces"
          description="Both employer and private career experiences stay available, but they now sit below the dashboard summary."
        />
        <PeopleLinkGrid>
          {workspaces.map((workspace) => (
            <PeopleLinkCard
              key={workspace.href}
              href={workspace.href}
              title={workspace.title}
              description={workspace.description}
            />
          ))}
          {caps["recruit.settings.manage"] ? (
            <PeopleLinkCard
              href="/hrms/recruit/settings"
              title="Recruit settings"
              description="Control privacy, workflow, and hiring configuration."
            />
          ) : null}
          {caps["recruit.settings.manage"] ? (
            <PeopleLinkCard
              href="/hrms/recruit/audit"
              title="Recruit audit"
              description="Review timeline events and integrity checks across hiring activity."
            />
          ) : null}
        </PeopleLinkGrid>
      </PeopleSection>
    </>
  );
}
