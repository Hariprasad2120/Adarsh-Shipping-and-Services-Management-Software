"use client";

import React from "react";
import { Megaphone, Calendar, CheckSquare, Gift, Users, FileText } from "lucide-react";

interface DashboardWidgetsProps {
  widgetsConfig: Array<{ key: string; title: string; visible: boolean; order: number; width: "sm" | "md" | "lg" | "full" }>;
  data: {
    upcomingHolidays: any[];
    announcements: any[];
    recentTasks: any[];
  };
  onToggleWidget: (key: string) => void;
}

export function DashboardWidgets({
  widgetsConfig,
  data,
  onToggleWidget,
}: DashboardWidgetsProps) {
  // Sort widgets by order
  const sortedWidgets = [...widgetsConfig]
    .filter((w) => w.visible)
    .sort((a, b) => a.order - b.order);

  const renderWidgetContent = (key: string) => {
    switch (key) {
      case "ANNOUNCEMENTS":
        return (
          <div className="space-y-3">
            {data.announcements.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No announcements published yet.</p>
            ) : (
              data.announcements.map((item) => (
                <div key={item.id} className="border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <Megaphone className="size-3.5 text-[#00c4b6] shrink-0" />
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{item.body}</p>
                  <span className="text-[9px] text-slate-400 mt-1 block">
                    Posted on {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        );

      case "HOLIDAYLIST":
        return (
          <div className="space-y-3">
            {data.upcomingHolidays.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No upcoming holidays scheduled.</p>
            ) : (
              data.upcomingHolidays.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="size-3.5 text-indigo-500 shrink-0" />
                    <div>
                      <h4 className="text-xs font-semibold text-slate-700">{item.name}</h4>
                      <p className="text-[10px] text-slate-400">{item.holidayType}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    {new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))
            )}
          </div>
        );

      case "MYPENDINGTASKS":
        return (
          <div className="space-y-3">
            {data.recentTasks.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No pending tasks. You are all caught up!</p>
            ) : (
              data.recentTasks.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2.5">
                    <CheckSquare className="size-3.5 text-[#00c4b6] shrink-0" />
                    <div>
                      <h4 className="text-xs font-semibold text-slate-700 line-clamp-1">{item.title}</h4>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        item.priority === "HIGH" ? "bg-rose-50 text-rose-500 border border-rose-100" : "bg-slate-50 text-slate-500 border border-slate-200"
                      }`}>
                        {item.priority}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Due: {new Date(item.dueDate).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        );

      case "BIRTHDAY":
        return (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Gift className="size-8 text-pink-500 mb-2" />
            <p className="text-xs font-semibold text-slate-700">Birthdays Today</p>
            <p className="text-[11px] text-slate-400 mt-1">No colleague birthdays today.</p>
          </div>
        );

      case "QUICKLINKS":
        return (
          <div className="grid grid-cols-2 gap-2">
            <a href="/hrms/peopleplus?service=leavetracker" className="p-2.5 border border-slate-100 hover:border-[#00c4b6] rounded-xl text-center bg-slate-50/50 transition-all flex flex-col items-center">
              <Calendar className="size-4 text-[#00c4b6] mb-1" />
              <span className="text-[10.5px] font-semibold text-slate-700">Apply Leave</span>
            </a>
            <a href="/hrms/peopleplus?service=hrcase" className="p-2.5 border border-slate-100 hover:border-[#00c4b6] rounded-xl text-center bg-slate-50/50 transition-all flex flex-col items-center">
              <Megaphone className="size-4 text-indigo-500 mb-1" />
              <span className="text-[10.5px] font-semibold text-slate-700">Ask HR</span>
            </a>
            <a href="/hrms/peopleplus?service=timetracker" className="p-2.5 border border-slate-100 hover:border-[#00c4b6] rounded-xl text-center bg-slate-50/50 transition-all flex flex-col items-center">
              <CheckSquare className="size-4 text-emerald-500 mb-1" />
              <span className="text-[10.5px] font-semibold text-slate-700">Log Timesheet</span>
            </a>
            <a href="/hrms/peopleplus?service=files" className="p-2.5 border border-slate-100 hover:border-[#00c4b6] rounded-xl text-center bg-slate-50/50 transition-all flex flex-col items-center">
              <FileText className="size-4 text-amber-500 mb-1" />
              <span className="text-[10.5px] font-semibold text-slate-700">My Files</span>
            </a>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Users className="size-8 text-indigo-500 mb-2" />
            <p className="text-xs font-semibold text-slate-700">{key}</p>
            <p className="text-[11px] text-slate-400 mt-1">Ready for custom workflows.</p>
          </div>
        );
    }
  };

  const getWidthClass = (width: string) => {
    switch (width) {
      case "sm": return "col-span-1";
      case "md": return "col-span-1 md:col-span-2";
      case "lg": return "col-span-1 md:col-span-3";
      case "full": return "col-span-1 md:col-span-4";
      default: return "col-span-1";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 select-none">
      {sortedWidgets.map((widget) => (
        <div
          key={widget.key}
          className={`${getWidthClass(widget.width)} bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {widget.title}
            </h3>
            <button
              type="button"
              onClick={() => onToggleWidget(widget.key)}
              className="text-[10.5px] font-semibold text-[#00c4b6] hover:text-[#00b0a3] bg-slate-50 hover:bg-slate-100 px-2 py-0.5 rounded border border-slate-200 cursor-pointer"
            >
              Hide
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {renderWidgetContent(widget.key)}
          </div>
        </div>
      ))}
    </div>
  );
}
