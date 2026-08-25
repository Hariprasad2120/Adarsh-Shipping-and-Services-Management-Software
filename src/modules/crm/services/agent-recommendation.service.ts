import { buildRateComparisonWorkspace } from "./rate-comparison.service";
import { getRateWorkflowSnapshot } from "../rate-workflow";

type HistoricalLeadRecord = {
  id: string;
  status: string;
  isConverted: boolean;
  createdAt: string;
  enquiryDetails: unknown;
  serviceEnquiries: Array<{
    status: string;
    serviceType: string;
  }>;
};

type VendorRecord = {
  id: string;
  name: string;
  services: string | null;
};

export type AgentRecommendationProfile = {
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
};

type ContextSnapshot = {
  direction: string;
  mode: string;
  loadType: string;
  origin: string;
  destination: string;
  commodity: string;
};

type VendorStats = {
  similarEnquiryCount: number;
  requestCount: number;
  respondedCount: number;
  responseMinutes: number[];
  completeCount: number;
  clarificationCount: number;
  competitiveWins: number;
  competitiveOpportunities: number;
  selectionWins: number;
  selectionOpportunities: number;
  bookingWins: number;
  operationalWins: number;
  validityQualityCount: number;
  validityOpportunities: number;
  mostRecentActivityAt: string | null;
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function extractLeadContext(enquiryDetails: unknown): ContextSnapshot {
  const root =
    enquiryDetails && typeof enquiryDetails === "object"
      ? (enquiryDetails as Record<string, unknown>)
      : {};
  const type = normalizeText(root.type);
  const isAir = type === "AIR";

  return {
    direction: normalizeText(root.seaType ?? root.airType ?? root.direction),
    mode: isAir ? "AIR" : "SEA",
    loadType: isAir ? "AIR" : normalizeText(root.seaLclFcl ?? root.loadType),
    origin: normalizeText(isAir ? root.aol : root.pol),
    destination: normalizeText(isAir ? root.aod : root.pod),
    commodity: normalizeText(root.commodity),
  };
}

function getContextMatchScore(current: ContextSnapshot, candidate: ContextSnapshot) {
  let score = 0;
  if (current.direction && current.direction === candidate.direction) score += 1;
  if (current.mode && current.mode === candidate.mode) score += 1;
  if (current.loadType && current.loadType === candidate.loadType) score += 1;
  if (current.origin && current.origin === candidate.origin) score += 1;
  if (current.destination && current.destination === candidate.destination) score += 1;
  if (current.commodity && current.commodity === candidate.commodity) score += 1;
  return score;
}

function parseIso(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toPercentage(numerator: number, denominator: number) {
  if (!denominator) return null;
  return Number(((numerator / denominator) * 100).toFixed(1));
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? null;
  }
  const left = sorted[middle - 1];
  const right = sorted[middle];
  if (typeof left !== "number" || typeof right !== "number") {
    return null;
  }
  return Math.round((left + right) / 2);
}

function hasAcceptedOperationalOutcome(lead: HistoricalLeadRecord) {
  return lead.serviceEnquiries.some((entry) =>
    ["CUSTOMER_ACCEPTED", "JOB_READY", "JOB_CREATED"].includes(entry.status),
  );
}

function formatMedianResponse(minutes: number | null) {
  if (typeof minutes !== "number") return "response timing is still limited";
  if (minutes < 60) return `responded within a median of ${minutes} minutes`;
  const hours = minutes / 60;
  if (hours < 24) return `responded within a median of ${hours.toFixed(1)} hours`;
  return `responded within a median of ${(hours / 24).toFixed(1)} days`;
}

function buildExplanation(params: {
  vendorName: string;
  similarEnquiryCount: number;
  loadType: string;
  medianResponseMinutes: number | null;
  competitivenessPct: number | null;
}) {
  const { similarEnquiryCount, loadType, medianResponseMinutes, competitivenessPct } = params;
  const enquiryPhrase =
    similarEnquiryCount > 0
      ? `handled ${similarEnquiryCount} similar ${loadType || "shipment"} enquiries`
      : "has limited similar-enquiry history";
  const responsePhrase = formatMedianResponse(medianResponseMinutes);
  const competitivePhrase =
    typeof competitivenessPct === "number"
      ? `supplied commercially competitive rates in ${competitivenessPct}% of comparable charges`
      : "is still building comparable rate history";

  return `Recommended because this agent ${enquiryPhrase}, ${responsePhrase}, and ${competitivePhrase}.`;
}

export function buildAgentRecommendationProfiles(params: {
  currentEnquiryDetails: unknown;
  vendors: VendorRecord[];
  historicalLeads: HistoricalLeadRecord[];
}) {
  const currentContext = extractLeadContext(params.currentEnquiryDetails);
  const statsByVendor = new Map<string, VendorStats>();

  for (const vendor of params.vendors) {
    statsByVendor.set(vendor.id, {
      similarEnquiryCount: 0,
      requestCount: 0,
      respondedCount: 0,
      responseMinutes: [],
      completeCount: 0,
      clarificationCount: 0,
      competitiveWins: 0,
      competitiveOpportunities: 0,
      selectionWins: 0,
      selectionOpportunities: 0,
      bookingWins: 0,
      operationalWins: 0,
      validityQualityCount: 0,
      validityOpportunities: 0,
      mostRecentActivityAt: null,
    });
  }

  for (const lead of params.historicalLeads) {
    const leadContext = extractLeadContext(lead.enquiryDetails);
    const contextScore = getContextMatchScore(currentContext, leadContext);
    if (contextScore < 3) {
      continue;
    }

    const workflow = getRateWorkflowSnapshot(lead.enquiryDetails);
    const comparisonWorkspace = buildRateComparisonWorkspace({
      workflow,
      enquiryDetails: lead.enquiryDetails,
    });
    const selectedResponseIds =
      workflow.comparisonSelection.mode === "ENTIRE_AGENT"
        ? workflow.comparisonSelection.selectedResponseId
          ? [workflow.comparisonSelection.selectedResponseId]
          : []
        : Array.from(
            new Set(
              workflow.comparisonSelection.chargeSelections.map((entry) => entry.responseId),
            ),
          );

    for (const request of workflow.rateRequests) {
      if (!request.vendorId) {
        continue;
      }

      const stats = statsByVendor.get(request.vendorId);
      if (!stats) {
        continue;
      }

      stats.similarEnquiryCount += 1;
      stats.requestCount += 1;
      stats.mostRecentActivityAt =
        !stats.mostRecentActivityAt || request.sentAt > stats.mostRecentActivityAt
          ? request.sentAt
          : stats.mostRecentActivityAt;

      if (request.replyStatus === "REPLIED") {
        stats.respondedCount += 1;
      }

      const sentAt = parseIso(request.sentAt);
      const repliedAt = parseIso(request.replyTimestamp);
      if (sentAt && repliedAt) {
        const minutes = Math.round((repliedAt.getTime() - sentAt.getTime()) / 60000);
        if (minutes >= 0) {
          stats.responseMinutes.push(minutes);
        }
      }

      const response = workflow.rateResponses.find((entry) => entry.requestId === request.id);
      if (!response) {
        continue;
      }

      const summary = comparisonWorkspace.agentSummaries.find(
        (entry) => entry.responseId === response.id,
      );
      if (summary) {
        if (summary.eligibleForRecommendation) {
          stats.completeCount += 1;
        }
        stats.competitiveOpportunities += comparisonWorkspace.chargeRows.length;
      }

      stats.competitiveWins += comparisonWorkspace.chargeRows.filter((row) =>
        row.bestResponseId === response.id,
      ).length;

      const needsClarification =
        response.parserStatus === "AI_REVIEW_REQUIRED" ||
        response.warnings.length > 0 ||
        response.lines.some(
          (line) =>
            line.reviewStatus === "REVIEW_REQUIRED" ||
            line.missingFields.length > 0 ||
            line.amountMissing,
        );
      if (needsClarification) {
        stats.clarificationCount += 1;
      }

      if (selectedResponseIds.length > 0) {
        stats.selectionOpportunities += 1;
        if (selectedResponseIds.includes(response.id)) {
          stats.selectionWins += 1;
          if (lead.isConverted || workflow.latestQuoteId || hasAcceptedOperationalOutcome(lead)) {
            stats.bookingWins += 1;
          }
        }
      }

      if (hasAcceptedOperationalOutcome(lead)) {
        stats.operationalWins += 1;
      }

      stats.validityOpportunities += 1;
      const validityText = normalizeText(response.validity);
      if (validityText && validityText !== "NOT PROVIDED") {
        stats.validityQualityCount += 1;
      }
    }
  }

  const sorted = params.vendors
    .map((vendor) => {
      const stats = statsByVendor.get(vendor.id)!;
      const responseRatePct = toPercentage(stats.respondedCount, stats.requestCount);
      const completeRatePct = toPercentage(stats.completeCount, stats.requestCount);
      const clarificationRatePct = toPercentage(stats.clarificationCount, stats.requestCount);
      const competitivenessPct = toPercentage(
        stats.competitiveWins,
        stats.competitiveOpportunities,
      );
      const selectionRatePct = toPercentage(
        stats.selectionWins,
        stats.selectionOpportunities,
      );
      const bookingRatePct = toPercentage(
        stats.bookingWins,
        stats.selectionWins,
      );
      const operationalOutcomePct = toPercentage(
        stats.operationalWins,
        stats.requestCount,
      );
      const rateValidityQualityPct = toPercentage(
        stats.validityQualityCount,
        stats.validityOpportunities,
      );

      return {
        vendorId: vendor.id,
        profile: {
          rank: null,
          recommended: false,
          explanation: buildExplanation({
            vendorName: vendor.name,
            similarEnquiryCount: stats.similarEnquiryCount,
            loadType: currentContext.loadType,
            medianResponseMinutes: median(stats.responseMinutes),
            competitivenessPct,
          }),
          metrics: {
            similarEnquiryCount: stats.similarEnquiryCount,
            requestCount: stats.requestCount,
            responseRatePct,
            medianResponseMinutes: median(stats.responseMinutes),
            completeRatePct,
            clarificationRatePct,
            competitivenessPct,
            selectionRatePct,
            bookingRatePct,
            operationalOutcomePct,
            disputePct: null,
            billingVariancePct: null,
            rateValidityQualityPct,
          },
        } satisfies AgentRecommendationProfile,
        sortKey: {
          similarEnquiryCount: stats.similarEnquiryCount,
          responseRatePct: responseRatePct ?? -1,
          competitivenessPct: competitivenessPct ?? -1,
          selectionRatePct: selectionRatePct ?? -1,
          bookingRatePct: bookingRatePct ?? -1,
          medianResponseMinutes: median(stats.responseMinutes) ?? Number.MAX_SAFE_INTEGER,
          mostRecentActivityAt: stats.mostRecentActivityAt ?? "",
        },
      };
    })
    .sort((left, right) => {
      if (left.sortKey.similarEnquiryCount !== right.sortKey.similarEnquiryCount) {
        return right.sortKey.similarEnquiryCount - left.sortKey.similarEnquiryCount;
      }
      if (left.sortKey.responseRatePct !== right.sortKey.responseRatePct) {
        return right.sortKey.responseRatePct - left.sortKey.responseRatePct;
      }
      if (left.sortKey.competitivenessPct !== right.sortKey.competitivenessPct) {
        return right.sortKey.competitivenessPct - left.sortKey.competitivenessPct;
      }
      if (left.sortKey.selectionRatePct !== right.sortKey.selectionRatePct) {
        return right.sortKey.selectionRatePct - left.sortKey.selectionRatePct;
      }
      if (left.sortKey.bookingRatePct !== right.sortKey.bookingRatePct) {
        return right.sortKey.bookingRatePct - left.sortKey.bookingRatePct;
      }
      if (left.sortKey.medianResponseMinutes !== right.sortKey.medianResponseMinutes) {
        return left.sortKey.medianResponseMinutes - right.sortKey.medianResponseMinutes;
      }
      return right.sortKey.mostRecentActivityAt.localeCompare(left.sortKey.mostRecentActivityAt);
    });

  return new Map(
    sorted.map((entry, index) => [
      entry.vendorId,
      {
        ...entry.profile,
        rank: index + 1,
        recommended: index === 0 && entry.profile.metrics.similarEnquiryCount > 0,
      } satisfies AgentRecommendationProfile,
    ]),
  );
}
