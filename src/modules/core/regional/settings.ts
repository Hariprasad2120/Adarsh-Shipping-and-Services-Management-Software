/**
 * Stage 2 — enterprise platform: per-organisation regional settings loader.
 *
 * Wraps the `OrganisationSettings` table. The row is created lazily with the
 * schema's platform-neutral defaults the first time an organisation is read, so
 * callers never have to null-check. The Organisation Setup Wizard and Settings
 * screens write through `updateOrganisationRegionalSettings`.
 */

import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { NEUTRAL_FORMAT_CONTEXT, type RegionalFormatContext } from "./format";

export type OrganisationRegionalSettings = {
  orgId: string;
  country: string | null;
  timezone: string;
  locale: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  firstDayOfWeek: number;
  baseCurrency: string;
  supportedCurrencies: string[];
  fiscalYearStartMonth: number;
  fiscalYearStartDay: number;
};

function cacheTag(orgId: string) {
  return `org:${orgId}:regional-settings`;
}

async function loadOrCreate(orgId: string): Promise<OrganisationRegionalSettings> {
  if (!orgId) throw new Error("getOrganisationRegionalSettings: no organisation id");
  const row = await db.organisationSettings.upsert({
    where: { orgId },
    update: {},
    create: { orgId },
  });
  return {
    orgId: row.orgId,
    country: row.country,
    timezone: row.timezone,
    locale: row.locale,
    dateFormat: row.dateFormat,
    timeFormat: row.timeFormat,
    numberFormat: row.numberFormat,
    firstDayOfWeek: row.firstDayOfWeek,
    baseCurrency: row.baseCurrency,
    supportedCurrencies: row.supportedCurrencies,
    fiscalYearStartMonth: row.fiscalYearStartMonth,
    fiscalYearStartDay: row.fiscalYearStartDay,
  };
}

/** Cached read of an organisation's regional settings. */
export async function getOrganisationRegionalSettings(
  orgId: string,
): Promise<OrganisationRegionalSettings> {
  const cached = unstable_cache(() => loadOrCreate(orgId), [cacheTag(orgId)], {
    tags: [cacheTag(orgId)],
    revalidate: 300,
  });
  return cached();
}

/** Narrow the settings row to the pure formatting context used by `./format`. */
export function toFormatContext(s: OrganisationRegionalSettings): RegionalFormatContext {
  return {
    locale: s.locale || NEUTRAL_FORMAT_CONTEXT.locale,
    baseCurrency: s.baseCurrency || NEUTRAL_FORMAT_CONTEXT.baseCurrency,
    numberFormat: s.numberFormat || NEUTRAL_FORMAT_CONTEXT.numberFormat,
    timezone: s.timezone || NEUTRAL_FORMAT_CONTEXT.timezone,
    dateFormat: s.dateFormat || NEUTRAL_FORMAT_CONTEXT.dateFormat,
    timeFormat: s.timeFormat || NEUTRAL_FORMAT_CONTEXT.timeFormat,
  };
}

const MUTABLE_FIELDS = [
  "country",
  "timezone",
  "locale",
  "dateFormat",
  "timeFormat",
  "numberFormat",
  "firstDayOfWeek",
  "baseCurrency",
  "supportedCurrencies",
  "fiscalYearStartMonth",
  "fiscalYearStartDay",
] as const;

export type OrganisationRegionalSettingsPatch = Partial<
  Pick<OrganisationRegionalSettings, (typeof MUTABLE_FIELDS)[number]>
>;

/**
 * Update an organisation's regional settings. Caller is responsible for
 * authorisation (`admin.org.manage`). Pass `audit` to record a configuration
 * audit entry (before/after diff); omit it for internal / provisioning callers
 * that write their own audit trail.
 */
export async function updateOrganisationRegionalSettings(
  orgId: string,
  patch: OrganisationRegionalSettingsPatch,
  audit?: { actorUserId?: string; actorLabel?: string; reason?: string; request?: Request | null },
): Promise<OrganisationRegionalSettings> {
  if (!orgId) throw new Error("updateOrganisationRegionalSettings: no organisation id");
  const data: Record<string, unknown> = {};
  for (const field of MUTABLE_FIELDS) {
    if (patch[field] !== undefined) data[field] = patch[field];
  }

  const before = audit ? await loadOrCreate(orgId) : null;

  await db.organisationSettings.upsert({
    where: { orgId },
    update: data,
    create: { orgId, ...data },
  });
  revalidateTag(cacheTag(orgId), "max");
  const after = await loadOrCreate(orgId);

  if (audit && before) {
    const { recordConfigChange } = await import("@/modules/core/config-audit");
    await recordConfigChange({
      orgId,
      actor: audit.actorUserId
        ? { userId: audit.actorUserId, label: audit.actorLabel }
        : { label: audit.actorLabel ?? "system" },
      action: "regional_settings.update",
      targetType: "OrganisationSettings",
      targetId: orgId,
      before,
      after,
      reason: audit.reason ?? null,
      request: audit.request ?? null,
    });
  }

  return after;
}
