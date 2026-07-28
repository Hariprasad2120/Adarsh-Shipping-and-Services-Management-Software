import {
  PeopleLinkCard,
  PeopleLinkGrid,
  PeopleSection,
  PeopleSectionHeader,
  PeopleSummary,
  PeopleSummaryGrid,
} from "@/components/monolith/people-workspace";
import { auth } from "@/lib/auth";
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
  const session = await auth();
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
          eyebrow="Attendance navigation"
          title="Operational workspaces"
          description="Only attendance destinations available through your role are listed."
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
