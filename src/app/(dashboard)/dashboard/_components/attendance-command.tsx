"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarCheck2,
  Check,
  Clock3,
  Coffee,
  LogOut,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "@/modules/hrms/types";
import type { PunchAction } from "./dashboard-types";

interface AttendanceCommandProps {
  profile: UserProfile;
  loading: boolean;
  onPunchAction: (action: PunchAction) => Promise<void>;
}

const attendanceCopy: Record<
  UserProfile["attendanceStatus"],
  { label: string; detail: string; tone: "neutral" | "success" | "warning" }
> = {
  YET_TO_CHECK_IN: {
    label: "Ready to begin",
    detail: "Check in to start your workday and sync your activity.",
    tone: "neutral",
  },
  CHECKED_IN: {
    label: "On the clock",
    detail: "Attendance is active and your live timer is running.",
    tone: "success",
  },
  ON_BREAK: {
    label: "Break in progress",
    detail: "Your break is active. Resume when you are ready.",
    tone: "warning",
  },
  CHECKED_OUT: {
    label: "Day complete",
    detail: "Your final time has been recorded for today.",
    tone: "success",
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

  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
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

    const intervalId = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [status, startingValue]);

  return (
    <strong className="mnx-dashboard-timer" aria-live="off">
      {formatClock(parseClock(startingValue) + elapsedSeconds)}
    </strong>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function AttendanceCommand({
  profile,
  loading,
  onPunchAction,
}: AttendanceCommandProps) {
  const [celebrating, setCelebrating] = useState(false);
  const status = attendanceCopy[profile.attendanceStatus];
  const pending = profile.pendingCounts ?? { tasks: 0, leaves: 0, cases: 0 };

  useEffect(() => {
    if (!celebrating) return;
    const timeoutId = window.setTimeout(() => setCelebrating(false), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [celebrating]);

  async function handlePunch(action: PunchAction) {
    try {
      await onPunchAction(action);
      setCelebrating(true);
      toast.success("Attendance updated successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Attendance could not be updated.");
    }
  }

  return (
    <section className={`mnx-dashboard-hero ${celebrating ? "is-celebrating" : ""}`}>
      <div className="mnx-dashboard-hero-copy">
        <div className="mnx-dashboard-eyebrow">
          <span className="mnx-dashboard-pulse" />
          OPERATIONS WORKSPACE
        </div>

        <div className="mnx-dashboard-profile">
          <div className="mnx-dashboard-profile-mark" aria-hidden="true">
            {initials(profile.name)}
          </div>
          <div>
            <p className="mnx-dashboard-welcome">Welcome back,</p>
            <h1>{profile.name}</h1>
            <p className="mnx-dashboard-role">
              {profile.designation || "Team member"}
              {profile.employeeNo ? ` · Employee ${profile.employeeNo}` : ""}
            </p>
          </div>
        </div>

        <div className="mnx-dashboard-context">
          <span><BriefcaseBusiness size={14} />{profile.department || "General operations"}</span>
          <span><ShieldCheck size={14} />{profile.branch || "Head office"}</span>
          {profile.manager ? <span><Sparkles size={14} />Reports to {profile.manager}</span> : null}
        </div>

        <div className="mnx-dashboard-mini-stats" aria-label="Pending work summary">
          <article>
            <span><RotateCcw size={14} />Pending tasks</span>
            <strong>{String(pending.tasks).padStart(2, "0")}</strong>
          </article>
          <article>
            <span><CalendarCheck2 size={14} />Leave items</span>
            <strong>{String(pending.leaves).padStart(2, "0")}</strong>
          </article>
          <article>
            <span><BriefcaseBusiness size={14} />HR cases</span>
            <strong>{String(pending.cases).padStart(2, "0")}</strong>
          </article>
        </div>
      </div>

      <div className="mnx-attendance-panel">
        <header className="mnx-attendance-header">
          <div>
            <span className="mnx-dashboard-spec-label">LIVE ATTENDANCE</span>
            <h2>{status.label}</h2>
          </div>
          <span className={`mnx-badge mnx-badge-${status.tone}`}>
            <i />
            {profile.attendanceStatus.replaceAll("_", " ")}
          </span>
        </header>

        <div className="mnx-attendance-clock">
          <div className="mnx-attendance-clock-icon"><Clock3 size={22} /></div>
          <div>
            <AttendanceTimer
              key={`${profile.attendanceStatus}-${profile.totalInTime}`}
              status={profile.attendanceStatus}
              startingValue={profile.totalInTime}
            />
            <p>{profile.attendanceStatus === "CHECKED_OUT" ? "Final recorded time" : "Live work duration"}</p>
          </div>
        </div>

        <p className="mnx-attendance-detail">{status.detail}</p>

        <div className="mnx-attendance-actions">
          {profile.attendanceStatus === "YET_TO_CHECK_IN" ? (
            <button
              type="button"
              className="mnx-button mnx-button-primary mnx-button-wide"
              disabled={loading}
              onClick={() => handlePunch("CHECK_IN")}
            >
              <span>{loading ? "Updating…" : "Check in"}</span>
              {loading ? <span className="mnx-button-spinner" /> : <Play size={16} fill="currentColor" />}
            </button>
          ) : null}

          {profile.attendanceStatus === "CHECKED_IN" ? (
            <>
              <button
                type="button"
                className="mnx-button mnx-button-secondary"
                disabled={loading}
                onClick={() => handlePunch("START_BREAK")}
              >
                <Coffee size={16} />
                Start break
              </button>
              <button
                type="button"
                className="mnx-button mnx-button-primary"
                disabled={loading}
                onClick={() => handlePunch("CHECK_OUT")}
              >
                Check out
                <LogOut size={16} />
              </button>
            </>
          ) : null}

          {profile.attendanceStatus === "ON_BREAK" ? (
            <button
              type="button"
              className="mnx-button mnx-button-primary mnx-button-wide"
              disabled={loading}
              onClick={() => handlePunch("RESUME_WORK")}
            >
              <span>{loading ? "Updating…" : "Resume work"}</span>
              {loading ? <span className="mnx-button-spinner" /> : <ArrowRight size={17} />}
            </button>
          ) : null}

          {profile.attendanceStatus === "CHECKED_OUT" ? (
            <div className="mnx-attendance-complete" role="status">
              <span><Check size={17} /></span>
              Attendance closed for today
            </div>
          ) : null}
        </div>

        <footer className="mnx-attendance-guide">
          <span>Today&apos;s guide</span>
          <p>Keep attendance current, clear priority work early, and review your next company update.</p>
        </footer>

        {celebrating ? (
          <div className="mnx-celebration" aria-live="polite">
            <span>✓</span>
            <b>All synced</b>
          </div>
        ) : null}
      </div>
    </section>
  );
}
