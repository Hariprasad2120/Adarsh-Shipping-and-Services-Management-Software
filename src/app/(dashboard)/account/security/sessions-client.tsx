"use client";

import { useState, useTransition } from "react";
import { LogOut, MonitorSmartphone } from "lucide-react";
import {revokeAllOtherSessionsAction,revokeMySessionAction,} from "./actions";

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

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SecuritySessionsClient({ sessions }: { sessions: SessionRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const otherCount = sessions.filter((s) => !s.isCurrent).length;

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="ds-h3">Active Sessions</h2>
        <button
          type="button"
          onClick={revokeOthers}
          disabled={isPending || otherCount === 0}
          className="flex items-center gap-2 rounded-xl bg-[#00cec4] px-4 py-2 text-sm uppercase tracking-wide text-white transition-all hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut size={14} />
          Logout from all other devices
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="ds-table">
            <thead>
              <tr>
                <th>Device</th>
                <th>IP</th>
                <th>Signed In</th>
                <th>Last Activity</th>
                <th>Expires</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">
                    <span className="flex items-center gap-2">
                      <MonitorSmartphone
                        size={15}
                        className="shrink-0 text-[#00cec4]"
                      />
                      {s.device}
                      {s.isCurrent ? (
                        <span className="rounded-full bg-[#00cec4]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#00cec4]">
                          This device
                        </span>
                      ) : null}
                      {s.rememberMe ? (
                        <span className="ds-label">Remembered</span>
                      ) : null}
                    </span>
                  </td>
                  <td className="ds-numeric">{s.ipAddress}</td>
                  <td>{formatTime(s.loginAt)}</td>
                  <td>{formatTime(s.lastSeenAt)}</td>
                  <td>{formatTime(s.expiresAt)}</td>
                  <td className="text-right">
                    {s.isCurrent ? (
                      <span className="text-xs text-on-surface-variant">
                        Use logout
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => revokeOne(s.id)}
                        disabled={isPending}
                        className="cursor-pointer rounded-lg border border-red-500/30 px-3 py-1 text-xs uppercase tracking-wide text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-on-surface-variant">
                    No active sessions.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
