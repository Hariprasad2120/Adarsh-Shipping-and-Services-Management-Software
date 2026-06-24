import { db } from "@/lib/db";
import { revalidateTag, unstable_cache } from "next/cache";
import {
  TOGGLEABLE_MODULE_SECTION_IDS,
  type ToggleableModuleSectionId,
} from "./module-config";

export const MODULE_SETTINGS_KEY_PREFIX = "org";
export const ENABLED_MODULES_SETTINGS_SUFFIX = "enabled_modules";

const TOGGLEABLE_MODULE_SET = new Set<string>(TOGGLEABLE_MODULE_SECTION_IDS);
const ENABLED_MODULES_CACHE_TAG = "org:enabled-modules";

function getEnabledModulesSettingKey(orgId: string) {
  return `${MODULE_SETTINGS_KEY_PREFIX}:${orgId}:${ENABLED_MODULES_SETTINGS_SUFFIX}`;
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

const getCachedEnabledModuleIds = unstable_cache(
  async (orgId: string): Promise<ToggleableModuleSectionId[]> => {
    const row = await db.systemSetting.findUnique({
      where: { key: getEnabledModulesSettingKey(orgId) },
      select: { value: true },
    });

    return parseStoredEnabledModules(row?.value);
  },
  ["org:enabled-modules"],
  {
    tags: [ENABLED_MODULES_CACHE_TAG],
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

  return parseStoredEnabledModules(row?.value);
}

export async function setEnabledModuleIds(
  orgId: string,
  enabledModuleIds: readonly ToggleableModuleSectionId[],
) {
  const normalized = TOGGLEABLE_MODULE_SECTION_IDS.filter((id) => enabledModuleIds.includes(id));

  const row = await db.systemSetting.upsert({
    where: { key: getEnabledModulesSettingKey(orgId) },
    update: { value: JSON.stringify(normalized) },
    create: {
      key: getEnabledModulesSettingKey(orgId),
      value: JSON.stringify(normalized),
    },
  });

  revalidateTag(ENABLED_MODULES_CACHE_TAG, "max");
  return parseStoredEnabledModules(row.value);
}

export async function getEnabledModuleIdSet(orgId: string) {
  return new Set(await getEnabledModuleIds(orgId));
}
