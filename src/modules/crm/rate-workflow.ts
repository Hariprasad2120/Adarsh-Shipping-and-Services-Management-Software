export type CrmRateDepartment = "FREIGHT_FORWARDING" | "CUSTOMS_CLEARANCE";

export type CrmQuoteWorkflowMode =
  | "freight-only"
  | "customs-only"
  | "combined"
  | "newly-added-only";

export type CommercialWorkflowStatus =
  | "READY_FOR_RATE_REQUEST"
  | "RATE_REQUESTS_SENT"
  | "AWAITING_AGENT_RATES"
  | "PARTIALLY_RECEIVED"
  | "RATES_RECEIVED"
  | "RATE_COMPARISON"
  | "RATE_FINALIZED"
  | "PRICING"
  | "QUOTATION_READY";

export type ChargeUnit = "WM" | "BL" | "CONTAINER" | "KG" | "SHIPMENT";

export type ChargeScenarioKey =
  | "IMPORT_LCL"
  | "IMPORT_FCL"
  | "IMPORT_AIR"
  | "EXPORT_LCL"
  | "EXPORT_FCL"
  | "EXPORT_AIR";

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

export type EnquiryChargeContext = {
  direction: "IMP" | "EXP" | null;
  transportMode: "SEA" | "AIR" | null;
  loadType: "LCL" | "FCL" | "AIR" | null;
  scenarioKey: ChargeScenarioKey | null;
  scenarioLabel: string;
};

export type EnquiryChargeEntry = {
  id: string;
  code: string;
  name: string;
  department: CrmRateDepartment;
  unitOptions: ChargeUnit[];
  unit: ChargeUnit;
  amount: number;
  mandatory: boolean;
  active: boolean;
  source: "CATALOGUE" | "ADDITIONAL";
  displayOrder: number;
};

export type EnquiryRateRequestRecord = {
  id: string;
  vendorId: string | null;
  vendorName: string;
  recipientName: string;
  recipientEmail: string;
  ccEmails: string[];
  subject: string;
  body: string;
  notes: string | null;
  sentAt: string;
  sentById: string;
  messageId: string | null;
  threadId: string | null;
  deliveryState:
    | "SENT"
    | "DELIVERED"
    | "OPENED"
    | "REPLIED"
    | "FAILED"
    | "BOUNCED";
  bounce: boolean;
  opened: boolean;
  firstOpenAt: string | null;
  lastOpenAt: string | null;
  replyStatus: "PENDING" | "REPLIED" | "BOUNCED";
  replyTimestamp: string | null;
  replyMessageId: string | null;
  replyFromEmail: string | null;
  responseThreadSubject: string | null;
  lastSyncedAt: string | null;
  replyNotifiedAt: string | null;
};

export type EnquiryChargeAliasRecord = {
  id: string;
  externalName: string;
  canonicalCode: string;
  canonicalName: string;
  confirmedAt: string;
  confirmedById: string;
};

export type StandardRateReference = {
  id: string;
  canonicalChargeCode: string;
  canonicalChargeName: string;
  currency: string;
  unit: string;
  rate: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  branch: string | null;
  revision: string | null;
  containerType: string | null;
  sourceDocument: string;
  sourceExcerpt: string;
  appliedReason: "STANDARD_CHARGES_APPLICABLE" | "AS_AGREED";
  explicitAgentOverride: boolean;
};

export type AgentRateLineRecord = {
  id: string;
  canonicalChargeCode: string;
  canonicalChargeName: string;
  originalDescription: string;
  amount: number;
  amountSourceText: string | null;
  amountMissing: boolean;
  currency: string;
  unit: string;
  quantityBasis: string;
  quantityText: string | null;
  containerText: string | null;
  minimumCharge: string | null;
  taxText: string | null;
  freeDaysText: string | null;
  inclusionStatus: "INCLUDED" | "EXCLUDED" | "UNSPECIFIED";
  notes: string | null;
  confidenceScore: number | null;
  confidenceLabel: "HIGH" | "MEDIUM" | "LOW" | null;
  reviewStatus: "MANUAL" | "REVIEW_REQUIRED" | "AUTO_MAPPED";
  missingFields: string[];
  standardRateReference: StandardRateReference | null;
  evidence: Array<{
    field: string;
    sourceType: "EMAIL_TEXT" | "EMAIL_HTML" | "ATTACHMENT";
    sourceName: string;
    excerpt: string;
    confidenceScore: number;
  }>;
};

export type AgentRateResponseRecord = {
  id: string;
  requestId: string;
  vendorId: string | null;
  vendorName: string;
  messageId: string | null;
  threadId: string | null;
  receivedAt: string;
  currency: string;
  validity: string | null;
  carrier: string | null;
  routing: string | null;
  transit: string | null;
  remarks: string | null;
  standardRateSignal: "STANDARD_CHARGES_APPLICABLE" | "AS_AGREED" | null;
  parserStatus: "MANUAL" | "AI_REVIEW_REQUIRED" | "AUTO_MAPPED";
  parserModel: string | null;
  parserRunAt: string | null;
  overallConfidence: number | null;
  sources: Array<{
    id: string;
    name: string;
    kind: "EMAIL_TEXT" | "EMAIL_HTML" | "ATTACHMENT";
    mimeType: string;
  }>;
  warnings: string[];
  lines: AgentRateLineRecord[];
  createdById: string;
  updatedAt: string;
};

export type RateComparisonSelectionMode = "ENTIRE_AGENT" | "PER_CHARGE";

export type RateComparisonChargeSelection = {
  chargeCode: string;
  responseId: string;
  lineId: string | null;
};

export type RateRecommendationOverrideReason =
  | "CUSTOMER_PREFERENCE"
  | "PREFERRED_CARRIER"
  | "BETTER_TRANSIT"
  | "CREDIT_TERMS"
  | "OPERATIONAL_RELIABILITY"
  | "RELATIONSHIP"
  | "MANAGEMENT_DECISION"
  | "OTHER";

export type RateComparisonRecommendationFactor = {
  key:
    | "LANDED_BUY_COST"
    | "COMPLETENESS"
    | "VALIDITY"
    | "RESPONSE_TIME"
    | "OPERATIONAL_RELIABILITY"
    | "HISTORICAL_COMPETITIVENESS"
    | "BOOKING_HISTORY"
    | "DATA_CONFIDENCE";
  label: string;
  weightPct: number;
  scorePct: number | null;
  detail: string;
};

export type RateComparisonRecommendationSnapshot = {
  responseId: string | null;
  vendorName: string | null;
  totalScore: number | null;
  explanation: string | null;
  factors: RateComparisonRecommendationFactor[];
  generatedAt: string | null;
};

export type RateComparisonSelectionRecord = {
  mode: RateComparisonSelectionMode;
  selectedResponseId: string | null;
  chargeSelections: RateComparisonChargeSelection[];
  aiRecommendation: RateComparisonRecommendationSnapshot;
  overrideReason: RateRecommendationOverrideReason | null;
  overrideNote: string | null;
  savedAt: string | null;
  savedById: string | null;
};

export type RateRecommendationReason = {
  label: string;
  detail: string;
};

export type RateRecommendationDecisionRecord = {
  status: "PENDING" | "ACCEPTED" | "OVERRIDDEN";
  decidedAt: string | null;
  decidedById: string | null;
  selectedMode: RateComparisonSelectionMode | null;
  selectedResponseId: string | null;
  selectedChargeSelections: RateComparisonChargeSelection[];
  overrideReasons: string[];
  overrideNote: string | null;
};

export type RateRecommendationRecord = {
  generatedAt: string;
  model: string;
  strategy: "AI_ASSISTED" | "DETERMINISTIC";
  recommendedMode: RateComparisonSelectionMode;
  recommendedResponseId: string | null;
  recommendedChargeSelections: RateComparisonChargeSelection[];
  recommendedTotalInBaseCurrency: number | null;
  recommendedVendorIds: string[];
  confidenceScore: number | null;
  explanation: string;
  reasons: RateRecommendationReason[];
  decision: RateRecommendationDecisionRecord;
};

export type FinalizedBuyRateLineRecord = {
  id: string;
  chargeCode: string;
  chargeName: string;
  department: CrmRateDepartment;
  vendorId: string | null;
  vendorName: string;
  requestId: string;
  responseId: string;
  lineId: string | null;
  originalAmount: number | null;
  originalCurrency: string | null;
  originalUnit: string | null;
  normalizedAmountInBaseCurrency: number | null;
  normalizedCurrency: string;
  quantityMultiplier: number | null;
  minimumChargeAmount: number | null;
  taxPercent: number | null;
  validity: string | null;
  carrier: string | null;
  routing: string | null;
  transit: string | null;
  sourceMode: RateComparisonSelectionMode;
  recommended: boolean;
  overriddenRecommendation: boolean;
  finalizedAt: string;
};

export type FinalizedBuyRateVersionRecord = {
  id: string;
  versionNumber: number;
  versionLabel: string;
  createdAt: string;
  createdById: string;
  sourceRecommendationGeneratedAt: string | null;
  decisionStatus: "ACCEPTED" | "OVERRIDDEN";
  selectedMode: RateComparisonSelectionMode;
  selectedResponseId: string | null;
  selectedChargeSelections: RateComparisonChargeSelection[];
  baseCurrency: string;
  totalInBaseCurrency: number;
  notes: string | null;
  lines: FinalizedBuyRateLineRecord[];
};

export type PricingSnapshotLineRecord = {
  id: string;
  finalizedLineId: string;
  chargeCode: string;
  chargeName: string;
  department: CrmRateDepartment;
  unit: string;
  quantity: number;
  currency: string;
  buyAmount: number;
  sellAmount: number;
  marginAmount: number;
  marginPercent: number | null;
  taxPercent: number | null;
  vendorName: string;
  included: boolean;
  notes: string | null;
};

export type PricingSnapshotRecord = {
  id: string;
  basedOnFinalizedVersionId: string;
  basedOnFinalizedVersionLabel: string;
  pricingMode: "LINE_SELL_RATE";
  currency: string;
  createdAt: string;
  updatedAt: string;
  updatedById: string;
  notes: string | null;
  totals: {
    buyAmount: number;
    sellAmount: number;
    marginAmount: number;
    marginPercent: number | null;
    includedLineCount: number;
  };
  lines: PricingSnapshotLineRecord[];
};

export type RateWorkflowSnapshot = {
  freightRates: FreightRateValues;
  customsRates: CustomsRateValues;
  freightCharges: EnquiryChargeEntry[];
  customsCharges: EnquiryChargeEntry[];
  rateRequests: EnquiryRateRequestRecord[];
  rateResponses: AgentRateResponseRecord[];
  comparisonSelection: RateComparisonSelectionRecord;
  rateRecommendation: RateRecommendationRecord | null;
  finalizedBuyRateVersions: FinalizedBuyRateVersionRecord[];
  currentFinalizedBuyRateVersionId: string | null;
  pricingSnapshot: PricingSnapshotRecord | null;
  chargeAliases: EnquiryChargeAliasRecord[];
  chargeContext: EnquiryChargeContext;
  commercialStatus: CommercialWorkflowStatus;
  costingLocked: boolean;
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

type ChargeTemplate = {
  code: string;
  name: string;
  department: CrmRateDepartment;
  units: ChargeUnit[];
  mandatory: boolean;
  displayOrder: number;
  active: boolean;
};

type ChargeTemplateSeed = Omit<ChargeTemplate, "displayOrder" | "active">;

const VALID_COMMERCIAL_STATUSES = new Set<CommercialWorkflowStatus>([
  "READY_FOR_RATE_REQUEST",
  "RATE_REQUESTS_SENT",
  "AWAITING_AGENT_RATES",
  "PARTIALLY_RECEIVED",
  "RATES_RECEIVED",
  "RATE_COMPARISON",
  "RATE_FINALIZED",
  "PRICING",
  "QUOTATION_READY",
]);

const CHARGE_UNIT_LABELS: Record<ChargeUnit, string> = {
  WM: "W/M",
  BL: "BL",
  CONTAINER: "Container",
  KG: "Kg",
  SHIPMENT: "Shipment",
};

const LEGACY_FIELD_BY_CODE: Partial<Record<string, string>> = {
  OCEAN_FREIGHT: "oceanFreight",
  CFS: "cfsCharges",
  VGM: "vgmCharges",
  CUSTOM_CLEARANCE: "customsClearance",
  DO: "doCharges",
  BL: "blCharges",
};

const CHARGE_CATALOGUE: Record<ChargeScenarioKey, ChargeTemplate[]> = {
  IMPORT_LCL: buildTemplateSet([
    seed("OCEAN_FREIGHT", "Ocean Freight", "FREIGHT_FORWARDING", ["WM"], true),
    seed("ORIGIN_CFS", "Origin CFS", "FREIGHT_FORWARDING", ["WM"], false),
    seed("ORIGIN_CHARGES", "Origin charges", "FREIGHT_FORWARDING", ["BL"], false),
    seed("PICK_UP_CHARGES", "Pick up charges", "FREIGHT_FORWARDING", ["BL"], false),
    seed("EXPORT_LICENSE", "Export License", "CUSTOMS_CLEARANCE", ["BL"], false),
    seed("LCL", "LCL", "FREIGHT_FORWARDING", ["WM"], false),
    seed("DO", "DO", "CUSTOMS_CLEARANCE", ["BL"], true),
    seed("CUSTOM_CLEARANCE", "Custom clearance", "CUSTOMS_CLEARANCE", ["BL"], true),
    seed(
      "LOADING_UNLOADING",
      "Loading & Unloading",
      "FREIGHT_FORWARDING",
      ["BL"],
      false,
    ),
    seed("CFS", "CFS", "FREIGHT_FORWARDING", ["WM"], true),
    seed("DOCUMENTATION", "Documentation", "CUSTOMS_CLEARANCE", ["BL"], false),
    seed("INSURANCE", "Insurance", "FREIGHT_FORWARDING", ["BL"], false),
    seed("TRANSPORTATION", "Transportation", "FREIGHT_FORWARDING", ["SHIPMENT"], false),
  ]),
  IMPORT_FCL: buildTemplateSet([
    seed("OCEAN_FREIGHT", "Ocean Freight", "FREIGHT_FORWARDING", ["CONTAINER"], true),
    seed("EXW_CHARGES", "EXW charges", "FREIGHT_FORWARDING", ["CONTAINER"], false),
    seed(
      "HBL_MANIFESTATION",
      "HBL Manifestation",
      "CUSTOMS_CLEARANCE",
      ["BL"],
      false,
    ),
    seed("HBL_DO", "HBL DO", "CUSTOMS_CLEARANCE", ["BL"], true),
    seed("CUSTOM_CLEARANCE", "Custom clearance", "CUSTOMS_CLEARANCE", ["CONTAINER"], true),
    seed("CFS", "CFS", "FREIGHT_FORWARDING", ["CONTAINER"], true),
    seed("DO", "DO", "CUSTOMS_CLEARANCE", ["CONTAINER"], true),
    seed("INSURANCE", "Insurance", "FREIGHT_FORWARDING", ["BL"], false),
    seed("TRANSPORTATION", "Transportation", "FREIGHT_FORWARDING", ["CONTAINER"], false),
  ]),
  IMPORT_AIR: buildTemplateSet([
    seed("AIR_FREIGHT", "Air Freight", "FREIGHT_FORWARDING", ["KG"], true),
    seed("ORIGIN_CHARGES", "Origin charges", "FREIGHT_FORWARDING", ["BL"], false),
    seed("PICK_UP_CHARGES", "Pick up charges", "FREIGHT_FORWARDING", ["BL"], false),
    seed(
      "HAWB_MANIFESTATION",
      "HAWB Manifestation",
      "CUSTOMS_CLEARANCE",
      ["BL"],
      false,
    ),
    seed("HAWB_DO", "HAWB DO", "CUSTOMS_CLEARANCE", ["BL"], true),
    seed("CUSTOM_CLEARANCE", "Custom clearance", "CUSTOMS_CLEARANCE", ["BL"], true),
    seed("AIRLINE_DO", "Airline DO", "CUSTOMS_CLEARANCE", ["BL"], false),
    seed("AAI_CHARGES", "AAI charges", "CUSTOMS_CLEARANCE", ["BL"], false),
    seed("INSURANCE", "Insurance", "FREIGHT_FORWARDING", ["BL"], false),
    seed("TRANSPORTATION", "Transportation", "FREIGHT_FORWARDING", ["SHIPMENT"], false),
  ]),
  EXPORT_LCL: buildTemplateSet([
    seed("OCEAN_FREIGHT", "Ocean Freight", "FREIGHT_FORWARDING", ["WM"], true),
    seed("THC", "THC", "FREIGHT_FORWARDING", ["WM"], true),
    seed("BL", "BL", "CUSTOMS_CLEARANCE", ["BL"], true),
    seed("CUSTOM_CLEARANCE", "Custom clearance", "CUSTOMS_CLEARANCE", ["BL"], true),
    seed(
      "LOADING_UNLOADING",
      "Loading & Unloading",
      "FREIGHT_FORWARDING",
      ["BL"],
      false,
    ),
    seed("CFS", "CFS", "FREIGHT_FORWARDING", ["BL"], false),
    seed(
      "PHYTOSANITARY_CHARGES",
      "Phytosanitary charges",
      "CUSTOMS_CLEARANCE",
      ["BL"],
      false,
    ),
    seed("FUMIGATION", "Fumigation", "CUSTOMS_CLEARANCE", ["BL"], false),
    seed("INSURANCE", "Insurance", "FREIGHT_FORWARDING", ["BL"], false),
    seed("TRANSPORTATION", "Transportation", "FREIGHT_FORWARDING", ["SHIPMENT"], false),
  ]),
  EXPORT_FCL: buildTemplateSet([
    seed("OCEAN_FREIGHT", "Ocean Freight", "FREIGHT_FORWARDING", ["CONTAINER"], true),
    seed("THC", "THC", "FREIGHT_FORWARDING", ["CONTAINER"], true),
    seed("BL", "BL", "CUSTOMS_CLEARANCE", ["BL"], true),
    seed("VGM", "VGM", "FREIGHT_FORWARDING", ["CONTAINER"], true),
    seed("MUC", "MUC", "FREIGHT_FORWARDING", ["CONTAINER"], false),
    seed("SEAL", "Seal", "FREIGHT_FORWARDING", ["CONTAINER"], false),
    seed("SURRENDER_BL", "Surrender BL", "CUSTOMS_CLEARANCE", ["BL"], false),
    seed("CUSTOM_CLEARANCE", "Custom clearance", "CUSTOMS_CLEARANCE", ["CONTAINER"], true),
    seed(
      "LOADING_UNLOADING",
      "Loading & Unloading",
      "FREIGHT_FORWARDING",
      ["CONTAINER"],
      false,
    ),
    seed("CFS", "CFS", "FREIGHT_FORWARDING", ["CONTAINER"], false),
    seed(
      "PHYTOSANITARY_CHARGES",
      "Phytosanitary charges",
      "CUSTOMS_CLEARANCE",
      ["CONTAINER"],
      false,
    ),
    seed("FUMIGATION", "Fumigation", "CUSTOMS_CLEARANCE", ["CONTAINER"], false),
    seed("INSURANCE", "Insurance", "FREIGHT_FORWARDING", ["BL"], false),
    seed(
      "EMPTY_CONTAINER_PICKUP",
      "Empty container pick up",
      "FREIGHT_FORWARDING",
      ["CONTAINER"],
      false,
    ),
    seed("TRANSPORTATION", "Transportation", "FREIGHT_FORWARDING", ["CONTAINER"], false),
  ]),
  EXPORT_AIR: buildTemplateSet([
    seed("AIR_FREIGHT", "Air Freight", "FREIGHT_FORWARDING", ["KG"], true),
    seed("OTHC", "OTHC", "FREIGHT_FORWARDING", ["BL"], false),
    seed("AMS", "AMS", "CUSTOMS_CLEARANCE", ["BL"], false),
    seed("AWB", "AWB", "CUSTOMS_CLEARANCE", ["BL"], true),
    seed("CUSTOM_CLEARANCE", "Custom clearance", "CUSTOMS_CLEARANCE", ["BL"], true),
    seed("AAI_CHARGES", "AAI charges", "CUSTOMS_CLEARANCE", ["BL"], false),
    seed("INSURANCE", "Insurance", "FREIGHT_FORWARDING", ["BL"], false),
    seed("TRANSPORTATION", "Transportation", "FREIGHT_FORWARDING", ["SHIPMENT"], false),
  ]),
};

function seed(
  code: string,
  name: string,
  department: CrmRateDepartment,
  units: ChargeUnit[],
  mandatory: boolean,
): ChargeTemplateSeed {
  return {
    code,
    name,
    department,
    units,
    mandatory,
  };
}

function buildTemplateSet(seeds: ChargeTemplateSeed[]) {
  return seeds.map((entry, index) => ({
    ...entry,
    displayOrder: index + 1,
    active: true,
  }));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
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

function normalizeCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isChargeUnit(value: unknown): value is ChargeUnit {
  return value === "WM" || value === "BL" || value === "CONTAINER" || value === "KG" || value === "SHIPMENT";
}

function normalizeChargeUnits(value: unknown, fallback: ChargeUnit[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const units = value.filter(isChargeUnit);
  return units.length > 0 ? units : fallback;
}

function normalizeStoredCharge(
  raw: unknown,
  fallbackDepartment: CrmRateDepartment,
): EnquiryChargeEntry | null {
  const record = asRecord(raw);
  const name = String(record.name ?? "").trim();
  const code = normalizeCode(String(record.code ?? name));
  if (!name || !code) {
    return null;
  }

  const unitOptions = normalizeChargeUnits(record.unitOptions, [
    isChargeUnit(record.unit) ? record.unit : "BL",
  ]);
  const unit = isChargeUnit(record.unit) ? record.unit : unitOptions[0];
  const department =
    record.department === "FREIGHT_FORWARDING" || record.department === "CUSTOMS_CLEARANCE"
      ? record.department
      : fallbackDepartment;
  const source = record.source === "ADDITIONAL" ? "ADDITIONAL" : "CATALOGUE";

  return {
    id:
      typeof record.id === "string" && record.id.trim()
        ? record.id
        : `${department}:${source}:${code}`,
    code,
    name,
    department,
    unitOptions,
    unit,
    amount: asNumber(record.amount),
    mandatory: Boolean(record.mandatory),
    active: record.active !== false,
    source,
    displayOrder: Math.max(1, Math.trunc(asNumber(record.displayOrder)) || 1),
  };
}

function normalizeStoredRateRequest(raw: unknown): EnquiryRateRequestRecord | null {
  const record = asRecord(raw);
  const recipientEmail = String(record.recipientEmail ?? "").trim();
  const vendorName = String(record.vendorName ?? "").trim();
  const subject = String(record.subject ?? "").trim();
  const body = String(record.body ?? "");
  const sentAt = String(record.sentAt ?? "").trim();
  const sentById = String(record.sentById ?? "").trim();

  if (!recipientEmail || !vendorName || !subject || !body || !sentAt || !sentById) {
    return null;
  }

  return {
    id:
      typeof record.id === "string" && record.id.trim()
        ? record.id
        : `request:${recipientEmail}:${sentAt}`,
    vendorId:
      typeof record.vendorId === "string" && record.vendorId.trim() ? record.vendorId : null,
    vendorName,
    recipientName: String(record.recipientName ?? vendorName).trim() || vendorName,
    recipientEmail,
    ccEmails: asStringArray(record.ccEmails),
    subject,
    body,
    notes: typeof record.notes === "string" && record.notes.trim() ? record.notes.trim() : null,
    sentAt,
    sentById,
    messageId:
      typeof record.messageId === "string" && record.messageId.trim()
        ? record.messageId
        : null,
    threadId:
      typeof record.threadId === "string" && record.threadId.trim() ? record.threadId : null,
    deliveryState:
      record.deliveryState === "DELIVERED" ||
      record.deliveryState === "OPENED" ||
      record.deliveryState === "REPLIED" ||
      record.deliveryState === "FAILED" ||
      record.deliveryState === "BOUNCED"
        ? record.deliveryState
        : "SENT",
    bounce: record.bounce === true,
    opened: record.opened === true,
    firstOpenAt:
      typeof record.firstOpenAt === "string" && record.firstOpenAt.trim()
        ? record.firstOpenAt
        : null,
    lastOpenAt:
      typeof record.lastOpenAt === "string" && record.lastOpenAt.trim()
        ? record.lastOpenAt
        : null,
    replyStatus:
      record.replyStatus === "REPLIED" || record.replyStatus === "BOUNCED"
        ? record.replyStatus
        : "PENDING",
    replyTimestamp:
      typeof record.replyTimestamp === "string" && record.replyTimestamp.trim()
        ? record.replyTimestamp
        : null,
    replyMessageId:
      typeof record.replyMessageId === "string" && record.replyMessageId.trim()
        ? record.replyMessageId
        : null,
    replyFromEmail:
      typeof record.replyFromEmail === "string" && record.replyFromEmail.trim()
        ? record.replyFromEmail
        : null,
    responseThreadSubject:
      typeof record.responseThreadSubject === "string" && record.responseThreadSubject.trim()
        ? record.responseThreadSubject
        : null,
    lastSyncedAt:
      typeof record.lastSyncedAt === "string" && record.lastSyncedAt.trim()
        ? record.lastSyncedAt
        : null,
    replyNotifiedAt:
      typeof record.replyNotifiedAt === "string" && record.replyNotifiedAt.trim()
        ? record.replyNotifiedAt
        : null,
  };
}

function normalizeStoredChargeAlias(raw: unknown): EnquiryChargeAliasRecord | null {
  const record = asRecord(raw);
  const externalName = String(record.externalName ?? "").trim();
  const canonicalCode = normalizeCode(String(record.canonicalCode ?? ""));
  const canonicalName = String(record.canonicalName ?? "").trim();
  const confirmedAt = String(record.confirmedAt ?? "").trim();
  const confirmedById = String(record.confirmedById ?? "").trim();

  if (!externalName || !canonicalCode || !canonicalName || !confirmedAt || !confirmedById) {
    return null;
  }

  return {
    id:
      typeof record.id === "string" && record.id.trim()
        ? record.id
        : `alias:${canonicalCode}:${normalizeCode(externalName)}`,
    externalName,
    canonicalCode,
    canonicalName,
    confirmedAt,
    confirmedById,
  };
}

function normalizeStoredRateLine(raw: unknown): AgentRateLineRecord | null {
  const record = asRecord(raw);
  const originalDescription = String(record.originalDescription ?? "").trim();
  const canonicalChargeCode = normalizeCode(String(record.canonicalChargeCode ?? ""));
  const canonicalChargeName = String(record.canonicalChargeName ?? "").trim();

  if (!originalDescription || !canonicalChargeCode || !canonicalChargeName) {
    return null;
  }

  return {
    id:
      typeof record.id === "string" && record.id.trim()
        ? record.id
        : `line:${canonicalChargeCode}:${normalizeCode(originalDescription)}`,
    canonicalChargeCode,
    canonicalChargeName,
    originalDescription,
    amount: asNumber(record.amount),
    amountSourceText:
      typeof record.amountSourceText === "string" && record.amountSourceText.trim()
        ? record.amountSourceText
        : null,
    amountMissing: record.amountMissing === true,
    currency: String(record.currency ?? "").trim() || "INR",
    unit: String(record.unit ?? "").trim() || "Shipment",
    quantityBasis: String(record.quantityBasis ?? "").trim() || "Per shipment",
    quantityText:
      typeof record.quantityText === "string" && record.quantityText.trim()
        ? record.quantityText
        : null,
    containerText:
      typeof record.containerText === "string" && record.containerText.trim()
        ? record.containerText
        : null,
    minimumCharge:
      typeof record.minimumCharge === "string" && record.minimumCharge.trim()
        ? record.minimumCharge
        : null,
    taxText:
      typeof record.taxText === "string" && record.taxText.trim() ? record.taxText : null,
    freeDaysText:
      typeof record.freeDaysText === "string" && record.freeDaysText.trim()
        ? record.freeDaysText
        : null,
    inclusionStatus:
      record.inclusionStatus === "INCLUDED" || record.inclusionStatus === "EXCLUDED"
        ? record.inclusionStatus
        : "UNSPECIFIED",
    notes: typeof record.notes === "string" && record.notes.trim() ? record.notes : null,
    confidenceScore:
      typeof record.confidenceScore === "number" && Number.isFinite(record.confidenceScore)
        ? record.confidenceScore
        : null,
    confidenceLabel:
      record.confidenceLabel === "HIGH" ||
      record.confidenceLabel === "MEDIUM" ||
      record.confidenceLabel === "LOW"
        ? record.confidenceLabel
        : null,
    reviewStatus:
      record.reviewStatus === "REVIEW_REQUIRED" || record.reviewStatus === "AUTO_MAPPED"
        ? record.reviewStatus
        : "MANUAL",
    missingFields: asStringArray(record.missingFields),
    standardRateReference:
      record.standardRateReference && typeof record.standardRateReference === "object"
        ? (() => {
            const reference = asRecord(record.standardRateReference);
            const id = String(reference.id ?? "").trim();
            const canonicalChargeCode = normalizeCode(String(reference.canonicalChargeCode ?? ""));
            const canonicalChargeName = String(reference.canonicalChargeName ?? "").trim();
            const currency = String(reference.currency ?? "").trim();
            const unit = String(reference.unit ?? "").trim();
            const sourceDocument = String(reference.sourceDocument ?? "").trim();
            const sourceExcerpt = String(reference.sourceExcerpt ?? "").trim();
            if (
              !id ||
              !canonicalChargeCode ||
              !canonicalChargeName ||
              !currency ||
              !unit ||
              !sourceDocument ||
              !sourceExcerpt
            ) {
              return null;
            }
            return {
              id,
              canonicalChargeCode,
              canonicalChargeName,
              currency,
              unit,
              rate: asNumber(reference.rate),
              effectiveFrom:
                typeof reference.effectiveFrom === "string" && reference.effectiveFrom.trim()
                  ? reference.effectiveFrom
                  : null,
              effectiveTo:
                typeof reference.effectiveTo === "string" && reference.effectiveTo.trim()
                  ? reference.effectiveTo
                  : null,
              branch:
                typeof reference.branch === "string" && reference.branch.trim()
                  ? reference.branch
                  : null,
              revision:
                typeof reference.revision === "string" && reference.revision.trim()
                  ? reference.revision
                  : null,
              containerType:
                typeof reference.containerType === "string" && reference.containerType.trim()
                  ? reference.containerType
                  : null,
              sourceDocument,
              sourceExcerpt,
              appliedReason:
                reference.appliedReason === "AS_AGREED"
                  ? "AS_AGREED"
                  : "STANDARD_CHARGES_APPLICABLE",
              explicitAgentOverride: reference.explicitAgentOverride === true,
            } satisfies StandardRateReference;
          })()
        : null,
    evidence: Array.isArray(record.evidence)
      ? record.evidence
          .map((entry) => {
            const item = asRecord(entry);
            const field = String(item.field ?? "").trim();
            const sourceName = String(item.sourceName ?? "").trim();
            const excerpt = String(item.excerpt ?? "").trim();
            if (!field || !sourceName || !excerpt) {
              return null;
            }
            return {
              field,
              sourceType:
                item.sourceType === "EMAIL_HTML" || item.sourceType === "ATTACHMENT"
                  ? item.sourceType
                  : "EMAIL_TEXT",
              sourceName,
              excerpt,
              confidenceScore:
                typeof item.confidenceScore === "number" && Number.isFinite(item.confidenceScore)
                  ? item.confidenceScore
                  : 0.35,
            };
          })
          .filter(
            (
              entry,
            ): entry is {
              field: string;
              sourceType: "EMAIL_TEXT" | "EMAIL_HTML" | "ATTACHMENT";
              sourceName: string;
              excerpt: string;
              confidenceScore: number;
            } => Boolean(entry),
          )
      : [],
  };
}

function normalizeStoredRateResponse(raw: unknown): AgentRateResponseRecord | null {
  const record = asRecord(raw);
  const requestId = String(record.requestId ?? "").trim();
  const vendorName = String(record.vendorName ?? "").trim();
  const receivedAt = String(record.receivedAt ?? "").trim();
  const createdById = String(record.createdById ?? "").trim();
  const updatedAt = String(record.updatedAt ?? "").trim();

  if (!requestId || !vendorName || !receivedAt || !createdById || !updatedAt) {
    return null;
  }

  const lines = Array.isArray(record.lines)
    ? record.lines
        .map(normalizeStoredRateLine)
        .filter((entry): entry is AgentRateLineRecord => Boolean(entry))
    : [];

  return {
    id:
      typeof record.id === "string" && record.id.trim()
        ? record.id
        : `response:${requestId}`,
    requestId,
    vendorId:
      typeof record.vendorId === "string" && record.vendorId.trim() ? record.vendorId : null,
    vendorName,
    messageId:
      typeof record.messageId === "string" && record.messageId.trim() ? record.messageId : null,
    threadId:
      typeof record.threadId === "string" && record.threadId.trim() ? record.threadId : null,
    receivedAt,
    currency: String(record.currency ?? "").trim() || "INR",
    validity:
      typeof record.validity === "string" && record.validity.trim() ? record.validity : null,
    carrier:
      typeof record.carrier === "string" && record.carrier.trim() ? record.carrier : null,
    routing:
      typeof record.routing === "string" && record.routing.trim() ? record.routing : null,
    transit:
      typeof record.transit === "string" && record.transit.trim() ? record.transit : null,
    remarks:
      typeof record.remarks === "string" && record.remarks.trim() ? record.remarks : null,
    standardRateSignal:
      record.standardRateSignal === "STANDARD_CHARGES_APPLICABLE" ||
      record.standardRateSignal === "AS_AGREED"
        ? record.standardRateSignal
        : null,
    parserStatus:
      record.parserStatus === "AI_REVIEW_REQUIRED" || record.parserStatus === "AUTO_MAPPED"
        ? record.parserStatus
        : "MANUAL",
    parserModel:
      typeof record.parserModel === "string" && record.parserModel.trim()
        ? record.parserModel
        : null,
    parserRunAt:
      typeof record.parserRunAt === "string" && record.parserRunAt.trim()
        ? record.parserRunAt
        : null,
    overallConfidence:
      typeof record.overallConfidence === "number" && Number.isFinite(record.overallConfidence)
        ? record.overallConfidence
        : null,
    sources: Array.isArray(record.sources)
      ? record.sources
          .map((entry) => {
            const item = asRecord(entry);
            const id = String(item.id ?? "").trim();
            const name = String(item.name ?? "").trim();
            const mimeType = String(item.mimeType ?? "").trim();
            if (!id || !name || !mimeType) {
              return null;
            }
            return {
              id,
              name,
              kind:
                item.kind === "EMAIL_HTML" || item.kind === "ATTACHMENT"
                  ? item.kind
                  : "EMAIL_TEXT",
              mimeType,
            };
          })
          .filter(
            (
              entry,
            ): entry is {
              id: string;
              name: string;
              kind: "EMAIL_TEXT" | "EMAIL_HTML" | "ATTACHMENT";
              mimeType: string;
            } => Boolean(entry),
          )
      : [],
    warnings: asStringArray(record.warnings),
    lines,
    createdById,
    updatedAt,
  };
}

function normalizeStoredComparisonSelection(raw: unknown): RateComparisonSelectionRecord {
  const record = asRecord(raw);
  const chargeSelections = Array.isArray(record.chargeSelections)
    ? record.chargeSelections
        .map((entry) => {
          const item = asRecord(entry);
          const chargeCode = normalizeCode(String(item.chargeCode ?? ""));
          const responseId = String(item.responseId ?? "").trim();
          if (!chargeCode || !responseId) {
            return null;
          }

          return {
            chargeCode,
            responseId,
            lineId: typeof item.lineId === "string" && item.lineId.trim() ? item.lineId : null,
          } satisfies RateComparisonChargeSelection;
        })
        .filter(
          (
            entry,
          ): entry is RateComparisonChargeSelection => Boolean(entry),
        )
    : [];

  const recommendationRecord = asRecord(record.aiRecommendation);
  const recommendationFactors = Array.isArray(recommendationRecord.factors)
    ? recommendationRecord.factors
        .map((entry) => {
          const item = asRecord(entry);
          const key = String(item.key ?? "").trim().toUpperCase();
          const label = String(item.label ?? "").trim();
          const detail = String(item.detail ?? "").trim();
          const weightPct = Number(item.weightPct);
          const scorePctRaw = item.scorePct;

          if (!key || !label || !detail || !Number.isFinite(weightPct)) {
            return null;
          }

          return {
            key:
              key === "LANDED_BUY_COST" ||
              key === "COMPLETENESS" ||
              key === "VALIDITY" ||
              key === "RESPONSE_TIME" ||
              key === "OPERATIONAL_RELIABILITY" ||
              key === "HISTORICAL_COMPETITIVENESS" ||
              key === "BOOKING_HISTORY" ||
              key === "DATA_CONFIDENCE"
                ? key
                : null,
            label,
            weightPct,
            scorePct: Number.isFinite(Number(scorePctRaw)) ? Number(scorePctRaw) : null,
            detail,
          };
        })
        .filter(
          (
            entry,
          ): entry is RateComparisonRecommendationFactor => Boolean(entry?.key),
        )
        .map((entry) => ({
          ...entry,
          key: entry.key as RateComparisonRecommendationFactor["key"],
        }))
    : [];

  return {
    mode: record.mode === "ENTIRE_AGENT" ? "ENTIRE_AGENT" : "PER_CHARGE",
    selectedResponseId:
      typeof record.selectedResponseId === "string" && record.selectedResponseId.trim()
        ? record.selectedResponseId
        : null,
    chargeSelections,
    aiRecommendation: {
      responseId:
        typeof recommendationRecord.responseId === "string" && recommendationRecord.responseId.trim()
          ? recommendationRecord.responseId
          : null,
      vendorName:
        typeof recommendationRecord.vendorName === "string" && recommendationRecord.vendorName.trim()
          ? recommendationRecord.vendorName
          : null,
      totalScore: Number.isFinite(Number(recommendationRecord.totalScore))
        ? Number(recommendationRecord.totalScore)
        : null,
      explanation:
        typeof recommendationRecord.explanation === "string" &&
        recommendationRecord.explanation.trim()
          ? recommendationRecord.explanation
          : null,
      factors: recommendationFactors,
      generatedAt:
        typeof recommendationRecord.generatedAt === "string" &&
        recommendationRecord.generatedAt.trim()
          ? recommendationRecord.generatedAt
          : null,
    },
    overrideReason:
      record.overrideReason === "CUSTOMER_PREFERENCE" ||
      record.overrideReason === "PREFERRED_CARRIER" ||
      record.overrideReason === "BETTER_TRANSIT" ||
      record.overrideReason === "CREDIT_TERMS" ||
      record.overrideReason === "OPERATIONAL_RELIABILITY" ||
      record.overrideReason === "RELATIONSHIP" ||
      record.overrideReason === "MANAGEMENT_DECISION" ||
      record.overrideReason === "OTHER"
        ? record.overrideReason
        : null,
    overrideNote:
      typeof record.overrideNote === "string" && record.overrideNote.trim()
        ? record.overrideNote.trim()
        : null,
    savedAt: typeof record.savedAt === "string" && record.savedAt.trim() ? record.savedAt : null,
    savedById:
      typeof record.savedById === "string" && record.savedById.trim() ? record.savedById : null,
  };
}

function normalizeStoredRecommendationDecision(
  raw: unknown,
): RateRecommendationDecisionRecord {
  const record = asRecord(raw);
  const selectedChargeSelections = Array.isArray(record.selectedChargeSelections)
    ? record.selectedChargeSelections
        .map((entry) => {
          const item = asRecord(entry);
          const chargeCode = normalizeCode(String(item.chargeCode ?? ""));
          const responseId = String(item.responseId ?? "").trim();
          if (!chargeCode || !responseId) {
            return null;
          }

          return {
            chargeCode,
            responseId,
            lineId: typeof item.lineId === "string" && item.lineId.trim() ? item.lineId : null,
          } satisfies RateComparisonChargeSelection;
        })
        .filter(
          (
            entry,
          ): entry is RateComparisonChargeSelection => Boolean(entry),
        )
    : [];

  return {
    status:
      record.status === "ACCEPTED" || record.status === "OVERRIDDEN"
        ? record.status
        : "PENDING",
    decidedAt:
      typeof record.decidedAt === "string" && record.decidedAt.trim() ? record.decidedAt : null,
    decidedById:
      typeof record.decidedById === "string" && record.decidedById.trim()
        ? record.decidedById
        : null,
    selectedMode:
      record.selectedMode === "ENTIRE_AGENT" || record.selectedMode === "PER_CHARGE"
        ? record.selectedMode
        : null,
    selectedResponseId:
      typeof record.selectedResponseId === "string" && record.selectedResponseId.trim()
        ? record.selectedResponseId
        : null,
    selectedChargeSelections,
    overrideReasons: asStringArray(record.overrideReasons),
    overrideNote:
      typeof record.overrideNote === "string" && record.overrideNote.trim()
        ? record.overrideNote.trim()
        : null,
  };
}

function normalizeStoredRateRecommendation(raw: unknown): RateRecommendationRecord | null {
  const record = asRecord(raw);
  const generatedAt = String(record.generatedAt ?? "").trim();
  const model = String(record.model ?? "").trim();
  const explanation = String(record.explanation ?? "").trim();
  if (!generatedAt || !model || !explanation) {
    return null;
  }

  const recommendedChargeSelections = Array.isArray(record.recommendedChargeSelections)
    ? record.recommendedChargeSelections
        .map((entry) => {
          const item = asRecord(entry);
          const chargeCode = normalizeCode(String(item.chargeCode ?? ""));
          const responseId = String(item.responseId ?? "").trim();
          if (!chargeCode || !responseId) {
            return null;
          }

          return {
            chargeCode,
            responseId,
            lineId: typeof item.lineId === "string" && item.lineId.trim() ? item.lineId : null,
          } satisfies RateComparisonChargeSelection;
        })
        .filter(
          (
            entry,
          ): entry is RateComparisonChargeSelection => Boolean(entry),
        )
    : [];
  const reasons = Array.isArray(record.reasons)
    ? record.reasons
        .map((entry) => {
          const item = asRecord(entry);
          const label = String(item.label ?? "").trim();
          const detail = String(item.detail ?? "").trim();
          if (!label || !detail) {
            return null;
          }

          return {
            label,
            detail,
          } satisfies RateRecommendationReason;
        })
        .filter((entry): entry is RateRecommendationReason => Boolean(entry))
    : [];

  return {
    generatedAt,
    model,
    strategy: record.strategy === "AI_ASSISTED" ? "AI_ASSISTED" : "DETERMINISTIC",
    recommendedMode: record.recommendedMode === "ENTIRE_AGENT" ? "ENTIRE_AGENT" : "PER_CHARGE",
    recommendedResponseId:
      typeof record.recommendedResponseId === "string" && record.recommendedResponseId.trim()
        ? record.recommendedResponseId
        : null,
    recommendedChargeSelections,
    recommendedTotalInBaseCurrency:
      typeof record.recommendedTotalInBaseCurrency === "number" &&
      Number.isFinite(record.recommendedTotalInBaseCurrency)
        ? record.recommendedTotalInBaseCurrency
        : null,
    recommendedVendorIds: asStringArray(record.recommendedVendorIds),
    confidenceScore:
      typeof record.confidenceScore === "number" && Number.isFinite(record.confidenceScore)
        ? record.confidenceScore
        : null,
    explanation,
    reasons,
    decision: normalizeStoredRecommendationDecision(record.decision),
  };
}

function normalizeStoredFinalizedBuyRateVersion(
  raw: unknown,
): FinalizedBuyRateVersionRecord | null {
  const record = asRecord(raw);
  const id = String(record.id ?? "").trim();
  const versionNumber = Math.trunc(asNumber(record.versionNumber));
  const versionLabel = String(record.versionLabel ?? "").trim();
  const createdAt = String(record.createdAt ?? "").trim();
  const createdById = String(record.createdById ?? "").trim();
  const baseCurrency = String(record.baseCurrency ?? "").trim();

  if (!id || versionNumber <= 0 || !versionLabel || !createdAt || !createdById || !baseCurrency) {
    return null;
  }

  const selectedChargeSelections = Array.isArray(record.selectedChargeSelections)
    ? record.selectedChargeSelections
        .map((entry) => {
          const item = asRecord(entry);
          const chargeCode = normalizeCode(String(item.chargeCode ?? ""));
          const responseId = String(item.responseId ?? "").trim();
          if (!chargeCode || !responseId) {
            return null;
          }

          return {
            chargeCode,
            responseId,
            lineId: typeof item.lineId === "string" && item.lineId.trim() ? item.lineId : null,
          } satisfies RateComparisonChargeSelection;
        })
        .filter((entry): entry is RateComparisonChargeSelection => Boolean(entry))
    : [];

  const lines = Array.isArray(record.lines)
    ? record.lines
        .map((entry) => {
          const item = asRecord(entry);
          const lineId = String(item.id ?? "").trim();
          const chargeCode = normalizeCode(String(item.chargeCode ?? ""));
          const chargeName = String(item.chargeName ?? "").trim();
          const vendorName = String(item.vendorName ?? "").trim();
          const requestId = String(item.requestId ?? "").trim();
          const responseId = String(item.responseId ?? "").trim();
          const normalizedCurrency = String(item.normalizedCurrency ?? "").trim();
          const finalizedAt = String(item.finalizedAt ?? "").trim();
          if (
            !lineId ||
            !chargeCode ||
            !chargeName ||
            !vendorName ||
            !requestId ||
            !responseId ||
            !normalizedCurrency ||
            !finalizedAt
          ) {
            return null;
          }

          return {
            id: lineId,
            chargeCode,
            chargeName,
            department:
              item.department === "CUSTOMS_CLEARANCE"
                ? "CUSTOMS_CLEARANCE"
                : "FREIGHT_FORWARDING",
            vendorId:
              typeof item.vendorId === "string" && item.vendorId.trim() ? item.vendorId : null,
            vendorName,
            requestId,
            responseId,
            lineId: typeof item.lineId === "string" && item.lineId.trim() ? item.lineId : null,
            originalAmount:
              typeof item.originalAmount === "number" && Number.isFinite(item.originalAmount)
                ? item.originalAmount
                : null,
            originalCurrency:
              typeof item.originalCurrency === "string" && item.originalCurrency.trim()
                ? item.originalCurrency
                : null,
            originalUnit:
              typeof item.originalUnit === "string" && item.originalUnit.trim()
                ? item.originalUnit
                : null,
            normalizedAmountInBaseCurrency:
              typeof item.normalizedAmountInBaseCurrency === "number" &&
              Number.isFinite(item.normalizedAmountInBaseCurrency)
                ? item.normalizedAmountInBaseCurrency
                : null,
            normalizedCurrency,
            quantityMultiplier:
              typeof item.quantityMultiplier === "number" && Number.isFinite(item.quantityMultiplier)
                ? item.quantityMultiplier
                : null,
            minimumChargeAmount:
              typeof item.minimumChargeAmount === "number" &&
              Number.isFinite(item.minimumChargeAmount)
                ? item.minimumChargeAmount
                : null,
            taxPercent:
              typeof item.taxPercent === "number" && Number.isFinite(item.taxPercent)
                ? item.taxPercent
                : null,
            validity:
              typeof item.validity === "string" && item.validity.trim() ? item.validity : null,
            carrier:
              typeof item.carrier === "string" && item.carrier.trim() ? item.carrier : null,
            routing:
              typeof item.routing === "string" && item.routing.trim() ? item.routing : null,
            transit:
              typeof item.transit === "string" && item.transit.trim() ? item.transit : null,
            sourceMode: item.sourceMode === "ENTIRE_AGENT" ? "ENTIRE_AGENT" : "PER_CHARGE",
            recommended: item.recommended === true,
            overriddenRecommendation: item.overriddenRecommendation === true,
            finalizedAt,
          } satisfies FinalizedBuyRateLineRecord;
        })
        .filter((entry): entry is FinalizedBuyRateLineRecord => Boolean(entry))
    : [];

  return {
    id,
    versionNumber,
    versionLabel,
    createdAt,
    createdById,
    sourceRecommendationGeneratedAt:
      typeof record.sourceRecommendationGeneratedAt === "string" &&
      record.sourceRecommendationGeneratedAt.trim()
        ? record.sourceRecommendationGeneratedAt
        : null,
    decisionStatus: record.decisionStatus === "OVERRIDDEN" ? "OVERRIDDEN" : "ACCEPTED",
    selectedMode: record.selectedMode === "ENTIRE_AGENT" ? "ENTIRE_AGENT" : "PER_CHARGE",
    selectedResponseId:
      typeof record.selectedResponseId === "string" && record.selectedResponseId.trim()
        ? record.selectedResponseId
        : null,
    selectedChargeSelections,
    baseCurrency,
    totalInBaseCurrency: asNumber(record.totalInBaseCurrency),
    notes: typeof record.notes === "string" && record.notes.trim() ? record.notes.trim() : null,
    lines,
  };
}

function normalizeStoredPricingSnapshot(raw: unknown): PricingSnapshotRecord | null {
  const record = asRecord(raw);
  const id = String(record.id ?? "").trim();
  const basedOnFinalizedVersionId = String(record.basedOnFinalizedVersionId ?? "").trim();
  const basedOnFinalizedVersionLabel = String(record.basedOnFinalizedVersionLabel ?? "").trim();
  const currency = String(record.currency ?? "").trim();
  const createdAt = String(record.createdAt ?? "").trim();
  const updatedAt = String(record.updatedAt ?? "").trim();
  const updatedById = String(record.updatedById ?? "").trim();

  if (
    !id ||
    !basedOnFinalizedVersionId ||
    !basedOnFinalizedVersionLabel ||
    !currency ||
    !createdAt ||
    !updatedAt ||
    !updatedById
  ) {
    return null;
  }

  const lines = Array.isArray(record.lines)
    ? record.lines
        .map((entry) => {
          const item = asRecord(entry);
          const lineId = String(item.id ?? "").trim();
          const finalizedLineId = String(item.finalizedLineId ?? "").trim();
          const chargeCode = normalizeCode(String(item.chargeCode ?? ""));
          const chargeName = String(item.chargeName ?? "").trim();
          const unit = String(item.unit ?? "").trim();
          const lineCurrency = String(item.currency ?? currency).trim();
          const vendorName = String(item.vendorName ?? "").trim();
          if (
            !lineId ||
            !finalizedLineId ||
            !chargeCode ||
            !chargeName ||
            !unit ||
            !lineCurrency ||
            !vendorName
          ) {
            return null;
          }

          return {
            id: lineId,
            finalizedLineId,
            chargeCode,
            chargeName,
            department:
              item.department === "CUSTOMS_CLEARANCE"
                ? "CUSTOMS_CLEARANCE"
                : "FREIGHT_FORWARDING",
            unit,
            quantity: Math.max(1, asNumber(item.quantity) || 1),
            currency: lineCurrency,
            buyAmount: asNumber(item.buyAmount),
            sellAmount: asNumber(item.sellAmount),
            marginAmount: asNumber(item.marginAmount),
            marginPercent:
              typeof item.marginPercent === "number" && Number.isFinite(item.marginPercent)
                ? item.marginPercent
                : null,
            taxPercent:
              typeof item.taxPercent === "number" && Number.isFinite(item.taxPercent)
                ? item.taxPercent
                : null,
            vendorName,
            included: item.included !== false,
            notes: typeof item.notes === "string" && item.notes.trim() ? item.notes.trim() : null,
          } satisfies PricingSnapshotLineRecord;
        })
        .filter((entry): entry is PricingSnapshotLineRecord => Boolean(entry))
    : [];

  const totalsRecord = asRecord(record.totals);

  return {
    id,
    basedOnFinalizedVersionId,
    basedOnFinalizedVersionLabel,
    pricingMode: "LINE_SELL_RATE",
    currency,
    createdAt,
    updatedAt,
    updatedById,
    notes: typeof record.notes === "string" && record.notes.trim() ? record.notes.trim() : null,
    totals: {
      buyAmount: asNumber(totalsRecord.buyAmount),
      sellAmount: asNumber(totalsRecord.sellAmount),
      marginAmount: asNumber(totalsRecord.marginAmount),
      marginPercent:
        typeof totalsRecord.marginPercent === "number" &&
        Number.isFinite(totalsRecord.marginPercent)
          ? totalsRecord.marginPercent
          : null,
      includedLineCount: Math.max(0, Math.trunc(asNumber(totalsRecord.includedLineCount))),
    },
    lines,
  };
}

function resolveChargeContext(enquiryDetails: unknown): EnquiryChargeContext {
  const root = asRecord(enquiryDetails);
  const typeValue = String(root.type ?? "").trim().toUpperCase();
  const isSea = typeValue === "SEA";
  const isAir = typeValue === "AIR";
  const movementValue = String(root.seaType ?? root.airType ?? root.direction ?? "")
    .trim()
    .toUpperCase();
  const loadValue = String(root.seaLclFcl ?? root.loadType ?? "").trim().toUpperCase();

  const direction =
    movementValue === "IMPORT" || movementValue === "IMP"
      ? "IMP"
      : movementValue === "EXPORT" || movementValue === "EXP"
        ? "EXP"
        : null;

  const transportMode = isSea ? "SEA" : isAir ? "AIR" : null;
  const loadType =
    transportMode === "SEA"
      ? loadValue === "FCL"
        ? "FCL"
        : loadValue === "LCL"
          ? "LCL"
          : null
      : transportMode === "AIR"
        ? "AIR"
        : null;

  let scenarioKey: ChargeScenarioKey | null = null;
  if (direction === "IMP" && transportMode === "SEA" && loadType === "LCL") {
    scenarioKey = "IMPORT_LCL";
  } else if (direction === "IMP" && transportMode === "SEA" && loadType === "FCL") {
    scenarioKey = "IMPORT_FCL";
  } else if (direction === "IMP" && transportMode === "AIR") {
    scenarioKey = "IMPORT_AIR";
  } else if (direction === "EXP" && transportMode === "SEA" && loadType === "LCL") {
    scenarioKey = "EXPORT_LCL";
  } else if (direction === "EXP" && transportMode === "SEA" && loadType === "FCL") {
    scenarioKey = "EXPORT_FCL";
  } else if (direction === "EXP" && transportMode === "AIR") {
    scenarioKey = "EXPORT_AIR";
  }

  const scenarioLabel = scenarioKey
    ? scenarioKey
        .split("_")
        .map((part) => part[0] + part.slice(1).toLowerCase())
        .join(" ")
    : "Scenario not fully qualified";

  return {
    direction,
    transportMode,
    loadType,
    scenarioKey,
    scenarioLabel,
  };
}

function buildChargeFromTemplate(template: ChargeTemplate): EnquiryChargeEntry {
  return {
    id: `${template.department}:CATALOGUE:${template.code}`,
    code: template.code,
    name: template.name,
    department: template.department,
    unitOptions: template.units,
    unit: template.units[0],
    amount: 0,
    mandatory: template.mandatory,
    active: template.active,
    source: "CATALOGUE",
    displayOrder: template.displayOrder,
  };
}

function buildLegacyChargeEntries(
  department: CrmRateDepartment,
  rates: Record<string, number>,
): EnquiryChargeEntry[] {
  if (department === "FREIGHT_FORWARDING") {
    return buildTemplateSet([
      seed("OCEAN_FREIGHT", "Ocean Freight", department, ["WM"], true),
      seed("CFS", "CFS", department, ["WM"], true),
      seed("VGM", "VGM", department, ["CONTAINER"], false),
    ]).map((template) => ({
      ...buildChargeFromTemplate(template),
      amount:
        template.code === "OCEAN_FREIGHT"
          ? asNumber(rates.oceanFreight)
          : template.code === "CFS"
            ? asNumber(rates.cfsCharges)
            : asNumber(rates.vgmCharges),
    }));
  }

  return buildTemplateSet([
    seed("CUSTOM_CLEARANCE", "Custom clearance", department, ["BL"], true),
    seed("DO", "DO", department, ["BL"], true),
    seed("BL", "BL", department, ["BL"], true),
  ]).map((template) => ({
    ...buildChargeFromTemplate(template),
    amount:
      template.code === "CUSTOM_CLEARANCE"
        ? asNumber(rates.customsClearance)
        : template.code === "DO"
          ? asNumber(rates.doCharges)
          : asNumber(rates.blCharges),
    }));
}

function mergeTemplateWithStoredCharges(
  templates: ChargeTemplate[],
  storedCharges: EnquiryChargeEntry[],
  department: CrmRateDepartment,
): EnquiryChargeEntry[] {
  const storedByCode = new Map(
    storedCharges
      .filter((entry) => entry.department === department)
      .map((entry) => [entry.code, entry] as const),
  );

  const merged = templates.map((template) => {
    const existing = storedByCode.get(template.code);
    return {
      ...buildChargeFromTemplate(template),
      ...(existing || {}),
      id: existing?.id || `${department}:CATALOGUE:${template.code}`,
      code: template.code,
      name: existing?.name || template.name,
      department,
      unitOptions:
        existing && existing.unitOptions.length > 0 ? existing.unitOptions : template.units,
      unit:
        existing && existing.unitOptions.includes(existing.unit)
          ? existing.unit
          : template.units[0],
      mandatory: template.mandatory,
      active: existing?.active ?? template.active,
      source: existing?.source === "ADDITIONAL" ? "ADDITIONAL" : "CATALOGUE",
      displayOrder: template.displayOrder,
    } satisfies EnquiryChargeEntry;
  });

  const manualExtras = storedCharges
    .filter(
      (entry) =>
        entry.department === department &&
        entry.source === "ADDITIONAL" &&
        !templates.some((template) => template.code === entry.code),
    )
    .sort((left, right) => left.displayOrder - right.displayOrder);

  return [...merged, ...manualExtras];
}

function extractLegacyRatesFromCharges(
  department: CrmRateDepartment,
  charges: EnquiryChargeEntry[],
): Record<string, number> {
  if (department === "FREIGHT_FORWARDING") {
    return cleanObject({
      oceanFreight: chargeAmount(charges, "OCEAN_FREIGHT"),
      cfsCharges: chargeAmount(charges, "CFS"),
      vgmCharges: chargeAmount(charges, "VGM"),
    });
  }

  return cleanObject({
    customsClearance: chargeAmount(charges, "CUSTOM_CLEARANCE"),
    doCharges: chargeAmount(charges, "DO"),
    blCharges: chargeAmount(charges, "BL"),
  });
}

function chargeAmount(charges: EnquiryChargeEntry[], code: string) {
  return asNumber(charges.find((entry) => entry.code === code)?.amount ?? 0);
}

function deriveCommercialStatus(workflow: Record<string, unknown>, snapshot: {
  freightCharges: EnquiryChargeEntry[];
  customsCharges: EnquiryChargeEntry[];
  latestQuoteVersion: number | null;
  rateRequests: EnquiryRateRequestRecord[];
  rateResponses: AgentRateResponseRecord[];
  finalizedBuyRateVersions: FinalizedBuyRateVersionRecord[];
  pricingSnapshot: PricingSnapshotRecord | null;
}): CommercialWorkflowStatus {
  const storedStatus = asString(workflow.commercialStatus);
  if (storedStatus && VALID_COMMERCIAL_STATUSES.has(storedStatus as CommercialWorkflowStatus)) {
    return storedStatus as CommercialWorkflowStatus;
  }

  const freightSubmitted = snapshot.freightCharges.some((entry) => entry.amount > 0);
  const customsSubmitted = snapshot.customsCharges.some((entry) => entry.amount > 0);

  if (snapshot.latestQuoteVersion) {
    return "QUOTATION_READY";
  }
  if (snapshot.pricingSnapshot) {
    return "PRICING";
  }
  if (snapshot.finalizedBuyRateVersions.length > 0) {
    return "RATE_FINALIZED";
  }
  if (freightSubmitted && customsSubmitted) {
    return "RATES_RECEIVED";
  }
  if (freightSubmitted || customsSubmitted) {
    return "PARTIALLY_RECEIVED";
  }
  if (snapshot.rateResponses.length > 0) {
    return "RATE_COMPARISON";
  }
  if (snapshot.rateRequests.length > 0) {
    return "AWAITING_AGENT_RATES";
  }
  return "READY_FOR_RATE_REQUEST";
}

export function getChargeUnitLabel(unit: ChargeUnit) {
  return CHARGE_UNIT_LABELS[unit] ?? unit;
}

export function getCommercialStatusLabel(status: CommercialWorkflowStatus) {
  return status
    .split("_")
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(" ");
}

export function createAdditionalChargeEntry(params: {
  department: CrmRateDepartment;
  name: string;
  unit: ChargeUnit;
  amount?: number;
  displayOrder?: number;
}) {
  const codeBase = normalizeCode(params.name) || "ADDITIONAL_CHARGE";
  return {
    id: `${params.department}:ADDITIONAL:${codeBase}:${params.displayOrder ?? Date.now()}`,
    code: codeBase,
    name: params.name.trim(),
    department: params.department,
    unitOptions: [params.unit],
    unit: params.unit,
    amount: Number(params.amount) || 0,
    mandatory: false,
    active: true,
    source: "ADDITIONAL" as const,
    displayOrder: params.displayOrder ?? Date.now(),
  } satisfies EnquiryChargeEntry;
}

export function createAgentRateLineRecord(params?: Partial<AgentRateLineRecord>) {
  return {
    id: params?.id || `line:${Date.now().toString(36)}`,
    canonicalChargeCode: params?.canonicalChargeCode || "",
    canonicalChargeName: params?.canonicalChargeName || "",
    originalDescription: params?.originalDescription || "",
    amount: Number(params?.amount) || 0,
    amountSourceText: params?.amountSourceText ?? null,
    amountMissing: params?.amountMissing === true,
    currency: params?.currency || "INR",
    unit: params?.unit || "Shipment",
    quantityBasis: params?.quantityBasis || "Per shipment",
    quantityText: params?.quantityText ?? null,
    containerText: params?.containerText ?? null,
    minimumCharge: params?.minimumCharge ?? null,
    taxText: params?.taxText ?? null,
    freeDaysText: params?.freeDaysText ?? null,
    inclusionStatus: params?.inclusionStatus || "UNSPECIFIED",
    notes: params?.notes ?? null,
    confidenceScore:
      typeof params?.confidenceScore === "number" && Number.isFinite(params.confidenceScore)
        ? params.confidenceScore
        : null,
    confidenceLabel: params?.confidenceLabel ?? null,
    reviewStatus: params?.reviewStatus || "MANUAL",
    missingFields: params?.missingFields ?? [],
    standardRateReference: params?.standardRateReference ?? null,
    evidence: params?.evidence ?? [],
  } satisfies AgentRateLineRecord;
}

export function getCanonicalChargeOptions(workflow: RateWorkflowSnapshot) {
  const entries = new Map<string, { code: string; name: string }>();

  for (const charge of [...workflow.freightCharges, ...workflow.customsCharges]) {
    entries.set(charge.code, { code: charge.code, name: charge.name });
  }

  for (const alias of workflow.chargeAliases) {
    if (!entries.has(alias.canonicalCode)) {
      entries.set(alias.canonicalCode, {
        code: alias.canonicalCode,
        name: alias.canonicalName,
      });
    }
  }

  return Array.from(entries.values()).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export function suggestCanonicalCharge(
  workflow: RateWorkflowSnapshot,
  originalDescription: string,
) {
  const normalizedOriginal = normalizeCode(originalDescription);
  if (!normalizedOriginal) return null;

  const aliasMatch = workflow.chargeAliases.find(
    (alias) => normalizeCode(alias.externalName) === normalizedOriginal,
  );
  if (aliasMatch) {
    return {
      code: aliasMatch.canonicalCode,
      name: aliasMatch.canonicalName,
      source: "ALIAS" as const,
    };
  }

  const directMatch = getCanonicalChargeOptions(workflow).find(
    (option) =>
      option.code === normalizedOriginal ||
      normalizeCode(option.name) === normalizedOriginal,
  );
  if (directMatch) {
    return {
      code: directMatch.code,
      name: directMatch.name,
      source: "CATALOGUE" as const,
    };
  }

  return null;
}

export function getRateWorkflowSnapshot(enquiryDetails: unknown): RateWorkflowSnapshot {
  const root = asRecord(enquiryDetails);
  const workflow = asRecord(root.rateWorkflow);
  const legacyRates = asRecord(root.rates);
  const chargeContext = resolveChargeContext(root);

  const storedFreightCharges = Array.isArray(workflow.freightCharges)
    ? workflow.freightCharges
        .map((entry) => normalizeStoredCharge(entry, "FREIGHT_FORWARDING"))
        .filter((entry): entry is EnquiryChargeEntry => Boolean(entry))
    : [];
  const storedCustomsCharges = Array.isArray(workflow.customsCharges)
    ? workflow.customsCharges
        .map((entry) => normalizeStoredCharge(entry, "CUSTOMS_CLEARANCE"))
        .filter((entry): entry is EnquiryChargeEntry => Boolean(entry))
    : [];

  const fallbackFreightRates: FreightRateValues = cleanObject({
    oceanFreight: asNumber(workflow.freightRates && asRecord(workflow.freightRates).oceanFreight),
    cfsCharges: asNumber(workflow.freightRates && asRecord(workflow.freightRates).cfsCharges),
    vgmCharges: asNumber(workflow.freightRates && asRecord(workflow.freightRates).vgmCharges),
  });
  const fallbackCustomsRates: CustomsRateValues = cleanObject({
    customsClearance: asNumber(
      workflow.customsRates && asRecord(workflow.customsRates).customsClearance,
    ),
    doCharges: asNumber(workflow.customsRates && asRecord(workflow.customsRates).doCharges),
    blCharges: asNumber(workflow.customsRates && asRecord(workflow.customsRates).blCharges),
  });

  const templateCharges = chargeContext.scenarioKey ? CHARGE_CATALOGUE[chargeContext.scenarioKey] : [];
  const freightTemplates = templateCharges.filter(
    (entry) => entry.department === "FREIGHT_FORWARDING",
  );
  const customsTemplates = templateCharges.filter(
    (entry) => entry.department === "CUSTOMS_CLEARANCE",
  );

  const freightCharges =
    freightTemplates.length > 0
      ? mergeTemplateWithStoredCharges(
          freightTemplates,
          storedFreightCharges.length > 0
            ? storedFreightCharges
            : buildLegacyChargeEntries("FREIGHT_FORWARDING", {
                ...fallbackFreightRates,
                oceanFreight: fallbackFreightRates.oceanFreight ?? asNumber(legacyRates.oceanFreight),
                cfsCharges: fallbackFreightRates.cfsCharges ?? asNumber(legacyRates.cfsCharges),
                vgmCharges: fallbackFreightRates.vgmCharges ?? asNumber(legacyRates.vgmCharges),
              }),
          "FREIGHT_FORWARDING",
        )
      : storedFreightCharges.length > 0
        ? storedFreightCharges
        : buildLegacyChargeEntries("FREIGHT_FORWARDING", {
            ...fallbackFreightRates,
            oceanFreight: fallbackFreightRates.oceanFreight ?? asNumber(legacyRates.oceanFreight),
            cfsCharges: fallbackFreightRates.cfsCharges ?? asNumber(legacyRates.cfsCharges),
            vgmCharges: fallbackFreightRates.vgmCharges ?? asNumber(legacyRates.vgmCharges),
          });

  const customsCharges =
    customsTemplates.length > 0
      ? mergeTemplateWithStoredCharges(
          customsTemplates,
          storedCustomsCharges.length > 0
            ? storedCustomsCharges
            : buildLegacyChargeEntries("CUSTOMS_CLEARANCE", {
                ...fallbackCustomsRates,
                customsClearance:
                  fallbackCustomsRates.customsClearance ??
                  asNumber(legacyRates.customsClearance),
                doCharges: fallbackCustomsRates.doCharges ?? asNumber(legacyRates.doCharges),
                blCharges: fallbackCustomsRates.blCharges ?? asNumber(legacyRates.blCharges),
              }),
          "CUSTOMS_CLEARANCE",
        )
      : storedCustomsCharges.length > 0
        ? storedCustomsCharges
        : buildLegacyChargeEntries("CUSTOMS_CLEARANCE", {
            ...fallbackCustomsRates,
            customsClearance:
              fallbackCustomsRates.customsClearance ?? asNumber(legacyRates.customsClearance),
            doCharges: fallbackCustomsRates.doCharges ?? asNumber(legacyRates.doCharges),
            blCharges: fallbackCustomsRates.blCharges ?? asNumber(legacyRates.blCharges),
          });

  const freightRates = extractLegacyRatesFromCharges("FREIGHT_FORWARDING", freightCharges);
  const customsRates = extractLegacyRatesFromCharges("CUSTOMS_CLEARANCE", customsCharges);

  const latestQuoteVersion =
    typeof workflow.latestQuoteVersion === "number" ? workflow.latestQuoteVersion : null;
  const rateRequests = Array.isArray(workflow.rateRequests)
    ? workflow.rateRequests
        .map(normalizeStoredRateRequest)
        .filter((entry): entry is EnquiryRateRequestRecord => Boolean(entry))
        .sort((left, right) => right.sentAt.localeCompare(left.sentAt))
    : [];
  const rateResponses = Array.isArray(workflow.rateResponses)
    ? workflow.rateResponses
        .map(normalizeStoredRateResponse)
        .filter((entry): entry is AgentRateResponseRecord => Boolean(entry))
        .sort((left, right) => right.receivedAt.localeCompare(left.receivedAt))
    : [];
  const chargeAliases = Array.isArray(workflow.chargeAliases)
    ? workflow.chargeAliases
        .map(normalizeStoredChargeAlias)
        .filter((entry): entry is EnquiryChargeAliasRecord => Boolean(entry))
        .sort((left, right) => left.externalName.localeCompare(right.externalName))
    : [];
  const comparisonSelection = normalizeStoredComparisonSelection(workflow.comparisonSelection);
  const rateRecommendation = normalizeStoredRateRecommendation(workflow.rateRecommendation);
  const finalizedBuyRateVersions = Array.isArray(workflow.finalizedBuyRateVersions)
    ? workflow.finalizedBuyRateVersions
        .map(normalizeStoredFinalizedBuyRateVersion)
        .filter((entry): entry is FinalizedBuyRateVersionRecord => Boolean(entry))
        .sort((left, right) => left.versionNumber - right.versionNumber)
    : [];
  const currentFinalizedBuyRateVersionId =
    typeof workflow.currentFinalizedBuyRateVersionId === "string" &&
    workflow.currentFinalizedBuyRateVersionId.trim()
      ? workflow.currentFinalizedBuyRateVersionId
      : finalizedBuyRateVersions.at(-1)?.id ?? null;
  const pricingSnapshot = normalizeStoredPricingSnapshot(workflow.pricingSnapshot);

  return {
    freightRates,
    customsRates,
    freightCharges,
    customsCharges,
    rateRequests,
    rateResponses,
    comparisonSelection,
    rateRecommendation,
    finalizedBuyRateVersions,
    currentFinalizedBuyRateVersionId,
    pricingSnapshot,
    chargeAliases,
    chargeContext,
    commercialStatus: deriveCommercialStatus(workflow, {
      freightCharges,
      customsCharges,
      latestQuoteVersion,
      rateRequests,
      rateResponses,
      finalizedBuyRateVersions,
      pricingSnapshot,
    }),
    costingLocked:
      typeof workflow.costingLocked === "boolean"
        ? workflow.costingLocked
        : finalizedBuyRateVersions.length === 0,
    freightSubmittedAt:
      typeof workflow.freightSubmittedAt === "string" ? workflow.freightSubmittedAt : null,
    customsSubmittedAt:
      typeof workflow.customsSubmittedAt === "string" ? workflow.customsSubmittedAt : null,
    freightSubmittedById:
      typeof workflow.freightSubmittedById === "string" ? workflow.freightSubmittedById : null,
    customsSubmittedById:
      typeof workflow.customsSubmittedById === "string" ? workflow.customsSubmittedById : null,
    latestQuoteId: typeof workflow.latestQuoteId === "string" ? workflow.latestQuoteId : null,
    latestQuoteVersion,
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

export function getDepartmentCharges(
  workflow: RateWorkflowSnapshot,
  department: CrmRateDepartment,
) {
  return department === "FREIGHT_FORWARDING"
    ? workflow.freightCharges
    : workflow.customsCharges;
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

export function normalizeDepartmentChargesInput(params: {
  department: CrmRateDepartment;
  input: unknown;
  existingCharges: EnquiryChargeEntry[];
}) {
  const { department, input, existingCharges } = params;
  const payload = Array.isArray(input)
    ? input
    : Array.isArray(asRecord(input).charges)
      ? (asRecord(input).charges as unknown[])
      : null;

  if (payload) {
    return payload
      .map((entry) => normalizeStoredCharge(entry, department))
      .filter((entry): entry is EnquiryChargeEntry => Boolean(entry))
      .map((entry, index) => ({
        ...entry,
        department,
        displayOrder: index + 1,
      }))
      .sort((left, right) => left.displayOrder - right.displayOrder);
  }

  const normalizedRates = normalizeDepartmentRates(
    department,
    asRecord(input) as DepartmentRateValues,
  );
  return existingCharges.map((entry) => ({
    ...entry,
    amount: asNumber(
      normalizedRates[
        LEGACY_FIELD_BY_CODE[entry.code] as keyof typeof normalizedRates
      ],
    ),
  }));
}

export function departmentHasSubmittedRates(
  workflow: RateWorkflowSnapshot,
  department: CrmRateDepartment,
) {
  return getDepartmentCharges(workflow, department).some((entry) => Number(entry.amount) > 0);
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

export function getCurrentFinalizedBuyRateVersion(workflow: RateWorkflowSnapshot) {
  if (!workflow.currentFinalizedBuyRateVersionId) {
    return workflow.finalizedBuyRateVersions.at(-1) ?? null;
  }

  return (
    workflow.finalizedBuyRateVersions.find(
      (entry) => entry.id === workflow.currentFinalizedBuyRateVersionId,
    ) ?? workflow.finalizedBuyRateVersions.at(-1) ?? null
  );
}

export function getCurrentPricingSnapshot(workflow: RateWorkflowSnapshot) {
  if (!workflow.pricingSnapshot) {
    return null;
  }

  if (
    workflow.currentFinalizedBuyRateVersionId &&
    workflow.pricingSnapshot.basedOnFinalizedVersionId !== workflow.currentFinalizedBuyRateVersionId
  ) {
    return workflow.pricingSnapshot;
  }

  return workflow.pricingSnapshot;
}

export function isPricingSnapshotCurrent(workflow: RateWorkflowSnapshot) {
  const currentFinalizedVersion = getCurrentFinalizedBuyRateVersion(workflow);
  if (!workflow.pricingSnapshot || !currentFinalizedVersion) {
    return false;
  }

  return workflow.pricingSnapshot.basedOnFinalizedVersionId === currentFinalizedVersion.id;
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

export function buildQuoteLineItemsFromWorkflow(params: {
  enquiryDetails: unknown;
  mode: CrmQuoteWorkflowMode;
}) {
  const workflow = getRateWorkflowSnapshot(params.enquiryDetails);
  const includedDepartments =
    params.mode === "newly-added-only"
      ? getDepartmentsWithUnquotedChanges(workflow)
      : getIncludedDepartmentsForMode(params.mode, workflow);
  const items: Array<{
    description: string;
    hsnSac: string;
    unit: string;
    quantity: number;
    rate: number;
    tax: string;
    tds: string;
    amount: number;
    currency?: string;
    exchangeRate?: number;
  }> = [];

  if (isPricingSnapshotCurrent(workflow) && workflow.pricingSnapshot?.lines.length) {
    const pricingLines = workflow.pricingSnapshot.lines.filter(
      (entry) =>
        entry.included &&
        includedDepartments.includes(entry.department) &&
        Number(entry.sellAmount) > 0,
    );

    for (const line of pricingLines) {
      items.push({
        description: line.chargeName,
        hsnSac: "996712",
        unit: line.unit,
        quantity: Math.max(1, Number(line.quantity) || 1),
        rate: Number(line.sellAmount) || 0,
        tax:
          typeof line.taxPercent === "number" && Number.isFinite(line.taxPercent)
            ? `GST ${line.taxPercent}%`
            : "GST 18%",
        tds: "None",
        amount: (Number(line.sellAmount) || 0) * Math.max(1, Number(line.quantity) || 1),
        currency: line.currency,
        exchangeRate: 1,
      });
    }
  } else {
    const includedCharges = includedDepartments.flatMap((department) =>
      getDepartmentCharges(workflow, department).filter(
        (entry) => entry.active && Number(entry.amount) > 0,
      ),
    );

    for (const charge of includedCharges) {
      items.push({
        description: charge.name,
        hsnSac: "996712",
        unit: getChargeUnitLabel(charge.unit),
        quantity: 1,
        rate: Number(charge.amount) || 0,
        tax: "GST 18%",
        tds: "None",
        amount: Number(charge.amount) || 0,
      });
    }
  }

  return {
    items,
    includedDepartments,
    pendingDepartments: getPendingDepartments(workflow),
    workflow,
  };
}
