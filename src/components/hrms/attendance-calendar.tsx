"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Fingerprint } from "lucide-react";
import { toast } from "sonner";

interface AttendanceCalendarProps {
  onFetchCalendar: (year: number, month: number) => Promise<any[]>;
}

export function AttendanceCalendar({ onFetchCalendar }: AttendanceCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 15)); // Jun 15, 2026 from prompt details
  const [days, setDays] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const fetched = await onFetchCalendar(year, month + 1);
        
        // Build 30 days grid for June 2026 or appropriate month
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const list = Array.from({ length: daysInMonth }, (_, index) => {
          const dayNum = index + 1;
          const dayDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
          const punchMatch = fetched.find((p: any) => p.date === dayDateStr);

          const weekdayIndex = new Date(year, month, dayNum).getDay();
          const isWeekend = weekdayIndex === 0 || weekdayIndex === 6;

          return {
            dateStr: dayDateStr,
            day: dayNum,
            isWeekend,
            isToday: dayNum === 15 && month === 5 && year === 2026,
            inAt: punchMatch?.inAt ? new Date(punchMatch.inAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
            outAt: punchMatch?.outAt ? new Date(punchMatch.outAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
            status: punchMatch ? punchMatch.status : (dayNum < 15 && !isWeekend ? "Absent" : isWeekend ? "Weekend" : "Yet to log"),
            totalBreak: punchMatch?.totalBreakMins || 0,
          };
        });
        setDays(list);
      } catch (err: any) {
        toast.error("Failed to load attendance calendar data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentDate, onFetchCalendar]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 15));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 15));
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm select-none">
      {/* Calendar Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Fingerprint className="size-5 text-[#00c4b6]" />
          Attendance Ledger
        </h3>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-xs font-bold text-slate-700 min-w-28 text-center">
            {monthNames[month]} {year}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-xs text-slate-400">
          Syncing calendar data...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {days.map((day) => (
            <div
              key={day.day}
              className={`p-4 border rounded-xl flex flex-col justify-between transition-all ${
                day.isToday
                  ? "bg-[#00c4b6]/5 border-[#00c4b6] shadow-sm"
                  : day.isWeekend
                  ? "bg-slate-50 border-slate-100 text-slate-400"
                  : "bg-white border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${day.isToday ? "text-[#00c4b6]" : "text-slate-700"}`}>
                  {day.day}
                </span>
                <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full ${
                  day.status === "PRESENT" || day.inAt
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                    : day.status === "Absent"
                    ? "bg-rose-50 text-rose-500 border border-rose-100 animate-pulse"
                    : "bg-slate-50 text-slate-400 border border-slate-100"
                }`}>
                  {day.inAt ? "Logged" : day.status}
                </span>
              </div>

              <div className="mt-4 space-y-1 text-[10.5px]">
                {day.inAt ? (
                  <>
                    <p className="text-slate-600 font-medium">In: <span className="font-bold text-slate-800">{day.inAt}</span></p>
                    <p className="text-slate-600 font-medium">Out: <span className="font-bold text-slate-800">{day.outAt || "--:--"}</span></p>
                  </>
                ) : (
                  <p className="text-slate-400 italic font-medium py-1.5">No punches logged</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
