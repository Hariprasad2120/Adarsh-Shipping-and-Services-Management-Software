import { createHash } from "node:crypto";
import {
  createReadStream,
  existsSync,
  readFileSync,
  statSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(relativePath) {
  return readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

const pagePath = "src/app/(dashboard)/admin/design-system/page.tsx";
const clientPath =
  "src/app/(dashboard)/admin/design-system/design-system-client.tsx";
const shellPath = "src/modules/core/components/monolith-app-shell.tsx";
const stylePath = "src/styles/monolith-system.css";

for (const relativePath of [pagePath, clientPath, shellPath, stylePath]) {
  assert(
    existsSync(path.join(repositoryRoot, relativePath)),
    `Missing production catalogue source: ${relativePath}.`,
  );
}

const page = read(pagePath);
const client = read(clientPath);
const shell = read(shellPath);
const styles = read(stylePath);

assert(
  page.includes('can(session.user.id, "admin.org.manage")'),
  "The catalogue must retain its administrator permission gate.",
);
assert(
  client.includes('data-production-catalogue="true"'),
  "The production catalogue root marker is missing.",
);
assert(
  client.includes("Object.entries(module)") &&
    client.includes("exportedComponents(group.exports)"),
  "The complete index must be derived from imported runtime modules.",
);

for (const namespaceImport of [
  "AccountingComponents",
  "AdminComponents",
  "AppShellComponents",
  "ChaComponents",
  "CommunicationComponents",
  "CrmComponents",
  "FoundationComponents",
  "PeopleComponents",
  "PerformanceComponents",
  "PublicComponents",
  "StateComponents",
  "WorkspaceComponents",
]) {
  assert(
    client.includes(`* as ${namespaceImport}`),
    `Missing production namespace import ${namespaceImport}.`,
  );
}
assert(
  client.includes("SharedControlComponents") &&
    client.includes("WorkspaceDialogComponents") &&
    client.includes("WarningPopoverComponents"),
  "The global controls and overlays inventory is incomplete.",
);

for (const specializedComponent of [
  "AccountingCommercialDocumentForm",
  "AccountingDeleteAction",
  "AccountingInvoiceDetail",
  "AccountingInvoiceForm",
  "AccountingItemDetail",
  "AccountingItemsList",
  "AccountingNewItemForm",
]) {
  assert(
    client.includes(specializedComponent),
    `Missing specialized production component ${specializedComponent}.`,
  );
}

for (const stateFamily of [
  "PeopleLoadingState",
  "PerformanceLoadingState",
  "ChaLoadingState",
  "AccountingLoadingState",
  "CrmConfigurationState",
  "CommunicationPermissionState",
  "AdminPermissionState",
]) {
  assert(
    client.includes(stateFamily),
    `Missing module state ${stateFamily}.`,
  );
}

assert(
  client.includes('allowedThemes={["light", "night", "violet"]}'),
  "The interactive Light, Night, and Violet test control is missing.",
);
assert(
  shell.includes("export function MonolithThemePicker") &&
    shell.includes("<MonolithThemePicker />"),
  "The shell and catalogue must share the same production theme picker.",
);
assert(
  styles.includes(".mnx-catalogue-family-grid") &&
    styles.includes(".mnx-catalogue-state-preview"),
  "Catalogue layout and responsive state styles are missing.",
);
assert(
  !client.includes("changeLog") &&
    !client.includes("typeRows") &&
    !styles.includes(".mnx-showcase-"),
  "Obsolete showcase examples or styles remain active.",
);
assert(
  !existsSync(path.join(repositoryRoot, "docs", "design-system-showcase.md")),
  "The obsolete design-system showcase document still exists.",
);

const archivePath = path.join(
  repositoryRoot,
  "OLD UI code",
  "legacy-ui-before-admin-design-system-catalogue-4f93df4.zip",
);
assert(existsSync(archivePath), `Missing legacy catalogue archive ${archivePath}.`);
assert(
  statSync(archivePath).size === 38_803,
  "Legacy catalogue archive size does not match.",
);
const hash = createHash("sha256");
for await (const chunk of createReadStream(archivePath)) hash.update(chunk);
assert(
  hash.digest("hex").toUpperCase() ===
    "643FF25A031F1B8ED7A50F6A04E643564BB77F698A817EF586CD32ACDEC82E34",
  "Legacy catalogue archive checksum does not match.",
);

const listing = spawnSync("tar", ["-tf", archivePath], {
  cwd: repositoryRoot,
  encoding: "utf8",
});
assert(listing.status === 0, listing.stderr || "Unable to list backup archive.");
for (const requiredEntry of [
  "src/app/(dashboard)/admin/design-system/page.tsx",
  "src/app/(dashboard)/admin/design-system/design-system-client.tsx",
  "src/styles/monolith-system.css",
]) {
  assert(
    listing.stdout.split(/\r?\n/).includes(requiredEntry),
    `Legacy catalogue archive is missing ${requiredEntry}.`,
  );
}

console.log(
  "Verified the administrator gate, shared production theme picker, runtime-derived global/module component inventory, 23 live route states, specialized Accounting compositions, obsolete showcase removal, responsive semantic styles, and the legacy visual archive.",
);
