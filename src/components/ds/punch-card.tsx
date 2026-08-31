"use client";

import * as React from "react";
import { ArrowRight, Check, Coffee, LogOut, Play } from "lucide-react";
import { toast } from "sonner";
import { DsButton } from "./ds-button";
import { DsIcon } from "./ds-icon";

/**
 * PunchCard — compact attendance control for the Monolith design system.
 *
 * One band: a state chip (dot + label + live timer) and the punch action(s)
 * for the current state. Designed to sit inline beside a WelcomeNote.
 *
 * It owns no data-fetching: pass `status`, the running `sinceSeconds`, a
 * `loading` flag, and an `onPunch` handler.
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

const STATUS_TONE: Record<PunchStatus, string> = {
  YET_TO_CHECK_IN: "var(--ds-text-subtle)",
  CHECKED_IN: "var(--ds-success)",
  ON_BREAK: "var(--ds-warning)",
  CHECKED_OUT: "var(--ds-primary)",
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
    <div className="ds-punch" data-status={status.toLowerCase()} role="status">
      <div className="ds-punch-state">
        <span
          className="ds-punch-dot"
          style={{ background: STATUS_TONE[status] }}
          aria-hidden="true"
        />
        <span className="ds-punch-label">{STATUS_LABEL[status]}</span>
        {showTimer ? (
          <PunchTimer key={since} since={since} running={running} />
        ) : null}
      </div>

      <div className="ds-punch-actions">
        {status === "YET_TO_CHECK_IN" ? (
          <DsButton
            variant="primary"
            size="sm"
            disabled={loading}
            onClick={() => punch("CHECK_IN")}
          >
            <DsIcon icon={Play} size="sm" />
            {loading ? "Checking in…" : "Check in"}
          </DsButton>
        ) : null}

        {status === "CHECKED_IN" ? (
          <>
            <DsButton
              variant="outlined"
              size="sm"
              disabled={loading}
              onClick={() => punch("START_BREAK")}
            >
              <DsIcon icon={Coffee} size="sm" />
              Break
            </DsButton>
            <DsButton
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() => punch("CHECK_OUT")}
            >
              <DsIcon icon={LogOut} size="sm" />
              Check out
            </DsButton>
          </>
        ) : null}

        {status === "ON_BREAK" ? (
          <DsButton
            variant="primary"
            size="sm"
            disabled={loading}
            onClick={() => punch("RESUME_WORK")}
          >
            <DsIcon icon={ArrowRight} size="sm" />
            {loading ? "Resuming…" : "Resume"}
          </DsButton>
        ) : null}

        {status === "CHECKED_OUT" ? (
          <span className="ds-punch-done">
            <DsIcon icon={Check} size="sm" label="Day closed" />
          </span>
        ) : null}
      </div>
    </div>
  );
}
