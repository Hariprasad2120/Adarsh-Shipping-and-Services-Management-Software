"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

export type SearchResult = {
  id: string;
  type: "MAIL" | "CHAT" | "FILE" | "EVENT" | "DOCUMENT" | "FORM";
  title: string;
  subtitle: string;
  link: string;
  createdAt: Date;
};

export async function universalSearch(
  userId: string,
  orgId: string,
  query: string
): Promise<SearchResult[]> {
  await requirePermission(userId, "communication.chat.access");

  if (!query || query.trim().length < 2) return [];
  const searchPattern = query.trim();

  const results: SearchResult[] = [];

  // 1. Search Mail Messages
  const mails = await db.mailMessage.findMany({
    where: {
      orgId,
      OR: [
        { subject: { contains: searchPattern, mode: "insensitive" } },
        { bodyText: { contains: searchPattern, mode: "insensitive" } },
      ],
    },
    take: 10,
    select: { id: true, subject: true, from: true, threadId: true, createdAt: true },
  });
  for (const m of mails) {
    results.push({
      id: m.id,
      type: "MAIL",
      title: m.subject,
      subtitle: `From: ${m.from}`,
      link: `/communication/mail?threadId=${m.threadId}`,
      createdAt: m.createdAt,
    });
  }

  // 2. Search Chat Messages
  const chats = await db.chatMessage.findMany({
    where: {
      orgId,
      body: { contains: searchPattern, mode: "insensitive" },
    },
    take: 10,
    include: {
      sender: { select: { name: true } },
    },
  });
  for (const c of chats) {
    results.push({
      id: c.id,
      type: "CHAT",
      title: c.body.length > 60 ? `${c.body.substring(0, 60)}...` : c.body,
      subtitle: `Sent by: ${c.sender.name}`,
      link: `/communication/chat?id=${c.conversationId}`,
      createdAt: c.createdAt,
    });
  }

  // 3. Search Drive Files
  const files = await db.fileAsset.findMany({
    where: {
      orgId,
      name: { contains: searchPattern, mode: "insensitive" },
    },
    take: 10,
    select: { id: true, name: true, mimeType: true, createdAt: true },
  });
  for (const f of files) {
    results.push({
      id: f.id,
      type: "FILE",
      title: f.name,
      subtitle: `File Type: ${f.mimeType}`,
      link: `/communication/files?previewId=${f.id}`,
      createdAt: f.createdAt,
    });
  }

  // 4. Search Calendar Events
  const events = await db.calendarEvent.findMany({
    where: {
      orgId,
      OR: [
        { title: { contains: searchPattern, mode: "insensitive" } },
        { description: { contains: searchPattern, mode: "insensitive" } },
      ],
    },
    take: 10,
    select: { id: true, title: true, startAt: true, createdAt: true },
  });
  for (const e of events) {
    results.push({
      id: e.id,
      type: "EVENT",
      title: e.title,
      subtitle: `Starts: ${new Date(e.startAt).toLocaleString()}`,
      link: `/communication/calendar?eventId=${e.id}`,
      createdAt: e.createdAt,
    });
  }

  // 5. Search Documents
  const docs = await db.commDocument.findMany({
    where: {
      orgId,
      name: { contains: searchPattern, mode: "insensitive" },
    },
    take: 10,
    select: { id: true, name: true, type: true, createdAt: true },
  });
  for (const d of docs) {
    results.push({
      id: d.id,
      type: "DOCUMENT",
      title: d.name,
      subtitle: `Type: ${d.type}`,
      link: `/communication/docs?editorId=${d.id}`,
      createdAt: d.createdAt,
    });
  }

  return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
