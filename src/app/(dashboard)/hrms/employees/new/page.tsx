import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getOrg, getRoles } from "@/modules/core/organisation/service";
import { listUsers } from "@/modules/core/user/service";
import { UserPlus } from "lucide-react";
import { OnboardForm } from "./onboard-form";
import { Breadcrumbs } from "@/components/breadcrumbs";

type OnboardFormProps = React.ComponentProps<typeof OnboardForm>;

export default async function NewEmployeePage() {
  const session = await auth();
  if (!session) redirect("/login");
  await requirePermission(session.user.id, "hrms.employee.create");

  const [org, roles, users] = await Promise.all([
    getOrg(session.user.orgId!),
    getRoles(session.user.orgId!),
    listUsers(session.user.orgId!, { active: true }),
  ]);

  const managers = users.map((user) => {
    const { passwordHash, ...manager } = user;
    void passwordHash;
    return manager;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00cec4]/10 text-[#00cec4]">
          <UserPlus className="size-5" />
        </span>
        <div className="space-y-3">
          <h1 className="ds-h1 heading-icon-none text-on-surface">Onboard Employee</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Create a new employee profile with sectioned details similar to the employee profile view.
          </p>
          <Breadcrumbs
            items={[
              { label: "HRMS", href: "/hrms" },
              { label: "Employees", href: "/hrms/employees" },
              { label: "Onboard Employee" },
            ]}
          />
        </div>
      </div>
      <OnboardForm
        org={org as OnboardFormProps["org"]}
        roles={roles as OnboardFormProps["roles"]}
        managers={managers as OnboardFormProps["managers"]}
      />
    </div>
  );
}
