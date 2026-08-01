"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Clock,
  LogOut,
  MapPin,
  RefreshCw,
  Shield,
  Users,
  Wifi,
} from "lucide-react";
import { AdminBadge, AdminButton, AdminEmptyTableRow, AdminField, AdminInput, AdminPanel, AdminPanelHeader, AdminTable } from "@/modules/admin/components/admin-workspace";
import { WorkspaceMetric } from "@/components/layout/workspace";
import {
  adminRevokeAllUserSessionsAction,
  adminRevokeSessionAction,
  getActiveSessionsAction,
  saveTimeoutAction,
} from "./actions";

type ActiveSession = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  loginAt: string;
  lastSeenAt: string;
  ipAddress: string | null;
  location: string | null;
  durationMs: number;
};

type SessionHistory = ActiveSession & {
  logoutAt: string | null;
  status: string;
};

type SecurityEvent = {
  id: string;
  event: string;
  outcome: string;
  email: string | null;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

type Props = {
  initialActive: ActiveSession[];
  history: SessionHistory[];
  securityEvents: SecurityEvent[];
  renderedAt: string;
  timeoutMinutes: number;
};

function formatDuration(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function formatTime(value: string): string {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatEventLabel(event: string): string {
  return event
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function sessionVariant(status: string) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "TIMED_OUT") return "warning" as const;
  return "neutral" as const;
}

export function SessionsDashboard({
  initialActive,
  history,
  securityEvents,
  renderedAt,
  timeoutMinutes,
}: Props) {
  const [active, setActive] = useState(initialActive);
  const [nowMs, setNowMs] = useState(() => new Date(renderedAt).getTime());
  const [newTimeout, setNewTimeout] = useState(String(timeoutMinutes));
  const [savingTimeout, setSavingTimeout] = useState(false);
  const [timeoutSaved, setTimeoutSaved] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const todayCutoffMs = nowMs - 86_400_000;

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setActive(await getActiveSessionsAction());
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  async function saveTimeout() {
    const minutes = Number.parseInt(newTimeout, 10);
    if (Number.isNaN(minutes) || minutes < 1) return;
    setSavingTimeout(true);
    try {
      await saveTimeoutAction(minutes);
      setTimeoutSaved(true);
      setTimeout(() => setTimeoutSaved(false), 2000);
    } finally {
      setSavingTimeout(false);
    }
  }

  async function revokeSession(id: string) {
    setRevokingId(id);
    try {
      await adminRevokeSessionAction(id);
      await refresh();
    } finally {
      setRevokingId(null);
    }
  }

  async function revokeUserSessions(userId: string) {
    setRevokingId(userId);
    try {
      await adminRevokeAllUserSessionsAction(userId);
      await refresh();
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <>
      <section className="mnx-workspace-metrics" aria-label="Session summary">
        <WorkspaceMetric
          icon={<Wifi aria-hidden="true" />}
          label="Active now"
          value={active.length}
          detail="Seen in the last two minutes"
        />
        <WorkspaceMetric
          icon={<Users aria-hidden="true" />}
          label="Today"
          value={
            history.filter(
              (session) =>
                new Date(session.loginAt).getTime() > todayCutoffMs,
            ).length
          }
          detail="Sessions opened today"
        />
        <WorkspaceMetric
          icon={<Clock aria-hidden="true" />}
          label="Timed out"
          value={history.filter((session) => session.status === "TIMED_OUT").length}
          detail="Within retained history"
        />
        <WorkspaceMetric
          icon={<Shield aria-hidden="true" />}
          label="Timeout"
          value={`${timeoutMinutes}m`}
          detail="Current inactivity limit"
        />
      </section>

      <AdminPanel>
        <AdminPanelHeader
          eyebrow="Security policy"
          title="Inactivity timeout"
          description="Warnings appear during the final 20% of idle time, capped at two minutes. Changes apply after the next page load."
        />
        <div className="mnx-admin-panel-body mnx-admin-timeout-control">
          <AdminField label="Timeout in minutes">
            <AdminInput
              type="number"
              min={1}
              max={480}
              value={newTimeout}
              onChange={(event) => setNewTimeout(event.target.value)}
            />
          </AdminField>
          <AdminButton
            onClick={saveTimeout}
            disabled={savingTimeout}
            variant="primary"
          >
            {savingTimeout ? "Saving…" : timeoutSaved ? "Saved" : "Save"}
          </AdminButton>
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader
          eyebrow="Live activity"
          title="Currently active sessions"
          description={`${active.length} session${active.length === 1 ? "" : "s"} seen in the active window.`}
          actions={
            <AdminButton onClick={refresh} disabled={refreshing} size="compact">
              <RefreshCw
                className={refreshing ? "mnx-state-spinner" : undefined}
                aria-hidden="true"
              />
              Refresh
            </AdminButton>
          }
        />
        {active.length === 0 ? (
          <div className="mnx-empty-state">No active sessions</div>
        ) : (
          <div className="mnx-admin-record-list">
            {active.map((session) => (
              <article key={session.id} className="mnx-admin-session-record">
                <span className="mnx-admin-avatar" aria-hidden="true">
                  {session.userName.charAt(0).toUpperCase()}
                </span>
                <div className="mnx-admin-session-person">
                  <strong>{session.userName}</strong>
                  <small>{session.userEmail}</small>
                  <AdminBadge>{session.userRole}</AdminBadge>
                </div>
                <div className="mnx-admin-session-meta">
                  <span>
                    <Clock aria-hidden="true" />
                    Login: {formatTime(session.loginAt)}
                  </span>
                  <span>
                    <Wifi aria-hidden="true" />
                    Active{" "}
                    {formatDuration(
                      nowMs - new Date(session.loginAt).getTime(),
                    )}
                  </span>
                  {session.ipAddress ? (
                    <span>
                      <MapPin aria-hidden="true" />
                      {session.ipAddress}
                      {session.location ? ` · ${session.location}` : ""}
                    </span>
                  ) : null}
                </div>
                <div className="mnx-admin-record-actions">
                  <AdminButton
                    size="compact"
                    variant="destructive"
                    disabled={revokingId === session.id}
                    onClick={() => revokeSession(session.id)}
                  >
                    <LogOut aria-hidden="true" />
                    {revokingId === session.id ? "Revoking…" : "Force logout"}
                  </AdminButton>
                  <AdminButton
                    size="compact"
                    disabled={revokingId === session.userId}
                    onClick={() => revokeUserSessions(session.userId)}
                  >
                    All devices
                  </AdminButton>
                </div>
              </article>
            ))}
          </div>
        )}
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader
          eyebrow="Last 100"
          title="Session history"
          description="Retained sign-in, duration, outcome, and network context."
        />
        <AdminTable>
          <thead>
            <tr>
              <th>User</th>
              <th>Login</th>
              <th>Duration</th>
              <th>Status</th>
              <th>IP / location</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <AdminEmptyTableRow colSpan={5}>
                No session history
              </AdminEmptyTableRow>
            ) : (
              history.map((session) => (
                <tr key={session.id}>
                  <td>
                    <strong>{session.userName}</strong>
                    <small>{session.userEmail}</small>
                  </td>
                  <td>{formatTime(session.loginAt)}</td>
                  <td>
                    {formatDuration(
                      new Date(session.logoutAt ?? session.lastSeenAt).getTime() -
                        new Date(session.loginAt).getTime(),
                    )}
                  </td>
                  <td>
                    <AdminBadge variant={sessionVariant(session.status)}>
                      {session.status.replace("_", " ")}
                    </AdminBadge>
                  </td>
                  <td>
                    {session.ipAddress ?? "—"}
                    {session.location ? ` · ${session.location}` : ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AdminTable>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader
          eyebrow="Last 100"
          title="Security audit trail"
          description="Authentication and session-security outcomes with actor and network context."
        />
        <AdminTable>
          <thead>
            <tr>
              <th>When</th>
              <th>Event</th>
              <th>Outcome</th>
              <th>User</th>
              <th>IP</th>
              <th>User agent</th>
            </tr>
          </thead>
          <tbody>
            {securityEvents.length === 0 ? (
              <AdminEmptyTableRow colSpan={6}>
                No security events yet
              </AdminEmptyTableRow>
            ) : (
              securityEvents.map((event) => (
                <tr key={event.id}>
                  <td>{formatTime(event.createdAt)}</td>
                  <td>{formatEventLabel(event.event)}</td>
                  <td>
                    <AdminBadge
                      variant={event.outcome === "SUCCESS" ? "success" : "danger"}
                    >
                      {event.outcome}
                    </AdminBadge>
                  </td>
                  <td>
                    <strong>
                      {event.userName ?? event.email ?? "Unknown"}
                    </strong>
                    <small>
                      {event.userEmail ?? event.email ?? "No account matched"}
                    </small>
                  </td>
                  <td>{event.ipAddress ?? "N/A"}</td>
                  <td title={event.userAgent ?? ""}>
                    {event.userAgent ?? "N/A"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AdminTable>
      </AdminPanel>
    </>
  );
}
