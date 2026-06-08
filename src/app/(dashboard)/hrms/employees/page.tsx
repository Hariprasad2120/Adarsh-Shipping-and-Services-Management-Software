import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { listUsers } from "@/modules/core/user/service";
import { getOrg, getRoles } from "@/modules/core/organisation/service";
import { UsersRound } from "lucide-react";
import { EmployeeList } from "./employee-list";

type EmployeeListProps = React.ComponentProps<typeof EmployeeList>;

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

  const safeUsers = users.map((user) => {
    const { passwordHash, ...safeUser } = user;
    void passwordHash;
    return safeUser;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="ds-h1 heading-icon-none flex items-center gap-4 text-gray-900">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00cec4]/10 text-[#00cec4]">
            <UsersRound className="size-5" />
          </span>
          Employees
        </h1>
        <Link href="/hrms/employees/new" className="px-4 py-2 rounded-lg bg-[#00cec4] text-sm font-medium text-white transition hover:bg-[#00b5ad]">
          + Onboard
        </Link>
      </div>
      <EmployeeList
        users={safeUsers as EmployeeListProps["users"]}
        org={org as EmployeeListProps["org"]}
        roles={roles as EmployeeListProps["roles"]}
      />
    </div>
  );
}
