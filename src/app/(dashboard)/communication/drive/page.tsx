import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { listFiles } from "@/lib/google-drive-client";
import {
  ArrowLeft,
  ExternalLink,
  File,
  Folder,
  HardDrive,
} from "lucide-react";
import Link from "next/link";
import JobSelector from "./JobSelector";
import SyncDriveButton from "./SyncDriveButton";
import {
  CommunicationEmptyTableRow,
  CommunicationField,
  CommunicationPanel,
  CommunicationPanelHeader,
  CommunicationTable,
  WorkspaceState,
} from "@/components/monolith";

type SearchParams = Promise<{ jobId?: string; folderId?: string }>;
type DriveFile = Awaited<ReturnType<typeof listFiles>>[number];

export default async function JobDrivePortal({
  searchParams: searchParamsPromise,
}: {
  searchParams: SearchParams;
}) {
  const searchParams = await searchParamsPromise;
  const session = await getSession();
  if (!session?.user) return null;

  const jobs = await db.chaJob.findMany({
    where: { orgId: session.user.orgId! },
    include: { workspaceProfile: true },
    orderBy: { jobNumber: "desc" },
  });

  const selectedJobId = searchParams.jobId ?? "";
  const selectedFolderId = searchParams.folderId ?? "";
  const currentJob = jobs.find((job) => job.id === selectedJobId);
  const workspace = currentJob?.workspaceProfile;
  const isRealFolderCreated =
    workspace?.provisioningStatus === "success" &&
    Boolean(workspace.rootFolderId) &&
    !workspace.rootFolderId?.startsWith("mock-");

  let files: DriveFile[] = [];
  let currentFolderName = "Root workspace";

  if (currentJob && workspace && isRealFolderCreated && selectedFolderId) {
    try {
      files = await listFiles(selectedFolderId);
      const categoryFolders =
        (workspace.categoryFolders as Record<string, string>) ?? {};
      const match = Object.entries(categoryFolders).find(
        ([, id]) => id === selectedFolderId,
      );
      currentFolderName = match?.[0] ?? "Files";
    } catch (error) {
      console.error("[JobDrivePortal] Error loading files:", error);
    }
  }

  const serializableJobs = jobs.map((job) => ({
    id: job.id,
    jobNumber: job.jobNumber,
    title: job.title,
  }));

  return (
    <>
      <CommunicationPanel>
        <CommunicationPanelHeader
          eyebrow="Document context"
          title="Select a job workspace"
          description="Browse the controlled Google Drive hierarchy provisioned for a CHA job."
          actions={<HardDrive aria-hidden="true" />}
        />
        <div className="mnx-communication-panel-body">
          <CommunicationField label="Job workspace">
            <JobSelector
              jobs={serializableJobs}
              selectedJobId={selectedJobId}
            />
          </CommunicationField>
        </div>
      </CommunicationPanel>

      {!currentJob ? (
        <WorkspaceState
          variant="empty"
          eyebrow="Job drive"
          title="Choose a job"
          description="Select a job workspace to browse its category folders and files."
          icon={<Folder aria-hidden="true" />}
        />
      ) : isRealFolderCreated && workspace ? (
        <CommunicationPanel>
          <CommunicationPanelHeader
            eyebrow={`Job ${currentJob.jobNumber}`}
            title={currentFolderName}
            description="Google Drive files inherit the access and folder structure configured for this job."
            actions={
              selectedFolderId ? (
                <Link
                  href={`/communication/drive?jobId=${selectedJobId}`}
                  className="mnx-button mnx-button-secondary"
                >
                  <ArrowLeft aria-hidden="true" />
                  Back to folders
                </Link>
              ) : null
            }
          />
          {!selectedFolderId ? (
            <div className="mnx-communication-folder-grid">
              {Object.entries(
                (workspace.categoryFolders as Record<string, string>) ?? {},
              ).map(([categoryName, folderId]) => (
                <Link
                  key={categoryName}
                  href={`/communication/drive?jobId=${selectedJobId}&folderId=${folderId}`}
                  className="mnx-communication-folder"
                >
                  <Folder aria-hidden="true" />
                  <span>
                    <strong>{categoryName.substring(3)}</strong>
                    <small>Code: {categoryName.substring(0, 2)}</small>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <CommunicationTable>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {files.length === 0 ? (
                  <CommunicationEmptyTableRow colSpan={4}>
                    No files found in this folder.
                  </CommunicationEmptyTableRow>
                ) : (
                  files.map((file) => (
                    <tr key={file.id}>
                      <td>
                        <span>
                          <File aria-hidden="true" />
                          <strong>{file.name}</strong>
                        </span>
                      </td>
                      <td>{file.mimeType.split(".").pop() ?? "File"}</td>
                      <td>
                        {file.size
                          ? `${Math.round(Number(file.size) / 1024)} KB`
                          : "—"}
                      </td>
                      <td>
                        {file.webViewLink ? (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mnx-communication-record-link"
                          >
                            View file
                            <ExternalLink aria-hidden="true" />
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </CommunicationTable>
          )}
        </CommunicationPanel>
      ) : (
        <CommunicationPanel>
          <CommunicationPanelHeader
            eyebrow="Drive synchronisation"
            title="Drive folder not synchronised"
            description={`The real Google Drive hierarchy for ${currentJob.jobNumber} is missing, pending, failed, or still using a mock profile.`}
            actions={<HardDrive aria-hidden="true" />}
          />
          <div className="mnx-communication-panel-body">
            <p>
              Synchronise to establish the category hierarchy and migrate
              existing database uploads into the shared Drive.
            </p>
            <SyncDriveButton jobId={currentJob.id} />
          </div>
        </CommunicationPanel>
      )}
    </>
  );
}
