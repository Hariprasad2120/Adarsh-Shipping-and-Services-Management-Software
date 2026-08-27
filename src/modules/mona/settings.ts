"use server";

import { db } from "@/lib/db";
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID } from "./gemini-client";
import {
  getEffectiveMonaModelId,
  getMonaGovernanceForOrg,
} from "./governance";

const SETTING_KEY_PREFIX = "mona";
const SETTING_KEY_SUFFIX = "preferences";

export type MonaUserPreferences = {
  preferredModelId: string;
};

const DEFAULT_PREFERENCES: MonaUserPreferences = {
  preferredModelId: DEFAULT_MODEL_ID,
};

function settingKey(userId: string) {
  return `${SETTING_KEY_PREFIX}:${userId}:${SETTING_KEY_SUFFIX}`;
}

function isValidModelId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    AVAILABLE_MODELS.some((model) => model.id === value)
  );
}

function parseStored(value: string | null | undefined): MonaUserPreferences {
  if (!value) return { ...DEFAULT_PREFERENCES };

  try {
    const parsed = JSON.parse(value) as Partial<MonaUserPreferences>;
    return {
      preferredModelId: isValidModelId(parsed.preferredModelId)
        ? parsed.preferredModelId
        : DEFAULT_PREFERENCES.preferredModelId,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export async function getMonaUserPreferences(
  userId: string,
): Promise<MonaUserPreferences> {
  const row = await db.systemSetting.findUnique({
    where: { key: settingKey(userId) },
    select: { value: true },
  });

  return parseStored(row?.value);
}

export async function getPreferredMonaModelForUser(userId: string): Promise<string> {
  const preferences = await getMonaUserPreferences(userId);
  return preferences.preferredModelId;
}

export async function getEffectiveMonaModelForUser(params: {
  orgId?: string | null;
  userId: string;
}): Promise<string> {
  const [preferences, governance] = await Promise.all([
    getMonaUserPreferences(params.userId),
    getMonaGovernanceForOrg(params.orgId),
  ]);

  return getEffectiveMonaModelId({
    preferredModelId: preferences.preferredModelId,
    settings: governance,
  });
}

export async function setPreferredMonaModelForUser(params: {
  modelId: string;
  orgId?: string | null;
  userId: string;
}) {
  const governance = await getMonaGovernanceForOrg(params.orgId);
  const requestedModelId = isValidModelId(params.modelId)
    ? params.modelId
    : DEFAULT_PREFERENCES.preferredModelId;
  const modelId = getEffectiveMonaModelId({
    preferredModelId: requestedModelId,
    settings: governance,
  });

  await db.systemSetting.upsert({
    where: { key: settingKey(params.userId) },
    update: {
      value: JSON.stringify({ preferredModelId: modelId }),
    },
    create: {
      key: settingKey(params.userId),
      value: JSON.stringify({ preferredModelId: modelId }),
    },
  });

  return modelId;
}
