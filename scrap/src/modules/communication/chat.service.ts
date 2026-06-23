"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { getNow } from "@/lib/clock";
import { notifyChatMention, notifyChatDirectMessage } from "./communication-notification.service";
import { createCommunicationAuditLog } from "./communication-audit.service";

export type ConversationType = "DIRECT" | "GROUP" | "CHANNEL";

export async function listConversations(userId: string, orgId: string) {
  // Gating access
  await requirePermission(userId, "communication.chat.access");

  return db.chatConversation.findMany({
    where: {
      orgId,
      OR: [
        { isPublic: true },
        { participants: { some: { userId } } },
      ],
    },
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, name: true, email: true, photo: true },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          sender: { select: { name: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getOrCreateDM(userId: string, orgId: string, targetUserId: string) {
  await requirePermission(userId, "communication.chat.access");

  if (userId === targetUserId) {
    throw new Error("Cannot create DM with yourself");
  }

  // Find existing DM conversation
  const existing = await db.chatConversation.findFirst({
    where: {
      orgId,
      type: "DIRECT",
      participants: { every: { userId: { in: [userId, targetUserId] } } },
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, email: true, photo: true } },
        },
      },
    },
  });

  if (existing) return existing;

  // Create new DM conversation
  return db.$transaction(async (tx) => {
    const convo = await tx.chatConversation.create({
      data: {
        orgId,
        type: "DIRECT",
        isPublic: false,
      },
    });

    await tx.chatParticipant.createMany({
      data: [
        { orgId, conversationId: convo.id, userId, role: "MEMBER" },
        { orgId, conversationId: convo.id, userId: targetUserId, role: "MEMBER" },
      ],
    });

    return tx.chatConversation.findUniqueOrThrow({
      where: { id: convo.id },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true, photo: true } },
          },
        },
      },
    });
  });
}

export async function createConversation(
  userId: string,
  orgId: string,
  data: {
    name?: string;
    type: ConversationType;
    departmentId?: string;
    projectId?: string;
    leadId?: string;
    employeeId?: string;
    isPublic?: boolean;
    participantUserIds?: string[];
  }
) {
  await requirePermission(userId, "communication.chat.access");

  const convo = await db.$transaction(async (tx) => {
    const convo = await tx.chatConversation.create({
      data: {
        orgId,
        name: data.name,
        type: data.type,
        departmentId: data.departmentId,
        projectId: data.projectId,
        leadId: data.leadId,
        employeeId: data.employeeId,
        isPublic: data.isPublic ?? false,
      },
    });

    const participants = data.participantUserIds || [];
    // Ensure creator is participant
    if (!participants.includes(userId)) {
      participants.push(userId);
    }

    await tx.chatParticipant.createMany({
      data: participants.map((pId) => ({
        orgId,
        conversationId: convo.id,
        userId: pId,
        role: pId === userId ? "ADMIN" : "MEMBER",
      })),
    });

    return tx.chatConversation.findUniqueOrThrow({
      where: { id: convo.id },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true, photo: true } },
          },
        },
      },
    });
  });

  await createCommunicationAuditLog(orgId, userId, "CREATE_CHAT_CONVERSATION", {
    conversationId: convo.id,
    type: data.type,
  });

  return convo;
}

export async function listChatMessages(
  userId: string,
  orgId: string,
  conversationId: string,
  limit = 50,
  cursorId?: string
) {
  await requirePermission(userId, "communication.chat.access");

  // Validate participation
  const isParticipant = await db.chatParticipant.findFirst({
    where: { conversationId, userId, orgId },
  });

  const conversation = await db.chatConversation.findUnique({
    where: { id: conversationId },
    select: { isPublic: true },
  });

  if (!isParticipant && !conversation?.isPublic) {
    throw new Error("You are not a participant in this conversation");
  }

  const whereClause: any = { conversationId, orgId };
  if (cursorId) {
    whereClause.id = { lt: cursorId }; // simple cursor pagination
  }

  return db.chatMessage.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      sender: { select: { id: true, name: true, photo: true } },
      reactions: {
        include: {
          user: { select: { name: true } },
        },
      },
      attachments: true,
      readReceipts: {
        include: {
          user: { select: { name: true } },
        },
      },
    },
  });
}

export async function sendMessage(
  userId: string,
  orgId: string,
  data: {
    conversationId: string;
    body: string;
    parentId?: string;
    attachments?: { fileKey: string; fileName: string; fileSize: number; mimeType: string }[];
  }
) {
  await requirePermission(userId, "communication.chat.access");

  const sender = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true },
  });

  const now = await getNow();

  const msgId = await db.$transaction(async (tx) => {
    const msg = await tx.chatMessage.create({
      data: {
        orgId,
        conversationId: data.conversationId,
        senderId: userId,
        body: data.body,
        parentId: data.parentId,
      },
    });

    if (data.attachments && data.attachments.length > 0) {
      await tx.chatAttachment.createMany({
        data: data.attachments.map((a) => ({
          orgId,
          messageId: msg.id,
          fileKey: a.fileKey,
          fileName: a.fileName,
          fileSize: a.fileSize,
          mimeType: a.mimeType,
        })),
      });
    }

    // Update conversation updatedAt timestamp
    await tx.chatConversation.update({
      where: { id: data.conversationId },
      data: { updatedAt: now },
    });

    return msg.id;
  });

  // Fetch conversation participants for notifications
  const conversation = await db.chatConversation.findUniqueOrThrow({
    where: { id: data.conversationId },
    include: {
      participants: { select: { userId: true, user: { select: { name: true } } } },
    },
  });

  // Detect @mentions like @user, @team, @department and notify
  const mentionRegex = /@(\w+)/g;
  const mentions = data.body.match(mentionRegex) || [];

  for (const mention of mentions) {
    const mentionName = mention.substring(1).toLowerCase();
    // Match against participants
    const match = conversation.participants.find(
      (p) => p.user.name.toLowerCase().replace(/\s+/g, "").includes(mentionName)
    );

    if (match && match.userId !== userId) {
      try {
        await notifyChatMention(orgId, sender.name, match.userId, data.body, data.conversationId);
      } catch (err) {
        console.error("Failed to send mention notification:", err);
      }
    }
  }

  // Direct Message notifications
  if (conversation.type === "DIRECT") {
    const recipient = conversation.participants.find((p) => p.userId !== userId);
    if (recipient) {
      try {
        await notifyChatDirectMessage(orgId, sender.name, recipient.userId, data.body, data.conversationId);
      } catch (err) {
        console.error("Failed to send DM notification:", err);
      }
    }
  }

  return db.chatMessage.findUniqueOrThrow({
    where: { id: msgId },
    include: {
      sender: { select: { id: true, name: true, photo: true } },
      reactions: {
        include: {
          user: { select: { name: true } },
        },
      },
      attachments: true,
      readReceipts: {
        include: {
          user: { select: { name: true } },
        },
      },
    },
  });
}

export async function toggleReaction(
  userId: string,
  orgId: string,
  messageId: string,
  emoji: string
) {
  await requirePermission(userId, "communication.chat.access");

  const existing = await db.chatReaction.findUnique({
    where: {
      messageId_userId_emoji: { messageId, userId, emoji },
    },
  });

  if (existing) {
    await db.chatReaction.delete({
      where: { id: existing.id },
    });
    return { added: false, emoji };
  } else {
    await db.chatReaction.create({
      data: { orgId, messageId, userId, emoji },
    });
    return { added: true, emoji };
  }
}

export async function deleteMessage(userId: string, orgId: string, messageId: string) {
  await requirePermission(userId, "communication.chat.access");

  const msg = await db.chatMessage.findUniqueOrThrow({
    where: { id: messageId, orgId },
  });

  const isSender = msg.senderId === userId;
  const isMod = await db.userRole.findFirst({
    where: {
      userId,
      role: {
        permissions: { some: { permission: { key: "communication.chat.moderator" } } },
      },
    },
  });

  if (!isSender && !isMod) {
    throw new Error("Unauthorized to delete this message");
  }

  await db.chatMessage.delete({
    where: { id: messageId },
  });

  await createCommunicationAuditLog(orgId, userId, "DELETE_CHAT_MESSAGE", { messageId });
  return { success: true };
}

export async function updatePresence(userId: string, orgId: string, presence: string) {
  return db.communicationProfile.upsert({
    where: { userId },
    update: { chatPresence: presence },
    create: { userId, orgId, chatPresence: presence },
  });
}

export async function getPresenceMap(orgId: string) {
  const profiles = await db.communicationProfile.findMany({
    where: { orgId },
    select: { userId: true, chatPresence: true },
  });

  const map: Record<string, string> = {};
  for (const p of profiles) {
    map[p.userId] = p.chatPresence;
  }
  return map;
}
