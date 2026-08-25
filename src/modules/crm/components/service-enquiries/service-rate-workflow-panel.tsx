"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  CrmButton,
  CrmField,
  CrmInput,
  CrmPanel,
  CrmSection,
  CrmSelect,
  CrmStatus,
  CrmTabs,
  CrmTextarea,
} from "@/modules/crm/components/workspace/crm-workspace";
import {
  finalizeEnquiryBuyRatesAction,
  generateEnquiryBestRateRecommendationAction,
  listRateRequestRecipientsAction,
  parseEnquiryAgentResponseDraftAction,
  saveEnquiryPricingSnapshotAction,
  saveEnquiryRateComparisonSelectionAction,
  saveEnquiryRateRecommendationDecisionAction,
  saveEnquiryRatesAction,
  saveEnquiryAgentResponseAction,
  sendEnquiryRateRequestsAction,
  syncEnquiryRateRequestResponsesAction,
} from "@/modules/crm/actions";
import {
  createAgentRateLineRecord,
  createAdditionalChargeEntry,
  createRatesSignature,
  departmentHasSubmittedRates,
  getCanonicalChargeOptions,
  getChargeUnitLabel,
  getCommercialStatusLabel,
  getCurrentPricingSnapshot,
  getDepartmentsWithUnquotedChanges,
  getIncludedDepartmentsForMode,
  getCurrentFinalizedBuyRateVersion,
  getPendingDepartments,
  getRateWorkflowSnapshot,
  suggestCanonicalCharge,
  type AgentRateLineRecord,
  type ChargeUnit,
  type CommercialWorkflowStatus,
  type EnquiryChargeEntry,
  type CrmQuoteWorkflowMode,
  type CrmRateDepartment,
  type PricingSnapshotLineRecord,
  type RateComparisonSelectionMode,
} from "@/modules/crm/rate-workflow";
import type { ParsedAgentRateDraft } from "@/modules/crm/services/rate-response-parser.service";
import { buildRateComparisonWorkspace } from "@/modules/crm/services/rate-comparison.service";

type TabKey = CrmRateDepartment;

type RecipientOption = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  services: string | null;
  status: string;
  recommendation: {
    rank: number | null;
    recommended: boolean;
    explanation: string | null;
    metrics: {
      similarEnquiryCount: number;
      requestCount: number;
      responseRatePct: number | null;
      medianResponseMinutes: number | null;
      completeRatePct: number | null;
      clarificationRatePct: number | null;
      competitivenessPct: number | null;
      selectionRatePct: number | null;
      bookingRatePct: number | null;
      operationalOutcomePct: number | null;
      disputePct: number | null;
      billingVariancePct: number | null;
      rateValidityQualityPct: number | null;
    };
  } | null;
};

type ReportingContact = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type ResponseLineDraft = AgentRateLineRecord & {
  saveAlias: boolean;
};

type ParsedResponseMeta = {
  parserStatus: "MANUAL" | "AI_REVIEW_REQUIRED" | "AUTO_MAPPED";
  parserModel: string | null;
  parserRunAt: string | null;
  overallConfidence: number | null;
  standardRateSignal: "STANDARD_CHARGES_APPLICABLE" | "AS_AGREED" | null;
  sources: Array<{
    id: string;
    name: string;
    kind: "EMAIL_TEXT" | "EMAIL_HTML" | "ATTACHMENT";
    mimeType: string;
  }>;
  warnings: string[];
};

type PricingLineDraft = {
  finalizedLineId: string;
  chargeCode: string;
  chargeName: string;
  department: CrmRateDepartment;
  unit: string;
  vendorName: string;
  buyAmount: number;
  sellAmount: number;
  quantity: number;
  marginAmount: number;
  marginPercent: number | null;
  taxPercent: number | null;
  notes: string;
};

const TAB_LABELS: Record<TabKey, string> = {
  FREIGHT_FORWARDING: "Freight Forwarding Rate",
  CUSTOMS_CLEARANCE: "Customs Clearance Rate",
};

const TEAM_LABELS: Record<TabKey, string> = {
  FREIGHT_FORWARDING: "Freight Forwarding team",
  CUSTOMS_CLEARANCE: "Customs Clearance team",
};

const OVERRIDE_REASON_OPTIONS = [
  "Customer preference",
  "Preferred carrier",
  "Better transit",
  "Credit terms",
  "Operational reliability",
  "Relationship",
  "Management decision",
  "Other",
] as const;

const COMMERCIAL_STAGE_ORDER = [
  "RATE_REQUESTS_SENT",
  "AWAITING_AGENT_RATES",
  "PARTIALLY_RECEIVED",
  "RATES_RECEIVED",
  "RATE_COMPARISON",
  "RATE_FINALIZED",
  "PRICING",
] as const satisfies readonly CommercialWorkflowStatus[];

const UNIT_OPTIONS: ChargeUnit[] = ["WM", "BL", "CONTAINER", "KG", "SHIPMENT"];

function formatDepartmentName(value: CrmRateDepartment) {
  return value === "FREIGHT_FORWARDING"
    ? "freight forwarding"
    : "customs clearance";
}

function formatQuotedMode(includedDepartments: CrmRateDepartment[]) {
  if (
    includedDepartments.includes("FREIGHT_FORWARDING") &&
    includedDepartments.includes("CUSTOMS_CLEARANCE")
  ) {
    return "combined";
  }

  return includedDepartments[0] === "CUSTOMS_CLEARANCE"
    ? "customs-only"
    : "freight-only";
}

function getStageBadgeVariant(status: string) {
  if (status === "Active") return "accent" as const;
  if (status === "Ready") return "success" as const;
  if (status === "Locked") return "warning" as const;
  return "neutral" as const;
}

function getRequestStatusVariant(status: string) {
  if (status === "REPLIED") return "success" as const;
  if (status === "BOUNCED" || status === "FAILED") return "danger" as const;
  if (status === "DELIVERED" || status === "OPENED") return "accent" as const;
  return "warning" as const;
}

function formatResponseTime(sentAt: string, replyTimestamp: string | null) {
  if (!replyTimestamp) return "Pending";
  const sent = new Date(sentAt);
  const replied = new Date(replyTimestamp);
  if (Number.isNaN(sent.getTime()) || Number.isNaN(replied.getTime())) {
    return "Pending";
  }
  const diffMinutes = Math.max(0, Math.round((replied.getTime() - sent.getTime()) / 60000));
  if (diffMinutes < 60) return `${diffMinutes} min`;
  const diffHours = diffMinutes / 60;
  if (diffHours < 24) return `${diffHours.toFixed(1)} hr`;
  return `${(diffHours / 24).toFixed(1)} day`;
}

function createResponseLineDraft(overrides?: Partial<ResponseLineDraft>) {
  return {
    ...createAgentRateLineRecord(),
    saveAlias: false,
    ...overrides,
  } satisfies ResponseLineDraft;
}

function getStandardSignalCopy(
  value: ParsedResponseMeta["standardRateSignal"],
) {
  if (value === "STANDARD_CHARGES_APPLICABLE") {
    return "Standard charges applicable";
  }
  if (value === "AS_AGREED") {
    return "As agreed";
  }
  return null;
}

function getStandardSignalVariant(
  value: ParsedResponseMeta["standardRateSignal"],
) {
  if (value === "STANDARD_CHARGES_APPLICABLE") {
    return "success" as const;
  }
  if (value === "AS_AGREED") {
    return "accent" as const;
  }
  return "neutral" as const;
}

function formatCurrencyAmount(value: number | null, currency: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Not comparable";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function buildPricingLineDrafts(
  currentFinalizedVersion: ReturnType<typeof getCurrentFinalizedBuyRateVersion>,
  pricingSnapshot: { basedOnFinalizedVersionId: string; lines: PricingSnapshotLineRecord[] } | null,
) {
  if (!currentFinalizedVersion) {
    return [] as PricingLineDraft[];
  }

  const existingLineMap =
    pricingSnapshot && pricingSnapshot.basedOnFinalizedVersionId === currentFinalizedVersion.id
      ? new Map(pricingSnapshot.lines.map((entry) => [entry.finalizedLineId, entry]))
      : new Map<string, PricingSnapshotLineRecord>();

  return currentFinalizedVersion.lines.map((line) => {
    const existing = existingLineMap.get(line.id);
    const buyAmount = Number(line.normalizedAmountInBaseCurrency ?? 0);
    const sellAmount = Number(existing?.sellAmount ?? buyAmount) || 0;
    const quantity = Math.max(1, Number(existing?.quantity ?? 1) || 1);
    const marginAmount = sellAmount - buyAmount;

    return {
      finalizedLineId: line.id,
      chargeCode: line.chargeCode,
      chargeName: line.chargeName,
      department: line.department,
      unit: existing?.unit || line.originalUnit || "Shipment",
      vendorName: line.vendorName,
      buyAmount,
      sellAmount,
      quantity,
      marginAmount,
      marginPercent: buyAmount > 0 ? (marginAmount / buyAmount) * 100 : null,
      taxPercent: line.taxPercent,
      notes: existing?.notes ?? "",
    } satisfies PricingLineDraft;
  });
}

function buildInitialChargeSelectionMap(
  chargeSelections: Array<{ chargeCode: string; responseId: string } | null>,
) {
  return Object.fromEntries(
    chargeSelections
      .filter((entry): entry is { chargeCode: string; responseId: string } => Boolean(entry))
      .map((entry) => [entry.chargeCode, entry.responseId]),
  ) as Record<string, string>;
}

function normalizeDirection(raw: unknown) {
  const value = String(raw ?? "").trim().toUpperCase();
  if (value === "IMPORT" || value === "IMP") return "Import";
  if (value === "EXPORT" || value === "EXP") return "Export";
  return "Movement";
}

function normalizeLoadType(raw: unknown, type: unknown) {
  const value = String(raw ?? "").trim().toUpperCase();
  if (value === "LCL" || value === "FCL") return value;
  return String(type ?? "").trim().toUpperCase() === "AIR" ? "Air" : "Cargo";
}

function buildEmailSubject(lead: { enquiryRef?: string | null; enquiryDetails: unknown }) {
  const enquiry = (lead.enquiryDetails as Record<string, unknown>) || {};
  const isAir = String(enquiry.type ?? "").trim().toUpperCase() === "AIR";
  const origin = isAir
    ? String(enquiry.aol ?? "").trim() || "Origin"
    : String(enquiry.pol ?? "").trim() || "POL";
  const destination = isAir
    ? String(enquiry.aod ?? "").trim() || "Destination"
    : String(enquiry.pod ?? "").trim() || "POD";
  const movement = normalizeDirection(enquiry.seaType ?? enquiry.airType ?? enquiry.direction);
  const loadType = isAir ? "Air" : normalizeLoadType(enquiry.seaLclFcl ?? enquiry.loadType, enquiry.type);

  return `${lead.enquiryRef || "ENQ-XXXXX"} | Rate Request | ${origin} -> ${destination} | ${movement} ${loadType}`;
}

function buildTemplateBody(
  lead: { enquiryDetails: unknown },
  notes: string,
  senderName: string,
  senderEmail: string,
) {
  const enquiry = (lead.enquiryDetails as Record<string, unknown>) || {};
  const type = String(enquiry.type ?? "").trim().toUpperCase();
  const isAir = type === "AIR";
  const loadType = String(enquiry.seaLclFcl ?? enquiry.loadType ?? "").trim().toUpperCase();
  const recipientToken = "{{recipientName}}";
  const lines = [
    `Dear ${recipientToken},`,
    "Good day!",
    "",
    isAir
      ? "Please review the enquiry below and share your competitive rates with us."
      : "Please look into the enquiry below and share your competitive rates with us.",
    "",
  ];

  if (isAir) {
    lines.push(`Airport of loading: ${String(enquiry.aol ?? "").trim() || "N/A"}`);
    lines.push(`Airport of destination: ${String(enquiry.aod ?? "").trim() || "N/A"}`);
    lines.push(`Commodity: ${String(enquiry.commodity ?? "").trim() || "N/A"}`);
    lines.push(`Weight: ${String(enquiry.weight ?? "").trim() || "N/A"}`);
    lines.push(`Dimensions: ${String(enquiry.dimensions ?? "").trim() || "N/A"}`);
    lines.push(`No. of packages: ${String(enquiry.packages ?? "").trim() || "N/A"}`);
    lines.push(`Incoterm: ${String(enquiry.incoterm ?? "").trim() || "N/A"}`);
  } else if (loadType === "FCL") {
    lines.push(`Port of loading: ${String(enquiry.pol ?? "").trim() || "N/A"}`);
    lines.push(`Port of destination: ${String(enquiry.pod ?? "").trim() || "N/A"}`);
    lines.push(`Commodity: ${String(enquiry.commodity ?? "").trim() || "N/A"}`);
    lines.push(`Weight: ${String(enquiry.weight ?? "").trim() || "N/A"}`);
    lines.push(`Container type: ${String(enquiry.containerType ?? "").trim() || "N/A"}`);
    lines.push(`Incoterm: ${String(enquiry.incoterm ?? "").trim() || "N/A"}`);
  } else {
    lines.push(`Port of loading: ${String(enquiry.pol ?? "").trim() || "N/A"}`);
    lines.push(`Port of destination: ${String(enquiry.pod ?? "").trim() || "N/A"}`);
    lines.push(`Commodity: ${String(enquiry.commodity ?? "").trim() || "N/A"}`);
    lines.push(`Weight: ${String(enquiry.weight ?? "").trim() || "N/A"}`);
    lines.push(`Dimensions: ${String(enquiry.dimensions ?? "").trim() || "N/A"}`);
    lines.push(`No. of packages: ${String(enquiry.packages ?? "").trim() || "N/A"}`);
    lines.push(`Volume: ${String(enquiry.cbm ?? enquiry.volume ?? "").trim() || "N/A"}`);
    lines.push(`Incoterm: ${String(enquiry.incoterm ?? "").trim() || "N/A"}`);
  }

  if (notes.trim()) {
    lines.push("");
    lines.push(`Notes: ${notes.trim()}`);
  }

  lines.push("");
  lines.push("I hope the above information is clear, if you have any doubts, kindly let me know.");
  lines.push("");
  lines.push("Thanks & Regards,");
  lines.push(senderName || "Poornima Venkatesan");
  lines.push("Customer Support Executive");
  lines.push("Ph. No - 7305005116");
  lines.push(`Email: ${senderEmail || "poornima.v@adarshshipping.in"}`);
  lines.push("");
  lines.push("Work Timings: 9:30 AM - 5:30 PM IST (Mon-Fri)");
  lines.push("Holidays: 2nd & 4th Saturdays");

  return lines.join("\n");
}

export function ServiceRateWorkflowPanel({
  lead,
  serviceType,
}: {
  lead: {
    id: string;
    enquiryRef?: string | null;
    enquiryDetails: unknown;
  };
  serviceType?: CrmRateDepartment | null;
}) {
  const router = useRouter();
  const workflow = useMemo(
    () => getRateWorkflowSnapshot(lead.enquiryDetails),
    [lead.enquiryDetails],
  );
  const pendingDepartments = useMemo(
    () => getPendingDepartments(workflow),
    [workflow],
  );
  const changedDepartments = useMemo(
    () => getDepartmentsWithUnquotedChanges(workflow),
    [workflow],
  );
  const comparisonWorkspace = useMemo(
    () =>
      buildRateComparisonWorkspace({
        workflow,
        enquiryDetails: lead.enquiryDetails,
      }),
    [lead.enquiryDetails, workflow],
  );
  const currentFinalizedVersion = getCurrentFinalizedBuyRateVersion(workflow);
  const currentPricingSnapshot = getCurrentPricingSnapshot(workflow);
  const defaultTab: TabKey =
    serviceType ||
    (departmentHasSubmittedRates(workflow, "FREIGHT_FORWARDING")
      ? "FREIGHT_FORWARDING"
      : "CUSTOMS_CLEARANCE");
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(true);
  const [isSendingRequests, setIsSendingRequests] = useState(false);
  const [isSyncingResponses, setIsSyncingResponses] = useState(false);
  const [freightCharges, setFreightCharges] = useState(workflow.freightCharges);
  const [customsCharges, setCustomsCharges] = useState(workflow.customsCharges);
  const [additionalChargeName, setAdditionalChargeName] = useState("");
  const [additionalChargeUnit, setAdditionalChargeUnit] = useState<ChargeUnit>("BL");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipients, setRecipients] = useState<RecipientOption[]>([]);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [reportingCc, setReportingCc] = useState<string[]>([]);
  const [reportingContacts, setReportingContacts] = useState<ReportingContact[]>([]);
  const [senderName, setSenderName] = useState("Poornima Venkatesan");
  const [senderEmail, setSenderEmail] = useState("poornima.v@adarshshipping.in");
  const [requestNotes, setRequestNotes] = useState("");
  const [additionalCc, setAdditionalCc] = useState("");
  const [mailSubject, setMailSubject] = useState(buildEmailSubject(lead));
  const [mailBody, setMailBody] = useState(
    buildTemplateBody(
      lead,
      "",
      "Poornima Venkatesan",
      "poornima.v@adarshshipping.in",
    ),
  );
  const [selectedResponseRequestId, setSelectedResponseRequestId] = useState(
    workflow.rateRequests[0]?.id ?? "",
  );
  const [isSavingResponse, setIsSavingResponse] = useState(false);
  const [isParsingResponse, setIsParsingResponse] = useState(false);
  const [responseReceivedAt, setResponseReceivedAt] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [responseCurrency, setResponseCurrency] = useState("INR");
  const [responseValidity, setResponseValidity] = useState("");
  const [responseCarrier, setResponseCarrier] = useState("");
  const [responseRouting, setResponseRouting] = useState("");
  const [responseTransit, setResponseTransit] = useState("");
  const [responseRemarks, setResponseRemarks] = useState("");
  const [responseLines, setResponseLines] = useState<ResponseLineDraft[]>([
    createResponseLineDraft(),
  ]);
  const [parsedResponseMeta, setParsedResponseMeta] = useState<ParsedResponseMeta | null>(null);
  const [comparisonMode, setComparisonMode] = useState<RateComparisonSelectionMode>(
    comparisonWorkspace.selection.mode,
  );
  const [selectedComparisonResponseId, setSelectedComparisonResponseId] = useState(
    comparisonWorkspace.selection.selectedResponseId ||
      comparisonWorkspace.recommendedEntireAgentResponseId ||
      comparisonWorkspace.responses[0]?.id ||
      "",
  );
  const [selectedChargeResponseMap, setSelectedChargeResponseMap] = useState<Record<string, string>>(
    buildInitialChargeSelectionMap(
      comparisonWorkspace.selection.chargeSelections.length > 0
        ? comparisonWorkspace.selection.chargeSelections
        : comparisonWorkspace.recommendedMixedChargeSelections,
    ),
  );
  const [isSavingComparison, setIsSavingComparison] = useState(false);
  const [isGeneratingRecommendation, setIsGeneratingRecommendation] = useState(false);
  const [isSavingRecommendationDecision, setIsSavingRecommendationDecision] = useState(false);
  const [isFinalizingBuyRates, setIsFinalizingBuyRates] = useState(false);
  const [isSavingPricingSnapshot, setIsSavingPricingSnapshot] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideNote, setOverrideNote] = useState("");
  const [finalizationNote, setFinalizationNote] = useState("");
  const pricingSeedKey = `${currentFinalizedVersion?.id ?? "none"}:${currentPricingSnapshot?.id ?? "none"}`;
  const pricingLineSeeds = useMemo(
    () => buildPricingLineDrafts(currentFinalizedVersion, currentPricingSnapshot),
    [currentFinalizedVersion, currentPricingSnapshot],
  );
  const [pricingLineEdits, setPricingLineEdits] = useState<
    Record<string, Partial<PricingLineDraft>>
  >({});
  const [pricingNoteEdits, setPricingNoteEdits] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;

    async function loadRecipients() {
      setIsLoadingRecipients(true);
      const result = await listRateRequestRecipientsAction(lead.id);
      if (!active) return;

      if (!result.ok) {
        toast.error(result.error || "Failed to load rate-request recipients.");
        setIsLoadingRecipients(false);
        return;
      }

      setRecipients(result.data.recipients || []);
      setReportingCc(result.data.reportingCc || []);
      setReportingContacts(result.data.reportingContacts || []);
      const nextSenderName = result.data.sender?.name || "Poornima Venkatesan";
      const nextSenderEmail =
        result.data.sender?.email || "poornima.v@adarshshipping.in";
      setSenderName(nextSenderName);
      setSenderEmail(nextSenderEmail);
      setMailSubject(buildEmailSubject(lead));
      setMailBody(buildTemplateBody(lead, requestNotes, nextSenderName, nextSenderEmail));
      setIsLoadingRecipients(false);
    }

    void loadRecipients();
    return () => {
      active = false;
    };
  }, [lead, requestNotes]);

  const activeCharges =
    activeTab === "FREIGHT_FORWARDING" ? freightCharges : customsCharges;
  const canEditActiveTab = !serviceType || serviceType === activeTab;
  const activeSubmitted =
    activeTab === "FREIGHT_FORWARDING"
      ? workflow.freightSubmittedAt
      : workflow.customsSubmittedAt;
  const activeSignature = createRatesSignature(
    Object.fromEntries(
      activeCharges.map((entry) => [entry.code, Number(entry.amount) || 0]),
    ),
  );
  const lastQuotedSignature =
    activeTab === "FREIGHT_FORWARDING"
      ? workflow.lastQuotedFreightSignature
      : workflow.lastQuotedCustomsSignature;
  const hasUnquotedChangesForActiveTab =
    activeCharges.some((entry) => Number(entry.amount) > 0) &&
    activeSignature !== (lastQuotedSignature ?? "[]");
  const combinedDepartments = getIncludedDepartmentsForMode("combined", workflow);
  const activeAdditionalCharges = activeCharges.filter(
    (entry) => entry.source === "ADDITIONAL",
  );
  const selectedRecipients = recipients.filter((recipient) =>
    selectedRecipientIds.includes(recipient.id),
  );
  const canonicalChargeOptions = useMemo(
    () => getCanonicalChargeOptions(workflow),
    [workflow],
  );
  const responseByRequestId = useMemo(
    () => new Map(workflow.rateResponses.map((response) => [response.requestId, response])),
    [workflow.rateResponses],
  );
  const selectedResponseRequest =
    workflow.rateRequests.find((request) => request.id === selectedResponseRequestId) ?? null;
  const selectedSavedResponse = selectedResponseRequest
    ? responseByRequestId.get(selectedResponseRequest.id) ?? null
    : null;
  const pricingSnapshotStale =
    currentPricingSnapshot &&
    currentFinalizedVersion &&
    currentPricingSnapshot.basedOnFinalizedVersionId !== currentFinalizedVersion.id;
  const hasRateRequests = workflow.rateRequests.length > 0;
  const hasStructuredResponses = comparisonWorkspace.responses.length > 0;
  const hasFinalizedBuyRates = Boolean(currentFinalizedVersion);
  const selectedChargeCount = Object.values(selectedChargeResponseMap).filter(Boolean).length;
  const filteredRecipients = recipients.filter((recipient) => {
    const searchValue = recipientSearch.trim().toLowerCase();
    if (!searchValue) return true;
    return [recipient.name, recipient.contactName || "", recipient.email || "", recipient.services || ""]
      .join(" ")
      .toLowerCase()
      .includes(searchValue);
  });
  const availableRecipientSuggestions = filteredRecipients
    .filter((recipient) => !selectedRecipientIds.includes(recipient.id))
    .slice(0, recipientSearch.trim() ? 8 : 6);
  const stageCards = COMMERCIAL_STAGE_ORDER.map((status) => {
    if (status === workflow.commercialStatus) {
      return {
        key: status,
        label: getCommercialStatusLabel(status),
        description: "Current commercial state for this enquiry.",
        state: "Active",
      };
    }

    if (status === "RATE_REQUESTS_SENT") {
      return {
        key: status,
        label: "Rate Requests",
        description:
          workflow.rateRequests.length > 0
            ? `${workflow.rateRequests.length} outbound agent request(s) have already been logged.`
            : "Select agents from the master list and send separate rate-request emails from this worksheet.",
        state: workflow.rateRequests.length > 0 ? "Ready" : "Planned",
      };
    }

    if (status === "AWAITING_AGENT_RATES") {
      return {
        key: status,
        label: "Agent Responses",
        description:
          workflow.rateRequests.length > 0
            ? "Agent replies are now expected and can be linked in the next phase."
            : "This stage activates automatically once outbound requests are sent.",
        state: workflow.rateRequests.length > 0 ? "Ready" : "Planned",
      };
    }

    if (status === "RATE_COMPARISON") {
      return {
        key: status,
        label: "Rate Comparison",
        description:
          workflow.rateResponses.length > 0
            ? "Comparison, recommendation, and buy-rate decisions are active here."
            : "This stage activates once structured responses are available.",
        state: workflow.rateResponses.length > 0 ? "Ready" : "Planned",
      };
    }

    if (status === "RATE_FINALIZED") {
      return {
        key: status,
        label: "Buy Rate Finalized",
        description:
          workflow.finalizedBuyRateVersions.length > 0
            ? `${workflow.finalizedBuyRateVersions.length} finalized buy-rate version(s) are stored.`
            : "Finalize the selected buy-rate path to unlock costing in the next phase.",
        state: workflow.finalizedBuyRateVersions.length > 0 ? "Ready" : "Planned",
      };
    }

    if (status === "PRICING") {
      return {
        key: status,
        label: getCommercialStatusLabel(status),
        description: workflow.costingLocked
          ? "Costing stays locked until a finalized buy-rate snapshot exists."
          : workflow.pricingSnapshot
            ? "Pricing worksheet saved and ready for quotation seeding."
            : "Costing is unlocked; save the pricing worksheet before creating quotations.",
        state: workflow.costingLocked ? "Locked" : workflow.pricingSnapshot ? "Active" : "Ready",
      };
    }

    return {
      key: status,
      label: getCommercialStatusLabel(status),
      description: "This state becomes available as later commercial phases are completed.",
      state: "Ready",
    };
  });
  const pricingLines = pricingLineSeeds.map((line) => ({
    ...line,
    ...(pricingLineEdits[line.finalizedLineId] ?? {}),
  }));
  const pricingNote = pricingNoteEdits[pricingSeedKey] ?? currentPricingSnapshot?.notes ?? "";

  const pricingTotals = pricingLines.reduce(
    (sum, line) => {
      const buyAmount = line.buyAmount * line.quantity;
      const sellAmount = line.sellAmount * line.quantity;
      sum.buyAmount += buyAmount;
      sum.sellAmount += sellAmount;
      sum.marginAmount += sellAmount - buyAmount;
      return sum;
    },
    { buyAmount: 0, sellAmount: 0, marginAmount: 0 },
  );
  const pricingMarginPercent =
    pricingTotals.buyAmount > 0
      ? (pricingTotals.marginAmount / pricingTotals.buyAmount) * 100
      : null;

  async function handleSave(tab: TabKey) {
    const payload = {
      charges: tab === "FREIGHT_FORWARDING" ? freightCharges : customsCharges,
    };
    setIsSaving(true);
    const result = await saveEnquiryRatesAction(lead.id, tab, payload);
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.error || "Failed to save department charges.");
      return;
    }

    toast.success(
      tab === "FREIGHT_FORWARDING"
        ? "Freight forwarding charges saved."
        : "Customs clearance charges saved.",
    );
    router.refresh();
  }

  function updateDepartmentCharges(
    department: TabKey,
    updater: (current: EnquiryChargeEntry[]) => EnquiryChargeEntry[],
  ) {
    if (department === "FREIGHT_FORWARDING") {
      setFreightCharges((current) => updater(current));
      return;
    }
    setCustomsCharges((current) => updater(current));
  }

  function handleAddAdditionalCharge() {
    const name = additionalChargeName.trim();
    if (!name) {
      toast.error("Enter a charge name before adding an additional charge.");
      return;
    }

    const nextCharge = createAdditionalChargeEntry({
      department: activeTab,
      name,
      unit: additionalChargeUnit,
      displayOrder: activeCharges.length + 1,
    });

    updateDepartmentCharges(activeTab, (current) => [...current, nextCharge]);
    setAdditionalChargeName("");
    setAdditionalChargeUnit("BL");
    toast.success("Additional charge added to the worksheet.");
  }

  function buildQuoteHref(mode: CrmQuoteWorkflowMode) {
    const search = new URLSearchParams({
      leadId: lead.id,
      mode,
    });

    if (serviceType) {
      search.set("department", serviceType);
    }

    return `/crm/quotes/new?${search.toString()}`;
  }

  function toggleRecipient(id: string) {
    setSelectedRecipientIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  }

  function regenerateTemplate() {
    setMailSubject(buildEmailSubject(lead));
    setMailBody(buildTemplateBody(lead, requestNotes, senderName, senderEmail));
  }

  async function handleSendRateRequests() {
    if (selectedRecipientIds.length === 0) {
      toast.error("Choose at least one agent before sending rate requests.");
      return;
    }

    setIsSendingRequests(true);
    const result = await sendEnquiryRateRequestsAction(lead.id, {
      vendorIds: selectedRecipientIds,
      subject: mailSubject,
      body: mailBody,
      notes: requestNotes,
      cc: additionalCc,
    });
    setIsSendingRequests(false);

    if (!result.ok) {
      toast.error(result.error || "Failed to send rate requests.");
      return;
    }

    toast.success(`Sent ${result.data.sentCount} rate request(s).`);
    setSelectedRecipientIds([]);
    setAdditionalCc("");
    router.refresh();
  }

  async function handleSyncResponses() {
    setIsSyncingResponses(true);
    const result = await syncEnquiryRateRequestResponsesAction(lead.id);
    setIsSyncingResponses(false);

    if (!result.ok) {
      toast.error(result.error || "Failed to sync agent responses.");
      return;
    }

    toast.success(
      `Sync complete: ${result.data.repliedCount} replied, ${result.data.bouncedCount} bounced.`,
    );
    router.refresh();
  }

  function loadResponseIntoEditor(requestId: string) {
    setSelectedResponseRequestId(requestId);
    const savedResponse = responseByRequestId.get(requestId);
    const request = workflow.rateRequests.find((entry) => entry.id === requestId);

    if (savedResponse) {
      setResponseReceivedAt(savedResponse.receivedAt.slice(0, 16));
      setResponseCurrency(savedResponse.currency || "INR");
      setResponseValidity(savedResponse.validity || "");
      setResponseCarrier(savedResponse.carrier || "");
      setResponseRouting(savedResponse.routing || "");
      setResponseTransit(savedResponse.transit || "");
      setResponseRemarks(savedResponse.remarks || "");
      setResponseLines(
        savedResponse.lines.length > 0
          ? savedResponse.lines.map((line) => createResponseLineDraft(line))
          : [createResponseLineDraft()],
      );
      setParsedResponseMeta({
        parserStatus: savedResponse.parserStatus,
        parserModel: savedResponse.parserModel,
        parserRunAt: savedResponse.parserRunAt,
        overallConfidence: savedResponse.overallConfidence,
        standardRateSignal: savedResponse.standardRateSignal,
        sources: savedResponse.sources,
        warnings: savedResponse.warnings,
      });
      return;
    }

    setResponseReceivedAt(
      (request?.replyTimestamp || new Date().toISOString()).slice(0, 16),
    );
    setResponseCurrency("INR");
    setResponseValidity("");
    setResponseCarrier("");
    setResponseRouting("");
    setResponseTransit("");
    setResponseRemarks("");
    setResponseLines([createResponseLineDraft()]);
    setParsedResponseMeta(null);
  }

  function updateResponseLine(
    lineId: string,
    updater: (line: ResponseLineDraft) => ResponseLineDraft,
  ) {
    setResponseLines((current) =>
      current.map((line) => (line.id === lineId ? updater(line) : line)),
    );
  }

  function addResponseLine() {
    setResponseLines((current) => [...current, createResponseLineDraft()]);
  }

  function removeResponseLine(lineId: string) {
    setResponseLines((current) =>
      current.length === 1 ? current : current.filter((line) => line.id !== lineId),
    );
  }

  function applyCanonicalSuggestion(lineId: string, originalDescription: string) {
    const suggestion = suggestCanonicalCharge(workflow, originalDescription);
    if (!suggestion) return;

    updateResponseLine(lineId, (line) => ({
      ...line,
      canonicalChargeCode: suggestion.code,
      canonicalChargeName: suggestion.name,
    }));
  }

  async function handleSaveAgentResponse() {
    if (!selectedResponseRequestId) {
      toast.error("Choose an agent request before saving a structured response.");
      return;
    }

    setIsSavingResponse(true);
    const result = await saveEnquiryAgentResponseAction(lead.id, {
      requestId: selectedResponseRequestId,
      receivedAt: responseReceivedAt,
      currency: responseCurrency,
      validity: responseValidity,
      carrier: responseCarrier,
      routing: responseRouting,
      transit: responseTransit,
      remarks: responseRemarks,
      lines: responseLines.map((line) => ({
        id: line.id,
        originalDescription: line.originalDescription,
        canonicalChargeCode: line.canonicalChargeCode,
        amount: line.amount,
        amountSourceText: line.amountSourceText || undefined,
        amountMissing: line.amountMissing,
        currency: line.currency,
        unit: line.unit,
        quantityBasis: line.quantityBasis,
        quantityText: line.quantityText || undefined,
        containerText: line.containerText || undefined,
        minimumCharge: line.minimumCharge || undefined,
        taxText: line.taxText || undefined,
        freeDaysText: line.freeDaysText || undefined,
        inclusionStatus: line.inclusionStatus,
        notes: line.notes || undefined,
        confidenceScore: line.confidenceScore ?? undefined,
        confidenceLabel: line.confidenceLabel ?? undefined,
        reviewStatus: line.reviewStatus,
        missingFields: line.missingFields,
        standardRateReference: line.standardRateReference || undefined,
        evidence: line.evidence,
        saveAlias: line.saveAlias,
      })),
      parserStatus: parsedResponseMeta?.parserStatus || "MANUAL",
      parserModel: parsedResponseMeta?.parserModel || undefined,
      parserRunAt: parsedResponseMeta?.parserRunAt || undefined,
      overallConfidence: parsedResponseMeta?.overallConfidence ?? undefined,
      standardRateSignal: parsedResponseMeta?.standardRateSignal || undefined,
      sources: parsedResponseMeta?.sources || undefined,
      warnings: parsedResponseMeta?.warnings || undefined,
    });
    setIsSavingResponse(false);

    if (!result.ok) {
      toast.error(result.error || "Failed to save structured rate response.");
      return;
    }

    toast.success(
      `Structured response saved with ${result.data.lineCount} rate line(s).`,
    );
    router.refresh();
  }

  async function handleParseAgentResponse(requestId = selectedResponseRequestId) {
    if (!requestId) {
      toast.error("Choose an agent request before parsing a reply.");
      return;
    }

    setSelectedResponseRequestId(requestId);
    setIsParsingResponse(true);
    const result = await parseEnquiryAgentResponseDraftAction(lead.id, requestId);
    setIsParsingResponse(false);

    if (!result.ok) {
      toast.error(result.error || "Failed to parse the latest agent reply.");
      return;
    }

    const parsed = result.data as ParsedAgentRateDraft;
    setResponseReceivedAt(String(parsed.receivedAt || new Date().toISOString()).slice(0, 16));
    setResponseCurrency(parsed.currency === "Not Provided" ? "INR" : parsed.currency);
    setResponseValidity(parsed.validity === "Not Provided" ? "" : parsed.validity);
    setResponseCarrier(parsed.carrier === "Not Provided" ? "" : parsed.carrier);
    setResponseRouting(parsed.routing === "Not Provided" ? "" : parsed.routing);
    setResponseTransit(parsed.transit === "Not Provided" ? "" : parsed.transit);
    setResponseRemarks(parsed.remarks || "");
    setResponseLines(
      parsed.lines.length > 0
        ? parsed.lines.map((line) => createResponseLineDraft(line))
        : [createResponseLineDraft()],
    );
    setParsedResponseMeta({
      parserStatus: parsed.parserStatus,
      parserModel: parsed.parserModel,
      parserRunAt: new Date().toISOString(),
      overallConfidence: parsed.overallConfidence,
      standardRateSignal: parsed.standardRateSignal,
      sources: parsed.sources,
      warnings: parsed.warnings,
    });
    toast.success(
      parsed.lines.length > 0
        ? `Parsed ${parsed.lines.length} rate line(s) from the latest reply. Review before saving.`
        : "The reply was parsed, but no rate lines were found automatically.",
    );
  }

  function applyRecommendedWholeAgent() {
    if (!comparisonWorkspace.recommendedEntireAgentResponseId) {
      toast.error("No fully comparable whole-agent recommendation is available yet.");
      return;
    }

    setComparisonMode("ENTIRE_AGENT");
    setSelectedComparisonResponseId(comparisonWorkspace.recommendedEntireAgentResponseId);
    toast.success("Recommended whole-agent selection applied.");
  }

  function applyRecommendedChargeMix() {
    if (comparisonWorkspace.recommendedMixedChargeSelections.length === 0) {
      toast.error("No per-charge recommendation is available yet.");
      return;
    }

    setComparisonMode("PER_CHARGE");
    setSelectedChargeResponseMap(
      buildInitialChargeSelectionMap(comparisonWorkspace.recommendedMixedChargeSelections),
    );
    toast.success("Recommended charge mix applied.");
  }

  async function handleSaveComparisonSelection() {
    if (comparisonWorkspace.responses.length === 0) {
      toast.error("Save at least one structured agent response before storing a comparison.");
      return;
    }

    const chargeSelections =
      comparisonMode === "PER_CHARGE"
        ? comparisonWorkspace.chargeRows
            .map((row) => {
              const responseId = selectedChargeResponseMap[row.chargeCode];
              if (!responseId) return null;
              const cell = row.cells.find((entry) => entry.responseId === responseId);
              if (!cell) return null;
              return {
                chargeCode: row.chargeCode,
                responseId,
                lineId: cell.lineId,
              };
            })
            .filter(
              (
                entry,
              ): entry is { chargeCode: string; responseId: string; lineId: string | null } =>
                Boolean(entry),
            )
        : [];

    setIsSavingComparison(true);
    const result = await saveEnquiryRateComparisonSelectionAction(lead.id, {
      mode: comparisonMode,
      selectedResponseId:
        comparisonMode === "ENTIRE_AGENT" ? selectedComparisonResponseId || null : null,
      chargeSelections,
    });
    setIsSavingComparison(false);

    if (!result.ok) {
      toast.error(result.error || "Failed to save the rate comparison selection.");
      return;
    }

    toast.success(
      comparisonMode === "ENTIRE_AGENT"
        ? "Whole-agent comparison selection saved."
        : `Per-charge comparison saved for ${chargeSelections.length} charge(s).`,
    );
    router.refresh();
  }

  async function handleGenerateRecommendation() {
    setIsGeneratingRecommendation(true);
    const result = await generateEnquiryBestRateRecommendationAction(lead.id);
    setIsGeneratingRecommendation(false);

    if (!result.ok) {
      toast.error(result.error || "Failed to generate the best-rate recommendation.");
      return;
    }

    toast.success("Best-rate recommendation generated.");
    router.refresh();
  }

  async function handleAcceptRecommendation() {
    setIsSavingRecommendationDecision(true);
    const result = await saveEnquiryRateRecommendationDecisionAction(lead.id, {
      decision: "ACCEPT",
    });
    setIsSavingRecommendationDecision(false);

    if (!result.ok) {
      toast.error(result.error || "Failed to accept the best-rate recommendation.");
      return;
    }

    toast.success("Best-rate recommendation accepted.");
    router.refresh();
  }

  async function handleOverrideRecommendation() {
    const chargeSelections =
      comparisonMode === "PER_CHARGE"
        ? comparisonWorkspace.chargeRows
            .map((row) => {
              const responseId = selectedChargeResponseMap[row.chargeCode];
              if (!responseId) return null;
              const cell = row.cells.find((entry) => entry.responseId === responseId);
              if (!cell) return null;
              return {
                chargeCode: row.chargeCode,
                responseId,
                lineId: cell.lineId,
              };
            })
            .filter(
              (
                entry,
              ): entry is { chargeCode: string; responseId: string; lineId: string | null } =>
                Boolean(entry),
            )
        : [];

    setIsSavingRecommendationDecision(true);
    const result = await saveEnquiryRateRecommendationDecisionAction(lead.id, {
      decision: "OVERRIDE",
      selectedMode: comparisonMode,
      selectedResponseId:
        comparisonMode === "ENTIRE_AGENT" ? selectedComparisonResponseId || null : null,
      chargeSelections,
      overrideReasons: overrideReason ? [overrideReason] : [],
      overrideNote,
    });
    setIsSavingRecommendationDecision(false);

    if (!result.ok) {
      toast.error(result.error || "Failed to store the override decision.");
      return;
    }

    toast.success("Recommendation override saved.");
    router.refresh();
  }

  async function handleFinalizeBuyRates() {
    setIsFinalizingBuyRates(true);
    const result = await finalizeEnquiryBuyRatesAction(lead.id, {
      notes: finalizationNote,
    });
    setIsFinalizingBuyRates(false);

    if (!result.ok) {
      toast.error(result.error || "Failed to finalize the buy-rate snapshot.");
      return;
    }

    toast.success(`Buy rates finalized as ${result.data.versionLabel}.`);
    setFinalizationNote("");
    router.refresh();
  }

  async function handleSavePricingSnapshot() {
    if (!currentFinalizedVersion) {
      toast.error("Finalize buy rates before saving the pricing worksheet.");
      return;
    }

    if (pricingLines.length === 0) {
      toast.error("Pricing lines are not available for the finalized buy-rate version.");
      return;
    }

    setIsSavingPricingSnapshot(true);
    const result = await saveEnquiryPricingSnapshotAction(lead.id, {
      notes: pricingNote,
      lines: pricingLines.map((line) => ({
        finalizedLineId: line.finalizedLineId,
        quantity: line.quantity,
        sellAmount: line.sellAmount,
        included: true,
        notes: line.notes,
      })),
    });
    setIsSavingPricingSnapshot(false);

    if (!result.ok) {
      toast.error(result.error || "Failed to save the pricing worksheet.");
      return;
    }

    toast.success("Pricing worksheet saved.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <CrmSection
        eyebrow="Commercial worksheet"
        title="Rate acquisition worksheet"
        description="Phase 2 connects enquiry rate requests to the live communication stack, tracks sent agent mail, and keeps the costing worksheet ready for incoming buy rates."
      >
        <div className="mnx-crm-commercial-workbench">
          <CrmPanel className="mnx-crm-panel-surface mnx-crm-commercial-summary">
            <div className="mnx-crm-commercial-summary-copy">
              <div className="mnx-crm-commercial-summary-heading">
                <CrmStatus variant="warning">
                  {workflow.rateRequests.length > 0 ? "Requests in progress" : "Rate acquisition pending"}
                </CrmStatus>
                <CrmStatus variant="accent">
                  {getCommercialStatusLabel(workflow.commercialStatus)}
                </CrmStatus>
                {workflow.chargeContext.scenarioKey ? (
                  <CrmStatus variant="success">{workflow.chargeContext.scenarioLabel}</CrmStatus>
                ) : (
                  <CrmStatus variant="warning">Scenario incomplete</CrmStatus>
                )}
              </div>
              <p className="mnx-crm-commercial-summary-text">
                {workflow.chargeContext.scenarioKey
                  ? `The enquiry charge list is generated from ${workflow.chargeContext.scenarioLabel}. Agent requests, sent-mail history, and worksheet pricing now stay on the same commercial surface.`
                  : "Complete the enquiry direction, mode, and load type to unlock the seeded commercial charge catalogue for this enquiry."}
              </p>
            </div>
            <div className="mnx-crm-commercial-meta-grid">
              <div>
                <span>Pending departments</span>
                <strong>
                  {pendingDepartments.length
                    ? pendingDepartments
                        .map((item) =>
                          item === "FREIGHT_FORWARDING"
                            ? "Freight Forwarding"
                            : "Customs Clearance",
                        )
                        .join(", ")
                    : "None"}
                </strong>
              </div>
              <div>
                <span>Rate requests sent</span>
                <strong>{workflow.rateRequests.length}</strong>
              </div>
              <div>
                <span>Costing</span>
                <strong>Locked for later phase</strong>
              </div>
            </div>
          </CrmPanel>

          <div className="mnx-crm-commercial-stage-grid">
            {stageCards.map((card) => (
              <CrmPanel key={card.key} className="mnx-crm-commercial-stage-card">
                <div className="mnx-crm-commercial-stage-header">
                  <strong>{card.label}</strong>
                  <CrmStatus variant={getStageBadgeVariant(card.state)}>
                    {card.state}
                  </CrmStatus>
                </div>
                <p>{card.description}</p>
              </CrmPanel>
            ))}
          </div>

          <CrmPanel className="mnx-crm-panel-surface mnx-crm-commercial-mailer">
            <div className="mnx-crm-commercial-sheet-header">
              <div className="mnx-crm-commercial-sheet-copy">
                <span className="mnx-crm-commercial-eyebrow">Phase 2</span>
                <h3>Agent rate-request composer</h3>
                <p>
                  Select agents from the CRM master, keep reporting managers in CC automatically,
                  and send separate mail to each selected agent with a live enquiry template.
                </p>
              </div>
              <div className="mnx-crm-commercial-sheet-status">
                <CrmStatus variant={workflow.rateRequests.length > 0 ? "success" : "warning"}>
                  {workflow.rateRequests.length > 0 ? "Requests logged" : "No requests yet"}
                </CrmStatus>
                <span>{selectedRecipients.length} recipient(s) selected</span>
              </div>
            </div>

            <div className="mnx-crm-commercial-mailer-grid">
              <div className="mnx-crm-commercial-recipient-pane mnx-crm-commercial-recipient-pane-compact">
                <div className="mnx-crm-commercial-recipient-pane-heading">
                  <strong>Agent suggestions</strong>
                  <p>Pick from the CRM master while composing the mail.</p>
                </div>

                <div className="mnx-crm-commercial-recipient-list">
                  {isLoadingRecipients ? (
                    <p className="text-sm text-[var(--mnx-text-muted)]">Loading recipients...</p>
                  ) : filteredRecipients.length > 0 ? (
                    filteredRecipients.map((recipient) => (
                      <label key={recipient.id} className="mnx-crm-commercial-recipient-card">
                        {/* eslint-disable-next-line no-restricted-syntax -- This is an intentional multi-select checkbox list for agent recipients. */}
                        <input
                          type="checkbox"
                          checked={selectedRecipientIds.includes(recipient.id)}
                          onChange={() => toggleRecipient(recipient.id)}
                        />
                        <div>
                          <strong>{recipient.name}</strong>
                          <p>
                            {recipient.contactName || "Primary contact pending"} ·{" "}
                            {recipient.email || "Email missing"}
                          </p>
                          <span>{recipient.services || "Service tags not set"}</span>
                          {recipient.recommendation ? (
                            <div className="mnx-crm-commercial-recipient-insight">
                              <div className="mnx-crm-commercial-recipient-insight-badges">
                                {recipient.recommendation.recommended ? (
                                  <CrmStatus variant="success">Recommended</CrmStatus>
                                ) : recipient.recommendation.rank ? (
                                  <CrmStatus variant="accent">
                                    Rank #{recipient.recommendation.rank}
                                  </CrmStatus>
                                ) : null}
                                <CrmStatus variant="neutral">
                                  {recipient.recommendation.metrics.similarEnquiryCount} similar
                                </CrmStatus>
                              </div>
                              <p>
                                {recipient.recommendation.explanation ||
                                  "Historical recommendation evidence is still building."}
                              </p>
                              <span>
                                Response{" "}
                                {recipient.recommendation.metrics.responseRatePct ?? "N/A"}% ·
                                Competitive{" "}
                                {recipient.recommendation.metrics.competitivenessPct ?? "N/A"}% ·
                                Selected{" "}
                                {recipient.recommendation.metrics.selectionRatePct ?? "N/A"}%
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--mnx-text-muted)]">
                      No active agent master records match this search.
                    </p>
                  )}
                </div>
              </div>

              <div className="mnx-crm-commercial-compose-pane mnx-crm-commercial-compose-pane-priority">
                <div className="mnx-crm-commercial-compose-shell">
                  <div className="mnx-crm-commercial-compose-row">
                    <span className="mnx-crm-commercial-compose-label">To</span>
                    <div className="mnx-crm-commercial-compose-recipient-stack">
                      <div className="mnx-crm-commercial-compose-recipients">
                        {selectedRecipients.map((recipient) => (
                          /* eslint-disable-next-line no-restricted-syntax -- This is an intentional tokenized recipient chip used inside a custom mail-style compose widget. */
                          <button
                            key={recipient.id}
                            type="button"
                            className="mnx-crm-commercial-recipient-pill"
                            onClick={() => toggleRecipient(recipient.id)}
                            aria-label={`Remove ${recipient.name} from recipients`}
                          >
                            <span>{recipient.contactName || recipient.name}</span>
                            <small>{recipient.email || "Email missing"}</small>
                            <b>Remove</b>
                          </button>
                        ))}
                        {/* eslint-disable-next-line no-restricted-syntax -- This is an intentional inline recipient search input inside the custom mail-style compose widget. */}
                        <input
                          value={recipientSearch}
                          onChange={(event) => setRecipientSearch(event.target.value)}
                          placeholder={
                            selectedRecipients.length > 0
                              ? "Add more agents by name, email, or service"
                              : "Search and add agents like a mail recipient list"
                          }
                          className="mnx-crm-commercial-compose-inline-input"
                          aria-label="Search and add rate-request recipients"
                        />
                      </div>

                      {!isLoadingRecipients && availableRecipientSuggestions.length > 0 ? (
                        <div className="mnx-crm-commercial-compose-suggestions" aria-label="Matching agents">
                          {availableRecipientSuggestions.map((recipient) => (
                            /* eslint-disable-next-line no-restricted-syntax -- This is an intentional suggestion action inside the custom recipient picker. */
                            <button
                              key={`suggestion-${recipient.id}`}
                              type="button"
                              className="mnx-crm-commercial-compose-suggestion"
                              onClick={() => toggleRecipient(recipient.id)}
                            >
                              <span>{recipient.contactName || recipient.name}</span>
                              <small>{recipient.name}</small>
                              <em>{recipient.email || "Email missing"}</em>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mnx-crm-commercial-compose-row">
                    <span className="mnx-crm-commercial-compose-label">Cc</span>
                    <div className="mnx-crm-commercial-compose-meta">
                      {reportingCc.length > 0 ? (
                        <div className="mnx-crm-commercial-inline-note">
                          <strong>Reporting CC</strong>
                          <span>{reportingCc.join(", ")}</span>
                        </div>
                      ) : (
                        <div className="mnx-crm-commercial-inline-note is-warning">
                          <strong>Reporting CC</strong>
                          <span>Not configured</span>
                        </div>
                      )}
                      <CrmInput
                        value={additionalCc}
                        onChange={(event) => setAdditionalCc(event.target.value)}
                        placeholder="Optional extra CC emails, comma separated"
                      />
                    </div>
                  </div>

                  <div className="mnx-crm-commercial-compose-row">
                    <span className="mnx-crm-commercial-compose-label">Subject</span>
                    <div className="mnx-crm-commercial-compose-meta">
                      <CrmInput
                        value={mailSubject}
                        onChange={(event) => setMailSubject(event.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="mnx-crm-commercial-badge-row">
                  <CrmStatus variant="accent">Template token: {"{{recipientName}}"}</CrmStatus>
                  <CrmStatus variant={selectedRecipients.length > 0 ? "success" : "warning"}>
                    {selectedRecipients.length > 0
                      ? `${selectedRecipients.length} agent(s) queued`
                      : "Add recipients to enable sending"}
                  </CrmStatus>
                </div>

                {reportingContacts.length > 0 ? (
                  <div className="mnx-crm-commercial-reporting-list">
                    {reportingContacts.map((contact) => (
                      <div key={contact.id} className="mnx-crm-commercial-reporting-card">
                        <strong>{contact.role}</strong>
                        <p>{contact.name}</p>
                        <span>{contact.email}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                <CrmField label="Additional notes">
                  <CrmTextarea
                    rows={3}
                    value={requestNotes}
                    onChange={(event) => setRequestNotes(event.target.value)}
                    placeholder="Optional notes shown inside the enquiry email."
                  />
                </CrmField>

                <CrmField label="Email body" className="mnx-crm-commercial-body-field">
                  <CrmTextarea
                    rows={20}
                    value={mailBody}
                    onChange={(event) => setMailBody(event.target.value)}
                  />
                </CrmField>

                <div className="mnx-crm-commercial-compose-actions">
                  <CrmButton type="button" variant="secondary" size="compact" onClick={regenerateTemplate}>
                    Reset to template
                  </CrmButton>
                  <CrmButton
                    type="button"
                    onClick={handleSendRateRequests}
                    disabled={isSendingRequests || isLoadingRecipients}
                  >
                    {isSendingRequests ? "Sending..." : `Send to ${selectedRecipients.length || 0} agents`}
                  </CrmButton>
                </div>
              </div>
            </div>

            <div className="mnx-crm-commercial-preview-shell">
              <div className="mnx-crm-commercial-preview-copy">
                <strong>Send batch preview</strong>
                <p>
                  Each recipient receives an individual email. The salutation token is resolved from
                  the agent contact name or agent name at send time.
                </p>
              </div>
              <div className="mnx-crm-commercial-preview-list">
                {selectedRecipients.length > 0 ? (
                  selectedRecipients.map((recipient) => (
                    <div key={recipient.id} className="mnx-crm-commercial-preview-card">
                      <strong>{recipient.name}</strong>
                      <p>{recipient.contactName || recipient.name}</p>
                      <span>{recipient.email}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--mnx-text-muted)]">
                    Choose one or more agents from the master list to prepare the send batch.
                  </p>
                )}
              </div>
            </div>

            {hasRateRequests ? (
            <div className="mnx-crm-commercial-history-shell">
              <div className="mnx-crm-commercial-history-heading">
                <div className="mnx-crm-commercial-sheet-copy">
                  <span className="mnx-crm-commercial-eyebrow">Phase 3</span>
                  <h3>Agent responses</h3>
                  <p>
                    Outbound requests are now synced against Gmail threads so replies, bounces, and
                    response timing stay visible in the enquiry commercial workflow.
                  </p>
                </div>
                <CrmButton
                  type="button"
                  variant="secondary"
                  size="compact"
                  onClick={handleSyncResponses}
                  disabled={isSyncingResponses || workflow.rateRequests.length === 0}
                >
                  {isSyncingResponses ? "Syncing..." : "Sync agent responses"}
                </CrmButton>
              </div>
              <div className="mnx-crm-commercial-response-table-shell">
                {workflow.rateRequests.length > 0 ? (
                  <table className="mnx-crm-commercial-response-table">
                    <thead>
                      <tr>
                        <th>Agent</th>
                        <th>Status</th>
                        <th>Sent</th>
                        <th>Opened</th>
                        <th>Replied</th>
                        <th>Response Time</th>
                        <th>Thread</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workflow.rateRequests.map((request) => (
                        <tr key={request.id}>
                          <td>
                            <div className="mnx-crm-commercial-table-agent">
                              <strong>{request.vendorName}</strong>
                              <span>{request.replyFromEmail || request.recipientEmail}</span>
                            </div>
                          </td>
                          <td>
                            <CrmStatus variant={getRequestStatusVariant(request.deliveryState)}>
                              {request.deliveryState}
                            </CrmStatus>
                          </td>
                          <td>{new Date(request.sentAt).toLocaleString("en-IN")}</td>
                          <td>
                            {request.opened ? (
                              request.lastOpenAt ? new Date(request.lastOpenAt).toLocaleString("en-IN") : "Opened"
                            ) : (
                              "Best-effort only"
                            )}
                          </td>
                          <td>
                            {request.replyTimestamp
                              ? new Date(request.replyTimestamp).toLocaleString("en-IN")
                              : request.replyStatus === "BOUNCED"
                                ? "Bounce detected"
                                : "Pending"}
                          </td>
                          <td>{formatResponseTime(request.sentAt, request.replyTimestamp)}</td>
                          <td>
                            <div className="mnx-crm-commercial-table-actions">
                              <CrmButton
                                type="button"
                                variant="secondary"
                                size="compact"
                                onClick={() => loadResponseIntoEditor(request.id)}
                              >
                                Capture rates
                              </CrmButton>
                              <CrmButton
                                type="button"
                                variant="secondary"
                                size="compact"
                                onClick={async () => {
                                  loadResponseIntoEditor(request.id);
                                  await handleParseAgentResponse(request.id);
                                }}
                                disabled={isParsingResponse || !request.threadId || request.replyStatus !== "REPLIED"}
                              >
                                {isParsingResponse && selectedResponseRequestId === request.id
                                  ? "Parsing..."
                                  : "Parse latest reply"}
                              </CrmButton>
                              {request.threadId ? (
                                <Link href={`/communication/mail?threadId=${encodeURIComponent(request.threadId)}`}>
                                  <CrmButton type="button" variant="secondary" size="compact">
                                    Open thread
                                  </CrmButton>
                                </Link>
                              ) : (
                                <span className="text-xs text-[var(--mnx-text-muted)]">No thread linked yet</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-[var(--mnx-text-muted)]">
                    No agent requests have been sent for this enquiry yet.
                  </p>
                )}
              </div>

              {workflow.rateRequests.length > 0 ? (
                <div className="mnx-crm-commercial-manual-shell">
                  <div className="mnx-crm-commercial-sheet-copy">
                    <span className="mnx-crm-commercial-eyebrow">Phase 5</span>
                    <h3>AI-assisted response capture</h3>
                    <p>
                      Parse the latest agent reply into a reviewable structured draft, then edit or
                      save it into the deterministic worksheet model. Manual entry remains the
                      fallback whenever the parser is uncertain.
                    </p>
                  </div>

                  <div className="mnx-crm-commercial-manual-grid">
                    <CrmField label="Agent request">
                      <CrmSelect
                        value={selectedResponseRequestId}
                        onChange={(event) => loadResponseIntoEditor(event.target.value)}
                      >
                        {workflow.rateRequests.map((request) => (
                          <option key={request.id} value={request.id}>
                            {request.vendorName} · {request.recipientEmail}
                          </option>
                        ))}
                      </CrmSelect>
                    </CrmField>
                    <CrmField label="Received at">
                      <CrmInput
                        type="datetime-local"
                        value={responseReceivedAt}
                        onChange={(event) => setResponseReceivedAt(event.target.value)}
                      />
                    </CrmField>
                    <CrmField label="Response currency">
                      <CrmInput
                        value={responseCurrency}
                        onChange={(event) => setResponseCurrency(event.target.value.toUpperCase())}
                        placeholder="INR"
                      />
                    </CrmField>
                    <CrmField label="Validity">
                      <CrmInput
                        value={responseValidity}
                        onChange={(event) => setResponseValidity(event.target.value)}
                        placeholder="Example: 15 days from quote date"
                      />
                    </CrmField>
                    <CrmField label="Carrier">
                      <CrmInput
                        value={responseCarrier}
                        onChange={(event) => setResponseCarrier(event.target.value)}
                        placeholder="Optional carrier"
                      />
                    </CrmField>
                    <CrmField label="Routing">
                      <CrmInput
                        value={responseRouting}
                        onChange={(event) => setResponseRouting(event.target.value)}
                        placeholder="Optional routing"
                      />
                    </CrmField>
                    <CrmField label="Transit">
                      <CrmInput
                        value={responseTransit}
                        onChange={(event) => setResponseTransit(event.target.value)}
                        placeholder="Optional transit"
                      />
                    </CrmField>
                    <CrmField label="Remarks">
                      <CrmTextarea
                        rows={3}
                        value={responseRemarks}
                        onChange={(event) => setResponseRemarks(event.target.value)}
                        placeholder="Optional response remarks"
                      />
                    </CrmField>
                  </div>

                  {parsedResponseMeta ? (
                    <div className="mnx-crm-commercial-parser-summary">
                      <div className="mnx-crm-commercial-parser-summary-head">
                        <div className="flex flex-wrap items-center gap-2">
                          <CrmStatus
                            variant={
                              parsedResponseMeta.parserStatus === "AUTO_MAPPED"
                                ? "success"
                                : "warning"
                            }
                          >
                            {parsedResponseMeta.parserStatus === "AUTO_MAPPED"
                              ? "AI auto-mapped"
                              : "AI review required"}
                          </CrmStatus>
                          {parsedResponseMeta.overallConfidence !== null ? (
                            <span className="text-xs text-[var(--mnx-text-muted)]">
                              Confidence {(parsedResponseMeta.overallConfidence * 100).toFixed(0)}%
                            </span>
                          ) : null}
                          {parsedResponseMeta.parserModel ? (
                            <span className="text-xs text-[var(--mnx-text-muted)]">
                              {parsedResponseMeta.parserModel}
                            </span>
                          ) : null}
                          {parsedResponseMeta.standardRateSignal ? (
                            <CrmStatus
                              variant={getStandardSignalVariant(parsedResponseMeta.standardRateSignal)}
                            >
                              {getStandardSignalCopy(parsedResponseMeta.standardRateSignal)}
                            </CrmStatus>
                          ) : null}
                        </div>
                        <CrmButton
                          type="button"
                          variant="secondary"
                          size="compact"
                          onClick={() => {
                            void handleParseAgentResponse();
                          }}
                          disabled={isParsingResponse || !selectedResponseRequestId}
                        >
                          {isParsingResponse ? "Parsing latest reply..." : "Re-parse latest reply"}
                        </CrmButton>
                      </div>
                      <p className="text-sm text-[var(--mnx-text-muted)]">
                        Evidence sources:{" "}
                        {parsedResponseMeta.sources.length > 0
                          ? parsedResponseMeta.sources.map((source) => source.name).join(", ")
                          : "Email body only"}
                      </p>
                      {parsedResponseMeta.standardRateSignal ? (
                        <p className="text-sm text-[var(--mnx-text-muted)]">
                          Standard buy-rate master support is attached as a reference where matched.
                          Explicit agent amounts continue to override the standard rate.
                        </p>
                      ) : null}
                      {parsedResponseMeta.warnings.length > 0 ? (
                        <div className="mnx-crm-commercial-parser-warning-list">
                          {parsedResponseMeta.warnings.map((warning) => (
                            <p key={warning}>{warning}</p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mnx-crm-commercial-parser-summary">
                      <div className="mnx-crm-commercial-parser-summary-head">
                        <p className="text-sm text-[var(--mnx-text-muted)]">
                          Use `Parse latest reply` to draft rates from the newest Gmail response,
                          or enter them manually if you prefer.
                        </p>
                        <CrmButton
                          type="button"
                          variant="secondary"
                          size="compact"
                          onClick={() => {
                            void handleParseAgentResponse();
                          }}
                          disabled={isParsingResponse || !selectedResponseRequestId}
                        >
                          {isParsingResponse ? "Parsing latest reply..." : "Parse latest reply"}
                        </CrmButton>
                      </div>
                    </div>
                  )}

                  <div className="mnx-crm-commercial-lines-shell">
                    <div className="mnx-crm-commercial-lines-header">
                      <strong>Rate lines</strong>
                      <CrmButton type="button" variant="secondary" size="compact" onClick={addResponseLine}>
                        Add rate line
                      </CrmButton>
                    </div>

                    <div className="mnx-crm-commercial-lines-list">
                      {responseLines.map((line, index) => (
                        <div key={line.id} className="mnx-crm-commercial-line-card">
                          <div className="mnx-crm-commercial-line-card-header">
                            <strong>Line {index + 1}</strong>
                            <CrmButton
                              type="button"
                              variant="secondary"
                              size="compact"
                              onClick={() => removeResponseLine(line.id)}
                            >
                              Remove
                            </CrmButton>
                          </div>
                          <div className="mnx-crm-commercial-line-grid">
                            <CrmField label="Original description">
                              <CrmInput
                                value={line.originalDescription}
                                onChange={(event) => {
                                  const nextValue = event.target.value;
                                  updateResponseLine(line.id, (current) => ({
                                    ...current,
                                    originalDescription: nextValue,
                                  }));
                                  applyCanonicalSuggestion(line.id, nextValue);
                                }}
                                placeholder="Example: Terminal Handling Fee"
                              />
                            </CrmField>
                            <CrmField label="Canonical charge">
                              <CrmSelect
                                value={line.canonicalChargeCode}
                                onChange={(event) => {
                                  const selectedOption =
                                    canonicalChargeOptions.find(
                                      (option) => option.code === event.target.value,
                                    ) ?? null;
                                  updateResponseLine(line.id, (current) => ({
                                    ...current,
                                    canonicalChargeCode: event.target.value,
                                    canonicalChargeName:
                                      selectedOption?.name || current.canonicalChargeName,
                                  }));
                                }}
                              >
                                <option value="">Choose canonical charge</option>
                                {canonicalChargeOptions.map((option) => (
                                  <option key={option.code} value={option.code}>
                                    {option.name}
                                  </option>
                                ))}
                              </CrmSelect>
                            </CrmField>
                            <CrmField label="Amount">
                              <CrmInput
                                type="number"
                                value={line.amount}
                                onChange={(event) =>
                                  updateResponseLine(line.id, (current) => ({
                                    ...current,
                                    amount: Number(event.target.value || 0),
                                    amountMissing: false,
                                  }))
                                }
                              />
                            </CrmField>
                            <CrmField label="Currency">
                              <CrmInput
                                value={line.currency}
                                onChange={(event) =>
                                  updateResponseLine(line.id, (current) => ({
                                    ...current,
                                    currency: event.target.value.toUpperCase(),
                                  }))
                                }
                              />
                            </CrmField>
                            <CrmField label="Unit">
                              <CrmInput
                                value={line.unit}
                                onChange={(event) =>
                                  updateResponseLine(line.id, (current) => ({
                                    ...current,
                                    unit: event.target.value,
                                  }))
                                }
                                placeholder="BL / Container / Kg"
                              />
                            </CrmField>
                            <CrmField label="Quantity basis">
                              <CrmInput
                                value={line.quantityBasis}
                                onChange={(event) =>
                                  updateResponseLine(line.id, (current) => ({
                                    ...current,
                                    quantityBasis: event.target.value,
                                  }))
                                }
                              />
                            </CrmField>
                            <CrmField label="Quantity / container">
                              <CrmInput
                                value={
                                  [line.quantityText || "", line.containerText || ""]
                                    .filter(Boolean)
                                    .join(" · ")
                                }
                                onChange={(event) =>
                                  updateResponseLine(line.id, (current) => ({
                                    ...current,
                                    quantityText: event.target.value,
                                  }))
                                }
                                placeholder="Example: 1 container · 40HC"
                              />
                            </CrmField>
                            <CrmField label="Minimum">
                              <CrmInput
                                value={line.minimumCharge || ""}
                                onChange={(event) =>
                                  updateResponseLine(line.id, (current) => ({
                                    ...current,
                                    minimumCharge: event.target.value,
                                  }))
                                }
                              />
                            </CrmField>
                            <CrmField label="Tax">
                              <CrmInput
                                value={line.taxText || ""}
                                onChange={(event) =>
                                  updateResponseLine(line.id, (current) => ({
                                    ...current,
                                    taxText: event.target.value,
                                  }))
                                }
                              />
                            </CrmField>
                            <CrmField label="Free days">
                              <CrmInput
                                value={line.freeDaysText || ""}
                                onChange={(event) =>
                                  updateResponseLine(line.id, (current) => ({
                                    ...current,
                                    freeDaysText: event.target.value,
                                  }))
                                }
                              />
                            </CrmField>
                            <CrmField label="Included / excluded">
                              <CrmSelect
                                value={line.inclusionStatus}
                                onChange={(event) =>
                                  updateResponseLine(line.id, (current) => ({
                                    ...current,
                                    inclusionStatus: event.target.value as ResponseLineDraft["inclusionStatus"],
                                  }))
                                }
                              >
                                <option value="UNSPECIFIED">Unspecified</option>
                                <option value="INCLUDED">Included</option>
                                <option value="EXCLUDED">Excluded</option>
                              </CrmSelect>
                            </CrmField>
                            <CrmField label="Notes">
                              <CrmInput
                                value={line.notes || ""}
                                onChange={(event) =>
                                  updateResponseLine(line.id, (current) => ({
                                    ...current,
                                    notes: event.target.value,
                                  }))
                                }
                              />
                            </CrmField>
                          </div>

                          <div className="mnx-crm-commercial-line-evidence">
                            <div className="flex flex-wrap items-center gap-2">
                              {line.confidenceLabel ? (
                                <CrmStatus
                                  variant={
                                    line.confidenceLabel === "HIGH"
                                      ? "success"
                                      : line.confidenceLabel === "MEDIUM"
                                        ? "accent"
                                        : "warning"
                                  }
                                >
                                  {line.confidenceLabel} confidence
                                </CrmStatus>
                              ) : null}
                              <span className="text-xs text-[var(--mnx-text-muted)]">
                                Review state: {line.reviewStatus.replace(/_/g, " ").toLowerCase()}
                              </span>
                              {line.amountMissing ? (
                                <span className="text-xs text-[var(--mnx-text-muted)]">
                                  Amount: Not Provided
                                </span>
                              ) : null}
                            </div>
                            {line.missingFields.length > 0 ? (
                              <p className="text-xs text-[var(--mnx-text-muted)]">
                                Missing: {line.missingFields.join(", ")}
                              </p>
                            ) : null}
                            {line.evidence.length > 0 ? (
                              <div className="mnx-crm-commercial-line-evidence-list">
                                {line.evidence.map((evidence, evidenceIndex) => (
                                  <p key={`${line.id}-evidence-${evidenceIndex}`}>
                                    {evidence.sourceName}: {evidence.excerpt}
                                  </p>
                                ))}
                              </div>
                            ) : null}
                            {line.standardRateReference ? (
                              <div className="mnx-crm-commercial-standard-reference">
                                <div className="mnx-crm-commercial-standard-reference-head">
                                  <strong>Standard master reference</strong>
                                  <CrmStatus
                                    variant={
                                      line.standardRateReference.explicitAgentOverride
                                        ? "warning"
                                        : "success"
                                    }
                                  >
                                    {line.standardRateReference.explicitAgentOverride
                                      ? "Explicit agent amount kept"
                                      : "Standard rate applied"}
                                  </CrmStatus>
                                </div>
                                <p>
                                  {line.standardRateReference.canonicalChargeName}:{" "}
                                  {line.standardRateReference.currency}{" "}
                                  {line.standardRateReference.rate} /{" "}
                                  {line.standardRateReference.unit}
                                  {line.standardRateReference.containerType
                                    ? ` · ${line.standardRateReference.containerType}`
                                    : ""}
                                </p>
                                <p>
                                  Trigger: {getStandardSignalCopy(line.standardRateReference.appliedReason)}
                                  {line.standardRateReference.revision
                                    ? ` · Revision ${line.standardRateReference.revision}`
                                    : ""}
                                  {line.standardRateReference.effectiveFrom
                                    ? ` · Effective ${line.standardRateReference.effectiveFrom}`
                                    : ""}
                                  {line.standardRateReference.effectiveTo
                                    ? ` to ${line.standardRateReference.effectiveTo}`
                                    : ""}
                                </p>
                                <p>
                                  Source: {line.standardRateReference.sourceDocument} -{" "}
                                  {line.standardRateReference.sourceExcerpt}
                                </p>
                              </div>
                            ) : null}
                          </div>

                          <label className="mnx-crm-commercial-alias-toggle">
                            {/* eslint-disable-next-line no-restricted-syntax -- This is an intentional confirmation checkbox for alias persistence. */}
                            <input
                              type="checkbox"
                              checked={line.saveAlias}
                              onChange={(event) =>
                                updateResponseLine(line.id, (current) => ({
                                  ...current,
                                  saveAlias: event.target.checked,
                                }))
                              }
                            />
                            <span>Confirm this external charge name as a reusable alias</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mnx-crm-commercial-manual-footer">
                    <div className="mnx-crm-commercial-sheet-footer-copy">
                      <p>
                        {selectedSavedResponse
                          ? `A saved structured response already exists for ${selectedSavedResponse.vendorName}. Saving again updates that stored response.`
                          : selectedResponseRequest
                            ? `Review and save the structured response for ${selectedResponseRequest.vendorName}.`
                            : "Choose an agent request to start manual structured response capture."}
                      </p>
                    </div>
                    <CrmButton
                      type="button"
                      onClick={handleSaveAgentResponse}
                      disabled={isSavingResponse || !selectedResponseRequestId}
                    >
                      {isSavingResponse ? "Saving response..." : "Save structured response"}
                    </CrmButton>
                  </div>
                </div>
              ) : null}
            </div>
            ) : (
              <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)]/40 bg-[var(--mnx-surface)] px-4 py-4 text-sm text-[var(--mnx-text-muted)]">
                Send the first rate-request email to unlock reply tracking, structured response
                capture, and the later comparison stages.
              </div>
            )}

              {hasStructuredResponses ? (
                <div className="mnx-crm-commercial-comparison-shell">
                  <div className="mnx-crm-commercial-history-heading">
                    <div className="mnx-crm-commercial-sheet-copy">
                      <span className="mnx-crm-commercial-eyebrow">Phase 7</span>
                      <h3>Rate comparison workspace</h3>
                      <p>
                        Deterministic comparison now normalizes comparable buy-rate lines, flags
                        risky gaps, and recommends either a whole agent or a mixed charge
                        selection without letting incomplete replies look artificially cheaper.
                      </p>
                    </div>
                    <div className="mnx-crm-commercial-comparison-actions">
                      <CrmField label="Selection mode">
                        <CrmSelect
                          value={comparisonMode}
                          onChange={(event) =>
                            setComparisonMode(event.target.value as RateComparisonSelectionMode)
                          }
                        >
                          <option value="ENTIRE_AGENT">Select entire agent</option>
                          <option value="PER_CHARGE">Select per charge</option>
                        </CrmSelect>
                      </CrmField>
                      <CrmButton type="button" variant="secondary" size="compact" onClick={applyRecommendedWholeAgent}>
                        Apply recommended agent
                      </CrmButton>
                      <CrmButton type="button" variant="secondary" size="compact" onClick={applyRecommendedChargeMix}>
                        Apply recommended mix
                      </CrmButton>
                      <CrmButton
                        type="button"
                        size="compact"
                        onClick={handleSaveComparisonSelection}
                        disabled={isSavingComparison}
                      >
                        {isSavingComparison ? "Saving comparison..." : "Save comparison choice"}
                      </CrmButton>
                    </div>
                  </div>

                  <div className="mnx-crm-commercial-comparison-summary">
                    <div>
                      <span>Base currency</span>
                      <strong>{comparisonWorkspace.baseCurrency}</strong>
                    </div>
                    <div>
                      <span>Whole-agent recommendation</span>
                      <strong>
                        {comparisonWorkspace.recommendedEntireAgentResponseId
                          ? comparisonWorkspace.agentSummaries.find(
                              (entry) =>
                                entry.responseId ===
                                comparisonWorkspace.recommendedEntireAgentResponseId,
                            )?.vendorName || "Recommended"
                          : "Review required"}
                      </strong>
                    </div>
                    <div>
                      <span>Mixed landed buy cost</span>
                      <strong>
                        {formatCurrencyAmount(
                          comparisonWorkspace.recommendedMixedTotalInBaseCurrency,
                          comparisonWorkspace.baseCurrency,
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>Per-charge selections</span>
                      <strong>{selectedChargeCount}</strong>
                    </div>
                  </div>

                  <div className="mnx-crm-commercial-agent-grid">
                    {comparisonWorkspace.agentSummaries.map((summary) => (
                      <CrmPanel key={summary.responseId} className="mnx-crm-commercial-agent-card">
                        <div className="mnx-crm-commercial-agent-card-head">
                          <strong>{summary.vendorName}</strong>
                          <CrmStatus
                            variant={
                              summary.eligibleForRecommendation ? "success" : "warning"
                            }
                          >
                            {summary.eligibleForRecommendation
                              ? "Comparable"
                              : "Needs review"}
                          </CrmStatus>
                        </div>
                        <p>
                          Landed buy cost:{" "}
                          {formatCurrencyAmount(
                            summary.comparableTotalInBaseCurrency,
                            comparisonWorkspace.baseCurrency,
                          )}
                        </p>
                        <p>
                          Mandatory covered: {summary.coveredMandatoryCharges} · Missing:{" "}
                          {summary.missingMandatoryCharges}
                        </p>
                        <p>Issue count: {summary.issueCount}</p>
                        <div className="mnx-crm-commercial-agent-card-actions">
                          <CrmButton
                            type="button"
                            variant="secondary"
                            size="compact"
                            onClick={() => {
                              setComparisonMode("ENTIRE_AGENT");
                              setSelectedComparisonResponseId(summary.responseId);
                            }}
                          >
                            {selectedComparisonResponseId === summary.responseId &&
                            comparisonMode === "ENTIRE_AGENT"
                              ? "Selected agent"
                              : "Select this agent"}
                          </CrmButton>
                          {comparisonWorkspace.recommendedEntireAgentResponseId === summary.responseId ? (
                            <CrmStatus variant="accent">Recommended</CrmStatus>
                          ) : null}
                        </div>
                      </CrmPanel>
                    ))}
                  </div>

                  <div className="mnx-crm-commercial-comparison-table-shell">
                    <table className="mnx-crm-commercial-comparison-table">
                      <thead>
                        <tr>
                          <th>Charge</th>
                          {comparisonWorkspace.responses.map((response) => (
                            <th key={response.id}>{response.vendorName}</th>
                          ))}
                          <th>Best</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonWorkspace.chargeRows.map((row) => (
                          <tr key={row.chargeCode}>
                            <td>
                              <div className="mnx-crm-commercial-comparison-charge">
                                <strong>{row.chargeName}</strong>
                                <span>
                                  {row.department === "FREIGHT_FORWARDING"
                                    ? "Freight forwarding"
                                    : "Customs clearance"}{" "}
                                  · {row.unitOptions.join(", ")}
                                </span>
                                <span>{row.mandatory ? "Mandatory" : "Optional"}</span>
                                {row.rowIssues.map((issue) => (
                                  <small key={`${row.chargeCode}-${issue.code}`}>{issue.message}</small>
                                ))}
                              </div>
                            </td>
                            {row.cells.map((cell) => (
                              <td key={`${row.chargeCode}-${cell.responseId}`}>
                                {/* eslint-disable-next-line no-restricted-syntax -- This is an intentional custom comparison-cell button, not a generic shared button primitive. */}
                                <button
                                  type="button"
                                  className={`mnx-crm-commercial-comparison-cell${
                                    cell.isSelected ? " is-selected" : ""
                                  }`}
                                  onClick={() => {
                                    if (comparisonMode !== "PER_CHARGE") return;
                                    setSelectedChargeResponseMap((current) => ({
                                      ...current,
                                      [row.chargeCode]: cell.responseId,
                                    }));
                                  }}
                                  disabled={comparisonMode !== "PER_CHARGE"}
                                >
                                  <strong>
                                    {formatCurrencyAmount(
                                      cell.computedAmountInBaseCurrency,
                                      comparisonWorkspace.baseCurrency,
                                    )}
                                  </strong>
                                  <span>
                                    {cell.originalAmount !== null
                                      ? `${cell.originalCurrency} ${cell.originalAmount} / ${cell.originalUnit}`
                                      : "No charge line"}
                                  </span>
                                  {cell.quantityMultiplier ? (
                                    <span>Qty basis: {cell.quantityMultiplier}</span>
                                  ) : null}
                                  {cell.issues.length > 0 ? (
                                    <span>{cell.issues[0]?.message}</span>
                                  ) : (
                                    <span>
                                      {cell.comparable ? "Comparable" : "Review required"}
                                    </span>
                                  )}
                                </button>
                              </td>
                            ))}
                            <td>
                              {row.bestResponseId ? (
                                <div className="mnx-crm-commercial-comparison-best">
                                  <strong>
                                    {comparisonWorkspace.responses.find(
                                      (response) => response.id === row.bestResponseId,
                                    )?.vendorName || "Best option"}
                                  </strong>
                                  <span>
                                    {formatCurrencyAmount(
                                      row.bestAmountInBaseCurrency,
                                      comparisonWorkspace.baseCurrency,
                                    )}
                                  </span>
                                </div>
                              ) : (
                                <div className="mnx-crm-commercial-comparison-best">
                                  <strong>Review required</strong>
                                  <span>Missing or non-comparable mandatory data</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mnx-crm-commercial-recommendation-panel">
                    <div className="mnx-crm-commercial-recommendation-header">
                      <div className="mnx-crm-commercial-sheet-copy">
                        <span className="mnx-crm-commercial-eyebrow">Phase 9</span>
                        <h3>Best-rate recommendation</h3>
                        <p>
                          This recommendation layer combines normalized landed buy cost with the
                          existing historical agent-intelligence signals before buy-rate
                          finalization unlocks later phases.
                        </p>
                      </div>
                      <div className="mnx-crm-commercial-recommendation-actions">
                        <CrmButton
                          type="button"
                          variant="secondary"
                          size="compact"
                          onClick={handleGenerateRecommendation}
                          disabled={isGeneratingRecommendation || comparisonWorkspace.responses.length === 0}
                        >
                          {isGeneratingRecommendation
                            ? "Generating..."
                            : workflow.rateRecommendation
                              ? "Refresh recommendation"
                              : "Generate recommendation"}
                        </CrmButton>
                      </div>
                    </div>

                    {workflow.rateRecommendation ? (
                      <div className="mnx-crm-commercial-recommendation-body">
                        <div className="mnx-crm-commercial-recommendation-summary">
                          <div className="mnx-crm-commercial-recommendation-badges">
                            <CrmStatus variant="accent">
                              {workflow.rateRecommendation.recommendedMode === "ENTIRE_AGENT"
                                ? "Whole-agent recommendation"
                                : "Per-charge recommendation"}
                            </CrmStatus>
                            <CrmStatus variant="success">
                              {workflow.rateRecommendation.strategy === "AI_ASSISTED"
                                ? "AI-assisted"
                                : "Weighted recommendation"}
                            </CrmStatus>
                            {workflow.rateRecommendation.decision.status !== "PENDING" ? (
                              <CrmStatus
                                variant={
                                  workflow.rateRecommendation.decision.status === "ACCEPTED"
                                    ? "success"
                                    : "warning"
                                }
                              >
                                {workflow.rateRecommendation.decision.status === "ACCEPTED"
                                  ? "Accepted"
                                  : "Overridden"}
                              </CrmStatus>
                            ) : null}
                          </div>
                          <p>{workflow.rateRecommendation.explanation}</p>
                          <div className="mnx-crm-commercial-recommendation-meta">
                            <span>
                              Estimated landed total:{" "}
                              {formatCurrencyAmount(
                                workflow.rateRecommendation.recommendedTotalInBaseCurrency,
                                comparisonWorkspace.baseCurrency,
                              )}
                            </span>
                            <span>
                              Generated{" "}
                              {new Date(workflow.rateRecommendation.generatedAt).toLocaleString(
                                "en-IN",
                              )}
                            </span>
                            <span>Model: {workflow.rateRecommendation.model}</span>
                          </div>
                        </div>

                        <div className="mnx-crm-commercial-recommendation-reasons">
                          {workflow.rateRecommendation.reasons.map((reason) => (
                            <div
                              key={`${reason.label}-${reason.detail}`}
                              className="mnx-crm-commercial-recommendation-reason"
                            >
                              <strong>{reason.label}</strong>
                              <p>{reason.detail}</p>
                            </div>
                          ))}
                        </div>

                        <div className="mnx-crm-commercial-recommendation-decision">
                          <div className="mnx-crm-commercial-recommendation-decision-copy">
                            <strong>Decision capture</strong>
                            <p>
                              Accept the recommendation as-is, or override it using the current
                              comparison selection and capture why the human decision differs.
                            </p>
                          </div>
                          <div className="mnx-crm-commercial-recommendation-decision-controls">
                            <CrmButton
                              type="button"
                              size="compact"
                              onClick={handleAcceptRecommendation}
                              disabled={isSavingRecommendationDecision}
                            >
                              {isSavingRecommendationDecision
                                ? "Saving..."
                                : "Accept recommendation"}
                            </CrmButton>
                            <CrmField label="Override reason">
                              <CrmSelect
                                value={overrideReason}
                                onChange={(event) => setOverrideReason(event.target.value)}
                                disabled={isSavingRecommendationDecision}
                              >
                                <option value="">Optional reason</option>
                                {OVERRIDE_REASON_OPTIONS.map((reason) => (
                                  <option key={reason} value={reason}>
                                    {reason}
                                  </option>
                                ))}
                              </CrmSelect>
                            </CrmField>
                            <CrmField label="Override note">
                              <CrmTextarea
                                value={overrideNote}
                                onChange={(event) => setOverrideNote(event.target.value)}
                                placeholder="Example: customer requested a preferred carrier despite the cheaper mixed option."
                                rows={3}
                                disabled={isSavingRecommendationDecision}
                              />
                            </CrmField>
                            <CrmButton
                              type="button"
                              variant="secondary"
                              size="compact"
                              onClick={handleOverrideRecommendation}
                              disabled={isSavingRecommendationDecision}
                            >
                              {isSavingRecommendationDecision
                                ? "Saving..."
                                : "Override with current selection"}
                            </CrmButton>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mnx-crm-commercial-recommendation-empty">
                        <CrmStatus variant="warning">Recommendation pending</CrmStatus>
                        <p>
                          Generate the best-rate recommendation after at least one comparable
                          agent response is available.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mnx-crm-commercial-recommendation-panel">
                    <div className="mnx-crm-commercial-recommendation-header">
                      <div className="mnx-crm-commercial-sheet-copy">
                        <span className="mnx-crm-commercial-eyebrow">Phase 10</span>
                        <h3>Finalize buy rates</h3>
                        <p>
                          Create an immutable buy-rate snapshot from the accepted or overridden
                          recommendation decision. Each finalization writes a new revision and
                          unlocks costing for the next phase.
                        </p>
                      </div>
                      <div className="mnx-crm-commercial-recommendation-actions">
                        <CrmStatus variant={workflow.costingLocked ? "warning" : "success"}>
                          {workflow.costingLocked ? "Costing locked" : "Costing unlocked"}
                        </CrmStatus>
                      </div>
                    </div>

                    <div className="mnx-crm-commercial-recommendation-summary">
                      <div className="mnx-crm-commercial-recommendation-badges">
                        <CrmStatus
                          variant={
                            workflow.rateRecommendation?.decision.status === "PENDING"
                              ? "warning"
                              : "success"
                          }
                        >
                          {workflow.rateRecommendation?.decision.status === "PENDING"
                            ? "Decision required"
                            : workflow.rateRecommendation?.decision.status === "OVERRIDDEN"
                              ? "Override recorded"
                              : "Recommendation accepted"}
                        </CrmStatus>
                        {currentFinalizedVersion ? (
                          <CrmStatus variant="accent">
                            Current version {currentFinalizedVersion.versionLabel}
                          </CrmStatus>
                        ) : null}
                      </div>
                      <p>
                        {workflow.rateRecommendation?.decision.status === "PENDING"
                          ? "Accept or override the recommendation before finalizing a buy-rate snapshot."
                          : currentFinalizedVersion
                            ? `Latest finalized buy-rate total: ${formatCurrencyAmount(
                                currentFinalizedVersion.totalInBaseCurrency,
                                currentFinalizedVersion.baseCurrency,
                              )}`
                            : "No finalized buy-rate version exists yet."}
                      </p>
                      <div className="mnx-crm-commercial-recommendation-meta">
                        <span>Stored versions: {workflow.finalizedBuyRateVersions.length}</span>
                        <span>
                          Current decision:{" "}
                          {workflow.rateRecommendation?.decision.status ?? "No recommendation yet"}
                        </span>
                      </div>
                    </div>

                    <div className="mnx-crm-commercial-recommendation-decision">
                      <div className="mnx-crm-commercial-recommendation-decision-copy">
                        <strong>Snapshot controls</strong>
                        <p>
                          Finalizing again creates a new revision such as `R2` or `R3`; existing
                          buy-rate history remains intact.
                        </p>
                      </div>
                      <div className="mnx-crm-commercial-recommendation-decision-controls">
                        <CrmField label="Revision note">
                          <CrmTextarea
                            value={finalizationNote}
                            onChange={(event) => setFinalizationNote(event.target.value)}
                            placeholder="Optional note about why this revision was finalized."
                            rows={3}
                            disabled={isFinalizingBuyRates}
                          />
                        </CrmField>
                        <CrmButton
                          type="button"
                          size="compact"
                          onClick={handleFinalizeBuyRates}
                          disabled={
                            isFinalizingBuyRates ||
                            workflow.rateRecommendation?.decision.status === "PENDING" ||
                            !workflow.rateRecommendation
                          }
                        >
                          {isFinalizingBuyRates
                            ? "Finalizing..."
                            : workflow.finalizedBuyRateVersions.length > 0
                              ? "Finalize new revision"
                              : "Finalize buy rates"}
                        </CrmButton>
                      </div>
                    </div>

                    {workflow.finalizedBuyRateVersions.length > 0 ? (
                      <div className="mnx-crm-commercial-recommendation-reasons">
                        {[...workflow.finalizedBuyRateVersions]
                          .slice()
                          .reverse()
                          .map((version) => (
                            <div
                              key={version.id}
                              className="mnx-crm-commercial-recommendation-reason"
                            >
                              <strong>
                                {version.versionLabel} ·{" "}
                                {formatCurrencyAmount(
                                  version.totalInBaseCurrency,
                                  version.baseCurrency,
                                )}
                              </strong>
                              <p>
                                {version.selectedMode === "ENTIRE_AGENT"
                                  ? "Whole-agent snapshot"
                                  : "Per-charge snapshot"}{" "}
                                · {version.lines.length} line(s) ·{" "}
                                {new Date(version.createdAt).toLocaleString("en-IN")}
                              </p>
                              {version.notes ? <p>{version.notes}</p> : null}
                            </div>
                          ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : hasRateRequests ? (
                <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)]/40 bg-[var(--mnx-surface)] px-4 py-4 text-sm text-[var(--mnx-text-muted)]">
                  Save at least one structured agent response to unlock comparison, recommendation,
                  and buy-rate finalization.
                </div>
              ) : null}
          </CrmPanel>

          {hasRateRequests && !canEditActiveTab ? (
            <CrmPanel className="border-[var(--mnx-warning)]/30 bg-[var(--mnx-warning-bg)]/30 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <CrmStatus variant="warning">Restricted entry</CrmStatus>
                <p className="text-sm text-[var(--mnx-text-muted)]">
                  Only the {TEAM_LABELS[serviceType as TabKey]} can enter{" "}
                  {formatDepartmentName(activeTab)} charges from this queue.
                </p>
              </div>
            </CrmPanel>
          ) : null}

          {hasRateRequests ? (
          <CrmPanel className="mnx-crm-panel-surface mnx-crm-commercial-sheet">
            <div className="mnx-crm-commercial-sheet-header">
              <div className="mnx-crm-commercial-sheet-copy">
                <span className="mnx-crm-commercial-eyebrow">Worksheet control</span>
                <h3>{TAB_LABELS[activeTab]}</h3>
                <p>
                  Dynamic charges for this department are generated from the enquiry scenario and
                  can be extended with additional commercial lines when the standard catalogue is
                  not enough.
                </p>
              </div>
              <div className="mnx-crm-commercial-sheet-status">
                <CrmStatus
                  variant={departmentHasSubmittedRates(workflow, activeTab) ? "success" : "warning"}
                >
                  {departmentHasSubmittedRates(workflow, activeTab)
                    ? "Charges submitted"
                    : "Charges pending"}
                </CrmStatus>
                {activeSubmitted ? (
                  <span>Last updated {new Date(activeSubmitted).toLocaleString("en-IN")}</span>
                ) : null}
              </div>
            </div>

            <CrmTabs className="mnx-crm-commercial-tabs">
              {(["FREIGHT_FORWARDING", "CUSTOMS_CLEARANCE"] as const).map((tab) => (
                <CrmButton
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  variant={activeTab === tab ? "primary" : "secondary"}
                  size="compact"
                >
                  {TAB_LABELS[tab]}
                </CrmButton>
              ))}
            </CrmTabs>

            <div className="mnx-crm-commercial-charge-list">
              {activeCharges.map((charge, index) => (
                <div key={charge.id} className="mnx-crm-commercial-charge-row">
                  <div className="mnx-crm-commercial-charge-copy">
                    <div className="mnx-crm-commercial-charge-title">
                      <strong>{charge.name}</strong>
                      {charge.mandatory ? (
                        <CrmStatus variant="warning">Mandatory</CrmStatus>
                      ) : null}
                      {charge.source === "ADDITIONAL" ? (
                        <CrmStatus variant="accent">Additional</CrmStatus>
                      ) : null}
                    </div>
                    <p>
                      Code {charge.code} · Unit {getChargeUnitLabel(charge.unit)}
                    </p>
                  </div>
                  <div className="mnx-crm-commercial-charge-amount">
                    <label htmlFor={`${activeTab}-${charge.code}-${index}`}>Amount</label>
                    <CrmInput
                      id={`${activeTab}-${charge.code}-${index}`}
                      type="number"
                      value={charge.amount}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value || 0);
                        updateDepartmentCharges(activeTab, (current) =>
                          current.map((entry) =>
                            entry.id === charge.id ? { ...entry, amount: nextValue } : entry,
                          ),
                        );
                      }}
                      disabled={!canEditActiveTab}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mnx-crm-commercial-additional-shell">
              <div className="mnx-crm-commercial-additional-copy">
                <strong>Add additional charge</strong>
                <p>
                  Use this for non-standard commercial lines. Additional charges stay preserved as
                  the enquiry details evolve.
                </p>
              </div>
              <div className="mnx-crm-commercial-additional-grid">
                <CrmField label="Charge name">
                  <CrmInput
                    value={additionalChargeName}
                    onChange={(event) => setAdditionalChargeName(event.target.value)}
                    placeholder="Example: Handling surcharge"
                    disabled={!canEditActiveTab}
                  />
                </CrmField>
                <CrmField label="Unit">
                  <CrmSelect
                    value={additionalChargeUnit}
                    onChange={(event) => setAdditionalChargeUnit(event.target.value as ChargeUnit)}
                    disabled={!canEditActiveTab}
                  >
                    {UNIT_OPTIONS.map((unit) => (
                      <option key={unit} value={unit}>
                        {getChargeUnitLabel(unit)}
                      </option>
                    ))}
                  </CrmSelect>
                </CrmField>
                <div className="mnx-crm-commercial-additional-actions">
                  <CrmButton
                    type="button"
                    variant="secondary"
                    size="compact"
                    onClick={handleAddAdditionalCharge}
                    disabled={!canEditActiveTab}
                  >
                    Add additional charge
                  </CrmButton>
                  <span>{activeAdditionalCharges.length} additional charge(s)</span>
                </div>
              </div>
            </div>

            <div className="mnx-crm-commercial-sheet-footer">
              <div className="mnx-crm-commercial-sheet-footer-copy">
                {hasUnquotedChangesForActiveTab ? (
                  <p className="mnx-crm-commercial-warning">
                    New or changed {formatDepartmentName(activeTab)} charges are not included in
                    the latest quote version yet.
                  </p>
                ) : (
                  <p>
                    Save this worksheet to persist the current commercial charge foundation for the
                    active department.
                  </p>
                )}
              </div>
              <CrmButton
                type="button"
                onClick={() => handleSave(activeTab)}
                disabled={isSaving || !canEditActiveTab}
              >
                {isSaving ? "Saving..." : "Save department charges"}
              </CrmButton>
            </div>
          </CrmPanel>
          ) : null}

          {hasFinalizedBuyRates ? (
          <CrmPanel className="mnx-crm-panel-surface mnx-crm-commercial-compat">
            <div className="mnx-crm-commercial-sheet-header">
              <div className="mnx-crm-commercial-sheet-copy">
                <span className="mnx-crm-commercial-eyebrow">Phase 11</span>
                <h3>Pricing worksheet</h3>
                <p>
                  Build sell rates from the current finalized buy-rate revision, review margin
                  impact, save the pricing snapshot, and then seed the quotation form from that
                  stored worksheet.
                </p>
              </div>
              {workflow.latestQuoteVersion ? (
                <CrmStatus variant="accent">
                  Latest quotation version V{workflow.latestQuoteVersion}
                </CrmStatus>
              ) : (
                <CrmStatus variant={workflow.pricingSnapshot ? "success" : "warning"}>
                  {workflow.pricingSnapshot ? "Pricing snapshot saved" : "Pricing snapshot pending"}
                </CrmStatus>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {currentFinalizedVersion ? (
                  <CrmStatus variant="accent">
                    Finalized source {currentFinalizedVersion.versionLabel}
                  </CrmStatus>
                ) : (
                  <CrmStatus variant="warning">Finalize buy rates first</CrmStatus>
                )}
                {pricingSnapshotStale ? (
                  <CrmStatus variant="warning">Saved pricing is based on an older revision</CrmStatus>
                ) : null}
                {workflow.pricingSnapshot ? (
                  <CrmStatus variant="success">
                    Sell total {formatCurrencyAmount(workflow.pricingSnapshot.totals.sellAmount, workflow.pricingSnapshot.currency)}
                  </CrmStatus>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)]/40 bg-[var(--mnx-surface)] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mnx-text-muted)]">
                    Buy total
                  </div>
                  <div className="mt-2 text-lg font-semibold text-[var(--mnx-text-strong)]">
                    {formatCurrencyAmount(
                      pricingTotals.buyAmount,
                      currentFinalizedVersion?.baseCurrency ?? "INR",
                    )}
                  </div>
                </div>
                <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)]/40 bg-[var(--mnx-surface)] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mnx-text-muted)]">
                    Sell total
                  </div>
                  <div className="mt-2 text-lg font-semibold text-[var(--mnx-text-strong)]">
                    {formatCurrencyAmount(
                      pricingTotals.sellAmount,
                      currentFinalizedVersion?.baseCurrency ?? "INR",
                    )}
                  </div>
                </div>
                <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)]/40 bg-[var(--mnx-surface)] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mnx-text-muted)]">
                    Margin amount
                  </div>
                  <div className="mt-2 text-lg font-semibold text-[var(--mnx-text-strong)]">
                    {formatCurrencyAmount(
                      pricingTotals.marginAmount,
                      currentFinalizedVersion?.baseCurrency ?? "INR",
                    )}
                  </div>
                </div>
                <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)]/40 bg-[var(--mnx-surface)] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mnx-text-muted)]">
                    Margin %
                  </div>
                  <div className="mt-2 text-lg font-semibold text-[var(--mnx-text-strong)]">
                    {pricingMarginPercent !== null ? `${pricingMarginPercent.toFixed(2)}%` : "N/A"}
                  </div>
                </div>
              </div>

              {currentFinalizedVersion ? (
                <div className="space-y-3">
                  {pricingLines.map((line) => (
                    <div
                      key={line.finalizedLineId}
                      className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)]/40 bg-[var(--mnx-surface)] p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong>{line.chargeName}</strong>
                            <CrmStatus variant="neutral">
                              {line.department === "FREIGHT_FORWARDING"
                                ? "Freight Forwarding"
                                : "Customs Clearance"}
                            </CrmStatus>
                          </div>
                          <p className="text-sm text-[var(--mnx-text-muted)]">
                            Vendor {line.vendorName} · Unit {line.unit}
                          </p>
                        </div>
                        <div className="text-sm text-[var(--mnx-text-muted)]">
                          Buy {formatCurrencyAmount(line.buyAmount, currentFinalizedVersion.baseCurrency)}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-4">
                        <CrmField label="Sell rate">
                          <CrmInput
                            type="number"
                            value={line.sellAmount}
                            min={0}
                            onChange={(event) => {
                              const sellAmount = Number(event.target.value || 0);
                              setPricingLineEdits((current) => ({
                                ...current,
                                [line.finalizedLineId]: {
                                  ...(current[line.finalizedLineId] ?? {}),
                                  sellAmount,
                                  marginAmount: sellAmount - line.buyAmount,
                                  marginPercent:
                                    line.buyAmount > 0
                                      ? ((sellAmount - line.buyAmount) / line.buyAmount) * 100
                                      : null,
                                },
                              }));
                            }}
                            disabled={isSavingPricingSnapshot}
                          />
                        </CrmField>
                        <CrmField label="Quantity">
                          <CrmInput
                            type="number"
                            value={line.quantity}
                            min={1}
                            onChange={(event) => {
                              const quantity = Math.max(1, Number(event.target.value || 1) || 1);
                              setPricingLineEdits((current) => ({
                                ...current,
                                [line.finalizedLineId]: {
                                  ...(current[line.finalizedLineId] ?? {}),
                                  quantity,
                                },
                              }));
                            }}
                            disabled={isSavingPricingSnapshot}
                          />
                        </CrmField>
                        <CrmField label="Margin %">
                          <CrmInput
                            value={line.marginPercent !== null ? line.marginPercent.toFixed(2) : "N/A"}
                            disabled
                          />
                        </CrmField>
                        <CrmField label="Tax">
                          <CrmInput
                            value={
                              typeof line.taxPercent === "number" && Number.isFinite(line.taxPercent)
                                ? `GST ${line.taxPercent}%`
                                : "GST 18%"
                            }
                            disabled
                          />
                        </CrmField>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                        <CrmField label="Pricing note">
                          <CrmInput
                            value={line.notes}
                            onChange={(event) => {
                              const notes = event.target.value;
                              setPricingLineEdits((current) => ({
                                ...current,
                                [line.finalizedLineId]: {
                                  ...(current[line.finalizedLineId] ?? {}),
                                  notes,
                                },
                              }));
                            }}
                            placeholder="Optional note for this customer-facing sell rate."
                            disabled={isSavingPricingSnapshot}
                          />
                        </CrmField>
                        <div className="self-end text-sm text-[var(--mnx-text-muted)]">
                          Line sell total{" "}
                          <span className="font-semibold text-[var(--mnx-text-strong)]">
                            {formatCurrencyAmount(
                              line.sellAmount * line.quantity,
                              currentFinalizedVersion.baseCurrency,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                    <CrmField label="Worksheet note">
                      <CrmTextarea
                        value={pricingNote}
                        onChange={(event) =>
                          setPricingNoteEdits((current) => ({
                            ...current,
                            [pricingSeedKey]: event.target.value,
                          }))
                        }
                        placeholder="Optional note about this pricing worksheet revision."
                        rows={3}
                        disabled={isSavingPricingSnapshot}
                      />
                    </CrmField>
                    <div className="flex items-end gap-2">
                      <CrmButton
                        type="button"
                        onClick={handleSavePricingSnapshot}
                        disabled={isSavingPricingSnapshot}
                      >
                        {isSavingPricingSnapshot ? "Saving..." : "Save pricing worksheet"}
                      </CrmButton>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-warning)]/30 bg-[var(--mnx-warning-bg)]/25 p-4 text-sm text-[var(--mnx-text-muted)]">
                  Finalize a buy-rate revision before pricing can be prepared.
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {workflow.pricingSnapshot && !pricingSnapshotStale && departmentHasSubmittedRates(
                  {
                    ...workflow,
                    freightCharges,
                    customsCharges,
                  },
                  "FREIGHT_FORWARDING",
                ) ? (
                  <Link href={buildQuoteHref("freight-only")}>
                    <CrmButton type="button" variant="secondary" size="compact">
                      Create freight-only quotation
                    </CrmButton>
                  </Link>
                ) : null}
                {workflow.pricingSnapshot && !pricingSnapshotStale && departmentHasSubmittedRates(
                  {
                    ...workflow,
                    freightCharges,
                    customsCharges,
                  },
                  "CUSTOMS_CLEARANCE",
                ) ? (
                  <Link href={buildQuoteHref("customs-only")}>
                    <CrmButton type="button" variant="secondary" size="compact">
                      Create customs-only quotation
                    </CrmButton>
                  </Link>
                ) : null}
                {workflow.pricingSnapshot && !pricingSnapshotStale && combinedDepartments.length === 2 ? (
                  <Link href={buildQuoteHref("combined")}>
                    <CrmButton type="button" size="compact">
                      Create combined quotation
                    </CrmButton>
                  </Link>
                ) : null}
                {pricingSnapshotStale ? (
                  <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-warning)]/30 bg-[var(--mnx-warning-bg)]/25 px-4 py-3 text-sm text-[var(--mnx-text-muted)]">
                    Save the pricing worksheet again against{" "}
                    <span className="font-semibold text-[var(--mnx-text-strong)]">
                      {currentFinalizedVersion?.versionLabel || "the latest finalized revision"}
                    </span>{" "}
                    before creating a new quotation version.
                  </div>
                ) : null}
              </div>
            </div>

            {workflow.latestQuoteVersion && changedDepartments.length > 0 ? (
              <div className="space-y-3 rounded-[var(--mn-radius-panel)] border border-[var(--mnx-warning)]/30 bg-[var(--mnx-warning-bg)]/30 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <CrmStatus variant="warning">Recreate quotation required</CrmStatus>
                  <p className="text-sm text-[var(--mnx-text-muted)]">
                    Newly added charges are available from{" "}
                    <span className="font-semibold text-[var(--mnx-text-strong)]">
                      {changedDepartments
                        .map((item) =>
                          item === "FREIGHT_FORWARDING"
                            ? "Freight Forwarding"
                            : "Customs Clearance",
                        )
                        .join(" and ")}
                    </span>
                    .
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={buildQuoteHref("newly-added-only")}>
                    <CrmButton type="button" variant="secondary" size="compact">
                      Recreate with newly added charges only
                    </CrmButton>
                  </Link>
                  {combinedDepartments.length > 0 ? (
                    <Link href={buildQuoteHref("combined")}>
                      <CrmButton type="button" size="compact">
                        Recreate combined quotation
                      </CrmButton>
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}

            {workflow.latestQuoteVersion && pendingDepartments.length > 0 ? (
              <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)]/40 bg-[var(--mnx-surface)] p-4 text-sm text-[var(--mnx-text-muted)]">
                The current quotation can continue through approval and customer sharing with the
                already submitted department charges. The remaining department can be added later as
                a new version.
              </div>
            ) : null}

            {workflow.latestQuoteVersion && combinedDepartments.length > 0 ? (
              <div className="text-xs text-[var(--mnx-text-muted)]">
                Latest quoted mode:{" "}
                <span className="font-semibold text-[var(--mnx-text-strong)]">
                  {formatQuotedMode(combinedDepartments)}
                </span>
              </div>
            ) : null}

            {!workflow.pricingSnapshot ? (
              <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-warning)]/30 bg-[var(--mnx-warning-bg)]/25 p-4 text-sm text-[var(--mnx-text-muted)]">
                Save the pricing worksheet before opening the quotation form so the quote uses the
                stored sell-rate snapshot instead of the editable charge worksheet.
              </div>
            ) : null}
          </CrmPanel>
          ) : hasStructuredResponses ? (
            <CrmPanel className="border-[var(--mnx-border)]/40 bg-[var(--mnx-surface)] px-4 py-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CrmStatus variant="warning">Pricing locked</CrmStatus>
                  <CrmStatus variant="neutral">Finalize buy rates first</CrmStatus>
                </div>
                <p className="text-sm text-[var(--mnx-text-muted)]">
                  Pricing, sell-rate editing, and quotation creation appear only after a finalized
                  buy-rate revision is created from the comparison decision.
                </p>
              </div>
            </CrmPanel>
          ) : null}
        </div>
      </CrmSection>
    </div>
  );
}
