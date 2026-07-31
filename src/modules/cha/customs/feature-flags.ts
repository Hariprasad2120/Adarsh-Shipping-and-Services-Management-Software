import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";

export const CHA_CUSTOMS_FEATURE_FLAG_KEYS = [
  "CHA_CUSTOMS_MASTER_DATA",
  "CHA_IMPORT_FILING_WORKSPACE",
  "CHA_EXPORT_FILING_WORKSPACE",
  "CHA_ICEGATE_INTEGRATION",
  "CHA_ICEGATE_LIVE_SUBMISSION",
] as const;

export type ChaCustomsFeatureFlagKey = (typeof CHA_CUSTOMS_FEATURE_FLAG_KEYS)[number];

export type ChaCustomsFeatureFlags = Record<ChaCustomsFeatureFlagKey, boolean>;

export const DEFAULT_CHA_CUSTOMS_FEATURE_FLAGS: ChaCustomsFeatureFlags = {
  CHA_CUSTOMS_MASTER_DATA: false,
  CHA_IMPORT_FILING_WORKSPACE: false,
  CHA_EXPORT_FILING_WORKSPACE: false,
  CHA_ICEGATE_INTEGRATION: false,
  CHA_ICEGATE_LIVE_SUBMISSION: false,
};

export const CHA_CUSTOMS_FEATURE_FLAGS_SETTINGS_SUFFIX = "cha_customs_feature_flags";
export const CHA_CUSTOMS_FEATURE_FLAGS_CACHE_TAG = "org:cha-customs-feature-flags";

export function getChaCustomsFeatureFlagsSettingKey(orgId: string) {
  return `org:${orgId}:${CHA_CUSTOMS_FEATURE_FLAGS_SETTINGS_SUFFIX}`;
}

export function parseChaCustomsFeatureFlags(value: string | null | undefined): ChaCustomsFeatureFlags {
  if (!value) return { ...DEFAULT_CHA_CUSTOMS_FEATURE_FLAGS };

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ...DEFAULT_CHA_CUSTOMS_FEATURE_FLAGS };
    }

    const source = parsed as Partial<Record<ChaCustomsFeatureFlagKey, unknown>>;
    return CHA_CUSTOMS_FEATURE_FLAG_KEYS.reduce<ChaCustomsFeatureFlags>((flags, key) => {
      flags[key] = source[key] === true;
      return flags;
    }, { ...DEFAULT_CHA_CUSTOMS_FEATURE_FLAGS });
  } catch {
    return { ...DEFAULT_CHA_CUSTOMS_FEATURE_FLAGS };
  }
}

export function isChaCustomsFeatureEnabled(
  flags: ChaCustomsFeatureFlags,
  key: ChaCustomsFeatureFlagKey,
) {
  if (key === "CHA_ICEGATE_LIVE_SUBMISSION" && !flags.CHA_ICEGATE_INTEGRATION) {
    return false;
  }

  return flags[key] === true;
}

const getCachedChaCustomsFeatureFlags = unstable_cache(
  async (orgId: string): Promise<ChaCustomsFeatureFlags> => {
    const row = await db.systemSetting.findUnique({
      where: { key: getChaCustomsFeatureFlagsSettingKey(orgId) },
      select: { value: true },
    });

    return parseChaCustomsFeatureFlags(row?.value);
  },
  ["org:cha-customs-feature-flags"],
  {
    tags: [CHA_CUSTOMS_FEATURE_FLAGS_CACHE_TAG],
    revalidate: 300,
  },
);

export async function getChaCustomsFeatureFlags(orgId: string): Promise<ChaCustomsFeatureFlags> {
  return getCachedChaCustomsFeatureFlags(orgId);
}

