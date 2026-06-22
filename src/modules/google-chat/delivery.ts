// ─── Google Chat Delivery Service ────────────────────────────────────────────
// Handles sending and retrying messages to Google Chat spaces/DMs.

import { db } from "@/lib/db";
import * as chatClient from "@/lib/google-chat-client";
import type { ChatCard } from "@/lib/google-chat-client";

// ─── Queue a delivery ─────────────────────────────────────────────────────────

export async function queueDelivery(params: {
  orgId?: string;
  targetUserId?: string;
  spaceResourceName?: string;
  targetSpaceId?: string;
  notificationId?: string;
  eventKind?: string;
  threadKey?: string;
  payload: { text?: string; cardsV2?: ChatCard[] };
  idempotencyKey: string;
}): Promise<string> {
  const delivery = await db.googleChatDelivery.create({
    data: {
      orgId: params.orgId,
      targetUserId: params.targetUserId,
      targetSpaceId: params.targetSpaceId,
      spaceResourceName: params.spaceResourceName,
      notificationId: params.notificationId,
      eventKind: params.eventKind,
      threadKey: params.threadKey,
      idempotencyKey: params.idempotencyKey,
      status: "queued",
      payload: params.payload as object,
      nextAttemptAt: new Date(),
    },
  });

  processDelivery(delivery.id).catch((err) =>
    console.error("[ChatDelivery] Failed to process delivery:", err)
  );

  return delivery.id;
}

// ─── Process a queued delivery ────────────────────────────────────────────────

export async function processDelivery(deliveryId: string): Promise<void> {
  const delivery = await db.googleChatDelivery.findUnique({
    where: { id: deliveryId },
  });
  if (!delivery || !["queued", "failed_retryable"].includes(delivery.status)) {
    return;
  }

  await db.googleChatDelivery.update({
    where: { id: deliveryId },
    data: { status: "processing", attempts: { increment: 1 } },
  });

  try {
    let spaceResourceName = delivery.spaceResourceName;

    // Resolve DM space for user-targeted deliveries
    if (!spaceResourceName && delivery.targetUserId) {
      const link = await db.googleChatUserLink.findUnique({
        where: { userId: delivery.targetUserId },
      });
      if (!link || link.linkStatus !== "active") {
        await db.googleChatDelivery.update({
          where: { id: deliveryId },
          data: {
            status: "suppressed",
            lastError: "Target user has no active Google Chat link",
          },
        });
        return;
      }

      const dm = await chatClient.createDmWithUser(link.googleUserId);
      spaceResourceName = dm.name;
    }

    if (!spaceResourceName) {
      throw new Error("No space resource name resolved for delivery");
    }

    const payload = delivery.payload as {
      text?: string;
      cardsV2?: ChatCard[];
    };

    const sent = await chatClient.sendMessage({
      spaceResourceName,
      text: payload.text,
      cardsV2: payload.cardsV2,
      threadKey: delivery.threadKey ?? undefined,
    });

    await db.googleChatDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "sent",
        messageResourceName: sent.name ?? null,
        threadResourceName: sent.thread?.name ?? null,
        sentAt: new Date(),
        lastError: null,
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const currentAttempts = (delivery.attempts ?? 0) + 1;
    const maxAttempts = delivery.maxAttempts ?? 3;
    const permanent = currentAttempts >= maxAttempts || error.includes("404");

    const backoffMs = Math.min(1000 * 2 ** currentAttempts, 60_000);
    const nextAttemptAt = permanent ? null : new Date(Date.now() + backoffMs);

    await db.googleChatDelivery.update({
      where: { id: deliveryId },
      data: {
        status: permanent ? "failed_permanent" : "failed_retryable",
        lastError: error,
        nextAttemptAt,
      },
    });

    if (!permanent) {
      setTimeout(
        () => processDelivery(deliveryId).catch(console.error),
        backoffMs
      );
    }

    console.error(
      `[ChatDelivery] Delivery ${deliveryId} ${permanent ? "permanently" : "temporarily"} failed:`,
      error
    );
  }
}

// ─── Send immediately (bypasses queue for synchronous responses) ──────────────

export async function sendNow(params: {
  spaceResourceName: string;
  text?: string;
  cardsV2?: ChatCard[];
  threadKey?: string;
  threadResourceName?: string;
}): Promise<{ messageName: string; threadName?: string } | null> {
  try {
    const sent = await chatClient.sendMessage(params);
    return {
      messageName: sent.name ?? "",
      threadName: sent.thread?.name,
    };
  } catch (err) {
    console.error("[ChatDelivery] sendNow failed:", err);
    return null;
  }
}

// ─── Update an existing message ───────────────────────────────────────────────

export async function updateNow(params: {
  messageName: string;
  text?: string;
  cardsV2?: ChatCard[];
}): Promise<boolean> {
  try {
    await chatClient.updateMessage(params);
    return true;
  } catch (err) {
    console.error("[ChatDelivery] updateNow failed:", err);
    return false;
  }
}

// ─── Retry failed deliveries (called by cron) ─────────────────────────────────

export async function retryFailedDeliveries(limit = 10): Promise<number> {
  const now = new Date();
  const deliveries = await db.googleChatDelivery.findMany({
    where: {
      status: "failed_retryable",
      nextAttemptAt: { lte: now },
    },
    orderBy: { nextAttemptAt: "asc" },
    take: limit,
  });

  let retried = 0;
  for (const d of deliveries) {
    await processDelivery(d.id);
    retried++;
  }
  return retried;
}

// ─── Admin: list deliveries ───────────────────────────────────────────────────

export async function listDeliveries(params: {
  orgId?: string;
  status?: string;
  limit?: number;
}) {
  return db.googleChatDelivery.findMany({
    where: {
      ...(params.orgId ? { orgId: params.orgId } : {}),
      ...(params.status ? { status: params.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: params.limit ?? 50,
  });
}
