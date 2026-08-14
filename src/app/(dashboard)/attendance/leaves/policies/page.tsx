import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import { PoliciesClient } from "./policies-client";

export default async function LeavePoliciesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePermission(session.user.id, "attendance.leave.manage");

  const [leaveTypes, departments, branches] = await Promise.all([
    db.leaveType.findMany({
      where: { orgId: session.user.orgId! },
      include: { versions: { orderBy: { version: "desc" } } },
      orderBy: { name: "asc" },
    }),
    db.department.findMany({ where: { orgId: session.user.orgId! }, orderBy: { name: "asc" } }),
    db.branch.findMany({ where: { orgId: session.user.orgId! }, orderBy: { name: "asc" } }),
  ]);

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
    />
  );
}
