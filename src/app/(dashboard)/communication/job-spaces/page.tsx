import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getJobWorkspaceProfileSelect,
  hasJobWorkspaceChatCleanupColumns,
  normalizeJobWorkspaceProfile,
} from "@/lib/job-workspace-profile";
import { can } from "@/lib/rbac";
import { provisionJobWorkspace } from "@/lib/workspace-provisioning";
import { retryJobChatCleanupAction } from "@/modules/cha/actions";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import {
  ExternalLink,
  Folder,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { CommunicationBadge, CommunicationButton, CommunicationEmptyTableRow, CommunicationInput, CommunicationPanel, CommunicationPanelHeader, CommunicationTable } from "@/modules/communication/components/workspace/communication-workspace";
import { WorkspaceMetric } from "@/components/layout/workspace";

function statusVariant(status?: string | null) {
  if (status === "success") return "success" as const;
  if (status === "failed") return "danger" as const;
  return "warning" as const;
}

export default async function JobSpacesDashboard() {
  const session = await getSession();
  if (!session?.user) return null;

  const orgId = session.user.orgId!;
  const [canRetryChatCleanup, hasChatCleanupColumns, workspaceProfileSelect] =
    await Promise.all([
      can(session.user.id, "cha.job.delete.approve"),
      hasJobWorkspaceChatCleanupColumns(),
      getJobWorkspaceProfileSelect(),
    ]);

  const allJobs = await db.chaJob.findMany({
    where: { orgId },
    select: {
      id: true,
      jobNumber: true,
      deletedAt: true,
      customer: true,
      jobType: true,
      workspaceProfile: { select: workspaceProfileSelect },
    },
    orderBy: { jobNumber: "desc" },
  });
  const activeJobs = allJobs.filter((job) => !job.deletedAt);
  const deletedCleanupJobs = allJobs.filter((job) => {
    const workspace = normalizeJobWorkspaceProfile(job.workspaceProfile);
    if (!job.deletedAt || !workspace) return false;
    return Boolean(
      workspace.googleSpaceId ||
        workspace.rootFolderId ||
        workspace.provisioningStatus !== "success",
    );
  });

  async function handleRetryAction(formData: FormData) {
    "use server";
    const jobId = formData.get("jobId") as string;
    if (!jobId) return;
    try {
      await provisionJobWorkspace(jobId);
    } catch (error) {
      console.error(`[JobSpaces] Retry failed for job ${jobId}:`, error);
    }
    revalidatePath("/communication/job-spaces");
  }

  async function handleRetryChatCleanupAction(formData: FormData) {
    "use server";
    const jobId = formData.get("jobId") as string;
    if (!jobId) return;
    await retryJobChatCleanupAction(jobId);
  }

  return (
    <>
      <section className="mnx-workspace-metrics" aria-label="Job space summary">
        <WorkspaceMetric
          icon={<MessageSquare aria-hidden="true" />}
          label="Active jobs"
          value={activeJobs.length}
          detail="Visible operational workspaces"
        />
        <WorkspaceMetric
          icon={<Folder aria-hidden="true" />}
          label="Deleted cleanup"
          value={deletedCleanupJobs.length}
          detail="External resources still retained"
        />
      </section>

      <CommunicationPanel>
        <CommunicationPanelHeader
          eyebrow="Provisioning register"
          title="Active job workspaces"
          description="Monitor Google Chat and Drive provisioning for each active shipping job. Retry incomplete workspaces without changing the underlying CHA job."
        />
        <CommunicationTable>
          <thead>
            <tr>
              <th>Job</th>
              <th>Customer</th>
              <th>Type</th>
              <th>Chat space</th>
              <th>Drive folder</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {activeJobs.length === 0 ? (
              <CommunicationEmptyTableRow colSpan={7}>
                No active jobs currently need workspace monitoring.
              </CommunicationEmptyTableRow>
            ) : (
              activeJobs.map((job) => {
                const workspace = normalizeJobWorkspaceProfile(
                  job.workspaceProfile,
                );
                const isSuccess =
                  workspace?.provisioningStatus === "success";

                return (
                  <tr key={job.id}>
                    <td>
                      <strong>{job.jobNumber}</strong>
                    </td>
                    <td>{job.customer.name}</td>
                    <td>{job.jobType.name}</td>
                    <td>
                      {isSuccess && workspace.googleSpaceUrl ? (
                        workspace.googleSpaceId?.includes("mock") ? (
                          <Link
                            href={`/communication/chat?spaceId=${workspace.googleSpaceId}`}
                            className="mnx-communication-record-link"
                          >
                            <MessageSquare aria-hidden="true" />
                            Open simulated chat
                          </Link>
                        ) : (
                          <a
                            href={workspace.googleSpaceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mnx-communication-record-link"
                          >
                            <MessageSquare aria-hidden="true" />
                            Open chat
                            <ExternalLink aria-hidden="true" />
                          </a>
                        )
                      ) : (
                        "Unprovisioned"
                      )}
                    </td>
                    <td>
                      {isSuccess && workspace.rootFolderId ? (
                        workspace.rootFolderId.startsWith("mock-") ? (
                          <Link
                            href={`/communication/drive?jobId=${job.id}`}
                            className="mnx-communication-record-link"
                          >
                            <Folder aria-hidden="true" />
                            Open simulated Drive
                          </Link>
                        ) : (
                          <a
                            href={`https://drive.google.com/drive/folders/${workspace.rootFolderId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mnx-communication-record-link"
                          >
                            <Folder aria-hidden="true" />
                            Open Drive
                            <ExternalLink aria-hidden="true" />
                          </a>
                        )
                      ) : (
                        "Unprovisioned"
                      )}
                    </td>
                    <td>
                      <CommunicationBadge
                        variant={statusVariant(workspace?.provisioningStatus)}
                        title={workspace?.lastError ?? undefined}
                      >
                        {workspace?.provisioningStatus ?? "pending"}
                      </CommunicationBadge>
                    </td>
                    <td>
                      {!isSuccess || !workspace?.googleSpaceId ? (
                        <form action={handleRetryAction}>
                          <CommunicationInput
                            type="hidden"
                            name="jobId"
                            value={job.id}
                          />
                          <CommunicationButton type="submit" size="compact">
                            <RefreshCw aria-hidden="true" />
                            {isSuccess ? "Provision chat" : "Retry"}
                          </CommunicationButton>
                        </form>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </CommunicationTable>
      </CommunicationPanel>

      <CommunicationPanel>
        <CommunicationPanelHeader
          eyebrow="External cleanup"
          title="Deleted-job cleanup"
          description="Deleted jobs with lingering external Chat or Drive resources. Retry permission-gated Chat cleanup while retaining the deleted job audit trail."
        />
        <CommunicationTable>
          <thead>
            <tr>
              <th>Job</th>
              <th>Customer</th>
              <th>Chat space</th>
              <th>Drive folder</th>
              <th>Cleanup status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {deletedCleanupJobs.length === 0 ? (
              <CommunicationEmptyTableRow colSpan={6}>
                No deleted jobs are holding Chat spaces or Drive folders.
              </CommunicationEmptyTableRow>
            ) : (
              deletedCleanupJobs.map((job) => {
                const workspace = normalizeJobWorkspaceProfile(
                  job.workspaceProfile,
                );
                const hasChat = Boolean(workspace?.googleSpaceId);
                const hasDrive = Boolean(workspace?.rootFolderId);
                const chatCleanupFailed =
                  hasChatCleanupColumns &&
                  workspace?.chatSpaceDeleteStatus === "FAILED";
                const canRetry =
                  canRetryChatCleanup &&
                  hasChat &&
                  (!hasChatCleanupColumns ||
                    chatCleanupFailed ||
                    workspace?.chatSpaceDeleteStatus !== "SUCCESS");

                return (
                  <tr key={job.id}>
                    <td>
                      <strong>{job.jobNumber}</strong>
                      <CommunicationBadge variant="warning">
                        Deleted
                      </CommunicationBadge>
                    </td>
                    <td>{job.customer.name}</td>
                    <td>
                      {hasChat && workspace?.googleSpaceUrl ? (
                        <a
                          href={workspace.googleSpaceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mnx-communication-record-link"
                        >
                          Open Chat
                          <ExternalLink aria-hidden="true" />
                        </a>
                      ) : (
                        "Already removed"
                      )}
                    </td>
                    <td>
                      {hasDrive ? (
                        <a
                          href={`https://drive.google.com/drive/folders/${workspace?.rootFolderId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mnx-communication-record-link"
                        >
                          Open Drive
                          <ExternalLink aria-hidden="true" />
                        </a>
                      ) : (
                        "Already removed"
                      )}
                    </td>
                    <td>
                      <CommunicationBadge
                        variant={hasChat || hasDrive ? "warning" : "success"}
                        title={workspace?.chatSpaceDeleteError ?? undefined}
                      >
                        {chatCleanupFailed
                          ? "Cleanup failed"
                          : hasChat || hasDrive
                            ? "Cleanup pending"
                            : "Complete"}
                      </CommunicationBadge>
                    </td>
                    <td>
                      {canRetry ? (
                        <form action={handleRetryChatCleanupAction}>
                          <CommunicationInput
                            type="hidden"
                            name="jobId"
                            value={job.id}
                          />
                          <CommunicationButton type="submit" size="compact">
                            <RefreshCw aria-hidden="true" />
                            {hasChatCleanupColumns
                              ? "Retry chat cleanup"
                              : "Delete chat space"}
                          </CommunicationButton>
                        </form>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </CommunicationTable>
      </CommunicationPanel>
    </>
  );
}
