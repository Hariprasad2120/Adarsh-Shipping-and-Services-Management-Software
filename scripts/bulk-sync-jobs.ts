import { db } from "../src/lib/db";
import { provisionJobWorkspace } from "../src/lib/workspace-provisioning";
import * as driveClient from "../src/lib/google-drive-client";
import { getFolderNameForCategory } from "../src/modules/cha/service";

async function main() {
  console.log("=== BULK WORKSPACE SYNCHRONIZATION STARTED ===");

  // 1. Find active connection with Drive permissions
  const connection = await db.googleWorkspaceConnection.findFirst({
    where: { status: "connected" }
  });

  if (!connection) {
    throw new Error("No active Google Workspace connection found. Please link your account in settings.");
  }

  const userId = connection.userId;
  console.log(`Using active connection for user ID: ${userId} (${connection.googleEmail})`);

  // Retrieve valid access token
  const { getValidAccessToken } = require("../src/lib/workspace-oauth");
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    throw new Error("Could not retrieve valid access token.");
  }

  // 2. Fetch all jobs
  const jobs = await db.chaJob.findMany({
    include: {
      customer: true
    }
  });

  console.log(`Found ${jobs.length} jobs to process.`);

  for (const job of jobs) {
    console.log(`\nProcessing Job: ${job.jobNumber} - ${job.customer.name}`);
    try {
      // Provision workspace
      await provisionJobWorkspace(job.id, true, userId);
      
      const profile = await db.jobWorkspaceProfile.findUnique({
        where: { jobId: job.id }
      });

      if (!profile || !profile.rootFolderId || profile.rootFolderId.startsWith("mock-")) {
        console.warn(`[Job ${job.jobNumber}] Provisioning succeeded but returned a mock or empty root ID.`);
        continue;
      }

      console.log(`[Job ${job.jobNumber}] Provisioned successfully. Root ID: ${profile.rootFolderId}`);

      const categoryFolders = profile.categoryFolders as Record<string, string>;

      // Sync files
      const documents = await db.chaJobDocumentRequirement.findMany({
        where: {
          jobId: job.id,
          status: "UPLOADED",
          versions: {
            some: {
              isCurrent: true
            }
          }
        },
        include: {
          versions: {
            where: {
              isCurrent: true
            }
          }
        }
      });

      console.log(`[Job ${job.jobNumber}] Found ${documents.length} uploaded document(s) to sync.`);

      for (const doc of documents) {
        const currentVersion = doc.versions[0];
        if (!currentVersion) continue;

        const isMockKey = !currentVersion.fileKey || currentVersion.fileKey.includes("mock-") || currentVersion.fileKey.startsWith("cha/docs/");

        if (isMockKey) {
          const folderName = getFolderNameForCategory(doc.category);
          const folderId = categoryFolders[folderName] || profile.rootFolderId;

          const fileContent = `Document Type: ${doc.category}\n` +
            `Document Name: ${currentVersion.fileName}\n` +
            `Uploaded By ID: ${currentVersion.uploadedById}\n` +
            `Upload Date: ${currentVersion.uploadedAt.toISOString()}\n` +
            `File Size: ${currentVersion.sizeBytes} bytes\n\n` +
            `[Monolith Sync] This is a synchronized placeholder file for a document uploaded prior to Google Drive configuration.`;

          const buffer = Buffer.from(fileContent, "utf8");

          console.log(`[Job ${job.jobNumber}] Syncing file: ${currentVersion.fileName}`);

          const uploadResult = await driveClient.uploadFile({
            name: currentVersion.fileName.endsWith(".txt") ? currentVersion.fileName : `${currentVersion.fileName}.txt`,
            mimeType: "text/plain",
            parentFolderId: folderId,
            fileBuffer: buffer,
            accessToken
          });

          await db.chaDocumentVersion.update({
            where: { id: currentVersion.id },
            data: {
              fileKey: uploadResult.webViewLink
            }
          });

          console.log(`[Job ${job.jobNumber}] File synced successfully to: ${uploadResult.webViewLink}`);
        } else {
          console.log(`[Job ${job.jobNumber}] File is already synced: ${currentVersion.fileName}`);
        }
      }
    } catch (jobErr: any) {
      console.error(`[Job ${job.jobNumber}] Failed to sync:`, jobErr.message || jobErr);
    }
  }

  console.log("\n=== BULK WORKSPACE SYNCHRONIZATION COMPLETED ===");
}

main().catch(err => {
  console.error("Bulk sync error:", err);
  process.exit(1);
});
