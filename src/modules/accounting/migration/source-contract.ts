import { createHash } from "node:crypto";
import { z } from "zod";

import { canonicalPayload } from "../request-integrity";
import {
  ACCOUNTING_IMPORT_CONTRACT_VERSION,
  ACCOUNTING_MIGRATION_RECORD_TYPES,
  type AccountingImportContract,
  type AccountingImportRecord,
} from "./types";
import {
  assertNoSensitiveFields,
  validateAttachmentMetadata,
} from "./security";

const stableCode = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/);
const isoTimestamp = z.string().datetime({ offset: true });

const attachmentSchema = z.object({
  sourceIdentifier: stableCode,
  relativePath: z.string().trim().min(1).max(512),
  mimeType: z.string().trim().min(1).max(128),
  sizeBytes: z.number().int().positive().max(25 * 1024 * 1024),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
});

const importRecordSchema = z.object({
  sourceSystem: stableCode,
  sourceRecordType: z.enum(ACCOUNTING_MIGRATION_RECORD_TYPES),
  sourceIdentifier: stableCode,
  sourceVersion: stableCode.optional(),
  targetOrganizationRef: stableCode,
  targetLegalEntityRef: stableCode,
  importBatch: stableCode,
  dependencies: z.array(stableCode).max(256).default([]),
  payload: z.record(z.string(), z.unknown()),
  attachments: z.array(attachmentSchema).max(100).default([]),
});

const openingHistoryPolicySchema = z.object({
  decisionStatus: z.literal("ACCEPTED"),
  decisionReference: stableCode,
  migrationEffectiveDate: z.iso.date(),
  historicalDepth: z.string().trim().min(1).max(256),
  openingReceivables: z.string().trim().min(1).max(256),
  openingPayables: z.string().trim().min(1).max(256),
  openingBankAndCash: z.string().trim().min(1).max(256),
  openingAccountBalances: z.string().trim().min(1).max(256),
  outstandingAllocations: z.string().trim().min(1).max(256),
  retainedEarningsTreatment: z.string().trim().min(1).max(256),
  comparativeReporting: z.string().trim().min(1).max(256),
  settledHistoricalDocuments: z.string().trim().min(1).max(256),
  taxAndStatutoryHistory: z.string().trim().min(1).max(256),
  foreignCurrencyBalances: z.string().trim().min(1).max(256),
});

export const accountingImportContractSchema = z.object({
  schemaVersion: z.literal(ACCOUNTING_IMPORT_CONTRACT_VERSION),
  sourceSystem: stableCode,
  sourceBatchIdentifier: stableCode,
  extractedAt: isoTimestamp,
  targetOrganizationRef: stableCode,
  records: z.array(importRecordSchema).min(1).max(100_000),
  openingHistoryPolicy: openingHistoryPolicySchema.optional(),
});

export function parseAccountingImportContract(
  value: unknown,
): AccountingImportContract {
  assertNoSensitiveFields(value);
  const parsed = accountingImportContractSchema.parse(value);
  for (const record of parsed.records) {
    if (record.sourceSystem !== parsed.sourceSystem) {
      throw new Error("SOURCE_SYSTEM_SCOPE_MISMATCH");
    }
    if (record.importBatch !== parsed.sourceBatchIdentifier) {
      throw new Error("IMPORT_BATCH_SCOPE_MISMATCH");
    }
    if (record.targetOrganizationRef !== parsed.targetOrganizationRef) {
      throw new Error("ORGANIZATION_SCOPE_MISMATCH");
    }
    record.attachments.forEach(validateAttachmentMetadata);
  }
  return parsed as AccountingImportContract;
}
export function normalizedSourceVersion(record: AccountingImportRecord) {
  return record.sourceVersion?.trim() || "1";
}

export function deterministicMigrationKey(record: AccountingImportRecord) {
  const material = {
    contractVersion: ACCOUNTING_IMPORT_CONTRACT_VERSION,
    sourceSystem: record.sourceSystem,
    sourceRecordType: record.sourceRecordType,
    sourceIdentifier: record.sourceIdentifier,
    sourceVersion: normalizedSourceVersion(record),
    targetOrganizationRef: record.targetOrganizationRef,
    targetLegalEntityRef: record.targetLegalEntityRef,
    importBatch: record.importBatch,
  };
  return createHash("sha256").update(canonicalPayload(material)).digest("hex");
}

export function migrationManifestHash(contract: AccountingImportContract) {
  return createHash("sha256")
    .update(canonicalPayload(contract))
    .digest("hex");
}
