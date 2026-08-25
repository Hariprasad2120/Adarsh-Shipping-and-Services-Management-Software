import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { OwnershipReportingWorkspace } from "@/modules/hrms/components/ownership-reporting-workspace";

export const metadata = {
  title: "Ownership | HRMS | Adarsh Shipping",
};

async function loadOwnershipWorkspace(orgId: string) {
  const [users, departments, divisions] = await Promise.all([
    db.user.findMany({
      where: { active: true, isPlatformAdmin: false, orgId },
      orderBy: [{ employeeNumber: "asc" }, { name: "asc" }],
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        department: true,
        division: true,
      },
    }),
    db.department.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
    }),
    db.division.findMany({
      where: { orgId },
      orderBy: [{ departmentId: "asc" }, { name: "asc" }],
    }),
  ]);

  return {
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      employeeNumber:
        user.employeeNumber === null ? null : String(user.employeeNumber),
      designation: user.designation,
      departmentId: user.departmentId,
      departmentName: user.department?.name ?? null,
      divisionId: user.divisionId,
      divisionName: user.division?.name ?? null,
      tlId: user.tlId,
      managerId: user.managerId,
      roles: user.roles.map((roleAssignment) => roleAssignment.role.name),
    })),
    departments: departments.map((department) => ({
      id: department.id,
      name: department.name,
    })),
    divisions: divisions.map((division) => ({
      id: division.id,
      name: division.name,
      departmentId: division.departmentId,
    })),
  };
}

export default async function OwnershipPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await requirePermission(session.user.id, "hrms.hierarchy.manage");
  const orgId = session.user.orgId;

  if (!orgId) {
    return (
      <div className="mnx-people-empty">
        Organisation configuration missing for this workspace.
      </div>
    );
  }

  const workspaceData = await loadOwnershipWorkspace(orgId);

  return <OwnershipReportingWorkspace {...workspaceData} />;
}
