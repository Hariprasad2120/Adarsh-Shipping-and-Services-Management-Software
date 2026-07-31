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
const accountingRoot = path.join(
  repositoryRoot,
  "src",
  "app",
  "(dashboard)",
  "accounting",
);

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

function routeFromPage(pagePath) {
  const relative = path
    .relative(accountingRoot, pagePath)
    .replaceAll(path.sep, "/")
    .replace(/\/?page\.tsx$/, "");
  return relative ? `/accounting/${relative}` : "/accounting";
}

const routes = walk(accountingRoot, (file) =>
  file.endsWith(`${path.sep}page.tsx`),
)
  .map(routeFromPage)
  .sort();

const requiredRoutes = [
  "/accounting",
  "/accounting/access-denied",
  "/accounting/accounts",
  "/accounting/allocations",
  "/accounting/approvals",
  "/accounting/balance-sheet",
  "/accounting/banking",
  "/accounting/configuration",
  "/accounting/credit-notes",
  "/accounting/customer-receipts",
  "/accounting/debit-notes",
  "/accounting/depreciation",
  "/accounting/documents/[id]",
  "/accounting/general-ledger",
  "/accounting/invoices-sales",
  "/accounting/invoices-sales/new",
  "/accounting/items",
  "/accounting/items/[id]",
  "/accounting/items/new",
  "/accounting/jobs",
  "/accounting/journal-entries",
  "/accounting/journal-entries/[id]",
  "/accounting/journal-entries/new",
  "/accounting/manual-review",
  "/accounting/outbox",
  "/accounting/partners",
  "/accounting/payment-entries",
  "/accounting/payment-entries/[id]",
  "/accounting/payment-entries/new",
  "/accounting/payments",
  "/accounting/payments/[id]",
  "/accounting/profit-loss",
  "/accounting/purchase-invoices",
  "/accounting/purchase-invoices/[id]",
  "/accounting/purchase-invoices/new",
  "/accounting/purchase-orders",
  "/accounting/purchase-orders/new",
  "/accounting/quotations",
  "/accounting/readiness",
  "/accounting/recurring",
  "/accounting/reports",
  "/accounting/sales-invoices",
  "/accounting/sales-invoices/[id]",
  "/accounting/sales-invoices/new",
  "/accounting/sales-orders",
  "/accounting/sales-orders/new",
  "/accounting/settings",
  "/accounting/trial-balance",
  "/accounting/vendor-payments",
];

assert(
  requiredRoutes.length === 49,
  `Expected inventory of 49 Accounting routes, found ${requiredRoutes.length}.`,
);
assert(
  routes.length === 49,
  `Expected 49 Accounting routes, found ${routes.length}.`,
);
assert(
  new Set(routes).size === routes.length,
  "Discovered duplicate Accounting routes.",
);
assert(
  new Set(requiredRoutes).size === requiredRoutes.length,
  "Expected Accounting route inventory contains duplicates.",
);
for (const route of routes)
  assert(
    route === "/accounting" || route.startsWith("/accounting/"),
    `Discovered route outside Accounting: ${route}.`,
  );
for (const route of requiredRoutes)
  assert(routes.includes(route), `Missing discovered route ${route}.`);
for (const route of routes)
  assert(requiredRoutes.includes(route), `Unexpected discovered route ${route}.`);

for (const requiredFile of [
  "src/app/(dashboard)/accounting/layout.tsx",
  "src/app/(dashboard)/accounting/loading.tsx",
  "src/app/(dashboard)/accounting/error.tsx",
  "src/components/monolith/accounting-workspace.tsx",
  "src/components/monolith/accounting-invoice-form.tsx",
  "src/components/monolith/accounting-invoice-detail.tsx",
  "src/components/monolith/accounting-items.tsx",
  "src/components/monolith/accounting-commercial-document-form.tsx",
  "src/components/monolith/accounting-delete-action.tsx",
  "src/components/monolith/accounting-operational-actions.tsx",
  "src/components/monolith/accounting-operational-views.tsx",
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

const workspace = read("src/components/monolith/accounting-workspace.tsx");
for (const component of [
  "AccountingWorkspaceFrame",
  "AccountingRoutePageHeader",
  "getAccountingBreadcrumbs",
  "AccountingMetrics",
  "AccountingSection",
  "AccountingToolbar",
  "AccountingTable",
  "AccountingDialog",
  "AccountingRecordCard",
  "AccountingLoadingState",
  "AccountingErrorState",
])
  assert(workspace.includes(component), `Missing shared ${component}.`);
assert(
  workspace.includes('aria-label="Breadcrumb"'),
  "Accounting route headers must expose shared breadcrumbs.",
);
assert(
  workspace.includes("AccountingSectionTableLabelContext") &&
    workspace.includes('sectionTableLabel ?? "Accounting records"'),
  "Accounting tables must expose a keyboard-scrollable labelled region.",
);

const scopedSources = [
  ...walk(accountingRoot, (file) => /\.(?:ts|tsx)$/.test(file)),
  ...[
    "src/components/monolith/accounting-invoice-form.tsx",
    "src/components/monolith/accounting-invoice-detail.tsx",
    "src/components/monolith/accounting-items.tsx",
    "src/components/monolith/accounting-commercial-document-form.tsx",
    "src/components/monolith/accounting-delete-action.tsx",
    "src/components/monolith/accounting-operational-actions.tsx",
    "src/components/monolith/accounting-operational-views.tsx",
  ].map((relativePath) => path.join(repositoryRoot, relativePath)),
];
const forbiddenPatterns = [
  { pattern: /#[0-9a-f]{3,8}/i, label: "inline hexadecimal colour" },
  { pattern: /rgba?\(/i, label: "inline RGB colour" },
  {
    pattern:
      /\b(?:bg|text|border|ring|divide|accent|from|to|via|shadow)-(?:slate|gray|zinc|neutral|stone|indigo|blue|sky|cyan|green|red|amber|orange|yellow|teal|emerald|purple|violet|rose|pink|fuchsia|black|white)(?:-\d+|\b)/,
    label: "fixed-palette utility",
  },
  { pattern: /\bmonolith-[a-z0-9_-]+/, label: "legacy Monolith visual class" },
  { pattern: /@\/components\/items\//, label: "legacy items visual import" },
  {
    pattern:
      /crm\/invoices\/invoice-form|crm\/_components\/delete-record-button/,
    label: "legacy CRM visual import",
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

for (const sourcePath of walk(accountingRoot, (file) =>
  /\.(?:ts|tsx)$/.test(file),
)) {
  const source = readFileSync(sourcePath, "utf8");
  assert(
    !/<(?:button|select|textarea|table)\b/.test(source),
    `${path.relative(repositoryRoot, sourcePath)} contains a raw standard control.`,
  );
  assert(
    !/<input\b/.test(source),
    `${path.relative(repositoryRoot, sourcePath)} contains a raw standard input.`,
  );
}

const behaviorSources = {
  accounts: read("src/app/(dashboard)/accounting/accounts/accounts-client.tsx"),
  banking: read("src/app/(dashboard)/accounting/banking/banking-client.tsx"),
  jobs: read("src/app/(dashboard)/accounting/jobs/jobs-client.tsx"),
  journalNew: read(
    "src/app/(dashboard)/accounting/journal-entries/new/new-jv-client.tsx",
  ),
  journalDetail: read(
    "src/app/(dashboard)/accounting/journal-entries/[id]/detail-client.tsx",
  ),
  paymentNew: read(
    "src/app/(dashboard)/accounting/payment-entries/new/new-payment-client.tsx",
  ),
  paymentDetail: read(
    "src/app/(dashboard)/accounting/payment-entries/[id]/detail-client.tsx",
  ),
  invoices: read("src/components/monolith/accounting-invoice-form.tsx"),
  operationalActions: read("src/modules/accounting/operational-actions.ts"),
  operationalViews: read("src/components/monolith/accounting-operational-views.tsx"),
  quotations: read(
    "src/app/(dashboard)/accounting/quotations/quotations-client.tsx",
  ),
  reports: read("src/app/(dashboard)/accounting/reports/reports-client.tsx"),
  settings: read("src/app/(dashboard)/accounting/settings/settings-client.tsx"),
};
for (const [sourceName, signals] of Object.entries({
  accounts: ["createAccountAction"],
  banking: ["recordBankTransferAction"],
  jobs: ["createJobCostingAction", "getJobCostingAction"],
  journalNew: ["createJournalEntryAction"],
  journalDetail: ["submitJournalEntryAction"],
  paymentNew: ["createPaymentEntryAction"],
  paymentDetail: ["submitPaymentEntryAction"],
  invoices: ["createSalesInvoiceAction", "createPurchaseInvoiceAction"],
  operationalActions: [
    "approveAndPostAccountingDocument",
    "approveAndPostAccountingPayment",
    "rejectAccountingDocument",
    "rejectAccountingPayment",
    "submitJournalEntry",
    "retryAccountingOutbox",
  ],
  operationalViews: [
    "CanonicalDocumentRegister",
    "CanonicalPaymentRegister",
    "CanonicalJournalRegister",
    "OperationalLedgerTable",
    "AccountingPolicyGate",
  ],
  quotations: [
    "createQuotationAction",
    "convertQuotationToInvoiceAction",
    "createCustomerNoteAction",
    "submitCustomerNoteAction",
  ],
  reports: [
    "getProfitAndLossAction",
    "getBalanceSheetAction",
    "getTrialBalanceAction",
    "getDayBookAction",
    "getARAgeingAction",
    "getAPAgeingAction",
    "getGSTR1SummaryAction",
    "getJobProfitabilityAction",
  ],
  settings: ["updateAccountingSettingsAction"],
})) {
  for (const signal of signals)
    assert(
      behaviorSources[sourceName].includes(signal),
      `${sourceName} is missing protected behavior signal ${signal}.`,
    );
}

const styles = read("src/styles/monolith-system.css");
for (const className of [
  ".mnx-accounting-page",
  ".mnx-accounting-breadcrumbs",
  ".mnx-accounting-page-header",
  ".mnx-accounting-metrics",
  ".mnx-accounting-section",
  ".mnx-accounting-toolbar",
  ".mnx-accounting-form-grid",
  ".mnx-accounting-report-grid",
  ".mnx-accounting-record-card",
  ".mnx-accounting-dialog",
])
  assert(styles.includes(className), `Missing shared style ${className}.`);
assert(
  styles.includes(".mnx-accounting-table thead th") &&
    styles.includes("position: sticky"),
  "Accounting tables must retain sticky financial column headers.",
);
assert(
  styles.includes("@media (max-width: 64rem)") &&
    styles.includes("@media (max-width: 42rem)"),
  "Accounting workspace is missing tablet or mobile responsive rules.",
);

const archivePath = path.join(
  repositoryRoot,
  "OLD UI code",
  "legacy-ui-before-monolith-accounting-fd1cbe7.zip",
);
const expectedArchiveSize = 147_861;
const expectedArchiveHash =
  "B6B7D58BB2A20166829C80B1D395A521B30239159C06AC03ABFA9C1574939DFC";
assert(existsSync(archivePath), `Missing backup archive ${archivePath}.`);
assert(
  statSync(archivePath).size === expectedArchiveSize,
  "Accounting backup archive size does not match.",
);
const hash = createHash("sha256");
for await (const chunk of createReadStream(archivePath)) hash.update(chunk);
assert(
  hash.digest("hex").toUpperCase() === expectedArchiveHash,
  "Accounting backup archive checksum does not match.",
);

const listing = spawnSync("tar", ["-tf", archivePath], {
  cwd: repositoryRoot,
  encoding: "utf8",
});
assert(
  listing.status === 0,
  listing.stderr || "Unable to list Accounting backup archive.",
);
const archiveFiles = listing.stdout
  .split(/\r?\n/)
  .filter((entry) => entry && !entry.endsWith("/"));
assert(
  archiveFiles.length === 68,
  `Expected 68 archived visual source files, found ${archiveFiles.length}.`,
);
for (const entry of [
  "src/app/(dashboard)/accounting/page.tsx",
  "src/app/(dashboard)/accounting/quotations/quotations-client.tsx",
  "src/app/(dashboard)/accounting/reports/reports-client.tsx",
  "src/app/(dashboard)/accounting/_components/commercial-documents-page.tsx",
  "src/app/(dashboard)/crm/invoices/invoice-form.tsx",
  "src/components/items/ItemsListPage.tsx",
])
  assert(archiveFiles.includes(entry), `Backup archive is missing ${entry}.`);

const phase5ArchivePath = path.join(
  repositoryRoot,
  "OLD UI code",
  "legacy-ui-before-accounting-phase5-2f37936.zip",
);
assert(existsSync(phase5ArchivePath), "Missing Phase 5 Accounting backup archive.");
assert(
  statSync(phase5ArchivePath).size === 117_178,
  "Phase 5 Accounting backup archive size does not match.",
);
const phase5Hash = createHash("sha256");
for await (const chunk of createReadStream(phase5ArchivePath)) {
  phase5Hash.update(chunk);
}
assert(
  phase5Hash.digest("hex").toUpperCase() ===
    "3260DD7EE1DAC71D3FB4AAE3AA149668A450EF9F944D817C2461679DD8D1C8A8",
  "Phase 5 Accounting backup archive checksum does not match.",
);

console.log(
  `Verified ${routes.length} Accounting routes, shared controls and responsive styles, protected workflow signals, the ${archiveFiles.length}-file baseline archive, and the Phase 5 archive.`,
);
