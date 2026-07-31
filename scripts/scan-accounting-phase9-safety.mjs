import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();

function git(args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(`Git inventory failed for ${args.join(" ")}`);
  }
  return result.stdout.split(/\r?\n/).filter(Boolean);
}

const changed = new Set([
  ...git(["diff", "--name-only"]),
  ...git(["diff", "--cached", "--name-only"]),
  ...git(["ls-files", "--others", "--exclude-standard"]),
]);

const ignoredSelfScanPaths = new Set([
  "scripts/scan-accounting-phase9-safety.mjs",
  "scripts/verify-accounting-phase9-static.mjs",
]);

const findings = [];
let scanned = 0;
const binaryExtensions = new Set([".zip", ".png", ".jpg", ".jpeg", ".gif", ".pdf"]);
const forbiddenPath =
  /(^|\/)(?:\.env(?:\.|$)|node_modules|\.next|\.monolith-staging)(\/|$)|\.(?:pem|p12|pfx|key)$/i;

for (const path of [...changed].sort()) {
  const unixPath = path.replaceAll("\\", "/");
  if (ignoredSelfScanPaths.has(unixPath)) continue;
  if (forbiddenPath.test(unixPath)) {
    findings.push({ path, finding: "FORBIDDEN_PATH" });
    continue;
  }
  if (binaryExtensions.has(extname(path).toLowerCase())) continue;
  const absolute = resolve(root, path);
  if (!existsSync(absolute)) continue;
  if (statSync(absolute).size > 2 * 1024 * 1024) {
    findings.push({ path, finding: "UNBOUNDED_TEXT_ARTIFACT" });
    continue;
  }
  const text = readFileSync(absolute, "utf8");
  scanned += 1;
  for (const [label, pattern] of [
    ["PRIVATE_KEY", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
    ["OPENAI_KEY", /\bsk-[A-Za-z0-9_-]{32,}\b/],
    ["DATABASE_URL_LITERAL", /postgres(?:ql)?:\/\/(?![^/\s]*\$\{)[^:\s/]+:[^@\s/]+@/i],
    ["AUTOMATIC_ZOHO_IMPORT", /Zoho.*(?:automatic|auto).*import|import.*Zoho/i],
    ["AUTOMATIC_HISTORICAL_MIGRATION", /historical (?:data )?migration.*(?:run|execute|start)/i],
    ["DIRECT_POSTED_JOURNAL_EDIT", /\b(?:journalEntry|journalEntryLine|generalLedgerEntry)\s*\.\s*(?:update|updateMany|delete|deleteMany)\s*\(/],
    ["HARDCODED_PRODUCTION_ENABLEMENT", /productionOutbox\s*:\s*true|recurringGeneration\s*:\s*true|partnerTransactions\s*:\s*true|depreciation\s*:\s*true/],
  ]) {
    if (pattern.test(text)) findings.push({ path, finding: label });
  }
}

if (findings.length) {
  process.stderr.write(
    `${JSON.stringify({ status: "FAILED", scanned, findings }, null, 2)}\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `${JSON.stringify(
      {
        status: "PASSED",
        scanned,
        changedFiles: changed.size,
        findings: 0,
      },
      null,
      2,
    )}\n`,
  );
}
