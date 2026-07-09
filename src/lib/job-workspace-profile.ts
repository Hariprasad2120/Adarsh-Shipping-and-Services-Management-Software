import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

const CHAT_CLEANUP_COLUMNS = [
  "chatSpaceName",
  "chatSpaceDeletedAt",
  "chatSpaceDeleteStatus",
  "chatSpaceDeleteError",
] as const;

type ChatCleanupStatus = "PENDING" | "SUCCESS" | "FAILED" | "SKIPPED";

export type JobWorkspaceProfileCompat = {
  id: string;
  orgId: string;
  jobId: string;
  googleSpaceId: string | null;
  googleSpaceUrl: string | null;
  rootFolderId: string | null;
  categoryFolders: Prisma.JsonValue | null;
  provisioningStatus: string;
  lastError: string | null;
  provisionedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  chatSpaceName: string | null;
  chatSpaceDeletedAt: Date | null;
  chatSpaceDeleteStatus: ChatCleanupStatus;
  chatSpaceDeleteError: string | null;
};

let chatCleanupColumnsPromise: Promise<boolean> | null = null;

export async function hasJobWorkspaceChatCleanupColumns(): Promise<boolean> {
  if (!chatCleanupColumnsPromise) {
    chatCleanupColumnsPromise = db
      .$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'JobWorkspaceProfile'
          AND column_name IN (${Prisma.join([...CHAT_CLEANUP_COLUMNS])})
      `
      .then((rows) => rows.length === CHAT_CLEANUP_COLUMNS.length)
      .catch(() => false);
  }

  return chatCleanupColumnsPromise;
}

function baseJobWorkspaceProfileSelect() {
  return {
    id: true,
    orgId: true,
    jobId: true,
    googleSpaceId: true,
    googleSpaceUrl: true,
    rootFolderId: true,
    categoryFolders: true,
    provisioningStatus: true,
    lastError: true,
    provisionedAt: true,
    createdAt: true,
    updatedAt: true,
  } as const;
}

export async function getJobWorkspaceProfileSelect() {
  const hasColumns = await hasJobWorkspaceChatCleanupColumns();
  return {
    ...baseJobWorkspaceProfileSelect(),
    ...(hasColumns
      ? {
          chatSpaceName: true,
          chatSpaceDeletedAt: true,
          chatSpaceDeleteStatus: true,
          chatSpaceDeleteError: true,
        }
      : {}),
  };
}

export function normalizeJobWorkspaceProfile<T extends Record<string, unknown> | null>(
  profile: T,
): JobWorkspaceProfileCompat | null {
  if (!profile) {
    return null;
  }

  const googleSpaceId =
    typeof profile.googleSpaceId === "string" ? profile.googleSpaceId : null;
  const chatSpaceName =
    typeof profile.chatSpaceName === "string"
      ? profile.chatSpaceName
      : googleSpaceId;
  const rawStatus = profile.chatSpaceDeleteStatus;
  const chatSpaceDeleteStatus: ChatCleanupStatus =
    rawStatus === "PENDING" ||
    rawStatus === "SUCCESS" ||
    rawStatus === "FAILED" ||
    rawStatus === "SKIPPED"
      ? rawStatus
      : chatSpaceName
        ? "PENDING"
        : "SKIPPED";

  return {
    id: String(profile.id),
    orgId: String(profile.orgId),
    jobId: String(profile.jobId),
    googleSpaceId,
    googleSpaceUrl:
      typeof profile.googleSpaceUrl === "string" ? profile.googleSpaceUrl : null,
    rootFolderId:
      typeof profile.rootFolderId === "string" ? profile.rootFolderId : null,
    categoryFolders: (profile.categoryFolders as Prisma.JsonValue | null) ?? null,
    provisioningStatus: String(profile.provisioningStatus),
    lastError: typeof profile.lastError === "string" ? profile.lastError : null,
    provisionedAt:
      profile.provisionedAt instanceof Date ? profile.provisionedAt : null,
    createdAt: profile.createdAt as Date,
    updatedAt: profile.updatedAt as Date,
    chatSpaceName,
    chatSpaceDeletedAt:
      profile.chatSpaceDeletedAt instanceof Date ? profile.chatSpaceDeletedAt : null,
    chatSpaceDeleteStatus,
    chatSpaceDeleteError:
      typeof profile.chatSpaceDeleteError === "string"
        ? profile.chatSpaceDeleteError
        : null,
  };
}

export async function findJobWorkspaceProfileByJobId(jobId: string) {
  const select = await getJobWorkspaceProfileSelect();
  const profile = await db.jobWorkspaceProfile.findUnique({
    where: { jobId },
    select,
  });
  return normalizeJobWorkspaceProfile(profile);
}

export async function findJobWorkspaceProfileById(id: string) {
  const select = await getJobWorkspaceProfileSelect();
  const profile = await db.jobWorkspaceProfile.findUnique({
    where: { id },
    select,
  });
  return normalizeJobWorkspaceProfile(profile);
}

export async function createOrUpdateJobWorkspaceProfile(
  where: { id?: string; jobId?: string },
  data: Record<string, unknown>,
  mode: "update" | "updateMany",
) {
  const hasColumns = await hasJobWorkspaceChatCleanupColumns();
  const safeData = { ...data } as Record<string, unknown>;

  if (!hasColumns) {
    for (const key of CHAT_CLEANUP_COLUMNS) {
      delete safeData[key];
    }
  }

  if (mode === "update") {
    if (!hasColumns) {
      await db.jobWorkspaceProfile.updateMany({
        where: where.id ? { id: where.id } : { jobId: where.jobId! },
        data: safeData,
      });
      return where.id
        ? findJobWorkspaceProfileById(where.id)
        : findJobWorkspaceProfileByJobId(where.jobId!);
    }

    return db.jobWorkspaceProfile.update({
      where: where.id ? { id: where.id } : { jobId: where.jobId! },
      data: safeData,
    });
  }

  return db.jobWorkspaceProfile.updateMany({
    where: where.id ? { id: where.id } : { jobId: where.jobId! },
    data: safeData,
  });
}

export async function createJobWorkspaceProfileCompat(data: {
  orgId: string;
  jobId: string;
  provisioningStatus?: string;
}) {
  const hasColumns = await hasJobWorkspaceChatCleanupColumns();

  if (hasColumns) {
    const created = await db.jobWorkspaceProfile.create({
      data: {
        orgId: data.orgId,
        jobId: data.jobId,
        provisioningStatus: data.provisioningStatus ?? "pending",
      },
      select: await getJobWorkspaceProfileSelect(),
    });
    return normalizeJobWorkspaceProfile(created);
  }

  const idRows = await db.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "JobWorkspaceProfile" ("id", "orgId", "jobId", "provisioningStatus", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, ${data.orgId}, ${data.jobId}, ${data.provisioningStatus ?? "pending"}, NOW(), NOW())
    RETURNING "id"
  `;

  const createdId = idRows[0]?.id;
  if (!createdId) {
    throw new Error("Failed to create job workspace profile.");
  }

  return findJobWorkspaceProfileByJobId(data.jobId);
}
