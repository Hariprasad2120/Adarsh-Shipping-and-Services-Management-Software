import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getRoles, getAllPermissions } from "@/modules/core/organisation/service";
import { RolesManager } from "./roles-manager";

export default async function RolesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  await requirePermission(session.user.id, "admin.roles.manage");

  const [roles, permissions] = await Promise.all([
    getRoles(session.user.orgId!),
    getAllPermissions(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
      <RolesManager roles={roles as any} permissions={permissions} />
    </div>
  );
}
