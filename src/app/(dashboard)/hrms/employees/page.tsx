import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { listUsers } from "@/modules/core/user/service";
import { getOrg, getRoles } from "@/modules/core/organisation/service";
import { EmployeeList } from "./employee-list";

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const session = await auth();
  if (!session) redirect("/login");
  await requirePermission(session.user.id, "hrms.employee.read");

  const sp = await searchParams;
  const [users, org, roles] = await Promise.all([
    listUsers(session.user.orgId!, {
      branchId: sp.branchId,
      departmentId: sp.departmentId,
      roleId: sp.roleId,
      search: sp.search,
      active: sp.active !== undefined ? sp.active !== "false" : true,
    }),
    getOrg(session.user.orgId!),
    getRoles(session.user.orgId!),
  ]);

  const safeUsers = users.map(({ passwordHash: _, ...u }) => u);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
        <a href="/hrms/employees/new" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition">
          + Onboard
        </a>
      </div>
      <EmployeeList users={safeUsers as any} org={org as any} roles={roles as any} />
    </div>
  );
}
