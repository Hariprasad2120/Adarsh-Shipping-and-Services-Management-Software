import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { WorkspacePage, WorkspacePageHeader } from "@/components/layout/workspace";
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
    <WorkspacePage>
      <WorkspacePageHeader
        eyebrow="Account protection"
        title="Security & Sessions"
        icon={<ShieldCheck size={21} aria-hidden="true" />}
        description={
          <>
            Review devices currently signed in to your account. Idle sessions
            expire after {SESSION_IDLE_TIMEOUT_MINUTES} minutes; every session
            expires after {SESSION_ABSOLUTE_TIMEOUT_HOURS} hours.
          </>
        }
      />
      <SecuritySessionsClient sessions={rows} />
    </WorkspacePage>
  );
}
