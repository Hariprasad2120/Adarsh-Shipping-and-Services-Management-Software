import type {
  RateComparisonChargeSelection,
  RateWorkflowSnapshot,
  FinalizedBuyRateVersionRecord,
  FinalizedBuyRateLineRecord,
} from "../rate-workflow";
import { buildRateComparisonWorkspace } from "./rate-comparison.service";

function createVersionId(versionNumber: number) {
  return `buy-rate:${versionNumber}:${Date.now().toString(36)}`;
}

function createLineId(versionNumber: number, chargeCode: string) {
  return `buy-rate-line:${versionNumber}:${chargeCode}:${Date.now().toString(36)}`;
}

export function buildFinalizedBuyRateVersion(params: {
  workflow: RateWorkflowSnapshot;
  enquiryDetails: unknown;
  createdById: string;
  notes?: string | null;
}) {
  const { workflow, enquiryDetails, createdById } = params;
  const recommendation = workflow.rateRecommendation;
  if (!recommendation) {
    throw new Error("Generate and decide on a best-rate recommendation before finalizing buy rates.");
  }

  if (recommendation.decision.status !== "ACCEPTED" && recommendation.decision.status !== "OVERRIDDEN") {
    throw new Error("Accept or override the recommendation before finalizing buy rates.");
  }

  const decision = recommendation.decision;
  const workspace = buildRateComparisonWorkspace({
    workflow,
    enquiryDetails,
  });
  const finalizedAt = new Date().toISOString();
  const previousVersionNumber = workflow.finalizedBuyRateVersions.at(-1)?.versionNumber ?? 0;
  const versionNumber = previousVersionNumber + 1;
  const selectedMode = decision.selectedMode;

  if (!selectedMode) {
    throw new Error("No final comparison mode was stored with the recommendation decision.");
  }

  const selectedChargeMap = new Map<string, RateComparisonChargeSelection>(
    (selectedMode === "PER_CHARGE" ? decision.selectedChargeSelections : []).map((entry) => [
      entry.chargeCode,
      entry,
    ]),
  );

  const lineDrafts: Array<FinalizedBuyRateLineRecord | null> = workspace.chargeRows.map((row) => {
      const selectedCell =
        selectedMode === "ENTIRE_AGENT"
          ? row.cells.find((cell) => cell.responseId === decision.selectedResponseId)
          : row.cells.find(
              (cell) => cell.responseId === selectedChargeMap.get(row.chargeCode)?.responseId,
            );

      if (!selectedCell?.comparable || !selectedCell.line) {
        if (row.mandatory) {
          throw new Error(
            `Mandatory charge ${row.chargeName} does not have a comparable finalized source.`,
          );
        }
        return null;
      }

      const response = workspace.responses.find(
        (entry) => entry.id === selectedCell.responseId,
      );

      return {
        id: createLineId(versionNumber, row.chargeCode),
        chargeCode: row.chargeCode,
        chargeName: row.chargeName,
        department: row.department,
        vendorId: selectedCell.vendorId,
        vendorName: selectedCell.vendorName,
        requestId: selectedCell.requestId,
        responseId: selectedCell.responseId,
        lineId: selectedCell.lineId,
        originalAmount: selectedCell.originalAmount,
        originalCurrency: selectedCell.originalCurrency,
        originalUnit: selectedCell.originalUnit,
        normalizedAmountInBaseCurrency: selectedCell.computedAmountInBaseCurrency,
        normalizedCurrency: workspace.baseCurrency,
        quantityMultiplier: selectedCell.quantityMultiplier,
        minimumChargeAmount: selectedCell.minimumChargeAmount,
        taxPercent: selectedCell.taxPercent,
        validity: response?.validity ?? null,
        carrier: response?.carrier ?? null,
        routing: response?.routing ?? null,
        transit: response?.transit ?? null,
        sourceMode: selectedMode,
        recommended:
          selectedMode === recommendation.recommendedMode &&
          (selectedMode === "ENTIRE_AGENT"
            ? decision.selectedResponseId === recommendation.recommendedResponseId
            : decision.selectedChargeSelections.every(
                (entry) =>
                  recommendation.recommendedChargeSelections.some(
                    (recommended) =>
                      recommended.chargeCode === entry.chargeCode &&
                      recommended.responseId === entry.responseId,
                  ),
              )),
        overriddenRecommendation: recommendation.decision.status === "OVERRIDDEN",
        finalizedAt,
      };
    });
  const lines: FinalizedBuyRateLineRecord[] = lineDrafts.filter(
    (entry): entry is FinalizedBuyRateLineRecord => entry !== null,
  );

  const totalInBaseCurrency = lines.reduce(
    (sum, line) => sum + (line.normalizedAmountInBaseCurrency ?? 0),
    0,
  );

  return {
    id: createVersionId(versionNumber),
    versionNumber,
    versionLabel: `R${versionNumber}`,
    createdAt: finalizedAt,
    createdById,
    sourceRecommendationGeneratedAt: recommendation.generatedAt,
    decisionStatus: recommendation.decision.status,
    selectedMode,
    selectedResponseId: selectedMode === "ENTIRE_AGENT" ? decision.selectedResponseId : null,
    selectedChargeSelections:
      selectedMode === "PER_CHARGE" ? decision.selectedChargeSelections : [],
    baseCurrency: workspace.baseCurrency,
    totalInBaseCurrency,
    notes:
      typeof params.notes === "string" && params.notes.trim() ? params.notes.trim() : null,
    lines,
  } satisfies FinalizedBuyRateVersionRecord;
}
