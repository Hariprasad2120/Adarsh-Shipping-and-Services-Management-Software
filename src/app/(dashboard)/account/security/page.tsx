import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { WorkspacePage, WorkspacePageHeader } from "@/components/layout/workspace";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { listActiveSessions } from "@/lib/session-service";
import {
  SESSION_ABSOLUTE_TIMEOUT_HOURS,
  SESSION_IDLE_TIMEOUT_MINUTES,
} from "@/lib/session-config";
import { SecuritySessionsClient } from "./sessions-client";
import { SecurityCenterClient } from "./security-center-client";
import { getSecurityOverview } from "./mfa-actions";

export const metadata = {
  title: "Security & Sessions | Adarsh Shipping",
};

export const dynamic = "force-dynamic";

export default async function AccountSecurityPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [sessions, overview, user, googleLink] = await Promise.all([
    listActiveSessions(session.user.id),
    getSecurityOverview(),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    }),
    db.identityLink.findFirst({
      where: { userId: session.user.id, provider: "google" },
      select: { id: true },
    }),
  ]);

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
      <SecurityCenterClient
        overview={overview}
        hasGoogleIdentity={Boolean(googleLink)}
        passwordIsLocal={Boolean(user?.passwordHash?.startsWith("$2"))}
      />
      <SecuritySessionsClient sessions={rows} />
    </WorkspacePage>
  );
}
