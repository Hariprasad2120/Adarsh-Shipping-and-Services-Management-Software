"use client";

import { WelcomeBar } from "@/components/welcome-bar";
import { AutoBreadcrumb } from "@/components/auto-breadcrumb";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  const showBreadcrumb = !isPortal && !isCrm;
  const topBarRef = useRef<HTMLDivElement | null>(null);
  const breadcrumbRef = useRef<HTMLDivElement | null>(null);
  const [topBarHeight, setTopBarHeight] = useState(56);
  const [breadcrumbHeight, setBreadcrumbHeight] = useState(0);

  useEffect(() => {
    const topBarNode = topBarRef.current;
    const breadcrumbNode = breadcrumbRef.current;
    if (!topBarNode) return;

    const updateHeights = () => {
      setTopBarHeight(topBarNode.getBoundingClientRect().height || 56);
      setBreadcrumbHeight(breadcrumbNode?.getBoundingClientRect().height || 0);
    };

    updateHeights();

    const topObserver = new ResizeObserver(updateHeights);
    topObserver.observe(topBarNode);

    const breadcrumbObserver = breadcrumbNode ? new ResizeObserver(updateHeights) : null;
    if (breadcrumbNode && breadcrumbObserver) {
      breadcrumbObserver.observe(breadcrumbNode);
    }

    window.addEventListener("resize", updateHeights);
    return () => {
      topObserver.disconnect();
      breadcrumbObserver?.disconnect();
      window.removeEventListener("resize", updateHeights);
    };
  }, [showBreadcrumb]);

  const shellStyle = {
    ["--dashboard-topbar-height" as string]: `${topBarHeight}px`,
    ["--dashboard-breadcrumb-height" as string]: `${breadcrumbHeight}px`,
  } as React.CSSProperties;

  const content = isPortal ? (
    <div className="flex min-h-full flex-1 flex-col bg-background text-on-surface" style={shellStyle}>
      <div ref={topBarRef} className="sticky top-0 z-40 w-full shrink-0 border-b border-outline-variant/40 bg-background/95 shadow-sm backdrop-blur-sm">
        <WelcomeBar userName={userName} sessionToken={sessionToken} />
      </div>
      <div className="flex min-h-full w-full flex-col gap-8 px-6 py-8 lg:px-8 xl:px-10">
        {children}
      </div>
    </div>
  ) : isCrm ? (
    <div className="flex min-h-full flex-1 flex-col bg-background text-on-surface" style={shellStyle}>
      <div ref={topBarRef} className="sticky top-0 z-40 w-full shrink-0 border-b border-outline-variant/40 bg-background/95 shadow-sm backdrop-blur-sm">
        <WelcomeBar userName={userName} sessionToken={sessionToken} />
      </div>
      <div className="flex min-h-full w-full flex-col gap-8 px-6 py-8 lg:px-8 xl:px-10">
        {children}
      </div>
    </div>
  ) : (
    <div className="flex min-h-full flex-1 flex-col bg-background text-on-surface" style={shellStyle}>
      <div ref={topBarRef} className="sticky top-0 z-40 w-full shrink-0 border-b border-outline-variant/40 bg-background/95 shadow-sm backdrop-blur-sm">
        <WelcomeBar userName={userName} sessionToken={sessionToken} />
      </div>
      <div
        ref={breadcrumbRef}
        className="sticky top-[var(--dashboard-topbar-height)] z-30 w-full shrink-0 border-b border-outline-variant/35 bg-background/98 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.24)] backdrop-blur-sm"
      >
        <AutoBreadcrumb />
      </div>
      <div
        className="flex min-h-full w-full flex-col gap-8 px-6 py-8 lg:px-8 xl:px-10"
        style={{
          scrollPaddingTop: `calc(var(--dashboard-topbar-height) + var(--dashboard-breadcrumb-height) + 1rem)`,
        }}
      >
        {children}
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
