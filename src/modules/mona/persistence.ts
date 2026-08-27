import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type {
  GeminiContent,
  MonaCitation,
  MonaContext,
  MonaPendingAction,
} from "./types";

const PERSISTED_HISTORY_LIMIT = 24;
const MESSAGE_PREVIEW_LIMIT = 120;

export async function getOrCreateMonaConversation(params: {
  channel: string;
  currentPath: string;
  orgId?: string;
  pageLabel: string;
  sessionKey: string;
  userId: string;
}) {
  const title = params.pageLabel || "Mona conversation";

  const conversation = await db.monaConversation.upsert({
    where: {
      userId_channel_sessionKey: {
        userId: params.userId,
        channel: params.channel,
        sessionKey: params.sessionKey,
      },
    },
    update: {
      lastPath: params.currentPath,
      lastPageLabel: params.pageLabel,
      lastMessageAt: new Date(),
    },
    create: {
      orgId: params.orgId,
      userId: params.userId,
      channel: params.channel,
      sessionKey: params.sessionKey,
      title,
      lastPath: params.currentPath,
      lastPageLabel: params.pageLabel,
      lastMessageAt: new Date(),
    },
    select: {
      id: true,
      title: true,
    },
  });

  return conversation;
}

export async function loadMonaConversationHistory(
  conversationId: string,
): Promise<GeminiContent[]> {
  const persistedMessages = await db.monaConversationMessage.findMany({
    where: { conversationId },
    orderBy: { ordinal: "desc" },
    take: PERSISTED_HISTORY_LIMIT,
    select: {
      role: true,
      content: true,
      ordinal: true,
    },
  });

  return persistedMessages
    .reverse()
    .map((message) => ({
      role: message.role === "model" ? "model" : "user",
      parts: [{ text: message.content }],
    }));
}

export async function appendMonaConversationMessage(params: {
  content: string;
  contextSnapshot?: Record<string, unknown>;
  conversationId: string;
  metadata?: Record<string, unknown>;
  role: "user" | "model";
  toolNames?: string[];
}) {
  const latest = await db.monaConversationMessage.findFirst({
    where: { conversationId: params.conversationId },
    orderBy: { ordinal: "desc" },
    select: { ordinal: true },
  });

  const nextOrdinal = (latest?.ordinal ?? 0) + 1;

  await db.$transaction([
    db.monaConversationMessage.create({
      data: {
        conversationId: params.conversationId,
        ordinal: nextOrdinal,
        role: params.role,
        content: params.content,
        toolNames:
          params.toolNames && params.toolNames.length > 0
            ? (params.toolNames as Prisma.InputJsonValue)
            : undefined,
        contextSnapshot: params.contextSnapshot as Prisma.InputJsonValue | undefined,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
      },
    }),
    db.monaConversation.update({
      where: { id: params.conversationId },
      data: {
        title:
          params.role === "user"
            ? buildConversationTitle(params.content)
            : undefined,
        lastMessageAt: new Date(),
      },
    }),
  ]);
}

export async function clearPersistedMonaConversation(params: {
  channel: string;
  sessionKey: string;
  userId: string;
}) {
  await db.monaConversation.deleteMany({
    where: {
      userId: params.userId,
      channel: params.channel,
      sessionKey: params.sessionKey,
    },
  });
}

export async function recordMonaAuditEvent(params: {
  channel: string;
  conversationId?: string;
  details?: Record<string, unknown>;
  eventType: string;
  latencyMs?: number;
  orgId?: string;
  requestMessage?: string;
  responseMessage?: string;
  routePath?: string;
  sessionKey?: string;
  status: string;
  toolNames?: string[];
  userId: string;
}) {
  await db.monaAuditEvent.create({
    data: {
      orgId: params.orgId,
      userId: params.userId,
      conversationId: params.conversationId,
      channel: params.channel,
      sessionKey: params.sessionKey,
      eventType: params.eventType,
      status: params.status,
      requestMessage: params.requestMessage,
      responseMessage: params.responseMessage,
      toolNames:
        params.toolNames && params.toolNames.length > 0
          ? (params.toolNames as Prisma.InputJsonValue)
          : undefined,
      routePath: params.routePath,
      details: params.details as Prisma.InputJsonValue | undefined,
      latencyMs: params.latencyMs,
    },
  });
}

export async function listMonaConversationsForUser(params: {
  channel?: string;
  limit?: number;
  userId: string;
}) {
  const conversations = await db.monaConversation.findMany({
    where: {
      userId: params.userId,
      channel: params.channel,
    },
    orderBy: [
      { lastMessageAt: "desc" },
      { updatedAt: "desc" },
    ],
    take: params.limit ?? 12,
    select: {
      id: true,
      channel: true,
      sessionKey: true,
      title: true,
      lastPageLabel: true,
      lastPath: true,
      lastMessageAt: true,
      updatedAt: true,
      messages: {
        orderBy: { ordinal: "desc" },
        take: 1,
        select: {
          content: true,
          createdAt: true,
          role: true,
        },
      },
    },
  });

  return conversations.map((conversation) => ({
    id: conversation.id,
    channel: conversation.channel,
    sessionKey: conversation.sessionKey,
    title: conversation.title || conversation.lastPageLabel || "Mona conversation",
    lastPageLabel: conversation.lastPageLabel || "Workspace",
    lastPath: conversation.lastPath || "/dashboard",
    lastMessageAt: conversation.lastMessageAt ?? conversation.updatedAt,
    preview: conversation.messages[0]?.content ?? "",
    previewRole: conversation.messages[0]?.role ?? "model",
  }));
}

export async function getMonaConversationForUser(params: {
  conversationId: string;
  userId: string;
}) {
  return db.monaConversation.findFirst({
    where: {
      id: params.conversationId,
      userId: params.userId,
    },
    select: {
      id: true,
      channel: true,
      sessionKey: true,
      title: true,
      lastPageLabel: true,
      lastPath: true,
      messages: {
        orderBy: { ordinal: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
          toolNames: true,
          metadata: true,
        },
      },
    },
  });
}

export function extractCitationsFromMetadata(
  metadata: unknown,
): MonaCitation[] | undefined {
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }

  const citations = (metadata as { citations?: unknown }).citations;
  if (!Array.isArray(citations)) {
    return undefined;
  }

  const parsed = citations.flatMap((citation) => {
    if (!citation || typeof citation !== "object") {
      return [];
    }

    const item = citation as Record<string, unknown>;
    if (
      typeof item.id !== "string" ||
      typeof item.label !== "string" ||
      !isCitationKind(item.kind)
    ) {
      return [];
    }

    return [
      {
        id: item.id,
        kind: item.kind,
        label: item.label,
        detail: typeof item.detail === "string" ? item.detail : undefined,
        href: typeof item.href === "string" ? item.href : undefined,
      } satisfies MonaCitation,
    ];
  });

  return parsed.length > 0 ? parsed : undefined;
}

export function extractActionsFromMetadata(
  metadata: unknown,
): MonaPendingAction[] | undefined {
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }

  const actions = (metadata as { actions?: unknown }).actions;
  if (!Array.isArray(actions)) {
    return undefined;
  }

  const parsed = actions.flatMap((action) => {
    if (!action || typeof action !== "object") {
      return [];
    }

    const item = action as Record<string, unknown>;
    if (
      typeof item.id !== "string" ||
      !isActionId(item.actionId) ||
      typeof item.title !== "string" ||
      typeof item.description !== "string" ||
      typeof item.confirmationLabel !== "string" ||
      item.confirmationLevel !== "explicit_confirm" ||
      typeof item.token !== "string" ||
      typeof item.expiresAt !== "number" ||
      !Array.isArray(item.fields)
    ) {
      return [];
    }

    const fields = item.fields.flatMap((field) => {
      if (!field || typeof field !== "object") {
        return [];
      }

      const record = field as Record<string, unknown>;
      if (typeof record.label !== "string" || typeof record.value !== "string") {
        return [];
      }

      return [{ label: record.label, value: record.value }];
    });

    return [
      {
        id: item.id,
        actionId: item.actionId,
        title: item.title,
        description: item.description,
        confirmationLabel: item.confirmationLabel,
        confirmationLevel: "explicit_confirm",
        token: item.token,
        expiresAt: item.expiresAt,
        fields,
      } satisfies MonaPendingAction,
    ];
  });

  return parsed.length > 0 ? parsed : undefined;
}

function isCitationKind(value: unknown): value is MonaCitation["kind"] {
  return (
    value === "tool" ||
    value === "guide" ||
    value === "faq" ||
    value === "module" ||
    value === "document"
  );
}

function isActionId(value: unknown): value is MonaPendingAction["actionId"] {
  return (
    value === "create_task" ||
    value === "create_reminder" ||
    value === "draft_email"
  );
}

export function createSerializableContextSnapshot(ctx: MonaContext) {
  return {
    entity: ctx.entity,
    route: {
      breadcrumbs: ctx.route.breadcrumbs,
      channel: ctx.route.channel,
      moduleId: ctx.route.moduleId,
      moduleLabel: ctx.route.moduleLabel,
      pageLabel: ctx.route.pageLabel,
      pageSummary: ctx.route.pageSummary,
      path: ctx.route.path,
      routeKey: ctx.route.routeKey,
      view: ctx.route.view,
    },
    workspace: {
      accessibleModules: ctx.workspace.accessibleModules,
      permissionCount: ctx.workspace.permissionCount,
      roleSummary: ctx.workspace.roleSummary,
    },
  };
}

function buildConversationTitle(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= MESSAGE_PREVIEW_LIMIT) {
    return normalized;
  }
  return `${normalized.slice(0, MESSAGE_PREVIEW_LIMIT - 1)}…`;
}
