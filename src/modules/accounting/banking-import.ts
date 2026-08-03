import { createHash, randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

import { assertAllowedFile, resolveInside, sanitizeFilename } from "@/lib/security";

import {
  addDecimalStrings,
  compareDecimalStrings,
  normalizeDecimalString,
} from "./operational-helpers";

export const BANK_STATEMENT_MAX_FILE_SIZE = 2 * 1024 * 1024;
export const BANK_STATEMENT_ALLOWED_EXTENSIONS = new Set([".csv"]);
export const BANK_STATEMENT_ALLOWED_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel",
]);
export const BANK_STATEMENT_STORAGE_ROOT = path.resolve(
  process.env.ACCOUNTING_BANK_STATEMENT_UPLOAD_ROOT ||
    path.join(process.cwd(), "storage", "accounting-banking-imports"),
);
export const BANK_STATEMENT_PREVIEW_LIMIT = 25;
export const BANK_STATEMENT_ROW_LIMIT = 1000;
export const BANK_STATEMENT_COMPLETED_STATUSES = new Set([
  "VERIFIED",
  "COMPLETED",
  "COMPLETED_WITH_ERRORS",
]);

export type BankStatementDateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
export type BankStatementDecimalSeparator = "." | ",";

export type BankStatementColumnMapping = {
  dateColumn: string;
  descriptionColumn: string;
  referenceColumn?: string | null;
  debitColumn?: string | null;
  creditColumn?: string | null;
  amountColumn?: string | null;
  balanceColumn?: string | null;
  currencyColumn?: string | null;
};

export type BankStatementPreviewConfig = {
  headerRowIndex: number;
  dateFormat?: BankStatementDateFormat | null;
  decimalSeparator: BankStatementDecimalSeparator;
  statementStart?: string | null;
  statementEnd?: string | null;
  openingBalance?: string | null;
  closingBalance?: string | null;
  columns?: BankStatementColumnMapping | null;
};

export type ParsedStatementFile = {
  displayName: string;
  fileHash: string;
  fileKey: string;
  headers: string[];
  rows: string[][];
  headerRowIndex: number;
  sampleRows: Array<Record<string, string>>;
};

export type NormalizedStatementPreviewRow = {
  sourceRowNumber: number;
  transactionDate: string | null;
  description: string;
  reference: string | null;
  deposit: string;
  withdrawal: string;
  amount: string | null;
  runningBalance: string | null;
  currencyCode: string;
  fingerprint: string | null;
  duplicateState: "NONE" | "WITHIN_FILE" | "EXISTING_DUPLICATE" | "POTENTIAL_DUPLICATE";
  errors: string[];
};

type RawNormalizedRow = {
  sourceRowNumber: number;
  transactionDate: string | null;
  description: string;
  reference: string | null;
  deposit: string;
  withdrawal: string;
  amount: string | null;
  runningBalance: string | null;
  currencyCode: string;
  fingerprint: string | null;
  comparisonKey: string | null;
  errors: string[];
};

type StoredStatementFile = {
  fileHash: string;
  fileKey: string;
  displayName: string;
  text: string;
};

function parsePositiveInteger(value: number | null | undefined, fallback: number) {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
}

function normalizeHeader(value: string, index: number) {
  const trimmed = value.trim();
  return trimmed || `Column ${index + 1}`;
}

function normalizeCsvValue(value: string | null | undefined) {
  return String(value ?? "").replace(/\uFEFF/g, "").trim();
}

function serializeConfig(config: BankStatementPreviewConfig) {
  return {
    headerRowIndex: parsePositiveInteger(config.headerRowIndex, 1),
    dateFormat: config.dateFormat ?? null,
    decimalSeparator: config.decimalSeparator,
    statementStart: config.statementStart ?? null,
    statementEnd: config.statementEnd ?? null,
    openingBalance: config.openingBalance ?? null,
    closingBalance: config.closingBalance ?? null,
    columns: config.columns ?? null,
  };
}

export function buildStatementFileHash(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function buildStatementFingerprint(input: {
  orgId: string;
  bankAccountId: string;
  transactionDate: string;
  amount: string;
  currencyCode: string;
  reference: string | null;
  description: string;
}) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        orgId: input.orgId,
        bankAccountId: input.bankAccountId,
        transactionDate: input.transactionDate,
        amount: input.amount,
        currencyCode: input.currencyCode,
        reference: normalizeCsvValue(input.reference).toUpperCase(),
        description: normalizeCsvValue(input.description).toUpperCase(),
      }),
    )
    .digest("hex");
}

export function buildPotentialDuplicateKey(input: {
  transactionDate: string;
  amount: string;
  currencyCode: string;
}) {
  return `${input.transactionDate}|${input.amount}|${input.currencyCode}`;
}

function tokenizeCsv(text: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows
    .map((entry) => entry.map((value) => value.trim()))
    .filter((entry) => entry.some((value) => value.length > 0));
}

function parseStatementDate(
  value: string,
  format: BankStatementDateFormat | null | undefined,
) {
  const normalized = normalizeCsvValue(value);
  if (!normalized) {
    throw new Error("Transaction date is required.");
  }

  const yyyyMmDd = /^(\d{4})-(\d{2})-(\d{2})$/;
  const slashDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  let year = 0;
  let month = 0;
  let day = 0;

  if (yyyyMmDd.test(normalized)) {
    const match = normalized.match(yyyyMmDd)!;
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  } else {
    const match = normalized.match(slashDate);
    if (!match) {
      throw new Error("Transaction date must use the selected date format.");
    }
    const first = Number(match[1]);
    const second = Number(match[2]);
    const parsedYear = Number(match[3]);
    const inferredFormat =
      first > 12 ? "DD/MM/YYYY" : second > 12 ? "MM/DD/YYYY" : null;
    const effectiveFormat = format ?? inferredFormat;
    if (!effectiveFormat) {
      throw new Error("Ambiguous dates require an explicit date format.");
    }
    year = parsedYear;
    if (effectiveFormat === "DD/MM/YYYY") {
      day = first;
      month = second;
    } else {
      month = first;
      day = second;
    }
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Transaction date is invalid.");
  }
  return date.toISOString().slice(0, 10);
}

function parseStatementDecimal(
  value: string,
  decimalSeparator: BankStatementDecimalSeparator,
) {
  const normalized = normalizeCsvValue(value);
  if (!normalized) return null;
  const compact = normalized.replace(/\s+/g, "");
  const decimalMarker = decimalSeparator === "," ? "," : ".";
  const thousandsMarker = decimalMarker === "," ? "." : ",";
  const sanitized = compact.split(thousandsMarker).join("").replace(decimalMarker, ".");
  return normalizeDecimalString(sanitized, {
    allowNegative: true,
    maxScale: 8,
  });
}

function optionalPreviewDecimal(
  value: string | null | undefined,
  decimalSeparator: BankStatementDecimalSeparator,
) {
  const normalized = normalizeCsvValue(value);
  if (!normalized) return null;
  return parseStatementDecimal(normalized, decimalSeparator);
}

function getRowValue(
  row: Record<string, string>,
  columnName: string | null | undefined,
) {
  if (!columnName) return "";
  return row[columnName] ?? "";
}

function assertColumnMapping(columns: BankStatementColumnMapping | null | undefined) {
  if (!columns?.dateColumn || !columns.descriptionColumn) {
    throw new Error("Choose the transaction date and description columns.");
  }
  const selectedColumns = [
    columns.dateColumn,
    columns.descriptionColumn,
    columns.referenceColumn,
    columns.debitColumn,
    columns.creditColumn,
    columns.amountColumn,
    columns.balanceColumn,
    columns.currencyColumn,
  ].filter(Boolean);
  const uniqueColumns = new Set(selectedColumns);
  if (selectedColumns.length !== uniqueColumns.size) {
    throw new Error("Each CSV column can only be mapped once.");
  }
  if (columns.amountColumn && (columns.debitColumn || columns.creditColumn)) {
    throw new Error("Use either a signed amount column or separate debit and credit columns.");
  }
  if (!columns.amountColumn && !columns.debitColumn && !columns.creditColumn) {
    throw new Error("Choose either a signed amount column or separate debit and credit columns.");
  }
}

export async function storeBankStatementFile(input: {
  orgId: string;
  bankAccountId: string;
  file: File;
}) {
  assertAllowedFile({
    file: input.file,
    allowedTypes: BANK_STATEMENT_ALLOWED_MIME_TYPES,
    allowedExtensions: BANK_STATEMENT_ALLOWED_EXTENSIONS,
    maxSizeBytes: BANK_STATEMENT_MAX_FILE_SIZE,
  });

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const text = buffer.toString("utf-8");
  if (!text.includes(",") || !/[\r\n]/.test(text)) {
    throw new Error("Only CSV statement files are supported in this Banking phase.");
  }
  const displayName = sanitizeFilename(input.file.name || "statement.csv");
  const fileHash = buildStatementFileHash(buffer);
  const extension = path.extname(displayName).toLowerCase() || ".csv";
  const relativeKey = path.join(
    input.orgId,
    input.bankAccountId,
    `${new Date().toISOString().slice(0, 10)}-${randomUUID()}${extension}`,
  );
  const absolutePath = resolveInside(BANK_STATEMENT_STORAGE_ROOT, relativeKey);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);
  return {
    displayName,
    fileHash,
    fileKey: path.relative(BANK_STATEMENT_STORAGE_ROOT, absolutePath).replace(/\\/g, "/"),
    text,
  } satisfies StoredStatementFile;
}

export async function readStoredBankStatementFile(fileKey: string) {
  const normalizedKey = String(fileKey ?? "").trim();
  if (!normalizedKey) {
    throw new Error("Statement file is missing.");
  }
  const absolutePath = resolveInside(BANK_STATEMENT_STORAGE_ROOT, normalizedKey);
  const buffer = await fs.readFile(absolutePath);
  return {
    fileHash: buildStatementFileHash(buffer),
    text: buffer.toString("utf-8"),
  };
}

export function parseStoredStatementFile(input: {
  fileKey: string;
  displayName: string;
  fileHash: string;
  text: string;
  headerRowIndex: number;
}) {
  const rows = tokenizeCsv(input.text);
  if (rows.length === 0) {
    throw new Error("The CSV statement file is empty.");
  }
  if (rows.length > BANK_STATEMENT_ROW_LIMIT + 5) {
    throw new Error(`Only ${BANK_STATEMENT_ROW_LIMIT} statement rows can be imported at once.`);
  }
  const headerIndex = parsePositiveInteger(input.headerRowIndex, 1) - 1;
  if (!rows[headerIndex]) {
    throw new Error("The selected header row does not exist in the uploaded CSV.");
  }
  const headers = rows[headerIndex].map((value, index) => normalizeHeader(value, index));
  const dataRows = rows
    .slice(headerIndex + 1)
    .map((row) =>
      headers.reduce<Record<string, string>>((accumulator, header, index) => {
        accumulator[header] = normalizeCsvValue(row[index] ?? "");
        return accumulator;
      }, {}),
    )
    .filter((row) => Object.values(row).some((value) => value.length > 0));

  return {
    displayName: input.displayName,
    fileHash: input.fileHash,
    fileKey: input.fileKey,
    headers,
    rows: dataRows.map((row) => headers.map((header) => row[header] ?? "")),
    headerRowIndex: headerIndex + 1,
    sampleRows: dataRows.slice(0, 5),
  } satisfies ParsedStatementFile;
}

export function normalizeStatementRows(input: {
  orgId: string;
  bankAccountId: string;
  accountCurrencyCode: string;
  parsedFile: ParsedStatementFile;
  config: BankStatementPreviewConfig;
}) {
  assertColumnMapping(input.config.columns);
  const columns = input.config.columns!;

  const rawRows = input.parsedFile.rows.map((values, rowIndex) => {
    const row = input.parsedFile.headers.reduce<Record<string, string>>((accumulator, header, index) => {
      accumulator[header] = values[index] ?? "";
      return accumulator;
    }, {});
    const errors: string[] = [];
    const description = normalizeCsvValue(getRowValue(row, columns.descriptionColumn));
    const reference = normalizeCsvValue(getRowValue(row, columns.referenceColumn)) || null;
    const currencyCode = (
      normalizeCsvValue(getRowValue(row, columns.currencyColumn)) || input.accountCurrencyCode
    ).toUpperCase();
    let transactionDate: string | null = null;
    let deposit = "0";
    let withdrawal = "0";
    let amount: string | null = null;
    let runningBalance: string | null = null;

    try {
      transactionDate = parseStatementDate(
        getRowValue(row, columns.dateColumn),
        input.config.dateFormat,
      );
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Transaction date is invalid.");
    }

    if (!description && !reference) {
      errors.push("Description or reference is required.");
    }

    if (currencyCode !== input.accountCurrencyCode.toUpperCase()) {
      errors.push(`Statement currency must match ${input.accountCurrencyCode.toUpperCase()}.`);
    }

    try {
      if (columns.amountColumn) {
        amount = optionalPreviewDecimal(
          getRowValue(row, columns.amountColumn),
          input.config.decimalSeparator,
        );
        if (!amount) {
          errors.push("Amount is required.");
        } else if (compareDecimalStrings(amount, "0") === 0) {
          errors.push("Zero-amount rows cannot be imported.");
        } else if (compareDecimalStrings(amount, "0") > 0) {
          deposit = amount;
        } else {
          withdrawal = amount.slice(1);
        }
      } else {
        const debit = optionalPreviewDecimal(
          getRowValue(row, columns.debitColumn),
          input.config.decimalSeparator,
        );
        const credit = optionalPreviewDecimal(
          getRowValue(row, columns.creditColumn),
          input.config.decimalSeparator,
        );
        if (!debit && !credit) {
          errors.push("Debit or credit amount is required.");
        } else if (debit && credit) {
          errors.push("Only one side of the transaction can have a value.");
        } else {
          deposit = debit ?? "0";
          withdrawal = credit ?? "0";
          amount = debit ?? (credit ? `-${credit}` : null);
          if (amount && compareDecimalStrings(amount, "0") === 0) {
            errors.push("Zero-amount rows cannot be imported.");
          }
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Amount is invalid.");
    }

    try {
      runningBalance = optionalPreviewDecimal(
        getRowValue(row, columns.balanceColumn),
        input.config.decimalSeparator,
      );
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Running balance is invalid.");
    }

    const fingerprint =
      transactionDate && amount
        ? buildStatementFingerprint({
            orgId: input.orgId,
            bankAccountId: input.bankAccountId,
            transactionDate,
            amount,
            currencyCode,
            reference,
            description: description || reference || "",
          })
        : null;

    return {
      sourceRowNumber: rowIndex + input.parsedFile.headerRowIndex + 1,
      transactionDate,
      description,
      reference,
      deposit,
      withdrawal,
      amount,
      runningBalance,
      currencyCode,
      fingerprint,
      comparisonKey:
        transactionDate && amount
          ? buildPotentialDuplicateKey({
              transactionDate,
              amount,
              currencyCode,
            })
          : null,
      errors,
    } satisfies RawNormalizedRow;
  });

  const fingerprintCounts = new Map<string, number>();
  for (const row of rawRows) {
    if (!row.fingerprint) continue;
    fingerprintCounts.set(row.fingerprint, (fingerprintCounts.get(row.fingerprint) ?? 0) + 1);
  }

  return rawRows.map((row) => ({
    ...row,
    duplicateState:
      row.fingerprint && (fingerprintCounts.get(row.fingerprint) ?? 0) > 1
        ? "WITHIN_FILE"
        : "NONE",
  })) satisfies Array<RawNormalizedRow & { duplicateState: NormalizedStatementPreviewRow["duplicateState"] }>;
}

export function summarizePreviewRows(
  rows: NormalizedStatementPreviewRow[],
  previewLimit = BANK_STATEMENT_PREVIEW_LIMIT,
) {
  const validRows = rows.filter((row) => row.errors.length === 0);
  const exactDuplicates = rows.filter((row) => row.duplicateState === "EXISTING_DUPLICATE").length;
  const withinFileDuplicates = rows.filter((row) => row.duplicateState === "WITHIN_FILE").length;
  const potentialDuplicates = rows.filter(
    (row) => row.duplicateState === "POTENTIAL_DUPLICATE",
  ).length;
  const importableRows = rows.filter(
    (row) =>
      row.errors.length === 0 &&
      row.duplicateState !== "WITHIN_FILE" &&
      row.duplicateState !== "EXISTING_DUPLICATE",
  );

  return {
    totalRows: rows.length,
    validRows: validRows.length,
    invalidRows: rows.length - validRows.length,
    duplicateRows: exactDuplicates + withinFileDuplicates,
    potentialDuplicateRows: potentialDuplicates,
    rowsToImport: importableRows.length,
    previewRows: rows.slice(0, previewLimit),
    totalDeposits: importableRows.reduce(
      (sum, row) => addDecimalStrings(sum, row.deposit),
      "0",
    ),
    totalWithdrawals: importableRows.reduce(
      (sum, row) => addDecimalStrings(sum, row.withdrawal),
      "0",
    ),
  };
}

export function maskStatementFileKey(fileKey: string) {
  return String(fileKey ?? "").split("/").slice(-2).join("/");
}

export function serializeStatementConfig(config: BankStatementPreviewConfig) {
  return JSON.stringify(serializeConfig(config));
}
