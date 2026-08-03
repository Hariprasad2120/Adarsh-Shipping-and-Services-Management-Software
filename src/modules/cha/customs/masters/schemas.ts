import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { ChaCustomsMasterError } from "./errors";

export const MASTER_GRID_MAX_PAGE_SIZE = 200;
export const MASTER_IMPORT_MAX_ROWS = 50_000;
export const MASTER_IMPORT_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MASTER_IMPORT_REJECT_APPLY_THRESHOLD = 0.25;

export const masterStatusSchema = z.enum(["ACTIVE", "INACTIVE", "SUPERSEDED"]);

export const gridFilterSchema = z.object({
  field: z.string().min(1),
  op: z.enum(["contains", "equals", "startsWith", "in"]).default("contains"),
  value: z.union([z.string(), z.array(z.string())]),
});

export const masterGridQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MASTER_GRID_MAX_PAGE_SIZE).default(25),
  sortBy: z.string().optional(),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
  filters: z.array(gridFilterSchema).default([]),
  globalSearch: z.string().trim().max(100).optional(),
  status: masterStatusSchema.optional(),
  effectiveOn: z.coerce.date().optional(),
  datasetVersion: z.string().trim().max(120).optional(),
  sourceRunId: z.string().trim().max(120).optional(),
  exactCode: z.string().trim().max(80).optional(),
});

export type MasterGridQueryInput = z.input<typeof masterGridQuerySchema>;
export type MasterGridQuery = z.output<typeof masterGridQuerySchema>;

export const importSourceTypeSchema = z.enum([
  "LEGACY_IMPORT_MASTER",
  "XLSX_CSV_UPLOAD",
  "MANUAL_ADMINISTRATION",
  "VERIFIED_EXTERNAL_INTEGRATION",
  "CONTROLLED_SEED_FIXTURE",
]);

export const bulkImportOptionsSchema = z.object({
  masterType: z.string().min(1),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().max(160).optional(),
  datasetVersion: z.string().min(1).max(120),
  sourceName: z.string().min(1).max(255),
  sourceReference: z.string().max(255).optional(),
  sourceType: importSourceTypeSchema.default("XLSX_CSV_UPLOAD"),
  sourcePublicationDate: z.coerce.date().optional(),
  sourceEffectiveDate: z.coerce.date().optional(),
});

export type BulkImportOptions = z.output<typeof bulkImportOptionsSchema>;

export const manualChangeSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});

export function normalizeCode(value: unknown, field = "code") {
  if (value === null || value === undefined) {
    throw new ChaCustomsMasterError("REQUIRED_CODE", `${field} is required.`);
  }
  const text = String(value).trim();
  if (!text) {
    throw new ChaCustomsMasterError("REQUIRED_CODE", `${field} is required.`);
  }
  if (/^[=+\-@]/.test(text)) {
    throw new ChaCustomsMasterError("UNSAFE_CELL", `${field} contains unsafe executable content.`);
  }
  return text;
}

export function optionalText(value: unknown) {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

export function optionalBoolean(value: unknown) {
  if (value === null || value === undefined || value === "") return false;
  if (typeof value === "boolean") return value;
  const text = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "y", "active"].includes(text);
}

export function optionalDecimal(value: unknown, field = "decimal") {
  if (value === null || value === undefined || value === "") return undefined;
  const text = String(value).trim().replace(/,/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(text)) {
    throw new ChaCustomsMasterError("INVALID_DECIMAL", `${field} must be a valid decimal.`);
  }
  return new Prisma.Decimal(text);
}

export function optionalDate(value: unknown, field = "date") {
  if (value === null || value === undefined || value === "") return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number") {
    const excelEpoch = Date.UTC(1899, 11, 30);
    return new Date(excelEpoch + value * 24 * 60 * 60 * 1000);
  }
  const text = String(value).trim();
  const normalized = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  const date = normalized
    ? new Date(Date.UTC(Number(normalized[3]), Number(normalized[2]) - 1, Number(normalized[1])))
    : new Date(text);
  if (Number.isNaN(date.getTime())) {
    throw new ChaCustomsMasterError("INVALID_DATE", `${field} must be a valid date.`);
  }
  return date;
}

const baseManualSchema = z.object({
  datasetVersion: z.string().min(1).max(120),
  effectiveFrom: z.coerce.date().optional(),
  effectiveTo: z.coerce.date().optional(),
  status: masterStatusSchema.default("ACTIVE"),
});

export const ritcRowSchema = baseManualSchema.extend({
  tariffItem: z.string().min(1).max(32),
  description: z.string().min(1).max(500),
  uom: z.string().max(24).optional(),
  importPolicy: z.string().max(160).optional(),
  importPolicyCondition: z.string().max(500).optional(),
  exportPolicy: z.string().max(160).optional(),
  exportPolicyCondition: z.string().max(500).optional(),
  sims: z.boolean().default(false),
  nfmims: z.boolean().default(false),
  pims: z.boolean().default(false),
  bis: z.boolean().default(false),
  tobacco: z.boolean().default(false),
});

export const bcdRowSchema = baseManualSchema.extend({
  cth: z.string().min(1).max(32),
  itemDescription: z.string().max(500).optional(),
  bcdFlag: z.string().max(20).optional(),
  bcdRate: z.instanceof(Prisma.Decimal).optional(),
  amount: z.instanceof(Prisma.Decimal).optional(),
  uqc: z.string().max(20).optional(),
  preferential: z.string().max(80).optional(),
  pFlag: z.string().max(20).optional(),
  pRate: z.instanceof(Prisma.Decimal).optional(),
  pAmount: z.instanceof(Prisma.Decimal).optional(),
  pUqc: z.string().max(20).optional(),
  sUqc: z.string().max(20).optional(),
});

export const supportingDocumentRowSchema = baseManualSchema.extend({
  documentCode: z.string().min(1).max(32),
  documentName: z.string().min(1).max(255),
  invoiceSerialNo: z.coerce.number().int().optional(),
  itemSerialNo: z.coerce.number().int().optional(),
  documentDescription: z.string().max(500).optional(),
});

export const uomRowSchema = baseManualSchema.extend({
  quantityCode: z.string().min(1).max(24),
  quantityDescription: z.string().min(1).max(255),
  quantityType: z.string().max(80).optional(),
});

export const aidcRowSchema = baseManualSchema.extend({
  notificationType: z.string().min(1).max(32),
  notificationNo: z.string().min(1).max(80),
  notificationDate: z.coerce.date().optional(),
  serialNo: z.string().min(1).max(80),
  cth: z.string().min(1).max(32),
  itemDescription: z.string().max(500).optional(),
  rate: z.instanceof(Prisma.Decimal).optional(),
  amount: z.instanceof(Prisma.Decimal).optional(),
  uqc: z.string().max(20).optional(),
  flag: z.string().max(40).optional(),
  condition: z.string().max(500).optional(),
  cvdRate: z.instanceof(Prisma.Decimal).optional(),
  cvdAmount: z.instanceof(Prisma.Decimal).optional(),
  cvdUqc: z.string().max(20).optional(),
  cvdFlag: z.string().max(40).optional(),
  acdFlag: z.string().max(40).optional(),
  adFlag: z.string().max(40).optional(),
});

export const notificationRowSchema = baseManualSchema.extend({
  notificationNo: z.string().min(1).max(80),
  notificationType: z.string().min(1).max(32),
  notificationDate: z.coerce.date().optional(),
  serialNo: z.string().min(1).max(80),
  subSerialNo: z.string().max(80).default(""),
  pflg: z.string().max(40).optional(),
  category: z.string().max(80).optional(),
  quota: z.string().max(80).optional(),
  port: z.string().max(80).optional(),
  countryFta: z.string().max(80).optional(),
  cth: z.string().max(32).optional(),
  listItem: z.string().max(80).optional(),
  itemDescription: z.string().max(500).optional(),
  rate: z.instanceof(Prisma.Decimal).optional(),
  amount: z.instanceof(Prisma.Decimal).optional(),
  uqc: z.string().max(20).optional(),
  flag: z.string().max(40).optional(),
  condition: z.string().max(500).optional(),
  cvdRate: z.instanceof(Prisma.Decimal).optional(),
  cvdAmount: z.instanceof(Prisma.Decimal).optional(),
  cvdUqc: z.string().max(20).optional(),
  cvdFlag: z.string().max(40).optional(),
  amendNotification: z.string().max(80).optional(),
  amendYear: z.string().max(12).optional(),
  amendSerialNo: z.string().max(80).optional(),
  adFlag: z.string().max(40).optional(),
  preferentialDutyFlag: z.string().max(40).optional(),
  bcdAmount: z.instanceof(Prisma.Decimal).optional(),
  bcdUqc: z.string().max(20).optional(),
  bondCode: z.string().max(80).optional(),
  schemeCode: z.string().max(80).optional(),
  drawbackType: z.string().max(80).optional(),
  effectiveFrom: z.coerce.date().optional(),
  effectiveTo: z.coerce.date().optional(),
});

export type RitcRow = z.output<typeof ritcRowSchema>;
export type BcdRow = z.output<typeof bcdRowSchema>;
export type SupportingDocumentRow = z.output<typeof supportingDocumentRowSchema>;
export type UomRow = z.output<typeof uomRowSchema>;
