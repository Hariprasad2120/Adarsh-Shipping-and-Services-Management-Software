import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getOrg, getRoles } from "@/modules/core/organisation/service";
import { listUsers } from "@/modules/core/user/service";
import { OnboardForm } from "./onboard-form";

export default async function NewEmployeePage() {
  const session = await auth();
  if (!session) redirect("/login");
  await requirePermission(session.user.id, "hrms.employee.create");

  const [org, roles, users] = await Promise.all([
    getOrg(session.user.orgId!),
    getRoles(session.user.orgId!),
    listUsers(session.user.orgId!, { active: true }),
  ]);

  const managers = users.map(({ passwordHash: _, ...u }) => u);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Onboard Employee</h1>
      <OnboardForm org={org as any} roles={roles as any} managers={managers as any} />
    </div>
  );
}
