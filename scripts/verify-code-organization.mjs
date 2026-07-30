import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);
const normalize = (value) => value.replaceAll("\\", "/");

function fail(message) {
  throw new Error(message);
}

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

const trackedResult = spawnSync("git", ["ls-files"], {
  cwd: repositoryRoot,
  encoding: "utf8",
});
if (trackedResult.status !== 0) fail(trackedResult.stderr);

const tracked = trackedResult.stdout.split(/\r?\n/).filter(Boolean);
const forbiddenTracked = tracked.filter(
  (file) =>
    file.startsWith("artifacts/") ||
    file.startsWith("scrap/") ||
    file.startsWith("Adarsh-Shipping-and-Services-Management-Software/") ||
    file.endsWith(".log"),
);
if (forbiddenTracked.length > 0) {
  fail(`Generated/copied files are tracked:\n${forbiddenTracked.join("\n")}`);
}

const sourceFiles = walk(path.join(repositoryRoot, "src"))
  .filter((file) => sourceExtensions.has(path.extname(file)))
  .map((absolute) => ({
    absolute,
    file: normalize(path.relative(repositoryRoot, absolute)),
  }));
const sourcePaths = new Set(sourceFiles.map(({ file }) => file));

const looseComponents = sourceFiles
  .map(({ file }) => file)
  .filter((file) => /^src\/components\/[^/]+\.(?:ts|tsx|js|jsx|css)$/.test(file));
if (looseComponents.length > 0) {
  fail(
    `Components must have explicit ownership folders:\n${looseComponents.join("\n")}`,
  );
}

if (sourceFiles.some(({ file }) => file.startsWith("src/components/monolith/"))) {
  fail("src/components/monolith is a retired migration source and must not exist.");
}

const deprecatedImports = [
  "@/components/monolith",
  "@/components/ams/",
  "@/components/auth/",
  "@/components/cha/",
  "@/components/crm/",
  "@/components/hrms/",
  "@/components/items/",
  "@/components/landing-page/",
  "@/components/mona/",
  "@/components/notifications/",
  "@/components/shared/",
];
const businessTerms = /\b(?:CHA|CRM|HRMS|AMS|Accounting|Attendance)\b|\/(?:cha|crm|hrms|ams|accounting|attendance)(?:\/|["'`])/i;
const primitiveNames = new Set([
  "alert.tsx",
  "badge.tsx",
  "button.tsx",
  "card.tsx",
  "date-input.tsx",
  "dropdown-menu.tsx",
  "dropdown-select.tsx",
  "input.tsx",
  "label.tsx",
  "modal.tsx",
  "native-select.tsx",
  "neon-checkbox.tsx",
  "textarea.tsx",
]);

function resolveImport(importer, specifier) {
  if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return null;
  const base = specifier.startsWith("@/")
    ? path.join(repositoryRoot, "src", specifier.slice(2))
    : path.resolve(path.dirname(path.join(repositoryRoot, importer)), specifier);
  const options = [
    base,
    ...[".ts", ".tsx", ".js", ".jsx", ".css"].map(
      (extension) => `${base}${extension}`,
    ),
    ...["index.ts", "index.tsx", "index.js", "index.jsx"].map((name) =>
      path.join(base, name),
    ),
  ];
  return options
    .map((option) => normalize(path.relative(repositoryRoot, option)))
    .find((option) => sourcePaths.has(option));
}

for (const { absolute, file } of sourceFiles) {
  if (![".ts", ".tsx", ".js", ".jsx"].includes(path.extname(file))) continue;
  if (file.includes("/__tests__/") || /\.(?:test|spec)\.[jt]sx?$/.test(file)) {
    continue;
  }
  const source = readFileSync(absolute, "utf8");

  for (const deprecatedImport of deprecatedImports) {
    if (source.includes(deprecatedImport)) {
      fail(`${file} imports deprecated component path ${deprecatedImport}`);
    }
  }

  if (file.startsWith("src/components/ui/")) {
    if (/from\s+["']@\/(?:app|modules)\//.test(source)) {
      fail(`${file} crosses the canonical primitive boundary.`);
    }
    if (businessTerms.test(source)) {
      fail(`${file} contains module-specific terminology or route metadata.`);
    }
  }

  if (
    file.startsWith("src/components/") &&
    /from\s+["']@\/app\//.test(source)
  ) {
    fail(`${file} imports a route implementation.`);
  }

  if (
    file.startsWith("src/modules/") &&
    /from\s+["']@\/app\//.test(source)
  ) {
    fail(`${file} imports a route implementation.`);
  }

  const ownModule = file.match(/^src\/modules\/([^/]+)/)?.[1];
  for (const match of source.matchAll(
    /(?:from\s+|import\()\s*["'](@\/modules\/([^/]+)\/components\/[^"']+)["']/g,
  )) {
    const [, specifier, targetModule] = match;
    if (ownModule && targetModule !== ownModule) {
      fail(
        `${file} imports private ${targetModule} component path ${specifier}; use that module's public component barrel.`,
      );
    }
  }

  for (const match of source.matchAll(
    /(?:from\s+|import\()\s*["']([^"']+)["']/g,
  )) {
    const target = resolveImport(file, match[1]);
    if (!target?.includes("/_components/")) continue;
    const owner = target.slice(0, target.indexOf("/_components/"));
    if (!file.startsWith(`${owner}/`)) {
      fail(`${file} imports private route component ${target}.`);
    }
  }
}

const duplicatePrimitives = sourceFiles
  .map(({ file }) => file)
  .filter((file) => {
    if (!file.endsWith(".tsx") || file.startsWith("src/components/ui/")) {
      return false;
    }
    return primitiveNames.has(path.basename(file).toLowerCase());
  });
if (duplicatePrimitives.length > 0) {
  fail(
    `Duplicate primitive implementations exist outside components/ui:\n${duplicatePrimitives.join("\n")}`,
  );
}

console.log(
  `Verified ${tracked.length} tracked paths and ${sourceFiles.length} source/style files: explicit shared ownership, retired legacy paths, primitive boundaries, module isolation, route-private ownership, and duplicate primitive checks passed.`,
);
