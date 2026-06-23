"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

export function MainShell({ children }: { children: React.ReactNode }) {
  const [pl, setPl] = useState("14.375rem");

  useEffect(() => {
    const update = () => {
      const collapsed =
        document.documentElement.getAttribute("data-sidebar-collapsed") === "true";
      setPl(collapsed ? "3.5rem" : "14.375rem");
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-sidebar-collapsed"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <main
      className="flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-clip bg-background pl-0 transition-[padding-left] duration-300 lg:pl-[var(--sidebar-width)]"
      style={{ ["--sidebar-width" as string]: pl } as CSSProperties}
    >
      {children}
    </main>
  );
}
