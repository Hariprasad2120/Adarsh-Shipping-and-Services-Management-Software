import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const normalize = (value) => value.replaceAll("\\", "/");
const sourceExtensions = [".ts", ".tsx", ".js", ".jsx", ".css"];

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

const mapping = new Map();
const move = (from, to) => mapping.set(normalize(from), normalize(to));

function moveDirectory(from, to) {
  const absolute = path.join(root, from);
  if (!existsSync(absolute)) return;
  for (const file of walk(absolute)) {
    const source = normalize(path.relative(root, file));
    move(source, normalize(path.join(to, path.relative(absolute, file))));
  }
}

const monolithTargets = {
  "accounting-delete-action.tsx": "src/modules/accounting/components/accounting-delete-action.tsx",
  "accounting-items.tsx": "src/modules/accounting/components/accounting-items.tsx",
  "accounting-workspace.test.tsx": "src/modules/accounting/components/accounting-workspace.test.tsx",
  "accounting-workspace.tsx": "src/modules/accounting/components/accounting-workspace.tsx",
  "admin-workspace.tsx": "src/modules/admin/components/admin-workspace.tsx",
  "alert.tsx": "src/components/ui/alert.tsx",
  "app-shell.tsx": "src/modules/core/components/monolith-app-shell.tsx",
  "badge.tsx": "src/components/ui/badge.tsx",
  "button-1.tsx": "src/components/ui/button-compat.tsx",
  "button.tsx": "src/components/ui/button.tsx",
  "card.tsx": "src/components/ui/card.tsx",
  "cha-workspace.test.tsx": "src/modules/cha/components/workspace/cha-workspace.test.tsx",
  "cha-workspace.tsx": "src/modules/cha/components/workspace/cha-workspace.tsx",
  "communication-admin-workspace.test.tsx": "src/modules/communication/components/communication-admin-workspace.test.tsx",
  "communication-workspace.tsx": "src/modules/communication/components/workspace/communication-workspace.tsx",
  "crm-workspace.test.tsx": "src/modules/crm/components/workspace/crm-workspace.test.tsx",
  "crm-workspace.tsx": "src/modules/crm/components/workspace/crm-workspace.tsx",
  "date-input.tsx": "src/components/ui/date-input.tsx",
  "dropdown-menu.tsx": "src/components/ui/dropdown-menu.tsx",
  "dropdown-select.tsx": "src/components/ui/dropdown-select.tsx",
  "file-upload-field.tsx": "src/components/forms/file-upload/file-upload-field.tsx",
  "filter-menu.tsx": "src/components/forms/filter-menu.tsx",
  "folder-icon.tsx": "src/components/ui/folder-icon.tsx",
  "foundation.test.tsx": "src/components/ui/foundation.test.tsx",
  "foundation.tsx": "src/components/ui/foundation.tsx",
  "index.ts": "src/components/ui/index.ts",
  "input.tsx": "src/components/ui/input.tsx",
  "label.tsx": "src/components/ui/label.tsx",
  "modal.tsx": "src/components/ui/modal.tsx",
  "native-select.tsx": "src/components/ui/native-select.tsx",
  "neon-checkbox.tsx": "src/components/ui/neon-checkbox.tsx",
  "operations-overview.tsx": "src/components/data-display/operations-overview/operations-overview.tsx",
  "people-controls.tsx": "src/modules/people/components/people-controls.tsx",
  "people-data-table.tsx": "src/modules/people/components/people-data-table.tsx",
  "people-workspace.test.tsx": "src/modules/people/components/people-workspace.test.tsx",
  "people-workspace.tsx": "src/modules/people/components/people-workspace.tsx",
  "performance-workspace.test.tsx": "src/modules/performance/components/performance-workspace.test.tsx",
  "performance-workspace.tsx": "src/modules/performance/components/performance-workspace.tsx",
  "public-workspace.test.tsx": "src/modules/auth/components/public-workspace.test.tsx",
  "public-workspace.tsx": "src/modules/auth/components/public-workspace.tsx",
  "textarea.tsx": "src/components/ui/textarea.tsx",
  "warning-indicator-popover.tsx": "src/components/feedback/warning-indicator-popover.tsx",
  "workspace-data-table.tsx": "src/modules/people/components/workspace-data-table.tsx",
  "workspace-dialog.test.ts": "src/components/layout/workspace-dialog.test.ts",
  "workspace-dialog.tsx": "src/components/layout/workspace-dialog.tsx",
  "workspace-states.tsx": "src/components/feedback/workspace-states.tsx",
  "workspace.test.tsx": "src/components/layout/workspace.test.tsx",
  "workspace.tsx": "src/components/layout/workspace.tsx",
};

for (const [name, destination] of Object.entries(monolithTargets)) {
  move(`src/components/monolith/${name}`, destination);
}

for (const moduleName of ["ams", "cha", "crm", "hrms", "items", "mona", "notifications"]) {
  moveDirectory(
    `src/components/${moduleName}`,
    `src/modules/${moduleName}/components`,
  );
}
moveDirectory("src/components/auth", "src/modules/auth/components");
moveDirectory("src/components/landing-page", "src/modules/dashboard/components/landing-page");

move("src/components/shared/clickable-row.tsx", "src/components/navigation/clickable-row.tsx");
move("src/components/shared/data-table.tsx", "src/components/data-display/data-table.tsx");
move(
  "src/components/shared/demo-fill-button.tsx",
  "src/components/forms/development/demo-fill-button.tsx",
);

move(
  "src/app/(dashboard)/cha/_components/cha-due-date-warning-indicator.tsx",
  "src/modules/cha/components/warnings/cha-due-date-warning-indicator.tsx",
);
move(
  "src/app/(dashboard)/cha/_components/cha-due-date-warning-note.tsx",
  "src/modules/cha/components/warnings/cha-due-date-warning-note.tsx",
);
move(
  "src/app/(dashboard)/cha/_components/cha-due-date-warnings-indicator.tsx",
  "src/modules/cha/components/warnings/cha-due-date-warnings-indicator.tsx",
);
move(
  "src/app/(dashboard)/cha/_components/job-filing-query-warning-indicator.tsx",
  "src/modules/cha/components/warnings/job-filing-query-warning-indicator.tsx",
);
move(
  "src/app/(dashboard)/crm/_components/delete-record-button.tsx",
  "src/modules/crm/components/delete-record-button.tsx",
);

const existingMappings = [...mapping].filter(([from]) => existsSync(path.join(root, from)));
if (existingMappings.length === 0) {
  console.log("Component architecture migration is already applied.");
  process.exit(0);
}

const sourceFiles = walk(path.join(root, "src")).filter((file) =>
  sourceExtensions.includes(path.extname(file)),
);
const knownFiles = new Set(sourceFiles.map((file) => normalize(path.relative(root, file))));

function resolve(importer, specifier) {
  if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return null;
  const base = specifier.startsWith("@/")
    ? path.join(root, "src", specifier.slice(2))
    : path.resolve(path.dirname(path.join(root, importer)), specifier);
  const options = [
    base,
    ...sourceExtensions.map((extension) => `${base}${extension}`),
    ...["index.ts", "index.tsx", "index.js", "index.jsx"].map((name) =>
      path.join(base, name),
    ),
  ];
  return options
    .map((option) => normalize(path.relative(root, option)))
    .find((option) => knownFiles.has(option));
}

const rewritten = new Map();
for (const absolute of sourceFiles) {
  const currentFile = normalize(path.relative(root, absolute));
  const destinationFile = mapping.get(currentFile) ?? currentFile;
  const source = readFileSync(absolute, "utf8");
  const next = source.replace(
    /(["'])(@\/[^"'`]+|\.{1,2}\/[^"'`]+)\1/g,
    (match, quote, specifier) => {
      const resolved = resolve(currentFile, specifier);
      if (!resolved) return match;
      const target = mapping.get(resolved);
      if (!target) return match;
      return `${quote}@/${target.slice("src/".length).replace(/\.(?:ts|tsx|js|jsx|css)$/, "")}${quote}`;
    },
  );
  if (next !== source || destinationFile !== currentFile) {
    rewritten.set(destinationFile, next);
  }
}

for (const [from, to] of existingMappings) {
  mkdirSync(path.dirname(path.join(root, to)), { recursive: true });
  const result = spawnSync("git", ["mv", "--", from, to], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`git mv failed for ${from} -> ${to}\n${result.stderr}`);
  }
}

for (const [file, source] of rewritten) {
  writeFileSync(path.join(root, file), source);
}

console.log(`Moved ${existingMappings.length} files with git mv and rewrote resolved imports.`);
