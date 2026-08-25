import comparisonSettings from "../config/rate-comparison-settings.json";
import type {
  AgentRateLineRecord,
  AgentRateResponseRecord,
  EnquiryChargeEntry,
  RateComparisonSelectionRecord,
  RateWorkflowSnapshot,
} from "../rate-workflow";

export type ComparisonIssueCode =
  | "MISSING_MANDATORY_CHARGE"
  | "UNCLEAR_INCLUSION"
  | "MISMATCHED_CURRENCY"
  | "MISSING_EXCHANGE_RATE"
  | "INVALID_UNIT"
  | "RATE_VALIDITY_ISSUE"
  | "CONTAINER_TYPE_MISMATCH"
  | "AMOUNT_NOT_PROVIDED";

export type ComparisonIssue = {
  code: ComparisonIssueCode;
  severity: "warning" | "danger";
  message: string;
  blocksComparison: boolean;
};

export type ComparisonAgentCell = {
  responseId: string;
  requestId: string;
  vendorId: string | null;
  vendorName: string;
  lineId: string | null;
  canonicalChargeCode: string;
  originalAmount: number | null;
  originalCurrency: string | null;
  originalUnit: string | null;
  computedAmountInBaseCurrency: number | null;
  quantityMultiplier: number | null;
  taxPercent: number | null;
  minimumChargeAmount: number | null;
  comparable: boolean;
  isSelected: boolean;
  issues: ComparisonIssue[];
  line: AgentRateLineRecord | null;
};

export type ComparisonChargeRow = {
  chargeCode: string;
  chargeName: string;
  mandatory: boolean;
  department: EnquiryChargeEntry["department"];
  unitOptions: EnquiryChargeEntry["unitOptions"];
  cells: ComparisonAgentCell[];
  bestResponseId: string | null;
  bestAmountInBaseCurrency: number | null;
  rowIssues: ComparisonIssue[];
};

export type ComparisonAgentSummary = {
  responseId: string;
  vendorName: string;
  comparableTotalInBaseCurrency: number | null;
  coveredMandatoryCharges: number;
  missingMandatoryCharges: number;
  issueCount: number;
  eligibleForRecommendation: boolean;
  selected: boolean;
};

export type RateComparisonWorkspace = {
  baseCurrency: string;
  responses: AgentRateResponseRecord[];
  chargeRows: ComparisonChargeRow[];
  agentSummaries: ComparisonAgentSummary[];
  recommendedEntireAgentResponseId: string | null;
  recommendedMixedChargeSelections: Array<{
    chargeCode: string;
    responseId: string;
    lineId: string | null;
  }>;
  recommendedMixedTotalInBaseCurrency: number | null;
  selection: RateComparisonSelectionRecord;
};

type ChargeSelectionDraft = {
  chargeCode: string;
  responseId: string;
  lineId: string | null;
};

type ComparisonBasis = {
  volumeCbm: number | null;
  weightKg: number | null;
  containerCount: number;
  containerType: string | null;
};

type ComparisonSettings = {
  baseCurrency: string;
  exchangeRates: Record<string, number>;
};

const settings = comparisonSettings as ComparisonSettings;

function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseFirstNumber(value: unknown) {
  const text = String(value ?? "").replace(/,/g, " ");
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePercent(value: string | null) {
  if (!value) return null;
  const match = value.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseMinimumCharge(value: string | null) {
  return parseFirstNumber(value);
}

function parseValidityDate(value: string | null) {
  if (!value) return null;

  const normalized = value.trim();
  if (!normalized) return null;

  const isoDate = normalized.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoDate) {
    return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;
  }

  const slashDate = normalized.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (!slashDate) return null;

  const day = slashDate[1].padStart(2, "0");
  const month = slashDate[2].padStart(2, "0");
  const year = slashDate[3].length === 2 ? `20${slashDate[3]}` : slashDate[3];
  return `${year}-${month}-${day}`;
}

function getComparisonBasis(enquiryDetails: unknown) {
  const root =
    enquiryDetails && typeof enquiryDetails === "object"
      ? (enquiryDetails as Record<string, unknown>)
      : {};

  return {
    volumeCbm:
      parseFirstNumber(root.cbm) ??
      parseFirstNumber(root.volume) ??
      null,
    weightKg: parseFirstNumber(root.weight) ?? null,
    containerCount:
      parseFirstNumber(root.containerCount) ??
      parseFirstNumber(root.containers) ??
      1,
    containerType: String(root.containerType ?? "").trim() || null,
  } satisfies ComparisonBasis;
}

function getUnitCategory(line: AgentRateLineRecord) {
  const unit = normalizeText(line.unit);
  const basis = normalizeText(line.quantityBasis);

  if (unit === "WM" || basis.includes("W_M") || unit === "CBM" || basis.includes("CBM")) {
    return "WM" as const;
  }
  if (unit === "BL" || basis.includes("BL") || basis.includes("AWB") || unit === "AWB") {
    return "BL" as const;
  }
  if (unit === "SHIPMENT" || basis.includes("SHIPMENT")) {
    return "SHIPMENT" as const;
  }
  if (unit === "KG" || basis.includes("KG")) {
    return "KG" as const;
  }
  if (unit === "CONTAINER" || unit === "CNTR" || basis.includes("CONTAINER")) {
    return "CONTAINER" as const;
  }

  return null;
}

function getQuantityMultiplier(unitCategory: ReturnType<typeof getUnitCategory>, basis: ComparisonBasis) {
  if (unitCategory === "WM") {
    const wmQuantity = Math.max(
      basis.volumeCbm ?? 0,
      basis.weightKg ? basis.weightKg / 1000 : 0,
    );
    return wmQuantity > 0 ? wmQuantity : null;
  }
  if (unitCategory === "BL" || unitCategory === "SHIPMENT") {
    return 1;
  }
  if (unitCategory === "KG") {
    return basis.weightKg && basis.weightKg > 0 ? basis.weightKg : null;
  }
  if (unitCategory === "CONTAINER") {
    return basis.containerCount > 0 ? basis.containerCount : 1;
  }
  return null;
}

function getExchangeRate(currency: string, baseCurrency: string) {
  const normalizedCurrency = normalizeText(currency);
  const normalizedBase = normalizeText(baseCurrency);
  if (!normalizedCurrency || !normalizedBase) return null;
  if (normalizedCurrency === normalizedBase) return 1;

  const sourceRate = settings.exchangeRates[normalizedCurrency];
  const baseRate = settings.exchangeRates[normalizedBase];
  if (
    typeof sourceRate !== "number" ||
    !Number.isFinite(sourceRate) ||
    typeof baseRate !== "number" ||
    !Number.isFinite(baseRate) ||
    baseRate <= 0
  ) {
    return null;
  }

  return sourceRate / baseRate;
}

function createIssue(
  code: ComparisonIssueCode,
  message: string,
  blocksComparison: boolean,
): ComparisonIssue {
  return {
    code,
    severity: blocksComparison ? "danger" : "warning",
    message,
    blocksComparison,
  };
}

function hasContainerMismatch(line: AgentRateLineRecord, basis: ComparisonBasis) {
  if (!basis.containerType) return false;
  const requested = normalizeText(basis.containerType);
  if (!requested) return false;
  const supplied =
    normalizeText(line.containerText) ||
    normalizeText(line.standardRateReference?.containerType ?? null);
  return Boolean(supplied) && supplied !== requested;
}

function selectBestLineForCharge(
  response: AgentRateResponseRecord,
  chargeCode: string,
  basis: ComparisonBasis,
) {
  const candidates = response.lines.filter(
    (line) => normalizeText(line.canonicalChargeCode) === normalizeText(chargeCode),
  );
  if (candidates.length === 0) return null;

  return [...candidates].sort((left, right) => {
    const leftContainerMatch = hasContainerMismatch(left, basis) ? 0 : 1;
    const rightContainerMatch = hasContainerMismatch(right, basis) ? 0 : 1;
    if (leftContainerMatch !== rightContainerMatch) {
      return rightContainerMatch - leftContainerMatch;
    }

    const leftExplicit = left.standardRateReference?.explicitAgentOverride ? 1 : 0;
    const rightExplicit = right.standardRateReference?.explicitAgentOverride ? 1 : 0;
    if (leftExplicit !== rightExplicit) {
      return rightExplicit - leftExplicit;
    }

    const leftConfidence = left.confidenceScore ?? 0;
    const rightConfidence = right.confidenceScore ?? 0;
    return rightConfidence - leftConfidence;
  })[0];
}

function buildAgentCell(params: {
  charge: EnquiryChargeEntry;
  response: AgentRateResponseRecord;
  line: AgentRateLineRecord | null;
  basis: ComparisonBasis;
  baseCurrency: string;
  selection: RateComparisonSelectionRecord;
}) {
  const { charge, response, line, basis, baseCurrency, selection } = params;
  const selectionMatch =
    selection.mode === "ENTIRE_AGENT"
      ? selection.selectedResponseId === response.id
      : selection.chargeSelections.some(
          (entry) =>
            entry.chargeCode === charge.code &&
            entry.responseId === response.id &&
            (!entry.lineId || entry.lineId === line?.id),
        );

  if (!line) {
    return {
      responseId: response.id,
      requestId: response.requestId,
      vendorId: response.vendorId,
      vendorName: response.vendorName,
      lineId: null,
      canonicalChargeCode: charge.code,
      originalAmount: null,
      originalCurrency: null,
      originalUnit: null,
      computedAmountInBaseCurrency: null,
      quantityMultiplier: null,
      taxPercent: null,
      minimumChargeAmount: null,
      comparable: false,
      isSelected: selectionMatch,
      issues: charge.mandatory
        ? [
            createIssue(
              "MISSING_MANDATORY_CHARGE",
              "Mandatory charge missing from this response.",
              true,
            ),
          ]
        : [],
      line: null,
    } satisfies ComparisonAgentCell;
  }

  const issues: ComparisonIssue[] = [];
  if (line.amountMissing || Number(line.amount) <= 0) {
    issues.push(
      createIssue("AMOUNT_NOT_PROVIDED", "Amount was not provided clearly.", true),
    );
  }
  if (line.inclusionStatus === "UNSPECIFIED") {
    issues.push(
      createIssue(
        "UNCLEAR_INCLUSION",
        "Inclusion or exclusion was not specified clearly.",
        false,
      ),
    );
  }

  const unitCategory = getUnitCategory(line);
  if (!unitCategory || !charge.unitOptions.includes(unitCategory)) {
    issues.push(
      createIssue(
        "INVALID_UNIT",
        `Unit ${line.unit || "Not Provided"} is not directly comparable for this charge.`,
        true,
      ),
    );
  }

  if (hasContainerMismatch(line, basis)) {
    issues.push(
      createIssue(
        "CONTAINER_TYPE_MISMATCH",
        "Container type does not match the current enquiry basis.",
        true,
      ),
    );
  }

  const validityDate = parseValidityDate(response.validity);
  if (validityDate && validityDate < "2026-08-24") {
    issues.push(
      createIssue(
        "RATE_VALIDITY_ISSUE",
        `Rate validity expired on ${validityDate}.`,
        true,
      ),
    );
  }

  const quantityMultiplier = getQuantityMultiplier(unitCategory, basis);
  if (
    (unitCategory === "WM" || unitCategory === "KG") &&
    (quantityMultiplier === null || quantityMultiplier <= 0)
  ) {
    issues.push(
      createIssue(
        "INVALID_UNIT",
        "Enquiry quantity basis is missing for this rate unit.",
        true,
      ),
    );
  }

  const lineCurrency = line.currency || response.currency || baseCurrency;
  const exchangeRate = getExchangeRate(lineCurrency, baseCurrency);
  if (!exchangeRate) {
    issues.push(
      createIssue(
        normalizeText(lineCurrency) === normalizeText(baseCurrency)
          ? "MISMATCHED_CURRENCY"
          : "MISSING_EXCHANGE_RATE",
        `No configured exchange rate is available to compare ${lineCurrency} against ${baseCurrency}.`,
        true,
      ),
    );
  }

  const baseAmount = Number(line.amount) || 0;
  const quantityAdjustedAmount =
    quantityMultiplier && quantityMultiplier > 0 ? baseAmount * quantityMultiplier : baseAmount;
  const minimumChargeAmount = parseMinimumCharge(line.minimumCharge);
  const beforeTax =
    typeof minimumChargeAmount === "number" && minimumChargeAmount > quantityAdjustedAmount
      ? minimumChargeAmount
      : quantityAdjustedAmount;
  const taxPercent = parsePercent(line.taxText);
  const finalAmount =
    beforeTax *
    (taxPercent && taxPercent > 0 ? 1 + taxPercent / 100 : 1) *
    (exchangeRate || 0);

  const blockingIssue = issues.some((issue) => issue.blocksComparison);

  return {
    responseId: response.id,
    requestId: response.requestId,
    vendorId: response.vendorId,
    vendorName: response.vendorName,
    lineId: line.id,
    canonicalChargeCode: charge.code,
    originalAmount: Number.isFinite(baseAmount) ? baseAmount : null,
    originalCurrency: lineCurrency || null,
    originalUnit: line.unit || null,
    computedAmountInBaseCurrency:
      !blockingIssue && Number.isFinite(finalAmount) && finalAmount > 0 ? finalAmount : null,
    quantityMultiplier,
    taxPercent,
    minimumChargeAmount: minimumChargeAmount ?? null,
    comparable:
      !blockingIssue && Number.isFinite(finalAmount) && finalAmount > 0,
    isSelected: selectionMatch,
    issues,
    line,
  } satisfies ComparisonAgentCell;
}

function createDefaultSelection(workflow: RateWorkflowSnapshot): RateComparisonSelectionRecord {
  return workflow.comparisonSelection || {
    mode: "PER_CHARGE",
    selectedResponseId: null,
    chargeSelections: [],
    savedAt: null,
    savedById: null,
  };
}

export function buildRateComparisonWorkspace(params: {
  workflow: RateWorkflowSnapshot;
  enquiryDetails: unknown;
}) {
  const { workflow, enquiryDetails } = params;
  const baseCurrency = settings.baseCurrency || "INR";
  const basis = getComparisonBasis(enquiryDetails);
  const charges = [...workflow.freightCharges, ...workflow.customsCharges].filter(
    (charge) => charge.active,
  );
  const selection = createDefaultSelection(workflow);

  const chargeRows = charges.map((charge) => {
    const cells = workflow.rateResponses.map((response) =>
      buildAgentCell({
        charge,
        response,
        line: selectBestLineForCharge(response, charge.code, basis),
        basis,
        baseCurrency,
        selection,
      }),
    );

    const comparableCells = cells
      .filter((cell) => cell.comparable && cell.computedAmountInBaseCurrency !== null)
      .sort(
        (left, right) =>
          (left.computedAmountInBaseCurrency ?? Number.POSITIVE_INFINITY) -
          (right.computedAmountInBaseCurrency ?? Number.POSITIVE_INFINITY),
      );

    const rowIssues =
      charge.mandatory && comparableCells.length === 0
        ? [
            createIssue(
              "MISSING_MANDATORY_CHARGE",
              "No comparable mandatory charge is available across the current agent replies.",
              true,
            ),
          ]
        : [];

    return {
      chargeCode: charge.code,
      chargeName: charge.name,
      mandatory: charge.mandatory,
      department: charge.department,
      unitOptions: charge.unitOptions,
      cells,
      bestResponseId: comparableCells[0]?.responseId ?? null,
      bestAmountInBaseCurrency: comparableCells[0]?.computedAmountInBaseCurrency ?? null,
      rowIssues,
    } satisfies ComparisonChargeRow;
  });

  const agentSummaries = workflow.rateResponses.map((response) => {
    const matchingCells = chargeRows.map(
      (row) => row.cells.find((cell) => cell.responseId === response.id) ?? null,
    );
    const mandatoryRows = chargeRows.filter((row) => row.mandatory);
    const coveredMandatoryCharges = mandatoryRows.filter((row) =>
      row.cells.some((cell) => cell.responseId === response.id && cell.comparable),
    ).length;
    const missingMandatoryCharges = mandatoryRows.length - coveredMandatoryCharges;
    const issueCount = matchingCells.reduce(
      (sum, cell) => sum + (cell ? cell.issues.length : 0),
      0,
    );
    const total = matchingCells.reduce((sum, cell) => {
      if (!cell?.comparable || cell.computedAmountInBaseCurrency === null) {
        return sum;
      }
      return sum + cell.computedAmountInBaseCurrency;
    }, 0);
    const eligibleForRecommendation = missingMandatoryCharges === 0;

    return {
      responseId: response.id,
      vendorName: response.vendorName,
      comparableTotalInBaseCurrency:
        eligibleForRecommendation && total > 0 ? total : null,
      coveredMandatoryCharges,
      missingMandatoryCharges,
      issueCount,
      eligibleForRecommendation,
      selected: selection.mode === "ENTIRE_AGENT" && selection.selectedResponseId === response.id,
    } satisfies ComparisonAgentSummary;
  });

  const recommendedEntireAgent =
    [...agentSummaries]
      .filter(
        (entry) =>
          entry.eligibleForRecommendation &&
          typeof entry.comparableTotalInBaseCurrency === "number",
      )
      .sort(
        (left, right) =>
          (left.comparableTotalInBaseCurrency ?? Number.POSITIVE_INFINITY) -
          (right.comparableTotalInBaseCurrency ?? Number.POSITIVE_INFINITY),
      )[0] ?? null;

  const recommendedMixedChargeSelections: ChargeSelectionDraft[] = chargeRows
    .map<ChargeSelectionDraft | null>((row) => {
      const bestCell = row.cells.find((cell) => cell.responseId === row.bestResponseId);
      if (!bestCell || !bestCell.lineId) return null;
      return {
        chargeCode: row.chargeCode,
        responseId: bestCell.responseId,
        lineId: bestCell.lineId,
      };
    })
    .filter((entry): entry is ChargeSelectionDraft => entry !== null);

  const mixedIncomplete = chargeRows.some((row) => row.mandatory && !row.bestResponseId);
  const recommendedMixedTotalInBaseCurrency = mixedIncomplete
    ? null
    : chargeRows.reduce((sum, row) => sum + (row.bestAmountInBaseCurrency ?? 0), 0);

  return {
    baseCurrency,
    responses: workflow.rateResponses,
    chargeRows,
    agentSummaries,
    recommendedEntireAgentResponseId: recommendedEntireAgent?.responseId ?? null,
    recommendedMixedChargeSelections,
    recommendedMixedTotalInBaseCurrency:
      recommendedMixedTotalInBaseCurrency && recommendedMixedTotalInBaseCurrency > 0
        ? recommendedMixedTotalInBaseCurrency
        : null,
    selection,
  } satisfies RateComparisonWorkspace;
}
