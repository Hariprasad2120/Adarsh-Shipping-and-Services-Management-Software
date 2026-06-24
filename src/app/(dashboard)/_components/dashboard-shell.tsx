"use client";

import { WelcomeBar } from "@/components/welcome-bar";
import { AutoBreadcrumb } from "@/components/auto-breadcrumb";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MonaProvider, useMonaChat } from "@/components/mona/mona-provider";

const MonaChat = dynamic(() => import("@/components/mona/mona-chat").then((mod) => mod.MonaChat), {
  ssr: false,
});

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
  enabledModuleIds,
}: {
  children: React.ReactNode;
  userName: string;
  sessionToken: string;
  enabledModuleIds?: Iterable<string>;
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
  const contentPaddingClass = showBreadcrumb ? "px-6 pb-8 pt-5 lg:px-8 xl:px-10" : "px-6 py-8 lg:px-8 xl:px-10";
  const topBarClass = showBreadcrumb
    ? "sticky top-0 z-40 w-full shrink-0 bg-background/95 shadow-sm backdrop-blur-sm"
    : "sticky top-0 z-40 w-full shrink-0 border-b border-outline-variant/40 bg-background/95 shadow-sm backdrop-blur-sm";

  const content = isPortal ? (
    <div className="flex min-h-full flex-1 flex-col bg-background text-on-surface" style={shellStyle}>
      <div ref={topBarRef} className={topBarClass}>
        <WelcomeBar userName={userName} sessionToken={sessionToken} enabledModuleIds={enabledModuleIds} />
      </div>
      <div className={`flex flex-1 w-full flex-col gap-8 ${contentPaddingClass}`}>
        {children}
      </div>
    </div>
  ) : isCrm ? (
    <div className="flex min-h-full flex-1 flex-col bg-background text-on-surface" style={shellStyle}>
      <div ref={topBarRef} className={topBarClass}>
        <WelcomeBar userName={userName} sessionToken={sessionToken} enabledModuleIds={enabledModuleIds} />
      </div>
      <div className={`flex flex-1 w-full flex-col gap-8 ${contentPaddingClass}`}>
        {children}
      </div>
    </div>
  ) : (
    <div className="flex min-h-full flex-1 flex-col bg-background text-on-surface" style={shellStyle}>
      <div ref={topBarRef} className={topBarClass}>
        <WelcomeBar userName={userName} sessionToken={sessionToken} enabledModuleIds={enabledModuleIds} />
      </div>
      <div
        ref={breadcrumbRef}
        className="sticky top-[var(--dashboard-topbar-height)] z-30 w-full shrink-0 bg-background/95 backdrop-blur-sm"
      >
        <AutoBreadcrumb />
      </div>
      <div
        className={`flex flex-1 w-full flex-col gap-8 ${contentPaddingClass}`}
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
