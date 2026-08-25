import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getOrg } from "@/modules/core/organisation/service";
import { listUsersForDashboard } from "@/modules/core/user/service";
import { OrganisationStructureWorkspace } from "@/modules/hrms/components/organisation-structure-workspace";

export default async function HrmsOrgStructurePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await requirePermission(session.user.id, "hrms.org_structure.manage");

  const [org, employees] = await Promise.all([
    getOrg(session.user.orgId!),
    listUsersForDashboard(session.user.orgId!, { active: true, take: 300 }),
  ]);

  return <OrganisationStructureWorkspace org={org} employees={employees} />;
}
