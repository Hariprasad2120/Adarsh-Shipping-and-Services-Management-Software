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
  DashboardTrend,
} from "@/components/data-display/dashboard-insights";
import { getSession } from "@/lib/auth";
import { getNow } from "@/lib/clock";
import { getVisibleSectionById } from "@/lib/navigation";
import { can, loadCaps } from "@/lib/rbac";
import {
  getLeaveRequests,
  getMonthAttendance,
  getMonthlyReport,
} from "@/modules/attendance/service";
import { redirect } from "next/navigation";

export default async function AttendancePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const now = await getNow();
  const canApprove = await can(session.user.id, "attendance.leave.approve");

  const [caps, myPunches, myLeaveRequests, pendingApprovals, monthlyReport] =
    await Promise.all([
      loadCaps(session.user.id),
      getMonthAttendance(
        session.user.id,
        now.getFullYear(),
        now.getMonth() + 1,
      ),
      getLeaveRequests(session.user.orgId!, { userId: session.user.id }),
      canApprove
        ? getLeaveRequests(session.user.orgId!, { status: "pending" })
        : Promise.resolve([]),
      getMonthlyReport(
        session.user.orgId!,
        now.getFullYear(),
        now.getMonth() + 1,
      ),
    ]);
  const section = getVisibleSectionById(caps, "attendance");

  const quickLinks =
    section?.items.map((item) => ({
      href: item.href,
      label: item.label,
      icon: item.icon,
      description:
        item.href === "/attendance/punch"
          ? "Record your in and out times and review this month's punches."
          : item.href === "/attendance/leaves"
            ? "Submit leave requests, track balances, and review approvals."
            : "Review the current month's attendance summary across employees.",
    })) ?? [];
  const leaveStatusCounts = {
    pending: myLeaveRequests.filter((request) => request.status === "pending").length,
    approved: myLeaveRequests.filter((request) => request.status === "approved").length,
    rejected: myLeaveRequests.filter((request) => request.status === "rejected").length,
  };
  const attendanceTrend = [
    { label: "Week 1", value: myPunches.slice(0, 7).filter((entry) => entry.inAt).length },
    { label: "Week 2", value: myPunches.slice(7, 14).filter((entry) => entry.inAt).length },
    { label: "Week 3", value: myPunches.slice(14, 21).filter((entry) => entry.inAt).length },
    { label: "Week 4", value: myPunches.slice(21, 31).filter((entry) => entry.inAt).length },
  ];

  return (
    <>
      <PeopleSummaryGrid>
        <PeopleSummary label="Punches this month" value={myPunches.length} />
        <PeopleSummary
          label="My pending leaves"
          value={
            myLeaveRequests.filter((request) => request.status === "pending")
              .length
          }
        />
        <PeopleSummary
          label="Pending approvals"
          value={pendingApprovals.length}
          detail={
            canApprove ? "Available for review" : "Approval access not assigned"
          }
        />
        <PeopleSummary
          label="Reported employees"
          value={monthlyReport.length}
        />
      </PeopleSummaryGrid>

      <PeopleSection>
        <PeopleSectionHeader
          eyebrow="Monthly control"
          title="Attendance dashboard"
          description="The home route now surfaces your punch rhythm, leave pipeline, and approval pressure before dropping you into detailed tools."
        />
        <DashboardInsightGrid>
          <DashboardInsightCard
            eyebrow="Punch rhythm"
            title="Attendance trend this month"
            detail="A simple weekly trend makes the home route useful as a checkpoint instead of just a launcher."
            chart={<DashboardTrend items={attendanceTrend} />}
            footer={<span>{myPunches.filter((entry) => entry.inAt).length} recorded punch days so far this month.</span>}
          />
          <DashboardInsightCard
            eyebrow="Leave flow"
            title="My request outcomes"
            detail="Track whether your attendance exceptions are still waiting, already approved, or sent back."
            chart={(
              <DashboardSegmentList
                items={[
                  { label: "Pending", value: leaveStatusCounts.pending, tone: "warning" },
                  { label: "Approved", value: leaveStatusCounts.approved, tone: "success" },
                  { label: "Rejected", value: leaveStatusCounts.rejected, tone: "danger" },
                ]}
              />
            )}
            footer={<span>Pending approvals are the items most likely to change your payroll-facing attendance status.</span>}
          />
          <DashboardInsightCard
            eyebrow="Org snapshot"
            title="Approval and reporting pressure"
            detail="This keeps the shared attendance load visible, especially for approvers."
            chart={(
              <DashboardMiniBarChart
                items={[
                  { label: "Pending approvals", value: pendingApprovals.length, tone: "accent" },
                  { label: "Reported employees", value: monthlyReport.length, tone: "info" },
                  { label: "My leave requests", value: myLeaveRequests.length, tone: "neutral" },
                ]}
              />
            )}
            footer={<span>{canApprove ? "You can act on the current approval queue from this module." : "Approval actions stay hidden until the right role is assigned."}</span>}
          />
        </DashboardInsightGrid>
      </PeopleSection>

      <PeopleSection>
        <PeopleSectionHeader
          eyebrow="Attendance navigation"
          title="Operational workspaces"
          description="All detailed attendance tools stay intact and now sit underneath the summary layer."
        />
        <PeopleLinkGrid>
          {quickLinks.map((link) => (
            <PeopleLinkCard
              key={link.href}
              href={link.href}
              title={link.label}
              description={link.description}
            />
          ))}
        </PeopleLinkGrid>
      </PeopleSection>
    </>
  );
}
