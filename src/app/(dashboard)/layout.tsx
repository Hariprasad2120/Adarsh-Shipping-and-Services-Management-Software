import { NotificationProvider } from "@/modules/notifications/components/notification-provider";
import { SessionSync } from "@/components/providers/session-sync";
import { CapsProvider } from "@/lib/caps-context";
import { getDashboardContext } from "@/lib/dashboard-context";
import {
  getManagedFeatureIdForPath,
  getManagedModuleSectionIdForPath,
} from "@/modules/core/organisation/module-config";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShellSwitcher } from "./_components/dashboard-shell-switcher";

function normalizePathname(pathname: string | null) {
  if (!pathname) return "/dashboard";
  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getDashboardContext();
  if (!context) redirect("/login");
  if (!context.orgId) redirect("/setup");

  const pathname = normalizePathname(
    (await headers()).get("x-current-pathname"),
  );
  const { session, caps, enabledFeatureIds, enabledModuleIds } = context;
  const managedSectionId = getManagedModuleSectionIdForPath(pathname);
  const managedFeatureId = getManagedFeatureIdForPath(pathname);
  const enabledModuleSet = new Set(enabledModuleIds);
  const enabledFeatureSet = new Set(enabledFeatureIds);

  if (managedSectionId && !enabledModuleSet.has(managedSectionId)) {
    redirect("/dashboard");
  }

  if (managedFeatureId && !enabledFeatureSet.has(managedFeatureId)) {
    redirect("/cha");
  }

  return (
    <CapsProvider value={caps}>
      <NotificationProvider>
        <SessionSync />
        <DashboardShellSwitcher
          caps={caps}
          enabledFeatureIds={enabledFeatureIds}
          isPlatformAdmin={session.user.isPlatformAdmin}
          userEmail={session.user.email}
          userName={session.user.name}
          userId={session.user.id}
          enabledModuleIds={enabledModuleIds}
        >
          {children}
        </DashboardShellSwitcher>
      </NotificationProvider>
    </CapsProvider>
  );
}
