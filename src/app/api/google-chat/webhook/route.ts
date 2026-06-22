// ─── Google Chat Interaction Webhook ─────────────────────────────────────────
// Receives ALL interaction events from Google Chat.
// Validates, deduplicates, resolves identity, dispatches to commands or AI.

import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookToken } from "@/lib/google-chat-client";
import { resolveIdentity, tryAutoLink, generateLinkToken } from "@/modules/google-chat/identity";
import { handleCommand } from "@/modules/google-chat/commands";
import { processMessage } from "@/modules/google-chat/gateway";
import { buildConnectCard, buildAiResponseCard, buildErrorCard, buildProcessingCard } from "@/modules/google-chat/cards";
import { upsertSpace, markBotRemoved, getSpaceByResource } from "@/modules/google-chat/space";
import { db } from "@/lib/db";
import type { ChatInteractionEvent } from "@/modules/google-chat/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    return await handlePost(req);
  } catch (err) {
    console.error("[GoogleChat Webhook] Unhandled error:", err);
    return NextResponse.json({ error: "Internal error", detail: String(err) }, { status: 500 });
  }
}

async function handlePost(req: NextRequest) {
  // ── 1. Authenticate the request ──────────────────────────────────────────
  const authHeader = req.headers.get("authorization") ?? "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  const authResult = await verifyWebhookToken(bearerToken);
  if (!authResult.valid) {
    console.warn("[GoogleChat Webhook] Unauthorized request rejected");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Parse event (supports both classic Chat App and Workspace Add-on formats) ─
  let raw: Record<string, unknown>;
  try {
    raw = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Detect format — Workspace Add-on has commonEventObject at root
  const isAddon = typeof (raw as Record<string, unknown>).commonEventObject !== "undefined";

  // Normalize Workspace Add-on format → classic Chat App format
  const event: ChatInteractionEvent = normalizeEvent(raw);

  // Build a format-aware reply helper
  const reply = (msg: { text?: string; cardsV2?: unknown[] }) =>
    NextResponse.json(isAddon ? addonWrap(msg) : msg);

  const spaceResourceName = event.space?.name ?? "";
  const userResourceName = event.user?.name ?? "";
  const googleUserId = userResourceName;
  const googleEmail = event.user?.email;
  const googleDisplayName = event.user?.displayName;
  const eventType = event.type ?? "MESSAGE";
  const messageText = event.message?.text?.replace(/^@\S+\s*/u, "").trim() ?? "";
  const eventId = `${eventType}:${spaceResourceName}:${event.message?.name ?? event.user?.name ?? Date.now()}`;

  // ── 3. Deduplicate ────────────────────────────────────────────────────────
  const existing = await db.googleChatInteractionEvent.findUnique({
    where: { googleEventId: eventId },
  });
  if (existing) {
    return NextResponse.json({}, { status: 200 });
  }

  await db.googleChatInteractionEvent.create({
    data: {
      googleEventId: eventId,
      spaceResourceName,
      userResourceName,
      eventType,
    },
  });

  // ── 4. Handle lifecycle events ────────────────────────────────────────────
  if (eventType === "ADDED_TO_SPACE") {
    await upsertSpace({
      spaceResourceName,
      displayName: event.space?.displayName,
      spaceType: event.space?.spaceType ?? "SPACE",
    });

    // Greet the space
    return reply({
      text: "👋 *Monolith AI Assistant* has joined! I can help your team with tasks, approvals, job updates, and more.\n\nType `/help` to see what I can do, or just ask me anything in natural language.",
    });
  }

  if (eventType === "REMOVED_FROM_SPACE") {
    await markBotRemoved(spaceResourceName);
    return NextResponse.json({}, { status: 200 });
  }

  // ── 5. Resolve Monolith identity ──────────────────────────────────────────
  let identity = await resolveIdentity(googleUserId, googleEmail, googleDisplayName);

  // Auto-link on Workspace domain match (if not already linked)
  if (!identity.linked && googleEmail) {
    const autoResult = await tryAutoLink(googleUserId, googleEmail, googleDisplayName ?? "");
    if (autoResult.linked) {
      identity = await resolveIdentity(googleUserId, googleEmail, googleDisplayName);
    }
  }

  // ── 6. Handle slash commands ──────────────────────────────────────────────
  if (eventType === "MESSAGE" && event.message?.slashCommand) {
    const cmd = event.message.slashCommand.commandName ?? "";
    const args = (event.message.argumentText ?? "").trim();

    const result = await handleCommand({
      commandName: cmd,
      args,
      identity,
      spaceResourceName,
      googleUserId,
      googleEmail,
      googleDisplayName,
    });

    if (result.type === "text") {
      return reply({ text: result.text });
    }
    return reply({ cardsV2: result.cardsV2 });
  }

  // ── 7. Handle card button clicks ──────────────────────────────────────────
  if (eventType === "CARD_CLICKED" && event.action?.actionMethodName) {
    return handleCardAction({
      actionName: event.action.actionMethodName,
      parameters: event.action.parameters ?? [],
      identity,
      spaceResourceName,
      googleUserId,
      googleEmail,
      googleDisplayName,
      isAddon,
    });
  }

  // ── 8. Handle natural language messages ───────────────────────────────────
  if (eventType === "MESSAGE" && messageText) {
    if (!identity.linked) {
      const token = await generateLinkToken({
        googleUserId,
        googleEmail,
        googleDisplayName,
        spaceResourceName,
      });
      return reply({ cardsV2: buildConnectCard({ linkToken: token, googleDisplayName }) });
    }

    // Get space context for AI
    const space = await getSpaceByResource(spaceResourceName);

    // Respond immediately for short queries, process synchronously within 30s window
    const aiResponse = await processMessage({
      userId: identity.userId,
      userName: identity.userName,
      orgId: identity.orgId,
      permissions: identity.permissions,
      isAdmin: false,
      message: messageText,
      sessionId: `gchat:${spaceResourceName}:${googleUserId}`,
      channel: "google_chat",
      spaceResourceName,
      spaceLinkedRecordType: space?.linkedRecordType,
      spaceLinkedRecordId: space?.linkedRecordId,
    });

    return reply({ cardsV2: buildAiResponseCard(aiResponse) });
  }

  return NextResponse.json({}, { status: 200 });
}

// ─── Card action dispatcher ───────────────────────────────────────────────────

async function handleCardAction(params: {
  actionName: string;
  parameters: { key: string; value: string }[];
  identity: import("@/modules/google-chat/types").ResolvedChatIdentity;
  spaceResourceName: string;
  googleUserId: string;
  googleEmail?: string;
  googleDisplayName?: string;
  isAddon?: boolean;
}): Promise<NextResponse> {
  const getParam = (key: string) =>
    params.parameters.find((p) => p.key === key)?.value;
  const reply = (msg: { text?: string; cardsV2?: unknown[] }) =>
    NextResponse.json(params.isAddon ? addonWrap(msg) : msg);

  switch (params.actionName) {
    case "disconnect_account": {
      if (params.identity.linked) {
        const { revokeLink } = await import("@/modules/google-chat/identity");
        await revokeLink(params.identity.userId);
        return reply({ text: "✅ Your Monolith account has been disconnected from Google Chat." });
      }
      return reply({ text: "No linked account found." });
    }

    case "acknowledge_notification": {
      const notifId = getParam("notificationId");
      if (notifId && params.identity.linked) {
        const { acknowledgeNotification } = await import("@/modules/notifications/service");
        await acknowledgeNotification(params.identity.userId, notifId).catch(() => {});
        return reply({ text: "✅ Acknowledged." });
      }
      return reply({ text: "Could not acknowledge — please try in Monolith." });
    }

    case "unlink_space": {
      const { unlinkSpace } = await import("@/modules/google-chat/space");
      await unlinkSpace(params.spaceResourceName);
      return reply({ text: "🔓 This space has been unlinked from the Monolith record." });
    }

    default: {
      console.warn("[GoogleChat Webhook] Unknown card action:", params.actionName);
      return reply({ text: "This action is not supported." });
    }
  }
}

// ─── Workspace Add-on response wrapper ───────────────────────────────────────
// Add-on format wraps responses in hostAppDataAction.chatDataAction

function addonWrap(msg: { text?: string; cardsV2?: unknown[] }) {
  return {
    hostAppDataAction: {
      chatDataAction: {
        createMessageAction: {
          message: msg,
        },
      },
    },
  };
}

// ─── Normalize both event formats to the classic Chat App shape ───────────────
// Classic:   { type, space, user, message, action }
// Add-on:    { commonEventObject, chat: { user, messagePayload: { space, message } } }

function normalizeEvent(raw: Record<string, unknown>): ChatInteractionEvent {
  // Already classic format
  if (typeof raw.type === "string") return raw as unknown as ChatInteractionEvent;

  // Workspace Add-on format
  const chat = raw.chat as Record<string, unknown> | undefined;
  if (!chat) return raw as unknown as ChatInteractionEvent;

  const user = chat.user as Record<string, unknown> | undefined;
  const messagePayload = chat.messagePayload as Record<string, unknown> | undefined;
  const actionResponsePayload = chat.actionResponsePayload as Record<string, unknown> | undefined;

  const space = (messagePayload?.space ?? actionResponsePayload?.space) as Record<string, unknown> | undefined;
  const message = (messagePayload?.message ?? actionResponsePayload?.message) as Record<string, unknown> | undefined;

  // Determine event type from payload shape
  let type: string = "MESSAGE";
  if (messagePayload && message) {
    const slashCmd = (message as Record<string, unknown>).slashCommand;
    type = slashCmd ? "MESSAGE" : "MESSAGE";
  } else if (actionResponsePayload) {
    type = "CARD_CLICKED";
  } else if (chat.addedToSpacePayload) {
    type = "ADDED_TO_SPACE";
  } else if (chat.removedFromSpacePayload) {
    type = "REMOVED_FROM_SPACE";
  }

  // Extract card action details if present
  const action = actionResponsePayload
    ? {
        actionMethodName: (actionResponsePayload.actionMethod as string) ?? undefined,
        parameters: (actionResponsePayload.parameters as { key: string; value: string }[]) ?? [],
      }
    : undefined;

  return {
    type: type as ChatInteractionEvent["type"],
    space: space ? { name: String(space.name ?? ""), displayName: space.displayName as string | undefined, type: space.type as string | undefined, spaceType: space.spaceType as string | undefined } : undefined,
    user: user ? { name: String(user.name ?? ""), displayName: user.displayName as string | undefined, email: user.email as string | undefined, type: user.type as string | undefined } : undefined,
    message: message ? {
      name: String(message.name ?? ""),
      text: message.text as string | undefined,
      argumentText: message.argumentText as string | undefined,
      slashCommand: message.slashCommand as { commandId: string; commandName: string } | undefined,
      thread: message.thread as { name: string } | undefined,
    } : undefined,
    action,
  };
}
