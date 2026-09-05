"use client";

import * as React from "react";
import { ArrowRight, Check, Clock, Coffee, LogOut, Play } from "lucide-react";
import { toast } from "sonner";
import { DsButton } from "./ds-button";
import { DsIcon } from "./ds-icon";

/**
 * PunchCard — attendance control and live shift ticker for the Monolith design system.
 *
 * Designed with a rich dashboard aesthetic (Skymetrics style):
 * 1. Header band: "ATTENDANCE" category tag + status pill badge (dot + label).
 * 2. Hero metric: prominent tabular time ticker + metric caption.
 * 3. Action bar: sleek primary/secondary DS action buttons.
 */

export type PunchStatus =
  | "YET_TO_CHECK_IN"
  | "CHECKED_IN"
  | "ON_BREAK"
  | "CHECKED_OUT";

export type PunchAction =
  | "CHECK_IN"
  | "START_BREAK"
  | "RESUME_WORK"
  | "CHECK_OUT";

const STATUS_LABEL: Record<PunchStatus, string> = {
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

/**
 * Live HH:MM:SS ticker. Remounted (via `key={since}`) whenever the baseline
 * changes, so it never needs a synchronous state reset.
 */
function PunchTimer({ since, running }: { since: string; running: boolean }) {
  const base = React.useMemo(() => parseClock(since), [since]);
  const startedAtRef = React.useRef(0);
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    startedAtRef.current = Date.now();
    if (!running) return;
    const id = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)),
      1000,
    );
    return () => window.clearInterval(id);
  }, [running]);

  return (
    <span className="ds-punch-timer" aria-live="off">
      {formatClock(base + elapsed)}
    </span>
  );
}

export interface PunchCardProps {
  status: PunchStatus;
  /** "HH:MM:SS" already elapsed at mount; the card ticks from here */
  since?: string;
  loading?: boolean;
  onPunch: (action: PunchAction) => void | Promise<void>;
}

export function PunchCard({
  status,
  since = "00:00:00",
  loading = false,
  onPunch,
}: PunchCardProps) {
  const running = status === "CHECKED_IN";
  const showTimer = status === "CHECKED_IN" || status === "ON_BREAK";

  async function punch(action: PunchAction) {
    try {
      await onPunch(action);
      toast.success("Attendance updated.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Attendance could not be updated.",
      );
    }
  }

  return (
    <div
      className="ds-punch ds-punch-symmetric"
      data-status={status.toLowerCase()}
      role="status"
    >
      {/* Header Band: Category Tag + Status Badge Pill */}
      <div className="ds-punch-header">
        <div className="ds-punch-eyebrow">
          <Clock className="ds-punch-eyebrow-icon" />
          <span>ATTENDANCE</span>
        </div>
        <div className="ds-punch-badge" data-status={status.toLowerCase()}>
          <span className="ds-punch-dot" aria-hidden="true" />
          <span className="ds-punch-label">{STATUS_LABEL[status]}</span>
        </div>
      </div>

      {/* Hero Metric Band: Centered Tabular Clock + Caption */}
      <div className="ds-punch-hero">
        <div className="ds-punch-ticker-wrap">
          {showTimer ? (
            <PunchTimer key={since} since={since} running={running} />
          ) : status === "CHECKED_OUT" ? (
            <span className="ds-punch-timer-static">{since || "08:00:00"}</span>
          ) : (
            <span className="ds-punch-timer-static">00:00:00</span>
          )}
        </div>
        <div className="ds-punch-caption">
          {status === "CHECKED_IN"
            ? "WORKED TIME TODAY"
            : status === "ON_BREAK"
              ? "PAUSED (ON BREAK)"
              : status === "CHECKED_OUT"
                ? "TOTAL WORKED TIME"
                : "SHIFT: 09:30 AM – 05:30 PM"}
        </div>
        {/* Subtle Animated Progress Track */}
        <div className="ds-punch-progress-track" aria-hidden="true">
          <div
            className="ds-punch-progress-bar"
            data-running={running}
            data-status={status.toLowerCase()}
          />
        </div>
      </div>

      {/* Action Bar: Symmetrically Centered */}
      <div className="ds-punch-actions">
        {status === "YET_TO_CHECK_IN" ? (
          <DsButton
            variant="primary"
            size="sm"
            disabled={loading}
            onClick={() => punch("CHECK_IN")}
            className="ds-punch-btn-hero"
            data-punch-action="check_in"
            data-tone="success"
          >
            <DsIcon icon={Play} size="sm" />
            {loading ? "Checking in…" : "Check in"}
          </DsButton>
        ) : null}

        {status === "CHECKED_IN" ? (
          <>
            <DsButton
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() => punch("START_BREAK")}
              className="ds-punch-btn-half"
              data-punch-action="start_break"
              data-tone="warning"
            >
              <DsIcon icon={Coffee} size="sm" />
              Break
            </DsButton>
            <DsButton
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() => punch("CHECK_OUT")}
              className="ds-punch-btn-half"
              data-punch-action="check_out"
              data-tone="danger"
            >
              <DsIcon icon={LogOut} size="sm" />
              Check out
            </DsButton>
          </>
        ) : null}

        {status === "ON_BREAK" ? (
          <>
            <DsButton
              variant="primary"
              size="sm"
              disabled={loading}
              onClick={() => punch("RESUME_WORK")}
              className="ds-punch-btn-half"
              data-punch-action="resume_work"
              data-tone="success"
            >
              <DsIcon icon={ArrowRight} size="sm" />
              {loading ? "Resuming…" : "Continue working"}
            </DsButton>
            <DsButton
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() => punch("CHECK_OUT")}
              className="ds-punch-btn-half"
              data-punch-action="check_out"
              data-tone="danger"
            >
              <DsIcon icon={LogOut} size="sm" />
              Check out
            </DsButton>
          </>
        ) : null}

        {status === "CHECKED_OUT" ? (
          <span className="ds-punch-done">
            <DsIcon icon={Check} size="sm" label="Day closed" />
            <span>Shift Completed</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

