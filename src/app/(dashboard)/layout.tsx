import { NotificationProvider } from "@/components/notifications/notification-provider";
import { DashboardChromeProvider } from "@/components/dashboard-chrome";
import { Sidebar } from "@/components/sidebar";
import { MainShell } from "@/components/main-shell";
import { TodoReminderAgent } from "@/components/todo/todo-reminder-agent";
import { SessionSync } from "@/components/session-sync";
import { PageAnimator } from "@/components/page-animator";
import { auth } from "@/lib/auth";
import { CapsProvider } from "@/lib/caps-context";
import { loadCaps } from "@/lib/rbac";
import { getManagedModuleSectionIdForPath } from "@/modules/core/organisation/module-config";
import { getEnabledModuleIds } from "@/modules/core/organisation/module-settings";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "./_components/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const pathname = (await headers()).get("x-current-pathname") ?? "/dashboard";
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
        <TodoReminderAgent />
        <SessionSync />
        <DashboardChromeProvider>
          <div className="flex h-screen overflow-hidden bg-background text-foreground">
            <Sidebar caps={caps} userName={session.user.name} enabledModuleIds={enabledModuleIds} />
            <MainShell>
              <PageAnimator>
                <DashboardShell
                  userName={session.user.name}
                  sessionToken={session.user.sessionNonce}
                  enabledModuleIds={enabledModuleIds}
                >
                  {children}
                </DashboardShell>
              </PageAnimator>
            </MainShell>
          </div>
        </DashboardChromeProvider>
      </NotificationProvider>
    </CapsProvider>
  );
}
