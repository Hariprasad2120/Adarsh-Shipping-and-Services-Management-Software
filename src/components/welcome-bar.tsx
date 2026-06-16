"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock3,
  LayoutGrid,
  Bell,
  Settings,
  Search,
} from "lucide-react";
import { useCaps } from "@/lib/caps-context";
import { getVisibleSections, matchesPath } from "@/lib/navigation";

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function AppHeader({
  userName,
  sessionToken,
}: {
  userName: string;
  sessionToken: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const caps = useCaps();
  const [now, setNow] = useState<Date | null>(null);
  const firstName = useMemo(
    () => toTitleCase(userName.split(" ")[0] || "there"),
    [userName],
  );

  useEffect(() => {
    const initialTick = window.setTimeout(() => setNow(new Date()), 0);
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.clearTimeout(initialTick);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const storageKey = `welcome-toast:${sessionToken}`;
    if (window.sessionStorage.getItem(storageKey)) return;
    window.sessionStorage.setItem(storageKey, "shown");
    toast.success(`Welcome back, ${firstName}`, {
      description: "Your performance workspace is ready.",
      duration: 5000,
      position: "top-center",
    });
  }, [firstName, sessionToken]);

  const visibleSections = useMemo(() => getVisibleSections(caps), [caps]);
  const activeSection = useMemo(
    () =>
      visibleSections.find((section) =>
        matchesPath(pathname, section.href, section.matchPaths),
      ) ?? visibleSections[0],
    [pathname, visibleSections],
  );
  const activeItem = useMemo(
    () =>
      activeSection?.items.find((item) =>
        matchesPath(pathname, item.href, item.matchPaths),
      ) ?? null,
    [activeSection, pathname],
  );

  const dateLabel = now
    ? now.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Loading date";
  const timeLabel = now
    ? now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "--:--";
  const workspaceLabel = activeItem?.label ?? activeSection?.label ?? "Workspace";
  const workspaceHref = activeItem?.href ?? activeSection?.href ?? "/dashboard";
  const canOpenSettings = Boolean(caps["admin.org.manage"]);

  const SectionIcon = activeSection?.icon ?? LayoutGrid;

  return (
    <header className="sticky top-0 z-20 h-14 shrink-0 border-b border-outline-variant/60 bg-surface/90 backdrop-blur-sm flex items-center justify-between px-6 lg:px-8 xl:px-10">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#00cec4]/10">
          <SectionIcon size={16} className="text-[#00cec4]" />
        </div>
        <h1 className="ds-h3 heading-icon-none text-on-surface">{workspaceLabel}</h1>
      </div>

      <div className="hidden flex-1 max-w-md mx-4 xl:block">
        <div className="flex items-center gap-3 rounded-xl border border-outline-variant/60 bg-surface px-4 py-1.5 text-on-surface-variant shadow-sm">
          <Search className="size-4 shrink-0 text-[#00a99f]" />
          <span className="truncate text-[13px]">{firstName}&apos;s workspace — {workspaceLabel}</span>
        </div>
      </div>

      <div className="flex items-center gap-3.5">
        <span className="hidden items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface px-3 py-1.5 text-xs text-on-surface-variant shadow-sm lg:inline-flex">
          <CalendarDays className="size-3.5 text-[#00a99f]" />
          {dateLabel}
        </span>
        <span className="hidden items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface px-3 py-1.5 text-xs tabular-nums text-on-surface shadow-sm md:inline-flex">
          <Clock3 className="size-3.5 text-[#00a99f]" />
          {timeLabel}
        </span>
        <button
          type="button"
          onClick={() => router.push("/notifications")}
          className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-full transition-all cursor-pointer"
          title="Notifications"
        >
          <Bell className="size-4.5" />
        </button>
        {canOpenSettings ? (
          <button
            type="button"
            onClick={() => router.push("/admin/settings")}
            className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-full transition-all cursor-pointer"
            title="Settings"
          >
            <Settings className="size-4.5" />
          </button>
        ) : null}
      </div>
    </header>
  );
}

export const WelcomeBar = AppHeader;
