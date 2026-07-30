import { performance } from "node:perf_hooks";

import { runAccountingMigrationPipeline } from "../src/modules/accounting/migration/pipeline";
import type {
  AccountingImportContract,
  AccountingMapping,
} from "../src/modules/accounting/migration/types";

const requestedSize = Number(
  process.argv.find((argument) => argument.startsWith("--records="))?.split(
    "=",
  )[1] ?? "2000",
);
if (
  !Number.isSafeInteger(requestedSize) ||
  requestedSize < 1 ||
  requestedSize > 10000
) {
  throw new Error("Synthetic record count must be from 1 to 10000");
}

const records: AccountingImportContract["records"] = Array.from(
  { length: requestedSize },
  (_, index) => ({
    sourceSystem: "SYNTHETIC_BENCHMARK",
    sourceRecordType: "SALES_INVOICE" as const,
    sourceIdentifier: `invoice-${String(index + 1).padStart(6, "0")}`,
    sourceVersion: "1",
    targetOrganizationRef: "source-org",
    targetLegalEntityRef: "source-entity",
    importBatch: "bounded-performance",
    dependencies: [],
    payload: {
      currencyCode: index % 2 === 0 ? "INR" : "USD",
      acceptedCurrencyPolicyReference: "POLICY-CURRENCY-BENCHMARK",
      totals: {
        documentTotal: "1234.56780000",
        debitTotal: "1234.56780000",
        creditTotal: "1234.56780000",
      },
    },
    attachments: [],
  }),
);
const contract: AccountingImportContract = {
  schemaVersion: "accounting-import/v1",
  sourceSystem: "SYNTHETIC_BENCHMARK",
  sourceBatchIdentifier: "bounded-performance",
  extractedAt: "2026-07-30T00:00:00.000Z",
  targetOrganizationRef: "source-org",
  records,
};
const mappings: AccountingMapping[] = [
  {
    sourceSystem: "SYNTHETIC_BENCHMARK",
    targetOrganizationId: "target-org",
    mappingType: "ORGANIZATION",
    sourceValue: "source-org",
    targetType: "Organisation",
    targetId: "target-org",
    version: 1,
    status: "APPROVED",
    decisionReference: "BENCHMARK-ORG",
  },
  {
    sourceSystem: "SYNTHETIC_BENCHMARK",
    targetOrganizationId: "target-org",
    targetLegalEntityId: "target-entity",
    mappingType: "LEGAL_ENTITY",
    sourceValue: "source-entity",
    targetType: "AccountingLegalEntity",
    targetId: "target-entity",
    version: 1,
    status: "APPROVED",
    decisionReference: "BENCHMARK-ENTITY",
  },
];

async function main() {
  const memoryBefore = process.memoryUsage().heapUsed;
  const started = performance.now();
  const result = await runAccountingMigrationPipeline({
    contract,
    mappings,
    concurrency: 8,
  });
  const durationMs = performance.now() - started;
  const memoryAfter = process.memoryUsage().heapUsed;
  process.stdout.write(
    `${JSON.stringify(
      {
        synthetic: true,
        bounded: true,
        records: requestedSize,
        status: result.status,
        durationMs: Math.round(durationMs * 100) / 100,
        recordsPerSecond:
          Math.round((requestedSize / (durationMs / 1000)) * 100) / 100,
        heapDeltaBytes: memoryAfter - memoryBefore,
        databaseQueries: 0,
        currencies: result.reconciliation.currencies.length,
        errorCount: result.issues.length,
      },
      null,
      2,
    )}\n`,
  );
}

void main();
