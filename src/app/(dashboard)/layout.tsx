import { NotificationProvider } from "@/components/notifications/notification-provider";
import { Sidebar } from "@/components/sidebar";
import { MainShell } from "@/components/main-shell";
import { TodoReminderAgent } from "@/components/todo/todo-reminder-agent";
import { SessionSync } from "@/components/session-sync";
import { PageAnimator } from "@/components/page-animator";
import { auth } from "@/lib/auth";
import { CapsProvider } from "@/lib/caps-context";
import { loadCaps } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { DashboardShell } from "./_components/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const caps = await loadCaps(session.user.id);

  return (
    <CapsProvider value={caps}>
      <NotificationProvider>
        <TodoReminderAgent />
        <SessionSync />
        <div className="flex h-screen overflow-hidden bg-background text-foreground">
          <Sidebar caps={caps} userName={session.user.name} />
          <MainShell>
            <PageAnimator>
              <DashboardShell userName={session.user.name} sessionToken={session.user.sessionNonce}>
                {children}
              </DashboardShell>
            </PageAnimator>
          </MainShell>
        </div>
      </NotificationProvider>
    </CapsProvider>
  );
}
