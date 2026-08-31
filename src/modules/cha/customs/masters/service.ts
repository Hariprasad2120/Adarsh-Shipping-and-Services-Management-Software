import { createHash } from "node:crypto";
import { getFirstWorksheet, loadWorkbook, matrixFromWorksheet } from "@/lib/spreadsheet";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { logCustomsMasterAudit } from "./audit";
import {
  CUSTOMS_MASTER_DEFINITIONS,
  type CustomsMasterDefinition,
  type CustomsMasterKey,
  getCustomsMasterDefinition,
} from "./definitions";
import { ChaCustomsMasterError } from "./errors";
import {
  MASTER_GRID_MAX_PAGE_SIZE,
  MASTER_IMPORT_MAX_FILE_BYTES,
  MASTER_IMPORT_MAX_ROWS,
  MASTER_IMPORT_REJECT_APPLY_THRESHOLD,
  bulkImportOptionsSchema,
  manualChangeSchema,
  masterGridQuerySchema,
  type BulkImportOptions,
  type MasterGridQueryInput,
} from "./schemas";

type MasterRow = Record<string, unknown> & { id: string; datasetVersion: string; status?: string };
type MasterDelegate = {
  findMany(args?: unknown): Promise<MasterRow[]>;
  findFirst(args?: unknown): Promise<MasterRow | null>;
  count(args?: unknown): Promise<number>;
  create(args: unknown): Promise<MasterRow>;
  update(args: unknown): Promise<MasterRow>;
  updateMany(args: unknown): Promise<{ count: number }>;
};
type DbLike = Record<string, unknown>;

export type MasterGridResult = {
  rows: MasterRow[];
  total: number;
  page: number;
  pageSize: number;
  exportRows: () => Promise<string>;
};

export type ImportPreviewRow = {
  rowNumber: number;
  action: "insert" | "update" | "unchanged" | "reject";
  businessKey: Record<string, unknown>;
  data?: Record<string, unknown>;
  reason?: string;
};

export type BulkImportPreview = {
  masterType: CustomsMasterKey;
  checksum: string;
  datasetVersion: string;
  received: number;
  valid: number;
  insert: number;
  update: number;
  unchanged: number;
  reject: number;
  rows: ImportPreviewRow[];
  rejectionReportCsv: string;
};

export type BulkImportApplyResult = BulkImportPreview & {
  importRunId: string;
  status: "COMPLETED" | "COMPLETED_WITH_REJECTIONS";
};

function getDelegate(source: DbLike, definition: CustomsMasterDefinition): MasterDelegate {
  const delegate = source[definition.delegate];
  if (!delegate || typeof delegate !== "object") {
    throw new ChaCustomsMasterError("MASTER_DELEGATE_MISSING", `${definition.label} storage is unavailable.`, 500);
  }
  return delegate as MasterDelegate;
}

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, character: string) => character.toUpperCase())
    .replace(/^[A-Z]/, (character) => character.toLowerCase());
}

function stableStringify(value: unknown): string {
  if (value instanceof Prisma.Decimal) return value.toFixed();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${key}:${stableStringify((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return String(value ?? "");
}

function valuesEqual(left: unknown, right: unknown) {
  return stableStringify(left) === stableStringify(right);
}

function buildBusinessWhere(definition: CustomsMasterDefinition, orgId: string, row: Record<string, unknown>) {
  return definition.businessKeyFields.reduce<Record<string, unknown>>(
    (where, field) => {
      where[field] = row[field] ?? null;
      return where;
    },
    { orgId },
  );
}

function getComparableData(row: Record<string, unknown>) {
  const ignored = new Set(["id", "orgId", "sourceRunId", "rawSnapshot", "createdAt", "updatedAt", "createdById", "updatedById"]);
  return Object.fromEntries(Object.entries(row).filter(([key]) => !ignored.has(key)));
}

function hasMeaningfulChange(existing: MasterRow, row: Record<string, unknown>) {
  const comparable = getComparableData(row);
  return Object.entries(comparable).some(([key, value]) => !valuesEqual(existing[key], value));
}

function assertSafePageSize(pageSize: number) {
  if (pageSize > MASTER_GRID_MAX_PAGE_SIZE) {
    throw new ChaCustomsMasterError("PAGE_SIZE_LIMIT", `Page size cannot exceed ${MASTER_GRID_MAX_PAGE_SIZE}.`);
  }
}

function buildGridWhere(definition: CustomsMasterDefinition, orgId: string, input: MasterGridQueryInput) {
  const query = masterGridQuerySchema.parse(input);
  assertSafePageSize(query.pageSize);
  const and: Record<string, unknown>[] = [{ orgId }];

  if (query.status) and.push({ status: query.status });
  if (query.datasetVersion) and.push({ datasetVersion: query.datasetVersion });
  if (query.sourceRunId) and.push({ sourceRunId: query.sourceRunId });
  if (query.exactCode) {
    and.push({
      OR: definition.exactLookupFields.map((field) => ({ [field]: query.exactCode })),
    });
  }
  if (query.effectiveOn) {
    and.push({
      AND: [
        { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: query.effectiveOn } }] },
        { OR: [{ effectiveTo: null }, { effectiveTo: { gte: query.effectiveOn } }] },
      ],
    });
  }
  if (query.globalSearch) {
    and.push({
      OR: definition.searchableFields.map((field) => ({
        [field]: { contains: query.globalSearch, mode: "insensitive" },
      })),
    });
  }
  for (const filter of query.filters) {
    if (!definition.filterableFields.includes(filter.field)) continue;
    if (filter.op === "in" && Array.isArray(filter.value)) {
      and.push({ [filter.field]: { in: filter.value } });
    } else if (filter.op === "equals") {
      and.push({ [filter.field]: Array.isArray(filter.value) ? filter.value[0] : filter.value });
    } else if (filter.op === "startsWith") {
      and.push({ [filter.field]: { startsWith: String(filter.value), mode: "insensitive" } });
    } else {
      and.push({ [filter.field]: { contains: String(filter.value), mode: "insensitive" } });
    }
  }

  return { query, where: { AND: and } };
}

export async function queryCustomsMasterGrid(params: {
  actorId: string;
  orgId: string;
  masterType: CustomsMasterKey;
  query?: MasterGridQueryInput;
}): Promise<MasterGridResult> {
  const definition = getCustomsMasterDefinition(params.masterType);
  const { query, where } = buildGridWhere(definition, params.orgId, params.query ?? {});
  const sortBy = query.sortBy && definition.sortableFields.includes(query.sortBy) ? query.sortBy : definition.codeField;
  const orderBy = [{ [sortBy]: query.sortDirection }, { id: "asc" }];
  const delegate = getDelegate(db as unknown as DbLike, definition);

  const [rows, total] = await Promise.all([
    delegate.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    delegate.count({ where }),
  ]);

  return {
    rows,
    total,
    page: query.page,
    pageSize: query.pageSize,
    exportRows: async () => exportCustomsMasterCsv(params.orgId, params.masterType, params.query ?? {}),
  };
}

export async function exportCustomsMasterCsv(
  orgId: string,
  masterType: CustomsMasterKey,
  input: MasterGridQueryInput,
) {
  const definition = getCustomsMasterDefinition(masterType);
  const { where } = buildGridWhere(definition, orgId, { ...input, page: 1, pageSize: MASTER_GRID_MAX_PAGE_SIZE });
  const delegate = getDelegate(db as unknown as DbLike, definition);
  const rows = await delegate.findMany({
    where,
    orderBy: [{ [definition.codeField]: "asc" }, { id: "asc" }],
    take: MASTER_GRID_MAX_PAGE_SIZE,
  });
  return toCsv(rows, Array.from(new Set(["id", ...definition.headers, "status", "datasetVersion", "effectiveFrom", "effectiveTo"])));
}

function toCsv(rows: Record<string, unknown>[], headers: string[]) {
  const escape = (value: unknown) => {
    const text = value instanceof Date ? value.toISOString() : String(value ?? "");
    const escaped = text.replace(/"/g, '""');
    return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}

function assertSupportedFile(options: BulkImportOptions, bytes: Uint8Array) {
  if (bytes.byteLength > MASTER_IMPORT_MAX_FILE_BYTES) {
    throw new ChaCustomsMasterError("FILE_TOO_LARGE", `Import file cannot exceed ${MASTER_IMPORT_MAX_FILE_BYTES} bytes.`);
  }
  const extension = options.fileName.toLowerCase().split(".").pop();
  const allowedExtensions = new Set(["xlsx", "csv"]);
  if (!extension || !allowedExtensions.has(extension)) {
    throw new ChaCustomsMasterError("UNSUPPORTED_FILE", "Only XLSX and CSV imports are supported.");
  }
  const mime = options.mimeType?.toLowerCase();
  if (mime && /javascript|html|executable|shell|msdownload/.test(mime)) {
    throw new ChaCustomsMasterError("UNSAFE_FILE", "Uploaded file type is not allowed.");
  }
}

async function parseWorkbookRows(options: BulkImportOptions, bytes: Uint8Array) {
  assertSupportedFile(options, bytes);
  if (options.fileName.toLowerCase().endsWith(".csv")) {
    return parseCsvRows(Buffer.from(bytes).toString("utf8"));
  }
  const workbook = await loadWorkbook(bytes);
  const sheet = getFirstWorksheet(workbook);
  if (!sheet) {
    throw new ChaCustomsMasterError("EMPTY_WORKBOOK", "Import file has no worksheet.");
  }

  let matrix: ReturnType<typeof matrixFromWorksheet>;
  try {
    matrix = matrixFromWorksheet(sheet);
  } catch (error) {
    if (error instanceof Error && /formula/i.test(error.message)) {
      throw new ChaCustomsMasterError("FORMULA_CELL", "Formula cells are not allowed in customs master imports.");
    }
    throw error;
  }
  const [headerRow, ...dataRows] = matrix;
  if (!headerRow) {
    throw new ChaCustomsMasterError("MISSING_HEADER", "Import file is missing a header row.");
  }
  if (dataRows.length > MASTER_IMPORT_MAX_ROWS) {
    throw new ChaCustomsMasterError("ROW_LIMIT", `Import file cannot exceed ${MASTER_IMPORT_MAX_ROWS} data rows.`);
  }

  const headers = headerRow.map(normalizeHeader);
  return dataRows
    .map((cells, index) => ({
      rowNumber: index + 2,
      raw: Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex] ?? ""])),
    }))
    .filter((row) => Object.values(row.raw).some((value) => String(value ?? "").trim() !== ""));
}

function parseCsvRows(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim() !== "");
  const [headerLine, ...dataLines] = lines;
  if (!headerLine) {
    throw new ChaCustomsMasterError("MISSING_HEADER", "Import file is missing a header row.");
  }
  if (dataLines.length > MASTER_IMPORT_MAX_ROWS) {
    throw new ChaCustomsMasterError("ROW_LIMIT", `Import file cannot exceed ${MASTER_IMPORT_MAX_ROWS} data rows.`);
  }
  const headers = splitCsvLine(headerLine).map(normalizeHeader);
  return dataLines.map((line, index) => ({
    rowNumber: index + 2,
    raw: Object.fromEntries(headers.map((header, cellIndex) => [header, splitCsvLine(line)[cellIndex] ?? ""])),
  }));
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];
    if (character === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += character;
    }
  }
  values.push(current);
  return values;
}

function validateHeaders(definition: CustomsMasterDefinition, rows: Awaited<ReturnType<typeof parseWorkbookRows>>) {
  if (rows.length === 0) {
    throw new ChaCustomsMasterError("EMPTY_IMPORT", "Import file contains no data rows.");
  }
  const actual = new Set(Object.keys(rows[0].raw));
  const missing = definition.businessKeyFields.filter((header) => header !== "datasetVersion" && !actual.has(header));
  if (missing.length > 0) {
    throw new ChaCustomsMasterError("MISSING_HEADERS", `Missing required headers: ${missing.join(", ")}.`);
  }
}

export async function previewCustomsMasterImport(params: {
  orgId: string;
  actorId: string;
  options: unknown;
  bytes: Uint8Array;
}): Promise<BulkImportPreview> {
  const options = bulkImportOptionsSchema.parse(params.options);
  const definition = getCustomsMasterDefinition(options.masterType);
  const checksum = createHash("sha256").update(Buffer.from(params.bytes)).digest("hex");
  const parsedRows = await parseWorkbookRows(options, params.bytes);
  validateHeaders(definition, parsedRows);
  const delegate = getDelegate(db as unknown as DbLike, definition);
  const previewRows: ImportPreviewRow[] = [];

  for (const parsedRow of parsedRows) {
    try {
      const rawData = definition.parseRawRow(parsedRow.raw, options.datasetVersion);
      const data = definition.schema.parse(rawData);
      const existing = await delegate.findFirst({
        where: buildBusinessWhere(definition, params.orgId, data),
      });
      const action = existing ? (hasMeaningfulChange(existing, data) ? "update" : "unchanged") : "insert";
      previewRows.push({
        rowNumber: parsedRow.rowNumber,
        action,
        businessKey: Object.fromEntries(definition.businessKeyFields.map((field) => [field, data[field]])),
        data,
      });
    } catch (error) {
      previewRows.push({
        rowNumber: parsedRow.rowNumber,
        action: "reject",
        businessKey: {},
        reason: error instanceof Error ? error.message : "Invalid row.",
      });
    }
  }

  return buildPreviewResult(definition.key, checksum, options.datasetVersion, previewRows);
}

function buildPreviewResult(
  masterType: CustomsMasterKey,
  checksum: string,
  datasetVersion: string,
  rows: ImportPreviewRow[],
): BulkImportPreview {
  return {
    masterType,
    checksum,
    datasetVersion,
    received: rows.length,
    valid: rows.filter((row) => row.action !== "reject").length,
    insert: rows.filter((row) => row.action === "insert").length,
    update: rows.filter((row) => row.action === "update").length,
    unchanged: rows.filter((row) => row.action === "unchanged").length,
    reject: rows.filter((row) => row.action === "reject").length,
    rows,
    rejectionReportCsv: toCsv(
      rows
        .filter((row) => row.action === "reject")
        .map((row) => ({ rowNumber: row.rowNumber, reason: row.reason ?? "Rejected" })),
      ["rowNumber", "reason"],
    ),
  };
}

export async function applyCustomsMasterImport(params: {
  orgId: string;
  actorId: string;
  options: unknown;
  bytes: Uint8Array;
}): Promise<BulkImportApplyResult> {
  const options = bulkImportOptionsSchema.parse(params.options);
  const definition = getCustomsMasterDefinition(options.masterType);
  const preview = await previewCustomsMasterImport(params);
  if (preview.valid === 0 || preview.reject / Math.max(preview.received, 1) > MASTER_IMPORT_REJECT_APPLY_THRESHOLD) {
    throw new ChaCustomsMasterError("INVALID_DATASET", "Import rejected because the dataset is empty or mostly invalid.");
  }

  const result = await db.$transaction(async (tx) => {
    const run = await tx.chaCustomsMasterImportRun.upsert({
      where: {
        orgId_masterType_datasetVersion: {
          orgId: params.orgId,
          masterType: definition.key,
          datasetVersion: options.datasetVersion,
        },
      },
      create: {
        orgId: params.orgId,
        masterType: definition.key,
        sourceType: options.sourceType,
        sourceName: options.sourceName,
        sourceReference: options.sourceReference,
        sourcePublicationDate: options.sourcePublicationDate,
        sourceEffectiveDate: options.sourceEffectiveDate,
        datasetVersion: options.datasetVersion,
        fileChecksum: preview.checksum,
        status: "IMPORTING",
        receivedRowCount: preview.received,
        validRowCount: preview.valid,
        rejectedRowCount: preview.reject,
        importedById: params.actorId,
      },
      update: {
        sourceName: options.sourceName,
        sourceReference: options.sourceReference,
        sourcePublicationDate: options.sourcePublicationDate,
        sourceEffectiveDate: options.sourceEffectiveDate,
        fileChecksum: preview.checksum,
        status: "IMPORTING",
        receivedRowCount: preview.received,
        validRowCount: preview.valid,
        rejectedRowCount: preview.reject,
        importedById: params.actorId,
      },
    });

    await tx.chaCustomsMasterValidationError.deleteMany({ where: { importRunId: run.id } });
    if (preview.reject > 0) {
      await tx.chaCustomsMasterValidationError.createMany({
        data: preview.rows
          .filter((row) => row.action === "reject")
          .map((row) => ({
            orgId: params.orgId,
            importRunId: run.id,
            rowNumber: row.rowNumber,
            code: "ROW_REJECTED",
            message: row.reason ?? "Rejected",
          })),
      });
    }

    const delegate = getDelegate(tx as unknown as DbLike, definition);
    let inserted = 0;
    let updated = 0;
    let unchanged = 0;
    for (const row of preview.rows) {
      if (row.action === "reject" || !row.data) continue;
      const existing = await delegate.findFirst({
        where: buildBusinessWhere(definition, params.orgId, row.data),
      });
      const writeData = {
        ...row.data,
        orgId: params.orgId,
        sourceRunId: run.id,
        rawSnapshot: row.data,
        updatedById: params.actorId,
      };
      if (!existing) {
        await delegate.create({
          data: { ...writeData, createdById: params.actorId },
        });
        inserted += 1;
      } else if (row.action === "update") {
        await delegate.update({
          where: { id: existing.id },
          data: writeData,
        });
        updated += 1;
      } else {
        unchanged += 1;
      }
    }

    const status = preview.reject > 0 ? ("COMPLETED_WITH_REJECTIONS" as const) : ("COMPLETED" as const);
    await tx.chaCustomsMasterImportRun.update({
      where: { id: run.id },
      data: {
        status,
        insertedRowCount: inserted,
        updatedRowCount: updated,
        unchangedRowCount: unchanged,
        completedAt: new Date(),
      },
    });
    return { runId: run.id, status };
  });

  await logCustomsMasterAudit({
    orgId: params.orgId,
    actorId: params.actorId,
    masterType: definition.key,
    entityId: result.runId,
    event: "CUSTOMS_MASTER_IMPORT_APPLIED",
    newState: {
      datasetVersion: options.datasetVersion,
      checksum: preview.checksum,
      inserted: preview.insert,
      updated: preview.update,
      unchanged: preview.unchanged,
      rejected: preview.reject,
    },
  });

  return { ...preview, importRunId: result.runId, status: result.status };
}

export async function createCustomsMasterRecord(params: {
  orgId: string;
  actorId: string;
  masterType: CustomsMasterKey;
  data: Record<string, unknown>;
  reason?: string;
}) {
  const definition = getCustomsMasterDefinition(params.masterType);
  if (definition.sensitive) manualChangeSchema.parse({ reason: params.reason });
  const run = await ensureManualRun(params.orgId, params.actorId, definition, String(params.data.datasetVersion ?? "manual"));
  const data = definition.schema.parse(params.data);
  const delegate = getDelegate(db as unknown as DbLike, definition);
  const existing = await delegate.findFirst({ where: buildBusinessWhere(definition, params.orgId, data) });
  if (existing) {
    throw new ChaCustomsMasterError("DUPLICATE_MASTER_RECORD", "A master row with this business key already exists.");
  }
  const row = await delegate.create({
    data: {
      ...data,
      orgId: params.orgId,
      sourceRunId: run.id,
      createdById: params.actorId,
      updatedById: params.actorId,
      rawSnapshot: data,
    },
  });
  await logCustomsMasterAudit({
    orgId: params.orgId,
    actorId: params.actorId,
    masterType: definition.key,
    entityId: row.id,
    event: "CUSTOMS_MASTER_RECORD_CREATED",
    newState: data,
    remarks: params.reason,
  });
  return row;
}

export async function updateCustomsMasterRecord(params: {
  orgId: string;
  actorId: string;
  masterType: CustomsMasterKey;
  id: string;
  data: Record<string, unknown>;
  reason?: string;
}) {
  const definition = getCustomsMasterDefinition(params.masterType);
  if (definition.sensitive) manualChangeSchema.parse({ reason: params.reason });
  const delegate = getDelegate(db as unknown as DbLike, definition);
  const existing = await delegate.findFirst({ where: { id: params.id, orgId: params.orgId } });
  if (!existing) throw new ChaCustomsMasterError("MASTER_RECORD_NOT_FOUND", "Master row not found.", 404);
  const run = await db.chaCustomsMasterImportRun.findUnique({ where: { id: String(existing.sourceRunId) } });
  if (run?.sourceType !== "MANUAL_ADMINISTRATION") {
    throw new ChaCustomsMasterError("HISTORICAL_SNAPSHOT_LOCKED", "Historical import-run snapshots cannot be edited.");
  }
  const data = params.data;
  const row = await delegate.update({
    where: { id: params.id },
    data: { ...data, updatedById: params.actorId },
  });
  await logCustomsMasterAudit({
    orgId: params.orgId,
    actorId: params.actorId,
    masterType: definition.key,
    entityId: row.id,
    event: "CUSTOMS_MASTER_RECORD_UPDATED",
    prevState: existing,
    newState: data,
    remarks: params.reason,
  });
  return row;
}

export async function deactivateCustomsMasterRecord(params: {
  orgId: string;
  actorId: string;
  masterType: CustomsMasterKey;
  id: string;
  reason: string;
}) {
  manualChangeSchema.parse({ reason: params.reason });
  const definition = getCustomsMasterDefinition(params.masterType);
  const delegate = getDelegate(db as unknown as DbLike, definition);
  const existing = await delegate.findFirst({ where: { id: params.id, orgId: params.orgId } });
  if (!existing) throw new ChaCustomsMasterError("MASTER_RECORD_NOT_FOUND", "Master row not found.", 404);
  const referenceCount = await countMasterReferences(params.orgId, definition, existing);
  const row = await delegate.update({
    where: { id: params.id },
    data: { status: "INACTIVE", updatedById: params.actorId },
  });
  await logCustomsMasterAudit({
    orgId: params.orgId,
    actorId: params.actorId,
    masterType: definition.key,
    entityId: params.id,
    event: "CUSTOMS_MASTER_RECORD_DEACTIVATED",
    prevState: existing,
    newState: row,
    remarks: params.reason,
    metadata: { referenceCount },
  });
  return { row, referenceCount };
}

export async function activateCustomsMasterRecord(params: {
  orgId: string;
  actorId: string;
  masterType: CustomsMasterKey;
  id: string;
  reason: string;
}) {
  manualChangeSchema.parse({ reason: params.reason });
  const definition = getCustomsMasterDefinition(params.masterType);
  const delegate = getDelegate(db as unknown as DbLike, definition);
  const existing = await delegate.findFirst({ where: { id: params.id, orgId: params.orgId } });
  if (!existing) throw new ChaCustomsMasterError("MASTER_RECORD_NOT_FOUND", "Master row not found.", 404);
  const row = await delegate.update({
    where: { id: params.id },
    data: { status: "ACTIVE", updatedById: params.actorId },
  });
  await logCustomsMasterAudit({
    orgId: params.orgId,
    actorId: params.actorId,
    masterType: definition.key,
    entityId: params.id,
    event: "CUSTOMS_MASTER_RECORD_ACTIVATED",
    prevState: existing,
    newState: row,
    remarks: params.reason,
  });
  return row;
}

async function ensureManualRun(orgId: string, actorId: string, definition: CustomsMasterDefinition, datasetVersion: string) {
  return db.chaCustomsMasterImportRun.upsert({
    where: { orgId_masterType_datasetVersion: { orgId, masterType: definition.key, datasetVersion } },
    create: {
      orgId,
      masterType: definition.key,
      sourceType: "MANUAL_ADMINISTRATION",
      sourceName: "Manual customs master administration",
      datasetVersion,
      status: "COMPLETED",
      importedById: actorId,
      completedAt: new Date(),
    },
    update: {},
  });
}

async function countMasterReferences(orgId: string, definition: CustomsMasterDefinition, row: MasterRow) {
  const code = row[definition.codeField];
  if (!code) return 0;
  const codeText = String(code);
  const [importItems, exportItems, importDocuments, exportDocuments] = await Promise.all([
    db.chaImportItem.count({ where: { ritcNo: codeText, profile: { job: { orgId } } } }),
    db.chaExportItem.count({ where: { ritcNo: codeText, profile: { job: { orgId } } } }),
    db.chaImportSupportingDocument.count({ where: { documentCode: codeText, profile: { job: { orgId } } } }),
    db.chaExportSupportingDocument.count({ where: { documentCode: codeText, profile: { job: { orgId } } } }),
  ]);
  return importItems + exportItems + importDocuments + exportDocuments;
}

export function getCustomsMasterImportLimits() {
  return {
    maxRows: MASTER_IMPORT_MAX_ROWS,
    maxFileBytes: MASTER_IMPORT_MAX_FILE_BYTES,
    maxPageSize: MASTER_GRID_MAX_PAGE_SIZE,
  };
}

export { CUSTOMS_MASTER_DEFINITIONS };
