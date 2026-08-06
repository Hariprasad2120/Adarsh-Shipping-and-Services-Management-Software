export type CrmRateDepartment = "FREIGHT_FORWARDING" | "CUSTOMS_CLEARANCE";

export type CrmQuoteWorkflowMode =
  | "freight-only"
  | "customs-only"
  | "combined"
  | "newly-added-only";

export type FreightRateValues = {
  oceanFreight?: number;
  cfsCharges?: number;
  vgmCharges?: number;
};

export type CustomsRateValues = {
  customsClearance?: number;
  doCharges?: number;
  blCharges?: number;
};

export type DepartmentRateValues = FreightRateValues | CustomsRateValues;

export type RateWorkflowSnapshot = {
  freightRates: FreightRateValues;
  customsRates: CustomsRateValues;
  freightSubmittedAt: string | null;
  customsSubmittedAt: string | null;
  freightSubmittedById: string | null;
  customsSubmittedById: string | null;
  latestQuoteId: string | null;
  latestQuoteVersion: number | null;
  quoteBaseNumber: string | null;
  lastQuotedFreightSignature: string | null;
  lastQuotedCustomsSignature: string | null;
};

export const FREIGHT_RATE_FIELDS = [
  "oceanFreight",
  "cfsCharges",
  "vgmCharges",
] as const;

export const CUSTOMS_RATE_FIELDS = [
  "customsClearance",
  "doCharges",
  "blCharges",
] as const;

type FreightRateKey = (typeof FREIGHT_RATE_FIELDS)[number];
type CustomsRateKey = (typeof CUSTOMS_RATE_FIELDS)[number];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function cleanObject<T extends Record<string, number>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [key, Number(entryValue) || 0]),
  ) as T;
}

export function getRateWorkflowSnapshot(enquiryDetails: unknown): RateWorkflowSnapshot {
  const root = asRecord(enquiryDetails);
  const workflow = asRecord(root.rateWorkflow);
  const legacyRates = asRecord(root.rates);
  const workflowFreightRates = asRecord(workflow.freightRates);
  const workflowCustomsRates = asRecord(workflow.customsRates);

  const freightRates: FreightRateValues = cleanObject({
    oceanFreight: asNumber(workflowFreightRates.oceanFreight ?? legacyRates.oceanFreight),
    cfsCharges: asNumber(workflowFreightRates.cfsCharges ?? legacyRates.cfsCharges),
    vgmCharges: asNumber(workflowFreightRates.vgmCharges ?? legacyRates.vgmCharges),
  });

  const customsRates: CustomsRateValues = cleanObject({
    customsClearance: asNumber(
      workflowCustomsRates.customsClearance ?? legacyRates.customsClearance,
    ),
    doCharges: asNumber(workflowCustomsRates.doCharges ?? legacyRates.doCharges),
    blCharges: asNumber(workflowCustomsRates.blCharges ?? legacyRates.blCharges),
  });

  return {
    freightRates,
    customsRates,
    freightSubmittedAt:
      typeof workflow.freightSubmittedAt === "string" ? workflow.freightSubmittedAt : null,
    customsSubmittedAt:
      typeof workflow.customsSubmittedAt === "string" ? workflow.customsSubmittedAt : null,
    freightSubmittedById:
      typeof workflow.freightSubmittedById === "string" ? workflow.freightSubmittedById : null,
    customsSubmittedById:
      typeof workflow.customsSubmittedById === "string" ? workflow.customsSubmittedById : null,
    latestQuoteId: typeof workflow.latestQuoteId === "string" ? workflow.latestQuoteId : null,
    latestQuoteVersion:
      typeof workflow.latestQuoteVersion === "number" ? workflow.latestQuoteVersion : null,
    quoteBaseNumber:
      typeof workflow.quoteBaseNumber === "string" ? workflow.quoteBaseNumber : null,
    lastQuotedFreightSignature:
      typeof workflow.lastQuotedFreightSignature === "string"
        ? workflow.lastQuotedFreightSignature
        : null,
    lastQuotedCustomsSignature:
      typeof workflow.lastQuotedCustomsSignature === "string"
        ? workflow.lastQuotedCustomsSignature
        : null,
  };
}

export function mergeDepartmentRates(workflow: RateWorkflowSnapshot) {
  return {
    ...workflow.freightRates,
    ...workflow.customsRates,
  };
}

export function normalizeDepartmentRates(
  department: CrmRateDepartment,
  values: DepartmentRateValues,
) {
  if (department === "FREIGHT_FORWARDING") {
    const source = values as FreightRateValues;
    return cleanObject({
      oceanFreight: asNumber(source.oceanFreight),
      cfsCharges: asNumber(source.cfsCharges),
      vgmCharges: asNumber(source.vgmCharges),
    });
  }

  const source = values as CustomsRateValues;
  return cleanObject({
    customsClearance: asNumber(source.customsClearance),
    doCharges: asNumber(source.doCharges),
    blCharges: asNumber(source.blCharges),
  });
}

export function departmentHasSubmittedRates(
  workflow: RateWorkflowSnapshot,
  department: CrmRateDepartment,
) {
  const rates =
    department === "FREIGHT_FORWARDING" ? workflow.freightRates : workflow.customsRates;
  return Object.values(rates).some((value) => Number(value) > 0);
}

export function getPendingDepartments(workflow: RateWorkflowSnapshot) {
  const pending: CrmRateDepartment[] = [];
  if (!departmentHasSubmittedRates(workflow, "FREIGHT_FORWARDING")) {
    pending.push("FREIGHT_FORWARDING");
  }
  if (!departmentHasSubmittedRates(workflow, "CUSTOMS_CLEARANCE")) {
    pending.push("CUSTOMS_CLEARANCE");
  }
  return pending;
}

export function getIncludedDepartmentsForMode(
  mode: CrmQuoteWorkflowMode,
  workflow: RateWorkflowSnapshot,
) {
  if (mode === "freight-only") {
    return departmentHasSubmittedRates(workflow, "FREIGHT_FORWARDING")
      ? (["FREIGHT_FORWARDING"] as CrmRateDepartment[])
      : [];
  }

  if (mode === "customs-only") {
    return departmentHasSubmittedRates(workflow, "CUSTOMS_CLEARANCE")
      ? (["CUSTOMS_CLEARANCE"] as CrmRateDepartment[])
      : [];
  }

  if (mode === "newly-added-only") {
    return getDepartmentsWithUnquotedChanges(workflow);
  }

  const included: CrmRateDepartment[] = [];
  if (departmentHasSubmittedRates(workflow, "FREIGHT_FORWARDING")) {
    included.push("FREIGHT_FORWARDING");
  }
  if (departmentHasSubmittedRates(workflow, "CUSTOMS_CLEARANCE")) {
    included.push("CUSTOMS_CLEARANCE");
  }
  return included;
}

export function getBaseQuoteNumber(quoteNumber: string) {
  return quoteNumber.replace(/\s*-\s*V\d+$/i, "").trim();
}

export function getVersionedQuoteNumber(baseQuoteNumber: string, version: number) {
  return `${getBaseQuoteNumber(baseQuoteNumber)} - V${version}`;
}

export function createRatesSignature(values: Record<string, number>) {
  const normalized = Object.entries(values)
    .map(([key, value]) => [key, Number(value) || 0] as const)
    .sort(([left], [right]) => left.localeCompare(right))
    .filter(([, value]) => value > 0);
  return JSON.stringify(normalized);
}

export function getDepartmentsWithUnquotedChanges(workflow: RateWorkflowSnapshot) {
  const changed: CrmRateDepartment[] = [];
  const freightSignature = createRatesSignature(
    workflow.freightRates as Record<string, number>,
  );
  const customsSignature = createRatesSignature(
    workflow.customsRates as Record<string, number>,
  );

  if (
    departmentHasSubmittedRates(workflow, "FREIGHT_FORWARDING") &&
    freightSignature !== (workflow.lastQuotedFreightSignature ?? "[]")
  ) {
    changed.push("FREIGHT_FORWARDING");
  }

  if (
    departmentHasSubmittedRates(workflow, "CUSTOMS_CLEARANCE") &&
    customsSignature !== (workflow.lastQuotedCustomsSignature ?? "[]")
  ) {
    changed.push("CUSTOMS_CLEARANCE");
  }

  return changed;
}

export function diffDepartmentRates(
  previous: Record<string, number>,
  current: Record<string, number>,
) {
  const keys = new Set([...Object.keys(previous), ...Object.keys(current)]);
  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];

  for (const key of keys) {
    const before = Number(previous[key] ?? 0);
    const after = Number(current[key] ?? 0);

    if (before <= 0 && after > 0) {
      added.push(key);
      continue;
    }
    if (before > 0 && after <= 0) {
      removed.push(key);
      continue;
    }
    if (before !== after) {
      modified.push(key);
    }
  }

  return { added, removed, modified };
}

export function buildDepartmentRateLabels(department: CrmRateDepartment) {
  if (department === "FREIGHT_FORWARDING") {
    return {
      oceanFreight: "Ocean Freight",
      cfsCharges: "CFS Charges",
      vgmCharges: "VGM Charges",
    } satisfies Record<FreightRateKey, string>;
  }

  return {
    customsClearance: "Customs Clearance Charges (INR)",
    doCharges: "DO Charges (INR)",
    blCharges: "BL Charges (INR)",
  } satisfies Record<CustomsRateKey, string>;
}

export function buildQuoteLineItemsFromWorkflow(params: {
  enquiryDetails: unknown;
  mode: CrmQuoteWorkflowMode;
}) {
  const workflow = getRateWorkflowSnapshot(params.enquiryDetails);
  const includedDepartments = getIncludedDepartmentsForMode(params.mode, workflow);
  const items: Array<{
    description: string;
    hsnSac: string;
    unit: string;
    quantity: number;
    rate: number;
    tax: string;
    tds: string;
    amount: number;
  }> = [];

  const pushItem = (description: string, rate: number) => {
    if (!rate || rate <= 0) return;
    items.push({
      description,
      hsnSac: "996712",
      unit: "Shipment",
      quantity: 1,
      rate,
      tax: "GST 18%",
      tds: "None",
      amount: rate,
    });
  };

  if (includedDepartments.includes("FREIGHT_FORWARDING")) {
    pushItem("Ocean Freight", workflow.freightRates.oceanFreight ?? 0);
    pushItem("CFS Charges", workflow.freightRates.cfsCharges ?? 0);
    pushItem("VGM Charges", workflow.freightRates.vgmCharges ?? 0);
  }

  if (includedDepartments.includes("CUSTOMS_CLEARANCE")) {
    pushItem(
      "Customs Clearance Charges",
      workflow.customsRates.customsClearance ?? 0,
    );
    pushItem("DO Charges", workflow.customsRates.doCharges ?? 0);
    pushItem("BL Charges", workflow.customsRates.blCharges ?? 0);
  }

  return {
    items,
    includedDepartments,
    pendingDepartments: getPendingDepartments(workflow),
    workflow,
  };
}
