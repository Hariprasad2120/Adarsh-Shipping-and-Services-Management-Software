import { execSync } from "node:child_process";

/**
 * DevSecOps gate (Stage 1 §24). Fails the build on any NEW critical/high
 * vulnerability in the PRODUCTION dependency tree.
 *
 * Known, triaged residuals are allow-listed here by advisory id, each with a
 * reason and a review-by date. They are documented in DEPENDENCY_REMEDIATION.md.
 * When a review-by date passes, the entry stops suppressing and the gate fails
 * until it is re-triaged.
 */

const NODEMAILER = { reason: "Fix needs nodemailer 9 (major). No caller-controlled name/envelope; default provider is Resend. Bump planned.", reviewBy: "2026-11-30" };
const PRISMA_CLI = { reason: "Build-time Prisma CLI only (prisma generate/migrate); not in the Next.js runtime bundle. ACCEPTED RISK.", reviewBy: "2027-03-31" };
const SHADCN_CLI = { reason: "shadcn CLI (js-yaml via cosmiconfig) — build-time tool, should be a devDependency. Not in runtime.", reviewBy: "2027-01-31" };

const ALLOWLIST = [
  { id: "GHSA-vvjj-xcjg-gr5g", ...NODEMAILER },
  { id: "GHSA-c7w3-x93f-qmm8", ...NODEMAILER },
  { id: "GHSA-268h-hp4c-crq3", ...NODEMAILER },
  { id: "GHSA-wqvq-jvpq-h66f", ...NODEMAILER },
  { id: "GHSA-r7g4-qg5f-qqm2", ...NODEMAILER },
  { id: "GHSA-p6gq-j5cr-w38f", ...NODEMAILER },
  { id: "GHSA-ggr8-5vv4-36mx", ...PRISMA_CLI }, // deepmerge-ts via @prisma/config
  { id: "GHSA-h67p-54hq-rp68", ...SHADCN_CLI }, // js-yaml
  { id: "GHSA-52cp-r559-cp3m", ...SHADCN_CLI },
  { id: "GHSA-5p4m-2wfm-xmqj", ...SHADCN_CLI },
];

// Packages with no GHSA id in the audit output that are known build-time-only.
const ALLOWLIST_PACKAGES = new Set(["@prisma/config", "prisma"]);

const allow = new Map(ALLOWLIST.map((e) => [e.id, e]));
const today = new Date().toISOString().slice(0, 10);

let auditJson;
try {
  auditJson = execSync("npm audit --omit=dev --json", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
} catch (e) {
  // npm audit exits non-zero when vulnerabilities exist — the JSON is still on stdout.
  auditJson = e.stdout?.toString() ?? "";
}

let report;
try {
  report = JSON.parse(auditJson);
} catch {
  console.error("security-audit-gate: could not parse `npm audit` output.");
  process.exit(2);
}

const offenders = [];
const suppressed = [];

for (const [name, v] of Object.entries(report.vulnerabilities ?? {})) {
  if (v.severity !== "high" && v.severity !== "critical") continue;
  const advisoryIds = (v.via ?? [])
    .filter((x) => x && typeof x === "object" && x.url)
    .map((x) => (x.url.match(/GHSA-[a-z0-9-]+/i) ?? [])[0])
    .filter(Boolean);

  const covered = advisoryIds.filter((id) => {
    const entry = allow.get(id);
    return entry && entry.reviewBy >= today;
  });

  const packageAllowed = ALLOWLIST_PACKAGES.has(name);
  if (
    packageAllowed ||
    (advisoryIds.length > 0 && covered.length === advisoryIds.length)
  ) {
    suppressed.push(
      `${name} (${v.severity}) [${advisoryIds.join(", ") || "package-allowlist"}]`,
    );
  } else {
    offenders.push(
      `${name} (${v.severity}) ${advisoryIds.join(", ") || "(no GHSA id)"}`,
    );
  }
}

if (suppressed.length) {
  console.log("Allow-listed (triaged) high/critical advisories:");
  for (const s of suppressed) console.log("  - " + s);
}

if (offenders.length) {
  console.error("\nsecurity-audit-gate FAILED — unresolved high/critical in production deps:");
  for (const o of offenders) console.error("  - " + o);
  console.error(
    "\nFix, or add a triaged entry (with reason + reviewBy) to the ALLOWLIST and DEPENDENCY_REMEDIATION.md.",
  );
  process.exit(1);
}

console.log("\nsecurity-audit-gate PASSED — no unresolved high/critical production vulnerabilities.");
