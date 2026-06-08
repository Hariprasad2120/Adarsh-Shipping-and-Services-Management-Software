import { ModuleHome } from "@/components/module-home";
import { auth } from "@/lib/auth";
import { getNow } from "@/lib/clock";
import { getVisibleSectionById } from "@/lib/navigation";
import { can, loadCaps } from "@/lib/rbac";
import { getLeaveRequests, getMonthAttendance, getMonthlyReport } from "@/modules/attendance/service";
import { redirect } from "next/navigation";

export default async function AttendancePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const now = await getNow();
  const canApprove = await can(session.user.id, "attendance.leave.approve");

  const [caps, myPunches, myLeaveRequests, pendingApprovals, monthlyReport] = await Promise.all([
    loadCaps(session.user.id),
    getMonthAttendance(session.user.id, now.getFullYear(), now.getMonth() + 1),
    getLeaveRequests(session.user.orgId!, { userId: session.user.id }),
    canApprove ? getLeaveRequests(session.user.orgId!, { status: "pending" }) : Promise.resolve([]),
    getMonthlyReport(session.user.orgId!, now.getFullYear(), now.getMonth() + 1),
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
    <ModuleHome
      title="Attendance"
      description="Handle day-to-day attendance operations here, including punch tracking, leave workflows, and month-wise reporting for your organisation."
      stats={[
        { label: "Punches this month", value: myPunches.length.toString(), tone: "teal" },
        {
          label: "My pending leaves",
          value: myLeaveRequests.filter((request) => request.status === "pending").length.toString(),
          tone: "amber",
        },
        {
          label: "Pending approvals",
          value: pendingApprovals.length.toString(),
          tone: canApprove ? "blue" : "slate",
        },
        { label: "Reported employees", value: monthlyReport.length.toString(), tone: "slate" },
      ]}
      quickLinks={quickLinks}
      pageIcon={section?.icon}
    />
  );
}
