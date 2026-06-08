import { ModuleHome } from "@/components/module-home";
import { auth } from "@/lib/auth";
import { getVisibleSectionById } from "@/lib/navigation";
import { loadCaps } from "@/lib/rbac";
import { redirect } from "next/navigation";

export default async function CRMPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const caps = await loadCaps(session.user.id);
  const section = getVisibleSectionById(caps, "crm");
  const quickLinks =
    section?.items.map((item) => ({
      href: item.href,
      label: item.label,
      icon: item.icon,
      description: "Open the CRM workspace and track the next customer-facing workflows as they roll out.",
    })) ?? [];

  return (
    <ModuleHome
      title="CRM"
      description="This module is reserved for customer relationship workflows. The overview page is in place so the navigation stays consistent as CRM capabilities are added."
      stats={[
        { label: "Live tools", value: quickLinks.length.toString(), tone: "teal" },
        { label: "Status", value: "Planned", tone: "slate" },
      ]}
      quickLinks={quickLinks}
      pageIcon={section?.icon}
    />
  );
}
