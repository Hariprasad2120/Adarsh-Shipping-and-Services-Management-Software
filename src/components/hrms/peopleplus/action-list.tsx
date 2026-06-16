"use client";

import React from "react";
import { Sparkles, Calendar, Coffee, FileText, CheckCircle } from "lucide-react";

export function ActionList() {
  const schedule = [
    { day: "Sun", date: "14", type: "Weekend", isWeekend: true },
    { day: "Mon", date: "15", type: "General Shift (09:00 - 18:00)", isToday: true },
    { day: "Tue", date: "16", type: "General Shift (09:00 - 18:00)" },
    { day: "Wed", date: "17", type: "General Shift (09:00 - 18:00)" },
    { day: "Thu", date: "18", type: "General Shift (09:00 - 18:00)" },
    { day: "Fri", date: "19", type: "General Shift (09:00 - 18:00)" },
    { day: "Sat", date: "20", type: "Weekend", isWeekend: true },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 select-none animate-in fade-in duration-200">
      {/* Feed activities */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm lg:col-span-2 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Sparkles className="size-4 text-[#00c4b6]" />
          My Feed & Activities
        </h3>

        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/50 flex gap-3.5">
            <div className="size-8 rounded-xl bg-[#00c4b6]/10 text-[#00c4b6] flex items-center justify-center font-bold text-xs shrink-0">
              W
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Welcome to PeoplePlus Portal</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Enjoy your new full-fledged employee self-service hub! Check your attendance ledger, log timesheets, download payslips, or ask HR query tickets directly from the left module rail.
              </p>
              <span className="text-[10px] text-slate-400 mt-2 block">Today</span>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule calendar widget */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Calendar className="size-4 text-indigo-500" />
          Weekly Work Schedule
        </h3>

        <div className="space-y-2.5">
          {schedule.map((item) => (
            <div
              key={item.day}
              className={`p-2.5 border rounded-xl flex items-center justify-between text-xs transition-colors ${
                item.isToday
                  ? "bg-[#00c4b6]/5 border-[#00c4b6]"
                  : item.isWeekend
                  ? "bg-slate-50/50 border-slate-100 text-slate-400"
                  : "bg-white border-slate-200/60"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="font-bold w-8 text-center">{item.day}</span>
                <span className="text-slate-500">{item.type}</span>
              </div>
              {item.isToday && (
                <span className="text-[10px] font-bold text-[#00c4b6] bg-[#00c4b6]/10 px-2 py-0.5 rounded-full select-none">
                  Today
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
