import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = process.cwd();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function files(directory, predicate = () => true) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? files(path, predicate)
      : predicate(path)
        ? [path]
        : [];
  });
}

function source(path) {
  return readFileSync(resolve(root, path), "utf8");
}

const requiredFiles = [
  "src/modules/accounting/migration/types.ts",
  "src/modules/accounting/migration/source-contract.ts",
  "src/modules/accounting/migration/mapping.ts",
  "src/modules/accounting/migration/dependency-order.ts",
  "src/modules/accounting/migration/pipeline.ts",
  "src/modules/accounting/migration/reconciliation.ts",
  "src/modules/accounting/migration/readiness.ts",
  "src/modules/accounting/migration/post-cutover.ts",
  "src/modules/accounting/migration/security.ts",
  "src/modules/accounting/migration/canonical-executor.ts",
  "src/modules/accounting/migration/repository.ts",
  "prisma/migrations/20260730230000_accounting_phase6_migration_control/migration.sql",
  "docs/accounting/phase-6-production-readiness.md",
  "docs/accounting/phase-6-cutover-runbook.md",
  "docs/accounting/contracts/accounting-import-v1.schema.json",
];
for (const path of requiredFiles) {
  assert(existsSync(resolve(root, path)), `Missing Phase 6 artifact: ${path}`);
}

const migrationRoot = resolve(root, "src/modules/accounting/migration");
const migrationSources = files(migrationRoot, (path) => path.endsWith(".ts"));
const directFinancialWrite =
  /\b(?:generalLedgerEntry|journalEntryLine|journalEntry)\s*\.\s*(?:create|createMany|update|updateMany|delete|deleteMany|upsert)\s*\(/;
for (const path of migrationSources) {
  const text = readFileSync(path, "utf8");
  assert(
    !directFinancialWrite.test(text),
    `${relative(root, path)} contains a direct journal or ledger writer`,
  );
}

const executor = source(
  "src/modules/accounting/migration/canonical-executor.ts",
);
for (const signal of [
  "prepareLegacySalesInvoice",
  "prepareLegacyPurchaseInvoice",
  "prepareLegacyPayment",
]) {
  assert(executor.includes(signal), `Canonical executor is missing ${signal}`);
}
assert(
  executor.includes('import "server-only"'),
  "Canonical executor must remain server-only",
);
assert(
  executor.includes("legalEntityId: input.legalEntityId") &&
    executor.includes("SCOPE_VIOLATION:CANONICAL_TARGET"),
  "Canonical executor must enforce the explicit legal-entity scope",
);

const pipeline = source("src/modules/accounting/migration/pipeline.ts");
for (const signal of [
  'target === "production"',
  "PRODUCTION_BLOCKED",
  "PHASE6_SYNTHETIC_STAGING_ONLY",
  'mode === "DRY_RUN"',
  "reconciliation.totalsComplete",
  "reconciliation.totalsMatch",
]) {
  assert(pipeline.includes(signal), `Pipeline is missing guard ${signal}`);
}

const repository = source(
  "src/modules/accounting/migration/repository.ts",
);
assert(
  !/accountingMigration(?:Batch|Record|Mapping|Exception)\.update\(\s*\{\s*where:\s*\{\s*id:/m.test(
    repository,
  ),
  "Phase 6 repository contains an id-only mutation",
);
for (const signal of [
  "MIGRATION_BATCH_FINALIZATION_SCOPE_MISMATCH",
  "MIGRATION_APPROVED_MAPPING_STALE_OR_INVALID",
  "legalEntityId: input.legalEntityId",
]) {
  assert(repository.includes(signal), `Repository is missing scope guard ${signal}`);
}

const policyGates = source(
  "src/modules/accounting/migration/policy-gates.ts",
);
for (const signal of [
  "assertAcceptedPolicyReference",
  "CURRENCY_POLICY_REQUIRED",
  "EXCHANGE_RATE_POLICY_REQUIRED",
  "TAX_POLICY_REQUIRED",
  "ATTACHMENT_POLICY_REQUIRED",
]) {
  assert(policyGates.includes(signal), `Policy gates are missing ${signal}`);
}

const provider = source(
  "src/modules/accounting/migration/provider-adapter.ts",
);
assert(
  provider.includes("readonly enabled = false"),
  "Provider adapter must be disabled by default",
);
assert(
  provider.includes("PROVIDER_AUTHENTICATION_DISABLED"),
  "Provider authentication must remain blocked",
);

const legacyScript = source("scripts/migrate-accounting-data.ts");
for (const forbidden of [
  "generalLedgerEntry.create",
  "journalEntry.create",
  "seedChartOfAccounts",
  "zohotoerpmigration",
  "cmp4cw6",
]) {
  assert(
    !legacyScript.includes(forbidden),
    `Migration CLI contains forbidden legacy signal ${forbidden}`,
  );
}
for (const required of [
  "assertExactStagingEnvironment",
  "verifyExactStagingDatabaseIdentity",
  "assertStagingOutboundDeliveryDisabled",
  "PHASE6_SYNTHETIC_STAGING_ONLY",
]) {
  assert(
    legacyScript.includes(required),
    `Migration CLI is missing guard ${required}`,
  );
}

const clientRoots = [
  resolve(root, "src/app"),
  resolve(root, "src/components"),
];
for (const clientRoot of clientRoots) {
  for (const path of files(clientRoot, (entry) => /\.[cm]?[jt]sx?$/.test(entry))) {
    const text = readFileSync(path, "utf8");
    assert(
      !/from\s+["']@\/modules\/accounting\/migration\/(?:repository|canonical-executor)["']/.test(
        text,
      ),
      `${relative(root, path)} imports server migration execution code`,
    );
  }
}

const migrationSql = source(
  "prisma/migrations/20260730230000_accounting_phase6_migration_control/migration.sql",
);
assert(
  !/\b(?:DROP|TRUNCATE|DELETE\s+FROM)\b/i.test(migrationSql),
  "Phase 6 schema migration must be additive",
);
assert(
  !/ALTER\s+TABLE\s+"(?!AccountingMigration)/i.test(migrationSql),
  "Phase 6 migration alters a pre-existing table",
);
for (const guard of [
  "AccountingMigrationBatch_guard_check",
  "AccountingMigrationRecord_scope_guard",
  "AccountingMigrationRecord_immutable_success_guard",
  "AccountingMigrationBatch_completion_guard",
]) {
  assert(migrationSql.includes(guard), `Migration is missing ${guard}`);
}

const contractSchema = JSON.parse(
  source("docs/accounting/contracts/accounting-import-v1.schema.json"),
);
assert(
  contractSchema.$id === "accounting-import/v1",
  "Import contract schema ID is incorrect",
);

const packageJson = JSON.parse(source("package.json"));
for (const script of [
  "accounting:migration",
  "accounting:readiness",
  "accounting:phase6:verify",
  "accounting:phase6:benchmark",
  "accounting:deployment:verify",
  "accounting:phase6:staging-preflight",
  "accounting:phase6:safety-scan",
]) {
  assert(packageJson.scripts?.[script], `package.json is missing ${script}`);
}

for (const path of migrationSources) {
  assert(
    statSync(path).size <= 128 * 1024,
    `${relative(root, path)} exceeds the bounded source-file limit`,
  );
}

console.log(
  `Verified ${migrationSources.length} Phase 6 migration modules, canonical boundaries, production/provider guards, additive schema controls, client isolation, contracts, and tracked runbooks.`,
);
