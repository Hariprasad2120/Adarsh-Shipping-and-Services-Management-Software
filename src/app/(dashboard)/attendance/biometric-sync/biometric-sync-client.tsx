"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Wifi,
  WifiOff,
  CheckmarkFilled,
  Warning,
  Time,
  Renew,
  DataBase,
  CalendarHeatMap,
  Play,
  Information,
  List,
  Radio,
  Events,
  UserAvatarFilled,
  UserFollow,
  User,
  Login,
  Logout,
  Building,
  Flash,
} from "@carbon/icons-react";
import { toast } from "sonner";

const Spinner = ({ className }: { className?: string }) => (
  <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface SyncStatus {
  configured: boolean;
  connected?: boolean;
  lastSync: string | null;
  lastSyncMonth: string | null;
  logs: SyncLogEntry[];
}

interface SyncLogEntry {
  time: string;
  month: string;
  punchTable: string;
  totalPunches: number;
  uniqueEmployees: number;
  matchedInHrms: number;
  synced: number;
  updated: number;
  skipped: number;
  status: number;
  timeTakenMs: number;
  triggeredBy: string;
}

interface SyncResult {
  success?: boolean;
  error?: string;
  configured?: boolean;
  availableTables?: string[];
  punchTable?: string;
  month?: string;
  synced?: number;
  updated?: number;
  skipped?: number;
  errors?: string[];
  totalErrors?: number;
  totalPunches?: number;
  uniqueEmployees?: number;
  matchedInHrms?: number;
}

interface LiveEmployee {
  id: string;
  name: string;
  employeeNumber: number | null;
  department: string | null;
  checkIn: string | null;
  checkOut: string | null;
  workingHours: number | null;
  status: "IN" | "OUT" | "NOT_ARRIVED" | "IDLE";
  checkInPlace?: string | null;
  checkOutPlace?: string | null;
}

interface LiveData {
  date: string;
  employees: LiveEmployee[];
  lastLiveSync: string | null;
  presentCount: number;
  outCount: number;
  notArrivedCount: number;
  source: "essl" | "db-fallback";
  degraded?: boolean;
  message?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

function fmtTime(isoString: string): string {
  return new Date(isoString).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function fmtTimeShort(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? "s" : ""} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr${diffHr > 1 ? "s" : ""} ago`;
  return `${Math.floor(diffHr / 24)} day${Math.floor(diffHr / 24) > 1 ? "s" : ""} ago`;
}

function fmtHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${String(m).padStart(2, "0")} hrs`;
}

function getPeriodLabel(log: SyncLogEntry): string {
  if (!log.month.startsWith("TODAY")) {
    return log.month;
  }

  const logDate = new Date(log.time);
  const logDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(logDate);

  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  if (logDateStr === todayStr) {
    return "TODAY";
  }

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(logDate);
}

// ─── Status badge classes ─────────────────────────────────────────────────────

const STATUS_BADGE: Record<
  "IN" | "OUT" | "NOT_ARRIVED" | "IDLE",
  { bg: string; text: string; label: string }
> = {
  IN: {
    bg: "bg-emerald-500/10 border border-emerald-500/25",
    text: "text-emerald-400",
    label: "INSIDE",
  },
  OUT: {
    bg: "bg-orange-500/10 border border-orange-500/25",
    text: "text-orange-400",
    label: "OUT",
  },
  NOT_ARRIVED: {
    bg: "bg-surface-container-high border border-outline-variant/60 dark:bg-slate-800/40 dark:border-slate-800/80",
    text: "text-on-surface-variant",
    label: "NOT IN",
  },
  IDLE: {
    bg: "bg-amber-500/10 border border-amber-500/25",
    text: "text-amber-400",
    label: "IDLE",
  },
};

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
  glowColor,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  glowColor: string;
}) {
  return (
    <div
      className="relative flex flex-col gap-2.5 overflow-hidden rounded-2xl border border-outline-variant/55 bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#00cec4]/30 hover:shadow-[0_18px_36px_-26px_rgba(15,23,42,0.18)] dark:border-slate-800/60 dark:bg-slate-950/40 dark:hover:border-slate-700/60 dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.25)] dark:backdrop-blur-md group"
    >
      {/* Background glow decoration */}
      <div className={`absolute -right-4 -top-4 w-12 h-12 rounded-full blur-2xl opacity-10 transition-opacity duration-300 group-hover:opacity-20 ${glowColor}`} />
      
      <div className="flex items-center justify-between select-none">
        <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60">
          {label}
        </span>
        <div className="rounded-xl border border-outline-variant/55 bg-surface-container-low p-1.5 transition-colors duration-300 group-hover:bg-surface-container dark:border-slate-800/80 dark:bg-slate-900/60 dark:group-hover:bg-slate-900 dark:group-hover:border-slate-700/50">
          {icon}
        </div>
      </div>
      
      <div className={`text-3xl font-extrabold tracking-tight ds-numeric ${color}`}>
        {value}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BiometricSyncClient() {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<"live" | "logs" | "sync">("live");
  const [month, setMonth] = useState(currentMonth());
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [liveSyncing, setLiveSyncing] = useState(false);
  const [liveFilter, setLiveFilter] = useState<
    "ALL" | "IN" | "OUT" | "NOT_ARRIVED" | "IDLE"
  >("ALL");
  const [lastLiveSyncText, setLastLiveSyncText] = useState("Never");
  const liveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLiveSyncRef = useRef<Date | null>(null);
  const hasAutoSyncedRef = useRef(false);

  // Mount state guard to prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Fetch sync logs + config status ────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const r = await fetch("/api/attendance/sync/biometric");
      if (r.ok) setStatus((await r.json()) as SyncStatus);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      void fetchStatus();
    }
  }, [fetchStatus, mounted]);

  // Auto-trigger a live eSSL sync once when page loads and status confirms connected
  useEffect(() => {
    if (!mounted || !status || hasAutoSyncedRef.current || tab !== "live") return;
    hasAutoSyncedRef.current = true;
    if (status.configured && status.connected) {
      void handleLiveSyncNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, status, tab]);

  // ── Live today: fast snapshot fetch from local DB ──────────────────────────
  const refreshLiveSnapshot = useCallback(
    async (silent = false): Promise<LiveData | null> => {
      if (!silent) setLiveSyncing(true);
      try {
        const r = await fetch("/api/attendance/sync/biometric/live");
        if (r.ok) {
          const data = (await r.json()) as LiveData;
          setLiveData(data);
          const now = new Date();
          lastLiveSyncRef.current = now;
          setLastLiveSyncText("Just now");
          return data;
        }
      } catch {
        /* silent */
      } finally {
        if (!silent) setLiveSyncing(false);
      }
      return null;
    },
    [],
  );

  // Auto-refresh every 2 min when on live tab using the latest synced snapshot.
  useEffect(() => {
    if (!mounted || tab !== "live") return;
    void refreshLiveSnapshot(false);
    liveIntervalRef.current = setInterval(() => {
      void refreshLiveSnapshot(true);
    }, 2 * 60 * 1000);
    return () => {
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
    };
  }, [tab, mounted, refreshLiveSnapshot]);

  async function handleLiveSyncNow() {
    setLiveSyncing(true);
    try {
      if (status?.configured && status?.connected) {
        const syncRes = await fetch("/api/attendance/sync/biometric/live", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ triggeredBy: "LIVE_MANUAL" }),
        });

        if (!syncRes.ok) {
          const failure = (await syncRes.json().catch(() => null)) as { error?: string } | null;
          void fetchStatus();
          toast.error(failure?.error ?? "Live biometric sync failed");
          return;
        }
      }

      const snapshot = await refreshLiveSnapshot(true);
      if (!snapshot) {
        toast.error("Failed to refresh biometric snapshot");
        return;
      }

      if (snapshot.source === "essl") {
        toast.success("Live biometric data refreshed from eSSL");
      } else {
        toast.warning(snapshot.message ?? "eSSL is unavailable. Showing local attendance records.");
      }
    } catch {
      toast.error("Failed to refresh biometric snapshot");
    } finally {
      setLiveSyncing(false);
    }
  }

  // Tick — update relative time display every 30 s
  useEffect(() => {
    if (!mounted) return;
    const t = setInterval(() => {
      const ls = lastLiveSyncRef.current;
      if (ls) {
        const mins = Math.round((Date.now() - ls.getTime()) / 60000);
        setLastLiveSyncText(mins < 1 ? "Just now" : `${mins}m ago`);
      }
    }, 30_000);
    return () => clearInterval(t);
  }, [mounted]);

  // ── Manual sync ─────────────────────────────────────────────────────────────
  async function handleSync() {
    setSyncing(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/attendance/sync/biometric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month }),
      });
      const data = (await res.json()) as SyncResult;
      setLastResult(data);
      if (res.ok && data.success) {
        const resultText = `Sync complete — ${data.synced ?? 0} new, ${data.updated ?? 0} updated, ${data.skipped ?? 0} skipped`;
        if ((data.errors?.length ?? 0) > 0) {
          toast.warning(`${resultText}. ${data.errors!.length} sync issue(s) need review.`);
        } else {
          toast.success(resultText);
        }
        void fetchStatus();
        void refreshLiveSnapshot(true);
      } else {
        toast.error(data.error ?? "Sync failed");
      }
    } catch {
      toast.error("Network error during sync");
    } finally {
      setSyncing(false);
    }
  }

  const logs = status?.logs ?? [];

  const displayedEmployees = (liveData?.employees ?? []).filter(
    (e) => liveFilter === "ALL" || e.status === liveFilter,
  );

  // Group by department
  const byDept = new Map<string, LiveEmployee[]>();
  for (const emp of displayedEmployees) {
    const dept = emp.department ?? "Other";
    if (!byDept.has(dept)) byDept.set(dept, []);
    byDept.get(dept)!.push(emp);
  }

  // Prevent server hydration mismatches by returning loading state until mounted
  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-on-surface-variant select-none">
        <Spinner className="size-6 animate-spin text-[#00cec4]" />
        <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">Loading Biometric Workspace...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6 text-on-surface dark:text-slate-200">
      {/* ── Page subheader + connection pill ─────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4 select-none">
        <p className="text-xs font-bold text-on-surface-variant tracking-wider">
          Live attendance monitor and eSSL eTimetracklite sync control
        </p>
        <div className="flex items-center gap-2 rounded-full border border-outline-variant/60 bg-surface px-3.5 py-1.5 text-xs font-bold shadow-sm dark:border-slate-800/80 dark:bg-slate-950/60 dark:shadow-ambient">
          {loadingStatus ? (
            <Spinner className="size-3.5 animate-spin text-on-surface-variant" />
          ) : !status?.configured ? (
            <WifiOff className="size-3.5 text-rose-500" />
          ) : !status?.connected ? (
            <WifiOff className="size-3.5 text-rose-500 animate-pulse" />
          ) : (
            <Wifi className="size-3.5 text-emerald-500 animate-pulse" />
          )}
          <span
            className={
              loadingStatus
                ? "text-on-surface-variant"
                : !status?.configured
                  ? "text-rose-400"
                  : !status?.connected
                    ? "text-rose-400 font-bold"
                    : "text-emerald-400"
            }
          >
            {loadingStatus
              ? "Checking..."
              : !status?.configured
                ? "Not Configured"
                : !status?.connected
                  ? "Not Connected"
                  : "eSSL Connected"}
          </span>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="inline-flex items-center gap-1.5 rounded-2xl border border-outline-variant/60 bg-surface p-1.5 select-none shadow-sm dark:border-slate-800/60 dark:bg-slate-950/40 dark:shadow-ambient dark:backdrop-blur-md">
        {(["live", "logs", "sync"] as const).map((t) => (
          <button
            key={t}
            id={`tab-biometric-${t}`}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer ${
              tab === t
                ? "border border-outline-variant/60 bg-surface-container-high text-[#008b85] shadow-sm dark:border-slate-700/50 dark:bg-slate-800 dark:text-[#00cec4] dark:shadow-ambient"
                : "text-on-surface-variant hover:text-on-surface dark:hover:text-slate-300"
            }`}
          >
            {t === "live" && (
              <>
                <Radio className="size-3.5" />
                Live Today
                {liveData && (
                  <span className="ml-1 flex items-center gap-1 text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full px-2 py-0.5 font-bold">
                    <span className="size-1 rounded-full bg-emerald-400 animate-pulse" />
                    {liveData.presentCount} IN
                  </span>
                )}
              </>
            )}
            {t === "logs" && (
              <>
                <List className="size-3.5" />
                Logs Report
                {logs.length > 0 && (
                  <span className="ml-1 rounded-full border border-outline-variant/60 bg-surface-container-low px-1.5 py-0.5 text-[9px] font-bold text-on-surface-variant/80 dark:border-slate-800 dark:bg-slate-900 dark:text-on-surface-variant/60">
                    {logs.length}
                  </span>
                )}
              </>
            )}
            {t === "sync" && (
              <>
                <Renew className="size-3.5" />
                Manual Sync
              </>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* LIVE TODAY TAB                                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {tab === "live" && (
        <div className="space-y-5">
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Currently Inside"
              value={liveData?.presentCount ?? "—"}
              icon={<UserFollow className="size-4 text-emerald-400" />}
              color="text-emerald-400"
              glowColor="bg-emerald-500"
            />
            <StatCard
              label="Currently Out"
              value={liveData?.outCount ?? "—"}
              icon={<Logout className="size-4 text-orange-400" />}
              color="text-orange-400"
              glowColor="bg-orange-500"
            />
            <StatCard
              label="Not Yet Arrived"
              value={liveData?.notArrivedCount ?? "—"}
              icon={<User className="size-4 text-on-surface-variant/60" />}
              color="text-on-surface dark:text-slate-300"
              glowColor="bg-slate-400"
            />
            <StatCard
              label="Total Employees"
              value={liveData?.employees.length ?? "—"}
              icon={<UserAvatarFilled className="size-4 text-[#00cec4]" />}
              color="text-[#00cec4]"
              glowColor="bg-[#00cec4]"
            />
          </div>

          {/* Monitor panel */}
            <div className="overflow-hidden rounded-3xl border border-outline-variant/60 bg-surface shadow-sm dark:border-slate-800/80 dark:bg-slate-950/30 dark:shadow-2xl dark:backdrop-blur-md">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/50 bg-surface-container-low/70 px-6 py-4 select-none dark:border-slate-800/60 dark:bg-slate-900/20">
              <div className="flex items-center gap-2">
                <Radio className="size-4 text-[#00cec4] animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-on-surface dark:text-slate-100">
                  Live Attendance Monitor
                </span>
                {liveData && (
                  <span className="text-[10px] font-bold text-on-surface-variant font-mono">
                    — {liveData.date}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Filter pills */}
                <div className="flex items-center gap-1 rounded-xl border border-outline-variant/60 bg-surface-container-low p-1 dark:border-slate-800/80 dark:bg-slate-950/60">
                  {(
                    ["ALL", "IN", "OUT", "NOT_ARRIVED", "IDLE"] as const
                  ).map((f) => (
                    <button
                      key={f}
                      id={`filter-live-${f.toLowerCase()}`}
                      onClick={() => setLiveFilter(f)}
                      className={`text-[9px] font-bold px-2.5 py-1 rounded-lg transition-all duration-200 cursor-pointer ${
                        liveFilter === f
                          ? "border border-outline-variant/60 bg-surface text-[#008b85] shadow-sm dark:border-slate-700/50 dark:bg-slate-800 dark:text-[#00cec4] dark:shadow-ambient"
                          : "text-on-surface-variant/70 hover:text-on-surface dark:hover:text-slate-200"
                      }`}
                    >
                      {f === "NOT_ARRIVED" ? "NOT IN" : f}
                    </button>
                  ))}
                </div>

                {/* Auto-sync status */}
                <div className="flex items-center gap-2 text-xs text-on-surface-variant/60 font-medium">
                  <span className="relative flex size-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full size-2 bg-[#00cec4]"></span>
                  </span>
                  <span>Auto-sync: {lastLiveSyncText}</span>
                </div>

                {/* Manual refresh */}
                <button
                  id="btn-live-sync-now"
                  onClick={() => void handleLiveSyncNow()}
                  disabled={liveSyncing}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-700 shadow-sm transition-all hover:bg-cyan-500/15 active:scale-95 disabled:opacity-50 dark:text-cyan-400 dark:shadow-ambient dark:hover:bg-cyan-500/20"
                >
                  {liveSyncing ? (
                    <>
                      <Spinner className="size-3.5 animate-spin" />
                      Syncing…
                    </>
                  ) : (
                    <>
                      <Renew className="size-3.5" />
                      Sync Now
                    </>
                  )}
                </button>
              </div>
            </div>

            {liveData && (
              <div
                className={
                  liveData.source === "essl"
                    ? "flex flex-wrap items-center gap-2 border-b border-outline-variant/35 bg-[#00cec4]/6 px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#009d96] dark:text-[#00cec4]"
                    : "flex flex-wrap items-center gap-2 border-b border-orange-500/15 bg-orange-500/6 px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-orange-600 dark:text-orange-400"
                }
              >
                <span
                  className={
                    liveData.source === "essl"
                      ? "inline-flex items-center rounded-full border border-[#00cec4]/20 bg-[#00cec4]/10 px-2 py-0.5"
                      : "inline-flex items-center rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5"
                  }
                >
                  {liveData.source === "essl" ? "Live Source: eSSL" : "Fallback: Local Attendance Records"}
                </span>
                {liveData.message ? <span className="text-on-surface-variant">{liveData.message}</span> : null}
              </div>
            )}

            {/* Table headers */}
            {displayedEmployees.length > 0 && (
              <div className="grid grid-cols-[1fr_96px_112px_112px_96px] items-center gap-4 border-b border-outline-variant/50 bg-surface-container-low/70 px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant select-none dark:border-slate-800/40 dark:bg-slate-950/20">
                <div>Employee</div>
                <div className="text-center">Status</div>
                <div className="text-right">Check-In</div>
                <div className="text-right">Check-Out</div>
                <div className="text-right">Hours</div>
              </div>
            )}

            {/* Employee list */}
            {liveSyncing && !liveData ? (
              <div className="flex items-center justify-center py-24 gap-3 text-on-surface-variant select-none">
                <Spinner className="size-5 animate-spin text-[#00cec4]" />
                <span className="text-xs font-bold uppercase tracking-wider">Syncing from eSSL…</span>
              </div>
            ) : displayedEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 select-none">
                <div className="flex size-12 items-center justify-center rounded-2xl border border-outline-variant/55 bg-surface-container-low dark:border-slate-800/60 dark:bg-slate-950/40">
                  <UserAvatarFilled className="size-6 text-on-surface-variant" />
                </div>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                  No employees match the filter
                </p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/35 dark:divide-slate-950/20">
                {[...byDept.entries()].map(([dept, emps]) => (
                  <div key={dept}>
                    {/* Department header */}
                    <div className="flex items-center gap-2 border-b border-outline-variant/45 bg-surface-container-low/80 px-6 py-2.5 select-none dark:border-slate-800/40 dark:bg-slate-950/30">
                      <Building className="size-3.5 text-on-surface-variant" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60">
                        {dept}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-bold ml-1">
                        ({emps.length})
                      </span>
                      <div className="ml-auto flex items-center gap-2.5">
                        <span className="text-[10px] text-emerald-400 font-bold">
                          {emps.filter((e) => e.status === "IN" || e.status === "IDLE").length} IN
                        </span>
                        <span className="text-[10px] text-on-surface-variant font-bold">
                          ·{" "}
                          {emps.filter((e) => e.status === "OUT").length} OUT
                        </span>
                      </div>
                    </div>
                    {/* Employees */}
                    <div className="divide-y divide-outline-variant/35 dark:divide-slate-900/40">
                      {emps.map((emp) => {
                        const badge = STATUS_BADGE[emp.status];
                        const initials = emp.name.split(" ").slice(0, 2).map((n) => n[0]).join("") || "?";
                        
                        return (
                          <div
                            key={emp.id}
                            className="grid grid-cols-[1fr_96px_112px_112px_96px] items-center gap-4 border-b border-outline-variant/30 px-6 py-3.5 transition-all group cursor-pointer hover:bg-surface-container-low/70 dark:border-slate-900/40 dark:hover:bg-slate-900/20"
                          >
                            {/* Avatar + Name + EMP no */}
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Pulse dot wrapper around avatar */}
                              <div className="relative shrink-0 select-none">
                                <div className="flex size-8 items-center justify-center rounded-full border border-outline-variant/55 bg-surface-container-low text-[10px] font-bold text-on-surface-variant/70 dark:border-slate-800 dark:bg-slate-900 dark:text-on-surface-variant/60">
                                  {initials}
                                </div>
                                {emp.status === "IN" ? (
                                  <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-slate-950"></span>
                                  </span>
                                ) : emp.status === "IDLE" ? (
                                  <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 border border-slate-950"></span>
                                  </span>
                                ) : emp.status === "OUT" ? (
                                  <span className="absolute -bottom-0.5 -right-0.5 rounded-full size-2.5 bg-orange-500 border border-slate-950" />
                                ) : null}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-on-surface transition-colors group-hover:text-[#008b85] dark:text-slate-200 dark:group-hover:text-cyan-400">
                                  {emp.name}
                                </div>
                                <div className="text-[10px] text-on-surface-variant font-mono ds-numeric mt-0.5">
                                  EMP-{String(emp.employeeNumber ?? "—").padStart(3, "0")}
                                </div>
                              </div>
                            </div>

                            {/* Status badge */}
                            <div className="flex justify-center shrink-0">
                              <span
                                className={`inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-1 rounded-full select-none ${badge.bg} ${badge.text} ${emp.status === "IN" ? "animate-pulse" : ""}`}
                              >
                                {emp.status === "IN" && (
                                  <Flash className="size-2.5" />
                                )}
                                {emp.status === "IDLE" && (
                                  <Time className="size-2.5" />
                                )}
                                {emp.status === "OUT" && (
                                  <Logout className="size-2.5" />
                                )}
                                {emp.status === "NOT_ARRIVED" && (
                                  <Login className="size-2.5" />
                                )}
                                {badge.label}
                              </span>
                            </div>

                            {/* Check-in */}
                            <div className="text-right shrink-0">
                              {emp.checkIn ? (
                                <div>
                                  <div className="text-xs font-semibold text-on-surface ds-numeric font-mono dark:text-slate-200">
                                    {fmtTimeShort(emp.checkIn)}
                                  </div>
                                  <div className="mt-0.5 ml-auto max-w-[108px] truncate text-[10px] font-medium text-on-surface-variant/80 dark:text-slate-500" title={emp.checkInPlace || "Check-in"}>
                                    {emp.checkInPlace || "Check-in"}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-on-surface font-bold ds-numeric">
                                  —
                                </div>
                              )}
                            </div>

                            {/* Check-out */}
                            <div className="text-right shrink-0">
                              {emp.checkOut ? (
                                <div>
                                  <div className="text-xs font-semibold text-on-surface ds-numeric font-mono dark:text-slate-200">
                                    {fmtTimeShort(emp.checkOut)}
                                  </div>
                                  <div className="mt-0.5 ml-auto max-w-[108px] truncate text-[10px] font-medium text-on-surface-variant/80 dark:text-slate-500" title={emp.checkOutPlace || "Check-out"}>
                                    {emp.checkOutPlace || "Check-out"}
                                  </div>
                                </div>
                              ) : (emp.status === "IN" || emp.status === "IDLE") ? (
                                <div className="text-[9px] font-bold tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded ml-auto w-fit select-none animate-pulse">
                                  Still inside
                                </div>
                              ) : (
                                <div className="text-xs text-on-surface font-bold ds-numeric">
                                  —
                                </div>
                              )}
                            </div>

                            {/* Hours spent */}
                            <div className="text-right shrink-0">
                              {emp.workingHours ? (
                                <div className="text-xs font-semibold text-on-surface font-mono ds-numeric dark:text-slate-200">
                                  {fmtHours(emp.workingHours)}
                                </div>
                              ) : (
                                <div className="text-xs text-on-surface font-bold">—</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* LOGS REPORT TAB                                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {tab === "logs" && (
        <div className="overflow-hidden rounded-3xl border border-outline-variant/60 bg-surface shadow-sm dark:border-slate-800/80 dark:bg-slate-950/30 dark:shadow-2xl dark:backdrop-blur-md">
          <div className="flex items-center justify-between gap-4 border-b border-outline-variant/50 bg-surface-container-low/70 px-6 py-4 select-none dark:border-slate-800/60 dark:bg-slate-900/20">
            <div className="flex items-center gap-2">
              <List className="size-4 text-on-surface-variant/60" />
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface dark:text-slate-200">
                Sync History
              </span>
              <span className="text-[10px] text-on-surface-variant font-bold">
                ({logs.length} entries — last 200 kept)
              </span>
            </div>
            <button
              id="btn-logs-refresh"
              onClick={() => void fetchStatus()}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-on-surface-variant/70 transition-all hover:text-on-surface active:scale-95 dark:hover:text-slate-200"
            >
              <Renew className="size-3.5" />
              Refresh
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center select-none">
              <div className="flex size-12 items-center justify-center rounded-2xl border border-outline-variant/55 bg-surface-container-low dark:border-slate-800/65 dark:bg-slate-950/40">
                <DataBase className="size-6 text-on-surface-variant" />
              </div>
              <p className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-wider">
                No sync history yet
              </p>
              <p className="text-xs text-on-surface-variant max-w-xs leading-relaxed mt-1">
                Switch to{" "}
                <button
                  onClick={() => setTab("live")}
                  className="text-[#00cec4] underline underline-offset-2 font-bold cursor-pointer"
                >
                  Live Today
                </button>{" "}
                to trigger an automatic sync, or use{" "}
                <button
                  onClick={() => setTab("sync")}
                  className="text-[#00cec4] underline underline-offset-2 font-bold cursor-pointer"
                >
                  Manual Sync
                </button>
                .
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/50 bg-surface-container-low/70 select-none dark:border-slate-800/60 dark:bg-slate-950/20">
                    {[
                      "Time",
                      "Period",
                      "Table",
                      "Punches",
                      "Matched",
                      "New",
                      "Updated",
                      "Skipped",
                      "Status",
                      "Duration",
                      "Triggered By",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/35 dark:divide-slate-900/40">
                  {logs.map((log, i) => {
                    const isLive =
                      log.triggeredBy === "LIVE_AUTO" ||
                      log.month.startsWith("TODAY");
                    return (
                      <tr
                        key={i}
                        className={`border-b border-outline-variant/30 transition-colors hover:bg-surface-container-low/70 dark:border-slate-900/40 dark:hover:bg-slate-900/20 ${i === 0 ? "bg-emerald-500/[0.03] dark:bg-emerald-500/[0.01]" : ""}`}
                      >
                        <td className="px-4 py-3 ds-numeric text-xs text-on-surface font-mono whitespace-nowrap dark:text-slate-300">
                          <div className="flex items-center gap-1.5">
                            {i === 0 && (
                              <span className="size-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                            )}
                            {fmtTime(log.time)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-on-surface whitespace-nowrap dark:text-slate-300">
                          {isLive ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                              <span className="size-1 rounded-full bg-emerald-400" />
                              {getPeriodLabel(log)}
                            </span>
                          ) : (
                            getPeriodLabel(log)
                          )}
                        </td>
                        <td className="px-4 py-3 ds-numeric text-[11px] text-on-surface-variant font-mono whitespace-nowrap">
                          {log.punchTable}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-semibold text-on-surface font-mono dark:text-slate-300">
                          {log.totalPunches.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-on-surface font-mono dark:text-slate-300">
                          {log.matchedInHrms}
                          <span className="text-on-surface-variant/75 dark:text-slate-500">
                            /{log.uniqueEmployees}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-right">
                          <span className="font-bold text-emerald-400 font-mono">
                            {log.synced}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-right">
                          <span className="font-bold text-blue-400 font-mono">
                            {log.updated}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-right">
                          <span className="font-bold text-amber-500 font-mono">{log.skipped}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                              log.status === 200
                                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                                : "bg-red-500/10 border border-red-500/20 text-red-400"
                            }`}
                          >
                            {log.status === 200 ? (
                              <CheckmarkFilled className="size-3" />
                            ) : (
                              <Warning className="size-3" />
                            )}
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-right ds-numeric text-on-surface-variant font-mono whitespace-nowrap">
                          {log.timeTakenMs < 1000
                            ? `${log.timeTakenMs}ms`
                            : `${(log.timeTakenMs / 1000).toFixed(1)}s`}
                        </td>
                        <td className="px-4 py-3 text-xs text-on-surface-variant/60 whitespace-nowrap">
                          {isLive ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                              <Radio className="size-2.5" />
                              Auto
                            </span>
                          ) : (
                            log.triggeredBy
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MANUAL SYNC TAB                                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {tab === "sync" && (
        <div className="space-y-5">
          {/* Info cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative overflow-hidden rounded-2xl border border-outline-variant/55 bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00cec4]/25 hover:shadow-[0_18px_36px_-28px_rgba(15,23,42,0.16)] dark:border-slate-800/60 dark:bg-slate-950/40 dark:hover:border-slate-700/50 dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.25)] dark:backdrop-blur-md">
              <div className="flex items-center gap-3 mb-3 select-none">
                {loadingStatus ? (
                  <Spinner className="size-5 text-on-surface-variant animate-spin" />
                ) : !status?.configured ? (
                  <WifiOff className="size-5 text-rose-500" />
                ) : !status?.connected ? (
                  <WifiOff className="size-5 text-rose-500 animate-pulse" />
                ) : (
                  <Wifi className="size-5 text-emerald-500 animate-pulse" />
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60">
                  Connection
                </span>
              </div>
              <div className="text-sm font-bold text-on-surface dark:text-slate-200">
                {loadingStatus
                  ? "Checking…"
                  : !status?.configured
                    ? "Not Configured"
                    : !status?.connected
                      ? "Not Connected"
                      : "eSSL DB Connected"}
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-on-surface-variant/80 dark:text-slate-500">
                {!status?.configured
                  ? "Set ESSL_DB_* vars in .env"
                  : !status?.connected
                    ? "eSSL database host is offline"
                    : "ESSL_DB_SERVER / ESSL_DB_NAME set"}
              </p>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-outline-variant/55 bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00cec4]/25 hover:shadow-[0_18px_36px_-28px_rgba(15,23,42,0.16)] dark:border-slate-800/60 dark:bg-slate-950/40 dark:hover:border-slate-700/50 dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.25)] dark:backdrop-blur-md">
              <div className="flex items-center gap-3 mb-3 select-none">
                <Time className="size-5 text-[#00cec4]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60">
                  Last Sync
                </span>
              </div>
              <div className="text-sm font-bold text-on-surface dark:text-slate-200">
                {status?.lastSync
                  ? formatRelativeTime(status.lastSync)
                  : "Never synced"}
              </div>
              <p className="mt-1.5 text-[10px] text-on-surface-variant/80 ds-numeric font-mono dark:text-slate-500">
                {status?.lastSync ? fmtTime(status.lastSync) : "—"}
              </p>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-outline-variant/55 bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00cec4]/25 hover:shadow-[0_18px_36px_-28px_rgba(15,23,42,0.16)] dark:border-slate-800/60 dark:bg-slate-950/40 dark:hover:border-slate-700/50 dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.25)] dark:backdrop-blur-md">
              <div className="flex items-center gap-3 mb-3 select-none">
                <CalendarHeatMap className="size-5 text-orange-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60">
                  Last Month Synced
                </span>
              </div>
              <div className="text-sm font-bold uppercase tracking-widest text-on-surface dark:text-slate-200">
                {status?.lastSyncMonth ?? "—"}
              </div>
              <p className="mt-1.5 text-[10px] text-on-surface-variant/80 dark:text-slate-500">
                Logs: {logs.length} entries
              </p>
            </div>
          </div>

          {/* Trigger panel */}
          <div className="rounded-3xl border border-outline-variant/60 bg-surface p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/30 dark:shadow-2xl dark:backdrop-blur-md">
            <h2 className="mb-1 text-xs font-bold uppercase tracking-wider text-on-surface select-none dark:text-slate-100">
              Trigger Manual Sync
            </h2>
            <p className="mb-5 text-xs leading-relaxed text-on-surface-variant select-none dark:text-slate-400">
              Select a month and click Sync Now to pull attendance records from
              the eSSL eTimetracklite database.{" "}
              <button
                onClick={() => setTab("live")}
                className="text-[#00cec4] hover:underline font-bold cursor-pointer"
              >
                Live Today
              </button>{" "}
              runs automatically every 2 minutes.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-xl border border-outline-variant/60 bg-surface-container-low px-4 py-2 text-sm font-bold text-on-surface outline-none transition-colors hover:border-[#00cec4]/40 focus:border-cyan-500/50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700"
              />
              <button
                id="btn-sync-now"
                onClick={handleSync}
                disabled={syncing || !status?.configured || !status?.connected}
                title={
                  !status?.configured
                    ? "eSSL database not configured — add ESSL_DB_* to .env"
                    : !status?.connected
                      ? "eSSL database offline — cannot sync"
                      : undefined
                }
                className="inline-flex items-center gap-2 bg-[#00cec4] text-slate-950 rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-[#00c4b6] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg"
              >
                {syncing ? (
                  <Spinner className="size-4 animate-spin" />
                ) : (
                  <Play className="size-4" />
                )}
                {syncing ? "Syncing…" : "Sync Now"}
              </button>
              {logs.length > 0 && (
                <button
                  onClick={() => setTab("logs")}
                  className="ml-auto inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-on-surface-variant transition-all hover:text-on-surface active:scale-95 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <Events className="size-3.5" />
                  View Logs
                </button>
              )}
            </div>
            {syncing && (
              <div className="mt-4 flex items-center gap-2 text-xs text-on-surface-variant font-semibold animate-pulse select-none">
                <Spinner className="size-3.5 animate-spin" />
                Connecting to eSSL database… this may take a few seconds
              </div>
            )}
          </div>

          {/* Not-configured warning */}
          {!loadingStatus && !status?.configured && (
            <div className="rounded-3xl border border-amber-500/25 bg-amber-50/70 p-6 backdrop-blur-md dark:bg-amber-500/[0.02]">
              <div className="flex items-start gap-3">
                <Information className="size-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-3">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400">
                    eSSL Database Not Configured
                  </h2>
                  <p className="text-xs leading-relaxed text-on-surface-variant dark:text-slate-400">
                    Add the following to your{" "}
                    <code className="rounded border border-outline-variant/60 bg-surface px-1.5 py-0.5 font-mono text-on-surface dark:border-slate-900 dark:bg-slate-950 dark:text-slate-300">
                      .env
                    </code>{" "}
                    file and restart the server:
                  </p>
                  <pre className="overflow-x-auto rounded-xl border border-outline-variant/60 bg-surface-container-low p-4 text-xs font-mono text-on-surface select-all dark:border-slate-900 dark:bg-slate-950 dark:text-slate-300">
                    {`# eSSL eTimetracklite SQL Server\nESSL_DB_SERVER=DESKTOP-J2P68VT\nESSL_DB_PORT=1433\nESSL_DB_NAME=eTimeTracklite1\nESSL_DB_USER=sa\nESSL_DB_PASSWORD=essl`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Last sync result */}
          {lastResult && (
            <div
              className={`overflow-hidden rounded-3xl border border-l-4 bg-surface shadow-sm dark:bg-[#0e121b] dark:shadow-2xl ${lastResult.success ? "border-l-emerald-500 border-outline-variant/60 dark:border-slate-900" : "border-l-rose-500 border-outline-variant/60 dark:border-slate-900"}`}
            >
              <div className="flex items-center gap-3 border-b border-outline-variant/50 bg-surface-container-low/70 px-6 py-4 select-none dark:border-slate-950/20 dark:bg-slate-950/10">
                {lastResult.success ? (
                  <CheckmarkFilled className="size-5 text-emerald-400" />
                ) : (
                  <Warning className="size-5 text-rose-400" />
                )}
                <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface dark:text-slate-200">
                  {lastResult.success ? "Sync Completed" : "Sync Failed"}
                </h2>
                {lastResult.punchTable && (
                  <span className="rounded border border-outline-variant/60 bg-surface-container-low px-2 py-0.5 text-[10px] font-mono text-on-surface-variant ds-numeric dark:border-slate-900 dark:bg-slate-950">
                    {lastResult.punchTable}
                  </span>
                )}
                {lastResult.success && (
                  <button
                    onClick={() => setTab("logs")}
                    className="ml-auto inline-flex items-center gap-1 text-xs text-[#00cec4] hover:underline font-bold cursor-pointer"
                  >
                    View in Logs Report →
                  </button>
                )}
              </div>
              <div className="p-6">
                {lastResult.success ? (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      {
                        label: "Total Punches",
                        value: (lastResult.totalPunches ?? 0).toLocaleString(),
                        color: "text-on-surface dark:text-slate-200",
                        bg: "bg-surface-container-low dark:bg-slate-950/20",
                        border: "border-outline-variant/60 dark:border-slate-900",
                      },
                      {
                        label: "Employees Found",
                        value: `${lastResult.matchedInHrms ?? 0}/${lastResult.uniqueEmployees ?? 0}`,
                        color: "text-blue-400",
                        bg: "bg-blue-500/[0.01]",
                        border: "border-blue-500/10",
                      },
                      {
                        label: "New Records",
                        value: lastResult.synced ?? 0,
                        color: "text-emerald-400",
                        bg: "bg-emerald-500/[0.01]",
                        border: "border-emerald-500/10",
                      },
                      {
                        label: "Updated",
                        value: lastResult.updated ?? 0,
                        color: "text-cyan-400",
                        bg: "bg-cyan-500/[0.01]",
                        border: "border-cyan-500/10",
                      },
                      {
                        label: "Skipped",
                        value: lastResult.skipped ?? 0,
                        color: "text-amber-500",
                        bg: "bg-amber-500/[0.01]",
                        border: "border-amber-500/10",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={`text-center p-4 ${item.bg} border ${item.border} rounded-2xl`}
                      >
                        <div
                          className={`text-2xl font-black ds-numeric ${item.color}`}
                        >
                          {item.value}
                        </div>
                        <div className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant mt-1 select-none">
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-bold text-rose-400">{lastResult.error}</p>
                )}
              </div>
            </div>
          )}

          {/* How it works */}
          <div className="rounded-3xl border border-outline-variant/60 bg-surface p-6 shadow-sm select-none dark:border-slate-800/60 dark:bg-slate-950/40 dark:shadow-2xl dark:backdrop-blur-md">
            <div className="mb-4 flex items-center gap-2 border-b border-outline-variant/50 pb-3 dark:border-slate-800/40">
              <Renew className="size-4 text-on-surface-variant" />
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60">
                How Biometric Sync Works
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {[
                {
                  step: "1",
                  title: "Connect",
                  desc: "Connects to eSSL eTimetracklite SQL Server (DESKTOP-J2P68VT:1433 / eTimeTracklite1)",
                },
                {
                  step: "2",
                  title: "Discover Table",
                  desc: "Reads from DeviceLogs_{month}_{year}. Looks up device names to determine IN/OUT direction.",
                },
                {
                  step: "3",
                  title: "Map Punches",
                  desc: "First 'In-device' punch = Check-in. Last 'Out-device' punch = Check-out. Falls back to Direction field.",
                },
                {
                  step: "4",
                  title: "Upsert",
                  desc: "Writes attendance into HRMS matching userId to employeeNumber. Live sync fires every 2 minutes.",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-3">
                  <div className="size-6 rounded-xl bg-[#00cec4]/10 border border-[#00cec4]/20 text-[#00cec4] flex items-center justify-center text-[10px] font-black shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-on-surface dark:text-slate-200">
                      {item.title}
                    </div>
                    <div className="mt-1 text-[10px] leading-relaxed text-on-surface-variant/80 dark:text-slate-500">
                      {item.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
