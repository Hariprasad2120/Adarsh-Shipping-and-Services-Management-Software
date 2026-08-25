import recommendationSettings from "../config/ai-best-rate-recommendation-settings.json";
import type {
  RateComparisonRecommendationFactor,
  RateComparisonRecommendationSnapshot,
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
};

type ResponseRecommendationCandidate = {
  responseId: string;
  vendorId: string | null;
  vendorName: string;
  comparableTotalInBaseCurrency: number | null;
  missingMandatoryCharges: number;
  coveredMandatoryCharges: number;
  issueCount: number;
  validity: string | null;
  overallConfidence: number | null;
  warningsCount: number;
  historicalRecommendation: AgentRecommendationProfile | null;
};

const settings = recommendationSettings as RecommendationSettings;

function toScore(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Number(value.toFixed(1)) : null;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function buildFactor(
  key: RateComparisonRecommendationFactor["key"],
  label: string,
  weightPct: number,
  scorePct: number | null,
  detail: string,
): RateComparisonRecommendationFactor {
  return {
    key,
    label,
    weightPct,
    scorePct: toScore(scorePct),
    detail,
  };
}

function scoreLandedBuyCost(
  candidate: ResponseRecommendationCandidate,
  candidates: ResponseRecommendationCandidate[],
) {
  const comparableTotals = candidates
    .map((entry) => entry.comparableTotalInBaseCurrency)
    .filter((value): value is number => typeof value === "number" && value > 0);
  if (
    typeof candidate.comparableTotalInBaseCurrency !== "number" ||
    comparableTotals.length === 0
  ) {
    return {
      scorePct: 0,
      detail: "No complete landed buy cost is available for this response yet.",
    };
  }

  const lowest = Math.min(...comparableTotals);
  const highest = Math.max(...comparableTotals);
  if (lowest === highest) {
    return {
      scorePct: 100,
      detail: "This response is tied with the lowest complete landed buy cost.",
    };
  }

  const scorePct =
    ((highest - candidate.comparableTotalInBaseCurrency) / (highest - lowest)) * 100;
  const delta = candidate.comparableTotalInBaseCurrency - lowest;
  return {
    scorePct: clamp(scorePct),
    detail:
      delta <= 0
        ? "This response has the lowest complete landed buy cost."
        : `This response is ${delta.toFixed(0)} above the lowest comparable landed buy cost.`,
  };
}

function scoreCompleteness(candidate: ResponseRecommendationCandidate) {
  const totalMandatory = candidate.coveredMandatoryCharges + candidate.missingMandatoryCharges;
  if (totalMandatory === 0) {
    return {
      scorePct: candidate.issueCount === 0 ? 100 : 80,
      detail: "No mandatory charge gap was detected for this comparison set.",
    };
  }

  const coveredRatio = (candidate.coveredMandatoryCharges / totalMandatory) * 100;
  const issuePenalty = Math.min(candidate.issueCount * 5, 25);
  const scorePct = clamp(coveredRatio - issuePenalty);
  return {
    scorePct,
    detail:
      candidate.missingMandatoryCharges === 0
        ? `All ${totalMandatory} mandatory charges are covered.`
        : `${candidate.missingMandatoryCharges} mandatory charge(s) are still missing.`,
  };
}

function scoreValidity(candidate: ResponseRecommendationCandidate) {
  const historyScore = candidate.historicalRecommendation?.metrics.rateValidityQualityPct ?? null;
  const hasCurrentValidity =
    typeof candidate.validity === "string" &&
    candidate.validity.trim() &&
    candidate.validity.trim().toUpperCase() !== "NOT PROVIDED";
  const currentScore = hasCurrentValidity ? 100 : 30;
  const scorePct =
    historyScore === null ? currentScore : clamp(historyScore * 0.5 + currentScore * 0.5);
  return {
    scorePct,
    detail: hasCurrentValidity
      ? "The current response includes a stated validity window."
      : "The current response is missing a clear validity window.",
  };
}

function scoreResponseTime(candidate: ResponseRecommendationCandidate) {
  const minutes = candidate.historicalRecommendation?.metrics.medianResponseMinutes ?? null;
  if (typeof minutes !== "number") {
    return {
      scorePct: 50,
      detail: "Historical response-time evidence is still limited.",
    };
  }

  const scorePct = clamp(100 - minutes / 18);
  return {
    scorePct,
    detail:
      minutes < 60
        ? `Historical median response time is ${minutes} minutes.`
        : `Historical median response time is ${(minutes / 60).toFixed(1)} hours.`,
  };
}

function scoreDataConfidence(candidate: ResponseRecommendationCandidate) {
  const parserConfidence =
    typeof candidate.overallConfidence === "number"
      ? clamp(candidate.overallConfidence * 100)
      : 60;
  const warningPenalty = Math.min(candidate.warningsCount * 12, 40);
  return {
    scorePct: clamp(parserConfidence - warningPenalty),
    detail:
      candidate.warningsCount > 0
        ? `The parsed response carries ${candidate.warningsCount} warning(s) that reduce confidence.`
        : "The current response parsed cleanly without warnings.",
  };
}

function buildWeightedTotal(factors: RateComparisonRecommendationFactor[]) {
  return Number(
    factors
      .reduce((sum, factor) => sum + (factor.scorePct ?? 0) * (factor.weightPct / 100), 0)
      .toFixed(1),
  );
}

function buildExplanation(
  candidate: ResponseRecommendationCandidate,
  factors: RateComparisonRecommendationFactor[],
  runnerUp: ResponseRecommendationCandidate | null,
) {
  const strongestFactors = factors
    .filter((factor) => typeof factor.scorePct === "number" && factor.scorePct >= 70)
    .sort((left, right) => (right.scorePct ?? 0) - (left.scorePct ?? 0))
    .slice(0, 3)
    .map((factor) => factor.label.toLowerCase());
  const coveragePhrase =
    candidate.missingMandatoryCharges === 0
      ? "covers the mandatory charge set"
      : `still misses ${candidate.missingMandatoryCharges} mandatory charge(s)`;
  const runnerUpPhrase =
    runnerUp && runnerUp.responseId !== candidate.responseId
      ? ` It outranks ${runnerUp.vendorName} after weighting cost, reliability, and confidence together.`
      : "";

  return `Recommended: ${candidate.vendorName} because it ${coveragePhrase}${
    strongestFactors.length > 0 ? `, scores strongly on ${strongestFactors.join(", ")}` : ""
  }.${runnerUpPhrase}`.trim();
}

export function buildAiBestRateRecommendation(params: {
  comparisonWorkspace: RateComparisonWorkspace;
  recommendationProfilesByVendorId?: Map<string, AgentRecommendationProfile>;
  generatedAt?: string | null;
}): RateComparisonRecommendationSnapshot {
  const candidates: ResponseRecommendationCandidate[] = params.comparisonWorkspace.responses.map(
    (response) => {
      const summary = params.comparisonWorkspace.agentSummaries.find(
        (entry) => entry.responseId === response.id,
      );
      return {
        responseId: response.id,
        vendorId: response.vendorId,
        vendorName: response.vendorName,
        comparableTotalInBaseCurrency: summary?.comparableTotalInBaseCurrency ?? null,
        missingMandatoryCharges: summary?.missingMandatoryCharges ?? 0,
        coveredMandatoryCharges: summary?.coveredMandatoryCharges ?? 0,
        issueCount: summary?.issueCount ?? 0,
        validity: response.validity,
        overallConfidence: response.overallConfidence,
        warningsCount: response.warnings.length,
        historicalRecommendation:
          response.vendorId && params.recommendationProfilesByVendorId
            ? params.recommendationProfilesByVendorId.get(response.vendorId) ?? null
            : null,
      };
    },
  );

  const scored = candidates.map((candidate) => {
    const landedBuyCost = scoreLandedBuyCost(candidate, candidates);
    const completeness = scoreCompleteness(candidate);
    const validity = scoreValidity(candidate);
    const responseTime = scoreResponseTime(candidate);
    const dataConfidence = scoreDataConfidence(candidate);
    const operationalReliability =
      candidate.historicalRecommendation?.metrics.operationalOutcomePct ?? 50;
    const competitiveness =
      candidate.historicalRecommendation?.metrics.competitivenessPct ?? 50;
    const bookingHistory = candidate.historicalRecommendation?.metrics.bookingRatePct ?? 50;

    const factors = [
      buildFactor(
        "LANDED_BUY_COST",
        "landed buy cost",
        settings.weights.landedBuyCost,
        landedBuyCost.scorePct,
        landedBuyCost.detail,
      ),
      buildFactor(
        "COMPLETENESS",
        "completeness",
        settings.weights.completeness,
        completeness.scorePct,
        completeness.detail,
      ),
      buildFactor(
        "VALIDITY",
        "validity",
        settings.weights.validity,
        validity.scorePct,
        validity.detail,
      ),
      buildFactor(
        "RESPONSE_TIME",
        "response time",
        settings.weights.responseTime,
        responseTime.scorePct,
        responseTime.detail,
      ),
      buildFactor(
        "OPERATIONAL_RELIABILITY",
        "operational reliability",
        settings.weights.operationalReliability,
        operationalReliability,
        typeof candidate.historicalRecommendation?.metrics.operationalOutcomePct === "number"
          ? `Historical operational outcomes succeeded in ${candidate.historicalRecommendation.metrics.operationalOutcomePct}% of similar enquiries.`
          : "Operational reliability history is still limited.",
      ),
      buildFactor(
        "HISTORICAL_COMPETITIVENESS",
        "historical competitiveness",
        settings.weights.historicalCompetitiveness,
        competitiveness,
        typeof candidate.historicalRecommendation?.metrics.competitivenessPct === "number"
          ? `Historical charge competitiveness is ${candidate.historicalRecommendation.metrics.competitivenessPct}%.`
          : "Historical competitiveness evidence is still limited.",
      ),
      buildFactor(
        "BOOKING_HISTORY",
        "booking history",
        settings.weights.bookingHistory,
        bookingHistory,
        typeof candidate.historicalRecommendation?.metrics.bookingRatePct === "number"
          ? `Historical booking conversion after selection is ${candidate.historicalRecommendation.metrics.bookingRatePct}%.`
          : "Booking conversion history is still limited.",
      ),
      buildFactor(
        "DATA_CONFIDENCE",
        "data confidence",
        settings.weights.dataConfidence,
        dataConfidence.scorePct,
        dataConfidence.detail,
      ),
    ];

    return {
      candidate,
      factors,
      totalScore: buildWeightedTotal(factors),
    };
  });

  const ranked = [...scored].sort((left, right) => {
    if (left.totalScore !== right.totalScore) {
      return right.totalScore - left.totalScore;
    }
    return (
      (left.candidate.comparableTotalInBaseCurrency ?? Number.POSITIVE_INFINITY) -
      (right.candidate.comparableTotalInBaseCurrency ?? Number.POSITIVE_INFINITY)
    );
  });

  const best = ranked[0] ?? null;
  const runnerUp = ranked[1]?.candidate ?? null;
  if (!best) {
    return {
      responseId: null,
      vendorName: null,
      totalScore: null,
      explanation: null,
      factors: [],
      generatedAt: params.generatedAt ?? null,
    };
  }

  return {
    responseId: best.candidate.responseId,
    vendorName: best.candidate.vendorName,
    totalScore: best.totalScore,
    explanation: buildExplanation(best.candidate, best.factors, runnerUp),
    factors: best.factors,
    generatedAt: params.generatedAt ?? new Date().toISOString(),
  };
}
