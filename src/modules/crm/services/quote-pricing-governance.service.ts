import type {
  QuotePricingFreshnessStatus,
  QuotePricingTrace,
  QuoteWorkflowContext,
} from "@/modules/crm/components/quotes/lib/types";
import {
  getCurrentFinalizedBuyRateVersion,
  getRateWorkflowSnapshot,
} from "@/modules/crm/rate-workflow";

function getStoredPricingTrace(
  workflowContext: QuoteWorkflowContext | null | undefined,
) {
  const pricingTrace = workflowContext?.pricingTrace;

  return {
    snapshotId: pricingTrace?.snapshotId ?? workflowContext?.pricingSnapshotId ?? null,
    snapshotVersionLabel:
      pricingTrace?.snapshotVersionLabel ??
      workflowContext?.pricingSnapshotVersionLabel ??
      null,
    sellTotal: pricingTrace?.sellTotal ?? workflowContext?.pricingSellTotal ?? null,
    buyTotal: pricingTrace?.buyTotal ?? workflowContext?.pricingBuyTotal ?? null,
    marginAmount:
      pricingTrace?.marginAmount ?? workflowContext?.pricingMarginAmount ?? null,
    marginPercent:
      pricingTrace?.marginPercent ?? workflowContext?.pricingMarginPercent ?? null,
  };
}

function buildTrace(
  status: QuotePricingFreshnessStatus,
  params: Omit<QuotePricingTrace, "status">,
): QuotePricingTrace {
  return {
    status,
    ...params,
  };
}

export function buildQuotePricingTrace(params: {
  workflowContext?: QuoteWorkflowContext | null;
  linkedLeadEnquiryDetails?: unknown;
  checkedAt?: string;
}): QuotePricingTrace {
  const { workflowContext = null, linkedLeadEnquiryDetails, checkedAt } = params;
  const stored = getStoredPricingTrace(workflowContext);
  const checkedAtValue = checkedAt ?? new Date().toISOString();

  if (!linkedLeadEnquiryDetails) {
    return buildTrace("UNLINKED", {
      ...stored,
      message: "This quotation is not linked to a live enquiry pricing workflow.",
      checkedAt: checkedAtValue,
    });
  }

  const workflow = getRateWorkflowSnapshot(linkedLeadEnquiryDetails);
  const currentFinalizedVersion = getCurrentFinalizedBuyRateVersion(workflow);
  const currentPricingSnapshot = workflow.pricingSnapshot;

  if (!stored.snapshotId) {
    return buildTrace("MISSING", {
      ...stored,
      currentSnapshotId: currentPricingSnapshot?.id ?? null,
      currentSnapshotVersionLabel:
        currentPricingSnapshot?.basedOnFinalizedVersionLabel ?? null,
      currentFinalizedVersionId: currentFinalizedVersion?.id ?? null,
      currentFinalizedVersionLabel:
        currentFinalizedVersion?.versionLabel ?? null,
      message:
        "This quotation was created without a saved pricing worksheet. Save the current pricing worksheet and recreate the quote before approval.",
      checkedAt: checkedAtValue,
    });
  }

  if (!currentFinalizedVersion || !currentPricingSnapshot) {
    return buildTrace("MISSING", {
      ...stored,
      currentSnapshotId: currentPricingSnapshot?.id ?? null,
      currentSnapshotVersionLabel:
        currentPricingSnapshot?.basedOnFinalizedVersionLabel ?? null,
      currentFinalizedVersionId: currentFinalizedVersion?.id ?? null,
      currentFinalizedVersionLabel:
        currentFinalizedVersion?.versionLabel ?? null,
      message:
        "The linked enquiry no longer has a current finalized buy-rate and pricing worksheet pair for approval-safe quoting.",
      checkedAt: checkedAtValue,
    });
  }

  if (stored.snapshotId !== currentPricingSnapshot.id) {
    return buildTrace("STALE", {
      ...stored,
      currentSnapshotId: currentPricingSnapshot.id,
      currentSnapshotVersionLabel:
        currentPricingSnapshot.basedOnFinalizedVersionLabel,
      currentFinalizedVersionId: currentFinalizedVersion.id,
      currentFinalizedVersionLabel: currentFinalizedVersion.versionLabel,
      message: `This quotation is based on pricing ${stored.snapshotVersionLabel || stored.snapshotId}, but the enquiry now uses ${currentPricingSnapshot.basedOnFinalizedVersionLabel}. Recreate the quote from the latest pricing worksheet before approval.`,
      checkedAt: checkedAtValue,
    });
  }

  return buildTrace("CURRENT", {
    ...stored,
    currentSnapshotId: currentPricingSnapshot.id,
    currentSnapshotVersionLabel: currentPricingSnapshot.basedOnFinalizedVersionLabel,
    currentFinalizedVersionId: currentFinalizedVersion.id,
    currentFinalizedVersionLabel: currentFinalizedVersion.versionLabel,
    message: `This quotation is aligned to the current pricing worksheet for ${currentPricingSnapshot.basedOnFinalizedVersionLabel}.`,
    checkedAt: checkedAtValue,
  });
}

export function isQuotePricingGovernanceBlocked(
  pricingTrace: QuotePricingTrace | null | undefined,
) {
  return pricingTrace?.status === "MISSING" || pricingTrace?.status === "STALE";
}
