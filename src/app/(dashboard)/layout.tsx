import { NotificationProvider } from "@/components/notifications/notification-provider";
import { SessionSync } from "@/components/session-sync";
import { getSession } from "@/lib/auth";
import { CapsProvider } from "@/lib/caps-context";
import { loadCaps } from "@/lib/rbac";
import { getManagedModuleSectionIdForPath } from "@/modules/core/organisation/module-config";
import { getEnabledModuleIds } from "@/modules/core/organisation/module-settings";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShellSwitcher } from "./_components/dashboard-shell-switcher";

function normalizePathname(pathname: string | null) {
  if (!pathname) return "/dashboard";
  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const pathname = normalizePathname((await headers()).get("x-current-pathname"));
  const [caps, enabledModuleIds] = await Promise.all([
    loadCaps(session.user.id),
    getEnabledModuleIds(session.user.orgId!),
  ]);
  const managedSectionId = getManagedModuleSectionIdForPath(pathname);
  const enabledModuleSet = new Set(enabledModuleIds);

  if (managedSectionId && !enabledModuleSet.has(managedSectionId)) {
    redirect("/dashboard");
  }

  return (
    <CapsProvider value={caps}>
      <NotificationProvider>
        <SessionSync />
        <DashboardShellSwitcher
          caps={caps}
          isPlatformAdmin={session.user.isPlatformAdmin}
          userEmail={session.user.email}
          userName={session.user.name}
          sessionToken={session.user.sessionNonce}
          userId={session.user.id}
          enabledModuleIds={enabledModuleIds}
        >
          {children}
        </DashboardShellSwitcher>
      </NotificationProvider>
    </CapsProvider>
  );
}
