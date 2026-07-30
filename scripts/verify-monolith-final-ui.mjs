import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const appRoot = path.join(repositoryRoot, "src", "app");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(relativePath) {
  return readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

function walk(directory, predicate, found = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolutePath, predicate, found);
    } else if (predicate(absolutePath)) {
      found.push(absolutePath);
    }
  }
  return found;
}

function relative(absolutePath) {
  return path.relative(repositoryRoot, absolutePath).replaceAll("\\", "/");
}

const pageFiles = walk(
  appRoot,
  (filePath) => path.basename(filePath) === "page.tsx",
);
const layoutFiles = walk(
  appRoot,
  (filePath) => path.basename(filePath) === "layout.tsx",
);
const portalPages = pageFiles.filter((filePath) =>
  relative(filePath).startsWith("src/app/customer-portal/"),
);

assert(
  pageFiles.length === 229,
  `Expected 229 routes, found ${pageFiles.length}.`,
);
assert(
  layoutFiles.length === 14,
  `Expected 14 layouts, found ${layoutFiles.length}.`,
);
assert(
  portalPages.length === 12,
  `Expected 12 customer portal routes, found ${portalPages.length}.`,
);

const routeAudit = read("docs/ui-route-audit.md");
for (const signal of [
  "- Page routes: **229**",
  "- Migrated routes: **228**",
  "- Pending individual module migrations: **0**",
  "| `/customer-portal`",
]) {
  assert(routeAudit.includes(signal), `Route audit is missing ${signal}.`);
}
assert(
  /\| `\/customer-portal`\s+\|\s+12\s+\|\s+0\s+\|\s+12\s+\|\s+0\s+\|/.test(
    routeAudit,
  ),
  "Route audit customer portal totals are incorrect.",
);

const shellSwitcher = read(
  "src/app/(dashboard)/_components/dashboard-shell-switcher.tsx",
);
assert(
  shellSwitcher.includes("<MonolithAppShell"),
  "Authenticated routes must always use MonolithAppShell.",
);
assert(
  !shellSwitcher.includes("usePathname"),
  "The authenticated shell must not retain a legacy route switch.",
);

const portalLayout = read("src/app/customer-portal/layout.tsx");
const portalShell = read(
  "src/app/customer-portal/_components/client-actions.tsx",
);
const systemStyles = read("src/styles/monolith-system.css");
const tokenStyles = read("src/styles/monolith-tokens.css");
for (const signal of [
  "<PortalShellClient",
  "<MonolithThemeProvider>",
  'allowedThemes={["light", "night", "violet"]}',
  'className="mnx-customer-portal-shell"',
  'className="mnx-customer-portal-content"',
  'className="mnx-customer-portal-mobile-nav"',
]) {
  const source = signal === "<PortalShellClient" ? portalLayout : portalShell;
  assert(
    source.includes(signal),
    `Customer portal shell is missing ${signal}.`,
  );
}
for (const signal of [
  ".mnx-customer-portal-shell {",
  "height: 100dvh;",
  ".mnx-customer-portal-content {",
  "overflow-y: auto;",
  ".mnx-customer-portal-mobile-nav {",
  "@media (max-width: 900px)",
]) {
  assert(systemStyles.includes(signal), `System styles are missing ${signal}.`);
}

for (const theme of ["light", "night", "violet"]) {
  assert(
    tokenStyles.includes(`html.theme-${theme}`),
    `Missing ${theme} theme tokens.`,
  );
}
assert(
  !tokenStyles.includes("theme-purple"),
  "Obsolete Purple theme tokens remain active.",
);

const invitationAcceptance = read(
  "src/app/invite/employee/employee-invitation-acceptance.tsx",
);
const invitationReady = read("src/app/invite/employee/ready/page.tsx");
for (const [sourceName, source] of [
  ["employee invitation", invitationAcceptance],
  ["employee invitation ready", invitationReady],
]) {
  assert(
    source.includes("<PublicMonolithShell"),
    `${sourceName} must use the production public shell.`,
  );
  assert(
    !/bg-mono-|text-mono-|mnx-panel|max-w-xl/.test(source),
    `${sourceName} retains a legacy or narrow page wrapper.`,
  );
}

const obsoletePaths = [
  "src/app/(dashboard)/_components/dashboard-shell.tsx",
  "src/components/auto-breadcrumb.tsx",
  "src/components/breadcrumbs.tsx",
  "src/components/dashboard-chrome.tsx",
  "src/components/data-table.tsx",
  "src/components/main-shell.tsx",
  "src/components/monolith/button-1.tsx",
  "src/components/page-animator.tsx",
  "src/components/sidebar.tsx",
  "src/components/welcome-bar.tsx",
  "src/components/module-home.tsx",
  "src/components/hrms/sidebar.tsx",
  "src/components/hrms/top-nav.tsx",
];
for (const obsoletePath of obsoletePaths) {
  assert(
    !existsSync(path.join(repositoryRoot, obsoletePath)),
    `Obsolete UI component remains: ${obsoletePath}.`,
  );
}

const productionSources = [
  ...walk(appRoot, (filePath) => /\.(?:ts|tsx)$/.test(filePath)),
  ...walk(path.join(repositoryRoot, "src", "components"), (filePath) =>
    /\.(?:ts|tsx)$/.test(filePath),
  ),
].filter(
  (filePath) =>
    !filePath.includes(`${path.sep}graphics${path.sep}`) &&
    !filePath.endsWith(".test.ts") &&
    !filePath.endsWith(".test.tsx"),
);

const forbiddenImports = [
  "@/components/data-table",
  "@/components/main-shell",
  "@/components/sidebar",
  "@/components/welcome-bar",
  "@/components/dashboard-chrome",
  "@/components/auto-breadcrumb",
  "@/components/breadcrumbs",
  "@/components/page-animator",
  "@/components/monolith/button-1",
];
const violations = [];
for (const filePath of productionSources) {
  const source = readFileSync(filePath, "utf8");
  const sourceName = relative(filePath);

  for (const forbiddenImport of forbiddenImports) {
    if (source.includes(forbiddenImport)) {
      violations.push(`${sourceName}: legacy import ${forbiddenImport}`);
    }
  }
  if (
    /className\s*=\s*(?:["'][^"'\n]*monolith-|`[^`\n]*monolith-)/.test(source)
  ) {
    violations.push(`${sourceName}: legacy monolith-* class`);
  }
  if (/#[0-9a-f]{3,8}\b|rgba?\(/i.test(source)) {
    violations.push(`${sourceName}: inline literal color`);
  }
  if (/rounded-\[\d+(?:px|rem)\]|shadow-\[(?!var\()[^\]]+\]/.test(source)) {
    violations.push(`${sourceName}: arbitrary radius or shadow`);
  }
  if (/\b(?:Inter|Kiona|Arial)\b|Segoe UI/.test(source)) {
    violations.push(`${sourceName}: obsolete font`);
  }
  if (/from\s+["']next-themes["']|LegacyThemeProvider/.test(source)) {
    violations.push(`${sourceName}: obsolete theme provider`);
  }
  if (/hover:mnx-|focus:mnx-/.test(source)) {
    violations.push(`${sourceName}: invalid variant-prefixed semantic class`);
  }
}

assert(
  violations.length === 0,
  `Final UI source violations:\n${violations.join("\n")}`,
);

const cssImports = productionSources.flatMap((filePath) => {
  const source = readFileSync(filePath, "utf8");
  return [
    ...source.matchAll(/import\s+(?:[^"']+from\s+)?["']([^"']+\.css)["']/g),
  ].map((match) => `${relative(filePath)} -> ${match[1]}`);
});
assert(
  cssImports.length === 2 &&
    cssImports.includes("src/app/layout.tsx -> ./globals.css") &&
    cssImports.includes(
      "src/components/auth/monolith-logistics-login.tsx -> ./animated-login.module.css",
    ),
  `Unexpected active CSS imports:\n${cssImports.join("\n")}`,
);

const requiredArchives = [
  "OLD UI code/legacy-ui-before-monolith-customer-portal-5b83585.zip",
  "OLD UI code/legacy-final-shell-and-duplicates-5b83585.zip",
  "OLD UI code/legacy-unused-module-and-landing-components-5b83585.zip",
  "OLD UI code/legacy-unused-hrms-shell-and-dashboard-components-5b83585.zip",
];
for (const archive of requiredArchives) {
  const archivePath = path.join(repositoryRoot, archive);
  assert(existsSync(archivePath), `Missing legacy archive ${archive}.`);
  assert(
    statSync(archivePath).size > 0,
    `Legacy archive is empty: ${archive}.`,
  );
}

console.log(
  "Verified 229 routes, 14 layouts, universal production shells, 12 customer portal routes, three themes, one-scroller shell boundaries, responsive portal navigation, production-only CSS imports, legacy component removal, semantic colors/elevation/radii, and zero pending routes.",
);
