"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { cn } from "@/lib/utils";
import {
  Calendar,
  CheckCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

type Punch = {
  id: string;
  date: string;
  inAt: string | null;
  outAt: string | null;
};

type OtRecord = {
  date: string;
  otHours: number;
  otAmount: number;
  dayType: string;
};

type Employee = {
  id: string;
  name: string;
  employeeNumber: number | null;
};

type PunchCardProps = {
  punches: Punch[];
  otRecords: OtRecord[];
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
  inDevice?: string | null;
  outDevice?: string | null;
};

export function PunchCard({
  punches,
  otRecords,
  today: todayIso,
  canManage,
  employees,
  selectedEmployeeId,
  selectedYear,
  selectedMonth,
}: PunchCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Real-time system clock state to calculate current day worked time and progress bar live
  // We initialize it using todayIso and track elapsed time via performance/Date.now offset to support frozen system clock.
  const [nowState, setNowState] = useState<Date>(() => new Date(todayIso));

  useEffect(() => {
    const startClientTime = Date.now();
    const startServerTime = new Date(todayIso).getTime();

    const timer = setInterval(() => {
      const elapsed = Date.now() - startClientTime;
      setNowState(new Date(startServerTime + elapsed));
    }, 10000); // Update every 10 seconds
    return () => clearInterval(timer);
  }, [todayIso]);

  // Today's local date string representation (live roll-over at midnight)
  const todayStr = useMemo(() => {
    return `${nowState.getFullYear()}-${String(nowState.getMonth() + 1).padStart(2, "0")}-${String(nowState.getDate()).padStart(2, "0")}`;
  }, [nowState]);

  // Active date selection
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const d = new Date(todayIso);
    const todayYear = d.getFullYear();
    const todayMonth = d.getMonth() + 1;
    const todayStrLocal = `${todayYear}-${String(todayMonth).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (todayYear === selectedYear && todayMonth === selectedMonth) {
      return todayStrLocal;
    }
    return `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
  });

  // Timeline detailed state for sidebar
  const [timelineSessions, setTimelineSessions] = useState<TimelineSession[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  const syncLabel = isPending ? "Updating..." : "Synced live";

  // Generate all days of the selected month
  const daysInMonth = useMemo(() => {
    const totalDays = new Date(selectedYear, selectedMonth, 0).getDate();
    const list = [];
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(selectedYear, selectedMonth - 1, d);
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      const punch = punches.find((p) => p.date.startsWith(dateStr));
      const ot = otRecords.find((o) => o.date.startsWith(dateStr));
      
      list.push({
        dayNum: d,
        dayName: date.toLocaleDateString("en-IN", { weekday: "short" }).toUpperCase(),
        dateStr,
        isWeekend,
        dayOfWeek,
        punch,
        ot,
      });
    }
    return list;
  }, [selectedYear, selectedMonth, punches, otRecords]);

  // Fetch biometric timeline data on selected date change
  useEffect(() => {
    let active = true;
    setTimelineLoading(true);
    setTimelineError(null);

    async function loadTimeline(showLoading = true) {
      if (showLoading) setTimelineLoading(true);
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
        } else {
          setTimelineSessions([]);
        }
      } catch (err: any) {
        if (!active) return;
        setTimelineError(err.message || "Offline");
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
              inDevice: "Web Summary Record",
              outDevice: matchPunch.outAt ? "Web Summary Record" : null,
            },
          ]);
        } else {
          setTimelineSessions([]);
        }
      } finally {
        if (active) setTimelineLoading(false);
      }
    }

    loadTimeline(true);

    let timer: NodeJS.Timeout | null = null;
    if (selectedDateStr === todayStr) {
      timer = setInterval(() => {
        loadTimeline(false);
      }, 10000);
    }

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [selectedDateStr, selectedEmployeeId, punches, todayStr]);

  const fmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "-";

  // Maps time to coordinates on standard timeline grid (9:30 AM to 5:30 PM)
  const getPercent = (timeIso: string | null) => {
    if (!timeIso) return 0;
    const t = new Date(timeIso);
    const mins = t.getHours() * 60 + t.getMinutes();
    
    const startLimit = 9 * 60 + 30; // 9:30 AM
    const endLimit = 17 * 60 + 30; // 5:30 PM
    const total = endLimit - startLimit;
    
    const pct = ((mins - startLimit) / total) * 100;
    return Math.min(100, Math.max(0, pct));
  };

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

  const handlePrevMonth = () => {
    let newMonth = selectedMonth - 1;
    let newYear = selectedYear;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    handleFilterChange({ month: newMonth, year: newYear });
  };

  const handleNextMonth = () => {
    let newMonth = selectedMonth + 1;
    let newYear = selectedYear;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    handleFilterChange({ month: newMonth, year: newYear });
  };

  const selectedDateFormatted = useMemo(() => {
    const d = new Date(selectedDateStr);
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, [selectedDateStr]);

  const selectedDayMetrics = useMemo(() => {
    const dayPunch = punches.find((p) => p.date.startsWith(selectedDateStr));
    const dayOt = otRecords.find((o) => o.date.startsWith(selectedDateStr));
    const dayMeta = daysInMonth.find((day) => day.dateStr === selectedDateStr) ?? null;
    return { dayPunch, dayOt, dayMeta };
  }, [selectedDateStr, punches, otRecords, daysInMonth]);

  const totalWorkedSelectedDay = useMemo(() => {
    if (timelineSessions.length === 0) return 0;
    return timelineSessions.reduce((sum, s) => {
      if (s.durationHours) return sum + s.durationHours;
      if (s.out === null && selectedDateStr === todayStr) {
        const dur = (nowState.getTime() - new Date(s.in).getTime()) / 3600000;
        return sum + Math.max(0, dur);
      }
      return sum;
    }, 0);
  }, [timelineSessions, selectedDateStr, todayStr, nowState]);

  const formatDuration = (decimalHours: number | null) => {
    if (decimalHours === null || decimalHours <= 0) return "0:00";
    const totalMinutes = Math.round(decimalHours * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hrs}:${mins.toString().padStart(2, "0")} Hrs`;
  };

  return (
    <div className="grid gap-6 rounded-[28px] border border-outline-variant/45 bg-surface p-5 shadow-ambient lg:grid-cols-4 xl:p-6">
      {/* Left Column: Timeline Table (spans 3 columns) */}
      <div className="space-y-6 lg:col-span-3">
        
        {/* Header Block */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-b border-outline-variant/30 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            {canManage && employees.length > 0 && (
              <div className="w-64">
                <DropdownSelect
                  defaultValue={selectedEmployeeId}
                  onValueChange={(val: string) => handleFilterChange({ employeeId: val })}
                  options={employees.map((e) => ({
                    value: e.id,
                    label: `${e.name} ${e.employeeNumber ? `(${e.employeeNumber})` : ""}`,
                  }))}
                  triggerClassName="w-full border-outline-variant/60 bg-surface text-on-surface"
                />
              </div>
            )}

            <div className="flex items-center gap-1.5 rounded-full border border-[#00cec4]/20 bg-[#00cec4]/10 px-3 py-1.5 text-[10px] font-medium tracking-[0.08em] text-[#009d96] dark:text-[#00cec4]">
              <span className="size-1.5 rounded-full bg-[#00cec4] animate-pulse" />
              <span>{syncLabel}</span>
            </div>

            {/* Date Navigation Control */}
            <div className="flex items-center gap-1.5 rounded-2xl border border-outline-variant/50 bg-surface-container-low p-1 shadow-sm">
              <Button
                variant="outline"
                size="sm"
                className="size-8 rounded-xl p-0 text-on-surface-variant hover:bg-surface"
                disabled={isPending}
                onClick={handlePrevMonth}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="min-w-[110px] select-none px-2 text-center text-xs font-medium tracking-[0.04em] text-on-surface">
                {new Date(selectedYear, selectedMonth - 1).toLocaleString("en-IN", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="size-8 rounded-xl p-0 text-on-surface-variant hover:bg-surface"
                disabled={isPending}
                onClick={handleNextMonth}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Timeline Grid Table */}
        <div className="overflow-hidden rounded-[26px] border border-outline-variant/40 bg-surface shadow-sm">
          
          {/* Header row. Track sits inside a calc(100% - 65px) container.
              This leaves a 65px safety margin on the right of the column for float OT labels. */}
          <div className="grid grid-cols-[85px_1fr_65px_95px] items-center gap-4 border-b border-outline-variant/30 bg-surface-container-low px-6 py-4 text-[10px] font-medium tracking-[0.08em] text-on-surface-variant select-none">
            <div>Day</div>
            <div className="flex w-[calc(100%-65px)] justify-between px-2 text-[8px] tracking-[0.06em] text-on-surface-variant">
              <span>9:30 AM</span>
              <span>10:30 AM</span>
              <span>11:30 AM</span>
              <span>12:30 PM</span>
              <span>1:30 PM</span>
              <span>2:30 PM</span>
              <span>3:30 PM</span>
              <span>4:30 PM</span>
              <span>5:30 PM</span>
            </div>
            <div className="text-center">OT</div>
            <div className="text-right">Hours</div>
          </div>

          {/* Body Rows */}
          <div className="max-h-[62vh] divide-y divide-outline-variant/25 overflow-y-auto pr-1">
            {daysInMonth.map((day) => {
              const isSelected = selectedDateStr === day.dateStr;
              const isCurrentDay = day.dateStr === todayStr;
              
              const hoursWorked = day.punch?.inAt && day.punch?.outAt
                ? ((new Date(day.punch.outAt).getTime() - new Date(day.punch.inAt).getTime()) / 3600000)
                : (isCurrentDay && day.punch?.inAt
                    ? (nowState.getTime() - new Date(day.punch.inAt).getTime()) / 3600000
                    : 0);

              const inTime = day.punch?.inAt;
              const outTime = day.punch?.outAt;

              // Timeline Coordinates
              let visualBar = null;

              if (inTime) {
                const startPct = getPercent(inTime);
                const currentOutTime = outTime || (isCurrentDay ? nowState.toISOString() : null);
                const endPct = currentOutTime ? getPercent(currentOutTime) : 100;
                
                const standardEndPct = Math.min(100, endPct);
                const standardWidth = Math.max(1, standardEndPct - startPct);
                const hasOt = endPct > 100 || (day.ot && day.ot.otHours > 0);
                const otWidth = hasOt ? Math.max(2, endPct - 100) : 0;

                visualBar = (
                  <div className="relative w-[calc(100%-65px)] h-6 flex items-center overflow-visible">
                    {/* Background track line - Slimmed down to 1px */}
                    <div className="absolute h-px w-full bg-outline-variant/70" />
                    
                    {/* Standard worked segment - Slimmed down to h-1 */}
                    <div
                      className="absolute flex h-1 items-center rounded-full border-l border-r border-primary bg-primary/80 transition animate-fade-in"
                      style={{ left: `${startPct}%`, width: `${standardWidth}%` }}
                    >
                      <span className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary bg-surface shadow-sm" />
                      {!hasOt && (
                        outTime ? (
                          <span className="absolute right-0 top-1/2 h-1.5 w-1.5 translate-x-1/2 -translate-y-1/2 rounded-full border border-primary bg-surface shadow-sm" />
                        ) : isCurrentDay ? (
                          // Live pulsating orange indicator dot
                          <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-80"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 border border-white bg-orange-500 shadow"></span>
                          </span>
                        ) : null
                      )}
                    </div>

                    {/* OT worked segment - Slimmed down to h-1 */}
                    {hasOt && (
                      <div
                        className="absolute flex h-1 items-center rounded-r-full border-y border-r border-orange-500 bg-orange-500/80 transition animate-fade-in"
                        style={{ left: `100%`, width: `${otWidth}%` }}
                      >
                        {outTime ? (
                          <span className="absolute right-0 top-1/2 h-1.5 w-1.5 translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-500 bg-surface shadow-sm" />
                        ) : isCurrentDay ? (
                          // Live pulsating orange indicator dot at the end of active OT
                          <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-80"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 border border-white bg-orange-500 shadow"></span>
                          </span>
                        ) : null}
                        
                        {/* Floating OT label */}
                        <span className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 whitespace-nowrap text-[9px] font-medium text-orange-500">
                          {day.ot ? day.ot.otHours.toFixed(2) : "0.00"} Hrs OT
                        </span>
                      </div>
                    )}
                  </div>
                );
              } else if (day.isWeekend) {
                if (day.dayOfWeek === 6) {
                  // Saturday
                  visualBar = (
                    <div className="relative flex h-6 w-[calc(100%-65px)] items-center justify-center rounded-full border border-secondary/10 bg-secondary/5 select-none">
                      <span className="text-[9px] font-medium tracking-[0.08em] text-secondary/70">Saturday</span>
                    </div>
                  );
                } else {
                  // Sunday
                  visualBar = (
                    <div className="relative flex h-6 w-[calc(100%-65px)] items-center justify-center rounded-full border border-dashed border-outline-variant/80 bg-surface-container-low select-none">
                      <span className="text-[9px] font-medium tracking-[0.08em] text-on-surface-variant">Sunday</span>
                    </div>
                  );
                }
              } else {
                // Weekday absent: red dotted line
                visualBar = (
                  <div className="w-[calc(100%-65px)] flex items-center select-none">
                    <div className="my-3 h-0 w-full border-t border-dashed border-rose-500/30" />
                  </div>
                );
              }

              return (
                <div
                  key={day.dateStr}
                  onClick={() => setSelectedDateStr(day.dateStr)}
                  className={cn(
                    "grid cursor-pointer grid-cols-[85px_1fr_65px_95px] items-center gap-4 border-l-2 px-6 py-3 transition select-none",
                    isSelected
                      ? "border-l-primary bg-primary/8"
                      : "border-l-transparent hover:bg-surface-container-low/80"
                  )}
                >
                  {/* Day column */}
                  <div>
                    <p className={cn("text-xs font-medium", day.isWeekend ? "text-on-surface-variant" : "text-on-surface")}>
                      {day.dayNum} <span className="ml-0.5 text-[10px] font-medium text-on-surface-variant">{day.dayName}</span>
                    </p>
                    {inTime && (
                      <p className="mt-0.5 font-mono text-[9px] font-medium text-[#009d96] dark:text-[#00cec4]">
                        {fmt(inTime)}
                      </p>
                    )}
                  </div>

                  {/* Timeline track */}
                  <div className="px-2">{visualBar}</div>

                  {/* OT column */}
                  <div className="text-center text-xs font-medium">
                    {day.ot && day.ot.otHours > 0 ? (
                      <span className="text-orange-500">{day.ot.otHours.toFixed(2)}</span>
                    ) : (
                      <span className="text-on-surface-variant">—</span>
                    )}
                  </div>

                  {/* Hours column */}
                  <div className="text-right">
                    <p className="font-mono text-xs font-medium text-on-surface">
                      {hoursWorked > 0 ? `${hoursWorked.toFixed(2)} Hrs` : "00:00"}
                    </p>
                    {hoursWorked > 0 && (
                      <p className="mt-0.5 text-[8px] font-medium tracking-[0.08em] text-on-surface-variant">worked</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Right Column: Detailed Day Panel (spans 1 column) */}
      <div className="space-y-6">
        <div className="flex h-full flex-col rounded-[26px] border border-outline-variant/40 bg-surface shadow-sm">

          {/* Sidebar Header */}
          <div className="space-y-1 border-b border-outline-variant/30 p-5 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center rounded-xl bg-surface-container-low p-1.5 text-on-surface-variant">
                  <Calendar className="size-4" />
                </span>
                <h3 className="text-sm font-medium tracking-[0.04em] text-on-surface">
                  {selectedDateFormatted}
                </h3>
              </div>
            </div>
            <p className="mt-1 text-[10px] font-medium tracking-[0.06em] text-on-surface-variant">
              General [9:30 AM - 5:30 PM]
            </p>
          </div>

          {/* Sidebar Body */}
          <div className="flex-1 space-y-6 overflow-y-auto p-5">
            
            {/* Status Badge */}
            <div className="flex items-center justify-between rounded-2xl border border-outline-variant/35 bg-surface-container-low p-3">
              <span className="text-[10px] font-medium tracking-[0.08em] text-on-surface-variant">
                Attendance Status
              </span>
              {selectedDayMetrics.dayPunch?.inAt ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#00cec4]/20 bg-[#00cec4]/10 px-3 py-1 text-xs font-medium text-[#009d96] dark:text-[#00cec4]">
                  <CheckCircle className="size-3.5" /> Present
                </span>
              ) : selectedDayMetrics.dayMeta?.isWeekend ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant/50 bg-surface px-3 py-1 text-xs font-medium text-on-surface-variant">
                  Weekend
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                  Absent
                </span>
              )}
            </div>

            {/* Paired Sessions List */}
            <div className="space-y-4">
              <p className="text-[10px] font-medium tracking-[0.08em] text-on-surface-variant">
                Punch Sessions
              </p>
              {timelineError ? (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[10px] font-medium tracking-[0.04em] text-amber-700 dark:text-amber-300">
                  {timelineError}. Showing summary data where available.
                </div>
              ) : null}
              {timelineLoading ? (
                <div className="space-y-3">
                  <div className="h-24 animate-pulse rounded-2xl border border-outline-variant/30 bg-surface-container-low" />
                  <div className="h-24 animate-pulse rounded-2xl border border-outline-variant/30 bg-surface-container-low" />
                </div>
              ) : timelineSessions.length === 0 ? (
                <div className="select-none rounded-2xl border border-dashed border-outline-variant/50 py-6 text-center text-xs font-medium text-on-surface-variant">
                  No registered sessions
                </div>
              ) : (
                <div className="space-y-3.5">
                  {timelineSessions.map((session, idx) => {
                    const isLive = session.out === null && selectedDateStr === todayStr;
                    const durationText = formatDuration(
                      session.durationHours !== null
                        ? session.durationHours
                        : isLive
                          ? (nowState.getTime() - new Date(session.in).getTime()) / 3600000
                          : 0
                    );

                    return (
                      <div
                        key={idx}
                        className="space-y-3 rounded-2xl border border-outline-variant/30 bg-surface-container-low/70 p-4 transition hover:border-outline-variant/50"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          {/* Check In */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-[#009d96] dark:text-[#00cec4]">
                              <span className="inline-flex items-center justify-center rounded-lg bg-[#00cec4]/10 p-1">
                                <ArrowRight className="size-3.5 -rotate-45 shrink-0" />
                              </span>
                              <span className="text-[9px] font-medium tracking-[0.08em]">IN</span>
                            </div>
                            <div className="pl-6">
                              <p className="text-xs font-medium text-on-surface">
                                {fmt(session.in)}
                              </p>
                              <p className="mt-0.5 truncate text-[8px] font-medium text-on-surface-variant" title={session.inDevice || "Unknown Device"}>
                                {session.inDevice || "Unknown Device"}
                              </p>
                            </div>
                          </div>

                          {/* Check Out */}
                          <div className="space-y-1 border-l border-outline-variant/30 pl-4">
                            <div className="flex items-center gap-1.5 text-orange-500">
                              <span className="inline-flex items-center justify-center rounded-lg bg-orange-500/10 p-1">
                                <ArrowRight className="size-3.5 rotate-45 shrink-0" />
                              </span>
                              <span className="text-[9px] font-medium tracking-[0.08em]">OUT</span>
                            </div>
                            <div className="pl-6">
                              {session.out ? (
                                <p className="text-xs font-medium text-on-surface">
                                  {fmt(session.out)}
                                </p>
                              ) : isLive ? (
                                <span className="inline-flex select-none items-center gap-1 rounded border border-orange-500/20 bg-orange-500/10 px-1.5 py-0.5 text-[8px] font-medium tracking-[0.08em] text-orange-500 animate-pulse">
                                  STILL INSIDE
                                </span>
                              ) : (
                                <p className="text-xs font-medium text-on-surface-variant">—</p>
                              )}
                              <p className="mt-0.5 truncate text-[8px] font-medium text-on-surface-variant" title={session.outDevice || "—"}>
                                {session.outDevice || (isLive ? "Currently Checked In" : "—")}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Session Footer Details */}
                        <div className="flex items-center justify-between border-t border-outline-variant/25 pt-2.5 text-[9px] font-medium text-on-surface-variant">
                          <span>Session {idx + 1}</span>
                          <span className="inline-flex select-none items-center rounded-full border border-[#00cec4]/20 bg-[#00cec4]/10 px-2 py-0.5 font-mono text-[9px] font-medium text-[#009d96] dark:text-[#00cec4]">
                            {durationText}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Overtime Section Card */}
            {selectedDayMetrics.dayOt && selectedDayMetrics.dayOt.otHours > 0 && (
              <div className="space-y-3.5 rounded-2xl border border-orange-500/20 bg-orange-500/[0.04] p-4">
                <div className="flex items-center gap-2 text-xs font-medium tracking-[0.08em] text-orange-500">
                  <TrendingUp className="size-4 shrink-0 text-orange-500" />
                  <span>OVERTIME</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-medium tracking-[0.08em] text-on-surface-variant">OT Hours</p>
                    <p className="mt-1 font-mono text-sm font-medium text-orange-500">
                      {formatDuration(selectedDayMetrics.dayOt.otHours)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-medium tracking-[0.08em] text-on-surface-variant">OT Amount</p>
                    <p className="mt-1 font-mono text-sm font-medium text-orange-500">
                      ₹{selectedDayMetrics.dayOt.otAmount.toFixed(0)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Metrics at the bottom */}
            <div className="space-y-4 border-t border-outline-variant/30 pt-4">
              <div className="grid grid-cols-3 gap-2 text-center font-sans text-[9px] font-medium tracking-[0.08em] text-on-surface-variant">
                <div>First In</div>
                <div>Last Out</div>
                <div>Hours</div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs font-medium text-on-surface">
                <div>{timelineSessions.length > 0 ? fmt(timelineSessions[0]!.in) : "—"}</div>
                <div>
                  {timelineSessions.length > 0 && timelineSessions[timelineSessions.length - 1]!.out
                    ? fmt(timelineSessions[timelineSessions.length - 1]!.out)
                    : "—"}
                </div>
                <div>{totalWorkedSelectedDay > 0 ? `${totalWorkedSelectedDay.toFixed(2)} Hrs` : "—"}</div>
              </div>

              {selectedDayMetrics.dayPunch?.inAt && (
                <div className="flex select-none items-center justify-center gap-1.5 rounded-xl border border-[#00cec4]/15 bg-[#00cec4]/[0.06] py-2 text-[10px] font-medium tracking-[0.08em] text-[#009d96] dark:text-[#00cec4]">
                  <CheckCircle className="size-3.5" />
                  <span>Approved</span>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
