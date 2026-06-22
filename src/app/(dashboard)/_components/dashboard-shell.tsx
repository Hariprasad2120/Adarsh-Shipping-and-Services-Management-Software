"use client";

import { WelcomeBar } from "@/components/welcome-bar";
import { AutoBreadcrumb } from "@/components/auto-breadcrumb";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { MonaProvider, useMonaChat } from "@/components/mona/mona-provider";
import { MonaChat } from "@/components/mona/mona-chat";

/** Keyboard shortcut handler — Ctrl+M to toggle Mona */
function MonaKeyboardShortcut() {
  const { toggleChat } = useMonaChat();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "m") {
        e.preventDefault();
        toggleChat();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleChat]);

  return null;
}

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

  const content = isPortal ? (
    <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden bg-background text-on-surface">
      <WelcomeBar userName={userName} sessionToken={sessionToken} />
      <div className="flex-1 overflow-y-auto">
        <div className="flex min-h-full w-full flex-col gap-8 px-6 py-8 lg:px-8 xl:px-10">
          {children}
        </div>
      </div>
    </div>
  ) : isCrm ? (
    <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden bg-background text-on-surface">
      <WelcomeBar userName={userName} sessionToken={sessionToken} />
      <div className="flex-1 overflow-y-auto">
        <div className="flex min-h-full w-full flex-col gap-8 px-6 py-8 lg:px-8 xl:px-10">
          {children}
        </div>
      </div>
    </div>
  ) : (
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

  return (
    <MonaProvider>
      <MonaKeyboardShortcut />
      {content}
      <MonaChat />
    </MonaProvider>
  );
}
