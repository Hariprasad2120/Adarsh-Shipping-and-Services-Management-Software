"use client";

import { DashboardChromeProvider } from "@/components/dashboard-chrome";
import { MainShell } from "@/components/main-shell";
import { MonolithDashboardShell } from "@/components/monolith/monolith-dashboard-shell";
import { PageAnimator } from "@/components/page-animator";
import { Sidebar } from "@/components/sidebar";
import { usePathname } from "next/navigation";
import type { Caps } from "@/lib/rbac";
import { DashboardShell } from "./dashboard-shell";

function normalizePathname(pathname: string | null) {
  if (!pathname) return "/";
  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
}

export function DashboardShellSwitcher({
  children,
  caps,
  enabledModuleIds,
  sessionToken,
  userName,
}: {
  children: React.ReactNode;
  caps: Caps;
  enabledModuleIds: string[];
  sessionToken: string;
  userName: string;
}) {
  const pathname = normalizePathname(usePathname());
  const isMonolithDashboard = pathname === "/dashboard";

  if (isMonolithDashboard) {
    return (
      <MonolithDashboardShell caps={caps} userName={userName} enabledModuleIds={enabledModuleIds}>
        {children}
      </MonolithDashboardShell>
    );
  }

  return (
    <DashboardChromeProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Sidebar caps={caps} userName={userName} enabledModuleIds={enabledModuleIds} />
        <MainShell>
          <PageAnimator>
            <DashboardShell
              userName={userName}
              sessionToken={sessionToken}
              enabledModuleIds={enabledModuleIds}
            >
              {children}
            </DashboardShell>
          </PageAnimator>
        </MainShell>
      </div>
    </DashboardChromeProvider>
  );
}
