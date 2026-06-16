import { NotificationProvider } from "@/components/notifications/notification-provider";
import { Sidebar } from "@/components/sidebar";
import { TodoReminderAgent } from "@/components/todo/todo-reminder-agent";
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
        <div className="flex min-h-screen overflow-x-clip bg-background text-foreground">
          <Sidebar caps={caps} userName={session.user.name} />
          <main className="flex min-w-0 flex-1 flex-col overflow-x-clip bg-background pl-57.5">
            <PageAnimator>
              <DashboardShell userName={session.user.name} sessionToken={session.user.id}>
                {children}
              </DashboardShell>
            </PageAnimator>
          </main>
        </div>
      </NotificationProvider>
    </CapsProvider>
  );
}
