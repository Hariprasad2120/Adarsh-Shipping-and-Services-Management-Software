import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listFiles } from "@/lib/google-drive-client";
import { Folder, File, ExternalLink, ArrowLeft, RefreshCw, AlertCircle, HardDrive } from "lucide-react";
import Link from "next/link";
import JobSelector from "./JobSelector";
import SyncDriveButton from "./SyncDriveButton";

type SearchParams = Promise<{
  jobId?: string;
  folderId?: string;
}>;

export default async function JobDrivePortal(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;
  const session = await auth();
  if (!session?.user) return null;

  const orgId = session.user.orgId!;
  
  // 1. Fetch active jobs (both successfully provisioned and pending/mock/failed workspaces)
  const jobs = await db.chaJob.findMany({
    where: {
      orgId
    },
    include: {
      workspaceProfile: true
    },
    orderBy: {
      jobNumber: "desc"
    }
  });

  const selectedJobId = searchParams.jobId || "";
  const selectedFolderId = searchParams.folderId || "";

  const currentJob = jobs.find((j) => j.id === selectedJobId);
  const wp = currentJob?.workspaceProfile;

  const isRealFolderCreated = wp && wp.provisioningStatus === "success" && wp.rootFolderId && !wp.rootFolderId.startsWith("mock-");

  let filesList: any[] = [];
  let isAtRoot = !selectedFolderId;
  let currentFolderName = "Root Workspace";

  if (currentJob && wp && isRealFolderCreated) {
    if (selectedFolderId) {
      try {
        filesList = await listFiles(selectedFolderId);
        
        // Find folder name if it's one of the categories
        const categoryFolders = (wp.categoryFolders as Record<string, string>) || {};
        const match = Object.entries(categoryFolders).find(([_, id]) => id === selectedFolderId);
        currentFolderName = match ? match[0] : "Files List";
      } catch (err) {
        console.error("[JobDrivePortal] Error loading files:", err);
      }
    }
  }

  // Map jobs to clean serializable format for client component
  const serializableJobs = jobs.map((j) => ({
    id: j.id,
    jobNumber: j.jobNumber,
    title: j.title
  }));

  return (
    <main className="space-y-6 text-left">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-6 rounded-2xl border border-outline-variant bg-surface shadow-sm gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#00cec4]">Document Management</span>
          <h1 className="text-xl font-bold text-on-surface mt-1">Shared Job Drive</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Browse and inspect active shipping documents stored securely on Google Shared Drive.
          </p>
        </div>

        {/* Job selector dropdown */}
        <div className="w-full md:max-w-xs">
          <label className="ds-label block mb-1">Select Job Workspace</label>
          <JobSelector jobs={serializableJobs} selectedJobId={selectedJobId} />
        </div>
      </div>

      {currentJob ? (
        isRealFolderCreated ? (
          <div className="rounded-xl border border-outline-variant bg-surface shadow-sm overflow-hidden animate-page-enter">
            {/* File path navigation bar */}
            <div className="p-4 border-b border-outline-variant bg-surface-container-low flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-on-surface uppercase tracking-wide">
                  Job Workspace: {currentJob.jobNumber}
                </span>
                <span className="text-on-surface-variant/40">/</span>
                <span className="text-xs font-semibold text-on-surface-variant uppercase">
                  {currentFolderName}
                </span>
              </div>

              {!isAtRoot && (
                <Link
                  href={`/communication/drive?jobId=${selectedJobId}`}
                  className="inline-flex items-center space-x-1 text-xs text-[#00cec4] hover:underline font-bold uppercase"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Folders</span>
                </Link>
              )}
            </div>

            <div className="p-6">
              {isAtRoot ? (
                /* Root folders: List Category subfolders */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {wp.categoryFolders &&
                    Object.entries(wp.categoryFolders as Record<string, string>).map(
                      ([catName, folderId]) => (
                        <Link
                          key={catName}
                          href={`/communication/drive?jobId=${selectedJobId}&folderId=${folderId}`}
                          className="flex items-center space-x-3 p-4 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container transition-colors"
                        >
                          <span className="text-[#fb923c] shrink-0 font-bold text-lg">📁</span>
                          <div className="truncate">
                            <span className="text-xs font-bold text-on-surface block truncate">
                              {catName.substring(3)}
                            </span>
                            <span className="text-[9px] text-on-surface-variant block">
                              Code: {catName.substring(0, 2)}
                            </span>
                          </div>
                        </Link>
                      )
                    )}
                </div>
              ) : (
                /* Subfolder contents: List files */
                <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface">
                  <table className="ds-table">
                    <thead>
                      <tr>
                        <th className="px-6 py-2.5">Name</th>
                        <th className="px-6 py-2.5">Mime Type</th>
                        <th className="px-6 py-2.5">Size</th>
                        <th className="px-6 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filesList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-xs text-on-surface-variant">
                            No files found in this folder.
                          </td>
                        </tr>
                      ) : (
                        filesList.map((file) => (
                          <tr key={file.id} className="hover:bg-surface-container-low transition-colors">
                            <td className="px-6 py-3 text-xs font-semibold text-on-surface flex items-center space-x-2">
                              <span className="text-on-surface-variant">📄</span>
                              <span className="truncate max-w-[250px]">{file.name}</span>
                            </td>
                            <td className="px-6 py-3 text-xs text-on-surface-variant font-medium">
                              {file.mimeType.split(".").pop() || "File"}
                            </td>
                            <td className="px-6 py-3 text-xs text-on-surface ds-numeric">
                              {file.size ? `${Math.round(file.size / 1024)} KB` : "-"}
                            </td>
                            <td className="px-6 py-3 text-xs text-right">
                              {file.webViewLink && (
                                <a
                                  href={file.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center space-x-1 text-[#00cec4] hover:underline font-bold uppercase"
                                >
                                  <span>View File</span>
                                  <ExternalLink size={12} />
                                </a>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Drive folder is not synced */
          <div className="flex flex-col md:flex-row items-center justify-between p-6 border border-outline-variant bg-surface rounded-2xl shadow-sm gap-6 text-left animate-page-enter">
            <div className="flex items-start space-x-4">
              <span className="ds-icon-badge shrink-0" style={{ background: "rgba(251,146,60,0.10)", color: "#fb923c" }}>
                <HardDrive size={22} />
              </span>
              <div className="space-y-1 max-w-xl">
                <h3 className="text-xs font-bold text-on-surface uppercase tracking-wide">
                  Drive Folder Not Synchronized
                </h3>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  The Google Shared Drive folder structure for job <strong className="text-on-surface">{currentJob.jobNumber}</strong> has not been created on the Google Shared Drive, or is running on a mock profile. Synchronize now to establish the real folder hierarchy and migrate existing database uploads to the Shared Drive.
                </p>
              </div>
            </div>
            
            <div className="shrink-0 w-full md:w-auto">
              <SyncDriveButton jobId={currentJob.id} />
            </div>
          </div>
        )
      ) : (
        /* Empty/prompt state */
        <div className="flex flex-col items-center justify-center p-12 border border-outline-variant bg-surface rounded-2xl">
          <span className="text-3xl mb-2">📂</span>
          <span className="text-xs text-on-surface-variant font-semibold">
            Choose a job workspace from the dropdown list above to explore files.
          </span>
        </div>
      )}
    </main>
  );
}
