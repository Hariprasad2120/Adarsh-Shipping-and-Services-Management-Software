"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Clock3,
  Coffee,
  LogOut,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MonolithSpecLabel } from "@/components/ui/foundation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UserProfile } from "@/modules/hrms/types";
import type { PunchAction } from "./dashboard-types";

interface AttendanceCommandProps {
  profile: UserProfile;
  loading: boolean;
  onPunchAction: (action: PunchAction) => Promise<void>;
}

type DashboardActionItem = {
  module: string;
  task: string;
  meta: string;
  signal: string;
};

type DashboardInsightItem = {
  label: string;
  value: string;
  detail: string;
};

const attendanceCopy: Record<
  UserProfile["attendanceStatus"],
  { label: string; detail: string; tone: "secondary" | "success" | "warning" }
> = {
  YET_TO_CHECK_IN: {
    label: "Ready to begin",
    detail: "Check in to start your workday and sync your activity.",
    tone: "secondary",
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

function formatAttendanceDate() {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());
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
  const [actionBursting, setActionBursting] = useState(false);
  const [lastPunchAction, setLastPunchAction] = useState<PunchAction | null>(null);
  const status = attendanceCopy[profile.attendanceStatus];
  const pending = profile.pendingCounts ?? { tasks: 0, leaves: 0, cases: 0 };
  const actionItems: DashboardActionItem[] = [
    {
      module: "To-Do",
      task:
        pending.tasks > 0
          ? `Review ${pending.tasks} pending task${pending.tasks === 1 ? "" : "s"}`
          : "Scan the priority task queue",
      meta: "Focus queue",
      signal: pending.tasks > 0 ? `${pending.tasks} live` : "Queue ready",
    },
    {
      module: "Attendance",
      task:
        profile.attendanceStatus === "CHECKED_OUT"
          ? "Confirm tomorrow's attendance plan"
          : "Keep your attendance status current",
      meta: status.label,
      signal: profile.attendanceStatus.replaceAll("_", " "),
    },
    {
      module: "HRMS",
      task:
        pending.leaves > 0
          ? `Clear ${pending.leaves} leave request${pending.leaves === 1 ? "" : "s"}`
          : "Check team leave movement",
      meta: "People operations",
      signal: pending.leaves > 0 ? `${pending.leaves} pending` : "Lane clear",
    },
    {
      module: "Helpdesk",
      task:
        pending.cases > 0
          ? `Respond to ${pending.cases} open HR case${pending.cases === 1 ? "" : "s"}`
          : "Review open support signals",
      meta: "Service desk",
      signal: pending.cases > 0 ? `${pending.cases} active` : "Watching",
    },
    {
      module: "Product Catalogue",
      task: "Validate module updates before the next handoff",
      meta: "Workspace sync",
      signal: "Monitoring",
    },
  ];
  const [featuredAction, ...queuedActions] = actionItems;
  const insightItems: DashboardInsightItem[] = [
    {
      label: "Priority queue",
      value: String(pending.tasks).padStart(2, "0"),
      detail: pending.tasks > 0 ? "Tasks ready for review" : "No urgent tasks waiting",
    },
    {
      label: "Leave desk",
      value: String(pending.leaves).padStart(2, "0"),
      detail: pending.leaves > 0 ? "Requests need a response" : "Approvals are under control",
    },
    {
      label: "Helpdesk watch",
      value: String(pending.cases).padStart(2, "0"),
      detail: pending.cases > 0 ? "Support signals are open" : "Service desk is quiet",
    },
  ];

  useEffect(() => {
    if (!celebrating) return;
    const timeoutId = window.setTimeout(() => setCelebrating(false), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [celebrating]);

  useEffect(() => {
    if (!actionBursting) return;
    const timeoutId = window.setTimeout(() => setActionBursting(false), 980);
    return () => window.clearTimeout(timeoutId);
  }, [actionBursting]);

  async function handlePunch(action: PunchAction) {
    try {
      await onPunchAction(action);
      setLastPunchAction(action);
      setActionBursting(true);
      setCelebrating(true);
      toast.success("Attendance updated successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Attendance could not be updated.");
    }
  }

  return (
    <section className={`mnx-dashboard-hero ${celebrating ? "is-celebrating" : ""}`}>
      <div className="mnx-dashboard-hero-graphic" aria-hidden="true">
        <span />
        <span />
        <span />
        <i />
        <i />
      </div>
      <div className="mnx-dashboard-hero-stage">
        <div className="mnx-dashboard-identity-card">
          <div className="mnx-dashboard-hero-header">
            <div className="mnx-dashboard-eyebrow">
              <span className="mnx-dashboard-pulse" />
              OPERATIONS WORKSPACE
            </div>
            <span className="mnx-dashboard-hero-status">{status.label}</span>
          </div>

          <div className="mnx-dashboard-profile-band">
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

            <dl className="mnx-dashboard-insight-grid" aria-label="Dashboard highlights">
              {insightItems.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                  <p>{item.detail}</p>
                </div>
              ))}
            </dl>
          </div>

          <div className="mnx-dashboard-context" aria-label="Workspace context">
            <span><BriefcaseBusiness size={14} />{profile.department || "General operations"}</span>
            <span><ShieldCheck size={14} />{profile.branch || "Head office"}</span>
            {profile.manager ? <span><Sparkles size={14} />Reports to {profile.manager}</span> : null}
          </div>

          <div className="mnx-dashboard-action-showcase" aria-label="Actions needing attention">
            <article className="mnx-dashboard-action-feature">
              <div className="mnx-dashboard-action-feature-head">
                <span>Primary pulse</span>
                <b>{featuredAction.signal}</b>
              </div>
              <strong>{featuredAction.task}</strong>
              <p>{featuredAction.meta}</p>
              <small>{featuredAction.module}</small>
            </article>

            <div className="mnx-dashboard-action-window">
              <div className="mnx-dashboard-action-header">
                <p>Action queue</p>
                <span>{queuedActions.length} live updates</span>
              </div>
              <div className="mnx-dashboard-action-list">
                {queuedActions.map((item) => (
                  <article key={`${item.module}-${item.task}`}>
                    <div className="mnx-dashboard-action-row">
                      <span>{item.module}</span>
                      <b>{item.signal}</b>
                    </div>
                    <strong>{item.task}</strong>
                    <small>{item.meta}</small>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mnx-attendance-panel">
          <header className="mnx-attendance-header">
            <div>
              <MonolithSpecLabel>LIVE ATTENDANCE</MonolithSpecLabel>
              <h2>{status.label}</h2>
            </div>
            <Badge variant={status.tone}>
              <i />
              {profile.attendanceStatus.replaceAll("_", " ")}
            </Badge>
          </header>

          <div className="mnx-attendance-clock">
            <div className="mnx-attendance-date-row">
              <Clock3 size={13} />
              <span>{formatAttendanceDate()}</span>
            </div>
            <div className="mnx-attendance-time-stack">
              <span className="mnx-attendance-time-label">Time worked</span>
              <div className={`mnx-attendance-time-value is-${profile.attendanceStatus.toLowerCase()}`}>
                <span className="mnx-attendance-time-icon" aria-hidden="true">
                  {profile.attendanceStatus === "CHECKED_OUT" ? <Check size={12} /> : null}
                  {profile.attendanceStatus === "CHECKED_IN" ? <Clock3 size={12} /> : null}
                  {profile.attendanceStatus === "ON_BREAK" ? <Coffee size={12} /> : null}
                  {profile.attendanceStatus === "YET_TO_CHECK_IN" ? <Play size={12} fill="currentColor" /> : null}
                </span>
                <AttendanceTimer
                  key={`${profile.attendanceStatus}-${profile.totalInTime}`}
                  status={profile.attendanceStatus}
                  startingValue={profile.totalInTime}
                />
              </div>
              <p>{profile.attendanceStatus === "CHECKED_OUT" ? "Final recorded time" : "Live work duration"}</p>
            </div>
          </div>

          <p className="mnx-attendance-detail">{status.detail}</p>

          <div className={`mnx-attendance-actions${actionBursting ? " is-bursting" : ""}`}>
            {actionBursting ? (
              <div className="mnx-attendance-action-burst" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            ) : null}
            {profile.attendanceStatus === "YET_TO_CHECK_IN" ? (
              <Button
                className={`mnx-button-wide mnx-attendance-action-button${
                  actionBursting && lastPunchAction === "CHECK_IN" ? " is-bursting" : ""
                }`}
                disabled={loading}
                onClick={() => handlePunch("CHECK_IN")}
              >
                <span>{loading ? "Updating…" : "Check in"}</span>
                {loading ? <span className="mnx-button-spinner" /> : <Play size={16} fill="currentColor" />}
              </Button>
            ) : null}

            {profile.attendanceStatus === "CHECKED_IN" ? (
              <>
                <Button
                  className={`mnx-attendance-action-button${
                    actionBursting && lastPunchAction === "START_BREAK" ? " is-bursting" : ""
                  }`}
                  variant="inverse"
                  disabled={loading}
                  onClick={() => handlePunch("START_BREAK")}
                >
                  <Coffee size={16} />
                  Start break
                </Button>
                <Button
                  className={`mnx-attendance-action-button mnx-attendance-action-button-primary${
                    actionBursting && lastPunchAction === "CHECK_OUT" ? " is-bursting" : ""
                  }`}
                  disabled={loading}
                  onClick={() => handlePunch("CHECK_OUT")}
                >
                  Check out
                  <LogOut size={16} />
                </Button>
              </>
            ) : null}

            {profile.attendanceStatus === "ON_BREAK" ? (
              <Button
                className={`mnx-button-wide mnx-attendance-action-button${
                  actionBursting && lastPunchAction === "RESUME_WORK" ? " is-bursting" : ""
                }`}
                disabled={loading}
                onClick={() => handlePunch("RESUME_WORK")}
              >
                <span>{loading ? "Updating…" : "Resume work"}</span>
                {loading ? <span className="mnx-button-spinner" /> : <ArrowRight size={17} />}
              </Button>
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
      </div>
    </section>
  );
}
