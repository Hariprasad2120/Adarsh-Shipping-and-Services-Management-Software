"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useTransition, useMemo } from "react";
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

  const syncLabel = "Synced live";

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

  const getPercentOfDay = (dateIso: string) => {
    const d = new Date(dateIso);
    const mins = d.getHours() * 60 + d.getMinutes();
    return Math.min(100, Math.max(0, (mins / 1440) * 100));
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
    return { dayPunch, dayOt };
  }, [selectedDateStr, punches, otRecords]);

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
    <div className="grid gap-6 lg:grid-cols-4 bg-[#0a0d14] p-6 rounded-3xl border border-slate-900 shadow-2xl">
      {/* Left Column: Timeline Table (spans 3 columns) */}
      <div className="lg:col-span-3 space-y-6">
        
        {/* Header Block */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
              <Calendar className="size-6" />
            </span>
            <div>
              <h1 className="text-xl font-black text-slate-100 uppercase tracking-widest">MY ATTENDANCE</h1>
              <p className="text-[10px] font-bold text-slate-500 mt-0.5 tracking-wider">General [ 9:30 AM – 5:30 PM ]</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {canManage && employees.length > 0 && (
              <div className="w-64">
                <DropdownSelect
                  defaultValue={selectedEmployeeId}
                  onValueChange={(val: string) => handleFilterChange({ employeeId: val })}
                  options={employees.map((e) => ({
                    value: e.id,
                    label: `${e.name} ${e.employeeNumber ? `(${e.employeeNumber})` : ""}`,
                  }))}
                  triggerClassName="w-full bg-slate-950/60 border-slate-800 text-slate-200"
                />
              </div>
            )}

            <div className="flex items-center gap-1 bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-1.5 rounded-xl text-[10px] font-black text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{syncLabel}</span>
            </div>

            {/* Date Navigation Control */}
            <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800/80 rounded-xl p-1">
              <Button
                variant="outline"
                size="sm"
                className="size-7 p-0 hover:bg-slate-900 text-slate-400"
                onClick={handlePrevMonth}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-xs font-black px-2 text-slate-200 min-w-[90px] text-center select-none">
                {new Date(selectedYear, selectedMonth - 1).toLocaleString("en-IN", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="size-7 p-0 hover:bg-slate-900 text-slate-400"
                onClick={handleNextMonth}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Timeline Grid Table */}
        <div className="bg-[#0e121b] border border-slate-900 rounded-3xl overflow-hidden shadow-inner">
          
          {/* Header row. Track sits inside a calc(100% - 65px) container.
              This leaves a 65px safety margin on the right of the column for float OT labels. */}
          <div className="grid grid-cols-[85px_1fr_65px_95px] gap-4 items-center px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-900 bg-slate-950/20 select-none">
            <div>Day</div>
            <div className="flex justify-between px-2 text-[8px] tracking-wider text-slate-600 w-[calc(100%-65px)]">
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
          <div className="divide-y divide-slate-900 max-h-[62vh] overflow-y-auto pr-1">
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
                    <div className="absolute w-full h-[1px] bg-slate-800" />
                    
                    {/* Standard worked segment - Slimmed down to h-1 */}
                    <div
                      className="absolute h-1 rounded-full bg-[#00cec4]/85 dark:bg-[#00cec4]/70 border-l border-r border-[#00cec4] flex items-center transition animate-fade-in"
                      style={{ left: `${startPct}%`, width: `${standardWidth}%` }}
                    >
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white border border-[#00cec4] shadow-md" />
                      {!hasOt && (
                        outTime ? (
                          <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white border border-[#00cec4] shadow-md" />
                        ) : isCurrentDay ? (
                          // Live pulsating green indicator dot
                          <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white shadow"></span>
                          </span>
                        ) : null
                      )}
                    </div>

                    {/* OT worked segment - Slimmed down to h-1 */}
                    {hasOt && (
                      <div
                        className="absolute h-1 bg-orange-500/80 border-t border-b border-r border-orange-500 rounded-r-full flex items-center transition animate-fade-in"
                        style={{ left: `100%`, width: `${otWidth}%` }}
                      >
                        {outTime ? (
                          <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white border border-orange-500 shadow-md" />
                        ) : isCurrentDay ? (
                          // Live pulsating green indicator dot at the end of active OT
                          <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white shadow"></span>
                          </span>
                        ) : null}
                        
                        {/* Floating OT label */}
                        <span className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 text-[9px] font-black text-orange-500 whitespace-nowrap">
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
                    <div className="relative w-[calc(100%-65px)] h-6 bg-indigo-500/[0.04] rounded-full border border-indigo-500/10 flex items-center justify-center select-none">
                      <span className="text-[9px] font-black tracking-[0.2em] text-indigo-500/70 uppercase">Saturday</span>
                    </div>
                  );
                } else {
                  // Sunday
                  visualBar = (
                    <div className="relative w-[calc(100%-65px)] h-6 bg-slate-900/10 rounded-full border border-dashed border-slate-800/80 flex items-center justify-center select-none">
                      <span className="text-[9px] font-black tracking-[0.2em] text-slate-600 uppercase">Sunday</span>
                    </div>
                  );
                }
              } else {
                // Weekday absent: red dotted line
                visualBar = (
                  <div className="w-[calc(100%-65px)] flex items-center select-none">
                    <div className="w-full border-t border-dashed border-rose-500/20 h-0 my-3" />
                  </div>
                );
              }

              return (
                <div
                  key={day.dateStr}
                  onClick={() => setSelectedDateStr(day.dateStr)}
                  className={`grid grid-cols-[85px_1fr_65px_95px] gap-4 items-center px-6 py-3 cursor-pointer transition select-none ${
                    isSelected
                      ? "bg-slate-900/40 border-l-2 border-l-cyan-500"
                      : "hover:bg-slate-900/10 border-l-2 border-l-transparent"
                  }`}
                >
                  {/* Day column */}
                  <div>
                    <p className={`text-xs font-black ${day.isWeekend ? "text-slate-500" : "text-slate-200"}`}>
                      {day.dayNum} <span className="text-[10px] font-bold text-slate-500 ml-0.5">{day.dayName}</span>
                    </p>
                    {inTime && (
                      <p className="text-[9px] font-bold text-emerald-500/80 mt-0.5 font-mono">
                        {fmt(inTime)}
                      </p>
                    )}
                  </div>

                  {/* Timeline track */}
                  <div className="px-2">{visualBar}</div>

                  {/* OT column */}
                  <div className="text-center font-bold text-xs">
                    {day.ot && day.ot.otHours > 0 ? (
                      <span className="text-orange-500">{day.ot.otHours.toFixed(2)}</span>
                    ) : (
                      <span className="text-slate-700">—</span>
                    )}
                  </div>

                  {/* Hours column */}
                  <div className="text-right">
                    <p className="text-xs font-extrabold text-slate-300 font-mono">
                      {hoursWorked > 0 ? `${hoursWorked.toFixed(2)} Hrs` : "00:00"}
                    </p>
                    {hoursWorked > 0 && (
                      <p className="text-[8px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">worked</p>
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
        <Card className="border-0 shadow-lg bg-[#0e121b] border-l border-slate-900 h-full flex flex-col rounded-3xl">
          
          {/* Sidebar Header */}
          <CardHeader className="pb-4 border-b border-slate-900/60 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center p-1.5 bg-slate-950 rounded-lg text-slate-400">
                  <Calendar className="size-4" />
                </span>
                <CardTitle className="text-sm font-black text-slate-200 tracking-wider">
                  {selectedDateFormatted}
                </CardTitle>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 mt-1 tracking-wider">
              General [9:30 AM – 5:30 PM]
            </p>
          </CardHeader>

          {/* Sidebar Body */}
          <CardContent className="p-5 space-y-6 flex-1 overflow-y-auto">
            
            {/* Status Badge */}
            <div className="flex justify-between items-center bg-slate-950/40 border border-slate-900 p-3 rounded-2xl">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Attendance Status</span>
              {selectedDayMetrics.dayPunch?.inAt ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-extrabold text-emerald-400">
                  <CheckCircle className="size-3.5" /> Present
                </span>
              ) : selectedDayMetrics.dayPunch ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 border border-rose-500/20 px-3 py-1 text-xs font-extrabold text-rose-400">
                  Absent
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/40 border border-slate-800/80 px-3 py-1 text-xs font-extrabold text-slate-500">
                  Weekend
                </span>
              )}
            </div>

            {/* Paired Sessions List */}
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Punch Sessions
              </p>
              {timelineLoading ? (
                <div className="space-y-3">
                  <div className="h-24 bg-slate-950/40 animate-pulse rounded-2xl border border-slate-900" />
                  <div className="h-24 bg-slate-950/40 animate-pulse rounded-2xl border border-slate-900" />
                </div>
              ) : timelineSessions.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-600 font-bold border border-dashed border-slate-900 rounded-2xl select-none">
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
                        className="rounded-2xl border border-slate-900 bg-slate-950/30 p-4 space-y-3 transition hover:border-slate-800"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          {/* Check In */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-emerald-400">
                              <span className="inline-flex items-center justify-center p-1 rounded-lg bg-emerald-500/10">
                                <ArrowRight className="size-3.5 -rotate-45 shrink-0" />
                              </span>
                              <span className="text-[9px] font-black uppercase tracking-wider">IN</span>
                            </div>
                            <div className="pl-6">
                              <p className="text-xs font-extrabold text-slate-200">
                                {fmt(session.in)}
                              </p>
                              <p className="text-[8px] font-bold text-slate-600 mt-0.5 truncate" title={session.inDevice || "Unknown Device"}>
                                {session.inDevice || "Unknown Device"}
                              </p>
                            </div>
                          </div>

                          {/* Check Out */}
                          <div className="space-y-1 border-l border-slate-900 pl-4">
                            <div className="flex items-center gap-1.5 text-orange-400">
                              <span className="inline-flex items-center justify-center p-1 rounded-lg bg-orange-500/10">
                                <ArrowRight className="size-3.5 rotate-45 shrink-0" />
                              </span>
                              <span className="text-[9px] font-black uppercase tracking-wider">OUT</span>
                            </div>
                            <div className="pl-6">
                              {session.out ? (
                                <p className="text-xs font-extrabold text-slate-200">
                                  {fmt(session.out)}
                                </p>
                              ) : isLive ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 select-none animate-pulse">
                                  STILL INSIDE
                                </span>
                              ) : (
                                <p className="text-xs font-extrabold text-slate-500">—</p>
                              )}
                              <p className="text-[8px] font-bold text-slate-600 mt-0.5 truncate" title={session.outDevice || "—"}>
                                {session.outDevice || (isLive ? "Currently Checked In" : "—")}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Session Footer Details */}
                        <div className="flex justify-between items-center pt-2.5 border-t border-slate-900 text-[9px] font-bold text-slate-500">
                          <span>Session {idx + 1}</span>
                          <span className="inline-flex items-center rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[9px] font-black text-cyan-400 select-none font-mono">
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
              <div className="rounded-2xl border border-orange-500/20 bg-orange-500/[0.02] p-4 space-y-3.5">
                <div className="flex items-center gap-2 text-orange-400 font-black text-xs tracking-wider">
                  <TrendingUp className="size-4 shrink-0 text-orange-500" />
                  <span>OVERTIME</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">OT Hours</p>
                    <p className="text-sm font-extrabold text-orange-400 mt-1 font-mono">
                      {formatDuration(selectedDayMetrics.dayOt.otHours)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">OT Amount</p>
                    <p className="text-sm font-extrabold text-orange-400 mt-1 font-mono">
                      ₹{selectedDayMetrics.dayOt.otAmount.toFixed(0)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Metrics at the bottom */}
            <div className="pt-4 border-t border-slate-900 space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center text-slate-400 text-[9px] font-black tracking-widest uppercase font-sans">
                <div>First In</div>
                <div>Last Out</div>
                <div>Hours</div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-slate-200 text-xs font-black font-mono">
                <div>{timelineSessions.length > 0 ? fmt(timelineSessions[0]!.in) : "—"}</div>
                <div>
                  {timelineSessions.length > 0 && timelineSessions[timelineSessions.length - 1]!.out
                    ? fmt(timelineSessions[timelineSessions.length - 1]!.out)
                    : "—"}
                </div>
                <div>{totalWorkedSelectedDay > 0 ? `${totalWorkedSelectedDay.toFixed(2)} Hrs` : "—"}</div>
              </div>

              {selectedDayMetrics.dayPunch?.inAt && (
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-black text-emerald-400 bg-emerald-500/[0.04] border border-emerald-500/10 py-2 rounded-xl select-none">
                  <CheckCircle className="size-3.5" />
                  <span>Approved</span>
                </div>
              )}
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
