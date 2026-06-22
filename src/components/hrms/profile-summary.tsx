"use client";

import React, { useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarCheck2,
  Clock3,
  Coffee,
  LogOut,
  Play,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import { UserProfile } from "@/modules/hrms/types";
import { toast } from "sonner";

interface ProfileSummaryProps {
  profile: UserProfile;
  onPunchAction: (action: "CHECK_IN" | "CHECK_OUT" | "START_BREAK" | "RESUME_WORK") => Promise<void>;
  loading: boolean;
}

type PunchCelebration = {
  mode: "break" | "resume";
  token: number;
} | null;

const attendanceCopy: Record<UserProfile["attendanceStatus"], { label: string; detail: string }> = {
  YET_TO_CHECK_IN: {
    label: "Ready to begin",
    detail: "Start your day with a clean check-in and keep the dashboard in sync.",
  },
  CHECKED_IN: {
    label: "On the clock",
    detail: "You are actively checked in. Keep moving through tasks and approvals.",
  },
  ON_BREAK: {
    label: "Break in progress",
    detail: "Your break session is active. Resume work when you are ready.",
  },
  CHECKED_OUT: {
    label: "Day wrapped",
    detail: "You have checked out for today. Tomorrow's view will reset automatically.",
  },
};

function parseClock(value: string) {
  const [hours = 0, minutes = 0, seconds = 0] = value.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function formatClock(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function AttendanceTimer({
  status,
  startingValue,
}: {
  status: UserProfile["attendanceStatus"];
  startingValue: string;
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (status !== "CHECKED_IN") return;

    const interval = setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  return (
    <p className="font-mono text-3xl font-semibold tracking-tight text-slate-900">
      {formatClock(parseClock(startingValue) + elapsedSeconds)}
    </p>
  );
}

export function ProfileSummary({
  profile,
  onPunchAction,
  loading,
}: ProfileSummaryProps) {
  const [celebration, setCelebration] = useState<PunchCelebration>(null);

  useEffect(() => {
    if (!celebration) return;

    const timeout = window.setTimeout(() => {
      setCelebration(null);
    }, 1900);

    return () => window.clearTimeout(timeout);
  }, [celebration]);

  const handlePunch = async (action: "CHECK_IN" | "CHECK_OUT" | "START_BREAK" | "RESUME_WORK") => {
    if (action === "START_BREAK") {
      setCelebration({ mode: "break", token: Date.now() });
    }

    if (action === "RESUME_WORK") {
      setCelebration({ mode: "resume", token: Date.now() });
    }

    try {
      await onPunchAction(action);
      toast.success(`Punch action "${action}" registered successfully.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit punch");
    }
  };

  const attendanceStatus = attendanceCopy[profile.attendanceStatus];
  const pendingCounts = profile.pendingCounts ?? { leaves: 0, cases: 0, tasks: 0 };
  const showBreakParty = celebration?.mode === "break";
  const showResumeParty = celebration?.mode === "resume";

  return (
    <section className="overflow-hidden border border-[#d6dfdc] shadow-[0_28px_80px_rgba(15,23,42,0.12)]">
      <div className="grid gap-0 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="relative overflow-hidden bg-[#0f1c22] px-6 py-6 text-white sm:px-8 sm:py-8 ds-dark-banner">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(126,230,216,0.26),transparent_34%),radial-gradient(circle_at_70%_20%,rgba(252,211,77,0.16),transparent_25%)]" />
          <div className="relative space-y-7">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex size-20 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/8 text-3xl font-black text-[#8ae8db] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                  {profile?.name?.charAt(0) ?? ""}
                </div>
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#8ae8db]">
                    <ShieldCheck className="size-3.5" />
                    Employee cockpit
                  </div>
                  <div>
                    <h1 className="font-display text-4xl leading-none tracking-[-0.04em] text-white sm:text-5xl">
                      {profile?.name ?? ""}
                    </h1>
                    <p className="mt-2 text-sm text-white/70">
                      {profile?.designation || "Team Member"}
                      {profile?.employeeNo ? `  •  Emp #${profile.employeeNo}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-white/72">
                    <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5">
                      Department: {profile?.department || "General"}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5">
                      Branch: {profile?.branch || "Headquarters"}
                    </span>
                    {profile?.manager && (
                      <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5">
                        Manager: {profile.manager}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="max-w-sm rounded-xl border border-[#88e3d8]/18 bg-[#10252d]/80 p-4 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8ae8db]">
                  Attendance status
                </p>
                <p className="mt-2 text-xl font-semibold text-white">{attendanceStatus.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-white/66">{attendanceStatus.detail}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/6 p-4">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/56">
                  <TimerReset className="size-3.5 text-[#8ae8db]" />
                  Pending tasks
                </div>
                <p className="mt-3 font-display text-4xl leading-none tracking-[-0.04em] text-white">
                  {pendingCounts.tasks}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/6 p-4">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/56">
                  <CalendarCheck2 className="size-3.5 text-[#8ae8db]" />
                  Open leave items
                </div>
                <p className="mt-3 font-display text-4xl leading-none tracking-[-0.04em] text-white">
                  {pendingCounts.leaves}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/6 p-4">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/56">
                  <BriefcaseBusiness className="size-3.5 text-[#8ae8db]" />
                  Open HR cases
                </div>
                <p className="mt-3 font-display text-4xl leading-none tracking-[-0.04em] text-white">
                  {pendingCounts.cases}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-5 border-l border-[#1c2d36] bg-white px-6 py-6 sm:px-8 sm:py-8">
          <div className="rounded-xl border border-[#d7e3df] bg-white/78 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f8f85]">Live timer</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-[#dcf7f2] text-[#0f8f85]">
                    <Clock3 className="size-5" />
                  </div>
                  <div>
                    <AttendanceTimer
                      key={`${profile.attendanceStatus}-${profile.totalInTime}`}
                      status={profile.attendanceStatus}
                      startingValue={profile.totalInTime}
                    />
                    <p className="mt-1 text-sm text-slate-500">
                      {profile.attendanceStatus === "CHECKED_OUT" ? "Final time for today" : "Updated every second while active"}
                    </p>
                  </div>
                </div>
              </div>

              <span className="rounded-full border border-[#c6e9e2] bg-[#edf9f6] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#0f8f85]">
                {profile.attendanceStatus.replaceAll("_", " ")}
              </span>
            </div>
          </div>

          <div className="grid gap-3">
            {profile?.attendanceStatus === "YET_TO_CHECK_IN" && (
              <button
                type="button"
                disabled={loading}
                onClick={() => handlePunch("CHECK_IN")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f8f85] px-5 py-4 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(15,143,133,0.24)] transition hover:bg-[#0b7d74] disabled:opacity-50"
              >
                <Play className="size-4 fill-current" />
                Check In
              </button>
            )}

            {profile?.attendanceStatus === "CHECKED_IN" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handlePunch("START_BREAK")}
                    className={`relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-[#d8ddd8] bg-white px-5 py-4 text-sm font-semibold text-slate-700 transition disabled:opacity-50 ${
                      showBreakParty
                        ? "scale-[1.03] -rotate-1 bg-[#fff7eb] shadow-[0_18px_35px_rgba(217,119,6,0.18)]"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(251,146,60,0.16),transparent_32%),radial-gradient(circle_at_80%_30%,rgba(0,206,196,0.15),transparent_28%)] transition-opacity duration-300 ${
                        showBreakParty ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    <Coffee className={`relative size-4 ${showBreakParty ? "animate-bounce" : ""}`} />
                    <span className="relative">Start Break</span>
                    {showBreakParty ? (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg">☕</span>
                    ) : null}
                  </button>

                  {showBreakParty ? (
                    <>
                      <span className="pointer-events-none absolute -top-3 left-5 rounded-full bg-[#fff3dd] px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#c46d09] animate-bounce">
                        BRB
                      </span>
                      <span className="pointer-events-none absolute -right-2 top-2 rounded-full bg-[#ecfdfa] px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#0f8f85] [animation:bounce_1s_ease-in-out_0.15s_2]">
                        Snack Quest
                      </span>
                      <span className="pointer-events-none absolute bottom-[-12px] left-1/2 -translate-x-1/2 rounded-full bg-[#1f2937] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white [animation:fade-in-up_220ms_ease-out,fade-out_260ms_ease-in_1.45s_forwards]">
                        Bean boost engaged
                      </span>
                    </>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handlePunch("CHECK_OUT")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1d2934] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#13202a] disabled:opacity-50"
                >
                  <LogOut className="size-4" />
                  Check Out
                </button>
              </div>
            )}

            {profile?.attendanceStatus === "ON_BREAK" && (
              <div className="relative">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handlePunch("RESUME_WORK")}
                  className={`relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-5 py-4 text-sm font-semibold text-white transition disabled:opacity-50 ${
                    showResumeParty
                      ? "scale-[1.02] bg-[#ef8f22] shadow-[0_20px_40px_rgba(217,119,6,0.28)]"
                      : "bg-[#d97706] hover:bg-[#b86105]"
                  }`}
                >
                  <span
                    className={`absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.15)_30%,transparent_55%),radial-gradient(circle_at_18%_50%,rgba(255,244,214,0.35),transparent_24%)] transition-opacity duration-300 ${
                      showResumeParty ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <Play className={`relative size-4 fill-current ${showResumeParty ? "translate-x-0.5 animate-pulse" : ""}`} />
                  <span className="relative">Resume Work</span>
                  {showResumeParty ? (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg">🚀</span>
                  ) : null}
                </button>

                {showResumeParty ? (
                  <>
                    <span className="pointer-events-none absolute -top-3 left-4 rounded-full bg-[#1d2934] px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#ffe1b8] animate-bounce">
                      Oops, productivity
                    </span>
                    <span className="pointer-events-none absolute right-4 top-[-10px] text-lg [animation:bounce_0.9s_ease-in-out_2]">
                      ⚡
                    </span>
                    <span className="pointer-events-none absolute bottom-[-12px] left-1/2 -translate-x-1/2 rounded-full bg-[#fff2dc] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#b86105] [animation:fade-in-up_220ms_ease-out,fade-out_260ms_ease-in_1.45s_forwards]">
                      Back to the spreadsheets
                    </span>
                  </>
                ) : null}
              </div>
            )}

            {profile?.attendanceStatus === "CHECKED_OUT" && (
              <div className="rounded-xl border border-[#d8ddd8] bg-white px-5 py-4 text-center text-sm font-semibold text-slate-600">
                Checked out successfully for today.
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#d7e3df] bg-[#fffdf8] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Today’s guide</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Keep attendance current, clear pending requests early, and use the cards below to stay ahead of tasks, announcements, and upcoming holidays.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
