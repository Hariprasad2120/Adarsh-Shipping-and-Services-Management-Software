import { ModuleHome } from "@/components/module-home";
import { auth } from "@/lib/auth";
import { getVisibleSectionById } from "@/lib/navigation";
import { loadCaps } from "@/lib/rbac";
import { getOrg, getRoles } from "@/modules/core/organisation/service";
import { listUsers } from "@/modules/core/user/service";
import { redirect } from "next/navigation";

export default async function HRMSPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [caps, users, org, roles] = await Promise.all([
    loadCaps(session.user.id),
    listUsers(session.user.orgId!, { active: true }),
    getOrg(session.user.orgId!),
    getRoles(session.user.orgId!),
  ]);
  const section = getVisibleSectionById(caps, "hrms");

  const quickLinks =
    section?.items.map((item) => ({
      href: item.href,
      label: item.label,
      icon: item.icon,
      description:
        item.href === "/hrms/employees"
          ? "Browse the employee directory, profiles, and reporting lines."
          : "Add a new employee and complete their onboarding details.",
    })) ?? [];

  return (
    <ModuleHome
      title="HRMS"
      description="Manage your workforce from one place, from employee records and reporting structure to onboarding new hires into the organisation."
      stats={[
        { label: "Active employees", value: users.length.toString(), tone: "teal" },
        { label: "Branches", value: org?.branches.length.toString() ?? "0", tone: "blue" },
        { label: "Departments", value: org?.departments.length.toString() ?? "0", tone: "amber" },
        { label: "Roles", value: roles.length.toString(), tone: "slate" },
      ]}
      quickLinks={quickLinks}
    />
  );
}
