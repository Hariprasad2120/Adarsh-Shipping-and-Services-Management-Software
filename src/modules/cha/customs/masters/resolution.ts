import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { ExportItemDraftInput, ExportSupportingDocumentDraftInput } from "../filing/export-schemas";
import type { ImportItemDraftInput, ImportSupportingDocumentDraftInput } from "../filing/import-schemas";

type MasterRowWithSource = {
  id: string;
  datasetVersion: string;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  sourceRun?: {
    datasetVersion: string;
    sourceName: string;
    sourceReference: string | null;
    sourceEffectiveDate: Date | null;
  } | null;
} & Record<string, unknown>;

export type ResolutionCandidate = {
  id: string;
  code: string;
  label: string;
  datasetVersion: string;
  sourceName: string | null;
  sourceReference: string | null;
  sourceEffectiveDate: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
};

export type MasterResolution<T> =
  | {
      status: "resolved";
      selected: {
        master: Omit<T, "sourceRun">;
        source: {
          datasetVersion: string;
          sourceName: string;
          sourceReference: string | null;
          sourceEffectiveDate: Date | null;
        } | null;
      };
      candidates: ResolutionCandidate[];
      requirement: null;
    }
  | {
      status: "missing" | "ambiguous";
      selected: null;
      candidates: ResolutionCandidate[];
      requirement: string;
    };

export type ImportItemResolutionSummary = {
  ritc: MasterResolution<Record<string, unknown>>;
  uom: MasterResolution<Record<string, unknown>>;
  scheme: MasterResolution<Record<string, unknown>>;
  bcd: MasterResolution<Record<string, unknown>>;
  aidc: MasterResolution<Record<string, unknown>>;
  cess: MasterResolution<Record<string, unknown>>;
};

export type ExportItemResolutionSummary = {
  ritc: MasterResolution<Record<string, unknown>>;
  uom: MasterResolution<Record<string, unknown>>;
  scheme: MasterResolution<Record<string, unknown>>;
  drawback: MasterResolution<Record<string, unknown>>;
  rodtep: MasterResolution<Record<string, unknown>>;
  rosctl: MasterResolution<Record<string, unknown>>;
  singleWindow: {
    status: "missing" | "resolved" | "ambiguous";
    candidates: ResolutionCandidate[];
    requirement: string | null;
  };
};

export type SupportingDocumentResolutionSummary = {
  document: MasterResolution<Record<string, unknown>>;
};

function validityWhere(validOn: Date) {
  return {
    AND: [
      { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: validOn } }] },
      { OR: [{ effectiveTo: null }, { effectiveTo: { gte: validOn } }] },
    ],
  };
}

function decimalText(value: unknown) {
  if (value instanceof Prisma.Decimal) return value.toFixed();
  if (typeof value === "number") return value.toString();
  if (typeof value === "string") return value.trim();
  return "";
}

function isoDate(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function buildCandidate(
  row: MasterRowWithSource,
  code: string,
  label: string,
): ResolutionCandidate {
  return {
    id: row.id,
    code,
    label,
    datasetVersion: row.datasetVersion,
    sourceName: row.sourceRun?.sourceName ?? null,
    sourceReference: row.sourceRun?.sourceReference ?? null,
    sourceEffectiveDate: isoDate(row.sourceRun?.sourceEffectiveDate ?? null),
    effectiveFrom: isoDate(row.effectiveFrom),
    effectiveTo: isoDate(row.effectiveTo),
  };
}

function withSource<T extends MasterRowWithSource>(row: T) {
  const { sourceRun, ...master } = row;
  return {
    master,
    source: sourceRun
      ? {
          datasetVersion: sourceRun.datasetVersion,
          sourceName: sourceRun.sourceName,
          sourceReference: sourceRun.sourceReference,
          sourceEffectiveDate: sourceRun.sourceEffectiveDate,
        }
      : null,
  };
}

function resolveRows<T extends MasterRowWithSource>(params: {
  rows: T[];
  codeOf: (row: T) => string;
  labelOf: (row: T) => string;
  explicitPredicate?: (row: T) => boolean;
  missingRequirement: string;
  ambiguousRequirement: string;
}): MasterResolution<Record<string, unknown>> {
  const candidates = params.rows.map((row) =>
    buildCandidate(row, params.codeOf(row), params.labelOf(row)),
  );
  if (params.rows.length === 0) {
    return {
      status: "missing",
      selected: null,
      candidates,
      requirement: params.missingRequirement,
    };
  }
  if (params.rows.length === 1) {
    return {
      status: "resolved",
      selected: withSource(params.rows[0]),
      candidates,
      requirement: null,
    };
  }
  if (params.explicitPredicate) {
    const matches = params.rows.filter(params.explicitPredicate);
    if (matches.length === 1) {
      return {
        status: "resolved",
        selected: withSource(matches[0]),
        candidates,
        requirement: null,
      };
    }
  }
  return {
    status: "ambiguous",
    selected: null,
    candidates,
    requirement: params.ambiguousRequirement,
  };
}

function compareNumericText(value: unknown, input: string | null | undefined) {
  if (!input?.trim()) return false;
  return decimalText(value) === input.trim();
}

export async function resolveImportItemSelections(
  orgId: string,
  item: ImportItemDraftInput,
  validOn = new Date(),
): Promise<ImportItemResolutionSummary> {
  const [ritcRows, uomRows, schemeRows, bcdRows, aidcRows, cessRows] = await Promise.all([
    item.ritcNo
      ? db.chaRitcTariffMaster.findMany({
          where: { orgId, tariffItem: item.ritcNo, status: "ACTIVE", ...validityWhere(validOn) },
          include: { sourceRun: true },
          orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
        })
      : Promise.resolve([]),
    item.unit
      ? db.chaUomMaster.findMany({
          where: { orgId, quantityCode: item.unit, status: "ACTIVE", ...validityWhere(validOn) },
          include: { sourceRun: true },
          orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
        })
      : Promise.resolve([]),
    item.schemeCode
      ? db.chaSchemeCodeMaster.findMany({
          where: { orgId, eximCode: item.schemeCode, status: "ACTIVE", ...validityWhere(validOn) },
          include: { sourceRun: true },
          orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
        })
      : Promise.resolve([]),
    item.ritcNo
      ? db.chaBcdRateMaster.findMany({
          where: { orgId, cth: item.ritcNo, status: "ACTIVE", ...validityWhere(validOn) },
          include: { sourceRun: true },
          orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
          take: 25,
        })
      : Promise.resolve([]),
    item.ritcNo
      ? db.chaAidcRateMaster.findMany({
          where: { orgId, cth: item.ritcNo, status: "ACTIVE", ...validityWhere(validOn) },
          include: { sourceRun: true },
          orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
          take: 25,
        })
      : Promise.resolve([]),
    item.ritcNo
      ? db.chaCessRateMaster.findMany({
          where: { orgId, ritcCode: item.ritcNo, status: "ACTIVE", ...validityWhere(validOn) },
          include: { sourceRun: true },
          orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
          take: 25,
        })
      : Promise.resolve([]),
  ]);

  const aidcFiltered = item.notificationNo?.trim()
    ? aidcRows.filter(
        (row) =>
          row.notificationNo === item.notificationNo?.trim() &&
          (!item.notificationSerialNo?.trim() || row.serialNo === item.notificationSerialNo?.trim()),
      )
    : aidcRows;

  return {
    ritc: resolveRows({
      rows: ritcRows,
      codeOf: (row) => String(row.tariffItem ?? ""),
      labelOf: (row) => String(row.description ?? row.tariffItem ?? ""),
      missingRequirement: item.ritcNo
        ? `No active RITC/CTH master record matched ${item.ritcNo}.`
        : "RITC/CTH code is required to resolve tariff details.",
      ambiguousRequirement: `Multiple active RITC/CTH records matched ${item.ritcNo}. Select a single valid dataset/version explicitly.`,
    }),
    uom: resolveRows({
      rows: uomRows,
      codeOf: (row) => String(row.quantityCode ?? ""),
      labelOf: (row) => String(row.quantityDescription ?? row.quantityCode ?? ""),
      missingRequirement: item.unit
        ? `No active UOM master matched ${item.unit}.`
        : "UOM is required for import item validation.",
      ambiguousRequirement: `Multiple active UOM records matched ${item.unit}. Select one explicitly.`,
    }),
    scheme: resolveRows({
      rows: schemeRows,
      codeOf: (row) => String(row.eximCode ?? ""),
      labelOf: (row) => String(row.importSchemeName ?? row.exportSchemeName ?? row.eximCode ?? ""),
      missingRequirement: item.schemeCode
        ? `No active scheme code matched ${item.schemeCode}.`
        : "Scheme code is required when scheme benefits are claimed.",
      ambiguousRequirement: `Multiple active scheme rows matched ${item.schemeCode}. Select the exact eligible scheme.`,
    }),
    bcd: resolveRows({
      rows: bcdRows,
      codeOf: (row) => String(row.cth ?? ""),
      labelOf: (row) =>
        [
          row.itemDescription,
          row.preferential ? `preferential:${row.preferential}` : null,
          row.bcdFlag ? `flag:${row.bcdFlag}` : null,
        ]
          .filter(Boolean)
          .join(" | ") || String(row.cth ?? ""),
      explicitPredicate: (row) =>
        compareNumericText(row.bcdRate, item.bcdRate) || compareNumericText(row.pRate, item.bcdRate),
      missingRequirement: item.ritcNo
        ? `No active BCD rate matched ${item.ritcNo} on ${validOn.toISOString().slice(0, 10)}.`
        : "RITC/CTH is required before BCD can be resolved.",
      ambiguousRequirement:
        item.ritcNo && item.bcdRate
          ? `Multiple BCD rates matched ${item.ritcNo}; choose the intended rate/notification context explicitly.`
          : `Multiple BCD rates are valid for ${item.ritcNo || "this item"}; explicit user selection is required.`,
    }),
    aidc: resolveRows({
      rows: aidcFiltered,
      codeOf: (row) => String(row.cth ?? ""),
      labelOf: (row) =>
        [row.notificationNo, row.serialNo, row.itemDescription].filter(Boolean).join(" / ") ||
        String(row.cth ?? ""),
      explicitPredicate: (row) =>
        compareNumericText(row.rate, item.aidcRate) ||
        compareNumericText(row.amount, item.aidcRate) ||
        (!!item.notificationNo?.trim() &&
          row.notificationNo === item.notificationNo?.trim() &&
          (!item.notificationSerialNo?.trim() || row.serialNo === item.notificationSerialNo?.trim())),
      missingRequirement:
        item.notificationNo?.trim()
          ? `No active AIDC row matched notification ${item.notificationNo}${item.notificationSerialNo ? ` / ${item.notificationSerialNo}` : ""}.`
          : `No active AIDC row matched ${item.ritcNo || "the selected CTH"} on ${validOn.toISOString().slice(0, 10)}.`,
      ambiguousRequirement:
        item.notificationNo?.trim()
          ? `Multiple AIDC rows matched notification ${item.notificationNo}; select the exact serial/sub-serial explicitly.`
          : `Multiple AIDC rows are valid for ${item.ritcNo || "this item"}; explicit user selection is required.`,
    }),
    cess: resolveRows({
      rows: cessRows,
      codeOf: (row) => String(row.ritcCode ?? ""),
      labelOf: (row) =>
        [row.cessSerialNo, row.cessFlag, decimalText(row.cessRateAdvance)].filter(Boolean).join(" / ") ||
        String(row.ritcCode ?? ""),
      explicitPredicate: (row) =>
        compareNumericText(row.cessRateAdvance, item.cessRate) ||
        compareNumericText(row.cessValue, item.cessRate),
      missingRequirement: item.ritcNo
        ? `No active cess row matched ${item.ritcNo} on ${validOn.toISOString().slice(0, 10)}.`
        : "RITC/CTH is required before cess can be resolved.",
      ambiguousRequirement: `Multiple cess rows are valid for ${item.ritcNo || "this item"}; select the intended cess serial explicitly.`,
    }),
  };
}

export async function resolveExportItemSelections(
  orgId: string,
  item: ExportItemDraftInput,
  validOn = new Date(),
): Promise<ExportItemResolutionSummary> {
  const [ritcRows, uomRows, schemeRows, drawbackRows, rodtepRows, rosctlRows, singleWindowRows] = await Promise.all([
    item.ritcNo
      ? db.chaRitcTariffMaster.findMany({
          where: { orgId, tariffItem: item.ritcNo, status: "ACTIVE", ...validityWhere(validOn) },
          include: { sourceRun: true },
          orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
        })
      : Promise.resolve([]),
    item.unit
      ? db.chaUomMaster.findMany({
          where: { orgId, quantityCode: item.unit, status: "ACTIVE", ...validityWhere(validOn) },
          include: { sourceRun: true },
          orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
        })
      : Promise.resolve([]),
    item.schemeCode
      ? db.chaSchemeCodeMaster.findMany({
          where: { orgId, eximCode: item.schemeCode, status: "ACTIVE", ...validityWhere(validOn) },
          include: { sourceRun: true },
          orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
        })
      : Promise.resolve([]),
    item.drawbackScheduleNo
      ? db.chaDrawbackRateMaster.findMany({
          where: { orgId, dbkSerialNo: item.drawbackScheduleNo, status: "ACTIVE", ...validityWhere(validOn) },
          include: { sourceRun: true },
          orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
        })
      : Promise.resolve([]),
    item.rodtepCode || item.ritcNo
      ? db.chaRodtepRateMaster.findMany({
          where: { orgId, ritcNo: item.rodtepCode || item.ritcNo!, status: "ACTIVE", ...validityWhere(validOn) },
          include: { sourceRun: true },
          orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
        })
      : Promise.resolve([]),
    item.drawbackScheduleNo
      ? db.chaRosctlRateMaster.findMany({
          where: { orgId, rosctlCode: item.drawbackScheduleNo, status: "ACTIVE", ...validityWhere(validOn) },
          include: { sourceRun: true },
          orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
        })
      : Promise.resolve([]),
    item.ritcNo
      ? db.chaSingleWindowCthMaster.findMany({
          where: { orgId, fromCth: item.ritcNo, status: "ACTIVE", ...validityWhere(validOn) },
          include: { sourceRun: true },
          orderBy: [{ agencyCode: "asc" }, { effectiveFrom: "desc" }, { updatedAt: "desc" }],
          take: 25,
        })
      : Promise.resolve([]),
  ]);

  const singleWindowCandidates = singleWindowRows.map((row) =>
    buildCandidate(
      row,
      `${row.fromCth ?? ""}:${row.agencyCode ?? ""}`,
      [row.agencyName, row.agencyCode].filter(Boolean).join(" / ") || String(row.fromCth ?? ""),
    ),
  );

  return {
    ritc: resolveRows({
      rows: ritcRows,
      codeOf: (row) => String(row.tariffItem ?? ""),
      labelOf: (row) => String(row.description ?? row.tariffItem ?? ""),
      missingRequirement: item.ritcNo
        ? `No active RITC/CTH master record matched ${item.ritcNo}.`
        : "RITC/CTH code is required to resolve tariff details.",
      ambiguousRequirement: `Multiple active RITC/CTH records matched ${item.ritcNo}. Select a single valid dataset/version explicitly.`,
    }),
    uom: resolveRows({
      rows: uomRows,
      codeOf: (row) => String(row.quantityCode ?? ""),
      labelOf: (row) => String(row.quantityDescription ?? row.quantityCode ?? ""),
      missingRequirement: item.unit ? `No active UOM master matched ${item.unit}.` : "UOM is required for export item validation.",
      ambiguousRequirement: `Multiple active UOM records matched ${item.unit}. Select one explicitly.`,
    }),
    scheme: resolveRows({
      rows: schemeRows,
      codeOf: (row) => String(row.eximCode ?? ""),
      labelOf: (row) => String(row.exportSchemeName ?? row.importSchemeName ?? row.eximCode ?? ""),
      missingRequirement: item.schemeCode ? `No active scheme code matched ${item.schemeCode}.` : "Scheme code is required when export incentives are claimed.",
      ambiguousRequirement: `Multiple active scheme rows matched ${item.schemeCode}. Select the exact eligible scheme.`,
    }),
    drawback: resolveRows({
      rows: drawbackRows,
      codeOf: (row) => String(row.dbkSerialNo ?? ""),
      labelOf: (row) => [row.dbkHeader, row.description].filter(Boolean).join(" / ") || String(row.dbkSerialNo ?? ""),
      explicitPredicate: (row) =>
        compareNumericText(row.rateAdvance, item.drawbackRatePercent) ||
        compareNumericText(row.specificValue, item.drawbackAmount),
      missingRequirement: item.drawbackScheduleNo
        ? `No active drawback row matched ${item.drawbackScheduleNo}.`
        : "Drawback schedule is required to resolve drawback rates.",
      ambiguousRequirement: `Multiple drawback rows matched ${item.drawbackScheduleNo}. Select the intended drawback schedule explicitly.`,
    }),
    rodtep: resolveRows({
      rows: rodtepRows,
      codeOf: (row) => String(row.ritcNo ?? ""),
      labelOf: (row) => String(row.description ?? row.ritcNo ?? ""),
      explicitPredicate: (row) =>
        compareNumericText(row.rate, item.rodtepRate) || compareNumericText(row.capRate, item.rodtepCap),
      missingRequirement: item.rodtepCode || item.ritcNo
        ? `No active RoDTEP row matched ${item.rodtepCode || item.ritcNo}.`
        : "RITC/CTH or RoDTEP code is required for RoDTEP resolution.",
      ambiguousRequirement: `Multiple RoDTEP rows matched ${item.rodtepCode || item.ritcNo}. Select the intended rate explicitly.`,
    }),
    rosctl: resolveRows({
      rows: rosctlRows,
      codeOf: (row) => String(row.rosctlCode ?? ""),
      labelOf: (row) => [row.schedule, row.description].filter(Boolean).join(" / ") || String(row.rosctlCode ?? ""),
      explicitPredicate: (row) =>
        compareNumericText(row.percentage, item.rosctlRate) || compareNumericText(row.rateAmount, item.rosctlSpecificRate),
      missingRequirement: item.drawbackScheduleNo
        ? `No active RoSCTL row matched ${item.drawbackScheduleNo}.`
        : "RoSCTL schedule code is required for RoSCTL resolution.",
      ambiguousRequirement: `Multiple RoSCTL rows matched ${item.drawbackScheduleNo}. Select the intended schedule explicitly.`,
    }),
    singleWindow: singleWindowRows.length === 0
      ? {
          status: "missing",
          candidates: singleWindowCandidates,
          requirement: item.ritcNo
            ? `No active single-window agency mapping matched ${item.ritcNo}.`
            : "RITC/CTH is required before single-window agency mapping can be resolved.",
        }
      : singleWindowRows.length === 1
        ? { status: "resolved", candidates: singleWindowCandidates, requirement: null }
        : {
            status: "ambiguous",
            candidates: singleWindowCandidates,
            requirement: `Multiple single-window agencies are valid for ${item.ritcNo}; explicit agency selection is required.`,
          },
  };
}

export async function resolveSupportingDocumentSelection(
  orgId: string,
  document: Pick<ImportSupportingDocumentDraftInput | ExportSupportingDocumentDraftInput, "documentCode">,
  validOn = new Date(),
): Promise<SupportingDocumentResolutionSummary> {
  const rows = document.documentCode
    ? await db.chaSupportingDocumentMaster.findMany({
        where: { orgId, documentCode: document.documentCode, status: "ACTIVE", ...validityWhere(validOn) },
        include: { sourceRun: true },
        orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
        take: 25,
      })
    : [];

  return {
    document: resolveRows({
      rows,
      codeOf: (row) => String(row.documentCode ?? ""),
      labelOf: (row) => String(row.documentName ?? row.documentDescription ?? row.documentCode ?? ""),
      missingRequirement: document.documentCode
        ? `No active supporting-document code matched ${document.documentCode}.`
        : "Supporting-document code is required.",
      ambiguousRequirement: `Multiple supporting-document rows matched ${document.documentCode}. Select the exact invoice/item applicability explicitly.`,
    }),
  };
}
