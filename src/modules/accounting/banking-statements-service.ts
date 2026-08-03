"use server";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

import {
  BANK_STATEMENT_COMPLETED_STATUSES,
  BANK_STATEMENT_PREVIEW_LIMIT,
  type BankStatementPreviewConfig,
  buildPotentialDuplicateKey,
  buildStatementFingerprint,
  maskStatementFileKey,
  normalizeStatementRows,
  parseStoredStatementFile,
  readStoredBankStatementFile,
  serializeStatementConfig,
  storeBankStatementFile,
  summarizePreviewRows,
  type NormalizedStatementPreviewRow,
} from "./banking-import";
import { createAuditLog } from "./service";

type BankAccountScope = {
  id: string;
  orgId: string;
  legalEntityId: string;
  ledgerAccountId: string;
  name: string;
  bankName: string;
  currencyCode: string;
  isActive: boolean;
  rowVersion: number;
  ledgerAccount: {
    branchId: string | null;
    branch: { name: string } | null;
  };
};

export type BankStatementPreviewResult = {
  bankAccountId: string;
  accountName: string;
  currencyCode: string;
  displayName: string;
  fileHash: string;
  fileKey: string;
  headers: string[];
  headerRowIndex: number;
  sampleRows: Array<Record<string, string>>;
  requiresMapping: boolean;
  config: BankStatementPreviewConfig;
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
    potentialDuplicateRows: number;
    rowsToImport: number;
    totalDeposits: string;
    totalWithdrawals: string;
  };
  previewRows: NormalizedStatementPreviewRow[];
};

export type BankStatementImportHistoryRow = {
  id: string;
  bankAccountId: string;
  bankAccountName: string;
  sourceFileName: string;
  sourceFileKeyLabel: string | null;
  sourceFormat: string;
  statementStart: string | null;
  statementEnd: string | null;
  importDate: string;
  importedBy: string;
  status: string;
  totalRows: number;
  importedRows: number;
  invalidRows: number;
  duplicateRows: number;
  closingBalance: string | null;
  currencyCode: string;
  failureReason: string | null;
};

function buildScopedBranchFilter(branchId: string | null | undefined) {
  if (!branchId) return undefined;
  return [{ branchId }, { branchId: null }];
}

function isoDate(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function parseImportMetadata(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

async function getScopedBankAccount(
  orgId: string,
  branchId: string | null | undefined,
  bankAccountId: string,
) {
  const bankAccount = await db.accountingBankAccount.findFirst({
    where: {
      id: bankAccountId,
      orgId,
      ...(branchId
        ? {
            ledgerAccount: {
              OR: buildScopedBranchFilter(branchId),
            },
          }
        : {}),
    },
    select: {
      id: true,
      orgId: true,
      legalEntityId: true,
      ledgerAccountId: true,
      name: true,
      bankName: true,
      currencyCode: true,
      isActive: true,
      rowVersion: true,
      ledgerAccount: {
        select: {
          branchId: true,
          branch: { select: { name: true } },
        },
      },
    },
  });
  if (!bankAccount) {
    throw new Error("Bank account not found.");
  }
  return bankAccount satisfies BankAccountScope;
}

function completedImportWhere(orgId: string, bankAccountId: string) {
  return {
    orgId,
    bankAccountId,
    importStatus: { in: Array.from(BANK_STATEMENT_COMPLETED_STATUSES) },
  } satisfies Prisma.AccountingBankStatementImportWhereInput;
}

function classifyDuplicates(input: {
  orgId: string;
  bankAccountId: string;
  rows: Array<
    ReturnType<typeof normalizeStatementRows>[number] & {
      duplicateState: NormalizedStatementPreviewRow["duplicateState"];
    }
  >;
  existingFingerprintSet: Set<string>;
  existingPotentialKeySet: Set<string>;
}) {
  return input.rows.map((row) => {
    if (row.errors.length > 0 || row.duplicateState === "WITHIN_FILE") {
      return row;
    }
    if (row.fingerprint && input.existingFingerprintSet.has(row.fingerprint)) {
      return { ...row, duplicateState: "EXISTING_DUPLICATE" as const };
    }
    if (row.comparisonKey && input.existingPotentialKeySet.has(row.comparisonKey)) {
      return { ...row, duplicateState: "POTENTIAL_DUPLICATE" as const };
    }
    return row;
  });
}

async function buildStatementPreview(input: {
  orgId: string;
  branchId: string | null | undefined;
  actorId: string;
  bankAccountId: string;
  config: BankStatementPreviewConfig;
  file?: File;
  storedFileKey?: string;
  storedDisplayName?: string;
  storedFileHash?: string;
}) {
  const bankAccount = await getScopedBankAccount(
    input.orgId,
    input.branchId,
    input.bankAccountId,
  );
  if (!bankAccount.isActive) {
    throw new Error("Inactive bank accounts cannot accept new statement imports.");
  }

  const stored =
    input.file != null
      ? await storeBankStatementFile({
          orgId: input.orgId,
          bankAccountId: input.bankAccountId,
          file: input.file,
        })
      : input.storedFileKey && input.storedDisplayName && input.storedFileHash
        ? {
            ...(await readStoredBankStatementFile(input.storedFileKey)),
            fileKey: input.storedFileKey,
            displayName: input.storedDisplayName,
          }
        : null;

  if (!stored) {
    throw new Error("Upload a CSV statement file to continue.");
  }

  const parsedFile = parseStoredStatementFile({
    fileKey: stored.fileKey,
    displayName: stored.displayName,
    fileHash: input.storedFileHash ?? stored.fileHash,
    text: stored.text,
    headerRowIndex: input.config.headerRowIndex,
  });

  const requiresMapping =
    !input.config.columns?.dateColumn ||
    !input.config.columns?.descriptionColumn ||
    (!input.config.columns?.amountColumn &&
      !input.config.columns?.debitColumn &&
      !input.config.columns?.creditColumn) ||
    !input.config.dateFormat;

  if (requiresMapping) {
    return {
      bankAccountId: bankAccount.id,
      accountName: bankAccount.name,
      currencyCode: bankAccount.currencyCode,
      displayName: parsedFile.displayName,
      fileHash: parsedFile.fileHash,
      fileKey: parsedFile.fileKey,
      headers: parsedFile.headers,
      headerRowIndex: parsedFile.headerRowIndex,
      sampleRows: parsedFile.sampleRows,
      requiresMapping: true,
      config: input.config,
      summary: {
        totalRows: parsedFile.rows.length,
        validRows: 0,
        invalidRows: 0,
        duplicateRows: 0,
        potentialDuplicateRows: 0,
        rowsToImport: 0,
        totalDeposits: "0",
        totalWithdrawals: "0",
      },
      previewRows: [],
    } satisfies BankStatementPreviewResult;
  }

  const normalizedRows = normalizeStatementRows({
    orgId: input.orgId,
    bankAccountId: bankAccount.id,
    accountCurrencyCode: bankAccount.currencyCode,
    parsedFile,
    config: input.config,
  });

  const datedRows = normalizedRows.filter((row) => row.transactionDate && row.amount);
  const dateValues = datedRows.map((row) => row.transactionDate!);
  const minDate = dateValues.length > 0 ? dateValues.sort()[0] : null;
  const maxDate = dateValues.length > 0 ? dateValues.sort().at(-1)! : null;

  const existingLines =
    minDate && maxDate
      ? await db.accountingBankStatementLine.findMany({
          where: {
            orgId: input.orgId,
            bankAccountId: bankAccount.id,
            lineDate: {
              gte: new Date(`${minDate}T00:00:00.000Z`),
              lte: new Date(`${maxDate}T00:00:00.000Z`),
            },
            import: completedImportWhere(input.orgId, bankAccount.id),
          },
          select: {
            lineDate: true,
            debitAmount: true,
            creditAmount: true,
            description: true,
            reference: true,
            rawPayload: true,
          },
        })
      : [];

  const existingFingerprintSet = new Set<string>();
  const existingPotentialKeySet = new Set<string>();
  for (const line of existingLines) {
    const metadata = parseImportMetadata(line.rawPayload);
    const derivedAmount = line.debitAmount?.toString() ?? (line.creditAmount ? `-${line.creditAmount.toString()}` : "0");
    const fingerprint =
      typeof metadata.fingerprint === "string" && metadata.fingerprint
        ? metadata.fingerprint
        : buildStatementFingerprint({
            orgId: input.orgId,
            bankAccountId: bankAccount.id,
            transactionDate: isoDate(line.lineDate)!,
            amount: derivedAmount,
            currencyCode: bankAccount.currencyCode,
            reference: line.reference,
            description: line.description,
          });
    existingFingerprintSet.add(fingerprint);
    existingPotentialKeySet.add(
      buildPotentialDuplicateKey({
        transactionDate: isoDate(line.lineDate)!,
        amount: derivedAmount,
        currencyCode: bankAccount.currencyCode,
      }),
    );
  }

  const previewRows = classifyDuplicates({
    orgId: input.orgId,
    bankAccountId: bankAccount.id,
    rows: normalizedRows,
    existingFingerprintSet,
    existingPotentialKeySet,
  }).map((row) => ({
    sourceRowNumber: row.sourceRowNumber,
    transactionDate: row.transactionDate,
    description: row.description || row.reference || "",
    reference: row.reference,
    deposit: row.deposit,
    withdrawal: row.withdrawal,
    amount: row.amount,
    runningBalance: row.runningBalance,
    currencyCode: row.currencyCode,
    fingerprint: row.fingerprint,
    duplicateState: row.duplicateState,
    errors: row.errors,
  })) satisfies NormalizedStatementPreviewRow[];

  const summary = summarizePreviewRows(previewRows, BANK_STATEMENT_PREVIEW_LIMIT);

  return {
    bankAccountId: bankAccount.id,
    accountName: bankAccount.name,
    currencyCode: bankAccount.currencyCode,
    displayName: parsedFile.displayName,
    fileHash: parsedFile.fileHash,
    fileKey: parsedFile.fileKey,
    headers: parsedFile.headers,
    headerRowIndex: parsedFile.headerRowIndex,
    sampleRows: parsedFile.sampleRows,
    requiresMapping: false,
    config: input.config,
    summary,
    previewRows: summary.previewRows,
  } satisfies BankStatementPreviewResult;
}

export async function previewBankStatementImport(input: {
  orgId: string;
  branchId: string | null | undefined;
  actorId: string;
  bankAccountId: string;
  config: BankStatementPreviewConfig;
  file?: File;
  storedFileKey?: string;
  storedDisplayName?: string;
  storedFileHash?: string;
}) {
  return buildStatementPreview(input);
}

export async function commitBankStatementImport(input: {
  orgId: string;
  branchId: string | null | undefined;
  actorId: string;
  bankAccountId: string;
  config: BankStatementPreviewConfig;
  storedFileKey: string;
  storedDisplayName: string;
  storedFileHash: string;
}) {
  const preview = await buildStatementPreview({
    orgId: input.orgId,
    branchId: input.branchId,
    actorId: input.actorId,
    bankAccountId: input.bankAccountId,
    config: input.config,
    storedFileKey: input.storedFileKey,
    storedDisplayName: input.storedDisplayName,
    storedFileHash: input.storedFileHash,
  });
  if (preview.requiresMapping) {
    throw new Error("Complete the statement mapping before importing.");
  }

  const bankAccount = await getScopedBankAccount(
    input.orgId,
    input.branchId,
    input.bankAccountId,
  );
  if (!bankAccount.isActive) {
    throw new Error("Inactive bank accounts cannot accept new statement imports.");
  }

  const existingImport = await db.accountingBankStatementImport.findFirst({
    where: {
      orgId: input.orgId,
      bankAccountId: input.bankAccountId,
      sourceFileHash: preview.fileHash,
    },
    select: {
      id: true,
      sourceFileName: true,
      importStatus: true,
      importExceptions: true,
      createdAt: true,
      statementStart: true,
      statementEnd: true,
      closingBalance: true,
      importedBy: { select: { name: true, email: true } },
    },
  });
  if (existingImport) {
    return {
      id: existingImport.id,
      status: existingImport.importStatus,
      duplicate: true,
    };
  }

  const importableRows = preview.previewRows.filter(
    (row) =>
      row.errors.length === 0 &&
      row.duplicateState !== "WITHIN_FILE" &&
      row.duplicateState !== "EXISTING_DUPLICATE",
  );

  const initialMetadata = {
    phase: "banking_statement_import",
    fileKey: preview.fileKey,
    fileKeyLabel: maskStatementFileKey(preview.fileKey),
    configJson: serializeStatementConfig(preview.config),
    previewSummary: {
      totalRows: preview.summary.totalRows,
      validRows: preview.summary.validRows,
      invalidRows: preview.summary.invalidRows,
      duplicateRows: preview.summary.duplicateRows,
      potentialDuplicateRows: preview.summary.potentialDuplicateRows,
      rowsToImport: preview.summary.rowsToImport,
    },
  };

  const createdImport = await db.accountingBankStatementImport.create({
    data: {
      orgId: input.orgId,
      legalEntityId: bankAccount.legalEntityId,
      bankAccountId: bankAccount.id,
      sourceFileName: preview.displayName,
      sourceFileHash: preview.fileHash,
      sourceFormat: "CSV",
      statementStart: preview.config.statementStart
        ? new Date(`${preview.config.statementStart}T00:00:00.000Z`)
        : null,
      statementEnd: preview.config.statementEnd
        ? new Date(`${preview.config.statementEnd}T00:00:00.000Z`)
        : null,
      openingBalance: preview.config.openingBalance
        ? new Prisma.Decimal(preview.config.openingBalance)
        : null,
      closingBalance: preview.config.closingBalance
        ? new Prisma.Decimal(preview.config.closingBalance)
        : null,
      importStatus: "PROCESSING",
      importExceptions: initialMetadata as Prisma.InputJsonValue,
      importedById: input.actorId,
    },
  });

  try {
    await db.$transaction(async (tx) => {
      if (importableRows.length > 0) {
        await tx.accountingBankStatementLine.createMany({
          data: importableRows.map((row, index) => ({
            orgId: input.orgId,
            legalEntityId: bankAccount.legalEntityId,
            importId: createdImport.id,
            bankAccountId: bankAccount.id,
            lineDate: new Date(`${row.transactionDate}T00:00:00.000Z`),
            valueDate: null,
            sequenceNumber: index + 1,
            reference: row.reference,
            description: row.description,
            debitAmount:
              row.deposit !== "0" ? new Prisma.Decimal(row.deposit) : null,
            creditAmount:
              row.withdrawal !== "0" ? new Prisma.Decimal(row.withdrawal) : null,
            runningBalance: row.runningBalance ? new Prisma.Decimal(row.runningBalance) : null,
            importExceptionCode: null,
            reconciliationStatus: "UNMATCHED",
            canonicalTargetType: null,
            canonicalTargetIdentifier: null,
            rawPayload: {
              sourceRowNumber: row.sourceRowNumber,
              fingerprint: row.fingerprint,
              currencyCode: row.currencyCode,
              duplicateState: row.duplicateState,
            } as Prisma.InputJsonValue,
          })),
        });
      }

      const finalStatus =
        preview.summary.invalidRows > 0 || preview.summary.duplicateRows > 0
          ? "COMPLETED_WITH_ERRORS"
          : "COMPLETED";

      await tx.accountingBankStatementImport.update({
        where: { id: createdImport.id },
        data: {
          importStatus: finalStatus,
          importExceptions: {
            ...initialMetadata,
            importedAt: new Date().toISOString(),
            importedRows: importableRows.length,
            failureCode: null,
            failureMessage: null,
          } as Prisma.InputJsonValue,
          rowVersion: { increment: 1 },
        },
      });
    });
  } catch (error) {
    const failureMessage =
      error instanceof Error ? error.message : "The statement import could not be completed.";
    await db.accountingBankStatementImport.update({
      where: { id: createdImport.id },
      data: {
        importStatus: "FAILED",
        importExceptions: {
          ...initialMetadata,
          failureCode: "IMPORT_FAILED",
          failureMessage,
        } as Prisma.InputJsonValue,
        rowVersion: { increment: 1 },
      },
    });
    await createAuditLog(
      input.orgId,
      input.actorId,
      "BANKING_STATEMENT_IMPORT_FAILED",
      "AccountingBankStatementImport",
      createdImport.id,
      null,
      {
        bankAccountId: bankAccount.id,
        fileName: preview.displayName,
        message: failureMessage,
      },
    );
    throw error;
  }

  await createAuditLog(
    input.orgId,
    input.actorId,
    "BANKING_STATEMENT_IMPORTED",
    "AccountingBankStatementImport",
    createdImport.id,
    null,
    {
      bankAccountId: bankAccount.id,
      fileName: preview.displayName,
      importedRows: importableRows.length,
      invalidRows: preview.summary.invalidRows,
      duplicateRows: preview.summary.duplicateRows,
      potentialDuplicateRows: preview.summary.potentialDuplicateRows,
    },
  );

  return {
    id: createdImport.id,
    status:
      preview.summary.invalidRows > 0 || preview.summary.duplicateRows > 0
        ? "COMPLETED_WITH_ERRORS"
        : "COMPLETED",
    duplicate: false,
  };
}

export async function listBankStatementImportHistory(input: {
  orgId: string;
  branchId: string | null | undefined;
  bankAccountId?: string | null;
  limit?: number;
}) {
  const rows = await db.accountingBankStatementImport.findMany({
    where: {
      orgId: input.orgId,
      ...(input.bankAccountId ? { bankAccountId: input.bankAccountId } : {}),
      ...(input.branchId
        ? {
            bankAccount: {
              ledgerAccount: {
                OR: buildScopedBranchFilter(input.branchId),
              },
            },
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: input.limit ?? 20,
    select: {
      id: true,
      bankAccountId: true,
      sourceFileName: true,
      sourceFormat: true,
      statementStart: true,
      statementEnd: true,
      createdAt: true,
      importStatus: true,
      closingBalance: true,
      importExceptions: true,
      bankAccount: {
        select: {
          name: true,
          currencyCode: true,
        },
      },
      importedBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return rows.map((row) => {
    const metadata = parseImportMetadata(row.importExceptions);
    const previewSummary =
      typeof metadata.previewSummary === "object" && metadata.previewSummary
        ? (metadata.previewSummary as Record<string, unknown>)
        : {};
    return {
      id: row.id,
      bankAccountId: row.bankAccountId,
      bankAccountName: row.bankAccount.name,
      sourceFileName: row.sourceFileName,
      sourceFileKeyLabel:
        typeof metadata.fileKeyLabel === "string" ? metadata.fileKeyLabel : null,
      sourceFormat: row.sourceFormat,
      statementStart: isoDate(row.statementStart),
      statementEnd: isoDate(row.statementEnd),
      importDate: row.createdAt.toISOString(),
      importedBy: row.importedBy.name || row.importedBy.email || "Unknown user",
      status: row.importStatus,
      totalRows: Number(previewSummary.totalRows ?? 0),
      importedRows: Number(metadata.importedRows ?? previewSummary.rowsToImport ?? 0),
      invalidRows: Number(previewSummary.invalidRows ?? 0),
      duplicateRows: Number(previewSummary.duplicateRows ?? 0),
      closingBalance: row.closingBalance?.toString() ?? null,
      currencyCode: row.bankAccount.currencyCode,
      failureReason:
        typeof metadata.failureMessage === "string" ? metadata.failureMessage : null,
    } satisfies BankStatementImportHistoryRow;
  });
}
