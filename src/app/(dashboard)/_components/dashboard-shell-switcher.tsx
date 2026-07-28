"use client";

import { MonolithDashboardShell } from "@/components/monolith/monolith-dashboard-shell";
import type { Caps } from "@/lib/rbac";

export function DashboardShellSwitcher({
  children,
  caps,
  enabledModuleIds,
  userName,
}: {
  children: React.ReactNode;
  caps: Caps;
  enabledModuleIds: string[];
  sessionToken: string;
  userName: string;
}) {
  return (
    <MonolithDashboardShell
      caps={caps}
      userName={userName}
      enabledModuleIds={enabledModuleIds}
    >
      {children}
    </MonolithDashboardShell>
  );
}
