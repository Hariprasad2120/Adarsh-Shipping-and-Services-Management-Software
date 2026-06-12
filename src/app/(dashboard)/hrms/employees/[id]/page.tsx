import { CircleUserRound } from "lucide-react";
import { auth } from "@/lib/auth";
import { getOrg, getRoles } from "@/modules/core/organisation/service";
import { getUser, listUsers } from "@/modules/core/user/service";
import { requirePermission } from "@/lib/rbac";
import { notFound, redirect } from "next/navigation";
import { EmployeeProfile } from "./employee-profile";
import { Breadcrumbs } from "@/components/breadcrumbs";

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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h1 className="ds-h1 heading-icon-none flex items-center gap-4 text-gray-900">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00cec4]/10 text-[#00cec4]">
                <CircleUserRound className="size-5" />
              </span>
              {safeUser.name}
            </h1>
            {!safeUser.active && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">Inactive</span>
            )}
          </div>
          <Breadcrumbs
            items={[
              { label: "HRMS", href: "/hrms" },
              { label: "Employees", href: "/hrms/employees" },
              { label: safeUser.name },
            ]}
          />
        </div>
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
