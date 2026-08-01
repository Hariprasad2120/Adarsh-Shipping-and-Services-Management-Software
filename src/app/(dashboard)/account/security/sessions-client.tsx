"use client";

import { useState, useTransition } from "react";
import {
  CircleAlert,
  Laptop,
  LogOut,
  MonitorSmartphone,
  ShieldCheck,
} from "lucide-react";
import { WorkspaceAction, WorkspaceAlert, WorkspaceBadge, WorkspaceEmptyTableRow, WorkspacePanel, WorkspacePanelHeader, WorkspaceTable } from "@/components/layout/workspace";
import {
  revokeAllOtherSessionsAction,
  revokeMySessionAction,
} from "./actions";

type SessionRow = {
  id: string;
  isCurrent: boolean;
  device: string;
  ipAddress: string;
  loginAt: string;
  lastSeenAt: string;
  expiresAt: string | null;
  rememberMe: boolean;
};

const sessionTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return sessionTimeFormatter.format(new Date(iso));
}

export function SecuritySessionsClient({ sessions }: { sessions: SessionRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const otherCount = sessions.filter((session) => !session.isCurrent).length;

  const revokeOne = (id: string) => {
    setError("");
    startTransition(async () => {
      const result = await revokeMySessionAction(id);
      if (!result.ok) setError(result.error);
    });
  };

  const revokeOthers = () => {
    setError("");
    startTransition(async () => {
      const result = await revokeAllOtherSessionsAction();
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <WorkspacePanel className="mnx-table-card">
      {error ? (
        <div className="mnx-panel-alert">
          <WorkspaceAlert variant="danger">
            <CircleAlert size={17} aria-hidden="true" />
            <span>{error}</span>
          </WorkspaceAlert>
        </div>
      ) : null}

      <WorkspacePanelHeader
        eyebrow="Signed-in devices"
        title="Active sessions"
        description={`${sessions.length} active ${
          sessions.length === 1 ? "session" : "sessions"
        } · ${otherCount} on other devices`}
        actions={
          <WorkspaceAction
            onClick={revokeOthers}
            disabled={isPending || otherCount === 0}
          >
            {isPending ? (
              <span className="mnx-button-spinner" aria-hidden="true" />
            ) : (
              <LogOut size={15} aria-hidden="true" />
            )}
            Log out other devices
          </WorkspaceAction>
        }
      />

      <WorkspaceTable aria-label="Active account sessions">
        <thead>
          <tr>
            <th>Device</th>
            <th>IP address</th>
            <th>Signed in</th>
            <th>Last activity</th>
            <th>Expires</th>
            <th>
              <span className="mnx-visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.id}>
              <td>
                <span className="mnx-table-identity">
                  <span className="mnx-table-leading-icon">
                    <MonitorSmartphone size={16} aria-hidden="true" />
                  </span>
                  <span>
                    <b>{session.device}</b>
                    <span className="mnx-table-badges">
                      {session.isCurrent ? (
                        <WorkspaceBadge variant="accent">
                          <i aria-hidden="true" />
                          This device
                        </WorkspaceBadge>
                      ) : null}
                      {session.rememberMe ? (
                        <WorkspaceBadge variant="neutral">
                          Remembered
                        </WorkspaceBadge>
                      ) : null}
                    </span>
                  </span>
                </span>
              </td>
              <td>
                <span className="mnx-data-mono">{session.ipAddress}</span>
              </td>
              <td>{formatTime(session.loginAt)}</td>
              <td>{formatTime(session.lastSeenAt)}</td>
              <td>{formatTime(session.expiresAt)}</td>
              <td>
                <span className="mnx-table-cell-actions">
                  {session.isCurrent ? (
                    <WorkspaceBadge variant="success">
                      <ShieldCheck size={12} aria-hidden="true" />
                      Current
                    </WorkspaceBadge>
                  ) : (
                    <WorkspaceAction
                      variant="destructive"
                      size="compact"
                      onClick={() => revokeOne(session.id)}
                      disabled={isPending}
                      aria-label={`Revoke session for ${session.device}`}
                    >
                      Revoke
                    </WorkspaceAction>
                  )}
                </span>
              </td>
            </tr>
          ))}
          {sessions.length === 0 ? (
            <WorkspaceEmptyTableRow colSpan={6}>
              <Laptop size={24} aria-hidden="true" />
              <h3>No active sessions</h3>
              <p>Your signed-in devices will appear here.</p>
            </WorkspaceEmptyTableRow>
          ) : null}
        </tbody>
      </WorkspaceTable>
    </WorkspacePanel>
  );
}
