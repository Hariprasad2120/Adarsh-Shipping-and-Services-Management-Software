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

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) =>
  readFileSync(path.join(repositoryRoot, relativePath), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const paths = {
  page: "src/app/(dashboard)/admin/design-system/page.tsx",
  client: "src/app/(dashboard)/admin/design-system/design-system-client.tsx",
  globalsCss: "src/app/globals.css",
  sharedRegistry:
    "src/components/monolith/catalogue/shared-catalogue.tsx",
  moduleRegistry:
    "src/components/monolith/catalogue/module-catalogue.tsx",
  barrel: "src/components/monolith/index.ts",
  workspace: "src/components/layout/workspace.tsx",
  chaWorkspace: "src/modules/cha/components/workspace/cha-workspace.tsx",
};

for (const relativePath of Object.values(paths)) {
  assert(existsSync(path.join(repositoryRoot, relativePath)), `Missing ${relativePath}.`);
}

const page = read(paths.page);
const client = read(paths.client);
const sharedRegistry = read(paths.sharedRegistry);
const moduleRegistry = read(paths.moduleRegistry);
const workspace = read(paths.workspace);
const chaWorkspace = read(paths.chaWorkspace);

assert(
  page.includes('can(session.user.id, "admin.org.manage")'),
  "The administrator permission gate is missing.",
);
assert(
  !page.includes("design-system-catalogue.css") &&
    !page.includes("design-system-reference.css") &&
    !page.includes("design-system-production.css"),
  "The route must not import a route-local catalogue stylesheet now that the catalogue styles live in globals.css.",
);
assert(
  client.includes("sharedCatalogue") &&
    client.includes("moduleCatalogue") &&
    client.includes("entry.render()"),
  "The route must render navigation and specimens from the typed registry.",
);
assert(
  client.includes("<WorkspaceSectionHeading") &&
    !client.includes("function SectionTitle") &&
    !client.includes('className="section-heading"'),
  "Catalogue major headings must use WorkspaceSectionHeading.",
);
assert(
  sharedRegistry.includes('component: "WorkspaceSectionHeading"') &&
    sharedRegistry.includes("<WorkspaceSectionHeading") &&
    moduleRegistry.includes('component: "ChaSection"') &&
    moduleRegistry.includes("<ChaSection"),
  "Canonical shared and CHA live specimens are missing.",
);
assert(
  workspace.includes('interactive = false') &&
    workspace.includes('data-interactive="true"'),
  "Explicit surface/metric interaction ownership is missing.",
);
assert(
  chaWorkspace.includes("<WorkspaceSectionHeading") &&
    !chaWorkspace.includes('<header className="mnx-cha-outside-heading">'),
  "ChaSection must compose the canonical heading.",
);

for (const legacyStyle of [
  "src/app/(dashboard)/admin/design-system/design-system-reference.css",
  "src/app/(dashboard)/admin/design-system/design-system-production.css",
]) {
  assert(
    !existsSync(path.join(repositoryRoot, legacyStyle)),
    `Disconnected catalogue stylesheet remains: ${legacyStyle}.`,
  );
}

const coverage = spawnSync(
  process.execPath,
  ["scripts/verify-design-system-coverage.mjs"],
  { cwd: repositoryRoot, encoding: "utf8" },
);
assert(coverage.status === 0, coverage.stderr || coverage.stdout);
const boundary = spawnSync(
  process.execPath,
  ["scripts/verify-catalogue-style-boundary.mjs"],
  { cwd: repositoryRoot, encoding: "utf8" },
);
assert(boundary.status === 0, boundary.stderr || boundary.stdout);

const globalsCss = read(paths.globalsCss);
assert(
  globalsCss.includes(
    "/* ===== BEGIN src/app/(dashboard)/admin/design-system/design-system-catalogue.css ===== */",
  ) &&
    globalsCss.includes(
      "/* ===== END src/app/(dashboard)/admin/design-system/design-system-catalogue.css ===== */",
    ),
  "globals.css is missing the dedicated catalogue stylesheet section markers.",
);

const archivePath = path.join(
  repositoryRoot,
  "OLD UI code",
  "legacy-ui-before-admin-design-system-catalogue-4f93df4.zip",
);
assert(existsSync(archivePath), `Missing legacy catalogue archive ${archivePath}.`);
assert(statSync(archivePath).size === 38_803, "Legacy catalogue archive size changed.");
const hash = createHash("sha256");
for await (const chunk of createReadStream(archivePath)) hash.update(chunk);
assert(
  hash.digest("hex").toUpperCase() ===
    "643FF25A031F1B8ED7A50F6A04E643564BB77F698A817EF586CD32ACDEC82E34",
  "Legacy catalogue archive checksum changed.",
);

console.log(
  "Verified the administrator gate, canonical production registry/specimens, shared heading and interaction ownership, catalogue CSS boundary, coverage enforcement, disconnected stylesheet removal, and retained legacy archive.",
);
