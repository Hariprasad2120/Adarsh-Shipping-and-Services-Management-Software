"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, Clock, Wifi, MapPin, Shield, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveTimeoutAction, getActiveSessionsAction } from "./actions";

type ActiveSession = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  loginAt: string;
  lastSeenAt: string;
  ipAddress: string | null;
  location: string | null;
  durationMs: number;
};

type SessionHistory = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  loginAt: string;
  lastSeenAt: string;
  logoutAt: string | null;
  status: string;
  ipAddress: string | null;
  location: string | null;
  durationMs: number;
};

type SecurityEvent = {
  id: string;
  event: string;
  outcome: string;
  email: string | null;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

type Props = {
  initialActive: ActiveSession[];
  history: SessionHistory[];
  securityEvents: SecurityEvent[];
  renderedAt: string;
  timeoutMinutes: number;
};

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

const roleColors: Record<string, string> = {
  Admin: "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-950/40",
  Management: "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950/40",
  Manager: "text-teal-600 bg-teal-100 dark:text-teal-400 dark:bg-teal-950/40",
  HR: "text-cyan-600 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-950/40",
  TL: "text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-950/40",
  Employee: "text-on-surface-variant bg-surface-container-high dark:text-on-surface-variant dark:bg-slate-950/40",
};

const statusColors: Record<string, string> = {
  ACTIVE: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-950/40",
  TIMED_OUT: "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950/40",
  LOGGED_OUT: "text-on-surface-variant bg-surface-container-high dark:text-on-surface-variant dark:bg-slate-950/40",
};

const outcomeColors: Record<string, string> = {
  SUCCESS: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-950/40",
  FAILED: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-950/40",
};

function formatEventLabel(event: string): string {
  return event.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SessionsDashboard({ initialActive, history, securityEvents, renderedAt, timeoutMinutes }: Props) {
  const [active, setActive] = useState<ActiveSession[]>(initialActive);
  const [nowMs, setNowMs] = useState(() => new Date(renderedAt).getTime());
  const [newTimeout, setNewTimeout] = useState<string>(String(timeoutMinutes));
  const [savingTimeout, setSavingTimeout] = useState(false);
  const [timeoutSaved, setTimeoutSaved] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const todayCutoffMs = nowMs - 86_400_000;

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await getActiveSessionsAction();
      setActive(data);
    } catch {
      // silent
    }
    setRefreshing(false);
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const interval = setInterval(() => setNowMs(new Date().getTime()), 30_000);
    return () => clearInterval(interval);
  }, []);

  async function saveTimeout() {
    const mins = parseInt(newTimeout, 10);
    if (isNaN(mins) || mins < 1) return;
    setSavingTimeout(true);
    try {
      await saveTimeoutAction(mins);
      setTimeoutSaved(true);
      setTimeout(() => setTimeoutSaved(false), 2000);
    } catch {
      // silent
    }
    setSavingTimeout(false);
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Now", value: active.length, icon: <Wifi className="size-4" />, color: "text-green-600 dark:text-green-400" },
          { label: "Today's Sessions", value: history.filter((s) => new Date(s.loginAt).getTime() > todayCutoffMs).length, icon: <Users className="size-4" />, color: "text-[#00cec4]" },
          { label: "Timed Out", value: history.filter((s) => s.status === "TIMED_OUT").length, icon: <Clock className="size-4" />, color: "text-amber-600 dark:text-amber-400" },
          { label: "Timeout Config", value: `${timeoutMinutes}m`, icon: <Shield className="size-4" />, color: "text-[#ff8333]" },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface border border-outline-variant rounded-xl p-4 flex items-center gap-3 shadow-sm"
          >
            <div className={`${stat.color} shrink-0`}>{stat.icon}</div>
            <div>
              <div className="text-xl font-extrabold text-on-surface-variant dark:text-white">{stat.value}</div>
              <div className="text-xs text-on-surface-variant font-semibold">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Timeout config */}
      <div className="bg-surface border border-outline-variant rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-on-surface-variant dark:text-on-surface-variant mb-3 flex items-center gap-2">
          <Shield className="size-4 text-[#ff8333]" />
          Inactivity Timeout Config
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={480}
              value={newTimeout}
              onChange={(e) => setNewTimeout(e.target.value)}
              className="w-20 h-11 rounded-xl border border-[#00cec4]/55 bg-surface px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/15 transition"
            />
            <span className="text-sm font-semibold text-on-surface-variant">minutes</span>
          </div>
          <Button
            size="sm"
            onClick={saveTimeout}
            disabled={savingTimeout}
            className="h-11 px-5 bg-[#00cec4] hover:bg-[#00b8af] text-white text-xs font-semibold rounded-xl"
          >
            {savingTimeout ? "Saving…" : timeoutSaved ? "Saved ✓" : "Save"}
          </Button>
          <p className="text-xs font-semibold text-on-surface-variant max-w-md">
            Warning appears during the final 20% of idle time, capped at 2 minutes. Changes apply after the next page load.
          </p>
        </div>
      </div>

      {/* Active sessions */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-sm font-bold text-on-surface-variant dark:text-on-surface-variant flex items-center gap-2">
            <Wifi className="size-4 text-green-500" />
            Currently Active Sessions
            <span className="ml-1 text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2.5 py-0.5 rounded-full font-bold">
              {active.length}
            </span>
          </h2>
          <Button
            size="sm"
            variant="outline"
            onClick={refresh}
            disabled={refreshing}
            className="h-9 text-xs font-semibold border-outline-variant/60 hover:bg-surface-container-low text-on-surface gap-1.5 rounded-xl"
          >
            <RefreshCw className={`size-3 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {active.length === 0 ? (
          <div className="text-center py-16 text-on-surface-variant font-semibold border border-dashed border-outline-variant/80 rounded-xl bg-surface">
            No active sessions
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((s, idx) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="bg-surface border border-outline-variant rounded-xl px-5 py-4 flex flex-col md:flex-row md:items-center gap-4 shadow-sm"
              >
                {/* User info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="size-9 rounded-xl bg-gradient-to-br from-[#00cec4] to-[#008993] flex items-center justify-center text-xs font-extrabold text-white shrink-0">
                    {s.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-on-surface-variant dark:text-white truncate">{s.userName}</div>
                    <div className="text-xs text-on-surface-variant font-semibold truncate">{s.userEmail}</div>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded ml-auto md:ml-2 uppercase ${roleColors[s.userRole] ?? "text-on-surface-variant bg-surface-container-high"}`}>
                    {s.userRole}
                  </span>
                </div>

                {/* Session meta */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-on-surface-variant dark:text-on-surface-variant font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    <span>Login: {formatTime(s.loginAt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Wifi className="size-3.5 text-green-500" />
                    <span className="text-green-500">Active {formatDuration(nowMs - new Date(s.loginAt).getTime())}</span>
                  </div>
                  {s.ipAddress && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3.5" />
                      <span>{s.ipAddress}{s.location ? ` · ${s.location}` : ""}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Session history */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-on-surface-variant dark:text-on-surface-variant flex items-center gap-2">
          <Clock className="size-4 text-on-surface-variant" />
          Session History (last 100)
        </h2>
        <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[700px]">
              <thead>
                <tr className="border-b border-outline-variant bg-slate-50 dark:bg-slate-800/30 text-xs font-bold text-on-surface-variant dark:text-on-surface-variant">
                  <th className="px-5 py-3 font-semibold">User</th>
                  <th className="px-5 py-3 font-semibold">Login</th>
                  <th className="px-5 py-3 font-semibold">Duration</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">IP / Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60 font-medium text-on-surface-variant dark:text-on-surface-variant">
                {history.map((s, idx) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50/30 dark:hover:bg-slate-800/5 transition duration-150"
                  >
                    <td className="px-5 py-3">
                      <div className="font-bold text-on-surface-variant dark:text-white">{s.userName}</div>
                      <div className="text-xs text-on-surface-variant font-semibold">{s.userEmail}</div>
                    </td>
                    <td className="px-5 py-3 text-on-surface-variant font-semibold whitespace-nowrap">{formatTime(s.loginAt)}</td>
                    <td className="px-5 py-3 text-on-surface-variant font-semibold whitespace-nowrap">
                      {formatDuration(
                        s.logoutAt
                          ? new Date(s.logoutAt).getTime() - new Date(s.loginAt).getTime()
                          : new Date(s.lastSeenAt).getTime() - new Date(s.loginAt).getTime()
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${statusColors[s.status] ?? "text-on-surface-variant"}`}>
                        {s.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-on-surface-variant font-semibold">
                      {s.ipAddress ?? "—"}
                      {s.location ? ` · ${s.location}` : ""}
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-on-surface-variant font-semibold">No session history</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Security audit trail */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-on-surface-variant dark:text-on-surface-variant flex items-center gap-2">
          <Shield className="size-4 text-[#ff8333]" />
          Security Audit Trail (last 100)
        </h2>
        <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[800px]">
              <thead>
                <tr className="border-b border-outline-variant bg-slate-50 dark:bg-slate-800/30 text-xs font-bold text-on-surface-variant dark:text-on-surface-variant">
                  <th className="px-5 py-3 font-semibold">When</th>
                  <th className="px-5 py-3 font-semibold">Event</th>
                  <th className="px-5 py-3 font-semibold">Outcome</th>
                  <th className="px-5 py-3 font-semibold">User</th>
                  <th className="px-5 py-3 font-semibold">IP</th>
                  <th className="px-5 py-3 font-semibold">User Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60 font-medium text-on-surface-variant dark:text-on-surface-variant">
                {securityEvents.map((event, idx) => (
                  <tr
                    key={event.id}
                    className="hover:bg-slate-50/30 dark:hover:bg-slate-800/5 transition duration-150"
                  >
                    <td className="px-5 py-3 text-on-surface-variant font-semibold whitespace-nowrap">{formatTime(event.createdAt)}</td>
                    <td className="px-5 py-3 text-on-surface-variant dark:text-on-surface-variant font-semibold whitespace-nowrap">{formatEventLabel(event.event)}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${outcomeColors[event.outcome] ?? "text-on-surface-variant"}`}>
                        {event.outcome}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-bold text-on-surface-variant dark:text-white">{event.userName ?? event.email ?? "Unknown"}</div>
                      <div className="text-xs text-on-surface-variant font-semibold">{event.userEmail ?? event.email ?? "No account matched"}</div>
                    </td>
                    <td className="px-5 py-3 text-on-surface-variant font-semibold whitespace-nowrap">{event.ipAddress ?? "N/A"}</td>
                    <td className="px-5 py-3 text-on-surface-variant font-semibold max-w-[260px] truncate" title={event.userAgent ?? ""}>{event.userAgent ?? "N/A"}</td>
                  </tr>
                ))}
                {securityEvents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-on-surface-variant font-semibold">No security events yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
