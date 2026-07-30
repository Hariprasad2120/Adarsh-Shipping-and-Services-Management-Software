import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = process.cwd();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

const requiredFiles = [
  "src/modules/accounting/rollout/policy-register.ts",
  "src/modules/accounting/rollout/production-configuration.ts",
  "src/modules/accounting/rollout/migration-manifest.ts",
  "src/modules/accounting/rollout/go-no-go.ts",
  "src/modules/accounting/rollout/cutover-state-machine.ts",
  "src/modules/accounting/rollout/backup-readiness.ts",
  "src/modules/accounting/rollout/rehearsal.ts",
  "src/modules/accounting/rollout/operational-controls.ts",
  "docs/accounting/contracts/accounting-phase7-policy-register.v1.json",
  "docs/accounting/contracts/accounting-phase7-manifest.synthetic.v1.json",
  "docs/accounting/phase-7-rollout-readiness.md",
  "docs/accounting/phase-7-operational-runbook.md",
  "docs/accounting/phase-7-traceability.md",
];
for (const path of requiredFiles) {
  assert(existsSync(resolve(root, path)), `Missing Phase 7 artifact: ${path}`);
}

const rolloutFiles = files(resolve(root, "src/modules/accounting/rollout")).filter(
  (path) => path.endsWith(".ts"),
);
for (const path of rolloutFiles) {
  const source = readFileSync(path, "utf8");
  assert(
    !/from\s+["']@\/lib\/db["']/.test(source),
    `${relative(root, path)} imports the database client`,
  );
  assert(
    !/\b(?:generalLedgerEntry|journalEntryLine|journalEntry)\s*\.\s*(?:create|createMany|update|updateMany|delete|deleteMany|upsert)\s*\(/.test(
      source,
    ),
    `${relative(root, path)} directly mutates financial records`,
  );
  assert(
    !/\$(?:queryRaw|executeRaw)(?:Unsafe)?/.test(source),
    `${relative(root, path)} contains SQL execution`,
  );
  assert(
    !/\b(?:fetch|axios)\s*\(/.test(source),
    `${relative(root, path)} contains a provider/network call`,
  );
}

const pipeline = readFileSync(
  resolve(root, "src/modules/accounting/migration/pipeline.ts"),
  "utf8",
);
assert(
  pipeline.includes('target === "production"') &&
    pipeline.includes("PRODUCTION_BLOCKED"),
  "Phase 6 production block was weakened",
);
const provider = readFileSync(
  resolve(root, "src/modules/accounting/migration/provider-adapter.ts"),
  "utf8",
);
assert(
  provider.includes("readonly enabled = false"),
  "Provider disabled default was weakened",
);
const configuration = readFileSync(
  resolve(root, "src/modules/accounting/rollout/production-configuration.ts"),
  "utf8",
);
for (const signal of [
  "DATABASE_PORT_5432_FORBIDDEN",
  "STAGING_FALLBACK_FORBIDDEN",
  "PHASE7_PRODUCTION_EXECUTION_DISABLED",
  "MAKER_CHECKER_SEPARATION_REQUIRED",
]) {
  assert(configuration.includes(signal), `Configuration contract is missing ${signal}`);
}
const cutover = readFileSync(
  resolve(root, "src/modules/accounting/rollout/cutover-state-machine.ts"),
  "utf8",
);
for (const state of [
  "ProductionAuthorized",
  "CutoverRunning",
  "Hypercare",
  "Completed",
]) {
  assert(
    cutover.includes(`"${state}"`),
    `Cutover state machine is missing ${state}`,
  );
}
assert(
  cutover.includes("CUTOVER_PHASE7_STATE_FORBIDDEN"),
  "Phase 7 forbidden cutover transitions are not enforced",
);

for (const clientRoot of [
  resolve(root, "src/app"),
  resolve(root, "src/components"),
]) {
  for (const path of files(clientRoot).filter((entry) =>
    /\.[cm]?[jt]sx?$/.test(entry),
  )) {
    assert(
      !/from\s+["']@\/modules\/accounting\/rollout\/(?:rehearsal|production-configuration|cutover-state-machine)["']/.test(
        readFileSync(path, "utf8"),
      ),
      `${relative(root, path)} imports server rollout internals`,
    );
  }
}

const packageJson = JSON.parse(
  readFileSync(resolve(root, "package.json"), "utf8"),
);
for (const script of [
  "accounting:phase7:verify",
  "accounting:phase7:readiness",
  "accounting:phase7:rehearsal",
  "accounting:phase7:benchmark",
  "accounting:phase7:safety-scan",
]) {
  assert(packageJson.scripts?.[script], `package.json is missing ${script}`);
}

console.log(
  `Verified ${rolloutFiles.length} Phase 7 rollout modules, production/provider blocks, policy/configuration/manifest contracts, cutover guards, client isolation, and tracked runbooks.`,
);
