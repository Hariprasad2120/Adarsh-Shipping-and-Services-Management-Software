"use server";

import { createNotification, notifyMany } from "@/modules/notifications/service";

export async function notifyChatMention(orgId: string, senderName: string, recipientId: string, messageBody: string, conversationId: string) {
  return createNotification({
    userId: recipientId,
    orgId,
    kind: "COMM_CHAT_MENTION",
    title: `@${senderName} mentioned you`,
    body: messageBody.length > 80 ? `${messageBody.substring(0, 80)}...` : messageBody,
    link: `/communication/chat?id=${conversationId}`,
    priority: "important",
  });
}

export async function notifyChatDirectMessage(orgId: string, senderName: string, recipientId: string, messageBody: string, conversationId: string) {
  return createNotification({
    userId: recipientId,
    orgId,
    kind: "COMM_CHAT_DM",
    title: `New message from ${senderName}`,
    body: messageBody.length > 80 ? `${messageBody.substring(0, 80)}...` : messageBody,
    link: `/communication/chat?id=${conversationId}`,
    priority: "normal",
  });
}

export async function notifyCalendarInvite(orgId: string, hostName: string, recipientIds: string[], eventTitle: string, eventId: string) {
  return notifyMany(recipientIds, {
    orgId,
    kind: "COMM_MEETING_INVITE",
    title: `Meeting Invitation: ${eventTitle}`,
    body: `${hostName} has invited you to join a meeting.`,
    link: `/communication/calendar?eventId=${eventId}`,
    priority: "important",
    requiresAck: true,
  });
}

export async function notifyFileShared(orgId: string, ownerName: string, recipientId: string, fileName: string, fileId: string) {
  return createNotification({
    userId: recipientId,
    orgId,
    kind: "COMM_FILE_SHARE",
    title: `${ownerName} shared a file with you`,
    body: `You now have access to "${fileName}".`,
    link: `/communication/files?previewId=${fileId}`,
    priority: "normal",
  });
}
