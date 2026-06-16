import { auth } from "@/lib/auth";
import { getOrg, getRoles } from "@/modules/core/organisation/service";
import { getUser, listUsers } from "@/modules/core/user/service";
import { requirePermission } from "@/lib/rbac";
import { notFound, redirect } from "next/navigation";
import { EmployeeProfile } from "./employee-profile";
import { BreadcrumbLabel } from "@/components/breadcrumb-label";

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
      <BreadcrumbLabel segment={id} label={safeUser.name} />
      {!safeUser.active && (
        <span className="self-start rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">Inactive</span>
      )}
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
