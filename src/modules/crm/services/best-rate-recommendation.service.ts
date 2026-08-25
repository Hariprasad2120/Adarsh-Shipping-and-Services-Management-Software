import recommendationSettings from "../config/rate-recommendation-settings.json";
import type {
  AgentRateResponseRecord,
  RateComparisonChargeSelection,
  RateComparisonSelectionMode,
  RateRecommendationRecord,
} from "../rate-workflow";
import type { AgentRecommendationProfile } from "./agent-recommendation.service";
import type { RateComparisonWorkspace } from "./rate-comparison.service";

type RecommendationSettings = {
  weights: {
    landedBuyCost: number;
    completeness: number;
    validity: number;
    responseTime: number;
    operationalReliability: number;
    historicalCompetitiveness: number;
    bookingHistory: number;
    dataConfidence: number;
  };
  mixedSelectionPenalty: number;
  minimumConfidence: number;
};

type Candidate = {
  mode: RateComparisonSelectionMode;
  responseId: string | null;
  chargeSelections: RateComparisonChargeSelection[];
  totalInBaseCurrency: number | null;
  vendorIds: string[];
  score: number;
  confidence: number;
  explanation: string;
  reasons: Array<{
    label: string;
    detail: string;
  }>;
};

const settings = recommendationSettings as RecommendationSettings;

function parseValidity(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  if (!text) return null;

  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    const parsed = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const slash = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (!slash) return null;
  const day = slash[1].padStart(2, "0");
  const month = slash[2].padStart(2, "0");
  const year = slash[3].length === 2 ? `20${slash[3]}` : slash[3];
  const parsed = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function average(values: Array<number | null>) {
  const filtered = values.filter((value): value is number => typeof value === "number");
  if (filtered.length === 0) return 0;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function getHistoricalReliability(profile: AgentRecommendationProfile | null | undefined) {
  if (!profile) return 0.35;
  return clamp01(
    average([
      profile.metrics.responseRatePct,
      profile.metrics.completeRatePct,
      profile.metrics.selectionRatePct,
      profile.metrics.bookingRatePct,
      profile.metrics.operationalOutcomePct,
      profile.metrics.rateValidityQualityPct,
    ]) / 100,
  );
}

function getHistoricalCompetitiveness(profile: AgentRecommendationProfile | null | undefined) {
  if (!profile || typeof profile.metrics.competitivenessPct !== "number") {
    return 0.35;
  }
  return clamp01(profile.metrics.competitivenessPct / 100);
}

function getBookingHistoryScore(profile: AgentRecommendationProfile | null | undefined) {
  if (!profile) return 0.35;
  return clamp01(
    average([profile.metrics.selectionRatePct, profile.metrics.bookingRatePct]) / 100,
  );
}

function getResponseSpeedScore(profile: AgentRecommendationProfile | null | undefined) {
  const medianMinutes = profile?.metrics.medianResponseMinutes;
  if (typeof medianMinutes !== "number" || medianMinutes <= 0) return 0.35;
  return clamp01(1 - Math.min(medianMinutes, 24 * 60) / (24 * 60));
}

function formatCurrencyAmount(value: number | null, currency: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Not comparable";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function getResponseById(
  responses: AgentRateResponseRecord[],
  responseId: string | null,
) {
  if (!responseId) return null;
  return responses.find((response) => response.id === responseId) ?? null;
}

function getValidityScoreAndDays(response: AgentRateResponseRecord | null) {
  const validityDate = parseValidity(response?.validity);
  if (!validityDate) {
    return { score: 0.35, days: null };
  }

  const now = new Date();
  const diffDays = Math.round((validityDate.getTime() - now.getTime()) / 86400000);
  if (diffDays <= 0) {
    return { score: 0, days: diffDays };
  }

  return {
    score: clamp01(diffDays / 30),
    days: diffDays,
  };
}

function getDataConfidenceScore(response: AgentRateResponseRecord | null) {
  if (!response) {
    return 0.35;
  }

  const parserConfidence =
    typeof response.overallConfidence === "number"
      ? clamp01(response.overallConfidence)
      : response.parserStatus === "AUTO_MAPPED"
        ? 0.8
        : response.parserStatus === "MANUAL"
          ? 0.7
          : 0.5;
  const warningPenalty = Math.min(response.warnings.length * 0.08, 0.3);
  const reviewPenalty = Math.min(
    response.lines.filter(
      (line) =>
        line.reviewStatus === "REVIEW_REQUIRED" ||
        line.missingFields.length > 0 ||
        line.amountMissing,
    ).length * 0.06,
    0.3,
  );

  return clamp01(parserConfidence - warningPenalty - reviewPenalty);
}

function buildWholeAgentCandidate(params: {
  workspace: RateComparisonWorkspace;
  profileByVendorId: Map<string, AgentRecommendationProfile>;
}) {
  const eligible = params.workspace.agentSummaries
    .filter(
      (summary) =>
        summary.eligibleForRecommendation &&
        typeof summary.comparableTotalInBaseCurrency === "number",
    )
    .sort(
      (left, right) =>
        (left.comparableTotalInBaseCurrency ?? Number.POSITIVE_INFINITY) -
        (right.comparableTotalInBaseCurrency ?? Number.POSITIVE_INFINITY),
    );

  if (eligible.length === 0) {
    return null;
  }

  const best = eligible[0]!;
  const nextBest = eligible[1] ?? null;
  const bestResponse = getResponseById(params.workspace.responses, best.responseId);
  const profile = bestResponse?.vendorId
    ? params.profileByVendorId.get(bestResponse.vendorId) ?? null
    : null;
  const minTotal = eligible[0]?.comparableTotalInBaseCurrency ?? null;
  const maxTotal = eligible[eligible.length - 1]?.comparableTotalInBaseCurrency ?? null;
  const costScore =
    typeof best.comparableTotalInBaseCurrency === "number" &&
    typeof minTotal === "number" &&
    typeof maxTotal === "number" &&
    maxTotal > minTotal
      ? clamp01(
          1 -
            (best.comparableTotalInBaseCurrency - minTotal) /
              Math.max(maxTotal - minTotal, 1),
        )
      : 1;
  const validity = getValidityScoreAndDays(bestResponse);
  const responseSpeed = getResponseSpeedScore(profile);
  const reliability = getHistoricalReliability(profile);
  const competitiveness = getHistoricalCompetitiveness(profile);
  const bookingHistory = getBookingHistoryScore(profile);
  const dataConfidence = getDataConfidenceScore(bestResponse);

  const score =
    settings.weights.landedBuyCost * costScore +
    settings.weights.completeness * 1 +
    settings.weights.validity * validity.score +
    settings.weights.responseTime * responseSpeed +
    settings.weights.operationalReliability * reliability +
    settings.weights.historicalCompetitiveness * competitiveness +
    settings.weights.bookingHistory * bookingHistory +
    settings.weights.dataConfidence * dataConfidence;

  const deltaToNext =
    typeof nextBest?.comparableTotalInBaseCurrency === "number" &&
    typeof best.comparableTotalInBaseCurrency === "number"
      ? nextBest.comparableTotalInBaseCurrency - best.comparableTotalInBaseCurrency
      : null;

  const reasons = [
    {
      label: "Complete landed cost",
      detail:
        deltaToNext && deltaToNext > 0
          ? `${formatCurrencyAmount(best.comparableTotalInBaseCurrency, params.workspace.baseCurrency)} and ${formatCurrencyAmount(deltaToNext, params.workspace.baseCurrency)} below the next complete offer.`
          : `${formatCurrencyAmount(best.comparableTotalInBaseCurrency, params.workspace.baseCurrency)} with full mandatory charge coverage.`,
    },
    {
      label: "Historical reliability",
      detail:
        profile && typeof profile.metrics.responseRatePct === "number"
          ? `${profile.metrics.responseRatePct}% response rate with ${profile.metrics.completeRatePct ?? "N/A"}% complete-response quality.`
          : "Limited historical reliability data is available, so cost/completeness carried more weight.",
    },
    {
      label: "Historical competitiveness",
      detail:
        profile && typeof profile.metrics.competitivenessPct === "number"
          ? `${profile.metrics.competitivenessPct}% of comparable charges were historically among the strongest offers.`
          : "Historical competitiveness evidence is still limited for this vendor.",
    },
    {
      label: "Booking history",
      detail:
        profile && typeof profile.metrics.bookingRatePct === "number"
          ? `${profile.metrics.bookingRatePct}% of previously selected similar offers converted into booking outcomes.`
          : "Booking-history evidence is still limited, so it carried a lighter weight.",
    },
  ];

  if (typeof validity.days === "number" && validity.days > 0) {
    reasons.push({
      label: "Validity window",
      detail: `The quoted validity remains usable for about ${validity.days} day(s).`,
    });
  }

  reasons.push({
    label: "Data confidence",
    detail:
      bestResponse && bestResponse.warnings.length > 0
        ? `The current structured response is usable, but ${bestResponse.warnings.length} warning(s) reduced confidence.`
        : "The current structured response carries a stronger data-confidence signal.",
  });

  return {
    mode: "ENTIRE_AGENT",
    responseId: best.responseId,
    chargeSelections: [],
    totalInBaseCurrency: best.comparableTotalInBaseCurrency,
    vendorIds: bestResponse?.vendorId ? [bestResponse.vendorId] : [],
    score,
    confidence: clamp01(
      (1 +
        reliability +
        responseSpeed +
        validity.score +
        competitiveness +
        bookingHistory +
        dataConfidence) /
        7,
    ),
    explanation:
      deltaToNext && deltaToNext > 0
        ? `Recommended ${best.vendorName} because it has the lowest complete landed buy cost, stays ${formatCurrencyAmount(deltaToNext, params.workspace.baseCurrency)} below the next complete offer, and still scores better on reliability, competitiveness, booking history, and data confidence.`
        : `Recommended ${best.vendorName} because it provides the strongest weighted balance across landed buy cost, completeness, validity, response speed, reliability, competitiveness, booking history, and data confidence.`,
    reasons,
  } satisfies Candidate;
}

function buildMixedCandidate(params: {
  workspace: RateComparisonWorkspace;
  profileByVendorId: Map<string, AgentRecommendationProfile>;
}) {
  if (
    params.workspace.recommendedMixedChargeSelections.length === 0 ||
    typeof params.workspace.recommendedMixedTotalInBaseCurrency !== "number"
  ) {
    return null;
  }

  const uniqueResponseIds = Array.from(
    new Set(params.workspace.recommendedMixedChargeSelections.map((entry) => entry.responseId)),
  );
  const uniqueResponses = uniqueResponseIds
    .map((responseId) => getResponseById(params.workspace.responses, responseId))
    .filter((response): response is AgentRateResponseRecord => Boolean(response));
  const uniqueVendorIds = uniqueResponses
    .map((response) => response.vendorId)
    .filter((vendorId): vendorId is string => Boolean(vendorId));
  const responseSpeed = average(
    uniqueVendorIds.map((vendorId) =>
      getResponseSpeedScore(params.profileByVendorId.get(vendorId)),
    ),
  );
  const reliability = average(
    uniqueVendorIds.map((vendorId) =>
      getHistoricalReliability(params.profileByVendorId.get(vendorId)),
    ),
  );
  const competitiveness = average(
    uniqueVendorIds.map((vendorId) =>
      getHistoricalCompetitiveness(params.profileByVendorId.get(vendorId)),
    ),
  );
  const bookingHistory = average(
    uniqueVendorIds.map((vendorId) =>
      getBookingHistoryScore(params.profileByVendorId.get(vendorId)),
    ),
  );
  const validity = average(
    uniqueResponses.map((response) => getValidityScoreAndDays(response).score),
  );
  const dataConfidence = average(
    uniqueResponses.map((response) => getDataConfidenceScore(response)),
  );
  const score =
    settings.weights.landedBuyCost * 1 +
    settings.weights.completeness * 1 +
    settings.weights.validity * validity +
    settings.weights.responseTime * responseSpeed +
    settings.weights.operationalReliability * reliability +
    settings.weights.historicalCompetitiveness * competitiveness +
    settings.weights.bookingHistory * bookingHistory +
    settings.weights.dataConfidence * dataConfidence -
    Math.max(0, uniqueVendorIds.length - 1) * settings.mixedSelectionPenalty;

  return {
    mode: "PER_CHARGE",
    responseId: null,
    chargeSelections: params.workspace.recommendedMixedChargeSelections,
    totalInBaseCurrency: params.workspace.recommendedMixedTotalInBaseCurrency,
    vendorIds: uniqueVendorIds,
    score,
    confidence: clamp01(
      (1 + reliability + responseSpeed + validity + competitiveness + bookingHistory + dataConfidence) /
        7,
    ),
    explanation:
      uniqueVendorIds.length > 1
        ? "Recommended a mixed charge strategy because it produces the best complete landed buy cost while still balancing historical competitiveness, booking history, operational reliability, and response confidence charge by charge."
        : "Recommended a mixed charge strategy because the deterministic comparison converges on the strongest weighted result even after historical and confidence factors are applied.",
    reasons: [
      {
        label: "Best normalized total",
        detail: `${formatCurrencyAmount(params.workspace.recommendedMixedTotalInBaseCurrency, params.workspace.baseCurrency)} across the best comparable charge mix.`,
      },
      {
        label: "Coverage quality",
        detail: `All mandatory charges have a comparable recommended source across ${uniqueVendorIds.length} vendor option(s).`,
      },
      {
        label: "Historical intelligence",
        detail: "The mixed recommendation also checks response speed, operational reliability, competitiveness, booking history, and current data confidence before winning.",
      },
    ],
  } satisfies Candidate;
}

export function buildBestRateRecommendation(params: {
  workspace: RateComparisonWorkspace;
  profileByVendorId: Map<string, AgentRecommendationProfile>;
}): RateRecommendationRecord | null {
  const wholeAgent = buildWholeAgentCandidate(params);
  const mixed = buildMixedCandidate(params);
  const candidates: Candidate[] = [];
  if (wholeAgent) {
    candidates.push(wholeAgent);
  }
  if (mixed) {
    candidates.push(mixed);
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((left, right) => right.score - left.score);
  const selected = candidates[0]!;

  return {
    generatedAt: new Date().toISOString(),
    model: "weighted-commercial-recommendation-v1",
    strategy: "DETERMINISTIC",
    recommendedMode: selected.mode,
    recommendedResponseId: selected.responseId,
    recommendedChargeSelections: selected.chargeSelections,
    recommendedTotalInBaseCurrency: selected.totalInBaseCurrency,
    recommendedVendorIds: selected.vendorIds,
    confidenceScore: selected.confidence,
    explanation: selected.explanation,
    reasons: selected.reasons,
    decision: {
      status: "PENDING",
      decidedAt: null,
      decidedById: null,
      selectedMode: null,
      selectedResponseId: null,
      selectedChargeSelections: [],
      overrideReasons: [],
      overrideNote: null,
    },
  } satisfies RateRecommendationRecord;
}
