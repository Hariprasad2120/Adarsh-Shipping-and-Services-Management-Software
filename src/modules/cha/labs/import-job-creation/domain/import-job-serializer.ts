import { createBlankImportJobDraft } from "./import-job.defaults";
import { buildFlatFileSummary } from "./import-job-summary";
import type { ImportJobDraft } from "./import-job.types";

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

export function checksumDraft(draft: ImportJobDraft) {
  const payload = stableStringify({
    schemaVersion: draft.schemaVersion,
    mainDetails: draft.mainDetails,
    igmRecords: draft.igmRecords,
    invoiceRecords: draft.invoiceRecords,
    itemRecords: draft.itemRecords,
    declarationRecords: draft.declarationRecords,
    supportingDocumentRecords: draft.supportingDocumentRecords,
  });
  let hash = 2166136261;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
}

export function serializeDraftForStorage(draft: ImportJobDraft) {
  return stableStringify(draft);
}

export function migrateStoredDraft(value: unknown): ImportJobDraft {
  const fallback = createBlankImportJobDraft();
  if (!value || typeof value !== "object") return fallback;

  const source = value as Partial<ImportJobDraft> & { schemaVersion?: number };
  if (source.schemaVersion !== 1) {
    return {
      ...fallback,
      ...source,
      schemaVersion: 1,
      movementDirection: source.movementDirection === "EXPORT" ? "EXPORT" : "IMPORT",
      mainDetails: { ...fallback.mainDetails, ...source.mainDetails },
      checklistOptions: { ...fallback.checklistOptions, ...source.checklistOptions },
      flatFileOptions: { ...fallback.flatFileOptions, ...source.flatFileOptions },
      igmRecords: source.igmRecords ?? [],
      invoiceRecords: source.invoiceRecords ?? [],
      itemRecords: source.itemRecords ?? [],
      declarationRecords: source.declarationRecords ?? [],
      supportingDocumentRecords: source.supportingDocumentRecords ?? [],
    };
  }

  return {
    ...fallback,
    ...source,
    schemaVersion: 1,
    mainDetails: { ...fallback.mainDetails, ...source.mainDetails },
    checklistOptions: { ...fallback.checklistOptions, ...source.checklistOptions },
    flatFileOptions: { ...fallback.flatFileOptions, ...source.flatFileOptions },
    igmRecords: source.igmRecords ?? [],
    invoiceRecords: source.invoiceRecords ?? [],
    itemRecords: source.itemRecords ?? [],
    declarationRecords: source.declarationRecords ?? [],
    supportingDocumentRecords: source.supportingDocumentRecords ?? [],
  };
}

export function parseStoredDraft(raw: string | null): ImportJobDraft {
  if (!raw) return createBlankImportJobDraft();
  try {
    return migrateStoredDraft(JSON.parse(raw));
  } catch {
    return createBlankImportJobDraft();
  }
}

export function buildValidationReport(draft: ImportJobDraft) {
  const messages: string[] = [];
  if (!draft.mainDetails.jobNo) messages.push("Job No is required.");
  if (!draft.mainDetails.beType) messages.push("BE Type is required.");
  if (draft.invoiceRecords.length === 0) messages.push("At least one invoice is required for a flat-file test.");
  if (draft.itemRecords.length === 0) messages.push("At least one item is required for a flat-file test.");
  return messages;
}

export function buildStructuredTestFlatFile(draft: ImportJobDraft, generatedAt: string) {
  const summary = buildFlatFileSummary(draft);
  const checksum = checksumDraft(draft);
  const lines = [
    "TEST FILE — NOT FOR ICEGATE SUBMISSION",
    `SCHEMA|${draft.schemaVersion}`,
    `DIRECTION|${draft.movementDirection}`,
    `GENERATED_AT|${generatedAt}`,
    `CHECKSUM|${checksum}`,
    `JOB|${draft.mainDetails.jobNo}|${draft.mainDetails.jobDate}|${draft.mainDetails.beType}|${draft.mainDetails.filingType}`,
    `IMPORTER|${draft.mainDetails.importerName}|${draft.mainDetails.iecNo}|${draft.mainDetails.branchSerialNo}`,
    `COUNTS|IGM=${draft.igmRecords.length}|INVOICE=${draft.invoiceRecords.length}|ITEM=${draft.itemRecords.length}|DECLARATION=${draft.declarationRecords.length}|DOCUMENT=${draft.supportingDocumentRecords.length}`,
    `TOTALS|INVOICE_INR=${summary.totalInvoiceInr}|DUTY=${summary.totalDuty}`,
    ...draft.invoiceRecords.map((invoice) =>
      `INVOICE|${invoice.serialNo}|${invoice.invoiceNo}|${invoice.invoiceDate}|${invoice.currency}|${invoice.exchangeRate}|${invoice.invoiceValue}`,
    ),
    ...draft.itemRecords.map((item) =>
      `ITEM|${item.serialNo}|INV=${item.invoiceSerialNo}|${item.ritcNo}|${item.quantity}|${item.unit}|${item.unitPrice}`,
    ),
    "END|TEST-LAB",
  ];

  return {
    checksum,
    flatFile: lines.join("\n"),
    json: stableStringify({ generatedAt, checksum, summary, draft }),
    validationReport: buildValidationReport(draft).join("\n") || "No blocking validation findings.",
  };
}
