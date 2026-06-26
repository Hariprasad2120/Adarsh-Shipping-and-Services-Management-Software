/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { db } from "@/lib/db";
import * as driveClient from "./google-drive-client";
import { sendMessage, createMembership, getAccessToken } from "./google-chat-client";
import { getValidAccessToken } from "./workspace-oauth";

// Durable provisioning helper
export async function provisionJobWorkspace(
  jobId: string,
  force = false,
  triggeringUserId?: string
): Promise<void> {
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

  const isMock = profile && (
    profile.rootFolderId?.startsWith("mock-") ||
    profile.googleSpaceId?.startsWith("spaces/mock-")
  );

  const chatSpaceMissing = !profile.googleSpaceId;

  if (profile.provisioningStatus === "success" && !force && !isMock && !chatSpaceMissing) {
    return;
  }

  // Retrieve valid access token for the triggering user or primary owner
  let userAccessToken: string | undefined;
  const targetTokenUserId = triggeringUserId || job.primaryOwnerId;
  const hasConnection = await db.googleWorkspaceConnection.findUnique({
    where: { userId: targetTokenUserId }
  });

  if (hasConnection && hasConnection.status === "connected") {
    // Verify write permissions for Google Drive
    const hasFullDriveScope = hasConnection.scopes.includes("https://www.googleapis.com/auth/drive") || 
                              hasConnection.scopes.includes("https://www.googleapis.com/auth/drive.file");
    if (!hasFullDriveScope) {
      throw new Error("Your connected Google account lacks write permission for Google Drive. Please go to Settings, click 'Reconnect Account', and make sure to check the box for Google Drive access on the sign-in screen.");
    }

    try {
      userAccessToken = await getValidAccessToken(targetTokenUserId);
    } catch (err) {
      console.warn(`[Provisioning] Failed to get valid access token for user ${targetTokenUserId}:`, err);
    }
  }

  if (!userAccessToken && triggeringUserId && triggeringUserId !== job.primaryOwnerId) {
    const ownerConnection = await db.googleWorkspaceConnection.findUnique({
      where: { userId: job.primaryOwnerId }
    });
    if (ownerConnection && ownerConnection.status === "connected") {
      const hasFullDriveScope = ownerConnection.scopes.includes("https://www.googleapis.com/auth/drive") || 
                                ownerConnection.scopes.includes("https://www.googleapis.com/auth/drive.file");
      if (!hasFullDriveScope) {
        throw new Error("The job owner's Google account connection lacks write permission for Google Drive. Please reconnect the Google account in Settings.");
      }

      try {
        userAccessToken = await getValidAccessToken(job.primaryOwnerId);
      } catch (err) {
        console.warn(`[Provisioning] Failed to get valid owner access token:`, err);
      }
    }
  }

  // Fetch Workspace Settings
  const settings = await db.googleWorkspaceSetting.findUnique({
    where: { orgId: job.orgId }
  });

  const jobsRootFolderId = settings?.jobsRootFolderId || process.env.GOOGLE_JOBS_ROOT_FOLDER_ID;
  const sharedDriveId = settings?.sharedDriveId || process.env.GOOGLE_SHARED_DRIVE_ID;
  const domain = settings?.workspaceDomain || process.env.GOOGLE_WORKSPACE_DOMAIN || "adarshshipping.in";

  try {
    // ─── 1. Provision Drive Folders ───
    let rootFolderId = profile.rootFolderId;
    if (!rootFolderId || rootFolderId.startsWith("mock-")) {
      const rootFolderName = `${job.jobNumber} - ${job.customer.name}`;
      try {
        rootFolderId = await driveClient.createFolder({
          name: rootFolderName,
          parentFolderId: jobsRootFolderId || sharedDriveId || undefined,
          accessToken: userAccessToken
        });
      } catch (err: any) {
        throw new Error(`Google Drive folder creation failed for job ${job.jobNumber}: ${err.message}`);
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
    if (rootFolderId && !rootFolderId.startsWith("mock-") && Object.values(categoryFolders).some(id => id.startsWith("mock-"))) {
      categoryFolders = {};
    }
    for (const cat of categories) {
      if (!categoryFolders[cat] || categoryFolders[cat].startsWith("mock-")) {
        let catFolderId = "";
        try {
          catFolderId = await driveClient.createFolder({
            name: cat,
            parentFolderId: rootFolderId,
            accessToken: userAccessToken
          });
        } catch (err: any) {
          throw new Error(`Google Drive subfolder creation failed for "${cat}" in job ${job.jobNumber}: ${err.message}`);
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
      const spaceDisplayName = `JOB-${job.jobNumber} - ${job.customer.name}`;
      
      // Use bot service account token for space creation
      // (user OAuth tokens don't get chat.spaces scope — bot tokens have chat.bot which includes it)
      try {
        const botToken = await getAccessToken();
        
        const chatRes = await fetch("https://chat.googleapis.com/v1/spaces", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${botToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            spaceType: "SPACE",
            displayName: spaceDisplayName,
            customer: "customers/my_customer"
          })
        });

        if (!chatRes.ok) {
          const err = await chatRes.text();
          throw new Error(`Chat API createSpace failed (${chatRes.status}): ${err}`);
        }

        const chatData = (await chatRes.json()) as { name: string };
        googleSpaceId = chatData.name;
        const cleanSpaceId = googleSpaceId.replace("spaces/", "");
        googleSpaceUrl = `https://chat.google.com/room/${cleanSpaceId}`;
      } catch (err: any) {
        console.warn(`[Provisioning] Chat Space creation failed for ${job.jobNumber}: ${err.message}`);
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

      // Get the triggering user's Google ID to make them SPACE_MANAGER
      const triggeringUserConnection = triggeringUserId ? await db.googleWorkspaceConnection.findUnique({
        where: { userId: triggeringUserId },
        select: { googleUserId: true }
      }) : null;
      const triggeringGoogleUserId = triggeringUserConnection?.googleUserId;

      if (googleSpaceId) {
        // Use bot token for memberships (requires chat.app.memberships scope)
        let botTokenForMemberships: string | undefined;
        try { botTokenForMemberships = await getAccessToken(); } catch {}

        // Helper to add a member with a given role ("ROLE_MEMBER" | "ROLE_MANAGER" per Google Chat API)
        const addMember = async (googleUserId: string, role: "ROLE_MEMBER" | "ROLE_MANAGER") => {
          try {
            if (botTokenForMemberships) {
              const memberRes = await fetch(`https://chat.googleapis.com/v1/${googleSpaceId}/members`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${botTokenForMemberships}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  member: { name: `users/${googleUserId}`, type: "HUMAN" },
                  role
                })
              });
              if (!memberRes.ok) {
                const errText = await memberRes.text();
                console.warn(`[Provisioning] Failed to add user ${googleUserId} (${role}): ${errText}`);
              } else {
                console.log(`[Provisioning] Added ${googleUserId} as ${role} to ${googleSpaceId}`);
              }
            }
          } catch (memberErr) {
            console.error(`Failed to add user ${googleUserId} to space ${googleSpaceId}:`, memberErr);
          }
        };

        // 1. Add triggering user as ROLE_MANAGER first
        if (triggeringGoogleUserId) {
          await addMember(triggeringGoogleUserId, "ROLE_MANAGER");
          // Remove from regular members list so they don't get added twice
          employeesToInvite.delete(triggeringGoogleUserId);
        }

        // 2. Add remaining members as regular members
        for (const googleUserId of employeesToInvite) {
          await addMember(googleUserId, "ROLE_MEMBER");
        }
      }

      // ─── 3. Post Structured Welcome Message ───
      const welcomeText = `🚀 *Job Space Provisioned: ${job.jobNumber}*\n\n` +
        `*Customer:* ${job.customer.name}\n` +
        `*Service:* ${job.jobType.name}\n` +
        `*Priority:* ${job.priority}\n\n` +
        `📂 *Shared Folder:* https://drive.google.com/drive/folders/${rootFolderId}\n` +
        `🔗 *Monolith Job:* ${process.env.NEXTAUTH_URL || "http://localhost:3000"}/cha/jobs/${job.id}`;

      if (googleSpaceId) {
        await sendMessage({
          spaceResourceName: googleSpaceId,
          text: welcomeText
        });
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
