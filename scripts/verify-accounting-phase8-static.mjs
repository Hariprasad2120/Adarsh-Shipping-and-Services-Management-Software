import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const phase8Root = resolve(
  root,
  "src/modules/accounting/authorization-planning",
);

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

const violations = [];
for (const path of files(phase8Root).filter((file) => file.endsWith(".ts"))) {
  const source = readFileSync(path, "utf8");
  for (const [name, pattern] of [
    ["database client", /from\s+["']@\/lib\/db["']/],
    ["network client", /\b(?:fetch|axios)\s*\(/],
    ["raw SQL", /\$(?:queryRaw|executeRaw)(?:Unsafe)?/],
    [
      "direct journal or ledger write",
      /\b(?:generalLedgerEntry|journalEntryLine|journalEntry)\s*\.\s*(?:create|createMany|update|updateMany|delete|deleteMany|upsert)\s*\(/,
    ],
  ]) {
    if (pattern.test(source)) violations.push(`${path}: ${name}`);
  }
}

for (const directory of ["src/app", "src/components"]) {
  for (const path of files(resolve(root, directory)).filter((file) =>
    /\.[cm]?[jt]sx?$/.test(file),
  )) {
    const source = readFileSync(path, "utf8");
    if (
      /^\s*["']use client["'];/m.test(source) &&
      /from\s+["']@\/modules\/accounting\/authorization-planning/.test(source)
    ) {
      violations.push(`${path}: client import of Phase 8 internals`);
    }
  }
}

const requestTypes = readFileSync(
  resolve(root, "src/modules/accounting/authorization-planning/types.ts"),
  "utf8",
);
for (const forbidden of [
  '"PRODUCTION_AUTHORIZED"',
  '"CUTOVER_RUNNING"',
  '"HYPERCARE"',
  '"COMPLETED"',
]) {
  if (requestTypes.includes(forbidden)) {
    violations.push(`authorization request state exposes ${forbidden}`);
  }
}

if (violations.length) {
  process.stderr.write(`${violations.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `${JSON.stringify({
      status: "PASSED",
      phase8Files: files(phase8Root).length,
      databaseConnected: false,
      outboundDeliveryConnected: false,
      productionAuthorizationReachable: false,
    })}\n`,
  );
}
