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
const crmRoot = path.join(
  repositoryRoot,
  "src",
  "app",
  "(dashboard)",
  "crm",
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function walk(root, predicate = () => true) {
  const entries = [];
  for (const item of readdirSync(root, { withFileTypes: true })) {
    const source = path.join(root, item.name);
    if (item.isDirectory()) entries.push(...walk(source, predicate));
    else if (predicate(source)) entries.push(source);
  }
  return entries;
}

function read(relativePath) {
  return readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

function routeFromPage(pagePath) {
  const relative = path
    .relative(crmRoot, pagePath)
    .replaceAll(path.sep, "/")
    .replace(/\/?page\.tsx$/, "");
  return relative ? `/crm/${relative}` : "/crm";
}

const routes = walk(crmRoot, (file) => file.endsWith(`${path.sep}page.tsx`))
  .map(routeFromPage)
  .sort();

assert(routes.length === 57, `Expected 57 CRM routes, found ${routes.length}.`);

for (const route of [
  "/crm/[...slug]",
  "/crm/contacts/[id]",
  "/crm/contacts/[id]/edit",
  "/crm/customers/[id]",
  "/crm/customers/[id]/edit",
  "/crm/deals/[id]",
  "/crm/deals/[id]/edit",
  "/crm/enquiries/[id]",
  "/crm/invoices/[invoiceId]",
  "/crm/items/[id]",
  "/crm/leads/[id]",
  "/crm/leads/[id]/edit",
  "/crm/quotes/[quoteId]",
  "/crm/quotes/[quoteId]/edit",
  "/crm/tickets/[id]",
]) {
  assert(routes.includes(route), `Missing discovered CRM route ${route}.`);
}

for (const requiredFile of [
  "src/app/(dashboard)/crm/layout.tsx",
  "src/app/(dashboard)/crm/loading.tsx",
  "src/app/(dashboard)/crm/error.tsx",
  "src/modules/crm/components/workspace/crm-workspace.tsx",
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
  'normalizedPathname === "/crm"',
  'normalizedPathname.startsWith("/crm/")',
]) {
  assert(shellSwitcher.includes(signal), `Shell switcher is missing ${signal}.`);
}

const workspace = read("src/modules/crm/components/workspace/crm-workspace.tsx");
for (const route of routes.filter(
  (route) => !route.includes("[") && !["/crm/invoices/new"].includes(route),
)) {
  assert(
    workspace.includes(`"${route}"`),
    `CRM route metadata is missing ${route}.`,
  );
}
for (const pattern of [
  "/^\\/crm\\/contacts\\/[^/]+\\/edit$/",
  "/^\\/crm\\/contacts\\/[^/]+$/",
  "/^\\/crm\\/customers\\/[^/]+\\/edit$/",
  "/^\\/crm\\/customers\\/[^/]+$/",
  "/^\\/crm\\/deals\\/[^/]+\\/edit$/",
  "/^\\/crm\\/deals\\/[^/]+$/",
  "/^\\/crm\\/enquiries\\/[^/]+$/",
  "/^\\/crm\\/invoices\\/[^/]+$/",
  "/^\\/crm\\/items\\/[^/]+$/",
  "/^\\/crm\\/leads\\/[^/]+\\/edit$/",
  "/^\\/crm\\/leads\\/[^/]+$/",
  "/^\\/crm\\/quotes\\/[^/]+\\/edit$/",
  "/^\\/crm\\/quotes\\/[^/]+$/",
  "/^\\/crm\\/tickets\\/[^/]+$/",
]) {
  assert(
    workspace.includes(pattern),
    `CRM metadata is missing dynamic pattern ${pattern}.`,
  );
}

const scopedSources = [
  ...walk(crmRoot, (file) => /\.(?:ts|tsx)$/.test(file)),
  ...walk(
    path.join(repositoryRoot, "src", "modules", "crm", "components"),
    (file) =>
      /\.(?:ts|tsx)$/.test(file) &&
      !/\.(?:test|spec)\.[jt]sx?$/.test(file) &&
      !file.includes(`${path.sep}workspace${path.sep}`),
  ),
  ...walk(path.join(repositoryRoot, "src", "modules", "items", "components"), (file) =>
    /\.(?:ts|tsx)$/.test(file),
  ),
];

const forbiddenPatterns = [
  { pattern: /#[0-9a-f]{3,8}/i, label: "inline hexadecimal colour" },
  { pattern: /rgba?\(/i, label: "inline RGB colour" },
  {
    pattern:
      /\b(?:bg|text|border|ring|divide|accent|from|to|via|shadow|placeholder)-(?:slate|gray|zinc|neutral|stone|indigo|blue|sky|cyan|green|red|amber|orange|yellow|teal|emerald|purple|violet|rose|pink|fuchsia|black|white)(?:-\d+|\b)/,
    label: "fixed-palette utility",
  },
  {
    pattern: /\bmonolith-[a-z0-9_-]+/,
    label: "legacy Monolith visual class",
  },
  {
    pattern: /<(button|input|select|textarea|table)\b/,
    label: "raw standard control",
  },
  {
    pattern: /className="[^"]*fixed\s+inset-0/,
    label: "one-off dialog overlay",
  },
  {
    pattern: /@\/components\/(?:data-table|module-home|modal)/,
    label: "legacy shared visual import",
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
  "CrmWorkspaceFrame",
  "CrmMetric",
  "CrmSection",
  "CrmPanel",
  "CrmButton",
  "CrmInput",
  "CrmSelect",
  "CrmTextarea",
  "CrmTable",
  "CrmDialog",
  "CrmDialogLayer",
  "CrmPermissionState",
  "CrmConfigurationState",
  "CrmLoadingState",
  "CrmErrorState",
]) {
  assert(workspace.includes(component), `Missing shared ${component}.`);
}

const styles = `${read("src/styles/monolith-system.css")}\n${read("src/styles/modules/crm.css")}`;
for (const className of [
  ".mnx-crm-page",
  ".mnx-crm-page-header",
  ".mnx-crm-content",
  ".mnx-crm-panel-surface",
  ".mnx-crm-toolbar",
  ".mnx-crm-tabs",
  ".mnx-crm-table",
  ".mnx-item-workspace",
]) {
  assert(styles.includes(className), `Missing shared style ${className}.`);
}
assert(
  styles.includes("@media (max-width: 70rem)") &&
    styles.includes("@media (max-width: 42rem)"),
  "CRM workspace is missing tablet or mobile responsive rules.",
);

const behaviorSources = {
  leadForm: read("src/app/(dashboard)/crm/leads/lead-form.tsx"),
  leadDetail: read(
    "src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx",
  ),
  accountForm: read("src/app/(dashboard)/crm/customers/account-form.tsx"),
  contactForm: read("src/app/(dashboard)/crm/contacts/contact-form.tsx"),
  dealForm: read("src/app/(dashboard)/crm/deals/deal-form.tsx"),
  enquiry: read(
    "src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx",
  ),
  approval: read("src/modules/crm/components/ApprovalActionBar.tsx"),
  quote: read("src/modules/crm/components/quotes/NewQuotePage.tsx"),
  tickets: read("src/app/(dashboard)/crm/tickets/actions.ts"),
  leadSource: read(
    "src/app/(dashboard)/crm/lead-sources/import-button.tsx",
  ),
};

for (const [sourceName, signals] of Object.entries({
  leadForm: ["createLeadAction", "updateLeadAction"],
  leadDetail: [
    "deleteLeadAction",
    "updateLeadStatusAction",
    "saveEnquiryRatesAction",
    "logWorkTimeAction",
  ],
  accountForm: ["createAccountAction", "updateAccountAction"],
  contactForm: ["createContactAction", "updateContactAction"],
  dealForm: ["createDealAction", "updateDealAction"],
  enquiry: [
    "assignLeadOwnerAction",
    "updatePerishableDetailsAction",
    "saveEnquiryRatesAction",
    "simulateInboundEmailAction",
  ],
  approval: [
    "actionSubmitForApproval",
    "actionApproveDocument",
    "actionRequestRework",
    "actionDeclineDocument",
    "actionConvertToInvoice",
  ],
  quote: ["router.push(`/crm/quotes/${res.data.id}`)"],
  tickets: [
    "createTicketAction",
    "addTicketCommentAction",
    "updateTicketStatusAction",
    "assignTicketAction",
  ],
  leadSource: [
    "runJustdialImportAction",
    "/api/crm/justdial-live",
    "setInterval(poll, 2000)",
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
  "legacy-ui-before-monolith-crm-fd1cbe7.zip",
);
const expectedArchiveSize = 282_113;
const expectedArchiveHash =
  "E24B74587E9D6FC8F596920BCAE7A69738685385B46E975CE94274A149E973C1";

assert(existsSync(archivePath), `Missing backup archive ${archivePath}.`);
assert(
  statSync(archivePath).size === expectedArchiveSize,
  "CRM backup archive size does not match the recorded source archive.",
);
const hash = createHash("sha256");
for await (const chunk of createReadStream(archivePath)) hash.update(chunk);
assert(
  hash.digest("hex").toUpperCase() === expectedArchiveHash,
  "CRM backup archive checksum does not match.",
);

const listing = spawnSync("tar", ["-tf", archivePath], {
  cwd: repositoryRoot,
  encoding: "utf8",
});
assert(listing.status === 0, listing.stderr || "Unable to list CRM archive.");
const archiveFiles = listing.stdout
  .split(/\r?\n/)
  .filter((entry) => entry && !entry.endsWith("/"));
assert(
  archiveFiles.length === 131,
  `Expected 131 archived CRM visual files, found ${archiveFiles.length}.`,
);
for (const requiredEntry of [
  "src/app/(dashboard)/crm/layout.tsx",
  "src/app/(dashboard)/crm/dashboard/page.tsx",
  "src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx",
  "src/app/(dashboard)/crm/customers/account-form.tsx",
  "src/app/(dashboard)/crm/quotes/_components/QuoteDetailsPage.tsx",
  "src/components/crm/ApprovalActionBar.tsx",
  "src/components/items/ItemsListPage.tsx",
]) {
  assert(
    archiveFiles.includes(requiredEntry),
    `CRM backup archive is missing ${requiredEntry}.`,
  );
}

console.log(
  `Verified ${routes.length} CRM routes, centralized Monolith controls, semantic themes, protected behavior signals, and the 131-file legacy archive.`,
);
