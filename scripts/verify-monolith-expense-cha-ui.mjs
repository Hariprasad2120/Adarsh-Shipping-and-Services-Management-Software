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
const chaRoot = path.join(dashboardRoot, "cha");
const expenseRoot = path.join(dashboardRoot, "expense");
const chaComponentsRoot = path.join(repositoryRoot, "src", "components", "cha");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function walk(root, predicate = () => true) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const source = path.join(root, entry.name);
    return entry.isDirectory()
      ? walk(source, predicate)
      : predicate(source)
        ? [source]
        : [];
  });
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

const chaRoutes = walk(chaRoot, (file) => file.endsWith(`${path.sep}page.tsx`))
  .map((file) => routeFromPage(file, chaRoot, "cha"))
  .sort();
const expenseRoutes = walk(
  expenseRoot,
  (file) => file.endsWith(`${path.sep}page.tsx`),
)
  .map((file) => routeFromPage(file, expenseRoot, "expense"))
  .sort();
const routes = [...chaRoutes, ...expenseRoutes];

assert(chaRoutes.length === 11, `Expected 11 CHA routes, found ${chaRoutes.length}.`);
assert(
  expenseRoutes.length === 1,
  `Expected 1 Expense route, found ${expenseRoutes.length}.`,
);

for (const requiredRoute of [
  "/cha",
  "/cha/approvals",
  "/cha/customers",
  "/cha/customers/[id]/edit",
  "/cha/customers/new",
  "/cha/expenses",
  "/cha/jobs",
  "/cha/jobs/[jobId]",
  "/cha/reports",
  "/cha/settings",
  "/cha/settings/filing-workflows",
  "/expense",
]) {
  assert(routes.includes(requiredRoute), `Missing discovered route ${requiredRoute}.`);
}

for (const requiredFile of [
  "src/app/(dashboard)/cha/layout.tsx",
  "src/app/(dashboard)/cha/loading.tsx",
  "src/app/(dashboard)/cha/error.tsx",
  "src/app/(dashboard)/expense/layout.tsx",
  "src/app/(dashboard)/expense/loading.tsx",
  "src/app/(dashboard)/expense/error.tsx",
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
  'normalizedPathname === "/cha"',
  'normalizedPathname.startsWith("/cha/")',
  'normalizedPathname === "/expense"',
  'normalizedPathname.startsWith("/expense/")',
]) {
  assert(shellSwitcher.includes(signal), `Shell switcher is missing ${signal}.`);
}

const workspace = read("src/components/monolith/cha-workspace.tsx");
for (const component of [
  "ChaWorkspaceFrame",
  "ChaRoutePageHeader",
  "ChaMetrics",
  "ChaMetric",
  "ChaSection",
  "ChaPanel",
  "ChaToolbar",
  "ChaTabs",
  "ChaTable",
  "ChaDialogLayer",
  "ChaLoadingState",
  "ChaErrorState",
]) {
  assert(workspace.includes(component), `Missing shared ${component}.`);
}

const scopedSources = [
  ...walk(chaRoot, (file) => /\.(?:ts|tsx)$/.test(file)),
  ...walk(expenseRoot, (file) => /\.(?:ts|tsx)$/.test(file)),
  ...walk(chaComponentsRoot, (file) => /\.(?:ts|tsx)$/.test(file)),
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
    pattern: /\b(?:bg|text|border|ring|divide|accent)-(?:cha|mono)-/,
    label: "legacy module palette class",
  },
  {
    pattern: /\bcha-(?:module|link|job-workspace)\b|--cha-/,
    label: "legacy CHA visual class or token",
  },
  {
    pattern: /@\/components\/(?:data-table|module-home)/,
    label: "legacy shared visual import",
  },
  {
    pattern: /<(?:motion\.)?(?:button|input|select|textarea|table)\b/,
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

const behaviorSources = {
  job: read(
    "src/app/(dashboard)/cha/jobs/[jobId]/job-workspace-client.tsx",
  ),
  expenses: read(
    "src/app/(dashboard)/cha/expenses/expenses-client.tsx",
  ),
  workflow: read(
    "src/app/(dashboard)/cha/settings/filing-workflows/workflows-client.tsx",
  ),
  settings: read("src/app/(dashboard)/cha/settings/settings-form.tsx"),
  createJob: read("src/components/cha/create-job-dialog.tsx"),
};

for (const [sourceName, signals] of Object.entries({
  job: [
    "actions.uploadDocumentVersionAction",
    "actions.upsertAdditionalDataAction",
    "actions.submitChecklistInternalDecisionAction",
    "actions.submitChecklistCustomerDecisionAction",
    "actions.startFilingWorkflowAction",
    "actions.completeFilingNodeAction",
    "actions.markAsFiledAction",
    "actions.createExpenseRequestWithAttachmentAction",
    "actions.postExpensePaymentAction",
    "actions.acknowledgeExpenseReceiptAction",
    "actions.submitJobDeletionAction",
  ],
  expenses: [
    "actions.createDirectExpenseRequestWithAttachmentAction",
    "actions.reviewExpenseRequestAction",
    "actions.approveAccountsExpenseRequestAction",
    "actions.postExpensePaymentAction",
  ],
  workflow: [
    "actions.saveFilingWorkflowDraftAction",
    "actions.publishFilingWorkflowAction",
    "actions.deleteFilingWorkflowTemplateAction",
  ],
  settings: [
    "updateSettingsAction",
    "updateJobTypeManifestConfigAction",
    "upsertDocumentCategoryAction",
    "upsertDocumentItemAction",
    "setPortalFeatureFlagAction",
  ],
  createJob: [
    "createJobAction",
    "getNextJobNumberPreviewAction",
    "createJobTypeAction",
    "createShipmentTypeAction",
  ],
})) {
  for (const signal of signals) {
    assert(
      behaviorSources[sourceName].includes(signal),
      `${sourceName} is missing protected behavior signal ${signal}.`,
    );
  }
}

const styles = read("src/styles/monolith-system.css");
for (const className of [
  ".mnx-dialog-layer",
  ".mnx-dialog-surface",
  ".mnx-dialog-surface-workspace",
  ".mnx-cha-page",
  ".mnx-cha-page-header",
  ".mnx-cha-metrics",
  ".mnx-cha-section",
  ".mnx-cha-tabs",
  ".mnx-cha-dialog",
]) {
  assert(styles.includes(className), `Missing shared style ${className}.`);
}
assert(
  styles.includes("height: min(52rem, 88dvh)") &&
    styles.includes("overscroll-behavior: contain"),
  "Shared dialogs are missing the inset viewport height or scroll containment contract.",
);
assert(
  !styles.includes(".mnx-cha-dialog-layer") &&
    !styles.includes(".mnx-cha-dialog-workspace"),
  "Obsolete standalone CHA dialog sizing remains active.",
);

const dialogSource = read("src/components/monolith/workspace-dialog.tsx");
const chaWorkspaceSource = read("src/components/monolith/cha-workspace.tsx");
for (const signal of [
  "export function WorkspaceDialogLayer",
  "FOCUSABLE_SELECTOR",
  "bodyLockDepth",
  "onCloseRef.current",
  "aria-labelledby={labelledBy}",
  "aria-describedby={describedBy}",
]) {
  assert(
    dialogSource.includes(signal),
    `Shared dialog layer is missing ${signal}.`,
  );
}
assert(
  chaWorkspaceSource.includes("<WorkspaceDialogLayer") &&
    !chaWorkspaceSource.includes("createPortal"),
  "CHA dialogs are not delegated to the centralized popup layer.",
);
assert(
  styles.includes("@media (max-width: 70rem)") &&
    styles.includes("@media (max-width: 42rem)"),
  "CHA workspace is missing tablet or mobile responsive rules.",
);

const globals = read("src/app/globals.css");
for (const legacy of [".cha-module", ".cha-btn-neon", "--cha-primary", "button.cha-link"]) {
  assert(!globals.includes(legacy), `globals.css still contains ${legacy}.`);
}

const archivePath = path.join(
  repositoryRoot,
  "OLD UI code",
  "legacy-ui-before-monolith-expense-cha-384cfad.zip",
);
const expectedArchiveSize = 269_883;
const expectedArchiveHash =
  "4BB7A161B2FC3D0C004500EA31FAE4DB3BAA49B098A3ABA8DAE07DAA32624F12";

assert(existsSync(archivePath), `Missing backup archive ${archivePath}.`);
assert(
  statSync(archivePath).size === expectedArchiveSize,
  "Expense/CHA backup archive size does not match.",
);
const hash = createHash("sha256");
for await (const chunk of createReadStream(archivePath)) hash.update(chunk);
assert(
  hash.digest("hex").toUpperCase() === expectedArchiveHash,
  "Expense/CHA backup archive checksum does not match.",
);

const listing = spawnSync("tar", ["-tf", archivePath], {
  cwd: repositoryRoot,
  encoding: "utf8",
});
assert(listing.status === 0, listing.stderr || "Unable to list backup archive.");
const archiveFiles = listing.stdout
  .split(/\r?\n/)
  .filter((entry) => entry && !entry.endsWith("/"));
assert(
  archiveFiles.length === 37,
  `Expected 37 archived visual source files, found ${archiveFiles.length}.`,
);
for (const requiredEntry of [
  "src/app/(dashboard)/cha/page.tsx",
  "src/app/(dashboard)/cha/jobs/[jobId]/job-workspace-client.tsx",
  "src/app/(dashboard)/cha/settings/filing-workflows/workflows-client.tsx",
  "src/app/(dashboard)/cha/expenses/expenses-client.tsx",
  "src/app/(dashboard)/expense/page.tsx",
  "src/components/cha/create-job-dialog.tsx",
  "src/app/globals.css",
]) {
  assert(
    archiveFiles.includes(requiredEntry),
    `Backup archive is missing ${requiredEntry}.`,
  );
}

const popupArchivePath = path.join(
  repositoryRoot,
  "OLD UI code",
  "legacy-ui-before-monolith-popup-fix-20260729-384cfad.zip",
);
const expectedPopupArchiveSize = 44_608;
const expectedPopupArchiveHash =
  "6ED2CAF2AB94813E0BB5235B847C39DA9762FE7154E065EB4D595508FB2DE119";

assert(
  existsSync(popupArchivePath),
  `Missing popup correction archive ${popupArchivePath}.`,
);
assert(
  statSync(popupArchivePath).size === expectedPopupArchiveSize,
  "Popup correction archive size does not match.",
);
const popupHash = createHash("sha256");
for await (const chunk of createReadStream(popupArchivePath)) {
  popupHash.update(chunk);
}
assert(
  popupHash.digest("hex").toUpperCase() === expectedPopupArchiveHash,
  "Popup correction archive checksum does not match.",
);

const popupListing = spawnSync("tar", ["-tf", popupArchivePath], {
  cwd: repositoryRoot,
  encoding: "utf8",
});
assert(
  popupListing.status === 0,
  popupListing.stderr || "Unable to list popup correction archive.",
);
const popupArchiveFiles = popupListing.stdout
  .split(/\r?\n/)
  .filter((entry) => entry && !entry.endsWith("/"));
assert(
  popupArchiveFiles.length === 5,
  `Expected 5 popup correction sources, found ${popupArchiveFiles.length}.`,
);
for (const requiredEntry of [
  "src/components/monolith/workspace-dialog.tsx",
  "src/components/monolith/modal.tsx",
  "src/components/monolith/cha-workspace.tsx",
  "src/components/cha/create-job-dialog.tsx",
  "src/styles/monolith-system.css",
]) {
  assert(
    popupArchiveFiles.includes(requiredEntry),
    `Popup correction archive is missing ${requiredEntry}.`,
  );
}

console.log(
  `Verified ${routes.length} Expense/CHA routes (${chaRoutes.length} CHA, ${expenseRoutes.length} Expense), the centralized popup contract, protected workflows, the 37-file legacy archive, and the 5-file popup correction archive.`,
);
