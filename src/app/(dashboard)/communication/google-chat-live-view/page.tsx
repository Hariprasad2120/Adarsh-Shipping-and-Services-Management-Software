import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { GoogleChatLiveViewFrame } from "./_components/google-chat-live-view-frame";

export const metadata = {
  title: "Google Chat Live View — Experimental | Monolith",
  description:
    "Experimental: Test whether Google Chat can be accessed directly from inside Monolith Engine.",
};

/**
 * Google Chat Live View — server page component.
 *
 * - If the toggle is OFF → redirect back to /communication (tab is invisible).
 * - If the toggle is ON → load context data and render the frame.
 *
 * Does NOT modify, read from, or affect:
 * - /communication/chat (existing Chat tab)
 * - Chat sync jobs or SSE streams
 * - OAuth flow or token management
 * - Job-space provisioning pipelines
 */
export default async function GoogleChatLiveViewPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/communication");

  // ── 1. Check if feature is enabled ──────────────────────────────────────────
  const settings = await db.googleWorkspaceSetting.findUnique({
    where: { orgId },
    select: {
      enableGoogleChatLiveView: true,
      workspaceDomain: true,
    },
  });

  // Default OFF — redirect if not enabled
  if (!settings?.enableGoogleChatLiveView) {
    redirect("/communication");
  }

  // ── 2. Load Google Workspace connection ──────────────────────────────────────
  const connection = await db.googleWorkspaceConnection.findUnique({
    where: { userId: session.user.id },
    select: {
      googleEmail: true,
      status: true,
    },
  });

  const googleEmail = connection?.googleEmail ?? "Not connected";
  const oauthStatus =
    connection?.status === "connected"
      ? "connected"
      : connection
      ? "expired"
      : "none";

  // ── 3. Admin / permission check ──────────────────────────────────────────────
  const isAdmin =
    session.user.isPlatformAdmin ||
    (await can(session.user.id, "communication.settings"));

  // ── 4. Job context (optional) ────────────────────────────────────────────────
  const resolvedParams = await searchParams;
  const jobId = resolvedParams?.jobId;

  let jobContext: {
    jobNumber: string;
    jobLabel: string;
    googleSpaceUrl: string | null;
    canRetryProvisioning: boolean;
  } | null = null;

  if (jobId) {
    try {
      const job = await db.chaJob.findUnique({
        where: { id: jobId, orgId },
        select: {
          jobNumber: true,
          title: true,
          customer: {
            select: { name: true },
          },
          workspaceProfile: {
            select: {
              googleSpaceUrl: true,
              provisioningStatus: true,
            },
          },
        },
      });

      if (job) {
        const customerName = job.customer?.name ?? "—";
        const jobLabel = `JOB-${job.jobNumber} | ${customerName}`;
        const googleSpaceUrl = job.workspaceProfile?.googleSpaceUrl ?? null;
        const provisioningStatus = job.workspaceProfile?.provisioningStatus ?? null;

        jobContext = {
          jobNumber: `JOB-${job.jobNumber}`,
          jobLabel,
          googleSpaceUrl,
          canRetryProvisioning:
            isAdmin && (!provisioningStatus || provisioningStatus === "failed"),
        };
      }
    } catch {
      // Non-fatal: job context is optional
    }
  }

  const workspaceDomain = settings.workspaceDomain ?? "adarshshipping.in";

  // Default embed URLs — can be made configurable via settings later
  const embedUrls = [
    "https://mail.google.com/chat/u/0/",
    "https://chat.google.com/",
  ];

  return (
    <main className="space-y-6 pb-12">
      <GoogleChatLiveViewFrame
        googleEmail={googleEmail}
        workspaceDomain={workspaceDomain}
        isAdmin={isAdmin}
        oauthStatus={oauthStatus}
        embedUrls={embedUrls}
        jobContext={jobContext}
      />
    </main>
  );
}
