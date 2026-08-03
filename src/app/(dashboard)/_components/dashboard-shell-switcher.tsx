"use client";

import { MonolithAppShell } from "@/modules/core/components/monolith-app-shell";
import type { Caps } from "@/lib/rbac";

export function DashboardShellSwitcher({
  children,
  caps,
  enabledFeatureIds,
  enabledModuleIds,
  isPlatformAdmin,
  userId,
  userEmail,
  userName,
}: {
  children: React.ReactNode;
  caps: Caps;
  enabledFeatureIds: string[];
  enabledModuleIds: string[];
  isPlatformAdmin: boolean;
  userId: string;
  userEmail: string;
  userName: string;
}) {
  return (
    <MonolithAppShell
      caps={caps}
      enabledFeatureIds={enabledFeatureIds}
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
