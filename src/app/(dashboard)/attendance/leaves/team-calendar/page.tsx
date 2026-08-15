import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { WorkspaceState } from "@/components/layout/workspace";
import { TeamCalendarClient } from "./team-calendar-client";
import { ShieldAlert } from "lucide-react";

export default async function TeamCalendarPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const authorized = await can(session.user.id, "attendance.leave.approve");
  if (!authorized) {
    return (
      <WorkspaceState
        variant="danger"
        eyebrow="Leave management"
        icon={<ShieldAlert aria-hidden="true" />}
        title="Access denied"
        description="You need leave-approval permissions to view team leave calendars. Contact your administrator if you believe this is a mistake."
      />
    );
  }

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

  const reports = await db.user.findMany({
    where: { managerId: session.user.id, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const reportIds = reports.map((r) => r.id);

  const requests =
    reportIds.length === 0
      ? []
      : await db.leaveRequest.findMany({
          where: {
            userId: { in: reportIds },
            status: { in: ["pending", "PENDING_APPROVAL", "approved", "APPROVED"] },
            fromDate: { lte: monthEnd },
            toDate: { gte: monthStart },
          },
          include: { leaveType: { select: { name: true } } },
          orderBy: { fromDate: "asc" },
        });

  // Privacy-safe: expose only "who is out" and the date span, not the
  // reason/notes field (spec §41 — coworkers see "Out of Office", not the
  // underlying medical/personal detail).
  const entries = requests.map((r) => {
    const report = reports.find((rep) => rep.id === r.userId);
    return {
      id: r.id,
      employeeName: report?.name ?? "Unknown",
      leaveTypeName: r.leaveType.name,
      fromDate: r.fromDate.toISOString(),
      toDate: r.toDate.toISOString(),
      status: r.status,
    };
  });

  return (
    <TeamCalendarClient
      monthLabel={monthStart.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
      monthStart={monthStart.toISOString()}
      monthEnd={monthEnd.toISOString()}
      reports={reports}
      entries={entries}
    />
  );
}
