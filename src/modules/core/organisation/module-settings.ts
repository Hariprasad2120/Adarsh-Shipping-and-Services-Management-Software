import { db } from "@/lib/db";
import { revalidateTag, unstable_cache } from "next/cache";
import { resolveEnabledModules } from "@/modules/core/module-registry";
import {
  MANAGED_FEATURE_IDS,
  TOGGLEABLE_MODULE_SECTION_IDS,
  type ManagedFeatureId,
  type ToggleableModuleSectionId,
} from "./module-config";

export const MODULE_SETTINGS_KEY_PREFIX = "org";
export const ENABLED_MODULES_SETTINGS_SUFFIX = "enabled_modules";
export const ENABLED_FEATURES_SETTINGS_SUFFIX = "enabled_features";
const ENABLED_MODULES_MIGRATION_SUFFIX = "enabled_modules_migrated_2026_08_04";

const TOGGLEABLE_MODULE_SET = new Set<string>(TOGGLEABLE_MODULE_SECTION_IDS);
const MANAGED_FEATURE_SET = new Set<string>(MANAGED_FEATURE_IDS);
const ENABLED_MODULES_CACHE_TAG = "org:enabled-modules";
const ENABLED_FEATURES_CACHE_TAG = "org:enabled-features";
const LEGACY_AUTO_ENABLED_MODULE_IDS: readonly ToggleableModuleSectionId[] = [
  "freight-forwarding",
];

function getEnabledModulesSettingKey(orgId: string) {
  return `${MODULE_SETTINGS_KEY_PREFIX}:${orgId}:${ENABLED_MODULES_SETTINGS_SUFFIX}`;
}

function getEnabledFeaturesSettingKey(orgId: string) {
  return `${MODULE_SETTINGS_KEY_PREFIX}:${orgId}:${ENABLED_FEATURES_SETTINGS_SUFFIX}`;
}

function getEnabledModulesMigrationKey(orgId: string) {
  return `${MODULE_SETTINGS_KEY_PREFIX}:${orgId}:${ENABLED_MODULES_MIGRATION_SUFFIX}`;
}

function parseStoredEnabledModules(value: string | null | undefined): ToggleableModuleSectionId[] {
  if (!value) return [...TOGGLEABLE_MODULE_SECTION_IDS];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [...TOGGLEABLE_MODULE_SECTION_IDS];

    const enabled = parsed.filter(
      (item): item is ToggleableModuleSectionId =>
        typeof item === "string" && TOGGLEABLE_MODULE_SET.has(item),
    );

    return enabled.length > 0 ? Array.from(new Set(enabled)) : [];
  } catch {
    return [...TOGGLEABLE_MODULE_SECTION_IDS];
  }
}

function parseStoredEnabledFeatures(value: string | null | undefined): ManagedFeatureId[] {
  if (!value) return [...MANAGED_FEATURE_IDS];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [...MANAGED_FEATURE_IDS];

    const enabled = parsed.filter(
      (item): item is ManagedFeatureId =>
        typeof item === "string" && MANAGED_FEATURE_SET.has(item),
    );

    return enabled.length > 0 ? Array.from(new Set(enabled)) : [];
  } catch {
    return [...MANAGED_FEATURE_IDS];
  }
}

async function migrateLegacyEnabledModulesIfNeeded(
  orgId: string,
  value: string | null | undefined,
) {
  if (!value) {
    return [...TOGGLEABLE_MODULE_SECTION_IDS];
  }

  const parsed = parseStoredEnabledModules(value);
  const missingLegacyDefaults = LEGACY_AUTO_ENABLED_MODULE_IDS.filter(
    (id) => !parsed.includes(id),
  );

  if (missingLegacyDefaults.length === 0) {
    return parsed;
  }

  const migrationKey = getEnabledModulesMigrationKey(orgId);
  const migrationState = await db.systemSetting.findUnique({
    where: { key: migrationKey },
    select: { value: true },
  });

  if (migrationState?.value === "done") {
    return parsed;
  }

  const migrated = TOGGLEABLE_MODULE_SECTION_IDS.filter(
    (id) => parsed.includes(id) || missingLegacyDefaults.includes(id),
  );

  await db.$transaction([
    db.systemSetting.upsert({
      where: { key: getEnabledModulesSettingKey(orgId) },
      update: { value: JSON.stringify(migrated) },
      create: {
        key: getEnabledModulesSettingKey(orgId),
        value: JSON.stringify(migrated),
      },
    }),
    db.systemSetting.upsert({
      where: { key: migrationKey },
      update: { value: "done" },
      create: {
        key: migrationKey,
        value: "done",
      },
    }),
  ]);

  revalidateTag(ENABLED_MODULES_CACHE_TAG, "max");
  return migrated;
}

const getCachedEnabledModuleIds = unstable_cache(
  async (orgId: string): Promise<ToggleableModuleSectionId[]> => {
    const row = await db.systemSetting.findUnique({
      where: { key: getEnabledModulesSettingKey(orgId) },
      select: { value: true },
    });

    return migrateLegacyEnabledModulesIfNeeded(orgId, row?.value);
  },
  ["org:enabled-modules"],
  {
    tags: [ENABLED_MODULES_CACHE_TAG],
    revalidate: 300,
  },
);

const getCachedEnabledFeatureIds = unstable_cache(
  async (orgId: string): Promise<ManagedFeatureId[]> => {
    const row = await db.systemSetting.findUnique({
      where: { key: getEnabledFeaturesSettingKey(orgId) },
      select: { value: true },
    });

    return parseStoredEnabledFeatures(row?.value);
  },
  ["org:enabled-features"],
  {
    tags: [ENABLED_FEATURES_CACHE_TAG],
    revalidate: 300,
  },
);

export async function getEnabledModuleIds(orgId: string): Promise<ToggleableModuleSectionId[]> {
  return getCachedEnabledModuleIds(orgId);
}

export async function getFreshEnabledModuleIds(orgId: string): Promise<ToggleableModuleSectionId[]> {
  const row = await db.systemSetting.findUnique({
    where: { key: getEnabledModulesSettingKey(orgId) },
    select: { value: true },
  });

  return migrateLegacyEnabledModulesIfNeeded(orgId, row?.value);
}

export async function getEnabledFeatureIds(orgId: string): Promise<ManagedFeatureId[]> {
  return getCachedEnabledFeatureIds(orgId);
}

export async function getFreshEnabledFeatureIds(orgId: string): Promise<ManagedFeatureId[]> {
  const row = await db.systemSetting.findUnique({
    where: { key: getEnabledFeaturesSettingKey(orgId) },
    select: { value: true },
  });

  return parseStoredEnabledFeatures(row?.value);
}

function resolveNormalisedModuleIds(
  enabledModuleIds: readonly ToggleableModuleSectionId[],
): ToggleableModuleSectionId[] {
  const requested = TOGGLEABLE_MODULE_SECTION_IDS.filter((id) => enabledModuleIds.includes(id));
  // Stage 2 — module registry: enabling a module also enables its dependency
  // closure (e.g. Payroll pulls in HRMS). Core modules resolved by the registry
  // are not stored here (this key only holds toggleable ids).
  const { enabled } = resolveEnabledModules(requested);
  return TOGGLEABLE_MODULE_SECTION_IDS.filter((id) => enabled.includes(id));
}

async function persistEnabledModuleIds(orgId: string, normalized: ToggleableModuleSectionId[]) {
  return db.systemSetting.upsert({
    where: { key: getEnabledModulesSettingKey(orgId) },
    update: { value: JSON.stringify(normalized) },
    create: { key: getEnabledModulesSettingKey(orgId), value: JSON.stringify(normalized) },
  });
}

export async function setEnabledModuleIds(
  orgId: string,
  enabledModuleIds: readonly ToggleableModuleSectionId[],
) {
  const normalized = resolveNormalisedModuleIds(enabledModuleIds);
  const row = await persistEnabledModuleIds(orgId, normalized);
  revalidateTag(ENABLED_MODULES_CACHE_TAG, "max");
  return parseStoredEnabledModules(row.value);
}

/**
 * Write the enabled-module set WITHOUT cache revalidation, for provisioning /
 * seed callers running outside a Next.js request context.
 */
export async function setEnabledModuleIdsRaw(
  orgId: string,
  enabledModuleIds: readonly ToggleableModuleSectionId[],
) {
  const normalized = resolveNormalisedModuleIds(enabledModuleIds);
  const row = await persistEnabledModuleIds(orgId, normalized);
  return parseStoredEnabledModules(row.value);
}

export async function setEnabledFeatureIds(
  orgId: string,
  enabledFeatureIds: readonly ManagedFeatureId[],
) {
  const normalized = MANAGED_FEATURE_IDS.filter((id) => enabledFeatureIds.includes(id));

  const row = await db.systemSetting.upsert({
    where: { key: getEnabledFeaturesSettingKey(orgId) },
    update: { value: JSON.stringify(normalized) },
    create: {
      key: getEnabledFeaturesSettingKey(orgId),
      value: JSON.stringify(normalized),
    },
  });

  revalidateTag(ENABLED_FEATURES_CACHE_TAG, "max");
  return parseStoredEnabledFeatures(row.value);
}

export async function getEnabledModuleIdSet(orgId: string) {
  return new Set(await getEnabledModuleIds(orgId));
}

export async function getEnabledFeatureIdSet(orgId: string) {
  return new Set(await getEnabledFeatureIds(orgId));
}
