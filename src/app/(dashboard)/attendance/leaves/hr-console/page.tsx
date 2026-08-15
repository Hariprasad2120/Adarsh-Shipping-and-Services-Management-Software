import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { WorkspaceState } from "@/components/layout/workspace";
import { HrConsoleClient } from "./hr-console-client";
import { ShieldAlert } from "lucide-react";

export default async function LeaveHrConsolePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const authorized = await can(session.user.id, "attendance.leave.manage");
  if (!authorized) {
    return (
      <WorkspaceState
        variant="danger"
        eyebrow="Leave management"
        icon={<ShieldAlert aria-hidden="true" />}
        title="Access denied"
        description="You need HR/admin leave-management permissions to view this console. Contact your administrator if you believe this is a mistake."
      />
    );
  }

  const orgId = session.user.orgId!;

  const [employees, leaveTypes, pendingCompOff, pendingGrants] = await Promise.all([
    db.user.findMany({
      where: { orgId, active: true },
      select: { id: true, name: true, employeeNumber: true },
      orderBy: { name: "asc" },
    }),
    db.leaveType.findMany({ where: { orgId }, orderBy: { name: "asc" } }),
    db.compOffCredit.findMany({
      where: { orgId, status: "PENDING_APPROVAL" },
      include: { user: { select: { name: true } } },
      orderBy: { earnedDate: "desc" },
    }),
    db.leaveGrant.findMany({
      where: { orgId, status: "PENDING" },
      include: { user: { select: { name: true } }, leaveType: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <HrConsoleClient
      employees={employees.map((e) => ({ id: e.id, name: e.name, employeeNumber: e.employeeNumber }))}
      leaveTypes={leaveTypes.map((lt) => ({ id: lt.id, name: lt.name }))}
      pendingCompOff={pendingCompOff.map((c) => ({
        id: c.id,
        userName: c.user.name,
        earnedDate: c.earnedDate.toISOString(),
        sourceType: c.sourceType,
        units: c.units.toNumber(),
      }))}
      pendingGrants={pendingGrants.map((g) => ({
        id: g.id,
        userName: g.user.name,
        leaveTypeName: g.leaveType.name,
        amount: g.amount.toNumber(),
        reason: g.reason,
      }))}
    />
  );
}
