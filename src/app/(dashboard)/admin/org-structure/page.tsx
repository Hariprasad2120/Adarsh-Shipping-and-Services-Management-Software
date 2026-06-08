import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getOrg } from "@/modules/core/organisation/service";
import { OrgStructureManager } from "./org-structure-manager";

export default async function OrgStructurePage() {
  const session = await auth();
  if (!session) redirect("/login");
  await requirePermission(session.user.id, "hrms.org_structure.manage");

  const org = await getOrg(session.user.orgId!);

  return (
    <div className="space-y-6">
      <h1 className="ds-h1 text-gray-900">Organisation Structure</h1>
      <OrgStructureManager org={org} />
    </div>
  );
}
