import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { listUpcomingEvents } from "@/lib/google-calendar-client";
import { listSpaces } from "@/lib/google-chat-client";
import { listLabels, listThreads } from "@/lib/google-gmail-client";
import { getValidAccessToken } from "@/lib/workspace-oauth";
import {
  type CommunicationOverviewDashboardProps,
  CommunicationOverviewDashboard,
} from "@/modules/communication/components/communication-overview-dashboard";

const CHAT_API_BASE = "https://chat.googleapis.com/v1";
const DAYS_IN_WINDOW = 7;

type Thread = Awaited<ReturnType<typeof listThreads>>["threads"][number];
type Meeting = Awaited<ReturnType<typeof listUpcomingEvents>>[number];
type WorkspaceLabel = NonNullable<Awaited<ReturnType<typeof listLabels>>["labels"]>[number];
type ChatSpace = Awaited<ReturnType<typeof listSpaces>>[number];

type ChatSignal = {
  hasMention: boolean;
  isMe: boolean;
  latestTime: string;
  senderDisplayName: string;
  snippet: string;
  spaceId: string;
  spaceType: string;
  title: string;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getDayKey(date: Date) {
  return startOfDay(date).toISOString().slice(0, 10);
}

function parseGoogleApiError(errorMessage: string | null) {
  if (
    !errorMessage ||
    !(
      errorMessage.includes("API has not been used") ||
      errorMessage.includes("SERVICE_DISABLED") ||
      errorMessage.includes("accessNotConfigured")
    )
  ) {
    return null;
  }

  const activationUrl =
    errorMessage.match(/https:\/\/console\.[^\s"'}]+/)?.[0] ??
    "https://console.cloud.google.com/apis/dashboard";
  const lower = errorMessage.toLowerCase();
  const apiName = lower.includes("gmail")
    ? "Gmail API"
    : lower.includes("calendar")
      ? "Google Calendar API"
      : lower.includes("chat")
        ? "Google Chat API"
        : "Google Workspace API";

  return { activationUrl, apiName };
}

function formatTimeLabel(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function formatDateLabel(value: Date) {
  const now = new Date();
  const sameDay =
    value.getFullYear() === now.getFullYear() &&
    value.getMonth() === now.getMonth() &&
    value.getDate() === now.getDate();

  if (sameDay) {
    return formatTimeLabel(value);
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function formatRelativeTime(date: Date) {
  const deltaMs = date.getTime() - Date.now();
  const absMs = Math.abs(deltaMs);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absMs < 60 * 60 * 1000) {
    return rtf.format(Math.round(deltaMs / (60 * 1000)), "minute");
  }
  if (absMs < 24 * 60 * 60 * 1000) {
    return rtf.format(Math.round(deltaMs / (60 * 60 * 1000)), "hour");
  }
  return rtf.format(Math.round(deltaMs / (24 * 60 * 60 * 1000)), "day");
}

function getEventDateTime(value: { dateTime?: string; date?: string }) {
  return value.dateTime || value.date || "";
}

function parseDateSafely(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getThreadSender(value: string) {
  return value.split(" <")[0]?.trim() || value.trim() || "Unknown sender";
}

function truncate(value: string, max = 120) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}

function buildTrendCounts(
  values: Date[],
  options?: { direction?: "past" | "future"; days?: number },
) {
  const days = options?.days ?? DAYS_IN_WINDOW;
  const direction = options?.direction ?? "past";
  const today = startOfDay(new Date());
  const keys = Array.from({ length: days }, (_, index) =>
    getDayKey(addDays(today, direction === "future" ? index : index - (days - 1))),
  );
  const counts = new Map(keys.map((key) => [key, 0]));

  for (const value of values) {
    const key = getDayKey(value);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return keys.map((key) => counts.get(key) ?? 0);
}

async function listRecentChatSignals(params: {
  googleUserId: string;
  spaces: ChatSpace[];
  userId: string;
}) {
  if (params.spaces.length === 0) {
    return [] as ChatSignal[];
  }

  const token = await getValidAccessToken(params.userId);
  const results = await Promise.allSettled(
    params.spaces.slice(0, 8).map(async (space) => {
      const response = await fetch(
        `${CHAT_API_BASE}/${space.name}/messages?pageSize=1&orderBy=createTime%20desc`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as {
        messages?: Array<{
          annotations?: Array<{
            type?: string;
            userMention?: { user?: { name?: string } };
          }>;
          createTime?: string;
          formattedText?: string;
          name?: string;
          sender?: { displayName?: string; name?: string };
          text?: string;
        }>;
      };

      const message = data.messages?.[0];
      if (!message?.createTime) {
        return null;
      }

      const senderId = message.sender?.name?.replace("users/", "");

      return {
        hasMention:
          (message.annotations ?? []).some(
            (annotation) =>
              annotation.type === "USER_MENTION" &&
              annotation.userMention?.user?.name === `users/${params.googleUserId}`,
          ) ?? false,
        isMe: senderId === params.googleUserId,
        latestTime: message.createTime,
        senderDisplayName: message.sender?.displayName || "Unknown sender",
        snippet: truncate(message.text || message.formattedText || "Recent chat activity"),
        spaceId: space.name,
        spaceType: space.spaceType,
        title: space.displayName || "Google Chat space",
      } satisfies ChatSignal;
    }),
  );

  return results
    .filter((result): result is PromiseFulfilledResult<ChatSignal | null> => result.status === "fulfilled")
    .map((result) => result.value)
    .filter((value): value is ChatSignal => Boolean(value))
    .sort((left, right) => right.latestTime.localeCompare(left.latestTime));
}

export default async function CommunicationDashboard() {
  const session = await getSession();
  if (!session?.user?.orgId) return null;

  const orgId = session.user.orgId;
  const now = new Date();
  const sevenDaysAgo = startOfDay(addDays(now, -(DAYS_IN_WINDOW - 1)));
  const sevenDaysAhead = addDays(startOfDay(now), DAYS_IN_WINDOW);

  const [connection, activeJobCount, workspaceProfiles, auditEvents] =
    await Promise.all([
      db.googleWorkspaceConnection.findUnique({
        where: { userId: session.user.id },
      }),
      db.chaJob.count({
        where: {
          orgId,
          deletedAt: null,
        },
      }),
      db.jobWorkspaceProfile.findMany({
        where: { orgId },
        select: {
          chatSpaceDeleteStatus: true,
          googleSpaceId: true,
          lastError: true,
          provisioningStatus: true,
          rootFolderId: true,
          updatedAt: true,
          job: {
            select: {
              deletedAt: true,
              id: true,
              jobNumber: true,
              title: true,
            },
          },
        },
      }),
      db.communicationAuditEvent.findMany({
        where: {
          orgId,
          createdAt: { gte: sevenDaysAgo },
        },
        select: {
          action: true,
          createdAt: true,
        },
      }),
    ]);

  const activeProfiles = workspaceProfiles.filter((profile) => !profile.job.deletedAt);
  const activeChatProfiles = activeProfiles.filter((profile) => Boolean(profile.googleSpaceId));
  const driveReadyProfiles = activeProfiles.filter((profile) => Boolean(profile.rootFolderId));
  const failedProvisionProfiles = activeProfiles.filter(
    (profile) => profile.provisioningStatus === "failed",
  );
  const pendingProvisionProfiles = activeProfiles.filter(
    (profile) => profile.provisioningStatus !== "success",
  );
  const deletedCleanupProfiles = workspaceProfiles.filter(
    (profile) =>
      Boolean(profile.job.deletedAt) &&
      (Boolean(profile.googleSpaceId) ||
        Boolean(profile.rootFolderId) ||
        profile.chatSpaceDeleteStatus === "FAILED"),
  );
  const cleanupFailedProfiles = deletedCleanupProfiles.filter(
    (profile) => profile.chatSpaceDeleteStatus === "FAILED",
  );

  let labels: WorkspaceLabel[] = [];
  let threads: Thread[] = [];
  let meetings: Meeting[] = [];
  let chatSpaces: ChatSpace[] = [];
  let chatSignals: ChatSignal[] = [];
  let mailError: string | null = null;
  let meetingError: string | null = null;
  let chatError: string | null = null;

  if (connection?.status === "connected") {
    const [labelResult, threadResult, meetingResult, chatSpaceResult] =
      await Promise.allSettled([
        listLabels(session.user.id),
        listThreads({ userId: session.user.id, maxResults: 12 }),
        listUpcomingEvents({ userId: session.user.id, maxResults: 12 }),
        listSpaces(session.user.id),
      ]);

    if (labelResult.status === "fulfilled") {
      labels = labelResult.value.labels ?? [];
    } else {
      mailError =
        labelResult.reason instanceof Error
          ? labelResult.reason.message
          : "Failed to load mailbox labels.";
    }

    if (threadResult.status === "fulfilled") {
      threads = threadResult.value.threads ?? [];
    } else {
      mailError =
        threadResult.reason instanceof Error
          ? threadResult.reason.message
          : mailError ?? "Failed to load mailbox activity.";
    }

    if (meetingResult.status === "fulfilled") {
      meetings = meetingResult.value;
    } else {
      meetingError =
        meetingResult.reason instanceof Error
          ? meetingResult.reason.message
          : "Failed to load calendar activity.";
    }

    if (chatSpaceResult.status === "fulfilled") {
      chatSpaces = chatSpaceResult.value;
      try {
        chatSignals = await listRecentChatSignals({
          googleUserId: connection.googleUserId,
          spaces: chatSpaces,
          userId: session.user.id,
        });
      } catch (error) {
        chatError =
          error instanceof Error
            ? error.message
            : "Failed to load recent chat activity.";
      }
    } else {
      chatError =
        chatSpaceResult.reason instanceof Error
          ? chatSpaceResult.reason.message
          : "Failed to load Google Chat spaces.";
    }
  }

  const inboxLabel = labels.find((label) => label.id === "INBOX" || label.name === "INBOX");
  const unreadMailCount =
    inboxLabel?.threadsUnread ??
    inboxLabel?.messagesUnread ??
    threads.filter((thread) => thread.isUnread).length;

  const meetingDates = meetings
    .map((meeting) => parseDateSafely(getEventDateTime(meeting.start)))
    .filter((value): value is Date => Boolean(value));
  const meetingsWithinSevenDays = meetings.filter((meeting) => {
    const start = parseDateSafely(getEventDateTime(meeting.start));
    return Boolean(start && start >= now && start <= sevenDaysAhead);
  });

  const emailTrendDates = threads
    .map((thread) => parseDateSafely(thread.date))
    .filter((value): value is Date => value instanceof Date && value >= sevenDaysAgo);
  const meetingTrendDates = meetingDates.filter((value) => value <= sevenDaysAhead);

  const recentEmails: CommunicationOverviewDashboardProps["emails"] = threads
    .slice(0, 5)
    .map((thread) => ({
      href: `/communication/mail?threadId=${encodeURIComponent(thread.id)}`,
      id: thread.id,
      sender: getThreadSender(thread.from),
      snippet: truncate(thread.snippet, 90),
      subject: thread.subject || "(no subject)",
      timestamp: parseDateSafely(thread.date)
        ? formatDateLabel(parseDateSafely(thread.date)!)
        : "Recent",
      unread: thread.isUnread,
    }));

  const recentChats: CommunicationOverviewDashboardProps["chats"] = chatSignals
    .slice(0, 5)
    .map((signal) => ({
      badge: signal.spaceType === "DIRECT_MESSAGE" ? "Direct" : undefined,
      href: `/communication/chat?spaceId=${encodeURIComponent(signal.spaceId)}`,
      id: signal.spaceId,
      snippet: signal.snippet,
      subtitle: signal.isMe
        ? "Last updated by you"
        : `Last message from ${signal.senderDisplayName}`,
      timestamp: formatRelativeTime(new Date(signal.latestTime)),
      title: signal.title,
    }));

  const mentionRows: CommunicationOverviewDashboardProps["mentions"] = chatSignals
    .filter((signal) => signal.hasMention)
    .slice(0, 5)
    .map((signal) => ({
      badge: "Mention",
      href: `/communication/chat?spaceId=${encodeURIComponent(signal.spaceId)}`,
      id: signal.spaceId,
      snippet: signal.snippet,
      subtitle: `Mention by ${signal.senderDisplayName}`,
      timestamp: formatRelativeTime(new Date(signal.latestTime)),
      title: signal.title,
    }));

  const upcomingMeetings: CommunicationOverviewDashboardProps["meetings"] =
    meetingsWithinSevenDays.slice(0, 3).map((meeting) => {
      const start = parseDateSafely(getEventDateTime(meeting.start)) ?? now;
      const end = parseDateSafely(getEventDateTime(meeting.end)) ?? start;

      return {
        calendarLabel: meeting.attendees?.length
          ? `${meeting.attendees.length} invitee${meeting.attendees.length === 1 ? "" : "s"}`
          : "Primary calendar",
        href: meeting.htmlLink,
        id: meeting.id,
        relativeTime: formatRelativeTime(start),
        time: `${new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "short",
        }).format(start)} · ${formatTimeLabel(start)} - ${formatTimeLabel(end)}`,
        title: meeting.summary || "(No title)",
      };
    });

  const recentProvisionDates = auditEvents
    .filter((event) => event.action === "PROVISION_SPACE")
    .map((event) => event.createdAt);
  const sentEmailDates = auditEvents
    .filter((event) => event.action === "SEND_EMAIL")
    .map((event) => event.createdAt);
  const connectionScore = connection?.status === "connected" ? 100 : 0;
  const provisioningScore = activeJobCount
    ? Math.round((activeChatProfiles.length / activeJobCount) * 100)
    : 100;
  const cleanupScore = deletedCleanupProfiles.length
    ? Math.round(
        ((deletedCleanupProfiles.length - cleanupFailedProfiles.length) /
          deletedCleanupProfiles.length) *
          100,
      )
    : 100;
  const workspaceHealthScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(connectionScore * 0.45 + provisioningScore * 0.4 + cleanupScore * 0.15),
    ),
  );

  const workspaceHealthLabel =
    connection?.status !== "connected"
      ? "Attention required"
      : workspaceHealthScore >= 90
        ? "Healthy"
        : workspaceHealthScore >= 70
          ? "Monitoring"
          : "Issue detected";

  const apiErrors = [mailError, meetingError, chatError].filter(Boolean) as string[];
  const parsedApiError = parseGoogleApiError(apiErrors[0] ?? null);

  const alerts: CommunicationOverviewDashboardProps["alerts"] = [];
  if (connection?.status !== "connected") {
    alerts.push({
      detail: "Reconnect the authorised Google Workspace account to restore mail, calendar, chat, and Drive data.",
      href: "/communication/settings",
      id: "connection",
      severity: "danger",
      timestamp: "Needs action",
      title: "Workspace connection is unavailable",
    });
  }
  if (failedProvisionProfiles.length > 0) {
    alerts.push({
      detail: `${failedProvisionProfiles.length} active job workspace${failedProvisionProfiles.length === 1 ? "" : "s"} failed provisioning and need a retry.`,
      href: "/communication/job-spaces",
      id: "provisioning-failed",
      severity: "danger",
      timestamp: "Operational",
      title: "Job-space provisioning failed",
    });
  }
  if (deletedCleanupProfiles.length > 0) {
    alerts.push({
      detail: `${deletedCleanupProfiles.length} deleted job workspace${deletedCleanupProfiles.length === 1 ? "" : "s"} still retain Chat or Drive resources.`,
      href: "/communication/job-spaces",
      id: "cleanup",
      severity: cleanupFailedProfiles.length > 0 ? "warning" : "info",
      timestamp: "Review queue",
      title:
        cleanupFailedProfiles.length > 0
          ? "Deleted-job cleanup needs review"
          : "Deleted-job cleanup is pending",
    });
  }
  if (parsedApiError) {
    alerts.push({
      detail: `Enable ${parsedApiError.apiName} in Google Cloud to resume synced Communication data.`,
      href: parsedApiError.activationUrl,
      id: "api-enable",
      severity: "warning",
      timestamp: "Google Cloud",
      title: "Google API enablement required",
    });
  } else if (apiErrors.length > 0) {
    alerts.push({
      detail: truncate(apiErrors[0], 140),
      href: "/communication/settings",
      id: "api-sync",
      severity: "warning",
      timestamp: "Sync issue",
      title: "A connected service needs attention",
    });
  }

  const props: CommunicationOverviewDashboardProps = {
    activityMetrics: [
      {
        helper: "Recorded by Communication audit events.",
        label: "Emails sent",
        points: buildTrendCounts(sentEmailDates),
        tone: sentEmailDates.length > 0 ? "positive" : "neutral",
        trendLabel:
          sentEmailDates.length > 0
            ? `${sentEmailDates.length} send event${sentEmailDates.length === 1 ? "" : "s"} this week`
            : "No sent-mail events recorded this week",
        value: String(sentEmailDates.length),
      },
      {
        helper: "Distinct Google Chat spaces currently visible to the connected user.",
        label: "Active chats",
        points: buildTrendCounts(
          chatSignals.map((signal) => new Date(signal.latestTime)),
        ),
        trendLabel: `${chatSignals.length} active space${chatSignals.length === 1 ? "" : "s"} sampled`,
        value: String(chatSpaces.length),
      },
      {
        helper: "Drive-backed job workspaces available to the operations team.",
        label: "Drive-enabled jobs",
        points: buildTrendCounts(recentProvisionDates),
        tone:
          driveReadyProfiles.length === activeJobCount || activeJobCount === 0
            ? "positive"
            : "neutral",
        trendLabel:
          activeJobCount > 0
            ? `${driveReadyProfiles.length} of ${activeJobCount} active jobs are Drive-ready`
            : "No active jobs currently require Drive coverage",
        value: activeJobCount
          ? `${driveReadyProfiles.length}/${activeJobCount}`
          : "0/0",
      },
    ],
    activityRangeLabel: "Current sync window",
    alerts,
    chats: recentChats,
    driveOverview:
      activeJobCount > 0
        ? {
            breakdown: [
              { label: "Ready", tone: "success", value: driveReadyProfiles.length },
              { label: "Pending", tone: "warning", value: pendingProvisionProfiles.length },
              {
                label: "Attention",
                tone: "danger",
                value: Math.max(0, activeJobCount - driveReadyProfiles.length - pendingProvisionProfiles.length),
              },
            ],
            helper:
              "The product does not currently expose quota usage, so this card tracks real Drive workspace readiness instead of a fabricated storage percentage.",
            href: "/communication/drive",
            totalLabel: `${driveReadyProfiles.length} of ${activeJobCount}`,
          }
        : null,
    emails: recentEmails,
    meetings: upcomingMeetings,
    mentions: mentionRows,
    metrics: [
      {
        actionLabel: "Open inbox",
        detail: mailError
          ? "Mail sync needs review before inbox totals can refresh."
          : "Within the latest synced mailbox state.",
        href: "/communication/mail",
        icon: "mail",
        label: "Unread mail",
        points: buildTrendCounts(emailTrendDates),
        tone: unreadMailCount > 0 ? "accent" : "success",
        value: String(unreadMailCount),
      },
      {
        actionLabel: "View job spaces",
        detail:
          activeJobCount > 0
            ? `${activeChatProfiles.length} active workspace${activeChatProfiles.length === 1 ? "" : "s"} are provisioned.`
            : "No active jobs currently require a workspace.",
        href: "/communication/job-spaces",
        icon: "chat",
        label: "Job channels",
        points: buildTrendCounts(recentProvisionDates),
        tone:
          activeChatProfiles.length === activeJobCount || activeJobCount === 0
            ? "success"
            : "warning",
        value: String(activeChatProfiles.length),
      },
      {
        actionLabel: "View calendar",
        detail: meetingError
          ? "Calendar sync needs review before this card can refresh."
          : "Scheduled within the next 7 days.",
        href: "/communication/calendar",
        icon: "calendar",
        label: "Upcoming meetings",
        points: buildTrendCounts(meetingTrendDates, { direction: "future" }),
        tone: meetingsWithinSevenDays.length > 0 ? "success" : "neutral",
        value: String(meetingsWithinSevenDays.length),
      },
    ],
    quickActions: [
      { href: "/communication/mail", icon: "mail", label: "Open mail" },
      { href: "/communication/chat", icon: "chat", label: "Start chat" },
      { href: "/communication/meetings", icon: "meeting", label: "New meeting" },
      { href: "/communication/drive", icon: "drive", label: "Browse drive" },
      { href: "/communication/search", icon: "search", label: "Search workspace" },
      { href: "/communication/job-spaces", icon: "chat", label: "Review job spaces" },
    ],
    workspaceHealth: {
      description:
        connection?.status === "connected"
          ? `${failedProvisionProfiles.length} workspace issue${failedProvisionProfiles.length === 1 ? "" : "s"} and ${cleanupFailedProfiles.length} cleanup failure${cleanupFailedProfiles.length === 1 ? "" : "s"} are currently recorded.`
          : "Reconnect the authorised Google Workspace account to recover health reporting.",
      href: "/communication/settings",
      label: workspaceHealthLabel,
      score: workspaceHealthScore,
    },
  };

  return <CommunicationOverviewDashboard {...props} />;
}
