import { readFileSync, statSync } from "node:fs";
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
    throw new Error(`Git safety inventory failed for ${args[0]}`);
  }
  return result.stdout.split(/\r?\n/).filter(Boolean);
}

const changed = new Set([
  ...git(["diff", "--name-only"]),
  ...git(["diff", "--cached", "--name-only"]),
  ...git(["ls-files", "--others", "--exclude-standard"]),
]);
const forbiddenPath = /(^|\/)(?:\.env(?:\.|$)|node_modules|\.next|\.monolith-staging)(\/|$)|\.(?:pem|p12|pfx|key)$/i;
const binaryExtensions = new Set([
  ".zip",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".pdf",
]);
const patterns = [
  ["PRIVATE_KEY", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["AWS_ACCESS_KEY", /\bAKIA[0-9A-Z]{16}\b/],
  ["GITHUB_TOKEN", /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/],
  ["OPENAI_KEY", /\bsk-[A-Za-z0-9_-]{32,}\b/],
  [
    "DATABASE_CREDENTIAL_URL",
    /postgres(?:ql)?:\/\/(?![^/\s]*\$\{)[^:\s/]+:[^@\s/]+@/i,
  ],
  [
    "HARDCODED_PROVIDER_SECRET",
    /(?:api[_-]?key|client[_-]?secret|access[_-]?token)\s*[:=]\s*["'][^"'$\s]{12,}["']/i,
  ],
];

const findings = [];
let scanned = 0;
for (const path of [...changed].sort()) {
  if (forbiddenPath.test(path.replaceAll("\\", "/"))) {
    findings.push({ path, finding: "FORBIDDEN_PATH" });
    continue;
  }
  const absolute = resolve(root, path);
  if (binaryExtensions.has(extname(path).toLowerCase())) continue;
  if (statSync(absolute).size > 2 * 1024 * 1024) {
    findings.push({ path, finding: "UNBOUNDED_TEXT_ARTIFACT" });
    continue;
  }
  const text = readFileSync(absolute, "utf8");
  scanned += 1;
  for (const [label, pattern] of patterns) {
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
    `${JSON.stringify({
      status: "PASSED",
      scanned,
      changedFiles: changed.size,
      secretPatternHits: 0,
      forbiddenArtifacts: 0,
    })}\n`,
  );
}
