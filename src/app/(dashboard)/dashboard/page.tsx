import { ModuleHome } from "@/components/module-home";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getVisibleSections } from "@/lib/navigation";
import { loadCaps } from "@/lib/rbac";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [caps, unreadNotifications] = await Promise.all([
    loadCaps(session.user.id),
    db.notification.count({ where: { userId: session.user.id, readAt: null } }),
  ]);
  const sections = getVisibleSections(caps);
  const quickLinks = sections
    .slice(1, 5)
    .map((section) => ({
      href: section.href,
      label: section.label,
      icon: section.icon,
      description: `Open the ${section.label} workspace and continue from its module dashboard.`,
    }));

  return (
    <ModuleHome
      title={`Welcome back, ${session.user.name}`}
      description="Use the dashboard as your workspace launchpad. Each module now has its own home page with shortcuts and status context, and the related links stay nested directly in the sidebar."
      stats={[
        { label: "Available modules", value: sections.length.toString(), tone: "teal" },
        { label: "Unread notifications", value: unreadNotifications.toString(), tone: "amber" },
      ]}
      quickLinks={quickLinks}
    />
  );
}
