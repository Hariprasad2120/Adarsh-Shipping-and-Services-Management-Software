import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { listUsers } from "@/modules/core/user/service";
import { getOrg, getRoles } from "@/modules/core/organisation/service";
import { UsersRound } from "lucide-react";
import { EmployeeDirectoryActions } from "./employee-directory-actions";
import { EmployeeList } from "./employee-list";

type EmployeeListProps = React.ComponentProps<typeof EmployeeList>;
type EmployeeDirectoryActionsProps = React.ComponentProps<
  typeof EmployeeDirectoryActions
>;

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
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
      <div className="flex items-start justify-between gap-4">
        <EmployeeDirectoryActions
          org={org as EmployeeDirectoryActionsProps["org"]}
          roles={roles as EmployeeDirectoryActionsProps["roles"]}
        />
      </div>

      <EmployeeList users={safeUsers as EmployeeListProps["users"]} />
    </div>
  );
}