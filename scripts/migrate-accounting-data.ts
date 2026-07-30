import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import { assertStagingOutboundDeliveryDisabled } from "./staging-login-policy";
import {
  assertExactStagingEnvironment,
  verifyExactStagingDatabaseIdentity,
} from "./staging-target";
import { runAccountingMigrationPipeline } from "../src/modules/accounting/migration/pipeline";
import {
  boundedSafeMessage,
  safeSpreadsheetCell,
} from "../src/modules/accounting/migration/security";
import type { AccountingMapping } from "../src/modules/accounting/migration/types";

const MAX_IMPORT_BYTES = 64 * 1024 * 1024;
const REPORT_ROOT = resolve(process.cwd(), "artifacts", "accounting-phase6");

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function flag(name: string) {
  return process.argv.includes(name);
}

function readJson(pathValue: string, label: string): unknown {
  const filePath = resolve(pathValue);
  if (!existsSync(filePath)) throw new Error(`${label.toUpperCase()}_NOT_FOUND`);
  const source = readFileSync(filePath);
  if (source.length === 0 || source.length > MAX_IMPORT_BYTES) {
    throw new Error(`${label.toUpperCase()}_SIZE_INVALID`);
  }
  try {
    return JSON.parse(source.toString("utf8"));
  } catch {
    throw new Error(`${label.toUpperCase()}_JSON_INVALID`);
  }
}

function reportPath(pathValue: string) {
  const output = resolve(pathValue);
  const pathFromRoot = relative(REPORT_ROOT, output);
  if (
    pathFromRoot.startsWith("..") ||
    pathFromRoot === "" ||
    /^[a-zA-Z]:/.test(pathFromRoot)
  ) {
    throw new Error("REPORT_PATH_OUTSIDE_APPROVED_ARTIFACT_ROOT");
  }
  return output;
}

function safeSummary(result: Awaited<ReturnType<typeof runAccountingMigrationPipeline>>) {
  return {
    contractVersion: result.contractVersion,
    batchIdentifier: safeSpreadsheetCell(result.batchIdentifier),
    mode: result.mode,
    status: result.status,
    correlationId: result.correlationId,
    orderedRecordCount: result.orderedRecordKeys.length,
    outcomeCounts: {
      ready: result.outcomes.filter((entry) => entry.status === "READY").length,
      succeeded: result.outcomes.filter((entry) => entry.status === "SUCCEEDED")
        .length,
      skipped: result.outcomes.filter((entry) => entry.status === "SKIPPED")
        .length,
      failed: result.outcomes.filter((entry) => entry.status === "FAILED").length,
      blocked: result.outcomes.filter((entry) => entry.status === "BLOCKED")
        .length,
    },
    issues: result.issues.map((issue) => ({
      code: issue.code,
      classification: issue.classification,
      safeMessage: safeSpreadsheetCell(issue.safeMessage),
      recordKey: issue.recordKey,
      retryable: issue.retryable,
      manualReview: issue.manualReview,
    })),
    reconciliation: result.reconciliation,
    certification: result.certification,
  };
}

async function main() {
  const inputPath = argument("--input");
  const mappingsPath = argument("--mappings");
  if (!inputPath || !mappingsPath) {
    throw new Error("USAGE_REQUIRES_INPUT_AND_MAPPINGS");
  }
  const contract = readJson(inputPath, "import contract");
  const mappingsValue = readJson(mappingsPath, "mapping file");
  if (!Array.isArray(mappingsValue)) throw new Error("MAPPINGS_MUST_BE_AN_ARRAY");
  const mappings = mappingsValue as AccountingMapping[];
  const execute = flag("--execute");
  const concurrency = Number(argument("--concurrency") ?? "1");
  let result;

  if (!execute) {
    result = await runAccountingMigrationPipeline({
      contract,
      mappings,
      mode: "DRY_RUN",
      target: "synthetic-staging",
      concurrency,
    });
  } else {
    if (argument("--target") !== "synthetic-staging") {
      throw new Error("PRODUCTION_EXECUTION_BLOCKED");
    }
    const orgId = argument("--org-id");
    const legalEntityId = argument("--legal-entity-id");
    const actorId = argument("--actor-id");
    if (!orgId || !legalEntityId || !actorId) {
      throw new Error("EXECUTION_SCOPE_AND_ACTOR_REQUIRED");
    }
    assertExactStagingEnvironment("Accounting Phase 6 execution");
    assertStagingOutboundDeliveryDisabled(process.env);
    if (
      process.env.ACCOUNTING_PHASE6_EXECUTION !==
      "PHASE6_SYNTHETIC_STAGING_ONLY"
    ) {
      throw new Error("PHASE6_EXECUTION_ENV_GUARD_REQUIRED");
    }
    await verifyExactStagingDatabaseIdentity("Accounting Phase 6 execution");

    const dryRun = await runAccountingMigrationPipeline({
      contract,
      mappings,
      mode: "DRY_RUN",
      target: "synthetic-staging",
      concurrency,
    });
    if (dryRun.status !== "DRY_RUN_READY") {
      result = dryRun;
    } else {
      const [
        { createCanonicalMigrationExecutor },
        {
          checkpointingMigrationExecutor,
          finalizePersistentMigrationBatch,
          persistMigrationDryRun,
        },
      ] = await Promise.all([
        import("../src/modules/accounting/migration/canonical-executor"),
        import("../src/modules/accounting/migration/repository"),
      ]);
      const batch = await persistMigrationDryRun({
        orgId,
        legalEntityId,
        actorId,
        contract,
        mappings,
        result: dryRun,
        concurrency,
      });
      const executor = checkpointingMigrationExecutor({
        orgId,
        legalEntityId,
        actorId,
        batchId: batch.id,
        delegate: createCanonicalMigrationExecutor({
          orgId,
          legalEntityId,
          actorId,
        }),
      });
      result = await runAccountingMigrationPipeline({
        contract,
        mappings,
        mode: "EXECUTE",
        target: "synthetic-staging",
        executionProof: "PHASE6_SYNTHETIC_STAGING_ONLY",
        executor,
        concurrency,
        previousOutcomes: batch.records.map((record) => ({
          deterministicKey: record.deterministicKey,
          status:
            record.status === "SUCCEEDED"
              ? ("SUCCEEDED" as const)
              : ("READY" as const),
          canonicalTargetIdentifier:
            record.canonicalTargetIdentifier ?? undefined,
        })),
      });
      await finalizePersistentMigrationBatch({
        orgId,
        legalEntityId,
        actorId,
        batchId: batch.id,
        result,
      });
    }
  }

  const summary = safeSummary(result);
  const outputPathValue = argument("--report");
  if (outputPathValue) {
    const outputPath = reportPath(outputPathValue);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
  }
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (result.status === "FAILED" || result.status === "BLOCKED") {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  process.stderr.write(
    `${JSON.stringify({
      status: "FAILED",
      error: boundedSafeMessage(error),
    })}\n`,
  );
  process.exitCode = 1;
});
