import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can, requirePermission } from "@/lib/rbac";
import { listUsers } from "@/modules/core/user/service";
import { getOrg, getRoles } from "@/modules/core/organisation/service";
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
  const session = await getSession();

  if (!session) redirect("/login");

  await requirePermission(session.user.id, "hrms.employee.read");

  const sp = await searchParams;
  const accountStatus =
    sp.active === undefined || sp.active === "all"
      ? undefined
      : sp.active === "true";
  const invitationStatus = sp.active === "invited" ? "INVITED" : undefined;
  const employeeStatus =
    sp.employeeStatus === "ACTIVE" || sp.employeeStatus === "EXITED"
      ? sp.employeeStatus
      : undefined;

  const [users, org, roles, canCreateEmployee] = await Promise.all([
    listUsers(session.user.orgId!, {
      branchId: sp.branchId,
      departmentId: sp.departmentId,
      roleId: sp.roleId,
      search: sp.search,
      active: accountStatus,
      invitationStatus,
      employeeStatus,
      onboardingStatus: sp.onboardingStatus,
      take: 10_000,
    }),
    getOrg(session.user.orgId!),
    getRoles(session.user.orgId!),
    can(session.user.id, "hrms.employee.create"),
  ]);

  const safeUsers = users.map((user) => {
    const { passwordHash, ...safeUser } = user;
    void passwordHash;
    return safeUser;
  });

  return (
    <div className="mnx-employee-directory-page">
      <div className="flex items-start justify-between gap-4">
        <EmployeeDirectoryActions
          canCreateEmployee={canCreateEmployee}
          org={org as EmployeeDirectoryActionsProps["org"]}
          roles={roles as EmployeeDirectoryActionsProps["roles"]}
          totalCount={safeUsers.length}
        />
      </div>

      <EmployeeList
        currentUserId={session.user.id}
        users={safeUsers as EmployeeListProps["users"]}
      />
    </div>
  );
}
