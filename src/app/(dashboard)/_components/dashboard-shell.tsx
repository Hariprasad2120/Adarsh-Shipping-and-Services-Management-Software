"use client";

import { WelcomeBar } from "@/components/welcome-bar";
import { AutoBreadcrumb } from "@/components/auto-breadcrumb";
import { usePathname } from "next/navigation";

export function DashboardShell({
  children,
  userName,
  sessionToken,
}: {
  children: React.ReactNode;
  userName: string;
  sessionToken: string;
}) {
  const pathname = usePathname();
  const isCrm = pathname.startsWith("/crm");
  const isPortal = pathname === "/dashboard";

  if (isCrm || isPortal) {
    return <div className="flex flex-1 flex-col min-h-screen bg-background text-on-surface">{children}</div>;
  }

  return (
    <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden bg-background text-on-surface">
      <WelcomeBar userName={userName} sessionToken={sessionToken} />
      <AutoBreadcrumb />
      <div className="flex-1 overflow-y-auto">
        <div className="flex min-h-full w-full flex-col gap-8 px-6 py-8 lg:px-8 xl:px-10">
          {children}
        </div>
      </div>
    </div>
  );
}
