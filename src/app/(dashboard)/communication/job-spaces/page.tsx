import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { provisionJobWorkspace } from "@/lib/workspace-provisioning";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ExternalLink, RefreshCw, AlertCircle, CheckCircle2, MessageSquare, Folder } from "lucide-react";

export default async function JobSpacesDashboard() {
  const session = await auth();
  if (!session?.user) return null;

  const orgId = session.user.orgId!;

  // Fetch all jobs in the organization with their workspace profiles
  const jobs = await db.chaJob.findMany({
    where: { orgId },
    include: {
      customer: true,
      jobType: true,
      workspaceProfile: true
    },
    orderBy: {
      jobNumber: "desc"
    }
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
      </div>

      {/* Jobs Workspaces Table */}
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
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-xs text-on-surface-variant">
                    No jobs found in the system.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const wp = job.workspaceProfile;
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
                        {!isSuccess && (
                          <form action={handleRetryAction}>
                            <input type="hidden" name="jobId" value={job.id} />
                            <button
                              type="submit"
                              className="inline-flex items-center space-x-1 text-xs text-[#00cec4] hover:underline font-bold uppercase"
                            >
                              <RefreshCw className="size-3" />
                              <span>Retry</span>
                            </button>
                          </form>
                        )}
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
