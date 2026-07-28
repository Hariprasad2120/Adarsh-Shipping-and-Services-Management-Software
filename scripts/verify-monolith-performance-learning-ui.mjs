import { createHash } from "node:crypto";
import {
  createReadStream,
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const dashboardRoot = path.join(repositoryRoot, "src", "app", "(dashboard)");
const amsRoot = path.join(dashboardRoot, "ams");
const lmsRoot = path.join(dashboardRoot, "lms");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function walk(root, predicate = () => true) {
  const entries = [];
  for (const item of readdirSync(root, { withFileTypes: true })) {
    const source = path.join(root, item.name);
    if (item.isDirectory()) {
      entries.push(...walk(source, predicate));
    } else if (predicate(source)) {
      entries.push(source);
    }
  }
  return entries;
}

function read(relativePath) {
  return readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

function routeFromPage(pagePath, familyRoot, family) {
  const relative = path
    .relative(familyRoot, pagePath)
    .replaceAll(path.sep, "/")
    .replace(/\/?page\.tsx$/, "");
  return relative ? `/${family}/${relative}` : `/${family}`;
}

const amsRoutes = walk(amsRoot, (file) => file.endsWith(`${path.sep}page.tsx`))
  .map((file) => routeFromPage(file, amsRoot, "ams"))
  .sort();
const lmsRoutes = walk(lmsRoot, (file) => file.endsWith(`${path.sep}page.tsx`))
  .map((file) => routeFromPage(file, lmsRoot, "lms"))
  .sort();
const routes = [...amsRoutes, ...lmsRoutes];

assert(
  amsRoutes.length === 18,
  `Expected 18 AMS routes, found ${amsRoutes.length}.`,
);
assert(
  lmsRoutes.length === 5,
  `Expected 5 LMS routes, found ${lmsRoutes.length}.`,
);
assert(
  routes.length === 23,
  `Expected 23 AMS/LMS routes, found ${routes.length}.`,
);

for (const requiredRoute of [
  "/ams/appraisals/[id]",
  "/ams/appraisals/[id]/management-review",
  "/ams/appraisals/assign/[employeeId]",
  "/ams/assets/[id]",
  "/ams/my-appraisal/[id]/self-assessment",
  "/ams/my-reviews/[id]",
  "/lms/assignments",
  "/lms/courses",
  "/lms/my-learning",
  "/lms/reports",
]) {
  assert(
    routes.includes(requiredRoute),
    `Missing discovered route ${requiredRoute}.`,
  );
}

for (const requiredFile of [
  "src/app/(dashboard)/ams/layout.tsx",
  "src/app/(dashboard)/ams/loading.tsx",
  "src/app/(dashboard)/ams/error.tsx",
  "src/app/(dashboard)/lms/layout.tsx",
  "src/app/(dashboard)/lms/loading.tsx",
  "src/app/(dashboard)/lms/error.tsx",
]) {
  assert(
    existsSync(path.join(repositoryRoot, requiredFile)),
    `Missing ${requiredFile}.`,
  );
}

const shellSwitcher = read(
  "src/app/(dashboard)/_components/dashboard-shell-switcher.tsx",
);
for (const signal of [
  'normalizedPathname === "/ams"',
  'normalizedPathname.startsWith("/ams/")',
  'normalizedPathname === "/lms"',
  'normalizedPathname.startsWith("/lms/")',
]) {
  assert(
    shellSwitcher.includes(signal),
    `Shell switcher is missing ${signal}.`,
  );
}

const performanceWorkspace = read(
  "src/components/monolith/performance-workspace.tsx",
);
for (const route of routes.filter((route) => !route.includes("["))) {
  assert(
    performanceWorkspace.includes(`"${route}"`),
    `Performance route metadata is missing ${route}.`,
  );
}
for (const pattern of [
  "/^\\/ams\\/appraisals\\/assign\\/[^/]+$/",
  "/^\\/ams\\/appraisals\\/[^/]+\\/management-review$/",
  "/^\\/ams\\/appraisals\\/[^/]+$/",
  "/^\\/ams\\/my-appraisal\\/[^/]+\\/self-assessment$/",
  "/^\\/ams\\/my-reviews\\/[^/]+$/",
  "/^\\/ams\\/assets\\/[^/]+$/",
]) {
  assert(
    performanceWorkspace.includes(pattern),
    `Performance metadata is missing dynamic pattern ${pattern}.`,
  );
}

const scopedSources = [
  ...walk(amsRoot, (file) => /\.(?:ts|tsx)$/.test(file)),
  ...walk(lmsRoot, (file) => /\.(?:ts|tsx)$/.test(file)),
  ...walk(path.join(repositoryRoot, "src", "components", "ams"), (file) =>
    /\.(?:ts|tsx)$/.test(file),
  ),
  path.join(repositoryRoot, "src", "components", "hrms", "lms-view.tsx"),
  path.join(repositoryRoot, "src", "components", "hrms", "pms-view.tsx"),
];

const forbiddenPatterns = [
  { pattern: /#[0-9a-f]{3,8}/i, label: "inline hexadecimal colour" },
  { pattern: /rgba?\(/i, label: "inline RGB colour" },
  {
    pattern:
      /\b(?:bg|text|border|ring|divide|accent|from|to|via|shadow)-(?:slate|gray|zinc|neutral|stone|indigo|blue|sky|cyan|green|red|amber|orange|yellow|teal|emerald|purple|violet|rose|pink|fuchsia|black|white)(?:-\d+|\b)/,
    label: "fixed-palette utility",
  },
  {
    pattern: /\bmonolith-[a-z0-9_-]+/,
    label: "legacy Monolith visual class",
  },
  {
    pattern: /@\/components\/data-table/,
    label: "legacy data-table import",
  },
  {
    pattern: /@\/components\/module-home/,
    label: "legacy module-home import",
  },
  {
    pattern: /<(button|input|select|textarea|table)\b/,
    label: "raw standard control",
  },
  {
    pattern: /className="[^"]*fixed\s+inset-0/,
    label: "one-off dialog overlay",
  },
];

for (const sourcePath of scopedSources) {
  const source = readFileSync(sourcePath, "utf8");
  for (const { pattern, label } of forbiddenPatterns) {
    assert(
      !pattern.test(source),
      `${path.relative(repositoryRoot, sourcePath)} contains a ${label}.`,
    );
  }
}

for (const component of [
  "PerformanceWorkspaceFrame",
  "PerformanceSummary",
  "PerformanceSection",
  "PerformanceCard",
  "PerformanceControlButton",
  "PerformanceControlInput",
  "PerformanceControlSelect",
  "PerformanceControlTextarea",
  "PerformanceTable",
  "PerformanceLoadingState",
  "PerformanceErrorState",
]) {
  assert(
    performanceWorkspace.includes(component),
    `Missing shared ${component}.`,
  );
}

const systemStyles = read("src/styles/monolith-system.css");
for (const className of [
  ".mnx-performance-page",
  ".mnx-performance-page-header",
  ".mnx-performance-summary-grid",
  ".mnx-performance-section",
  ".mnx-performance-card",
  ".mnx-performance-table-shell",
  ".mnx-performance-tabs",
  ".mnx-tone-success",
]) {
  assert(
    systemStyles.includes(className),
    `Missing shared style ${className}.`,
  );
}
assert(
  systemStyles.includes("@media (max-width: 70rem)") &&
    systemStyles.includes("@media (max-width: 42rem)"),
  "Performance workspace is missing tablet or mobile responsive rules.",
);

const behaviorSources = {
  appraisalAssignment: read(
    "src/app/(dashboard)/ams/appraisals/assign/[employeeId]/start-appraisal-client.tsx",
  ),
  appraisalDetail: read(
    "src/app/(dashboard)/ams/appraisals/[id]/appraisal-detail.tsx",
  ),
  criteria: read("src/app/(dashboard)/ams/criteria/criteria-client.tsx"),
  selfAssessment: read(
    "src/app/(dashboard)/ams/my-appraisal/[id]/self-assessment/self-assessment-form.tsx",
  ),
  managementReview: read(
    "src/app/(dashboard)/ams/appraisals/[id]/management-review/management-review-client.tsx",
  ),
  assets: read("src/app/(dashboard)/ams/assets/assets-client.tsx"),
  lms: read("src/components/hrms/lms-view.tsx"),
  pms: read("src/components/hrms/pms-view.tsx"),
};

for (const [sourceName, signals] of Object.entries({
  appraisalAssignment: [
    'fetch("/api/ams/appraisals"',
    "/reviewers",
    "router.push(`/ams/appraisals/${appraisal.id}`)",
  ],
  appraisalDetail: [
    'onAction("meeting"',
    'onAction("reviewers"',
    'onAction("hike"',
  ],
  criteria: ["/api/ams/criteria", "apiCreate", "apiPatch", "apiDelete"],
  selfAssessment: [
    "/self-assessment",
    'router.push("/ams/my-appraisal?submitted=1")',
  ],
  managementReview: [
    "/score-preview",
    "/claim-management",
    "/management-review",
  ],
  assets: ["createAssetAction", "runDepreciationAction"],
  lms: ['fetch("/api/hrms/lms"', 'method: "POST"', 'method: "PATCH"'],
  pms: [
    'fetch("/api/hrms/performance"',
    '"create_goal"',
    '"update_goal_progress"',
    '"submit_feedback"',
  ],
})) {
  for (const signal of signals) {
    assert(
      behaviorSources[sourceName].includes(signal),
      `${sourceName} is missing protected behavior signal ${signal}.`,
    );
  }
}

const archivePath = path.join(
  repositoryRoot,
  "OLD UI code",
  "legacy-ui-before-monolith-ams-lms-0faa8b3.zip",
);
const expectedArchiveSize = 136_030;
const expectedArchiveHash =
  "0C851DAB4C38FC0D22004EF27F14CB260C75FF3291BB1111E7D68101D81B0256";

assert(existsSync(archivePath), `Missing backup archive ${archivePath}.`);
assert(
  statSync(archivePath).size === expectedArchiveSize,
  "AMS/LMS backup archive size does not match the recorded source archive.",
);
const hash = createHash("sha256");
for await (const chunk of createReadStream(archivePath)) hash.update(chunk);
assert(
  hash.digest("hex").toUpperCase() === expectedArchiveHash,
  "AMS/LMS backup archive checksum does not match.",
);

const listing = spawnSync("tar", ["-tf", archivePath], {
  cwd: repositoryRoot,
  encoding: "utf8",
});
assert(
  listing.status === 0,
  listing.stderr || "Unable to list backup archive.",
);
const archiveFiles = listing.stdout
  .split(/\r?\n/)
  .filter((entry) => entry && !entry.endsWith("/"));
assert(
  archiveFiles.length === 47,
  `Expected 47 archived visual source files, found ${archiveFiles.length}.`,
);
for (const requiredEntry of [
  "src/app/(dashboard)/ams/page.tsx",
  "src/app/(dashboard)/ams/appraisals/[id]/appraisal-detail.tsx",
  "src/app/(dashboard)/ams/criteria/criteria-client.tsx",
  "src/app/(dashboard)/lms/_components/lms-route-page.tsx",
  "src/components/ams/criteria-points-form.tsx",
  "src/components/hrms/lms-view.tsx",
  "src/components/hrms/pms-view.tsx",
]) {
  assert(
    archiveFiles.includes(requiredEntry),
    `Backup archive is missing ${requiredEntry}.`,
  );
}

console.log(
  `Verified ${routes.length} performance/learning routes (${amsRoutes.length} AMS, ${lmsRoutes.length} LMS), shared controls, semantic themes, protected behavior signals, and the 47-file legacy archive.`,
);
