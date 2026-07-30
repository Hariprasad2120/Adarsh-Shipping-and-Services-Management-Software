import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function fail(message) {
  throw new Error(message);
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

const allowedLooseComponents = new Set();
const looseComponents = tracked.filter((file) => {
  if (!/^src\/components\/[^/]+\.(?:ts|tsx)$/.test(file)) return false;
  return !allowedLooseComponents.has(file);
});
if (looseComponents.length > 0) {
  fail(
    `Components must have explicit ownership folders:\n${looseComponents.join("\n")}`,
  );
}

const legacyImports = [
  "@/components/auto-breadcrumb",
  "@/components/breadcrumb-label",
  "@/components/breadcrumbs",
  "@/components/clickable-row",
  "@/components/dashboard-chrome",
  "@/components/data-table",
  "@/components/demo-fill-button",
  "@/components/main-shell",
  "@/components/module-home",
  "@/components/page-animator",
  "@/components/root-module-control-client",
  "@/components/root-signout-button",
  "@/components/scroll-navigator",
  "@/components/session-sync",
  "@/components/sidebar",
  "@/components/welcome-bar",
];

const productionSources = tracked.filter(
  (file) =>
    /^src\/.*\.(?:ts|tsx)$/.test(file) &&
    !file.includes("/__tests__/") &&
    !/\.(?:test|spec)\.(?:ts|tsx)$/.test(file),
);

for (const file of productionSources) {
  const source = readFileSync(path.join(repositoryRoot, file), "utf8");
  for (const legacyImport of legacyImports) {
    if (source.includes(legacyImport)) {
      fail(`${file} imports removed legacy path ${legacyImport}`);
    }
  }

  if (file.startsWith("src/components/monolith/")) {
    if (/from\s+["']@\/(?:app|modules)\//.test(source)) {
      fail(`${file} crosses the canonical design-system boundary.`);
    }
  }

  if (file.startsWith("src/components/shared/")) {
    if (/from\s+["']@\/app\//.test(source)) {
      fail(`${file} imports a route implementation.`);
    }
  }
}

console.log(
  `Verified ${tracked.length} tracked paths, ${productionSources.length} production sources, explicit component ownership, canonical UI boundaries, and generated-output exclusions.`,
);
