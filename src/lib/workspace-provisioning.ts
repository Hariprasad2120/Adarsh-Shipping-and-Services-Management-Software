/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { getAppUrl } from "@/lib/app-url";
import { db } from "@/lib/db";
import * as driveClient from "./google-drive-client";
import { sendMessage, createMembership, getAccessToken, type ChatCard } from "./google-chat-client";
import {
  createJobWorkspaceProfileCompat,
  createOrUpdateJobWorkspaceProfile,
  findJobWorkspaceProfileByJobId,
  normalizeJobWorkspaceProfile,
} from "./job-workspace-profile";
import { getValidAccessToken } from "./workspace-oauth";

type JobForDrive = {
  id: string;
  orgId: string;
  primaryOwnerId: string;
};

const DEFAULT_SHARED_DRIVE_JOBS_ROOT_NAME = "Monolith Job Workspaces";

function buildJobSpaceProvisionedCard(params: {
  jobNumber: string;
  customerName: string;
  serviceName: string;
  priority: string;
  driveFolderUrl: string;
  monolithJobUrl: string;
}): ChatCard {
  const { jobNumber, customerName, serviceName, priority, driveFolderUrl, monolithJobUrl } = params;

  return {
    cardId: `job-space-provisioned-${jobNumber}`,
    card: {
      header: {
        title: "🚀 Job Space Created Successfully!",
        subtitle: "A new job space has been provisioned and is ready to use.",
      },
      sections: [
        {
          widgets: [
            {
              decoratedText: {
                topLabel: "Job Space",
                text: `<b>${jobNumber}</b>`,
                startIcon: { knownIcon: "DESCRIPTION" },
              },
            },
            {
              decoratedText: {
                topLabel: "Customer",
                text: `<b>${customerName}</b>`,
                startIcon: { knownIcon: "PERSON" },
              },
            },
            {
              decoratedText: {
                topLabel: "Service",
                text: `<b>${serviceName}</b>`,
                startIcon: { knownIcon: "BOOKMARK" },
              },
            },
            {
              decoratedText: {
                topLabel: "Priority",
                text: `<b>${priority}</b>`,
                startIcon: { knownIcon: "STAR" },
              },
            },
          ],
        },
        {
          header: "Quick access",
          collapsible: false,
          widgets: [
            {
              decoratedText: {
                topLabel: "Shared Folder",
                text: driveFolderUrl,
                button: {
                  text: "Open",
                  onClick: { openLink: { url: driveFolderUrl } },
                },
              },
            },
          ],
        },
        {
          widgets: [
            {
              buttonList: {
                buttons: [
                  {
                    text: "Open Job",
                    color: { red: 0.16, green: 0.4, blue: 0.85, alpha: 1 },
                    onClick: { openLink: { url: monolithJobUrl } },
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  };
}

// Resolve a Drive-scoped OAuth access token to act as, preferring the
// triggering user's connection and falling back to the job's primary owner.
// Shared by full provisioning and the lighter-weight self-heal path below.
async function resolveJobDriveAccessToken(
  job: JobForDrive,
  triggeringUserId?: string
): Promise<string | undefined> {
  let userAccessToken: string | undefined;
  const targetTokenUserId = triggeringUserId || job.primaryOwnerId;
  const hasConnection = await db.googleWorkspaceConnection.findUnique({
    where: { userId: targetTokenUserId }
  });

  if (hasConnection && hasConnection.status === "connected") {
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

  return userAccessToken;
}

async function resolveWorkspaceParentFolderId(params: {
  orgId: string;
  accessToken: string;
}) {
  const settings = await db.googleWorkspaceSetting.findUnique({ where: { orgId: params.orgId } });
  const jobsRootFolderId = settings?.jobsRootFolderId || process.env.GOOGLE_JOBS_ROOT_FOLDER_ID;
  const sharedDriveId = settings?.sharedDriveId || process.env.GOOGLE_SHARED_DRIVE_ID;

  if (jobsRootFolderId) {
    return { parentFolderId: jobsRootFolderId, sharedDriveId, settings };
  }

  if (!sharedDriveId) {
    return { parentFolderId: undefined, sharedDriveId: undefined, settings };
  }

  const existingManagedRoots = await driveClient.findFolders({
    name: DEFAULT_SHARED_DRIVE_JOBS_ROOT_NAME,
    parentFolderId: sharedDriveId,
    driveId: sharedDriveId,
    accessToken: params.accessToken,
  });
  const managedRootId =
    existingManagedRoots[0]?.id ||
    (await driveClient.createFolder({
      name: DEFAULT_SHARED_DRIVE_JOBS_ROOT_NAME,
      parentFolderId: sharedDriveId,
      sharedDriveId,
      accessToken: params.accessToken,
    }));

  if (!settings?.jobsRootFolderId && settings?.id) {
    await db.googleWorkspaceSetting.update({
      where: { id: settings.id },
      data: { jobsRootFolderId: managedRootId },
    });
  }

  return { parentFolderId: managedRootId, sharedDriveId, settings };
}

// Fail-safe used right before an upload: confirms the job's root folder and
// one specific category subfolder still exist in Drive, and transparently
// recreates whichever one was deleted by a user. Much cheaper than a full
// provisionJobWorkspace() call since it only touches the folder(s) actually
// needed for this upload (1-2 Drive API calls), not the whole category list
// or the Chat space.
export async function ensureJobCategoryFolder(
  jobId: string,
  category: string,
  triggeringUserId?: string
): Promise<string | undefined> {
  const job = await db.chaJob.findUnique({
    where: { id: jobId },
    include: { customer: true }
  });
  if (!job) return undefined;

  let profile = await findJobWorkspaceProfileByJobId(jobId);
  if (!profile || !profile.rootFolderId || profile.rootFolderId.startsWith("mock-")) {
    await provisionJobWorkspace(jobId, true, triggeringUserId);
    profile = await findJobWorkspaceProfileByJobId(jobId);
  }
  if (!profile) return undefined;

  let userAccessToken: string | undefined;
  try {
    userAccessToken = await resolveJobDriveAccessToken(job, triggeringUserId);
  } catch (err) {
    console.warn(`[Drive self-heal] Could not resolve access token for job ${job.jobNumber}:`, err);
    return profile.rootFolderId || undefined;
  }
  if (!userAccessToken) {
    throw new Error("Google Drive workspace sync requires a connected Google Workspace account with Drive access.");
  }

  const { parentFolderId, sharedDriveId } = await resolveWorkspaceParentFolderId({
    orgId: job.orgId,
    accessToken: userAccessToken,
  });

  let rootFolderId = profile.rootFolderId;
  let categoryFolders = (profile.categoryFolders as Record<string, string>) || {};
  const legacyDocumentsFolderId = categoryFolders["02 Job Documents"];

  const rootStillExists = rootFolderId && !rootFolderId.startsWith("mock-")
    ? await driveClient.folderExists(rootFolderId, userAccessToken).catch(() => false)
    : false;

  if (!rootStillExists) {
    // The whole job folder was deleted (or never provisioned) — recreate it,
    // and drop any cached subfolder ids since their parent is gone too.
    rootFolderId = await driveClient.createFolder({
      name: `${job.jobNumber} - ${job.customer.name}`,
      parentFolderId: parentFolderId,
      sharedDriveId,
      accessToken: userAccessToken
    });
    categoryFolders = {};
    const updatedProfile = await createOrUpdateJobWorkspaceProfile(
      { id: profile.id },
      { rootFolderId, categoryFolders, provisioningStatus: "success", lastError: null },
      "update",
    );
    profile = normalizeJobWorkspaceProfile(updatedProfile as Record<string, unknown>) ?? profile;
  }

  const legacyDocumentsStillExist = legacyDocumentsFolderId && !legacyDocumentsFolderId.startsWith("mock-")
    ? await driveClient.folderExists(legacyDocumentsFolderId, userAccessToken).catch(() => false)
    : false;
  if (!categoryFolders[category] && legacyDocumentsStillExist) {
    return legacyDocumentsFolderId;
  }

  const existingCategoryFolderId = categoryFolders[category];
  const categoryStillExists = existingCategoryFolderId && !existingCategoryFolderId.startsWith("mock-")
    ? await driveClient.folderExists(existingCategoryFolderId, userAccessToken).catch(() => false)
    : false;

  if (!categoryStillExists) {
    const newCategoryFolderId = await driveClient.createFolder({
      name: category,
      parentFolderId: rootFolderId || undefined,
      accessToken: userAccessToken
    });
    categoryFolders = { ...categoryFolders, [category]: newCategoryFolderId };
    await createOrUpdateJobWorkspaceProfile({ id: profile.id }, { categoryFolders }, "update");
    return newCategoryFolderId;
  }

  return existingCategoryFolderId;
}

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
  let profile = await findJobWorkspaceProfileByJobId(jobId);

  if (!profile) {
    profile = await createJobWorkspaceProfileCompat({
      orgId: job.orgId,
      jobId: job.id,
      provisioningStatus: "pending",
    });
  }

  if (!profile) {
    throw new Error(`Workspace profile for job ${jobId} could not be created.`);
  }

  const isMock = profile && (
    profile.rootFolderId?.startsWith("mock-") ||
    profile.googleSpaceId?.startsWith("spaces/mock-")
  );

  if (!profile.chatSpaceName && profile.googleSpaceId) {
    const updatedProfile = await createOrUpdateJobWorkspaceProfile(
      { id: profile.id },
      {
        chatSpaceName: profile.googleSpaceId,
        chatSpaceDeleteStatus: "PENDING",
        chatSpaceDeletedAt: null,
        chatSpaceDeleteError: null,
      },
      "update",
    );
    profile = normalizeJobWorkspaceProfile(updatedProfile as Record<string, unknown>) ?? profile;
  }

  const chatSpaceMissing = !profile.googleSpaceId;

  if (profile.provisioningStatus === "success" && !force && !isMock && !chatSpaceMissing) {
    return;
  }

  const userAccessToken = await resolveJobDriveAccessToken(job, triggeringUserId);
  if (!userAccessToken) {
    throw new Error(
      "Connect a Google Workspace account with Drive access in Communication Settings before provisioning CHA job folders."
    );
  }

  // Fetch Workspace Settings
  const { parentFolderId, sharedDriveId, settings } = await resolveWorkspaceParentFolderId({
    orgId: job.orgId,
    accessToken: userAccessToken,
  });
  const domain = settings?.workspaceDomain || process.env.GOOGLE_WORKSPACE_DOMAIN || "adarshshipping.in";

  try {
    // ─── 1. Provision Drive Folders ───
    let rootFolderId = profile.rootFolderId;
    if (!rootFolderId || rootFolderId.startsWith("mock-")) {
      const rootFolderName = `${job.jobNumber} - ${job.customer.name}`;
      try {
        rootFolderId = await driveClient.createFolder({
          name: rootFolderName,
          parentFolderId,
          sharedDriveId,
          accessToken: userAccessToken
        });
      } catch (err: any) {
        throw new Error(`Google Drive folder creation failed for job ${job.jobNumber}: ${err.message}`);
      }
      await createOrUpdateJobWorkspaceProfile({ id: profile.id }, { rootFolderId }, "update");
    }

    // Subfolders mirror the org's configured document requirement categories
    // (CHA Settings > Document Requirements), so adding/renaming/removing a
    // category there is reflected in the Drive structure of the next job created.
    const settingsCategories = await db.chaDocumentRequirementCategory.findMany({
      where: { orgId: job.orgId, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { name: true },
    });

    const categories = settingsCategories.map((c) => c.name.trim()).filter(Boolean);
    // Fixed utility buckets that always exist regardless of settings, since they
    // don't correspond to a document-collection category: ad-hoc custom uploads
    // and filing-stage checklist/photo evidence.
    for (const utility of ["User Uploads", "Filing Documents", "Checklist Files"]) {
      if (!categories.some((name) => name.toLowerCase() === utility.toLowerCase())) {
        categories.push(utility);
      }
    }

    let categoryFolders = (profile.categoryFolders as Record<string, string>) || {};
    if (rootFolderId && !rootFolderId.startsWith("mock-") && Object.values(categoryFolders).some(id => id.startsWith("mock-"))) {
      categoryFolders = {};
    }
    // Create each configured category's subfolder in settings order. One category
    // failing (e.g. a transient API error) must not stop the rest from being
    // created — collect failures and surface them together after the loop.
    const categoryFolderErrors: string[] = [];
    for (const cat of categories) {
      if (!categoryFolders[cat] || categoryFolders[cat].startsWith("mock-")) {
        try {
          const catFolderId = await driveClient.createFolder({
            name: cat,
            parentFolderId: rootFolderId,
            accessToken: userAccessToken
          });
          categoryFolders[cat] = catFolderId;

          await createOrUpdateJobWorkspaceProfile({ id: profile.id }, { categoryFolders }, "update");
        } catch (err: any) {
          console.error(`[Provisioning] Drive subfolder creation failed for "${cat}" in job ${job.jobNumber}:`, err.message || err);
          categoryFolderErrors.push(`"${cat}": ${err.message || err}`);
        }
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

      await createOrUpdateJobWorkspaceProfile(
        { id: profile.id },
        {
          googleSpaceId,
          chatSpaceName: googleSpaceId,
          googleSpaceUrl,
          chatSpaceDeletedAt: null,
          chatSpaceDeleteStatus: googleSpaceId ? "PENDING" : profile.chatSpaceDeleteStatus,
          chatSpaceDeleteError: null,
        },
        "update",
      );
      
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

      // ─── 3. Post Structured Welcome Card ───
      const monolithJobUrl = `${getAppUrl()}/cha/jobs/${job.id}`;
      const driveFolderUrl = `https://drive.google.com/drive/folders/${rootFolderId}`;

      if (googleSpaceId) {
        await sendMessage({
          spaceResourceName: googleSpaceId,
          text: `🚀 Job Space Created: ${job.jobNumber} — ${monolithJobUrl}`,
          cardsV2: [
            buildJobSpaceProvisionedCard({
              jobNumber: job.jobNumber,
              customerName: job.customer.name,
              serviceName: job.jobType.name,
              priority: job.priority,
              driveFolderUrl,
              monolithJobUrl,
            }),
          ],
        });
      }
    }

    // If any configured category subfolder failed to create, keep status as
    // "failed" so the next provisioning call (e.g. re-opening the job, or the
    // manual Sync action) retries just the missing folders instead of treating
    // this job's workspace as fully provisioned.
    await createOrUpdateJobWorkspaceProfile(
      { id: profile.id },
      {
        provisioningStatus: categoryFolderErrors.length > 0 ? "failed" : "success",
        lastError: categoryFolderErrors.length > 0
          ? `Some Drive subfolders failed to create: ${categoryFolderErrors.join("; ")}`
          : null,
        provisionedAt: new Date(),
      },
      "update",
    );

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
    
    await createOrUpdateJobWorkspaceProfile(
      { id: profile.id },
      {
        provisioningStatus: "failed",
        lastError: errorMsg,
      },
      "update",
    );

    throw err;
  }
}
