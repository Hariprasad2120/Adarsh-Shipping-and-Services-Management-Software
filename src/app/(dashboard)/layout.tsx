import { NotificationProvider } from "@/components/notifications/notification-provider";
import { Sidebar } from "@/components/sidebar";
import { PageAnimator } from "@/components/page-animator";
import { auth } from "@/lib/auth";
import { CapsProvider } from "@/lib/caps-context";
import { loadCaps } from "@/lib/rbac";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const caps = await loadCaps(session.user.id);

  return (
    <CapsProvider value={caps}>
      <NotificationProvider>
        <div className="flex min-h-screen overflow-x-clip bg-[#1a1a1a]">
          <Sidebar caps={caps} userName={session.user.name} />
          <main className="flex min-w-0 flex-1 flex-col overflow-x-clip bg-gray-50 pl-64">
            <PageAnimator>
              <div className="mx-auto flex-1 w-full max-w-7xl px-6 py-8">{children}</div>
            </PageAnimator>
          </main>
        </div>
      </NotificationProvider>
    </CapsProvider>
  );
}
