import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getOrg, getRoles } from "@/modules/core/organisation/service";
import { listUsers } from "@/modules/core/user/service";
import { UserPlus } from "lucide-react";
import { OnboardForm } from "./onboard-form";

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
    <div className="max-w-2xl space-y-6">
      <h1 className="ds-h1 heading-icon-none flex items-center gap-4 text-on-surface">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00cec4]/10 text-[#00cec4]">
          <UserPlus className="size-5" />
        </span>
        Onboard Employee
      </h1>
      <OnboardForm
        org={org as OnboardFormProps["org"]}
        roles={roles as OnboardFormProps["roles"]}
        managers={managers as OnboardFormProps["managers"]}
      />
    </div>
  );
}
