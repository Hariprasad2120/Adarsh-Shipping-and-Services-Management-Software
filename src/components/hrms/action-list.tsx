"use client";

import React from "react";
import {
  ArrowUpRight,
  BellRing,
  Calendar,
  CheckSquare,
  FileClock,
  Landmark,
  Megaphone,
  Sparkles,
} from "lucide-react";
import { DashboardWidgetsData, UserProfile } from "@/modules/hrms/types";

interface ActionListProps {
  profile: UserProfile | null;
  sessionUser: { id: string; name: string; email: string };
  data: DashboardWidgetsData;
}

function buildWeeklySchedule() {
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + index);
    const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
    const isWeekend = weekday === "Sun" || weekday === "Sat";

    return {
      key: `${weekday}-${date.toISOString()}`,
      day: weekday,
      dateLabel: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      type: isWeekend ? "Weekend" : "General Shift",
      hours: isWeekend ? "Recharge day" : "09:00 - 18:00",
      isToday: date.toDateString() === today.toDateString(),
      isWeekend,
    };
  });
}

export function ActionList({ profile, sessionUser, data }: ActionListProps) {
  const schedule = buildWeeklySchedule();
  const featuredAnnouncement = data.announcements[0] ?? null;
  const nextHoliday = data.upcomingHolidays[0] ?? null;
  const nextTask = data.recentTasks[0] ?? null;

  const insightCards = [
    {
      label: "Announcements",
      value: String(data.announcements.length).padStart(2, "0"),
      note: featuredAnnouncement ? featuredAnnouncement.title : "No new broadcast",
      icon: Megaphone,
      accent: "from-[#f0f9f6] to-[#ffffff]",
      iconColor: "text-[#0f8f85]",
    },
    {
      label: "Pending Tasks",
      value: String(data.recentTasks.length).padStart(2, "0"),
      note: nextTask ? nextTask.title : "Inbox is clear",
      icon: CheckSquare,
      accent: "from-[#fff7ec] to-[#ffffff]",
      iconColor: "text-[#d97706]",
    },
    {
      label: "Upcoming Holidays",
      value: String(data.upcomingHolidays.length).padStart(2, "0"),
      note: nextHoliday ? nextHoliday.name : "Nothing scheduled",
      icon: Landmark,
      accent: "from-[#eef4ff] to-[#ffffff]",
      iconColor: "text-[#4966d5]",
    },
  ];

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      <div className="grid gap-4 lg:grid-cols-3">
        {insightCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className={`rounded-[1.75rem] border border-[#d7e1de] bg-gradient-to-br ${card.accent} p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{card.label}</p>
                  <p className="mt-4 font-display text-5xl leading-none tracking-[-0.05em] text-slate-900">{card.value}</p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{card.note}</p>
                </div>
                <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white ${card.iconColor}`}>
                  <Icon className="size-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-[2rem] border border-[#d8e0dd] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="border-b border-[#e6ecea] bg-[linear-gradient(135deg,#f5efe2_0%,#f7fbf8_100%)] px-6 py-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#0f8f85]">
                    <Sparkles className="size-4" />
                    My feed
                  </div>
                  <h3 className="mt-3 font-display text-3xl tracking-[-0.04em] text-slate-900">A sharper start to the day</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                    Welcome back, {profile?.name || sessionUser.name}. Your dashboard now surfaces the three things that matter first:
                    current attendance context, the next task in motion, and the latest company signal.
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Signed in as</p>
                  <p className="mt-2 font-semibold text-slate-900">{sessionUser.email}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <article className="rounded-[1.6rem] border border-[#dce4e1] bg-[#fcfffe] p-5">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#0f8f85]">
                  <BellRing className="size-4" />
                  Latest announcement
                </div>
                {featuredAnnouncement ? (
                  <>
                    <h4 className="mt-4 text-lg font-semibold text-slate-900">{featuredAnnouncement.title}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{featuredAnnouncement.body}</p>
                    <p className="mt-4 text-xs text-slate-400">
                      Posted {new Date(featuredAnnouncement.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </>
                ) : (
                  <p className="mt-4 text-sm leading-relaxed text-slate-500">
                    No new company announcements are waiting for you right now.
                  </p>
                )}
              </article>

              <article className="rounded-[1.6rem] border border-[#dce4e1] bg-[#fffdf8] p-5">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#d97706]">
                  <FileClock className="size-4" />
                  Priority focus
                </div>
                {nextTask ? (
                  <>
                    <h4 className="mt-4 text-lg font-semibold text-slate-900">{nextTask.title}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      Due {new Date(nextTask.dueDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <div className="mt-4 inline-flex rounded-full border border-[#f3d6b3] bg-[#fff3df] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#c56a09]">
                      {nextTask.priority} priority
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-sm leading-relaxed text-slate-500">
                    You are fully caught up. This is a good moment to clear approvals or plan ahead.
                  </p>
                )}
              </article>
            </div>
          </section>

          <section className="rounded-[2rem] border border-[#d8e0dd] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3 border-b border-[#e7ece9] pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Open work</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">Task pipeline</h3>
              </div>
              <div className="rounded-full border border-[#d8e0dd] bg-[#f8fbfa] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                {data.recentTasks.length} active
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {data.recentTasks.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-[#d8e0dd] bg-[#fafcfb] px-4 py-8 text-center text-sm text-slate-500">
                  No pending tasks. The board is clear.
                </div>
              ) : (
                data.recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-col gap-3 rounded-[1.4rem] border border-[#e4ebe8] bg-[#fbfcfb] px-4 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Due {new Date(task.dueDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                          task.priority === "HIGH"
                            ? "border border-rose-200 bg-rose-50 text-rose-600"
                            : task.priority === "MEDIUM"
                            ? "border border-amber-200 bg-amber-50 text-amber-600"
                            : "border border-slate-200 bg-white text-slate-500"
                        }`}
                      >
                        {task.priority}
                      </span>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-full border border-[#d8e0dd] bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:text-slate-900"
                      >
                        Review
                        <ArrowUpRight className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-[#d8e0dd] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#4966d5]">
              <Calendar className="size-4" />
              Weekly work schedule
            </div>
            <div className="mt-4 space-y-3">
              {schedule.map((item) => (
                <div
                  key={item.key}
                  className={`rounded-[1.35rem] border px-4 py-3 transition-colors ${
                    item.isToday
                      ? "border-[#8adfd2] bg-[#f3fbf8]"
                      : item.isWeekend
                      ? "border-[#ecefed] bg-[#fafbfa]"
                      : "border-[#e4ebe8] bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#f6f8f7] text-slate-700">
                        <span className="text-xs font-bold">{item.day}</span>
                        <span className="text-[10px] text-slate-400">{item.dateLabel}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.type}</p>
                        <p className="mt-0.5 text-sm text-slate-500">{item.hours}</p>
                      </div>
                    </div>
                    {item.isToday && (
                      <span className="rounded-full border border-[#bfeadf] bg-[#eaf8f4] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#0f8f85]">
                        Today
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-[#d8e0dd] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3 border-b border-[#e7ece9] pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Calendar watch</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">Upcoming holidays</h3>
              </div>
              <span className="rounded-full border border-[#d8e0dd] bg-[#f8fbfa] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                {data.upcomingHolidays.length} listed
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {data.upcomingHolidays.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-[#d8e0dd] bg-[#fafcfb] px-4 py-8 text-center text-sm text-slate-500">
                  No upcoming holidays on the books yet.
                </div>
              ) : (
                data.upcomingHolidays.map((holiday) => (
                  <div key={holiday.id} className="flex items-center justify-between gap-3 rounded-[1.35rem] border border-[#e4ebe8] bg-[#fbfcfb] px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{holiday.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{holiday.holidayType}</p>
                    </div>
                    <div className="rounded-2xl bg-[#f3f6ff] px-3 py-2 text-right">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#4966d5]">
                        {new Date(holiday.date).toLocaleDateString("en-US", { month: "short" })}
                      </p>
                      <p className="text-lg font-semibold text-slate-900">
                        {new Date(holiday.date).toLocaleDateString("en-US", { day: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
