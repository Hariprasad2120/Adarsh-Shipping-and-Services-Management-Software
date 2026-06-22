import { ModuleHome } from "@/components/module-home";
import { auth } from "@/lib/auth";
import { getVisibleSectionById } from "@/lib/navigation";
import { can } from "@/lib/rbac";
import { loadCaps } from "@/lib/rbac";
import { getOrg, getRoles } from "@/modules/core/organisation/service";
import { getAppraisalSettings } from "@/modules/ams/settings";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const allowed = await can(session.user.id, "admin.org.manage");
  if (!allowed) redirect("/dashboard");

  const [caps, org, roles, settings] = await Promise.all([
    loadCaps(session.user.id),
    getOrg(session.user.orgId!),
    getRoles(session.user.orgId!),
    getAppraisalSettings(session.user.orgId!),
  ]);
  const section = getVisibleSectionById(caps, "admin");

  const quickLinks =
    section?.items.map((item) => ({
      href: item.href,
      label: item.label,
      icon: item.icon,
      description:
        item.href === "/admin/roles"
          ? "Manage roles and the permissions assigned across teams."
          : item.href === "/admin/settings"
              ? "Control appraisal configuration such as reviewer availability deadlines."
              : item.href === "/admin/notifications"
                ? "Monitor notification delivery, acknowledgement, dismissal, and resend history."
              : "Work with the simulated date tools used to test time-driven flows.",
    })) ?? [];

  return (
    <ModuleHome
      title="Admin"
      description="Configure the organisation backbone for the platform, including structure, role access, appraisal settings, and simulation tools used by administrators."
      stats={[
        { label: "Branches", value: org?.branches.length.toString() ?? "0", tone: "teal" },
        { label: "Departments", value: org?.departments.length.toString() ?? "0", tone: "blue" },
        { label: "Roles", value: roles.length.toString(), tone: "amber" },
        {
          label: "Reviewer deadline",
          value: `${settings.availabilityDeadlineDays} day${settings.availabilityDeadlineDays === 1 ? "" : "s"}`,
          tone: "slate",
        },
      ]}
      quickLinks={quickLinks}
      pageIcon={section?.icon}
    />
  );
}
