"use client";

import React, { useState, useEffect } from "react";
import { Clock, Coffee, Play, LogOut, ArrowUpRight } from "lucide-react";
import { UserProfile } from "@/modules/hrms/peopleplus/types";
import { toast } from "sonner";

interface ProfileSummaryProps {
  profile: UserProfile;
  onPunchAction: (action: "CHECK_IN" | "CHECK_OUT" | "START_BREAK" | "RESUME_WORK") => Promise<void>;
  loading: boolean;
}

export function ProfileSummary({
  profile,
  onPunchAction,
  loading,
}: ProfileSummaryProps) {
  const [inTime, setInTime] = useState(profile?.totalInTime ?? "00:00:00");

  // Simple tick effect if user is checked in and not on break
  useEffect(() => {
    setInTime(profile?.totalInTime ?? "00:00:00");

    if (profile?.attendanceStatus !== "CHECKED_IN") return;

    const interval = setInterval(() => {
      setInTime((prev) => {
        const parts = prev.split(":").map(Number);
        if (parts.length !== 3) return prev;
        let [h, m, s] = parts;
        s++;
        if (s >= 60) {
          s = 0;
          m++;
          if (m >= 60) {
            m = 0;
            h++;
          }
        }
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [profile?.attendanceStatus, profile?.totalInTime]);

  const handlePunch = async (action: "CHECK_IN" | "CHECK_OUT" | "START_BREAK" | "RESUME_WORK") => {
    try {
      await onPunchAction(action);
      toast.success(`Punch action "${action}" registered successfully.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit punch");
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm select-none">
      {/* Cover / Accent */}
      <div className="h-28 bg-gradient-to-r from-[#00c4b6]/20 to-[#6366f1]/20 relative" />

      {/* Profile Details Container */}
      <div className="px-6 pb-6 relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        {/* Left Side: Photo + Name */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-10 sm:mt-0">
          <div className="size-20 rounded-2xl bg-white border border-slate-200 shadow-md flex items-center justify-center text-[#00c4b6] font-bold text-2xl relative z-10 shrink-0 select-none">
            {profile?.name?.charAt(0) ?? ""}
          </div>
          <div className="text-center sm:text-left space-y-1">
            <h1 className="text-lg font-bold text-slate-800">{profile?.name ?? ""}</h1>
            <p className="text-xs text-slate-500 font-medium">
              {profile?.designation} &bull; {profile?.employeeNo ? `Emp #${profile.employeeNo}` : ""}
            </p>
            <p className="text-[11px] text-slate-400">
              Department: {profile?.department || "General"} &bull; Branch: {profile?.branch || "Headquarters"}
            </p>
          </div>
        </div>

        {/* Right Side: Clock Controls */}
        <div className="flex flex-wrap items-center gap-3 justify-center md:justify-end shrink-0">
          {/* Active Timer badge */}
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
            <Clock className="size-4 text-[#00c4b6] animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">In Time</span>
              <span className="text-sm font-bold text-slate-700 font-mono leading-none">{inTime}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {profile?.attendanceStatus === "YET_TO_CHECK_IN" && (
              <button
                type="button"
                disabled={loading}
                onClick={() => handlePunch("CHECK_IN")}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#00c4b6] hover:bg-[#00b0a3] rounded-xl cursor-pointer transition-colors shadow-sm disabled:opacity-50"
              >
                <Play className="size-3.5 fill-current" />
                Check In
              </button>
            )}

            {profile?.attendanceStatus === "CHECKED_IN" && (
              <>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handlePunch("START_BREAK")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors border border-slate-200 disabled:opacity-50"
                >
                  <Coffee className="size-3.5" />
                  Start Break
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handlePunch("CHECK_OUT")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                >
                  <LogOut className="size-3.5" />
                  Check Out
                </button>
              </>
            )}

            {profile?.attendanceStatus === "ON_BREAK" && (
              <button
                type="button"
                disabled={loading}
                onClick={() => handlePunch("RESUME_WORK")}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl cursor-pointer transition-colors shadow-sm disabled:opacity-50"
              >
                <Play className="size-3.5 fill-current" />
                Resume Work
              </button>
            )}

            {profile?.attendanceStatus === "CHECKED_OUT" && (
              <span className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-500 bg-rose-50 border border-rose-100 rounded-xl">
                Checked Out
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
