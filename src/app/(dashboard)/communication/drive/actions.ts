"use server";

import { db } from "@/lib/db";
import { provisionJobWorkspace } from "@/lib/workspace-provisioning";
import * as driveClient from "@/lib/google-drive-client";
import { getFolderNameForCategory } from "@/modules/cha/service";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

export async function syncJobWorkspaceAction(jobId: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    const userId = session.user.id;

    // 1. Force provision the job workspace folders (it will re-create them on Drive if mock or missing)
    await provisionJobWorkspace(jobId, true, userId);

    // Get a valid user access token if available to use for uploads
    let userAccessToken: string | undefined;
    try {
      const { getValidAccessToken } = require("@/lib/workspace-oauth");
      userAccessToken = await getValidAccessToken(userId);
    } catch (e) {
      console.warn("[SyncJobWorkspaceAction] Could not get user access token:", e);
    }

    // 2. Fetch the newly provisioned workspace profile
    const profile = await db.jobWorkspaceProfile.findUnique({
      where: { jobId },
    });

    if (!profile || !profile.rootFolderId || profile.rootFolderId.startsWith("mock-")) {
      throw new Error("Workspace folder provisioning failed or returned mock folder ID.");
    }

    const categoryFolders = profile.categoryFolders as Record<string, string>;

    // 3. Find all uploaded documents for this job that need to be synced
    const documents = await db.chaJobDocumentRequirement.findMany({
      where: {
        jobId,
        status: "UPLOADED",
        versions: {
          some: {
            isCurrent: true,
          },
        },
      },
      include: {
        versions: {
          where: {
            isCurrent: true,
          },
        },
      },
    });

    // 4. For each document, if the current version's fileKey is mock or missing, sync it
    for (const doc of documents) {
      const currentVersion = doc.versions[0];
      if (!currentVersion) continue;

      const isMockKey = !currentVersion.fileKey || currentVersion.fileKey.includes("mock-") || currentVersion.fileKey.startsWith("cha/docs/");

      if (isMockKey) {
        // Resolve target folder ID in Drive
        const folderName = getFolderNameForCategory(doc.category);
        const folderId = categoryFolders[folderName] || profile.rootFolderId;

        // Since we don't have the original file buffer in the DB (mock uploads don't persist buffers),
        // we write a placeholder text document with the document metadata.
        const fileContent = `Document Type: ${doc.category}\n` +
          `Document Name: ${currentVersion.fileName}\n` +
          `Uploaded By ID: ${currentVersion.uploadedById}\n` +
          `Upload Date: ${currentVersion.uploadedAt.toISOString()}\n` +
          `File Size: ${currentVersion.sizeBytes} bytes\n\n` +
          `[Monolith Sync] This is a synchronized placeholder file for a document uploaded prior to Google Drive configuration.`;

        const buffer = Buffer.from(fileContent, "utf8");

        // Upload the placeholder to Drive
        const uploadResult = await driveClient.uploadFile({
          name: currentVersion.fileName.endsWith(".txt") ? currentVersion.fileName : `${currentVersion.fileName}.txt`,
          mimeType: "text/plain",
          parentFolderId: folderId,
          fileBuffer: buffer,
          accessToken: userAccessToken,
        });

        // Update the fileKey in the DB to the real Drive link
        await db.chaDocumentVersion.update({
          where: { id: currentVersion.id },
          data: {
            fileKey: uploadResult.webViewLink,
          },
        });
      }
    }

    revalidatePath(`/communication/drive`);
    return { ok: true };
  } catch (err: any) {
    console.error("[SyncJobWorkspaceAction] Error:", err);
    return { ok: false, error: err.message || "Failed to sync workspace" };
  }
}
