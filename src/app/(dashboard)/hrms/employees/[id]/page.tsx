import Link from "next/link";
import { auth } from "@/lib/auth";
import { getOrg, getRoles } from "@/modules/core/organisation/service";
import { getUser, listUsers } from "@/modules/core/user/service";
import { requirePermission } from "@/lib/rbac";
import { notFound, redirect } from "next/navigation";
import { EmployeeProfile } from "./employee-profile";

type EmployeeProfileProps = React.ComponentProps<typeof EmployeeProfile>;

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  await requirePermission(session.user.id, "hrms.employee.read");

  const { id } = await params;
  const [user, roles, org, allUsers] = await Promise.all([
    getUser(id),
    getRoles(session.user.orgId!),
    getOrg(session.user.orgId!),
    listUsers(session.user.orgId!),
  ]);

  if (!user) notFound();

  const { passwordHash, ...safeUser } = user;
  void passwordHash;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/hrms/employees" className="text-sm text-gray-500 hover:text-gray-700">
          ← Employees
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">{safeUser.name}</h1>
        {!safeUser.active && (
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">Inactive</span>
        )}
      </div>
      <EmployeeProfile
        user={safeUser as EmployeeProfileProps["user"]}
        roles={roles as EmployeeProfileProps["roles"]}
        org={org as EmployeeProfileProps["org"]}
        currentUserId={session.user.id}
        allUsers={allUsers as EmployeeProfileProps["allUsers"]}
      />
    </div>
  );
}
