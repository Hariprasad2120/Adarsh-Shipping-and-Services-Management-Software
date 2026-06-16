"use client";

import { WelcomeBar } from "@/components/welcome-bar";
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
  const isPeoplePlus = pathname.startsWith("/hrms/peopleplus");

  if (isCrm) {
    return <div className="flex flex-1 flex-col min-h-screen bg-[#0f1319] text-[#e2e8f0]">{children}</div>;
  }

  if (isPeoplePlus) {
    return <div className="flex flex-1 flex-col min-h-screen bg-[#f5f7fb] dark:bg-[#0f1319] text-[#1f2937] dark:text-[#e2e8f0]">{children}</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-8 py-7">
      <WelcomeBar userName={userName} sessionToken={sessionToken} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
