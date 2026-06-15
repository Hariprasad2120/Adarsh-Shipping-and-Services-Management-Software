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
  totalHours: number | null;
  status: "IN" | "OUT" | "NOT_ARRIVED";
}

interface LiveData {
  date: string;
  employees: LiveEmployee[];
  lastLiveSync: string | null;
  presentCount: number;
  outCount: number;
  notArrivedCount: number;
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

// ─── Status badge classes ─────────────────────────────────────────────────────

const STATUS_BADGE: Record<
  "IN" | "OUT" | "NOT_ARRIVED",
  { bg: string; text: string; label: string }
> = {
  IN: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    label: "INSIDE",
  },
  OUT: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    label: "LEFT",
  },
  NOT_ARRIVED: {
    bg: "bg-gray-100",
    text: "text-gray-500",
    label: "NOT IN",
  },
};

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
  bg,
  border,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${bg} ${border} flex flex-col gap-2`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
          {label}
        </span>
      </div>
      <div className={`text-2xl font-bold ds-numeric ${color}`}>{value}</div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BiometricSyncClient() {
  const [tab, setTab] = useState<"live" | "logs" | "sync">("live");
  const [month, setMonth] = useState(currentMonth());
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [liveSyncing, setLiveSyncing] = useState(false);
  const [liveFilter, setLiveFilter] = useState<
    "ALL" | "IN" | "OUT" | "NOT_ARRIVED"
  >("ALL");
  const [lastLiveSyncText, setLastLiveSyncText] = useState("Never");
  const liveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLiveSyncRef = useRef<Date | null>(null);

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
    void fetchStatus();
  }, [fetchStatus]);

  // ── Live today: POST sync then GET snapshot ─────────────────────────────────
  const triggerLiveSyncAndRefresh = useCallback(
    async (silent = false) => {
      if (!silent) setLiveSyncing(true);
      try {
        await fetch("/api/attendance/sync/biometric/live", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ triggeredBy: "LIVE_AUTO" }),
        });
        const r = await fetch("/api/attendance/sync/biometric/live");
        if (r.ok) {
          const data = (await r.json()) as LiveData;
          setLiveData(data);
          const now = new Date();
          lastLiveSyncRef.current = now;
          setLastLiveSyncText("Just now");
        }
      } catch {
        /* silent */
      } finally {
        if (!silent) setLiveSyncing(false);
      }
    },
    [],
  );

  // Auto-refresh every 2 min when on live tab
  useEffect(() => {
    if (tab !== "live") return;
    void triggerLiveSyncAndRefresh(false);
    liveIntervalRef.current = setInterval(() => {
      void triggerLiveSyncAndRefresh(true);
    }, 2 * 60 * 1000);
    return () => {
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Tick — update relative time display every 30 s
  useEffect(() => {
    const t = setInterval(() => {
      const ls = lastLiveSyncRef.current;
      if (ls) {
        const mins = Math.round((Date.now() - ls.getTime()) / 60000);
        setLastLiveSyncText(mins < 1 ? "Just now" : `${mins}m ago`);
      }
    }, 30_000);
    return () => clearInterval(t);
  }, []);

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
      if (data.success) {
        toast.success(
          `Sync complete — ${data.synced ?? 0} new, ${data.updated ?? 0} updated, ${data.skipped ?? 0} skipped`,
        );
        void fetchStatus();
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

  return (
    <div className="space-y-6 max-w-6xl">
      {/* ── Page subheader + connection pill ─────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <p className="text-sm text-gray-500">
          Live attendance monitor and eSSL eTimetracklite sync control
        </p>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-semibold">
          {loadingStatus ? (
            <Spinner className="size-3.5 animate-spin text-gray-400" />
          ) : status?.configured ? (
            <Wifi className="size-3.5 text-emerald-500" />
          ) : (
            <WifiOff className="size-3.5 text-red-500" />
          )}
          <span
            className={
              status?.configured ? "text-emerald-600" : "text-red-600"
            }
          >
            {status?.configured ? "eSSL Connected" : "Not Configured"}
          </span>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {(["live", "logs", "sync"] as const).map((t) => (
          <button
            key={t}
            id={`tab-biometric-${t}`}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            {t === "live" && (
              <>
                <Radio className="size-4" />
                Live Today
                {liveData && (
                  <span className="ml-1 flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 rounded-full px-1.5 py-0.5 font-bold">
                    <span className="size-1 rounded-full bg-emerald-500 animate-pulse" />
                    {liveData.presentCount} IN
                  </span>
                )}
              </>
            )}
            {t === "logs" && (
              <>
                <List className="size-4" />
                Logs Report
                {logs.length > 0 && (
                  <span className="ml-1 text-[10px] bg-primary/10 text-primary rounded-full px-1.5 py-0.5 font-bold">
                    {logs.length}
                  </span>
                )}
              </>
            )}
            {t === "sync" && (
              <>
                <Renew className="size-4" />
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
        <div className="space-y-4">
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Currently Inside"
              value={liveData?.presentCount ?? "—"}
              icon={<UserFollow className="size-5 text-emerald-500" />}
              color="text-emerald-600"
              bg="bg-emerald-50"
              border="border-emerald-200"
            />
            <StatCard
              label="Left for the Day"
              value={liveData?.outCount ?? "—"}
              icon={<Logout className="size-5 text-orange-500" />}
              color="text-orange-600"
              bg="bg-orange-50"
              border="border-orange-200"
            />
            <StatCard
              label="Not Yet Arrived"
              value={liveData?.notArrivedCount ?? "—"}
              icon={<User className="size-5 text-gray-400" />}
              color="text-gray-500"
              bg="bg-gray-50"
              border="border-gray-200"
            />
            <StatCard
              label="Total Employees"
              value={liveData?.employees.length ?? "—"}
              icon={<UserAvatarFilled className="size-5 text-primary" />}
              color="text-primary"
              bg="bg-white"
              border="border-gray-200"
            />
          </div>

          {/* Monitor panel */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50 flex-wrap">
              <div className="flex items-center gap-2">
                <Radio className="size-4 text-emerald-500" />
                <span className="text-sm font-semibold text-gray-900">
                  Live Attendance Monitor
                </span>
                {liveData && (
                  <span className="text-xs text-gray-500">
                    — {liveData.date}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Filter pills */}
                <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
                  {(
                    ["ALL", "IN", "OUT", "NOT_ARRIVED"] as const
                  ).map((f) => (
                    <button
                      key={f}
                      id={`filter-live-${f.toLowerCase()}`}
                      onClick={() => setLiveFilter(f)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-colors ${
                        liveFilter === f
                          ? "bg-primary text-white"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      {f === "NOT_ARRIVED" ? "NOT IN" : f}
                    </button>
                  ))}
                </div>

                {/* Auto-sync status */}
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Auto-sync every 2 min · Last: {lastLiveSyncText}
                </div>

                {/* Manual refresh */}
                <button
                  id="btn-live-sync-now"
                  onClick={() => void triggerLiveSyncAndRefresh(false)}
                  disabled={liveSyncing}
                  className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50"
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

            {/* Employee list */}
            {liveSyncing && !liveData ? (
              <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
                <Spinner className="size-5 animate-spin" />
                <span className="text-sm">Syncing from eSSL…</span>
              </div>
            ) : displayedEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <UserAvatarFilled className="size-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">
                  No employees match the current filter
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {[...byDept.entries()].map(([dept, emps]) => (
                  <div key={dept}>
                    {/* Department header */}
                    <div className="flex items-center gap-2 px-5 py-2 bg-gray-50 border-b border-gray-100">
                      <Building className="size-3.5 text-gray-400" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                        {dept}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        ({emps.length})
                      </span>
                      <div className="ml-auto flex items-center gap-2">
                        <span className="text-[10px] text-emerald-600 font-semibold">
                          {emps.filter((e) => e.status === "IN").length} IN
                        </span>
                        <span className="text-[10px] text-gray-400">
                          ·{" "}
                          {emps.filter((e) => e.status === "OUT").length} OUT
                        </span>
                      </div>
                    </div>
                    {/* Employees */}
                    <div className="divide-y divide-gray-50">
                      {emps.map((emp) => {
                        const badge = STATUS_BADGE[emp.status];
                        return (
                          <div
                            key={emp.id}
                            className={`flex items-center gap-4 px-5 py-3 transition-colors ${
                              emp.status === "IN"
                                ? "bg-emerald-50/40 hover:bg-emerald-50/60"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            {/* Pulse dot */}
                            <div className="shrink-0">
                              {emp.status === "IN" ? (
                                <div className="relative size-3">
                                  <div className="size-3 rounded-full bg-emerald-500" />
                                  <div className="absolute inset-0 size-3 rounded-full bg-emerald-400 animate-ping opacity-75" />
                                </div>
                              ) : emp.status === "OUT" ? (
                                <div className="size-3 rounded-full bg-orange-400" />
                              ) : (
                                <div className="size-3 rounded-full bg-gray-300" />
                              )}
                            </div>

                            {/* Name + EMP no */}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">
                                {emp.name}
                              </div>
                              <div className="text-[10px] text-gray-400 ds-numeric">
                                EMP-
                                {String(emp.employeeNumber ?? "—").padStart(
                                  3,
                                  "0",
                                )}
                              </div>
                            </div>

                            {/* Status badge */}
                            <div className="shrink-0">
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${badge.bg} ${badge.text}`}
                              >
                                {emp.status === "IN" && (
                                  <Flash className="size-2.5" />
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
                            <div className="w-24 text-right shrink-0">
                              {emp.checkIn ? (
                                <div>
                                  <div className="text-xs font-semibold text-gray-900 ds-numeric">
                                    {fmtTimeShort(emp.checkIn)}
                                  </div>
                                  <div className="text-[9px] text-gray-400">
                                    Check-in
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-300 ds-numeric">
                                  —
                                </div>
                              )}
                            </div>

                            {/* Check-out */}
                            <div className="w-24 text-right shrink-0">
                              {emp.checkOut ? (
                                <div>
                                  <div className="text-xs font-semibold text-gray-900 ds-numeric">
                                    {fmtTimeShort(emp.checkOut)}
                                  </div>
                                  <div className="text-[9px] text-gray-400">
                                    Check-out
                                  </div>
                                </div>
                              ) : emp.status === "IN" ? (
                                <div className="text-[10px] text-emerald-500 font-semibold animate-pulse">
                                  Still inside
                                </div>
                              ) : (
                                <div className="text-xs text-gray-300 ds-numeric">
                                  —
                                </div>
                              )}
                            </div>

                            {/* Hours */}
                            <div className="w-20 text-right shrink-0">
                              {emp.totalHours ? (
                                <div className="text-xs font-bold text-gray-900 ds-numeric">
                                  {fmtHours(emp.totalHours)}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-300">—</div>
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
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <List className="size-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-900">
                Sync History
              </span>
              <span className="text-xs text-gray-400">
                ({logs.length} entries — last 200 kept)
              </span>
            </div>
            <button
              id="btn-logs-refresh"
              onClick={() => void fetchStatus()}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors"
            >
              <Renew className="size-3.5" />
              Refresh
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center">
                <DataBase className="size-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">
                No sync history yet
              </p>
              <p className="text-xs text-gray-500 max-w-xs">
                Switch to{" "}
                <button
                  onClick={() => setTab("live")}
                  className="text-primary underline underline-offset-2"
                >
                  Live Today
                </button>{" "}
                to trigger an automatic sync, or use{" "}
                <button
                  onClick={() => setTab("sync")}
                  className="text-primary underline underline-offset-2"
                >
                  Manual Sync
                </button>
                .
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
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
                        className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log, i) => {
                    const isLive =
                      log.triggeredBy === "LIVE_AUTO" ||
                      log.month.startsWith("TODAY");
                    return (
                      <tr
                        key={i}
                        className={`transition-colors hover:bg-gray-50 ${i === 0 ? "bg-emerald-50/30" : ""}`}
                      >
                        <td className="px-4 py-3 ds-numeric text-xs text-gray-700 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {i === 0 && (
                              <span className="size-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                            )}
                            {fmtTime(log.time)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                          {isLive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                              <span className="size-1 rounded-full bg-emerald-500" />
                              {log.month}
                            </span>
                          ) : (
                            log.month
                          )}
                        </td>
                        <td className="px-4 py-3 ds-numeric text-[11px] text-gray-400 whitespace-nowrap">
                          {log.punchTable}
                        </td>
                        <td className="px-4 py-3 text-xs text-right font-medium text-gray-700">
                          {log.totalPunches.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-xs text-right text-gray-700">
                          {log.matchedInHrms}
                          <span className="text-gray-400">
                            /{log.uniqueEmployees}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-right">
                          <span className="font-semibold text-emerald-600">
                            {log.synced}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-right">
                          <span className="font-semibold text-blue-600">
                            {log.updated}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-right">
                          <span className="text-amber-600">{log.skipped}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              log.status === 200
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-600"
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
                        <td className="px-4 py-3 text-xs text-right ds-numeric text-gray-400 whitespace-nowrap">
                          {log.timeTakenMs < 1000
                            ? `${log.timeTakenMs}ms`
                            : `${(log.timeTakenMs / 1000).toFixed(1)}s`}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {isLive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
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
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3 mb-3">
                {loadingStatus ? (
                  <Spinner className="size-5 text-gray-400 animate-spin" />
                ) : status?.configured ? (
                  <Wifi className="size-5 text-emerald-500" />
                ) : (
                  <WifiOff className="size-5 text-red-500" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Connection
                </span>
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {loadingStatus
                  ? "Checking…"
                  : status?.configured
                    ? "eSSL DB Configured"
                    : "Not Configured"}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {status?.configured
                  ? "ESSL_DB_SERVER / ESSL_DB_NAME set"
                  : "Set ESSL_DB_* vars in .env"}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3 mb-3">
                <Time className="size-5 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Last Sync
                </span>
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {status?.lastSync
                  ? formatRelativeTime(status.lastSync)
                  : "Never synced"}
              </div>
              <p className="text-xs text-gray-500 mt-1 ds-numeric">
                {status?.lastSync ? fmtTime(status.lastSync) : "—"}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3 mb-3">
                <CalendarHeatMap className="size-5 text-orange-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Last Month Synced
                </span>
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {status?.lastSyncMonth ?? "—"}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Logs: {logs.length} entries
              </p>
            </div>
          </div>

          {/* Trigger panel */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">
              Trigger Manual Sync
            </h2>
            <p className="text-xs text-gray-500 mb-5">
              Select a month and click Sync Now to pull attendance records from
              the eSSL eTimetracklite database.{" "}
              <button
                onClick={() => setTab("live")}
                className="text-primary underline underline-offset-2"
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
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none"
              />
              <button
                id="btn-sync-now"
                onClick={handleSync}
                disabled={syncing || !status?.configured}
                className="inline-flex items-center gap-2 bg-primary text-white rounded-xl px-5 py-2 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
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
                  className="ml-auto inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <Events className="size-3.5" />
                  View Logs
                </button>
              )}
            </div>
            {syncing && (
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 animate-pulse">
                <Spinner className="size-3.5 animate-spin" />
                Connecting to eSSL database… this may take a few seconds
              </div>
            )}
          </div>

          {/* Not-configured warning */}
          {!loadingStatus && !status?.configured && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
              <div className="flex items-start gap-3">
                <Information className="size-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-amber-900">
                    eSSL Database Not Configured
                  </h2>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Add the following to your{" "}
                    <code className="font-mono bg-amber-100 px-1 rounded">
                      .env
                    </code>{" "}
                    file and restart the server:
                  </p>
                  <pre className="text-xs bg-amber-900/10 border border-amber-200 rounded-lg p-4 font-mono text-amber-900 overflow-x-auto">
                    {`# eSSL eTimetracklite SQL Server\nESSL_DB_SERVER=DESKTOP-J2P68VT\nESSL_DB_PORT=1433\nESSL_DB_NAME=eTimeTracklite1\nESSL_DB_USER=sa\nESSL_DB_PASSWORD=essl`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Last sync result */}
          {lastResult && (
            <div
              className={`rounded-xl border bg-white overflow-hidden border-l-4 ${lastResult.success ? "border-l-emerald-500" : "border-l-red-500"}`}
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                {lastResult.success ? (
                  <CheckmarkFilled className="size-5 text-emerald-500" />
                ) : (
                  <Warning className="size-5 text-red-500" />
                )}
                <h2 className="text-sm font-semibold text-gray-900">
                  {lastResult.success ? "Sync Completed" : "Sync Failed"}
                </h2>
                {lastResult.punchTable && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded ds-numeric">
                    {lastResult.punchTable}
                  </span>
                )}
                {lastResult.success && (
                  <button
                    onClick={() => setTab("logs")}
                    className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline"
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
                        color: "text-gray-900",
                        bg: "bg-gray-50",
                        border: "border-gray-200",
                      },
                      {
                        label: "Employees Found",
                        value: `${lastResult.matchedInHrms ?? 0}/${lastResult.uniqueEmployees ?? 0}`,
                        color: "text-blue-600",
                        bg: "bg-blue-50",
                        border: "border-blue-200",
                      },
                      {
                        label: "New Records",
                        value: lastResult.synced ?? 0,
                        color: "text-emerald-600",
                        bg: "bg-emerald-50",
                        border: "border-emerald-200",
                      },
                      {
                        label: "Updated",
                        value: lastResult.updated ?? 0,
                        color: "text-cyan-600",
                        bg: "bg-cyan-50",
                        border: "border-cyan-200",
                      },
                      {
                        label: "Skipped",
                        value: lastResult.skipped ?? 0,
                        color: "text-amber-600",
                        bg: "bg-amber-50",
                        border: "border-amber-200",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={`text-center p-4 ${item.bg} border ${item.border} rounded-xl`}
                      >
                        <div
                          className={`text-2xl font-bold ds-numeric ${item.color}`}
                        >
                          {item.value}
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-1">
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-red-600">{lastResult.error}</p>
                )}
              </div>
            </div>
          )}

          {/* How it works */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-2 mb-4">
              <Renew className="size-4 text-gray-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
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
                  <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-900">
                      {item.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">
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
