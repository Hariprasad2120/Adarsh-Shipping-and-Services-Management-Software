import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getOrg, getRoles } from "@/modules/core/organisation/service";
import { listUsers } from "@/modules/core/user/service";
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
    <div className="space-y-6">
      <OnboardForm
        org={org as OnboardFormProps["org"]}
        roles={roles as OnboardFormProps["roles"]}
        managers={managers as OnboardFormProps["managers"]}
      />
    </div>
  );
}
