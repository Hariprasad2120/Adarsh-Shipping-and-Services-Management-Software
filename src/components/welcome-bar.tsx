"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, memo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  LayoutGrid,
  Bell,
  Menu,
  Settings,
  Search,
  AlertTriangle,
} from "lucide-react";
import { acknowledgeDoValidityWarningAction } from "@/modules/cha/actions";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { useCaps } from "@/lib/caps-context";
import { useDashboardChrome } from "@/components/dashboard-chrome";
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

const ClockDisplay = memo(function ClockDisplay() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const initialTick = window.setTimeout(() => setNow(new Date()), 0);
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.clearTimeout(initialTick);
      window.clearInterval(timer);
    };
  }, []);

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

  return (
    <>
      <span className="hidden items-center gap-2 rounded-xl border border-[#bfc8c6] dark:border-[#21262d] bg-surface px-3 py-1.5 text-xs text-on-surface-variant shadow-sm lg:inline-flex">
        <CalendarDays className="size-3.5 text-[#00a99f]" />
        {dateLabel}
      </span>
      <span className="hidden items-center gap-2 rounded-xl border border-[#bfc8c6] dark:border-[#21262d] bg-surface px-3 py-1.5 text-xs tabular-nums text-on-surface shadow-sm md:inline-flex">
        <Clock3 className="size-3.5 text-[#00a99f]" />
        {timeLabel}
      </span>
    </>
  );
});

type DoValidityWarning = {
  jobId: string;
  jobNumber: string;
  customerName: string;
  deliveryOrderValidity: string;
  daysUntilExpiry: number;
  severity: "expired" | "expiring";
};

export function AppHeader({
  userName,
  sessionToken,
  enabledModuleIds,
}: {
  userName: string;
  sessionToken: string;
  enabledModuleIds?: Iterable<string>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const caps = useCaps();
  const { mobileNavId, mobileNavOpen, setMenuTrigger, toggleMobileNav } = useDashboardChrome();
  const [showWelcome, setShowWelcome] = useState(false);
  const [doWarnings, setDoWarnings] = useState<DoValidityWarning[]>([]);
  const firstName = useMemo(
    () => toTitleCase(userName.split(" ")[0] || "there"),
    [userName],
  );

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadDoWarnings() {
      try {
        const response = await fetch("/api/cha/do-validity/expiring", { cache: "no-store" });
        if (!response.ok) return;
        const warnings = (await response.json()) as DoValidityWarning[];
        if (!cancelled) setDoWarnings(Array.isArray(warnings) ? warnings : []);
      } catch {
        if (!cancelled) setDoWarnings([]);
      }
    }

    loadDoWarnings();
    const timer = window.setInterval(loadDoWarnings, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [refreshTrigger]);

  useEffect(() => {
    const storageKey = `welcome-toast:${sessionToken}`;

    // Clean up stale welcome keys from previous sessions
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key && key.startsWith("welcome-toast:") && key !== storageKey) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
    } catch {
      // sessionStorage unavailable
    }

    if (window.sessionStorage.getItem(storageKey)) return;
    window.sessionStorage.setItem(storageKey, "shown");

    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    const frameId = window.requestAnimationFrame(() => {
      setShowWelcome(true);
    });
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 4500);
    return () => {
      window.cancelAnimationFrame(frameId);
      clearTimeout(timer);
    };
  }, [sessionToken]);

  const visibleSections = useMemo(
    () => getVisibleSections(caps, enabledModuleIds),
    [caps, enabledModuleIds],
  );
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

  const workspaceLabel = activeItem?.label ?? activeSection?.label ?? "Workspace";
  const canOpenSettings = Boolean(caps["admin.org.manage"]);
  const expiredDoCount = doWarnings.filter((warning) => warning.severity === "expired").length;

  const SectionIcon = activeSection?.icon ?? LayoutGrid;

  const handleLeaveAsIs = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await acknowledgeDoValidityWarningAction(jobId);
      if (res.ok) {
        toast.success("Warning acknowledged.");
        setRefreshTrigger((prev) => prev + 1);
      } else {
        toast.error(res.error || "Failed to acknowledge warning.");
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "An error occurred.";
      toast.error(errMsg);
    }
  };

  const handleUpdateDate = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/cha/jobs/${jobId}?tab=additionalData&focus=deliveryOrderValidity`);
  };

  return (
    <>
      <header className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-outline-variant/60 bg-surface/90 px-4 backdrop-blur-sm sm:px-6 lg:px-8 xl:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <button
            ref={setMenuTrigger}
            type="button"
            onClick={toggleMobileNav}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-outline-variant/60 bg-surface text-on-surface transition-colors hover:bg-surface-container-low lg:hidden"
            aria-controls={mobileNavId}
            aria-expanded={mobileNavOpen}
            aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            <Menu className="size-5 text-[#00cec4]" />
          </button>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#00cec4]/10">
            <SectionIcon size={16} className="text-[#00cec4]" />
          </div>
          <h1 className="ds-h3 heading-icon-none truncate text-on-surface">{workspaceLabel}</h1>
        </div>

        <div className="hidden flex-1 max-w-md mx-4 xl:block">
          <div className="flex items-center gap-3 rounded-xl border border-outline-variant/60 bg-surface px-4 py-1.5 text-on-surface-variant shadow-sm">
            <Search className="size-4 shrink-0 text-[#00a99f]" />
            <span className="truncate text-[13px]">{firstName}&apos;s workspace — {workspaceLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3.5">
          <ClockDisplay />

          {doWarnings.length > 0 ? (
            <div className="group relative">
              <button
                type="button"
                onClick={() => router.push(`/cha/jobs/${doWarnings[0].jobId}?tab=additionalData`)}
                className={`relative inline-flex min-h-9 items-center gap-2 rounded-full px-3 py-2 text-xs font-bold uppercase tracking-wide shadow-sm transition-all border ${
                  expiredDoCount > 0
                    ? "border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/15 hover:shadow-[0_0_0_3px_rgba(239,68,68,0.18)] animate-pulse-red"
                    : "border-[#fb923c]/45 bg-[#fb923c]/10 text-[#fb923c] hover:bg-[#fb923c]/15 hover:shadow-[0_0_0_3px_rgba(251,146,60,0.18)] animate-pulse-orange"
                }`}
                title="Delivery Order validity warnings"
              >
                <AlertTriangle className="size-4" />
                <span className="ds-numeric">{doWarnings.length}</span>
              </button>
              <div className="pointer-events-auto absolute right-0 top-full z-30 mt-2 hidden w-80 rounded-xl border border-outline-variant/60 bg-surface p-3.5 text-left shadow-lg group-hover:block">
                <div className="mb-3 flex items-center justify-between border-b border-outline-variant/40 pb-2">
                  <span className="ds-label text-[#fb923c] font-semibold">DO Validity Warnings</span>
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant font-mono">
                    {expiredDoCount > 0 ? `${expiredDoCount} expired` : `${doWarnings.length} pending`}
                  </span>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {doWarnings.map((warning) => (
                    <div
                      key={warning.jobId}
                      onClick={() => router.push(`/cha/jobs/${warning.jobId}`)}
                      className="cursor-pointer rounded-xl border border-outline-variant/40 bg-surface-container-low p-2.5 space-y-2.5 transition-colors hover:bg-surface-container"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-on-surface tracking-wide">{warning.jobNumber}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                          warning.severity === "expired"
                            ? "bg-red-500/10 text-red-500 border border-red-500/20"
                            : "bg-orange-500/10 text-[#fb923c] border border-orange-500/20"
                        }`}>
                          {warning.severity === "expired" ? "Expired" : `${warning.daysUntilExpiry}d left`}
                        </span>
                      </div>
                      <div>
                        <p className="truncate text-[10px] text-on-surface-variant font-medium">{warning.customerName}</p>
                        <p className="text-[9px] text-on-surface-variant/80 font-sans mt-0.5">
                          Expires: {new Date(warning.deliveryOrderValidity).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <div className="flex gap-2 pt-1 border-t border-outline-variant/20">
                        <button
                          type="button"
                          onClick={(e) => handleLeaveAsIs(warning.jobId, e)}
                          className="flex-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hover:text-on-surface bg-surface-container border border-outline-variant/30 hover:bg-surface-container-high py-1 px-1.5 rounded-lg transition-all cursor-pointer"
                        >
                          Leave As Is
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleUpdateDate(warning.jobId, e)}
                          className="flex-1 text-[10px] font-bold uppercase tracking-wider text-white bg-[#00cec4] hover:bg-[#00b8af] py-1 px-1.5 rounded-lg transition-all cursor-pointer"
                        >
                          Update Date
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

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
        {showWelcome && typeof document !== "undefined" && createPortal(
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-[9999] flex flex-col justify-end items-center bg-[#0d1117] p-8 md:p-12 lg:p-16 overflow-hidden"
          >
            {/* Ambient Background Glows */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top Cyan Glow */}
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.15, 0.25, 0.15]
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(0,206,196,0.3)_0%,transparent_70%)] rounded-full blur-3xl"
              />
              {/* Bottom Orange Glow */}
              <motion.div
                animate={{ 
                  scale: [1, 1.15, 1],
                  opacity: [0.08, 0.15, 0.08]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-40 right-1/4 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(251,146,60,0.15)_0%,transparent_70%)] rounded-full blur-3xl"
              />
              {/* Center Subtle Grid */}
              <div 
                className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
                style={{
                  backgroundImage: `radial-gradient(var(--color-outline) 1px, transparent 1px)`,
                  backgroundSize: '24px 24px'
                }}
              />
            </div>

            {/* Welcome Content Wrapper (Bottom Positioned) */}
            <div className="relative z-10 w-full max-w-4xl flex flex-col items-center text-center pb-12 md:pb-20">
              
              {/* Pulsing Icon Badge */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 100, 
                  damping: 15,
                  delay: 0.1 
                }}
                className="size-16 rounded-2xl bg-[#00cec4]/10 border border-[#00cec4]/20 flex items-center justify-center text-[#00cec4] mb-6 shadow-[0_0_40px_rgba(0,206,196,0.2)]"
              >
                <motion.div
                  animate={{ scale: [0.95, 1.05, 0.95] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <LayoutGrid className="size-8" />
                </motion.div>
              </motion.div>

              {/* Welcome Wording */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                className="text-xs uppercase font-bold tracking-[0.3em] text-[#00cec4] font-mono"
              >
                Welcome Back
              </motion.p>
              
              <motion.h2
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                className="text-3xl md:text-5xl font-black uppercase tracking-wider text-white mt-4 mb-4 select-none"
                style={{ fontFamily: "var(--font-kiona-sans), sans-serif" }}
              >
                {userName}
              </motion.h2>

              {/* Separator Line */}
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "80px", opacity: 0.3 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="h-[1px] bg-[#00cec4] my-2"
              />

              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
                className="text-[11px] text-white/90 uppercase font-bold tracking-[0.25em] mt-2"
              >
                Your secure workspace is ready
              </motion.p>
              
              {/* Subtle Loading Progress Bar */}
              <div className="w-48 h-1 bg-white/10 rounded-full mt-8 overflow-hidden relative">
                <motion.div
                  initial={{ left: "-100%" }}
                  animate={{ left: "100%" }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-y-0 w-1/2 bg-[#00cec4] rounded-full"
                />
              </div>

            </div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>
    </>
  );
}

export const WelcomeBar = AppHeader;
