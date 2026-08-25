import {
  getCurrentFinalizedBuyRateVersion,
  type PricingSnapshotLineRecord,
  type PricingSnapshotRecord,
  type RateWorkflowSnapshot,
} from "../rate-workflow";

function createPricingSnapshotId(finalizedVersionId: string) {
  return `pricing:${finalizedVersionId}:${Date.now().toString(36)}`;
}

function createPricingLineId(finalizedLineId: string) {
  return `pricing-line:${finalizedLineId}:${Date.now().toString(36)}`;
}

export function buildPricingSnapshot(params: {
  workflow: RateWorkflowSnapshot;
  updatedById: string;
  notes?: string | null;
  lines?: Array<{
    finalizedLineId: string;
    quantity?: number | null;
    sellAmount?: number | null;
    included?: boolean | null;
    notes?: string | null;
  }>;
}) {
  const finalizedVersion = getCurrentFinalizedBuyRateVersion(params.workflow);
  if (!finalizedVersion) {
    throw new Error("Finalize buy rates before preparing the pricing worksheet.");
  }

  const existingSnapshot =
    params.workflow.pricingSnapshot &&
    params.workflow.pricingSnapshot.basedOnFinalizedVersionId === finalizedVersion.id
      ? params.workflow.pricingSnapshot
      : null;

  const inputByLineId = new Map(
    (params.lines ?? []).map((entry) => [entry.finalizedLineId, entry]),
  );
  const existingByLineId = new Map(
    (existingSnapshot?.lines ?? []).map((entry) => [entry.finalizedLineId, entry]),
  );

  const lines: PricingSnapshotLineRecord[] = finalizedVersion.lines.map((line) => {
    const input = inputByLineId.get(line.id);
    const existing = existingByLineId.get(line.id);
    const quantity = Math.max(
      1,
      Number(input?.quantity ?? existing?.quantity ?? 1) || 1,
    );
    const buyAmount = Number(line.normalizedAmountInBaseCurrency ?? 0);
    const sellAmount = Math.max(
      0,
      Number(input?.sellAmount ?? existing?.sellAmount ?? buyAmount) || 0,
    );
    const marginAmount = sellAmount - buyAmount;

    return {
      id: existing?.id ?? createPricingLineId(line.id),
      finalizedLineId: line.id,
      chargeCode: line.chargeCode,
      chargeName: line.chargeName,
      department: line.department,
      unit: line.originalUnit || "Shipment",
      quantity,
      currency: finalizedVersion.baseCurrency,
      buyAmount,
      sellAmount,
      marginAmount,
      marginPercent: buyAmount > 0 ? (marginAmount / buyAmount) * 100 : null,
      taxPercent: line.taxPercent,
      vendorName: line.vendorName,
      included: input?.included ?? existing?.included ?? true,
      notes:
        typeof input?.notes === "string" && input.notes.trim()
          ? input.notes.trim()
          : existing?.notes ?? null,
    };
  });

  const includedLines = lines.filter((entry) => entry.included);
  const buyAmount = includedLines.reduce(
    (sum, entry) => sum + entry.buyAmount * entry.quantity,
    0,
  );
  const sellAmount = includedLines.reduce(
    (sum, entry) => sum + entry.sellAmount * entry.quantity,
    0,
  );
  const marginAmount = sellAmount - buyAmount;

  return {
    id: existingSnapshot?.id ?? createPricingSnapshotId(finalizedVersion.id),
    basedOnFinalizedVersionId: finalizedVersion.id,
    basedOnFinalizedVersionLabel: finalizedVersion.versionLabel,
    pricingMode: "LINE_SELL_RATE",
    currency: finalizedVersion.baseCurrency,
    createdAt: existingSnapshot?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedById: params.updatedById,
    notes:
      typeof params.notes === "string" && params.notes.trim()
        ? params.notes.trim()
        : existingSnapshot?.notes ?? null,
    totals: {
      buyAmount,
      sellAmount,
      marginAmount,
      marginPercent: buyAmount > 0 ? (marginAmount / buyAmount) * 100 : null,
      includedLineCount: includedLines.length,
    },
    lines,
  } satisfies PricingSnapshotRecord;
}
