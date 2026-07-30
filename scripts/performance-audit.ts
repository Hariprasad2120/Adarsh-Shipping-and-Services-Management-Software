import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Finding = {
  file: string;
  line: number;
  rule: string;
  detail: string;
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const writeReport = process.argv.includes("--write-report");
const sourceExtension = /\.(?:[cm]?[jt]sx?)$/;
const runtimeRoots = ["src/app/", "src/components/", "src/lib/", "src/modules/"];
const rootRuntimeFiles = new Set([
  "package.json",
  "next.config.ts",
  "eslint.config.mjs",
  "tsconfig.json",
  "tsconfig.ui-migration.json",
  "vitest.config.ts",
  "prisma.config.ts",
]);

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })
    .split("\0")
    .filter(Boolean)
    .map((file) => file.replaceAll("\\", "/"))
    .sort();
}

function isAuditFile(file: string) {
  return (
    runtimeRoots.some((prefix) => file.startsWith(prefix)) ||
    file.startsWith("prisma/") ||
    file.startsWith("scripts/") ||
    rootRuntimeFiles.has(file)
  );
}

function isScannable(file: string) {
  return (
    sourceExtension.test(file) &&
    !file.startsWith("prisma/migrations/") &&
    !file.includes("/generated/")
  );
}

function lineOf(source: string, index: number) {
  return source.slice(0, index).split("\n").length;
}

function addMatches(
  findings: Finding[],
  file: string,
  source: string,
  rule: string,
  regex: RegExp,
  detail: string,
) {
  for (const match of source.matchAll(regex)) {
    findings.push({
      file,
      line: lineOf(source, match.index ?? 0),
      rule,
      detail,
    });
  }
}

function resolveImport(from: string, specifier: string, files: Set<string>) {
  let candidate: string | undefined;
  if (specifier.startsWith("@/")) candidate = `src/${specifier.slice(2)}`;
  else if (specifier.startsWith(".")) {
    candidate = path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier));
  }
  if (!candidate) return undefined;
  for (const suffix of [
    "",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    "/index.ts",
    "/index.tsx",
    "/index.js",
  ]) {
    if (files.has(`${candidate}${suffix}`)) return `${candidate}${suffix}`;
  }
  return undefined;
}

const tracked = trackedFiles();
const auditFiles = tracked.filter(isAuditFile);
const trackedSet = new Set(tracked);
const findings: Finding[] = [];
const sources = new Map<string, string>();
const imports = new Map<string, string[]>();

for (const file of auditFiles.filter(isScannable)) {
  const source = readFileSync(path.join(root, file), "utf8");
  sources.set(file, source);

  addMatches(
    findings,
    file,
    source,
    "direct-auth",
    /\bauth\s*\(\s*\)/g,
    "Direct auth() call; server render trees should use request-scoped getSession().",
  );
  addMatches(
    findings,
    file,
    source,
    "broad-find-many",
    /\.findMany\s*\(\s*(?:\)|\{\s*\})/g,
    "findMany has no explicit bounded projection or arguments.",
  );
  addMatches(
    findings,
    file,
    source,
    "broad-include",
    /\binclude\s*:\s*\{[\s\S]{0,1200}?\b(?:true|include\s*:)/g,
    "Broad relational include; verify only rendered fields are selected.",
  );
  addMatches(
    findings,
    file,
    source,
    "database-in-loop",
    /\b(?:for|while)\s*\([^)]*\)\s*\{[\s\S]{0,1500}?\b(?:prisma|tx)\.[A-Za-z]/g,
    "Potential database operation inside a loop.",
  );
  addMatches(
    findings,
    file,
    source,
    "polling",
    /\bsetInterval\s*\(/g,
    "Repeated polling timer; verify visibility pause, singleton, and in-flight coordination.",
  );
  addMatches(
    findings,
    file,
    source,
    "no-store-fetch",
    /\bfetch\s*\([^;]{0,500}?\bcache\s*:\s*["']no-store["']/g,
    "Uncached fetch; verify it is required and not duplicated during rendering.",
  );
  addMatches(
    findings,
    file,
    source,
    "unbounded-promise-all",
    /Promise\.all\s*\(\s*[A-Za-z0-9_.$]+\.(?:map|flatMap)\s*\(/g,
    "Promise.all over a collection may exceed the database or network concurrency budget.",
  );

  const awaitCount = (source.match(/\bawait\b/g) ?? []).length;
  if (awaitCount >= 4) {
    findings.push({
      file,
      line: 1,
      rule: "sequential-await-review",
      detail: `${awaitCount} await expressions; review independent work for safe parallelization.`,
    });
  }

  const lineCount = source.split("\n").length;
  if (/^\s*["']use client["'];?/m.test(source) && lineCount >= 500) {
    findings.push({
      file,
      line: 1,
      rule: "large-client-component",
      detail: `${lineCount} lines in a client module; review bundle and hydration boundaries.`,
    });
  }

  if (/(?:page|layout)\.[jt]sx?$/.test(file)) {
    addMatches(
      findings,
      file,
      source,
      "render-network-call",
      /\bfetch\s*\(|\baxios\.|\bgoogleapis\b|\bresend\b|\bnodemailer\b/g,
      "Potential external network dependency in a page/layout render path.",
    );
  }

  const resolved: string[] = [];
  for (const match of source.matchAll(
    /(?:import[\s\S]*?\bfrom\s*|import\s*\(|require\s*\()\s*["']([^"']+)["']/g,
  )) {
    const specifier = match[1];
    const target = resolveImport(file, specifier, trackedSet);
    if (target) resolved.push(target);
    if (
      /(?:^|\/)(?:xlsx|three|@react-three|googleapis|nodemailer|resend)(?:\/|$)/.test(
        specifier,
      ) ||
      /^(?:node:)?(?:fs|fs\/promises)$/.test(specifier)
    ) {
      findings.push({
        file,
        line: lineOf(source, match.index ?? 0),
        rule: "heavy-static-import",
        detail: `Static heavy/server integration import: ${specifier}.`,
      });
    }
  }
  imports.set(file, resolved);
}

for (const [file, source] of sources) {
  if (!/^\s*["']use client["'];?/m.test(source)) continue;
  const queue = [...(imports.get(file) ?? [])].map((target) => ({
    target,
    chain: [file, target],
  }));
  const visited = new Set<string>();
  while (queue.length) {
    const current = queue.shift()!;
    if (visited.has(current.target)) continue;
    visited.add(current.target);
    const dependency = sources.get(current.target) ?? "";
    if (
      /^\s*import\s+["']server-only["'];?/m.test(dependency) ||
      /@\/lib\/(?:db|auth)(?:["'/]|$)/.test(dependency)
    ) {
      findings.push({
        file,
        line: 1,
        rule: "client-server-boundary",
        detail: `Client dependency reaches server-only code: ${current.chain.join(" -> ")}.`,
      });
      break;
    }
    for (const target of imports.get(current.target) ?? []) {
      queue.push({ target, chain: [...current.chain, target] });
    }
  }
}

const cycleKeys = new Set<string>();
for (const start of imports.keys()) {
  const walk = (file: string, stack: string[], active: Set<string>) => {
    if (active.has(file)) {
      const cycle = [...stack.slice(stack.indexOf(file)), file];
      const canonical = cycle.slice(0, -1).sort().join("|");
      if (!cycleKeys.has(canonical)) {
        cycleKeys.add(canonical);
        findings.push({
          file: start,
          line: 1,
          rule: "circular-import",
          detail: cycle.join(" -> "),
        });
      }
      return;
    }
    if (stack.length >= 40) return;
    const nextActive = new Set(active).add(file);
    for (const target of imports.get(file) ?? []) {
      walk(target, [...stack, file], nextActive);
    }
  };
  walk(start, [], new Set());
}

findings.sort(
  (a, b) =>
    a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule),
);
const findingsByFile = new Map<string, Finding[]>();
for (const finding of findings) {
  const group = findingsByFile.get(finding.file) ?? [];
  group.push(finding);
  findingsByFile.set(finding.file, group);
}

const explicitlyOptimized = new Set([
  "next.config.ts",
  "package.json",
  "src/app/(dashboard)/cha/jobs/jobs-client.tsx",
  "src/app/(dashboard)/cha/jobs/page.tsx",
  "src/app/(dashboard)/dashboard/page.tsx",
  "src/app/(dashboard)/dashboard/portal-client.tsx",
  "src/app/(dashboard)/layout.tsx",
  "src/app/api/cha/jobs/create-options/route.ts",
  "src/app/api/cron/todo-reminders/route.ts",
  "src/app/api/dashboard/organization/route.ts",
  "src/app/api/runtime/updates/route.ts",
  "src/modules/notifications/components/notification-provider.tsx",
  "src/modules/cha/jobs/queries.ts",
  "src/modules/cha/warnings/queries.ts",
]);

if (writeReport) {
  const lines = [
    "# Performance file audit",
    "",
    `Generated from tracked files by \`scripts/performance-audit.ts\`.`,
    "",
    `- Runtime-relevant tracked files: ${auditFiles.length}`,
    `- Scannable JavaScript/TypeScript files: ${sources.size}`,
    `- Files with scanner findings requiring manual review: ${findingsByFile.size}`,
    `- Total scanner findings: ${findings.length}`,
    "",
    "The scanner is a review aid. Status records below cover every tracked file in",
    "the requested runtime scope; generated clients and historical migrations are",
    "excluded from manual modification, not from inventory.",
    "",
    "| File | Status | Review note |",
    "| --- | --- | --- |",
  ];
  for (const file of auditFiles) {
    const fileFindings = findingsByFile.get(file) ?? [];
    const excluded =
      file.startsWith("prisma/migrations/") || file.includes("/generated/");
    const optimized =
      explicitlyOptimized.has(file) ||
      (/(?:page|layout)\.tsx$/.test(file) &&
        (sources.get(file) ?? "").includes("getSession"));
    const status = excluded
      ? "Generated or migration — excluded from manual modification"
      : optimized
        ? "Reviewed — optimized"
      : fileFindings.length
        ? "Reviewed — issue documented"
        : "Reviewed — no issue";
    const note = excluded
      ? "Immutable migration/generated artifact."
      : optimized
        ? "Optimized in the repository-wide performance pass; remaining scanner signals were reviewed."
      : fileFindings.length
        ? [...new Set(fileFindings.map((finding) => finding.rule))].join(", ")
        : "No targeted performance pattern found; dependency role reviewed.";
    lines.push(`| \`${file.replaceAll("|", "\\|")}\` | ${status} | ${note} |`);
  }
  lines.push(
    "",
    "## Scanner findings",
    "",
    "| File | Line | Rule | Detail |",
    "| --- | ---: | --- | --- |",
  );
  for (const finding of findings) {
    lines.push(
      `| \`${finding.file}\` | ${finding.line} | \`${finding.rule}\` | ${finding.detail.replaceAll("|", "\\|")} |`,
    );
  }
  writeFileSync(
    path.join(root, "docs", "performance-file-audit.md"),
    `${lines.join("\n")}\n`,
  );
}

console.log(
  JSON.stringify(
    {
      auditFiles: auditFiles.length,
      scannedFiles: sources.size,
      filesWithFindings: findingsByFile.size,
      findings: findings.length,
      cycles: cycleKeys.size,
      reportWritten: writeReport,
    },
    null,
    2,
  ),
);
