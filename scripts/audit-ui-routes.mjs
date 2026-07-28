import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = path.join(repositoryRoot, "src", "app");
const outputPath = path.join(repositoryRoot, "docs", "ui-route-audit.md");
const knownMonolithRoutes = new Set([
  "/dashboard",
  "/account/security",
  "/notifications",
  "/product-catalogue",
  "/todo",
]);

function walk(directory, targetName, found = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolutePath, targetName, found);
    } else if (entry.name === targetName) {
      found.push(absolutePath);
    }
  }
  return found;
}

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function sourcePath(absolutePath) {
  return toPosix(path.relative(repositoryRoot, absolutePath));
}

function isRouteGroup(segment) {
  return segment.startsWith("(") && segment.endsWith(")");
}

function routeFromSource(absolutePath) {
  const relative = path.relative(appRoot, path.dirname(absolutePath));
  const segments = relative
    .split(path.sep)
    .filter(Boolean)
    .filter((segment) => !isRouteGroup(segment))
    .filter((segment) => !segment.startsWith("@"))
    .map((segment) => segment.replace(/^\(\.{1,3}\)/, ""));
  return segments.length === 0 ? "/" : `/${segments.join("/")}`;
}

function routeFamily(route) {
  return route === "/" ? "/" : `/${route.split("/").filter(Boolean)[0]}`;
}

function layoutChain(absolutePagePath) {
  const layouts = [];
  let directory = path.dirname(absolutePagePath);

  while (directory.startsWith(appRoot)) {
    const layoutPath = path.join(directory, "layout.tsx");
    if (existsSync(layoutPath)) layouts.unshift(sourcePath(layoutPath));
    if (directory === appRoot) break;
    directory = path.dirname(directory);
  }

  return layouts;
}

function shellFor(pageSource, route) {
  if (pageSource.includes("/(dashboard)/")) {
    return knownMonolithRoutes.has(route) ? "Monolith AppShell" : "Legacy authenticated shell";
  }
  if (route.startsWith("/customer-portal")) return "Customer portal shell (conditional auth bypass)";
  if (pageSource.includes("/(auth)/")) return "Public authentication layout";
  return "Root layout only";
}

function stateFor(route) {
  if (route === "/dashboard") return "Protected reference";
  if (route === "/account/security") return "Migrated before this foundation session";
  if (knownMonolithRoutes.has(route)) return "Migrated in batch 001";
  return "Pending module migration";
}

function markdownEscape(value) {
  return value.replaceAll("|", "\\|");
}

const pages = walk(appRoot, "page.tsx")
  .map((absolutePath) => {
    const source = sourcePath(absolutePath);
    const route = routeFromSource(absolutePath);
    return {
      absolutePath,
      source,
      route,
      family: routeFamily(route),
      layouts: layoutChain(absolutePath),
      shell: shellFor(source, route),
      state: stateFor(route),
    };
  })
  .sort((left, right) => left.route.localeCompare(right.route) || left.source.localeCompare(right.source));

const layouts = walk(appRoot, "layout.tsx")
  .map((absolutePath) => {
    const source = sourcePath(absolutePath);
    const directory = path.dirname(absolutePath);
    const coveredPages = pages.filter((page) => {
      const relative = path.relative(directory, page.absolutePath);
      return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
    });
    const content = readFileSync(absolutePath, "utf8");
    const role =
      source === "src/app/layout.tsx"
        ? "Root metadata, fonts, initial theme, global providers"
        : source.includes("/(dashboard)/layout.tsx")
          ? "Authentication, RBAC/module gates, shell selection, notifications"
          : source.includes("/customer-portal/layout.tsx")
            ? "Customer portal session gate and portal chrome"
            : source.includes("/communication/layout.tsx")
              ? "Workspace connection gate and communication providers"
              : source.includes("/crm/layout.tsx")
                ? "CRM scroll/theme container"
                : source.includes("/cha/layout.tsx")
                  ? "CHA module spacing container"
                  : source.includes("/hrms/recruit/layout.tsx")
                    ? "Recruitment feature flag"
                    : "Nested route layout";

    return {
      source,
      pages: coveredPages.length,
      role,
      client: content.includes('"use client"') || content.includes("'use client'"),
    };
  })
  .sort((left, right) => left.source.localeCompare(right.source));

const familyCounts = new Map();
for (const page of pages) {
  const current = familyCounts.get(page.family) ?? {
    discovered: 0,
    protected: 0,
    migrated: 0,
    pending: 0,
  };
  current.discovered += 1;
  if (page.state === "Protected reference") current.protected += 1;
  else if (page.state.startsWith("Migrated")) current.migrated += 1;
  else current.pending += 1;
  familyCounts.set(page.family, current);
}

const generatedAt = new Date().toISOString();
const lines = [
  "# UI route and layout audit",
  "",
  `Generated by \`node scripts/audit-ui-routes.mjs\` at ${generatedAt}.`,
  "",
  "This is a source-level audit of every App Router page and layout. It records",
  "coverage and shell ownership; it does not claim runtime or visual verification",
  "for pending module routes.",
  "",
  "## Audit summary",
  "",
  `- Page routes: **${pages.length}**`,
  `- Layouts: **${layouts.length}**`,
  `- Protected visual reference routes: **${pages.filter((page) => page.state === "Protected reference").length}**`,
  `- Migrated routes: **${pages.filter((page) => page.state.startsWith("Migrated")).length}**`,
  `- Pending individual module migrations: **${pages.filter((page) => page.state === "Pending module migration").length}**`,
  "",
  "## Route families",
  "",
  "| Family | Discovered | Protected | Migrated | Pending |",
  "| --- | ---: | ---: | ---: | ---: |",
  ...[...familyCounts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([family, counts]) =>
        `| \`${family}\` | ${counts.discovered} | ${counts.protected} | ${counts.migrated} | ${counts.pending} |`,
    ),
  "",
  "## Layout inventory",
  "",
  "| Layout source | Covered pages | Runtime | Responsibility |",
  "| --- | ---: | --- | --- |",
  ...layouts.map(
    (layout) =>
      `| \`${layout.source}\` | ${layout.pages} | ${layout.client ? "Client" : "Server"} | ${layout.role} |`,
  ),
  "",
  "## Page inventory",
  "",
  "| Route | Source | Layout chain | Active shell | Migration state |",
  "| --- | --- | --- | --- | --- |",
  ...pages.map(
    (page) =>
      `| \`${markdownEscape(page.route)}\` | \`${page.source}\` | ${page.layouts.map((layout) => `\`${layout}\``).join("<br>")} | ${page.shell} | ${page.state} |`,
  ),
  "",
  "## Audit boundary",
  "",
  "- Route groups are removed from public URLs; dynamic segments remain in bracket form.",
  "- Layout coverage is calculated from filesystem ancestry.",
  "- `/dashboard` remains the protected visual reference and is not redesigned.",
  "- `/account/security` was migrated before the foundation session.",
  "- `/notifications`, `/product-catalogue`, and `/todo` were migrated in batch 001.",
  "- Every other route remains pending until its own presentation, behavior, RBAC,",
  "  themes, and responsive layout are verified in a later module batch.",
  "",
];

writeFileSync(outputPath, lines.join("\n"), "utf8");
console.log(`Wrote ${path.relative(repositoryRoot, outputPath)} with ${pages.length} pages and ${layouts.length} layouts.`);
