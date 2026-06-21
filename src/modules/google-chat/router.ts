// ─── Google Chat Notification Router ─────────────────────────────────────────
// Routes Monolith domain events to the correct Google Chat destinations.

import { db } from "@/lib/db";
import { buildNotificationCard } from "./cards";
import { queueDelivery } from "./delivery";
import { randomBytes } from "crypto";

export type NotificationEventPayload = {
  userId: string;
  orgId?: string;
  kind: string;
  title: string;
  body?: string;
  link?: string;
  priority?: string;
  requiresAck?: boolean;
  notificationId?: string;
  relatedRecordType?: string;
  relatedRecordId?: string;
};

// ─── Route a Monolith notification to Google Chat ─────────────────────────────

export async function routeNotification(event: NotificationEventPayload): Promise<void> {
  const { userId, orgId, kind, priority = "normal" } = event;

  // 1. Check if user has an active Google Chat link
  const userLink = await db.googleChatUserLink.findUnique({
    where: { userId },
  });

  if (!userLink || userLink.linkStatus !== "active") return;

  // 2. Check user DM subscriptions
  const userSubs = await db.googleChatSubscription.findMany({
    where: {
      userId,
      enabled: true,
      channel: "DM",
    },
  });

  const dmSubActive =
    userSubs.length === 0 || // default to deliver if no explicit config
    userSubs.some(
      (s) =>
        (s.eventKinds.length === 0 || s.eventKinds.includes(kind)) &&
        priorityMeetsThreshold(priority, s.minPriority)
    );

  // 3. Check space subscriptions for related records
  const spaceTargets: Array<{ spaceResourceName: string; threadKey?: string }> = [];

  if (event.relatedRecordType && event.relatedRecordId) {
    const linkedSpaces = await db.googleChatSpace.findMany({
      where: {
        linkedRecordType: event.relatedRecordType,
        linkedRecordId: event.relatedRecordId,
        linkStatus: "active",
        botMember: true,
      },
      include: { subscriptions: true },
    });

    for (const space of linkedSpaces) {
      const spaceSub = space.subscriptions.find(
        (s) =>
          s.enabled &&
          (s.eventKinds.length === 0 || s.eventKinds.includes(kind)) &&
          priorityMeetsThreshold(priority, s.minPriority)
      );

      // Space-level check — only deliver if subscribed (not by default)
      if (spaceSub) {
        spaceTargets.push({
          spaceResourceName: space.spaceResourceName,
          threadKey: resolveThreadKey(space.threadKeys as Record<string, string> | null, kind),
        });
      }
    }
  }

  // 4. Build the card payload
  const card = buildNotificationCard({
    title: event.title,
    body: event.body,
    kind: event.kind,
    link: event.link,
    priority: event.priority,
    requiresAck: event.requiresAck,
    notificationId: event.notificationId,
  });

  const payload = { cardsV2: card };

  // 5. Deliver to DM if applicable
  if (dmSubActive) {
    await queueDelivery({
      orgId,
      targetUserId: userId,
      notificationId: event.notificationId,
      eventKind: kind,
      payload,
      idempotencyKey: `notif:dm:${event.notificationId ?? randomBytes(8).toString("hex")}`,
    });
  }

  // 6. Deliver to linked spaces
  for (const target of spaceTargets) {
    await queueDelivery({
      orgId,
      spaceResourceName: target.spaceResourceName,
      notificationId: event.notificationId,
      eventKind: kind,
      threadKey: target.threadKey,
      payload,
      idempotencyKey: `notif:space:${target.spaceResourceName}:${event.notificationId ?? randomBytes(8).toString("hex")}`,
    });
  }
}

// ─── Priority comparison ──────────────────────────────────────────────────────

const PRIORITY_ORDER = ["low", "normal", "high", "critical"];

function priorityMeetsThreshold(
  eventPriority: string,
  minPriority: string
): boolean {
  return (
    PRIORITY_ORDER.indexOf(eventPriority) >=
    PRIORITY_ORDER.indexOf(minPriority)
  );
}

// ─── Thread key resolution ────────────────────────────────────────────────────

function resolveThreadKey(
  threadKeys: Record<string, string> | null,
  kind: string
): string | undefined {
  if (!threadKeys) return undefined;

  // Map notification kinds to thread categories
  const category =
    kind.startsWith("TASK_") ? "tasks"
    : kind.startsWith("LEAVE_") ? "leave"
    : kind.startsWith("APPROVAL_") ? "approvals"
    : kind.startsWith("DOCUMENT_") ? "documents"
    : kind.startsWith("PAYMENT_") || kind.startsWith("INVOICE_") ? "payments"
    : "general";

  return threadKeys[category];
}

// ─── Broadcast a notification to all org admins ───────────────────────────────

export async function broadcastToOrgAdmins(params: {
  orgId: string;
  title: string;
  body?: string;
  kind: string;
  link?: string;
}): Promise<void> {
  const adminLinks = await db.googleChatUserLink.findMany({
    where: {
      orgId: params.orgId,
      linkStatus: "active",
      user: { isPlatformAdmin: true },
    },
    include: { user: { select: { id: true } } },
  });

  const card = buildNotificationCard({
    title: params.title,
    body: params.body,
    kind: params.kind,
    link: params.link,
    priority: "high",
  });

  await Promise.all(
    adminLinks.map((link) =>
      queueDelivery({
        orgId: params.orgId,
        targetUserId: link.userId,
        eventKind: params.kind,
        payload: { cardsV2: card },
        idempotencyKey: `broadcast:admin:${link.userId}:${params.kind}:${Date.now()}`,
      })
    )
  );
}
