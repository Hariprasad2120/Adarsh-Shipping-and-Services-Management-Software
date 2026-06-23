// ─── Google Chat Slash Command Handlers ──────────────────────────────────────

import type { ChatCard } from "@/lib/google-chat-client";
import {
  buildHelpCard,
  buildStatusCard,
  buildTasksCard,
  buildConnectCard,
  buildPrivacyCard,
  buildSpaceLinkedCard,
  buildErrorCard,
} from "./cards";
import { generateLinkToken, revokeLink } from "./identity";
import { linkSpaceToRecord, unlinkSpace, upsertSubscription, getSpaceByResource } from "./space";
import { processMessage, resetSession } from "./gateway";
import { db } from "@/lib/db";
import type { ResolvedChatIdentity } from "./types";
import { getAppUrl } from "@/lib/app-url";

// ─── Shared params type (all command handlers receive this) ──────────────────

type CommandParams = {
  commandName: string;
  args: string;
  identity: ResolvedChatIdentity;
  spaceResourceName: string;
  googleUserId: string;
  googleEmail?: string;
  googleDisplayName?: string;
};

export type CommandResult =
  | { type: "text"; text: string }
  | { type: "cards"; cardsV2: ChatCard[] };

const APP_URL = getAppUrl();

// ─── Dispatch a slash command ─────────────────────────────────────────────────

export async function handleCommand(params: CommandParams): Promise<CommandResult> {
  const cmd = params.commandName.toLowerCase().replace(/_/g, "-");

  switch (cmd) {
    case "/help":
      return params.identity.linked
        ? { type: "cards", cardsV2: buildHelpCard(params.identity.userName) }
        : buildConnectPrompt(params);

    case "/connect":
      return buildConnectPrompt(params);

    case "/status":
      return handleStatus(params);

    case "/tasks":
      return handleTasks(params);

    case "/approvals":
      return handleApprovals(params);

    case "/search":
      return handleSearch(params);

    case "/link-job":
    case "/link_job":
      return handleLinkJob(params);

    case "/unlink-job":
    case "/unlink_job":
      return handleUnlinkJob(params);

    case "/subscribe":
      return handleSubscribe(params);

    case "/unsubscribe":
      return handleUnsubscribe(params);

    case "/summary":
      return handleSummary(params);

    case "/reset":
      return handleReset(params);

    case "/privacy":
      return { type: "cards", cardsV2: buildPrivacyCard() };

    case "/feedback":
      return {
        type: "text",
        text: "Thank you! To submit feedback, please contact your Monolith administrator or use the feedback option inside Monolith Engine.",
      };

    default:
      return {
        type: "text",
        text: `Unknown command: \`${params.commandName}\`. Try \`/help\` to see available commands.`,
      };
  }
}

// ─── Connect prompt (shared helper) ──────────────────────────────────────────

async function buildConnectPrompt(params: CommandParams): Promise<CommandResult> {
  const token = await generateLinkToken({
    googleUserId: params.googleUserId,
    googleEmail: params.googleEmail,
    googleDisplayName: params.googleDisplayName,
    spaceResourceName: params.spaceResourceName,
  });
  return {
    type: "cards",
    cardsV2: buildConnectCard({ linkToken: token, googleDisplayName: params.googleDisplayName }),
  };
}

// ─── Individual command implementations ──────────────────────────────────────

async function handleStatus(params: CommandParams): Promise<CommandResult> {
  if (!params.identity.linked) return buildConnectPrompt(params);

  const space = await getSpaceByResource(params.spaceResourceName);
  const link = await db.googleChatUserLink.findUnique({
    where: { googleUserId: params.googleUserId },
  });

  return {
    type: "cards",
    cardsV2: buildStatusCard({
      userName: params.identity.userName,
      googleEmail: params.identity.googleEmail,
      linkedAt: link?.linkedAt,
      orgId: params.identity.orgId,
      spaceLinkedJob: space?.linkedRecordLabel ?? null,
    }),
  };
}

async function handleTasks(params: CommandParams): Promise<CommandResult> {
  if (!params.identity.linked) return buildConnectPrompt(params);

  const [todoTasks, hrmsTasks] = await Promise.all([
    db.todoTask.findMany({
      where: { userId: params.identity.userId, status: "PENDING" },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    db.hrmsTask.findMany({
      where: { assigneeId: params.identity.userId, status: "PENDING" },
      orderBy: { dueDate: "asc" },
      take: 4,
    }),
  ]);

  const allTasks = [
    ...todoTasks.map((t) => ({
      title: t.title,
      dueDate: t.dueDate ? t.dueDate.toLocaleDateString("en-IN") : "No due date",
      status: t.status,
    })),
    ...hrmsTasks.map((t) => ({
      title: t.title,
      dueDate: t.dueDate.toLocaleDateString("en-IN"),
      status: t.status,
      priority: t.priority,
    })),
  ];

  return {
    type: "cards",
    cardsV2: buildTasksCard({ tasks: allTasks, totalCount: allTasks.length }),
  };
}

async function handleApprovals(params: CommandParams): Promise<CommandResult> {
  if (!params.identity.linked) return buildConnectPrompt(params);

  const pendingLeaves = await db.leaveRequest.count({
    where: { approverId: params.identity.userId, status: "pending" },
  });

  if (pendingLeaves === 0) {
    return { type: "text", text: "✅ No pending approvals. You're all clear!" };
  }

  const leaveList = await db.leaveRequest.findMany({
    where: { approverId: params.identity.userId, status: "pending" },
    include: {
      user: { select: { name: true } },
      leaveType: { select: { name: true } },
    },
    take: 5,
  });

  const lines = leaveList.map(
    (l) =>
      `• *${l.user.name}* — ${l.leaveType.name} (${l.fromDate.toLocaleDateString("en-IN")} to ${l.toDate.toLocaleDateString("en-IN")})`
  );

  return {
    type: "text",
    text: `📋 *Pending Approvals (${pendingLeaves}):*\n${lines.join("\n")}\n\nOpen Monolith to approve/reject: ${APP_URL}/attendance/leaves`,
  };
}

async function handleSearch(params: CommandParams): Promise<CommandResult> {
  if (!params.identity.linked) return buildConnectPrompt(params);

  if (!params.args.trim()) {
    return { type: "text", text: "Usage: `/search <query>`\nExample: `/search Ravi Kumar`" };
  }

  const response = await processMessage({
    userId: params.identity.userId,
    userName: params.identity.userName,
    orgId: params.identity.orgId,
    permissions: params.identity.permissions,
    isAdmin: false,
    message: `Search for: ${params.args}`,
    sessionId: `gchat:search:${params.identity.userId}`,
    channel: "google_chat",
  });

  return { type: "text", text: response.content };
}

async function handleLinkJob(params: CommandParams): Promise<CommandResult> {
  if (!params.identity.linked) return buildConnectPrompt(params);

  const recordLabel = params.args.trim();
  if (!recordLabel) {
    return {
      type: "text",
      text: "Usage: `/link-job <job-number>`\nExample: `/link-job ASS-2026-0042`",
    };
  }

  const result = await linkSpaceToRecord({
    spaceResourceName: params.spaceResourceName,
    recordType: "JOB",
    recordId: recordLabel,
    recordLabel,
    linkedByUserId: params.identity.userId,
    orgId: params.identity.orgId,
  });

  if (!result.success) {
    return { type: "cards", cardsV2: buildErrorCard({ message: result.error! }) };
  }

  return {
    type: "cards",
    cardsV2: buildSpaceLinkedCard({
      recordType: "Job",
      recordId: recordLabel,
      recordLabel,
      linkedBy: params.identity.userName,
    }),
  };
}

async function handleUnlinkJob(params: CommandParams): Promise<CommandResult> {
  if (!params.identity.linked) return buildConnectPrompt(params);

  await unlinkSpace(params.spaceResourceName);
  return {
    type: "text",
    text: "🔓 Space has been unlinked from the job. Notifications for this space will stop.",
  };
}

async function handleSubscribe(params: CommandParams): Promise<CommandResult> {
  if (!params.identity.linked) return buildConnectPrompt(params);

  const space = await db.googleChatSpace.findUnique({
    where: { spaceResourceName: params.spaceResourceName },
  });

  if (!space) {
    await upsertSubscription({
      orgId: params.identity.orgId,
      userId: params.identity.userId,
      channel: "DM",
      eventKinds: ["TASK_REMINDER", "LEAVE_STATUS", "NOTIFICATION"],
    });
    return {
      type: "text",
      text: "✅ Subscribed to notifications in your DMs. Use `/unsubscribe` to stop.",
    };
  }

  await upsertSubscription({
    orgId: params.identity.orgId,
    spaceId: space.id,
    channel: "SPACE",
    eventKinds: ["JOB_UPDATE", "TASK_DUE", "APPROVAL_REQUEST", "DOCUMENT_DEADLINE"],
  });
  return {
    type: "text",
    text: "✅ Space subscribed to job/workflow notifications. Use `/unsubscribe` to stop.",
  };
}

async function handleUnsubscribe(params: CommandParams): Promise<CommandResult> {
  if (!params.identity.linked) {
    return { type: "text", text: "No active subscriptions." };
  }

  const space = await db.googleChatSpace.findUnique({
    where: { spaceResourceName: params.spaceResourceName },
  });

  if (space) {
    await db.googleChatSubscription.updateMany({
      where: { spaceId: space.id },
      data: { enabled: false },
    });
  } else {
    await db.googleChatSubscription.updateMany({
      where: { userId: params.identity.userId },
      data: { enabled: false },
    });
  }

  return {
    type: "text",
    text: "🔕 Unsubscribed. You will no longer receive notifications here.",
  };
}

async function handleSummary(params: CommandParams): Promise<CommandResult> {
  if (!params.identity.linked) return buildConnectPrompt(params);

  const space = await getSpaceByResource(params.spaceResourceName);
  const context = space?.linkedRecordLabel
    ? `This space is linked to job/project: ${space.linkedRecordLabel}. Provide a summary of pending items, tasks, and updates related to it.`
    : "Provide a summary of my pending work, overdue items, and important notifications.";

  const response = await processMessage({
    userId: params.identity.userId,
    userName: params.identity.userName,
    orgId: params.identity.orgId,
    permissions: params.identity.permissions,
    isAdmin: false,
    message: context,
    sessionId: `gchat:summary:${params.identity.userId}`,
    channel: "google_chat",
    spaceResourceName: params.spaceResourceName,
    spaceLinkedRecordType: space?.linkedRecordType,
    spaceLinkedRecordId: space?.linkedRecordId,
  });

  return { type: "text", text: response.content };
}

async function handleReset(params: CommandParams): Promise<CommandResult> {
  if (params.identity.linked) {
    resetSession({
      userId: params.identity.userId,
      channel: "google_chat",
      spaceResourceName: params.spaceResourceName,
    });
  }
  return { type: "text", text: "🔄 Conversation context has been reset." };
}
