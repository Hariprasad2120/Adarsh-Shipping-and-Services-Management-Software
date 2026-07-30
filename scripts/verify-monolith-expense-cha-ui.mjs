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
const expenseRoutes = walk(expenseRoot, (file) =>
  file.endsWith(`${path.sep}page.tsx`),
)
  .map((file) => routeFromPage(file, expenseRoot, "expense"))
  .sort();
const routes = [...chaRoutes, ...expenseRoutes];

assert(
  chaRoutes.length === 11,
  `Expected 11 CHA routes, found ${chaRoutes.length}.`,
);
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
  assert(
    routes.includes(requiredRoute),
    `Missing discovered route ${requiredRoute}.`,
  );
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
assert(
  shellSwitcher.includes("<MonolithAppShell"),
  "The authenticated shell must always render MonolithAppShell.",
);
assert(
  !shellSwitcher.includes("usePathname"),
  "The authenticated shell must not retain route-specific legacy switching.",
);

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
  "ChaModal",
  "ChaDropdownSelect",
  "ChaNativeSelect",
  "ChaFilterMenu",
  "ChaWarningIndicatorPopover",
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
    pattern:
      /@\/components\/monolith\/(?:modal|dropdown-select|native-select|filter-menu|warning-indicator-popover)/,
    label: "unscoped popup or dropdown import",
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
  job: read("src/app/(dashboard)/cha/jobs/[jobId]/job-workspace-client.tsx"),
  expenses: read("src/app/(dashboard)/cha/expenses/expenses-client.tsx"),
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
const tokens = read("src/styles/monolith-tokens.css");
for (const className of [
  ".mnx-floating-surface",
  ".mnx-floating-menu",
  ".mnx-dialog-layer",
  ".mnx-dialog-surface",
  ".mnx-dialog-surface-workspace",
  ".mnx-cha-page",
  ".mnx-cha-page-header",
  ".mnx-cha-metrics",
  ".mnx-cha-section",
  ".mnx-cha-tabs",
  ".mnx-cha-dialog",
  ".mnx-cha-dialog-control",
  ".mnx-cha-native-select",
  ".mnx-cha-menu",
  ".mnx-cha-popover",
  ".mnx-cha-autocomplete",
  ".mnx-cha-success-dialog",
]) {
  assert(styles.includes(className), `Missing shared style ${className}.`);
}
assert(
  styles.includes("height: min(52rem, 88dvh)") &&
    styles.includes("overscroll-behavior: contain"),
  "Shared dialogs are missing the inset viewport height or scroll containment contract.",
);
for (const token of [
  "--mn-color-glass-surface:",
  "--mn-color-glass-surface-strong:",
  "--mn-color-glass-border:",
  "--mn-color-overlay:",
  "--mn-shadow-floating:",
  "--mn-gradient-glass:",
]) {
  assert(
    tokens.split(token).length - 1 === 3,
    `${token} is not defined once for every Monolith theme.`,
  );
}
for (const signal of [
  'html[data-dashboard-shell="true"]',
  "background-image: var(--mnx-glass-gradient)",
  "backdrop-filter: var(--mnx-glass-filter)",
  "[data-sonner-toast]",
  ".mnx-profile-popover",
  ".mnx-command-dialog",
  ".mnx-select-content",
]) {
  assert(
    styles.includes(signal),
    `The centralized floating-surface contract is missing ${signal}.`,
  );
}
assert(
  !styles.includes(".mnx-cha-dialog-layer") &&
    !styles.includes(".mnx-cha-dialog-workspace"),
  "Obsolete standalone CHA dialog sizing remains active.",
);

const dialogSource = read("src/components/monolith/workspace-dialog.tsx");
const chaWorkspaceSource = read("src/components/monolith/cha-workspace.tsx");
const dropdownSource = read("src/components/monolith/dropdown-menu.tsx");
const warningSource = read(
  "src/components/monolith/warning-indicator-popover.tsx",
);
const monaSource = read("src/components/mona/mona-chat.tsx");
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
    chaWorkspaceSource.includes("<Modal") &&
    chaWorkspaceSource.includes("<DropdownSelect") &&
    chaWorkspaceSource.includes("<FilterMenu") &&
    chaWorkspaceSource.includes("<WarningIndicatorPopover") &&
    !chaWorkspaceSource.includes("createPortal"),
  "CHA floating surfaces are not delegated to the centralized popup and menu layers.",
);
for (const signal of [
  "mnx-dialog mnx-cha-create-dialog",
  "mnx-dialog-content mnx-cha-create-dialog-content",
  "mnx-floating-surface mnx-cha-menu mnx-cha-autocomplete",
]) {
  assert(
    behaviorSources.createJob.includes(signal),
    `Create-job dialog is missing the reference composition signal ${signal}.`,
  );
}
assert(
  !behaviorSources.createJob.includes("CreateJobBenefit") &&
    !behaviorSources.createJob.includes(
      "relative overflow-hidden border-b mnx-border-accent",
    ),
  "Create-job dialog still contains the obsolete promotional popup treatment.",
);
for (const [sourceName, source, signal] of [
  ["WorkspaceDialog", dialogSource, "mnx-floating-surface"],
  ["dropdown menu", dropdownSource, "mnx-floating-surface mnx-floating-menu"],
  [
    "warning popover",
    warningSource,
    "mnx-floating-surface mnx-warning-popover",
  ],
  ["Mona tooltip", monaSource, "mnx-floating-surface mnx-floating-tooltip"],
  ["Mona panel", monaSource, "mnx-floating-surface mnx-mona-panel"],
]) {
  assert(
    source.includes(signal),
    `${sourceName} is not using the centralized tinted-glass surface.`,
  );
}
assert(
  !dropdownSource.includes("bg-[var(--card)]"),
  "Dropdown menu still references the undefined legacy card token.",
);
assert(
  styles.includes("@media (max-width: 70rem)") &&
    styles.includes("@media (max-width: 42rem)"),
  "CHA workspace is missing tablet or mobile responsive rules.",
);

const globals = read("src/app/globals.css");
for (const legacy of [
  ".cha-module",
  ".cha-btn-neon",
  "--cha-primary",
  "button.cha-link",
]) {
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
assert(
  listing.status === 0,
  listing.stderr || "Unable to list backup archive.",
);
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

const glassArchivePath = path.join(
  repositoryRoot,
  "OLD UI code",
  "legacy-ui-before-monolith-glass-tint-20260729-384cfad.zip",
);
const expectedGlassArchiveSize = 51_478;
const expectedGlassArchiveHash =
  "9FA4F7F7F253149910A4A61151B57F04CBD8675651D15C50F0C52376195A5BB5";

assert(
  existsSync(glassArchivePath),
  `Missing tinted-glass correction archive ${glassArchivePath}.`,
);
assert(
  statSync(glassArchivePath).size === expectedGlassArchiveSize,
  "Tinted-glass correction archive size does not match.",
);
const glassHash = createHash("sha256");
for await (const chunk of createReadStream(glassArchivePath)) {
  glassHash.update(chunk);
}
assert(
  glassHash.digest("hex").toUpperCase() === expectedGlassArchiveHash,
  "Tinted-glass correction archive checksum does not match.",
);

const glassListing = spawnSync("tar", ["-tf", glassArchivePath], {
  cwd: repositoryRoot,
  encoding: "utf8",
});
assert(
  glassListing.status === 0,
  glassListing.stderr || "Unable to list tinted-glass correction archive.",
);
const glassArchiveFiles = glassListing.stdout
  .split(/\r?\n/)
  .filter((entry) => entry && !entry.endsWith("/"));
assert(
  glassArchiveFiles.length === 7,
  `Expected 7 tinted-glass correction sources, found ${glassArchiveFiles.length}.`,
);
for (const requiredEntry of [
  "src/styles/monolith-tokens.css",
  "src/styles/monolith-system.css",
  "src/components/monolith/workspace-dialog.tsx",
  "src/components/monolith/dropdown-menu.tsx",
  "src/components/monolith/warning-indicator-popover.tsx",
  "src/components/mona/mona-chat.tsx",
  "src/components/cha/create-job-dialog.tsx",
]) {
  assert(
    glassArchiveFiles.includes(requiredEntry),
    `Tinted-glass correction archive is missing ${requiredEntry}.`,
  );
}

const chaDialogReferenceArchivePath = path.join(
  repositoryRoot,
  "OLD UI code",
  "legacy-ui-before-cha-dialog-reference-20260729-fd1cbe7.zip",
);
const expectedChaDialogReferenceArchiveSize = 197_905;
const expectedChaDialogReferenceArchiveHash =
  "EBFB1DB5B9C49479391B94549DC047DABAA699AA13FDF4F10B3635CF638E4F0F";

assert(
  existsSync(chaDialogReferenceArchivePath),
  `Missing CHA dialog reference archive ${chaDialogReferenceArchivePath}.`,
);
assert(
  statSync(chaDialogReferenceArchivePath).size ===
    expectedChaDialogReferenceArchiveSize,
  "CHA dialog reference archive size does not match.",
);
const chaDialogReferenceHash = createHash("sha256");
for await (const chunk of createReadStream(chaDialogReferenceArchivePath)) {
  chaDialogReferenceHash.update(chunk);
}
assert(
  chaDialogReferenceHash.digest("hex").toUpperCase() ===
    expectedChaDialogReferenceArchiveHash,
  "CHA dialog reference archive checksum does not match.",
);

const chaDialogReferenceListing = spawnSync(
  "tar",
  ["-tf", chaDialogReferenceArchivePath],
  {
    cwd: repositoryRoot,
    encoding: "utf8",
  },
);
assert(
  chaDialogReferenceListing.status === 0,
  chaDialogReferenceListing.stderr ||
    "Unable to list CHA dialog reference archive.",
);
const chaDialogReferenceArchiveFiles = chaDialogReferenceListing.stdout
  .split(/\r?\n/)
  .filter((entry) => entry && !entry.endsWith("/"));
assert(
  chaDialogReferenceArchiveFiles.length === 22,
  `Expected 22 CHA dialog reference sources, found ${chaDialogReferenceArchiveFiles.length}.`,
);
for (const requiredEntry of [
  "src/components/cha/create-job-dialog.tsx",
  "src/components/monolith/cha-workspace.tsx",
  "src/components/monolith/dropdown-select.tsx",
  "src/components/monolith/filter-menu.tsx",
  "src/components/monolith/modal.tsx",
  "src/components/monolith/warning-indicator-popover.tsx",
  "src/styles/monolith-tokens.css",
  "src/styles/monolith-system.css",
]) {
  assert(
    chaDialogReferenceArchiveFiles.includes(requiredEntry),
    `CHA dialog reference archive is missing ${requiredEntry}.`,
  );
}

console.log(
  `Verified ${routes.length} Expense/CHA routes (${chaRoutes.length} CHA, ${expenseRoutes.length} Expense), the centralized CHA popup/dropdown reference contract, protected workflows, and all four legacy/correction archives.`,
);
