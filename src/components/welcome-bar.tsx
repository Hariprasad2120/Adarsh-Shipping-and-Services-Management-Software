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
import { motion, AnimatePresence } from "framer-motion";

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
  const [showWelcome, setShowWelcome] = useState(false);
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
    setShowWelcome(true);

    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, [sessionToken]);

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
    <>
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
          <span className="hidden items-center gap-2 rounded-xl border border-[#bfc8c6] dark:border-[#21262d] bg-surface px-3 py-1.5 text-xs text-on-surface-variant shadow-sm lg:inline-flex">
            <CalendarDays className="size-3.5 text-[#00a99f]" />
            {dateLabel}
          </span>
          <span className="hidden items-center gap-2 rounded-xl border border-[#bfc8c6] dark:border-[#21262d] bg-surface px-3 py-1.5 text-xs tabular-nums text-on-surface shadow-sm md:inline-flex">
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

      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.92, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: -10, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
              className="w-full max-w-md bg-surface border border-outline-variant rounded-3xl p-8 shadow-2xl relative overflow-hidden text-center card-top-accent"
            >
              {/* Animated Background Glow */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute -top-24 -left-24 w-48 h-48 bg-[#00cec4]/10 rounded-full blur-2xl pointer-events-none"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#fb923c]/5 rounded-full blur-2xl pointer-events-none"
              />

              {/* Pulsing Icon Badge */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 180 }}
                className="size-16 rounded-2xl bg-[#00cec4]/10 border border-[#00cec4]/20 flex items-center justify-center text-[#00cec4] mx-auto mb-6 shadow-[0_0_30px_rgba(0,206,196,0.15)]"
              >
                <LayoutGrid className="size-8" />
              </motion.div>

              {/* Welcome Wording */}
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-[10px] uppercase font-bold tracking-[0.25em] text-[#00cec4] font-mono"
              >
                Welcome Back
              </motion.p>
              
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="text-lg font-black uppercase tracking-wider text-on-surface mt-2.5 mb-1.5"
                style={{ fontFamily: "var(--font-kiona-sans), sans-serif" }}
              >
                {userName}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mt-1 mb-7"
              >
                Your secure workspace is ready
              </motion.p>

              {/* Action Button */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                type="button"
                onClick={() => setShowWelcome(false)}
                className="w-full bg-[#00cec4] hover:bg-[#00b8af] text-white font-bold text-[10px] uppercase tracking-widest py-3 px-6 rounded-xl hover:shadow-[0_0_20px_rgba(0,206,196,0.3)] transition-all cursor-pointer shadow-md"
              >
                Enter Workspace
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export const WelcomeBar = AppHeader;
