import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { createDraft } from "@/lib/google-gmail-client";
import { requireProductionSecret } from "@/lib/security";
import { recordMonaAuditEvent } from "./persistence";
import { createTodoTask } from "@/modules/todo/service";
import type {
  MonaActionId,
  MonaContext,
  MonaPendingAction,
} from "./types";

const MONA_ACTION_TOKEN_SECRET = requireProductionSecret(
  "MONA_ACTION_TOKEN_SECRET",
  process.env.MONA_ACTION_TOKEN_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET,
  "mona-action-dev-secret",
) || "mona-action-dev-secret";
const ACTION_TTL_MS = 15 * 60 * 1000;

export class MonaActionError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MonaActionError";
    this.status = status;
  }
}

const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  dueDate: z.string().trim().optional(),
});

const createReminderSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  alertAt: z.string().trim().min(1),
  dueDate: z.string().trim().optional(),
});

const draftEmailSchema = z.object({
  to: z.string().trim().min(1).max(500),
  cc: z.string().trim().max(500).optional(),
  bcc: z.string().trim().max(500).optional(),
  subject: z.string().trim().min(1).max(240),
  body: z.string().min(1).max(20000),
  textBody: z.string().trim().max(20000).optional(),
});

const pendingActionEnvelopeSchema = z.object({
  actionId: z.enum(["create_task", "create_reminder", "draft_email"]),
  expiresAt: z.number().int(),
  input: z.record(z.string(), z.unknown()),
  nonce: z.string().min(1),
  userId: z.string().min(1),
});

export function buildCreateTaskProposal(
  input: unknown,
  ctx: MonaContext,
): MonaPendingAction {
  const parsed = createTaskSchema.parse(input);
  return signPendingAction({
    actionId: "create_task",
    ctx,
    input: parsed,
    title: `Create task: ${parsed.title}`,
    description: "This will add a new To-Do item to your personal workspace.",
    confirmationLabel: "Create task",
    fields: [
      { label: "Title", value: parsed.title },
      ...(parsed.description
        ? [{ label: "Description", value: parsed.description }]
        : []),
      ...(parsed.dueDate ? [{ label: "Due date", value: parsed.dueDate }] : []),
    ],
  });
}

export function buildCreateReminderProposal(
  input: unknown,
  ctx: MonaContext,
): MonaPendingAction {
  const parsed = createReminderSchema.parse(input);
  return signPendingAction({
    actionId: "create_reminder",
    ctx,
    input: parsed,
    title: `Create reminder: ${parsed.title}`,
    description:
      "This will create a To-Do item with an active reminder in your personal workspace.",
    confirmationLabel: "Create reminder",
    fields: [
      { label: "Title", value: parsed.title },
      { label: "Alert time", value: parsed.alertAt },
      ...(parsed.description
        ? [{ label: "Description", value: parsed.description }]
        : []),
      ...(parsed.dueDate ? [{ label: "Due date", value: parsed.dueDate }] : []),
    ],
  });
}

export function buildDraftEmailProposal(
  input: unknown,
  ctx: MonaContext,
): MonaPendingAction {
  requireCommunicationAccess(ctx);
  const parsed = draftEmailSchema.parse(input);
  return signPendingAction({
    actionId: "draft_email",
    ctx,
    input: parsed,
    title: `Draft email: ${parsed.subject}`,
    description: "This will save a new Gmail draft in your connected workspace mail.",
    confirmationLabel: "Save draft",
    fields: [
      { label: "To", value: parsed.to },
      ...(parsed.cc ? [{ label: "Cc", value: parsed.cc }] : []),
      ...(parsed.bcc ? [{ label: "Bcc", value: parsed.bcc }] : []),
      { label: "Subject", value: parsed.subject },
    ],
  });
}

export function isMonaActionProposalResult(
  value: unknown,
): value is { actionProposal: MonaPendingAction } {
  return Boolean(
    value &&
      typeof value === "object" &&
      "actionProposal" in value &&
      (value as { actionProposal?: unknown }).actionProposal &&
      typeof (value as { actionProposal: { id?: unknown } }).actionProposal.id ===
        "string",
  );
}

export async function executeConfirmedMonaAction(params: {
  ctx: MonaContext;
  token: string;
}): Promise<{ actionId: MonaActionId; content: string }> {
  const envelope = verifyPendingActionToken(params.token, params.ctx.userId);

  switch (envelope.actionId) {
    case "create_task": {
      const parsed = createTaskSchema.parse(envelope.input);
      await createTodoTask(
        { id: params.ctx.userId, orgId: params.ctx.orgId ?? null },
        {
          title: parsed.title,
          description: parsed.description ?? "",
          dueDate: parsed.dueDate ?? "",
          reminderEnabled: false,
          alertAt: "",
          subtasks: [],
        },
      );
      await recordActionAudit(params.ctx, "create_task", {
        title: parsed.title,
        dueDate: parsed.dueDate ?? null,
      });
      return {
        actionId: "create_task",
        content: `I created the task **${parsed.title}** in **/todo**.`,
      };
    }
    case "create_reminder": {
      const parsed = createReminderSchema.parse(envelope.input);
      await createTodoTask(
        { id: params.ctx.userId, orgId: params.ctx.orgId ?? null },
        {
          title: parsed.title,
          description: parsed.description ?? "",
          dueDate: parsed.dueDate ?? "",
          reminderEnabled: true,
          alertAt: parsed.alertAt,
          subtasks: [],
        },
      );
      await recordActionAudit(params.ctx, "create_reminder", {
        title: parsed.title,
        dueDate: parsed.dueDate ?? null,
        alertAt: parsed.alertAt,
      });
      return {
        actionId: "create_reminder",
        content: `I created the reminder **${parsed.title}** and scheduled it for **${parsed.alertAt}** in **/todo**.`,
      };
    }
    case "draft_email": {
      requireCommunicationAccess(params.ctx);
      const parsed = draftEmailSchema.parse(envelope.input);
      await createDraft({
        userId: params.ctx.userId,
        to: parsed.to,
        cc: parsed.cc,
        bcc: parsed.bcc,
        subject: parsed.subject,
        body: parsed.body,
        textBody: parsed.textBody,
        attachments: [],
      });
      await recordActionAudit(params.ctx, "draft_email", {
        to: parsed.to,
        subject: parsed.subject,
      });
      return {
        actionId: "draft_email",
        content: `I saved a Gmail draft for **${parsed.to}** with subject **${parsed.subject}**.`,
      };
    }
  }
}

function signPendingAction(params: {
  actionId: MonaActionId;
  confirmationLabel: string;
  ctx: MonaContext;
  description: string;
  fields: MonaPendingAction["fields"];
  input: Record<string, unknown>;
  title: string;
}): MonaPendingAction {
  const expiresAt = Date.now() + ACTION_TTL_MS;
  const envelope = {
    actionId: params.actionId,
    expiresAt,
    input: params.input,
    nonce: randomUUID(),
    userId: params.ctx.userId,
  };
  const serialized = JSON.stringify(envelope);
  const payload = Buffer.from(serialized, "utf8").toString("base64url");
  const signature = createHmac("sha256", MONA_ACTION_TOKEN_SECRET)
    .update(payload)
    .digest("base64url");

  return {
    id: `mona-action-${randomUUID()}`,
    actionId: params.actionId,
    title: params.title,
    description: params.description,
    confirmationLabel: params.confirmationLabel,
    confirmationLevel: "explicit_confirm",
    token: `${payload}.${signature}`,
    expiresAt,
    fields: params.fields,
  };
}

function verifyPendingActionToken(token: string, userId: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    throw new MonaActionError("Action confirmation token is invalid.", 400);
  }

  const expectedSignature = createHmac("sha256", MONA_ACTION_TOKEN_SECRET)
    .update(payload)
    .digest("base64url");

  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new MonaActionError(
      "Action confirmation token could not be verified.",
      400,
    );
  }

  const json = Buffer.from(payload, "base64url").toString("utf8");
  const envelope = pendingActionEnvelopeSchema.parse(JSON.parse(json));

  if (envelope.userId !== userId) {
    throw new MonaActionError(
      "This action proposal belongs to a different user.",
      403,
    );
  }
  if (Date.now() > envelope.expiresAt) {
    throw new MonaActionError(
      "This action proposal has expired. Please ask Mona again.",
      410,
    );
  }

  return envelope;
}

async function recordActionAudit(
  ctx: MonaContext,
  actionId: MonaActionId,
  details: Record<string, unknown>,
) {
  await recordMonaAuditEvent({
    orgId: ctx.orgId,
    userId: ctx.userId,
    channel: ctx.route.channel,
    eventType: "action.execute",
    status: "success",
    routePath: ctx.currentPath,
    details: {
      actionId,
      moduleId: ctx.route.moduleId,
      routeKey: ctx.route.routeKey,
      ...details,
    },
  });
}

function requireCommunicationAccess(ctx: MonaContext) {
  if (!ctx.permissions.includes("communication.mail.access")) {
    throw new MonaActionError(
      "Communication mail access is required to save a draft email.",
      403,
    );
  }
}
