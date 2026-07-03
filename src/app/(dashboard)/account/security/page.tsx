import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/auth";
import { listActiveSessions } from "@/lib/session-service";
import {
  SESSION_ABSOLUTE_TIMEOUT_HOURS,
  SESSION_IDLE_TIMEOUT_MINUTES,
} from "@/lib/session-config";
import { SecuritySessionsClient } from "./sessions-client";

export const metadata = {
  title: "Security & Sessions | Adarsh Shipping",
};

export const dynamic = "force-dynamic";

export default async function AccountSecurityPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const sessions = await listActiveSessions(session.user.id);

  const rows = sessions.map((s) => ({
    id: s.id,
    isCurrent: s.token === session.user.sessionNonce,
    device: s.device ?? "Unknown device",
    ipAddress: s.ipAddress ?? "—",
    loginAt: s.loginAt.toISOString(),
    lastSeenAt: s.lastSeenAt.toISOString(),
    expiresAt: s.expiresAt?.toISOString() ?? null,
    rememberMe: s.rememberMe,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="ds-icon-badge">
          <ShieldCheck size={18} />
        </span>
        <div>
          <h1 className="ds-h1">Security &amp; Sessions</h1>
          <p className="text-sm text-on-surface-variant">
            Devices currently signed in to your account. Idle sessions expire
            after {SESSION_IDLE_TIMEOUT_MINUTES} minutes; all sessions expire
            after {SESSION_ABSOLUTE_TIMEOUT_HOURS} hours.
          </p>
        </div>
      </div>

      <SecuritySessionsClient sessions={rows} />
    </div>
  );
}
