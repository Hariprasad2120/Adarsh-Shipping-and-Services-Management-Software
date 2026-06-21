// ─── Google Chat Space Management ────────────────────────────────────────────

import { db } from "@/lib/db";
import * as chatClient from "@/lib/google-chat-client";

// ─── Upsert a space record ────────────────────────────────────────────────────

export async function upsertSpace(params: {
  orgId?: string;
  spaceResourceName: string;
  displayName?: string;
  spaceType?: string;
  linkedByUserId?: string;
}): Promise<{ id: string }> {
  const existing = await db.googleChatSpace.findUnique({
    where: { spaceResourceName: params.spaceResourceName },
  });

  if (existing) {
    return db.googleChatSpace.update({
      where: { id: existing.id },
      data: {
        displayName: params.displayName ?? existing.displayName,
        spaceType: params.spaceType ?? existing.spaceType,
        botMember: true,
        linkStatus: "active",
        lastVerifiedAt: new Date(),
      },
    });
  }

  return db.googleChatSpace.create({
    data: {
      orgId: params.orgId,
      spaceResourceName: params.spaceResourceName,
      displayName: params.displayName,
      spaceType: params.spaceType ?? "SPACE",
      botMember: true,
      linkedByUserId: params.linkedByUserId,
      linkStatus: "active",
      lastVerifiedAt: new Date(),
    },
  });
}

// ─── Link a space to a Monolith record ───────────────────────────────────────

export async function linkSpaceToRecord(params: {
  spaceResourceName: string;
  recordType: string;
  recordId: string;
  recordLabel: string;
  linkedByUserId: string;
  orgId?: string;
}): Promise<{ success: boolean; error?: string; spaceId?: string }> {
  const existing = await db.googleChatSpace.findFirst({
    where: {
      linkedRecordType: params.recordType,
      linkedRecordId: params.recordId,
      linkStatus: "active",
    },
  });

  if (
    existing &&
    existing.spaceResourceName !== params.spaceResourceName
  ) {
    return {
      success: false,
      error: `This record is already linked to space "${existing.displayName ?? existing.spaceResourceName}".`,
    };
  }

  // Verify bot is in the space
  try {
    await chatClient.getSpace(params.spaceResourceName);
  } catch {
    return {
      success: false,
      error: "Could not verify space. Make sure Monolith AI Assistant is a member of this space.",
    };
  }

  const space = await db.googleChatSpace.upsert({
    where: { spaceResourceName: params.spaceResourceName },
    create: {
      orgId: params.orgId,
      spaceResourceName: params.spaceResourceName,
      spaceType: "SPACE",
      botMember: true,
      linkedByUserId: params.linkedByUserId,
      linkedRecordType: params.recordType,
      linkedRecordId: params.recordId,
      linkedRecordLabel: params.recordLabel,
      linkStatus: "active",
      lastVerifiedAt: new Date(),
    },
    update: {
      linkedByUserId: params.linkedByUserId,
      linkedRecordType: params.recordType,
      linkedRecordId: params.recordId,
      linkedRecordLabel: params.recordLabel,
      linkStatus: "active",
      lastVerifiedAt: new Date(),
    },
  });

  return { success: true, spaceId: space.id };
}

// ─── Unlink a space ───────────────────────────────────────────────────────────

export async function unlinkSpace(spaceResourceName: string): Promise<void> {
  await db.googleChatSpace.updateMany({
    where: { spaceResourceName },
    data: {
      linkedRecordType: null,
      linkedRecordId: null,
      linkedRecordLabel: null,
      linkStatus: "active",
    },
  });
}

// ─── Mark space as bot-removed ────────────────────────────────────────────────

export async function markBotRemoved(spaceResourceName: string): Promise<void> {
  await db.googleChatSpace.updateMany({
    where: { spaceResourceName },
    data: { botMember: false, linkStatus: "archived" },
  });
}

// ─── Get space by resource name ───────────────────────────────────────────────

export async function getSpaceByResource(spaceResourceName: string) {
  return db.googleChatSpace.findUnique({
    where: { spaceResourceName },
  });
}

// ─── Get spaces linked to a record ───────────────────────────────────────────

export async function getSpacesForRecord(
  recordType: string,
  recordId: string
) {
  return db.googleChatSpace.findMany({
    where: {
      linkedRecordType: recordType,
      linkedRecordId: recordId,
      linkStatus: "active",
      botMember: true,
    },
  });
}

// ─── Admin: list all org spaces ──────────────────────────────────────────────

export async function listOrgSpaces(orgId: string) {
  return db.googleChatSpace.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Subscription management ─────────────────────────────────────────────────

export async function upsertSubscription(params: {
  orgId?: string;
  userId?: string;
  spaceId?: string;
  eventKinds: string[];
  channel: "DM" | "SPACE";
  digestMode?: "immediate" | "daily" | "weekly";
  minPriority?: "low" | "normal" | "high" | "critical";
}): Promise<void> {
  const where = params.spaceId
    ? { spaceId: params.spaceId }
    : params.userId
    ? {
        userId: params.userId,
        spaceId: null as string | null | undefined,
      }
    : null;

  if (!where) return;

  const existing = await db.googleChatSubscription.findFirst({ where });

  if (existing) {
    await db.googleChatSubscription.update({
      where: { id: existing.id },
      data: {
        eventKinds: params.eventKinds,
        digestMode: params.digestMode ?? existing.digestMode,
        minPriority: params.minPriority ?? existing.minPriority,
        enabled: true,
      },
    });
  } else {
    await db.googleChatSubscription.create({
      data: {
        orgId: params.orgId,
        userId: params.userId,
        spaceId: params.spaceId,
        eventKinds: params.eventKinds,
        channel: params.channel,
        digestMode: params.digestMode ?? "immediate",
        minPriority: params.minPriority ?? "normal",
        enabled: true,
      },
    });
  }
}

export async function getSubscriptionsForUser(userId: string) {
  return db.googleChatSubscription.findMany({
    where: { userId, enabled: true },
  });
}
