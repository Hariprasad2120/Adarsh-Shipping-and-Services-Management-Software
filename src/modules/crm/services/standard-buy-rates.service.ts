import standardBuyRatesSeed from "../config/standard-buy-rates.json";
import type { RateWorkflowSnapshot } from "../rate-workflow";

export type StandardBuyRateRecord = {
  id: string;
  canonicalChargeCode: string;
  canonicalChargeName: string;
  direction: "IMP" | "EXP";
  mode: "SEA" | "AIR";
  loadType: "LCL" | "FCL" | "AIR";
  currency: string;
  unit: string;
  rate: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  branch: string | null;
  active: boolean;
  revision: string | null;
  containerType: string | null;
  sourceDocument: string;
  sourceExcerpt: string;
};

export type StandardRateSignal =
  | "STANDARD_CHARGES_APPLICABLE"
  | "AS_AGREED"
  | null;

function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeContainerType(value: string | null | undefined) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  if (normalized.includes("20")) return "20FT";
  if (normalized.includes("40")) return "40FT";
  return normalized;
}

function compareOptionalDates(left: string | null, right: string | null) {
  if (left && right) return right.localeCompare(left);
  if (left) return -1;
  if (right) return 1;
  return 0;
}

function isWithinEffectiveWindow(record: StandardBuyRateRecord, asOfDate: string | null) {
  if (!asOfDate) return true;
  const compareDate = asOfDate.slice(0, 10);
  if (record.effectiveFrom && record.effectiveFrom > compareDate) return false;
  if (record.effectiveTo && record.effectiveTo < compareDate) return false;
  return true;
}

function selectLatestVersions(records: StandardBuyRateRecord[]) {
  const grouped = new Map<string, StandardBuyRateRecord[]>();
  for (const record of records) {
    const key = `${record.canonicalChargeCode}::${record.containerType || "ALL"}`;
    const current = grouped.get(key) ?? [];
    current.push(record);
    grouped.set(key, current);
  }

  return Array.from(grouped.values())
    .map((recordsForKey) =>
      [...recordsForKey].sort((left, right) => {
        const effectiveCompare = compareOptionalDates(left.effectiveFrom, right.effectiveFrom);
        if (effectiveCompare !== 0) return effectiveCompare;
        return (right.revision || "").localeCompare(left.revision || "");
      })[0],
    )
    .sort((left, right) => left.canonicalChargeName.localeCompare(right.canonicalChargeName));
}

export function getStandardBuyRateMaster() {
  return (standardBuyRatesSeed as StandardBuyRateRecord[]).slice();
}

export function getApplicableStandardBuyRates(params: {
  workflow: RateWorkflowSnapshot;
  asOfDate?: string | null;
  branch?: string | null;
  includeExpired?: boolean;
}) {
  const { workflow, asOfDate = null, branch = null, includeExpired = false } = params;
  const { chargeContext } = workflow;

  if (!chargeContext.direction || !chargeContext.transportMode || !chargeContext.loadType) {
    return [] as StandardBuyRateRecord[];
  }

  const filtered = getStandardBuyRateMaster().filter((record) => {
    if (!record.active) return false;
    if (record.direction !== chargeContext.direction) return false;
    if (record.mode !== chargeContext.transportMode) return false;
    if (record.loadType !== chargeContext.loadType) return false;
    if (branch && record.branch && normalizeText(record.branch) !== normalizeText(branch)) {
      return false;
    }
    if (!includeExpired && !isWithinEffectiveWindow(record, asOfDate)) {
      return false;
    }
    return true;
  });

  return selectLatestVersions(filtered);
}

export function detectStandardRateSignal(values: Array<string | null | undefined>): StandardRateSignal {
  const text = values.join("\n").toLowerCase();
  if (
    text.includes("standard charges applicable") ||
    text.includes("standard charge applicable") ||
    text.includes("standard rates applicable") ||
    text.includes("standard rate applicable")
  ) {
    return "STANDARD_CHARGES_APPLICABLE";
  }
  if (text.includes("as agreed") || text.includes("as per agreed")) {
    return "AS_AGREED";
  }
  return null;
}

export function getStandardRateReferenceForLine(params: {
  workflow: RateWorkflowSnapshot;
  canonicalChargeCode: string;
  containerText?: string | null;
  asOfDate?: string | null;
  branch?: string | null;
  includeExpired?: boolean;
}) {
  const candidates = getApplicableStandardBuyRates({
    workflow: params.workflow,
    asOfDate: params.asOfDate ?? null,
    branch: params.branch ?? null,
    includeExpired: params.includeExpired ?? false,
  }).filter((record) => record.canonicalChargeCode === normalizeText(params.canonicalChargeCode));

  if (candidates.length === 0) return null;

  const requestedContainer = normalizeContainerType(params.containerText);
  const exactContainerMatch =
    requestedContainer
      ? candidates.find((record) => normalizeContainerType(record.containerType) === requestedContainer)
      : null;

  return exactContainerMatch || candidates.find((record) => !record.containerType) || candidates[0];
}

export function getStandardRateQuantityBasis(record: StandardBuyRateRecord) {
  switch (normalizeText(record.unit)) {
    case "CBM":
      return "Per CBM";
    case "BL":
      return "Per BL";
    case "CNTR":
    case "CONTAINER":
      return "Per container";
    case "KG":
      return "Per kg";
    default:
      return `Per ${record.unit}`;
  }
}
