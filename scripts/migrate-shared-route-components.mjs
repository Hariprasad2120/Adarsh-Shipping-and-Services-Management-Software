import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const normalize = (value) => value.replaceAll("\\", "/");
const extensions = [".ts", ".tsx", ".js", ".jsx", ".css"];
const mappings = new Map();
const move = (from, to) => mappings.set(normalize(from), normalize(to));

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function moveDirectory(from, to) {
  const absolute = path.join(root, from);
  if (!existsSync(absolute)) return;
  for (const file of walk(absolute)) {
    move(
      normalize(path.relative(root, file)),
      normalize(path.join(to, path.relative(absolute, file))),
    );
  }
}

moveDirectory(
  "src/app/(dashboard)/accounting/_components",
  "src/modules/accounting/components/routes",
);
move(
  "src/app/(dashboard)/cha/_components/cha-dashboard-filter-action.tsx",
  "src/modules/cha/components/dashboard/cha-dashboard-filter-action.tsx",
);
move(
  "src/app/(dashboard)/cha/_components/cha-dashboard-search-action.tsx",
  "src/modules/cha/components/dashboard/cha-dashboard-search-action.tsx",
);
move(
  "src/app/(dashboard)/cha/_components/job-delete-inline-button.tsx",
  "src/modules/cha/components/jobs/job-delete-inline-button.tsx",
);
move(
  "src/app/(dashboard)/cha/_components/job-section49-validity-warning-indicator.tsx",
  "src/modules/cha/components/warnings/job-section49-validity-warning-indicator.tsx",
);
moveDirectory(
  "src/app/(dashboard)/crm/_components",
  "src/modules/crm/components/records",
);
moveDirectory(
  "src/app/(dashboard)/crm/invoices/_components",
  "src/modules/crm/components/invoices",
);
moveDirectory(
  "src/app/(dashboard)/crm/quotes/_components",
  "src/modules/crm/components/quotes",
);
move(
  "src/app/(dashboard)/lms/_components/lms-route-page.tsx",
  "src/modules/performance/components/lms-route-page.tsx",
);
moveDirectory(
  "src/app/customer-portal/_components",
  "src/modules/customer-portal/components",
);

const activeMappings = [...mappings].filter(([from]) =>
  existsSync(path.join(root, from)),
);
if (activeMappings.length === 0) {
  console.log("Shared route-component migration is already applied.");
  process.exit(0);
}

const sourceFiles = walk(path.join(root, "src")).filter((file) =>
  extensions.includes(path.extname(file)),
);
const knownFiles = new Set(
  sourceFiles.map((file) => normalize(path.relative(root, file))),
);

function resolve(importer, specifier) {
  if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return null;
  const base = specifier.startsWith("@/")
    ? path.join(root, "src", specifier.slice(2))
    : path.resolve(path.dirname(path.join(root, importer)), specifier);
  const options = [
    base,
    ...extensions.map((extension) => `${base}${extension}`),
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
  const current = normalize(path.relative(root, absolute));
  const destination = mappings.get(current) ?? current;
  const importerMoved = mappings.has(current);
  const source = readFileSync(absolute, "utf8");
  const next = source.replace(
    /(["'])(@\/[^"'`]+|\.{1,2}\/[^"'`]+)\1/g,
    (match, quote, specifier) => {
      const resolved = resolve(current, specifier);
      if (!resolved) return match;
      const target = mappings.get(resolved) ?? resolved;
      if (!mappings.has(resolved) && !(importerMoved && specifier.startsWith("."))) {
        return match;
      }
      const extension = path.extname(target);
      const suffix = extension === ".css" ? extension : "";
      const withoutExtension = extension === ".css"
        ? target.slice(0, -extension.length)
        : target.replace(/\.(?:ts|tsx|js|jsx)$/, "");
      return `${quote}@/${withoutExtension.slice("src/".length)}${suffix}${quote}`;
    },
  );
  if (next !== source || destination !== current) rewritten.set(destination, next);
}

for (const [from, to] of activeMappings) {
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

console.log(
  `Moved ${activeMappings.length} multi-route components with git mv and rewrote resolved imports.`,
);
