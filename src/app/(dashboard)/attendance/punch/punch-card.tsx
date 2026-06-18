"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useRouter } from "next/navigation";
import { useState, useEffect, useTransition, useMemo, useRef } from "react";
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
  monthSessions?: Record<string, TimelineSession[]>;
};

type TimelineSession = {
  in: string;
  out: string | null;
  durationHours: number | null;
  inDevice?: string | null;
  outDevice?: string | null;
};

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "-";

const formatHoursAndMins = (decimalHours: number | null) => {
  if (decimalHours === null || decimalHours <= 0) return "0 Mins";
  const totalMinutes = Math.round(decimalHours * 60);
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hrs > 0) {
    return `${hrs} Hrs ${mins} Mins`;
  }
  return `${mins} Mins`;
};

const getDurationHoursNoSeconds = (startIso: string, endIso: string) => {
  const s = new Date(startIso);
  const e = new Date(endIso);
  s.setSeconds(0, 0);
  e.setSeconds(0, 0);
  return Math.max(0, (e.getTime() - s.getTime()) / 3600000);
};

// Maps time to coordinates on the standard timeline grid.
// Keep the raw percentage separate so OT and before/after-hours logic still work.
const WORK_START_MINUTES = 9 * 60 + 30; // 9:30 AM
const WORK_END_MINUTES = 17 * 60 + 30; // 5:30 PM
const WORK_TOTAL_MINUTES = WORK_END_MINUTES - WORK_START_MINUTES;

const clampPercent = (pct: number) => Math.min(100, Math.max(0, pct));

const getPercentRaw = (timeIso: string | null) => {
  if (!timeIso) return 0;
  const t = new Date(timeIso);
  if (Number.isNaN(t.getTime())) return 0;

  const mins = t.getHours() * 60 + t.getMinutes() + t.getSeconds() / 60;
  return ((mins - WORK_START_MINUTES) / WORK_TOTAL_MINUTES) * 100;
};

const getPercent = (timeIso: string | null) => clampPercent(getPercentRaw(timeIso));

export function PunchCard({
  punches,
  otRecords,
  today: _todayIso,
  canManage,
  employees,
  selectedEmployeeId,
  selectedYear,
  selectedMonth,
  monthSessions = {},
}: PunchCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Real-time client clock.
  // IMPORTANT: do not drive this from `todayIso` because in many pages that prop is only
  // a date string, which starts the clock at 00:00 and makes the live line appear wrong.
  const [nowState, setNowState] = useState<Date>(() => new Date());

  useEffect(() => {
    const tick = () => setNowState(new Date());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  // Today's local date string representation (live roll-over at midnight)
  const todayStr = useMemo(() => {
    return `${nowState.getFullYear()}-${String(nowState.getMonth() + 1).padStart(2, "0")}-${String(nowState.getDate()).padStart(2, "0")}`;
  }, [nowState]);

  // Active date selection. Use the actual client date so the current row matches the
  // live clock even when the server prop was serialized as a date-only value.
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const d = new Date();
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

  // Ref for today's row — scroll into view on mount and on employee switch
  const todayRowRef = useRef<HTMLDivElement>(null);

  // One single live time overlay. This prevents the header line and row lines
  // from rendering at slightly different X positions.
  const tableRef = useRef<HTMLDivElement>(null);
  const currentDayTrackRef = useRef<HTMLDivElement>(null);
  const [liveLineLeft, setLiveLineLeft] = useState<number | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      todayRowRef.current?.scrollIntoView({ behavior: "instant", block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedEmployeeId]);

  // Compare ISO date string to local YYYY-MM-DD string (handles IST midnight stored as UTC)
  const isSameLocalDate = (isoDate: string, localDateStr: string): boolean => {
    const d = new Date(isoDate);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}` === localDateStr;
  };

  // Generate all days of the selected month
  const daysInMonth = useMemo(() => {
    const totalDays = new Date(selectedYear, selectedMonth, 0).getDate();
    const list = [];
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(selectedYear, selectedMonth - 1, d);
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      const punch = punches.find((p) => isSameLocalDate(p.date, dateStr));
      const ot = otRecords.find((o) => isSameLocalDate(o.date, dateStr));
      
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
    setTimelineSessions([]); // Clear previous sessions to prevent glitch/crossover rendering of old bars

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
      } catch (err: unknown) {
        if (!active) return;
        const errMsg = err instanceof Error ? err.message : "Offline";
        setTimelineError(errMsg);
        const matchPunch = punches.find((p) => isSameLocalDate(p.date, selectedDateStr));
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
    const dayPunch = punches.find((p) => isSameLocalDate(p.date, selectedDateStr));
    const dayOt = otRecords.find((o) => isSameLocalDate(o.date, selectedDateStr));
    const dayMeta = daysInMonth.find((day) => day.dateStr === selectedDateStr) ?? null;
    return { dayPunch, dayOt, dayMeta };
  }, [selectedDateStr, punches, otRecords, daysInMonth]);

  const lastProperOutTime = useMemo(() => {
    if (timelineSessions.length > 0) {
      for (let i = timelineSessions.length - 1; i >= 0; i--) {
        if (timelineSessions[i]!.out) {
          return timelineSessions[i]!.out;
        }
      }
    }
    return selectedDayMetrics.dayPunch?.outAt || null;
  }, [timelineSessions, selectedDayMetrics.dayPunch]);

  const totalWorkedSelectedDay = useMemo(() => {
    const inAt = timelineSessions.length > 0 ? timelineSessions[0]!.in : selectedDayMetrics.dayPunch?.inAt;
    if (!inAt) return 0;

    const isToday = selectedDateStr === todayStr;
    const lastSession = timelineSessions[timelineSessions.length - 1];
    const isLive = lastSession && !lastSession.out && isToday;

    const outAt = isLive
      ? nowState.toISOString()
      : lastProperOutTime;

    if (!outAt) return 0;

    return getDurationHoursNoSeconds(inAt, outAt);
  }, [selectedDayMetrics.dayPunch, timelineSessions, lastProperOutTime, selectedDateStr, todayStr, nowState]);

  const formatDuration = (decimalHours: number | null) => {
    if (decimalHours === null || decimalHours <= 0) return "0:00 Hrs";
    const totalMinutes = Math.round(decimalHours * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hrs}:${mins.toString().padStart(2, "0")} Hrs`;
  };

  const nowPercentRaw = useMemo(() => getPercentRaw(nowState.toISOString()), [nowState]);
  const nowPercent = useMemo(() => clampPercent(nowPercentRaw), [nowPercentRaw]);

  // Show the current-time line for the current month even before 9:30 or after 5:30.
  // It clamps to the left/right edge instead of disappearing.
  const showLiveTimeLine =
    selectedYear === nowState.getFullYear() &&
    selectedMonth === nowState.getMonth() + 1;

  // Measure the real timeline track used by today's row and position ONE overlay line
  // over the whole table. The old implementation rendered one line in the header
  // and another inside every row, which caused two different live-time positions.
  useEffect(() => {
    if (!showLiveTimeLine) {
      setLiveLineLeft(null);
      return;
    }

    const updateLiveLine = () => {
      const table = tableRef.current;
      const track = currentDayTrackRef.current;

      if (!table || !track) {
        setLiveLineLeft(null);
        return;
      }

      const tableRect = table.getBoundingClientRect();
      const trackRect = track.getBoundingClientRect();
      const x = trackRect.left - tableRect.left + (trackRect.width * nowPercent) / 100;
      setLiveLineLeft(x);
    };

    const frame = requestAnimationFrame(updateLiveLine);
    window.addEventListener("resize", updateLiveLine);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateLiveLine);
      if (tableRef.current) resizeObserver.observe(tableRef.current);
      if (currentDayTrackRef.current) resizeObserver.observe(currentDayTrackRef.current);
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateLiveLine);
      resizeObserver?.disconnect();
    };
  }, [showLiveTimeLine, nowPercent, selectedEmployeeId, selectedYear, selectedMonth, todayStr]);

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      {/* Left Column: Timeline Table (spans 3 columns) */}
      <div className="flex flex-col gap-6 lg:col-span-3 lg:max-h-[calc(100vh-180px)]">

        {/* Header Block */}
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-b border-outline-variant/30 pb-4">
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
        <div
          ref={tableRef}
          className="relative flex flex-1 flex-col min-h-0 overflow-hidden rounded-[26px] border border-outline-variant/40 bg-surface shadow-sm"
        >

          {showLiveTimeLine && liveLineLeft !== null && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-[90] -translate-x-1/2 border-l border-dashed border-[#4f8cff]/80"
              style={{ left: `${liveLineLeft}px` }}
              aria-hidden="true"
            >
              <span className="absolute top-2 left-1/2 -translate-x-1/2 rounded-full border border-[#4f8cff]/25 bg-surface px-1.5 py-0.5 text-[7px] font-semibold tracking-[0.08em] text-[#4f8cff] shadow-sm">
                NOW
              </span>
              <span className="absolute top-[54px] left-1/2 flex size-2.5 -translate-x-1/2 items-center justify-center rounded-full bg-[#4f8cff] shadow-[0_0_0_4px_rgba(79,140,255,0.15)]" />
            </div>
          )}

          {/* Header row. Track sits inside a calc(100% - 65px) container.
              This leaves a 65px safety margin on the right of the column for float OT labels. */}
          <div className="shrink-0 grid grid-cols-[85px_1fr_65px_95px] items-center gap-4 border-b border-outline-variant/30 bg-surface-container-low px-6 py-4 text-[10px] font-medium tracking-[0.08em] text-on-surface-variant select-none">
            <div>Day</div>
            <div className="relative flex w-[calc(100%-65px)] justify-between px-2 text-[8px] tracking-[0.06em] text-on-surface-variant overflow-visible">
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
          <div className="flex-1 min-h-0 divide-y divide-outline-variant/25 overflow-y-auto pr-1">
            {daysInMonth.map((day) => {
              const isSelected = selectedDateStr === day.dateStr;
              const isCurrentDay = day.dateStr === todayStr;

              // Prefer freshly fetched selected-day sessions, then fallback to monthSessions.
              // This makes the open/still-inside state appear without needing a page reload.
              const fetchedSelectedSessions = selectedDateStr === day.dateStr ? timelineSessions : [];
              const daySessions =
                fetchedSelectedSessions.length > 0
                  ? fetchedSelectedSessions
                  : monthSessions[day.dateStr] ?? [];
              const hasSessionData = daySessions.length > 0;

              const inTime = day.punch?.inAt;
              const outTime = day.punch?.outAt;

              const firstIn = hasSessionData ? daySessions[0]!.in : inTime;

              let lastProperOutForDay = outTime || null;
              if (daySessions.length > 0) {
                for (let i = daySessions.length - 1; i >= 0; i--) {
                  if (daySessions[i]!.out) {
                    lastProperOutForDay = daySessions[i]!.out;
                    break;
                  }
                }
              }

              const lastSession = hasSessionData ? daySessions[daySessions.length - 1]! : null;
              const lastSessionOpen =
                isCurrentDay &&
                ((hasSessionData && !lastSession!.out) || (!!inTime && !outTime));

              const effectiveOutForDay = lastSessionOpen
                ? nowState.toISOString()
                : lastProperOutForDay;

              const hoursWorked = firstIn && effectiveOutForDay
                ? getDurationHoursNoSeconds(firstIn, effectiveOutForDay)
                : 0;

              // The live-time line is rendered once as an overlay on the full table.
              // Do not render another per-row line here, otherwise the UI shows two lines.
              const nowLine = null;

              // Timeline Coordinates
              let visualBar = null;

              if (firstIn) {
                const lastOut = hasSessionData ? (lastSession!.out || null) : outTime;
                const effectiveLastOut = lastOut || (lastSessionOpen ? nowState.toISOString() : firstIn);
                const lastEndRawPct = getPercentRaw(effectiveLastOut);
                const hasOt = !!(day.ot && day.ot.otHours > 0);
                const otWidth = hasOt ? Math.min(28, Math.max(2, lastEndRawPct - 100)) : 0;
                const liveIndicatorPct = clampPercent(lastEndRawPct);

                visualBar = (
                  <div
                    ref={isCurrentDay ? currentDayTrackRef : undefined}
                    className="relative w-[calc(100%-65px)] h-6 flex items-center overflow-visible"
                  >
                    {/* Center axis line */}
                    <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-outline-variant/30" />
                    {nowLine}

                    {hasSessionData ? (
                      // Per-session segments — gaps where employee was outside
                      daySessions.map((session, idx) => {
                        const sessionOut = session.out || null;
                        const isOpenLiveSession = isCurrentDay && idx === daySessions.length - 1 && !sessionOut;
                        const segStart = getPercent(session.in);
                        const segOutIso = sessionOut ?? (isOpenLiveSession ? nowState.toISOString() : null);
                        const segEnd = segOutIso ? Math.min(100, getPercent(segOutIso)) : segStart + 0.5;
                        const segWidth = Math.max(0.5, segEnd - segStart);
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "absolute flex h-1 items-center rounded-full border-l border-r border-[#00cec4] bg-[#00cec4]/80 animate-fade-in",
                              isOpenLiveSession && "shadow-[0_0_10px_rgba(0,206,196,0.45)]"
                            )}
                            style={{ left: `${segStart}%`, width: `${segWidth}%` }}
                          >
                            <span className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-green-500 bg-green-500 shadow-sm" />
                            {sessionOut && (
                              <span className="absolute right-0 top-1/2 h-1.5 w-1.5 translate-x-1/2 -translate-y-1/2 rounded-full border border-red-500 bg-red-500 shadow-sm" />
                            )}
                          </div>
                        );
                      })
                    ) : (
                      // Fallback: single summary bar (first-in → last-out)
                      (() => {
                        const startPct = getPercent(firstIn);
                        const endPct = effectiveLastOut ? Math.min(100, getPercent(effectiveLastOut)) : 100;
                        const width = Math.max(1, endPct - startPct);
                        return (
                          <div
                            className="absolute flex h-1 items-center rounded-full border-l border-r border-[#00cec4] bg-[#00cec4]/80 animate-fade-in"
                            style={{ left: `${startPct}%`, width: `${width}%` }}
                          >
                            <span className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-green-500 bg-green-500 shadow-sm" />
                            {outTime && (
                              <span className="absolute right-0 top-1/2 h-1.5 w-1.5 translate-x-1/2 -translate-y-1/2 rounded-full border border-red-500 bg-red-500 shadow-sm" />
                            )}
                          </div>
                        );
                      })()
                    )}

                    {/* OT segment */}
                    {hasOt && (
                      <div
                        className="absolute flex h-1 items-center rounded-r-full border-y border-r border-orange-500 bg-orange-500/80 animate-fade-in"
                        style={{ left: "100%", width: `${otWidth}%` }}
                      >
                        {lastOut && (
                          <span className="absolute right-0 top-1/2 h-1.5 w-1.5 translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-500 bg-surface shadow-sm" />
                        )}
                        <span className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 whitespace-nowrap text-[9px] font-medium text-orange-500">
                          {day.ot ? `${Math.round(day.ot.otHours * 60)} Mins` : "0 Mins"} OT
                        </span>
                      </div>
                    )}

                    {/* Still-inside live pulse */}
                    {lastSessionOpen && (
                      <span
                        className="absolute top-1/2 z-[60] flex h-3 w-3 -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${liveIndicatorPct}%` }}
                        title="Still inside"
                      >
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00cec4] opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-[#00cec4] shadow-[0_0_12px_rgba(0,206,196,0.75)]" />
                        <span className="absolute left-[calc(100%+6px)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-[#00cec4]/20 bg-[#00cec4]/10 px-2 py-0.5 text-[8px] font-semibold tracking-[0.08em] text-[#009d96] dark:text-[#00cec4]">
                          INSIDE
                        </span>
                      </span>
                    )}
                  </div>
                );
              } else if (day.isWeekend) {
                if (day.dayOfWeek === 6) {
                  visualBar = (
                    <div
                      ref={isCurrentDay ? currentDayTrackRef : undefined}
                      className="relative flex h-6 w-[calc(100%-65px)] items-center justify-center rounded-full border border-secondary/10 bg-secondary/5 select-none overflow-visible"
                    >
                      <span className="text-[9px] font-medium tracking-[0.08em] text-secondary/70">Saturday</span>
                      {nowLine}
                    </div>
                  );
                } else {
                  visualBar = (
                    <div
                      ref={isCurrentDay ? currentDayTrackRef : undefined}
                      className="relative flex h-6 w-[calc(100%-65px)] items-center justify-center rounded-full border border-dashed border-outline-variant/80 bg-surface-container-low select-none overflow-visible"
                    >
                      <span className="text-[9px] font-medium tracking-[0.08em] text-on-surface-variant">Sunday</span>
                      {nowLine}
                    </div>
                  );
                }
              } else {
                // Weekday absent
                visualBar = (
                  <div
                    ref={isCurrentDay ? currentDayTrackRef : undefined}
                    className="relative w-[calc(100%-65px)] h-6 flex items-center select-none overflow-visible"
                  >
                    <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-rose-500/20" />
                    {nowLine}
                  </div>
                );
              }

              return (
                <div
                  key={day.dateStr}
                  ref={isCurrentDay ? todayRowRef : undefined}
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
                      <span className="text-orange-500">{Math.round(day.ot.otHours * 60)} Mins</span>
                    ) : (
                      <span className="text-on-surface-variant">0 Mins</span>
                    )}
                  </div>

                  {/* Hours column */}
                  <div className="text-right">
                    <p className="font-mono text-xs font-medium text-on-surface">
                      {hoursWorked > 0 ? formatHoursAndMins(hoursWorked) : "0 Mins"}
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
      <div className="space-y-6 lg:sticky lg:top-4 lg:self-start lg:h-[calc(100vh-180px)] lg:overflow-hidden">
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
                <span className={`inline-flex items-center gap-1.5 rounded-full border border-[#00cec4]/20 bg-[#00cec4]/10 px-3 py-1 text-xs font-medium text-[#009d96] dark:text-[#00cec4] ${!selectedDayMetrics.dayPunch?.outAt && selectedDateStr === todayStr ? "animate-pulse" : ""}`}>
                  {!selectedDayMetrics.dayPunch?.outAt && selectedDateStr === todayStr ? (
                    <span className="relative flex size-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00cec4] opacity-75" />
                      <span className="relative inline-flex rounded-full size-2 bg-[#00cec4]" />
                    </span>
                  ) : (
                    <CheckCircle className="size-3.5" />
                  )}
                  Present
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
            <div className="space-y-3.5 rounded-2xl border border-orange-500/20 bg-orange-500/4 p-4 select-none">
              <div className="flex items-center gap-2 text-xs font-medium tracking-[0.08em] text-orange-500">
                <TrendingUp className="size-4 shrink-0 text-orange-500" />
                <span>OVERTIME</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-medium tracking-[0.08em] text-on-surface-variant">OT Hours</p>
                  <p className="mt-1 font-mono text-sm font-medium text-orange-500">
                    {selectedDayMetrics.dayOt && selectedDayMetrics.dayOt.otHours > 0
                      ? `${Math.round(selectedDayMetrics.dayOt.otHours * 60)} Mins`
                      : "0 Mins"}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-medium tracking-[0.08em] text-on-surface-variant">OT Amount</p>
                  <p className="mt-1 font-mono text-sm font-medium text-orange-500">
                    ₹{selectedDayMetrics.dayOt && selectedDayMetrics.dayOt.otHours > 0
                      ? selectedDayMetrics.dayOt.otAmount.toFixed(0)
                      : "0"}
                  </p>
                </div>
              </div>
            </div>

            {/* Summary Metrics at the bottom */}
            <div className="space-y-4 border-t border-outline-variant/30 pt-4 select-none">
              <div className="grid grid-cols-3 gap-2 text-center font-sans text-[9px] font-medium tracking-[0.08em] text-on-surface-variant">
                <div>First In</div>
                <div>Last Out</div>
                <div>Hours</div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs font-medium text-on-surface">
                <div>{timelineSessions.length > 0 ? fmt(timelineSessions[0]!.in) : "—"}</div>
                <div>
                  {lastProperOutTime
                    ? fmt(lastProperOutTime)
                    : "—"}
                </div>
                <div>{totalWorkedSelectedDay > 0 ? formatHoursAndMins(totalWorkedSelectedDay) : "—"}</div>
              </div>

              {selectedDayMetrics.dayPunch?.inAt && (
                <div className="flex select-none items-center justify-center gap-1.5 rounded-xl border border-[#00cec4]/15 bg-[#00cec4]/6 py-2 text-[10px] font-medium tracking-[0.08em] text-[#009d96] dark:text-[#00cec4]">
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
