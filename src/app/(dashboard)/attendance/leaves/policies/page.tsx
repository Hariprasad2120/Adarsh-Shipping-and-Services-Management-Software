import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { WorkspaceState } from "@/components/layout/workspace";
import { PoliciesClient } from "./policies-client";
import { ShieldAlert } from "lucide-react";

export default async function LeavePoliciesPage() {
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
        description="You need HR/admin leave-management permissions to configure leave policies. Contact your administrator if you believe this is a mistake."
      />
    );
  }

  const [leaveTypes, departments, branches, divisions, employees, roles] = await Promise.all([
    db.leaveType.findMany({
      where: { orgId: session.user.orgId! },
      include: { versions: { orderBy: { version: "desc" } } },
      orderBy: { name: "asc" },
    }),
    db.department.findMany({ where: { orgId: session.user.orgId! }, orderBy: { name: "asc" } }),
    db.branch.findMany({ where: { orgId: session.user.orgId! }, orderBy: { name: "asc" } }),
    db.division.findMany({ where: { orgId: session.user.orgId! }, orderBy: { name: "asc" } }),
    db.user.findMany({
      where: { orgId: session.user.orgId!, active: true },
      select: { id: true, name: true, designation: true, employmentType: true },
      orderBy: { name: "asc" },
    }),
    db.role.findMany({ where: { orgId: session.user.orgId! }, orderBy: { name: "asc" } }),
  ]);

  const designations = [...new Set(employees.map((e) => e.designation).filter((d): d is string => Boolean(d)))].sort();
  const employmentTypes = [...new Set(employees.map((e) => e.employmentType).filter((t): t is string => Boolean(t)))].sort();

  const rows = leaveTypes.map((lt) => ({
    id: lt.id,
    name: lt.name,
    code: lt.code,
    isCompOffType: lt.isCompOffType,
    activeVersionId: lt.activeVersionId,
    versions: lt.versions.map((v) => ({
      id: v.id,
      version: v.version,
      status: v.status,
      classification: v.classification,
      entitlementModel: v.entitlementModel,
      effectiveFrom: v.effectiveFrom.toISOString(),
    })),
  }));

  return (
    <PoliciesClient
      leaveTypes={rows}
      departments={departments.map((d) => ({ id: d.id, name: d.name }))}
      branches={branches.map((b) => ({ id: b.id, name: b.name }))}
      divisions={divisions.map((d) => ({ id: d.id, name: d.name }))}
      designations={designations}
      employmentTypes={employmentTypes}
      employees={employees.map((e) => ({ id: e.id, name: e.name }))}
      roles={roles.map((r) => ({ id: r.id, name: r.name }))}
    />
  );
}
