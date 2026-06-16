"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useTransition, useMemo } from "react";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  DataTableToolbar,
} from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import {
  Calendar,
  Clock,
  User,
  CircleDot,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Play,
  ArrowRight,
  MapPin,
  Coffee,
} from "lucide-react";

type Punch = {
  id: string;
  date: string;
  inAt: string | null;
  outAt: string | null;
};

type Employee = {
  id: string;
  name: string;
  employeeNumber: number | null;
};

type PunchCardProps = {
  punches: Punch[];
  today: string;
  canManage: boolean;
  employees: Employee[];
  selectedEmployeeId: string;
  selectedYear: number;
  selectedMonth: number;
};

type TimelineSession = {
  in: string;
  out: string | null;
  durationHours: number | null;
};

type RawPunchEvent = {
  time: string;
  dir: string;
  deviceId: number;
  deviceName: string;
};

export function PunchCard({
  punches,
  today: todayIso,
  canManage,
  employees,
  selectedEmployeeId,
  selectedYear,
  selectedMonth,
}: PunchCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const today = new Date(todayIso);
  const todayStr = today.toISOString().split("T")[0];

  // Active date selection (defaults to today if present in punches, otherwise first punch or today)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const hasToday = punches.some((p) => p.date.startsWith(todayStr));
    if (hasToday) return todayStr;
    return punches.length > 0 ? punches[0]!.date.split("T")[0]! : todayStr;
  });

  // Timeline detailed state
  const [timelineSessions, setTimelineSessions] = useState<TimelineSession[]>([]);
  const [rawEvents, setRawEvents] = useState<RawPunchEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  // Live Today duration calculator state
  const todayPunch = punches.find((p) => p.date.startsWith(todayStr));
  const [liveWorkedTime, setLiveWorkedTime] = useState<string>("");

  // Update live elapsed time counter if currently punched in
  useEffect(() => {
    if (!todayPunch?.inAt || todayPunch.outAt) {
      setLiveWorkedTime("");
      return;
    }

    const inTime = new Date(todayPunch.inAt).getTime();

    const updateCounter = () => {
      const elapsedMs = Date.now() - inTime;
      if (elapsedMs < 0) return;
      const hrs = Math.floor(elapsedMs / 3600000);
      const mins = Math.floor((elapsedMs % 3600000) / 60000);
      const secs = Math.floor((elapsedMs % 60000) / 1000);
      setLiveWorkedTime(
        `${hrs.toString().padStart(2, "0")}:${mins
          .toString()
          .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
      );
    };

    updateCounter();
    const interval = setInterval(updateCounter, 1000);
    return () => clearInterval(interval);
  }, [todayPunch?.inAt, todayPunch?.outAt]);

  // Fetch biometric timeline data on selected date change
  useEffect(() => {
    let active = true;
    setTimelineLoading(true);
    setTimelineError(null);

    async function loadTimeline() {
      try {
        const url = `/api/attendance/day-punches?date=${selectedDateStr}&employeeId=${selectedEmployeeId}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? "No biometric account linked"
              : "Biometric connection offline"
          );
        }
        const data = await res.json();
        if (!active) return;

        if (data.sessions && data.sessions.length > 0) {
          setTimelineSessions(data.sessions);
          setRawEvents(data.rawPunches || []);
        } else {
          // No biometric sessions returned (empty list)
          setTimelineSessions([]);
          setRawEvents([]);
        }
      } catch (err: any) {
        if (!active) return;
        setTimelineError(err.message || "Offline");
        // Apply fallback from Postgres DB summary punches
        const matchPunch = punches.find((p) => p.date.startsWith(selectedDateStr));
        if (matchPunch?.inAt) {
          setTimelineSessions([
            {
              in: matchPunch.inAt,
              out: matchPunch.outAt,
              durationHours:
                matchPunch.inAt && matchPunch.outAt
                  ? (new Date(matchPunch.outAt).getTime() -
                      new Date(matchPunch.inAt).getTime()) /
                    3600000
                  : null,
            },
          ]);
          setRawEvents([
            {
              time: matchPunch.inAt,
              dir: "in",
              deviceId: 0,
              deviceName: "Web Summary Record",
            },
            ...(matchPunch.outAt
              ? [
                  {
                    time: matchPunch.outAt,
                    dir: "out",
                    deviceId: 0,
                    deviceName: "Web Summary Record",
                  },
                ]
              : []),
          ]);
        } else {
          setTimelineSessions([]);
          setRawEvents([]);
        }
      } finally {
        if (active) setTimelineLoading(false);
      }
    }

    loadTimeline();
    return () => {
      active = false;
    };
  }, [selectedDateStr, selectedEmployeeId, punches]);

  const fmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "-";

  const fmtFull = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      : "-";

  const getPercentOfDay = (dateIso: string) => {
    const d = new Date(dateIso);
    const mins = d.getHours() * 60 + d.getMinutes();
    return Math.min(100, Math.max(0, (mins / 1440) * 100));
  };

  async function punch(action: "in" | "out") {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, date: todayStr, userId: selectedEmployeeId }),
      });
      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload.error || "Punch failed");
      }
      router.refresh();
      // Force trigger timeline update
      setSelectedDateStr(todayStr);
    } catch (err: any) {
      alert(err.message || "Punch action failed");
    } finally {
      setLoading(false);
    }
  }

  // Handle server redirection for filters
  const handleFilterChange = (params: {
    employeeId?: string;
    year?: number;
    month?: number;
  }) => {
    const query = new URLSearchParams({
      employeeId: params.employeeId ?? selectedEmployeeId,
      year: String(params.year ?? selectedYear),
      month: String(params.month ?? selectedMonth),
    });
    startTransition(() => {
      router.push(`/attendance/punch?${query.toString()}`);
    });
  };

  // Selected date visual helpers
  const selectedDateFormatted = useMemo(() => {
    const d = new Date(selectedDateStr);
    return d.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, [selectedDateStr]);

  const totalWorkedSelectedDay = useMemo(() => {
    if (timelineSessions.length === 0) return 0;
    return timelineSessions.reduce((sum, s) => {
      if (s.durationHours) return sum + s.durationHours;
      // If currently checked in (out is null) and it's today
      if (s.out === null && selectedDateStr === todayStr) {
        const dur = (Date.now() - new Date(s.in).getTime()) / 3600000;
        return sum + Math.max(0, dur);
      }
      return sum;
    }, 0);
  }, [timelineSessions, selectedDateStr, todayStr]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Sidebar Controls & History Grid */}
      <div className="lg:col-span-2 space-y-6">
        {/* Filters Header */}
        <Card className="border-0 shadow-sm bg-surface">
          <CardContent className="p-4 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              {canManage && employees.length > 0 && (
                <div className="w-56">
                  <DropdownSelect
                    defaultValue={selectedEmployeeId}
                    onValueChange={(val: string) => handleFilterChange({ employeeId: val })}
                    options={employees.map((e) => ({
                      value: e.id,
                      label: `${e.name} ${e.employeeNumber ? `(${e.employeeNumber})` : ""}`,
                    }))}
                    triggerClassName="w-full"
                  />
                </div>
              )}

              <div className="w-36">
                <DropdownSelect
                  defaultValue={String(selectedMonth)}
                  onValueChange={(val: string) => handleFilterChange({ month: parseInt(val, 10) })}
                  options={Array.from({ length: 12 }, (_, i) => ({
                    value: String(i + 1),
                    label: new Date(2000, i, 1).toLocaleString("en-IN", { month: "long" }),
                  }))}
                  triggerClassName="w-full"
                />
              </div>

              <div className="w-28">
                <DropdownSelect
                  defaultValue={String(selectedYear)}
                  onValueChange={(val: string) => handleFilterChange({ year: parseInt(val, 10) })}
                  options={[today.getFullYear() - 1, today.getFullYear()].map((yr) => ({
                    value: String(yr),
                    label: String(yr),
                  }))}
                  triggerClassName="w-full"
                />
              </div>
            </div>
            {isPending && <RefreshCw className="size-4 animate-spin text-indigo-600" />}
          </CardContent>
        </Card>

        {/* Daily Punches Summary List */}
        <DataTable>
          <DataTableToolbar className="justify-between">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Punches Overview (
              {new Date(selectedYear, selectedMonth - 1).toLocaleString("en-IN", {
                month: "long",
                year: "numeric",
              })}
              )
            </p>
          </DataTableToolbar>
          <DataTableHeader>
            <tr>
              <DataTableHead>Date</DataTableHead>
              <DataTableHead>First In</DataTableHead>
              <DataTableHead>Last Out</DataTableHead>
              <DataTableHead>Duration</DataTableHead>
              <DataTableHead className="text-right">Action</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {punches.length === 0 ? (
              <DataTableEmpty colSpan={5} message="No attendance records found." className="py-8" />
            ) : (
              punches.map((p) => {
                const dateOnly = p.date.split("T")[0]!;
                const hours =
                  p.inAt && p.outAt
                    ? ((new Date(p.outAt).getTime() - new Date(p.inAt).getTime()) / 3600000).toFixed(1)
                    : "-";
                const isSelected = selectedDateStr === dateOnly;

                return (
                  <DataTableRow
                    key={p.id}
                    className={`cursor-pointer transition ${
                      isSelected
                        ? "bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/30"
                        : "hover:bg-slate-50/50"
                    }`}
                    onClick={() => setSelectedDateStr(dateOnly)}
                  >
                    <DataTableCell className="font-semibold text-slate-800 dark:text-slate-200">
                      {new Date(p.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        weekday: "short",
                      })}
                    </DataTableCell>
                    <DataTableCell className="text-slate-600 dark:text-slate-400 font-medium">
                      {fmt(p.inAt)}
                    </DataTableCell>
                    <DataTableCell className="text-slate-600 dark:text-slate-400 font-medium">
                      {fmt(p.outAt)}
                    </DataTableCell>
                    <DataTableCell className="font-bold text-slate-700 dark:text-slate-300">
                      {hours} {hours !== "-" ? "hrs" : ""}
                    </DataTableCell>
                    <DataTableCell className="text-right">
                      <div className="flex items-center justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs text-indigo-600 hover:text-indigo-700 font-bold"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDateStr(dateOnly);
                          }}
                        >
                          Details
                        </Button>
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                );
              })
            )}
          </DataTableBody>
        </DataTable>
      </div>

      {/* Right Column: Timeline Panel & Today Controls */}
      <div className="space-y-6">
        {/* Today's Punch Clock Box */}
        <Card className="border-0 shadow-sm border-l-4 border-l-emerald-500 bg-surface">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Clock Control ({today.toDateString()})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/30 p-3 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1">
                    <Clock className="size-3 text-emerald-500" /> Check In
                  </p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {fmt(todayPunch?.inAt ?? null)}
                  </p>
                </div>
                <div className="flex-1 rounded-xl bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100/30 p-3 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1">
                    <Clock className="size-3 text-orange-500" /> Check Out
                  </p>
                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400 mt-1">
                    {fmt(todayPunch?.outAt ?? null)}
                  </p>
                </div>
              </div>

              {liveWorkedTime && (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/30 py-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Live Session: <span className="font-mono text-indigo-600 dark:text-indigo-400">{liveWorkedTime}</span>
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => punch("in")}
                  disabled={loading || !!todayPunch?.inAt}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl h-11"
                >
                  <Play className="size-4 mr-1.5 shrink-0" /> Clock In
                </Button>
                <Button
                  onClick={() => punch("out")}
                  disabled={loading || !todayPunch?.inAt || !!todayPunch?.outAt}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl h-11"
                >
                  <Clock className="size-4 mr-1.5 shrink-0" /> Clock Out
                </Button>
              </div>
            </CardContent>
          </Card>

        {/* Detailed Timeline Panel */}
        <Card className="border-0 shadow-sm bg-surface overflow-hidden">
          <CardHeader className="pb-3 border-b border-outline-variant/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Daily Timeline
              </CardTitle>
              {timelineError && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700">
                  <AlertTriangle className="size-3" /> Offline Mode
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
              {selectedDateFormatted}
            </p>
          </CardHeader>
          <CardContent className="p-5 space-y-6">
            {/* Summary Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50/50 dark:bg-slate-800/10 rounded-lg p-2.5">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  First In
                </p>
                <p className="text-xs font-extrabold text-slate-700 dark:text-slate-300 mt-0.5">
                  {timelineSessions.length > 0 ? fmt(timelineSessions[0]!.in) : "—"}
                </p>
              </div>
              <div className="bg-slate-50/50 dark:bg-slate-800/10 rounded-lg p-2.5">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Last Out
                </p>
                <p className="text-xs font-extrabold text-slate-700 dark:text-slate-300 mt-0.5">
                  {timelineSessions.length > 0 &&
                  timelineSessions[timelineSessions.length - 1]!.out
                    ? fmt(timelineSessions[timelineSessions.length - 1]!.out)
                    : "—"}
                </p>
              </div>
              <div className="bg-slate-50/50 dark:bg-slate-800/10 rounded-lg p-2.5">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Worked
                </p>
                <p className="text-xs font-extrabold text-slate-700 dark:text-slate-300 mt-0.5">
                  {totalWorkedSelectedDay > 0
                    ? `${totalWorkedSelectedDay.toFixed(2)}h`
                    : "—"}
                </p>
              </div>
            </div>

            {/* Horizontal Timeline Visual Bar */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Daily Activity Map
              </p>
              {timelineLoading ? (
                <div className="w-full h-7 bg-slate-100 animate-pulse rounded-lg" />
              ) : timelineSessions.length === 0 ? (
                <div className="w-full h-7 bg-slate-50 dark:bg-slate-800/5 rounded-lg border border-dashed border-outline-variant flex items-center justify-center text-[10px] text-slate-400 font-semibold">
                  No activity logs
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Visual Bar Track */}
                  <div className="relative w-full h-8 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-outline-variant/50">
                    {/* Render active segments */}
                    {timelineSessions.map((session, idx) => {
                      const start = getPercentOfDay(session.in);
                      const outTime = session.out || (selectedDateStr === todayStr ? today.toISOString() : null);
                      const end = outTime ? getPercentOfDay(outTime) : start;
                      const width = Math.max(1, end - start);

                      return (
                        <div
                          key={idx}
                          className="absolute h-full bg-[#00cec4]/80 dark:bg-[#00cec4]/70 border-l border-r border-[#00cec4] flex items-center justify-center text-[8px] font-black text-white truncate"
                          style={{ left: `${start}%`, width: `${width}%` }}
                          title={`Session: ${fmt(session.in)} - ${fmt(session.out)}`}
                        >
                          {width > 8 && "IN"}
                        </div>
                      );
                    })}

                    {/* Live pulsating dot if checked in today */}
                    {selectedDateStr === todayStr &&
                      timelineSessions.some((s) => s.out === null) && (
                        <div
                          className="absolute top-0 h-full w-0.5 bg-emerald-500 flex items-center justify-center"
                          style={{
                            left: `${getPercentOfDay(today.toISOString())}%`,
                          }}
                        >
                          <span className="absolute flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                        </div>
                      )}
                  </div>

                  {/* Horizontal timeline markers */}
                  <div className="flex justify-between text-[8px] text-slate-400 font-bold px-1 select-none">
                    <span>12 AM</span>
                    <span>6 AM</span>
                    <span>12 PM</span>
                    <span>6 PM</span>
                    <span>12 AM</span>
                  </div>
                </div>
              )}
            </div>

            {/* Vertical Log Detail List */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Event Activity Logs
              </p>
              {timelineLoading ? (
                <div className="space-y-3">
                  <div className="h-6 bg-slate-100 animate-pulse rounded-lg w-3/4" />
                  <div className="h-6 bg-slate-100 animate-pulse rounded-lg w-1/2" />
                </div>
              ) : rawEvents.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400/80 font-medium">
                  No biometric device punches registered for this day.
                </div>
              ) : (
                <div className="relative border-l border-slate-200 dark:border-slate-800 ml-2.5 pl-4 space-y-4">
                  {rawEvents.map((evt, idx) => {
                    const isIn = evt.dir === "in";

                    // Calculate breaks between sessions if checkout
                    const prevOut = idx > 0 && rawEvents[idx - 1]!.dir === "out" ? rawEvents[idx - 1]! : null;
                    const breakHours = prevOut && isIn
                      ? (new Date(evt.time).getTime() - new Date(prevOut.time).getTime()) / 3600000
                      : null;

                    return (
                      <div key={idx} className="relative group space-y-1">
                        {/* Break display */}
                        {breakHours !== null && breakHours > 0.05 && (
                          <div className="absolute -top-3.5 left-[-22px] flex items-center gap-1.5 text-[9px] text-slate-400 font-bold bg-surface px-1 py-0.5 rounded border border-outline-variant/60 shadow-sm">
                            <Coffee className="size-3 text-amber-500 shrink-0" />
                            <span>Break: {(breakHours * 60).toFixed(0)} min</span>
                          </div>
                        )}

                        {/* Node marker */}
                        <div
                          className={`absolute left-[-21px] top-1.5 size-2.5 rounded-full border-2 bg-surface transition ${
                            isIn
                              ? "border-emerald-500 ring-2 ring-emerald-100/50"
                              : "border-orange-500 ring-2 ring-orange-100/50"
                          }`}
                        />

                        {/* Event details */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              {isIn ? "Check In" : "Check Out"}{" "}
                              <span className="text-[10px] text-slate-400 font-semibold font-mono">
                                ({fmtFull(evt.time)})
                              </span>
                            </h5>
                            <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 mt-0.5 truncate">
                              <MapPin className="size-3 text-slate-300" />
                              {evt.deviceName || `Device ID: ${evt.deviceId}`}
                            </p>
                          </div>

                          {/* Session duration badge for check-out events */}
                          {!isIn && idx > 0 && rawEvents[idx - 1]!.dir === "in" && (
                            <span className="shrink-0 inline-flex items-center rounded-full bg-[#00cec4]/10 border border-[#00cec4]/30 px-2 py-0.5 text-[9px] font-black text-[#00cec4]">
                              {(
                                (new Date(evt.time).getTime() -
                                  new Date(rawEvents[idx - 1]!.time).getTime()) /
                                3600000
                              ).toFixed(1)}
                              h worked
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
