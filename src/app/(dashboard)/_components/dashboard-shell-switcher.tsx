"use client";

import { DashboardChromeProvider } from "@/components/dashboard-chrome";
import { MainShell } from "@/components/main-shell";
import { MonolithAppShell } from "@/components/monolith/app-shell";
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

const MONOLITH_MIGRATED_ROUTES = new Set([
  "/dashboard",
  "/account/security",
  "/admin/design-system",
  "/notifications",
  "/product-catalogue",
  "/todo",
]);

export function usesMonolithShell(pathname: string | null) {
  return MONOLITH_MIGRATED_ROUTES.has(normalizePathname(pathname));
}

export function DashboardShellSwitcher({
  children,
  caps,
  enabledModuleIds,
  isPlatformAdmin,
  sessionToken,
  userEmail,
  userName,
}: {
  children: React.ReactNode;
  caps: Caps;
  enabledModuleIds: string[];
  isPlatformAdmin: boolean;
  sessionToken: string;
  userEmail: string;
  userName: string;
}) {
  const pathname = normalizePathname(usePathname());
  const isMonolithRoute = usesMonolithShell(pathname);

  if (isMonolithRoute) {
    return (
      <MonolithAppShell
        caps={caps}
        enabledModuleIds={enabledModuleIds}
        isPlatformAdmin={isPlatformAdmin}
        userEmail={userEmail}
        userName={userName}
      >
        {children}
      </MonolithAppShell>
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
