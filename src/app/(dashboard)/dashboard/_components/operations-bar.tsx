"use client";

import { ArrowRight, Check, Coffee, LogOut, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { WorkspaceAction } from "@/components/layout/workspace";
import type { UserProfile } from "@/modules/hrms/types";
import type { PunchAction } from "./dashboard-types";

interface OperationsBarProps {
  profile: UserProfile;
  loading: boolean;
  onPunchAction: (action: PunchAction) => Promise<void>;
  primaryAction?: { label: string; href: string } | null;
}

const STATUS_LABEL: Record<UserProfile["attendanceStatus"], string> = {
  YET_TO_CHECK_IN: "Off the clock",
  CHECKED_IN: "On the clock",
  ON_BREAK: "On break",
  CHECKED_OUT: "Day closed",
};

function parseClock(value: string) {
  const [h = 0, m = 0, s = 0] = value.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

function formatClock(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((p) => String(p).padStart(2, "0")).join(":");
}

function formatToday() {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(new Date());
}

function LiveTimer({
  status,
  startingValue,
}: {
  status: UserProfile["attendanceStatus"];
  startingValue: string;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status !== "CHECKED_IN") return;
    const id = window.setInterval(() => setElapsed((c) => c + 1), 1000);
    return () => window.clearInterval(id);
  }, [status, startingValue]);

  return (
    <span className="mnx-dash2-att-timer" aria-live="off">
      {formatClock(parseClock(startingValue) + elapsed)}
    </span>
  );
}

export function OperationsBar({
  profile,
  loading,
  onPunchAction,
  primaryAction,
}: OperationsBarProps) {
  const status = profile.attendanceStatus;

  async function punch(action: PunchAction) {
    try {
      await onPunchAction(action);
      toast.success("Attendance updated.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Attendance could not be updated.",
      );
    }
  }

  return (
    <div className="mnx-dash2-opsbar">
      <h1>Today &middot; {formatToday()}</h1>

      <div className="mnx-dash2-opsbar-tools">
        <div
          className="mnx-dash2-att"
          data-state={status.toLowerCase()}
          role="status"
        >
          <span className="mnx-dash2-att-dot" aria-hidden="true" />
          <span className="mnx-dash2-att-status">{STATUS_LABEL[status]}</span>
          {status === "CHECKED_IN" || status === "ON_BREAK" ? (
            <LiveTimer status={status} startingValue={profile.totalInTime} />
          ) : null}

          {status === "YET_TO_CHECK_IN" ? (
            <WorkspaceAction
              size="compact"
              disabled={loading}
              onClick={() => punch("CHECK_IN")}
            >
              <Play size={14} fill="currentColor" />
              {loading ? "Checking in…" : "Check in"}
            </WorkspaceAction>
          ) : null}

          {status === "CHECKED_IN" ? (
            <>
              <WorkspaceAction
                size="compact"
                variant="secondary"
                disabled={loading}
                onClick={() => punch("START_BREAK")}
              >
                <Coffee size={14} />
                Break
              </WorkspaceAction>
              <WorkspaceAction
                size="compact"
                disabled={loading}
                onClick={() => punch("CHECK_OUT")}
              >
                <LogOut size={14} />
                Check out
              </WorkspaceAction>
            </>
          ) : null}

          {status === "ON_BREAK" ? (
            <WorkspaceAction
              size="compact"
              disabled={loading}
              onClick={() => punch("RESUME_WORK")}
            >
              <ArrowRight size={14} />
              {loading ? "Resuming…" : "Resume"}
            </WorkspaceAction>
          ) : null}

          {status === "CHECKED_OUT" ? (
            <Check size={14} aria-hidden="true" />
          ) : null}
        </div>

        {primaryAction ? (
          <Link className="mnx-button mnx-button-primary" href={primaryAction.href}>
            {primaryAction.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
