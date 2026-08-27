import { db } from "@/lib/db";
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID } from "@/modules/mona/gemini-client";

const SETTING_KEY_PREFIX = "mona";
const SETTING_KEY_SUFFIX = "governance";
const DEFAULT_TIME_WINDOW_DAYS = 14;

export type MonaRolloutMode = "DISABLED" | "PILOT" | "ENABLED";

export type MonaGovernanceSettings = {
  allowUserModelSwitching: boolean;
  allowedModelIds: string[];
  defaultModelId: string;
  defaultProactivity: "silent" | "important-only" | "balanced" | "proactive";
  enabledName: string;
  pilotUserIds: string[];
  rolloutMode: MonaRolloutMode;
};

export type MonaUsageSummary = {
  activeUsers: number;
  avgLatencyMs: number;
  conversations: number;
  errorResponses: number;
  fallbackResponses: number;
  feedbackHelpful: number;
  feedbackUnhelpful: number;
  promptTokens: number;
  rateLimitedResponses: number;
  responseTokens: number;
  successfulResponses: number;
  totalResponses: number;
  totalTokens: number;
};

export type MonaRouteAnalytics = {
  label: string;
  totalResponses: number;
  successfulResponses: number;
  errorResponses: number;
};

export type MonaModelAnalytics = {
  id: string;
  label: string;
  totalResponses: number;
  totalTokens: number;
};

export type MonaFeedbackReviewItem = {
  conversationId: string | null;
  createdAt: string;
  feedback: "helpful" | "unhelpful";
  reason: string | null;
  responseExcerpt: string;
  routePath: string;
  userName: string;
};

export type MonaAdminSnapshot = {
  feedback: MonaFeedbackReviewItem[];
  modelUsage: MonaModelAnalytics[];
  routeUsage: MonaRouteAnalytics[];
  since: string;
  summary: MonaUsageSummary;
  windowDays: number;
};

const DEFAULT_GOVERNANCE_SETTINGS: MonaGovernanceSettings = {
  allowUserModelSwitching: true,
  allowedModelIds: AVAILABLE_MODELS.map((model) => model.id),
  defaultModelId: DEFAULT_MODEL_ID,
  defaultProactivity: "balanced",
  enabledName: "Mona",
  pilotUserIds: [],
  rolloutMode: "ENABLED",
};

function settingKey(orgId: string) {
  return `${SETTING_KEY_PREFIX}:${orgId}:${SETTING_KEY_SUFFIX}`;
}

function sanitizeModelIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [...DEFAULT_GOVERNANCE_SETTINGS.allowedModelIds];
  }

  const validIds = value.filter(
    (entry): entry is string =>
      typeof entry === "string" &&
      AVAILABLE_MODELS.some((model) => model.id === entry),
  );

  return validIds.length > 0
    ? [...new Set(validIds)]
    : [...DEFAULT_GOVERNANCE_SETTINGS.allowedModelIds];
}

function sanitizePilotUserIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(
    value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean),
  )];
}

function parseStoredSettings(value: string | null | undefined): MonaGovernanceSettings {
  if (!value) {
    return { ...DEFAULT_GOVERNANCE_SETTINGS };
  }

  try {
    const parsed = JSON.parse(value) as Partial<MonaGovernanceSettings>;
    const allowedModelIds = sanitizeModelIds(parsed.allowedModelIds);
    const defaultModelId =
      typeof parsed.defaultModelId === "string" &&
      allowedModelIds.includes(parsed.defaultModelId)
        ? parsed.defaultModelId
        : allowedModelIds[0] ?? DEFAULT_MODEL_ID;

    return {
      allowUserModelSwitching:
        typeof parsed.allowUserModelSwitching === "boolean"
          ? parsed.allowUserModelSwitching
          : DEFAULT_GOVERNANCE_SETTINGS.allowUserModelSwitching,
      allowedModelIds,
      defaultModelId,
      defaultProactivity:
        parsed.defaultProactivity === "silent" ||
        parsed.defaultProactivity === "important-only" ||
        parsed.defaultProactivity === "balanced" ||
        parsed.defaultProactivity === "proactive"
          ? parsed.defaultProactivity
          : DEFAULT_GOVERNANCE_SETTINGS.defaultProactivity,
      enabledName:
        typeof parsed.enabledName === "string" && parsed.enabledName.trim().length > 0
          ? parsed.enabledName.trim().slice(0, 32)
          : DEFAULT_GOVERNANCE_SETTINGS.enabledName,
      pilotUserIds: sanitizePilotUserIds(parsed.pilotUserIds),
      rolloutMode:
        parsed.rolloutMode === "DISABLED" ||
        parsed.rolloutMode === "PILOT" ||
        parsed.rolloutMode === "ENABLED"
          ? parsed.rolloutMode
          : DEFAULT_GOVERNANCE_SETTINGS.rolloutMode,
    };
  } catch {
    return { ...DEFAULT_GOVERNANCE_SETTINGS };
  }
}

function normalizeGovernanceInput(
  input: MonaGovernanceSettings,
): MonaGovernanceSettings {
  const allowedModelIds = sanitizeModelIds(input.allowedModelIds);
  const defaultModelId = allowedModelIds.includes(input.defaultModelId)
    ? input.defaultModelId
    : allowedModelIds[0] ?? DEFAULT_MODEL_ID;

  return {
    allowUserModelSwitching: Boolean(input.allowUserModelSwitching),
    allowedModelIds,
    defaultModelId,
    defaultProactivity: input.defaultProactivity,
    enabledName: input.enabledName.trim().slice(0, 32) || DEFAULT_GOVERNANCE_SETTINGS.enabledName,
    pilotUserIds: sanitizePilotUserIds(input.pilotUserIds),
    rolloutMode: input.rolloutMode,
  };
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readAuditDetails(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
}

function getModelLabel(modelId: string) {
  return AVAILABLE_MODELS.find((model) => model.id === modelId)?.name ?? modelId;
}

export async function getMonaGovernanceForOrg(
  orgId: string | null | undefined,
): Promise<MonaGovernanceSettings> {
  if (!orgId) {
    return { ...DEFAULT_GOVERNANCE_SETTINGS };
  }

  const row = await db.systemSetting.findUnique({
    where: { key: settingKey(orgId) },
    select: { value: true },
  });

  return parseStoredSettings(row?.value);
}

export async function saveMonaGovernanceForOrg(params: {
  orgId: string;
  settings: MonaGovernanceSettings;
}) {
  const settings = normalizeGovernanceInput(params.settings);

  await db.systemSetting.upsert({
    where: { key: settingKey(params.orgId) },
    update: {
      value: JSON.stringify(settings),
    },
    create: {
      key: settingKey(params.orgId),
      value: JSON.stringify(settings),
    },
  });

  return settings;
}

export function getEffectiveMonaModelId(params: {
  preferredModelId?: string | null;
  settings: MonaGovernanceSettings;
}) {
  if (
    params.settings.allowUserModelSwitching &&
    typeof params.preferredModelId === "string" &&
    params.settings.allowedModelIds.includes(params.preferredModelId)
  ) {
    return params.preferredModelId;
  }

  if (params.settings.allowedModelIds.includes(params.settings.defaultModelId)) {
    return params.settings.defaultModelId;
  }

  return params.settings.allowedModelIds[0] ?? DEFAULT_MODEL_ID;
}

export async function resolveMonaAvailability(params: {
  isAdmin: boolean;
  orgId?: string | null;
  userId: string;
}) {
  const settings = await getMonaGovernanceForOrg(params.orgId);
  return evaluateMonaAvailability({
    isAdmin: params.isAdmin,
    settings,
    userId: params.userId,
  });
}

export function evaluateMonaAvailability(params: {
  isAdmin: boolean;
  settings: MonaGovernanceSettings;
  userId: string;
}) {
  const isPilotUser = params.settings.pilotUserIds.includes(params.userId);

  if (params.settings.rolloutMode === "ENABLED") {
    return {
      allowed: true,
      reason: null,
      settings: params.settings,
    };
  }

  if (params.settings.rolloutMode === "PILOT" && (isPilotUser || params.isAdmin)) {
    return {
      allowed: true,
      reason: null,
      settings: params.settings,
    };
  }

  if (params.settings.rolloutMode === "PILOT") {
    return {
      allowed: false,
      reason: `${params.settings.enabledName} is currently limited to the pilot allowlist.`,
      settings: params.settings,
    };
  }

  return {
    allowed: false,
    reason: `${params.settings.enabledName} is currently disabled for this organisation.`,
    settings: params.settings,
  };
}

export async function getMonaAdminSnapshot(params: {
  orgId: string;
  windowDays?: number;
}): Promise<MonaAdminSnapshot> {
  const windowDays = Math.max(1, params.windowDays ?? DEFAULT_TIME_WINDOW_DAYS);
  const sinceDate = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [conversationCount, conversationUsers, auditEvents] = await Promise.all([
    db.monaConversation.count({
      where: {
        orgId: params.orgId,
        updatedAt: {
          gte: sinceDate,
        },
      },
    }),
    db.monaConversation.findMany({
      where: {
        orgId: params.orgId,
        updatedAt: {
          gte: sinceDate,
        },
      },
      select: {
        userId: true,
      },
      distinct: ["userId"],
    }),
    db.monaAuditEvent.findMany({
      where: {
        orgId: params.orgId,
        createdAt: {
          gte: sinceDate,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        conversationId: true,
        createdAt: true,
        details: true,
        eventType: true,
        latencyMs: true,
        responseMessage: true,
        routePath: true,
        status: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  let successfulResponses = 0;
  let fallbackResponses = 0;
  let errorResponses = 0;
  let rateLimitedResponses = 0;
  let totalResponses = 0;
  let totalLatencyMs = 0;
  let latencyCount = 0;
  let promptTokens = 0;
  let responseTokens = 0;
  let totalTokens = 0;
  let feedbackHelpful = 0;
  let feedbackUnhelpful = 0;

  const routeUsage = new Map<string, MonaRouteAnalytics>();
  const modelUsage = new Map<string, MonaModelAnalytics>();
  const feedback: MonaFeedbackReviewItem[] = [];

  for (const event of auditEvents) {
    const details = readAuditDetails(event.details);
    const isChatEvent = event.eventType.startsWith("chat.");
    const isFeedbackEvent = event.eventType === "feedback.submitted";

    if (isChatEvent) {
      totalResponses += 1;
      if (typeof event.latencyMs === "number") {
        totalLatencyMs += event.latencyMs;
        latencyCount += 1;
      }

      const routeKey = event.routePath || "Unknown route";
      const existingRoute = routeUsage.get(routeKey) ?? {
        label: routeKey,
        totalResponses: 0,
        successfulResponses: 0,
        errorResponses: 0,
      };
      existingRoute.totalResponses += 1;

      if (event.status === "success") {
        successfulResponses += 1;
        existingRoute.successfulResponses += 1;
      } else if (event.status === "fallback") {
        fallbackResponses += 1;
      } else if (event.status === "rate_limited") {
        rateLimitedResponses += 1;
      } else {
        errorResponses += 1;
        existingRoute.errorResponses += 1;
      }
      routeUsage.set(routeKey, existingRoute);

      const promptTokenCount = toNumber(details?.promptTokenCount);
      const responseTokenCount = toNumber(details?.responseTokenCount);
      const totalTokenCount = toNumber(details?.totalTokenCount);
      promptTokens += promptTokenCount;
      responseTokens += responseTokenCount;
      totalTokens += totalTokenCount;

      const modelId =
        typeof details?.modelId === "string" ? details.modelId : DEFAULT_MODEL_ID;
      const existingModel = modelUsage.get(modelId) ?? {
        id: modelId,
        label: getModelLabel(modelId),
        totalResponses: 0,
        totalTokens: 0,
      };
      existingModel.totalResponses += 1;
      existingModel.totalTokens += totalTokenCount;
      modelUsage.set(modelId, existingModel);
    }

    if (isFeedbackEvent) {
      const feedbackValue =
        details?.feedback === "helpful" || details?.feedback === "unhelpful"
          ? details.feedback
          : "helpful";

      if (feedbackValue === "helpful") {
        feedbackHelpful += 1;
      } else {
        feedbackUnhelpful += 1;
      }

      feedback.push({
        conversationId: event.conversationId,
        createdAt: event.createdAt.toISOString(),
        feedback: feedbackValue,
        reason:
          typeof details?.reason === "string" && details.reason.trim().length > 0
            ? details.reason.trim()
            : null,
        responseExcerpt:
          typeof details?.responseExcerpt === "string" && details.responseExcerpt.trim().length > 0
            ? details.responseExcerpt.trim()
            : event.responseMessage?.slice(0, 180) ?? "No response excerpt captured.",
        routePath: event.routePath || "/dashboard",
        userName: event.user.name || "Unknown user",
      });
    }
  }

  return {
    feedback: feedback.slice(0, 12),
    modelUsage: [...modelUsage.values()].sort((left, right) => right.totalResponses - left.totalResponses),
    routeUsage: [...routeUsage.values()].sort((left, right) => right.totalResponses - left.totalResponses).slice(0, 8),
    since: sinceDate.toISOString(),
    summary: {
      activeUsers: conversationUsers.length,
      avgLatencyMs: latencyCount > 0 ? Math.round(totalLatencyMs / latencyCount) : 0,
      conversations: conversationCount,
      errorResponses,
      fallbackResponses,
      feedbackHelpful,
      feedbackUnhelpful,
      promptTokens,
      rateLimitedResponses,
      responseTokens,
      successfulResponses,
      totalResponses,
      totalTokens,
    },
    windowDays,
  };
}
