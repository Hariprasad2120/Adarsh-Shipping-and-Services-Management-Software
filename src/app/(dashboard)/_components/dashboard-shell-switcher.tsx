"use client";

import { MonolithAppShell } from "@/components/monolith/app-shell";
import type { Caps } from "@/lib/rbac";

export function DashboardShellSwitcher({
  children,
  caps,
  enabledModuleIds,
  isPlatformAdmin,
  userId,
  userEmail,
  userName,
}: {
  children: React.ReactNode;
  caps: Caps;
  enabledModuleIds: string[];
  isPlatformAdmin: boolean;
  userId: string;
  userEmail: string;
  userName: string;
}) {
  return (
    <MonolithAppShell
      caps={caps}
      enabledModuleIds={enabledModuleIds}
      isPlatformAdmin={isPlatformAdmin}
      userId={userId}
      userEmail={userEmail}
      userName={userName}
    >
      {children}
    </MonolithAppShell>
  );
}
