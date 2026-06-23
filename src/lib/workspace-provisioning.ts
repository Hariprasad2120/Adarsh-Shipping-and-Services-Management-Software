import { db } from "@/lib/db";
import * as driveClient from "./google-drive-client";
import { sendMessage } from "./google-chat-client";

// Impersonation access token helper for bot actions
async function getBotAccessToken(): Promise<string> {
  // Reuse the getAccessToken logic or fetch service account tokens for chat
  // Note: google-chat-client.ts handles access token fetch via service account
  // We can call chat API endpoints by retrieving the access token
  const clientFile = require("./google-chat-client");
  // Get token helper from client file by calling getAccessToken (or simulate it)
  // Let's call the helper to get token
  return "";
}

// Durable provisioning helper
export async function provisionJobWorkspace(jobId: string): Promise<void> {
  const job = await db.chaJob.findUnique({
    where: { id: jobId },
    include: {
      customer: true,
      jobType: true,
      primaryOwner: { include: { workspaceConnection: true } },
      assignments: { include: { user: { include: { workspaceConnection: true } } } }
    }
  });

  if (!job) {
    throw new Error(`Job ${jobId} not found.`);
  }

  // Get or create Job Workspace Profile
  let profile = await db.jobWorkspaceProfile.findUnique({
    where: { jobId }
  });

  if (!profile) {
    profile = await db.jobWorkspaceProfile.create({
      data: {
        orgId: job.orgId,
        jobId: job.id,
        provisioningStatus: "pending"
      }
    });
  }

  if (profile.provisioningStatus === "success") {
    return;
  }

  // Fetch Workspace Settings
  const settings = await db.googleWorkspaceSetting.findUnique({
    where: { orgId: job.orgId }
  });

  const jobsRootFolderId = settings?.jobsRootFolderId || process.env.GOOGLE_JOBS_ROOT_FOLDER_ID;
  const domain = settings?.workspaceDomain || process.env.GOOGLE_WORKSPACE_DOMAIN || "adarshshipping.in";

  try {
    // ─── 1. Provision Drive Folders ───
    let rootFolderId = profile.rootFolderId;
    if (!rootFolderId) {
      const rootFolderName = `${job.jobNumber} - ${job.customer.name}`;
      try {
        rootFolderId = await driveClient.createFolder({
          name: rootFolderName,
          parentFolderId: jobsRootFolderId || undefined
        });
      } catch (err: any) {
        if (process.env.NODE_ENV === "development" && err.message.includes("credentials for Drive are not configured")) {
          console.warn("[Provisioning] Google Service Account credentials not set. Using dev mock root folder.");
          rootFolderId = `mock-root-folder-${job.jobNumber}`;
        } else {
          throw err;
        }
      }
      await db.jobWorkspaceProfile.update({
        where: { id: profile.id },
        data: { rootFolderId }
      });
    }

    const categories = [
      "01 Customer KYC",
      "02 Job Documents",
      "03 User Uploads",
      "04 Checklists",
      "05 Customs and CHA",
      "06 Invoices and Billing",
      "07 Correspondence",
      "08 Other Documents"
    ];

    let categoryFolders = (profile.categoryFolders as Record<string, string>) || {};
    for (const cat of categories) {
      if (!categoryFolders[cat]) {
        let catFolderId = "";
        try {
          catFolderId = await driveClient.createFolder({
            name: cat,
            parentFolderId: rootFolderId
          });
        } catch (err: any) {
          if (process.env.NODE_ENV === "development" && (err.message.includes("credentials") || err.message.includes("failed"))) {
            catFolderId = `mock-cat-folder-${cat.replace(/\s+/g, "-")}`;
          } else {
            throw err;
          }
        }
        categoryFolders[cat] = catFolderId;
        
        await db.jobWorkspaceProfile.update({
          where: { id: profile.id },
          data: { categoryFolders }
        });
      }
    }

    // ─── 2. Provision Google Chat Space ───
    let googleSpaceId = profile.googleSpaceId;
    let googleSpaceUrl = profile.googleSpaceUrl;

    if (!googleSpaceId) {
      const spaceDisplayName = `JOB-${job.jobNumber} | ${job.customer.name} | ${job.jobType.name}`;
      
      try {
        const chatClientFile = require("./google-chat-client");
        const botToken = await chatClientFile.getAccessToken(); // Retrieves bot access token

        const chatRes = await fetch("https://chat.googleapis.com/v1/spaces", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${botToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            spaceType: "SPACE",
            displayName: spaceDisplayName
          })
        });

        if (!chatRes.ok) {
          const err = await chatRes.text();
          throw new Error(`Google Chat Space provisioning failed: ${err}`);
        }

        const chatData = (await chatRes.json()) as { name: string; structuredAdocUri?: string };
        googleSpaceId = chatData.name;
        const cleanSpaceId = googleSpaceId.replace("spaces/", "");
        googleSpaceUrl = `https://chat.google.com/room/${cleanSpaceId}`;
      } catch (err: any) {
        if (process.env.NODE_ENV === "development" && (err.message.includes("credentials") || err.message.includes("failed"))) {
          console.warn("[Provisioning] Google Service Account credentials not set. Using dev mock Chat Space.");
          googleSpaceId = `spaces/mock-space-${job.jobNumber}`;
          googleSpaceUrl = `https://chat.google.com/room/mock-space-${job.jobNumber}`;
        } else {
          throw err;
        }
      }

      await db.jobWorkspaceProfile.update({
        where: { id: profile.id },
        data: {
          googleSpaceId,
          googleSpaceUrl
        }
      });
      
      // Add members (primary owner and assigned employees) if they have linked Google accounts
      const employeesToInvite = new Set<string>();
      if (job.primaryOwner.workspaceConnection?.googleUserId) {
        employeesToInvite.add(job.primaryOwner.workspaceConnection.googleUserId);
      }
      for (const ass of job.assignments) {
        if (ass.user.workspaceConnection?.googleUserId) {
          employeesToInvite.add(ass.user.workspaceConnection.googleUserId);
        }
      }

      if (!googleSpaceId.includes("mock-space")) {
        for (const googleUserId of employeesToInvite) {
          try {
            const chatClientFile = require("./google-chat-client");
            const botToken = await chatClientFile.getAccessToken();
            await fetch(`https://chat.googleapis.com/v1/${googleSpaceId}/members`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${botToken}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                member: {
                  name: `users/${googleUserId}`,
                  type: "HUMAN"
                }
              })
            });
          } catch (memberErr) {
            console.error(`Failed to add user ${googleUserId} to space ${googleSpaceId}:`, memberErr);
          }
        }
      }

      // ─── 3. Post Structured Welcome Message ───
      const welcomeText = `🚀 *Job Space Provisioned: ${job.jobNumber}*\n\n` +
        `*Customer:* ${job.customer.name}\n` +
        `*Service:* ${job.jobType.name}\n` +
        `*Priority:* ${job.priority}\n\n` +
        `📂 *Shared Folder:* https://drive.google.com/drive/folders/${rootFolderId}\n` +
        `🔗 *Monolith Job:* ${process.env.NEXTAUTH_URL || "http://localhost:3000"}/cha/jobs/${job.id}`;

      if (!googleSpaceId.includes("mock-space")) {
        await sendMessage({
          spaceResourceName: googleSpaceId,
          text: welcomeText
        });
      } else {
        console.warn(`[Provisioning] Skipping welcome message for development mock space: ${googleSpaceId}`);
      }
    }

    // Update status to success
    await db.jobWorkspaceProfile.update({
      where: { id: profile.id },
      data: {
        provisioningStatus: "success",
        lastError: null,
        provisionedAt: new Date()
      }
    });

    // Create Audit log entry
    await db.communicationAuditEvent.create({
      data: {
        orgId: job.orgId,
        userId: job.primaryOwnerId,
        action: "PROVISION_SPACE",
        details: `Successfully provisioned Workspace for job ${job.jobNumber}`
      }
    });

  } catch (err: any) {
    const errorMsg = err.message || String(err);
    console.error(`[Provisioning] Job Workspace failed for ${job.jobNumber}:`, errorMsg);
    
    await db.jobWorkspaceProfile.update({
      where: { id: profile.id },
      data: {
        provisioningStatus: "failed",
        lastError: errorMsg
      }
    });

    throw err;
  }
}
