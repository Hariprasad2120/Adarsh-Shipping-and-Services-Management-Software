import type { ChaCustomsFeatureFlags } from "./feature-flags";
import { isChaCustomsFeatureEnabled } from "./feature-flags";
import { CUSTOMS_MASTER_PAGE_CONFIGS } from "./masters/page-config";

export type ChaCustomsRouteMetadata = {
  group: "Customs Masters" | "Import" | "Export";
  href: string;
  label: string;
  requiredPermission: string;
  requiredFlag: keyof ChaCustomsFeatureFlags;
};

export const CHA_CUSTOMS_ROUTE_METADATA: readonly ChaCustomsRouteMetadata[] = [
  {
    group: "Customs Masters",
    href: "/cha/masters",
    label: "Customs Masters",
    requiredPermission: "cha.customs.master.view",
    requiredFlag: "CHA_CUSTOMS_MASTER_DATA",
  },
  ...Object.values(CUSTOMS_MASTER_PAGE_CONFIGS).map((config) => ({
    group: "Customs Masters" as const,
    href: `/cha/masters/${config.slug}`,
    label: config.title,
    requiredPermission: "cha.customs.master.view",
    requiredFlag: "CHA_CUSTOMS_MASTER_DATA" as const,
  })),
  {
    group: "Import",
    href: "/cha/jobs/import",
    label: "Import Jobs",
    requiredPermission: "cha.customs.filing.view",
    requiredFlag: "CHA_IMPORT_FILING_WORKSPACE",
  },
  {
    group: "Export",
    href: "/cha/jobs/export",
    label: "Export Jobs",
    requiredPermission: "cha.customs.filing.view",
    requiredFlag: "CHA_EXPORT_FILING_WORKSPACE",
  },
] as const;

export function getEnabledChaCustomsRouteMetadata(flags: ChaCustomsFeatureFlags) {
  return CHA_CUSTOMS_ROUTE_METADATA.filter((route) =>
    isChaCustomsFeatureEnabled(flags, route.requiredFlag),
  );
}

export function getVisibleChaCustomsRouteMetadata(
  flags: ChaCustomsFeatureFlags,
  caps: Record<string, boolean>,
) {
  return getEnabledChaCustomsRouteMetadata(flags).filter((route) =>
    Boolean(caps[route.requiredPermission]),
  );
}

export function getGroupedChaCustomsRouteMetadata(
  flags: ChaCustomsFeatureFlags,
  caps: Record<string, boolean>,
) {
  return getVisibleChaCustomsRouteMetadata(flags, caps).reduce<
    Record<ChaCustomsRouteMetadata["group"], ChaCustomsRouteMetadata[]>
  >(
    (groups, route) => {
      groups[route.group].push(route);
      return groups;
    },
    { "Customs Masters": [], Import: [], Export: [] },
  );
}
