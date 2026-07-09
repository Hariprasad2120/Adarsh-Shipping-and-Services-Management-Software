import { auth } from "@/lib/auth";
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
import { ExternalLink, RefreshCw, AlertCircle, CheckCircle2, MessageSquare, Folder } from "lucide-react";

export default async function JobSpacesDashboard() {
  const session = await auth();
  if (!session?.user) return null;

  const orgId = session.user.orgId!;
  const canRetryChatCleanup = await can(session.user.id, "cha.job.delete.approve");
  const hasChatCleanupColumns = await hasJobWorkspaceChatCleanupColumns();
  const workspaceProfileSelect = await getJobWorkspaceProfileSelect();

  // Fetch all jobs in the organization with their workspace profiles
  const allJobs = await db.chaJob.findMany({
    where: { orgId },
    select: {
      id: true,
      jobNumber: true,
      deletedAt: true,
      customer: true,
      jobType: true,
      workspaceProfile: {
        select: workspaceProfileSelect,
      },
    },
    orderBy: {
      jobNumber: "desc"
    }
  });
  const activeJobs = allJobs.filter((job) => !job.deletedAt);
  const deletedCleanupJobs = allJobs.filter((job) => {
    const wp = normalizeJobWorkspaceProfile(job.workspaceProfile);
    if (!job.deletedAt || !wp) return false;
    return Boolean(wp.googleSpaceId || wp.rootFolderId || wp.provisioningStatus !== "success");
  });

  // Server Action to retry provisioning
  async function handleRetryAction(formData: FormData) {
    "use server";
    const jobId = formData.get("jobId") as string;
    if (!jobId) return;

    try {
      await provisionJobWorkspace(jobId);
    } catch (err) {
      console.error(`[JobSpaces] Retry failed for job ${jobId}:`, err);
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
    <main className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-6 rounded-2xl border border-outline-variant bg-surface shadow-sm text-left">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#00cec4]">Workspace Provisioner</span>
          <h1 className="text-xl font-bold text-on-surface mt-1">Job Workspaces</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Monitor and manage automatically provisioned Google Chat spaces and Drive folder structures for shipping operations.
          </p>
        </div>
        <div className="mt-4 flex gap-3 md:mt-0">
          <div className="card-top-accent rounded-xl border border-outline-variant/60 bg-surface-container-low px-4 py-3 text-left">
            <div className="ds-label">Active Jobs</div>
            <div className="mt-1 text-lg text-on-surface ds-numeric">{activeJobs.length}</div>
          </div>
          <div className="card-top-accent-orange rounded-xl border border-outline-variant/60 bg-surface-container-low px-4 py-3 text-left">
            <div className="ds-label">Deleted Cleanup</div>
            <div className="mt-1 text-lg text-on-surface ds-numeric">{deletedCleanupJobs.length}</div>
          </div>
        </div>
      </div>

      {/* Active Jobs Table */}
      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
        <div className="overflow-x-auto text-left">
          <table className="ds-table">
            <thead>
              <tr>
                <th className="px-6 py-3">Job Number</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Job Type</th>
                <th className="px-6 py-3">Chat Space</th>
                <th className="px-6 py-3">Drive Folder</th>
                <th className="px-6 py-3">Provisioning Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-xs text-on-surface-variant">
                    No active jobs currently need workspace monitoring.
                  </td>
                </tr>
              ) : (
                activeJobs.map((job) => {
                  const wp = normalizeJobWorkspaceProfile(job.workspaceProfile);
                  const isSuccess = wp?.provisioningStatus === "success";
                  const isFailed = wp?.provisioningStatus === "failed";

                  return (
                    <tr key={job.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-on-surface font-mono ds-numeric">
                        {job.jobNumber}
                      </td>
                      <td className="px-6 py-4 text-xs text-on-surface truncate max-w-[200px]">
                        {job.customer.name}
                      </td>
                      <td className="px-6 py-4 text-xs text-on-surface-variant font-medium">
                        {job.jobType.name}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {isSuccess && wp.googleSpaceUrl ? (
                          wp.googleSpaceId?.includes("mock") ? (
                            <Link
                              href={`/communication/chat?spaceId=${wp.googleSpaceId}`}
                              className="inline-flex items-center space-x-1 text-[#00cec4] hover:underline font-semibold"
                            >
                              <MessageSquare className="size-3.5" />
                              <span>Open Chat (Sim)</span>
                            </Link>
                          ) : (
                            <a
                              href={wp.googleSpaceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-[#00cec4] hover:underline font-semibold"
                            >
                              <MessageSquare className="size-3.5" />
                              <span>Open Chat</span>
                              <ExternalLink className="size-3" />
                            </a>
                          )
                        ) : (
                          <span className="text-[10px] text-on-surface-variant italic">Unprovisioned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {isSuccess && wp.rootFolderId ? (
                          wp.rootFolderId.startsWith("mock-") ? (
                            <Link
                              href={`/communication/drive?jobId=${job.id}`}
                              className="inline-flex items-center space-x-1 text-[#fb923c] hover:underline font-semibold"
                            >
                              <Folder className="size-3.5" />
                              <span>Open Drive (Sim)</span>
                            </Link>
                          ) : (
                            <a
                              href={`https://drive.google.com/drive/folders/${wp.rootFolderId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-[#fb923c] hover:underline font-semibold"
                            >
                              <Folder className="size-3.5" />
                              <span>Open Drive</span>
                              <ExternalLink className="size-3" />
                            </a>
                          )
                        ) : (
                          <span className="text-[10px] text-on-surface-variant italic">Unprovisioned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div className="flex items-center space-x-1.5">
                          {isSuccess ? (
                            <>
                              <CheckCircle2 className="size-4 text-[#00cec4]" />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#00cec4]">Success</span>
                            </>
                          ) : isFailed ? (
                            <>
                              <AlertCircle className="size-4 text-[#ef4444]" />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#ef4444] cursor-help" title={wp.lastError || "Unknown error"}>Failed</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw className="size-4 text-on-surface-variant animate-spin" />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Pending</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-right">
                        <div className="flex flex-col items-end gap-2">
                          {(!isSuccess || (isSuccess && !wp?.googleSpaceId)) ? (
                            <form action={handleRetryAction}>
                              <input type="hidden" name="jobId" value={job.id} />
                              <button
                                type="submit"
                                className="inline-flex items-center space-x-1 text-xs text-[#00cec4] hover:underline font-bold uppercase"
                              >
                                <RefreshCw className="size-3" />
                                <span>{isSuccess && !wp?.googleSpaceId ? "Provision Chat" : "Retry"}</span>
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
        <div className="border-b border-outline-variant/60 bg-surface-container-low px-6 py-4">
          <h2 className="ds-h3 text-on-surface">Deleted Jobs Pending External Cleanup</h2>
          <p className="mt-1 text-xs text-on-surface-variant">
            Deleted jobs are hidden from the active workspace list. Only rows with lingering Chat or Drive resources stay here for cleanup.
          </p>
        </div>
        <div className="overflow-x-auto text-left">
          <table className="ds-table">
            <thead>
              <tr>
                <th className="px-6 py-3">Job Number</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Chat Space</th>
                <th className="px-6 py-3">Drive Folder</th>
                <th className="px-6 py-3">Cleanup Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deletedCleanupJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-on-surface-variant">
                    No deleted jobs are holding onto Chat spaces or Drive folders.
                  </td>
                </tr>
              ) : (
                deletedCleanupJobs.map((job) => {
                  const wp = normalizeJobWorkspaceProfile(job.workspaceProfile);
                  const hasStoredChatSpace = !!wp?.googleSpaceId;
                  const hasStoredDriveFolder = !!wp?.rootFolderId;
                  const chatCleanupFailed =
                    hasChatCleanupColumns && wp?.chatSpaceDeleteStatus === "FAILED";
                  const hasRetryableChatCleanup =
                    canRetryChatCleanup &&
                    hasStoredChatSpace &&
                    (!hasChatCleanupColumns || chatCleanupFailed || wp?.chatSpaceDeleteStatus !== "SUCCESS");

                  return (
                    <tr key={job.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-on-surface font-mono ds-numeric">
                        <div className="space-y-1">
                          <div>{job.jobNumber}</div>
                          <span className="ds-label text-[#fb923c]">Deleted Job</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-on-surface truncate max-w-[200px]">
                        {job.customer.name}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {hasStoredChatSpace && wp?.googleSpaceUrl ? (
                          <a
                            href={wp.googleSpaceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-[#00cec4] hover:underline font-semibold"
                          >
                            <MessageSquare className="size-3.5" />
                            <span>Open Chat</span>
                            <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          <span className="text-[10px] italic text-on-surface-variant">Already removed</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {hasStoredDriveFolder ? (
                          <a
                            href={`https://drive.google.com/drive/folders/${wp.rootFolderId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-[#fb923c] hover:underline font-semibold"
                          >
                            <Folder className="size-3.5" />
                            <span>Open Drive</span>
                            <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          <span className="text-[10px] italic text-on-surface-variant">Already removed</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {hasStoredChatSpace || hasStoredDriveFolder ? (
                          <div className="rounded-xl border border-[#fb923c]/35 bg-surface-container-low px-3 py-2">
                            <div className="ds-label text-[#fb923c]">Cleanup Pending</div>
                            <p className="mt-1 text-[11px] text-on-surface-variant">
                              {chatCleanupFailed
                                ? (wp?.chatSpaceDeleteError || "Chat cleanup failed and needs retry.")
                                : hasStoredChatSpace
                                  ? "Linked Chat space still exists for this deleted job."
                                  : "Drive cleanup still needs review for this deleted job."}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[10px] italic text-on-surface-variant">No remaining external data</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-xs">
                        <div className="flex flex-col items-end gap-2">
                          {hasRetryableChatCleanup ? (
                            <form action={handleRetryChatCleanupAction}>
                              <input type="hidden" name="jobId" value={job.id} />
                              <button
                                type="submit"
                                className="inline-flex items-center space-x-1 text-xs text-[#fb923c] hover:underline font-bold uppercase"
                              >
                                <RefreshCw className="size-3" />
                                <span>{hasChatCleanupColumns ? "Retry Chat Cleanup" : "Delete Chat Space"}</span>
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
