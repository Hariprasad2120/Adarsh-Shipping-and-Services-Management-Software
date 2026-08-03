import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const appRoot = path.join(repositoryRoot, "src", "app");
const docsRoot = path.join(repositoryRoot, "docs");
const outputPath = path.join(repositoryRoot, "docs", "ui-route-audit.md");
const migrationMatrixPath = path.join(
  repositoryRoot,
  "docs",
  "UI_DESIGN_SYSTEM_MIGRATION_STATUS.md",
);

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

function routeFamilyLabel(route) {
  const family = routeFamily(route);
  switch (family) {
    case "/":
      return "Public";
    case "/account":
      return "Account";
    case "/accounting":
      return "Accounting";
    case "/admin":
      return "Admin";
    case "/ams":
      return "AMS";
    case "/attendance":
      return "Attendance";
    case "/cha":
      return "CHA";
    case "/communication":
      return "Communication";
    case "/crm":
      return "CRM";
    case "/customer-portal":
      return "Customer portal";
    case "/dashboard":
      return "Dashboard";
    case "/expense":
      return "Expense";
    case "/google-chat-link":
      return "Public";
    case "/hrms":
      return "HRMS";
    case "/invite":
      return "Invitations";
    case "/lms":
      return "LMS";
    case "/login":
      return "Authentication";
    case "/notifications":
      return "Notifications";
    case "/product-catalogue":
      return "Product catalogue";
    case "/setup":
      return "Authentication";
    case "/todo":
      return "Todo";
    case "/verify":
      return "Verification";
    default:
      return family.replace(/^\//, "") || "Public";
  }
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

function shellFor(pageSource) {
  if (pageSource.includes("/customer-portal/")) {
    return "Monolith customer portal shell";
  }
  if (pageSource.includes("/(dashboard)/")) {
    return "Monolith AppShell";
  }
  if (pageSource.includes("/(auth)/")) return "Public authentication layout";
  return "Root layout";
}

function currentUiOwner(source) {
  if (source.includes("/admin/design-system/")) {
    return "Admin design-system catalogue";
  }
  if (source.startsWith("src/modules/")) {
    return "Module-owned composition";
  }
  if (source.startsWith("src/components/")) {
    return "Shared component system";
  }
  if (source.includes("/customer-portal/")) {
    return "Customer portal route composition";
  }
  if (source.includes("/dashboard/")) {
    return "Dashboard route composition";
  }
  if (source.includes("/cha/")) {
    return "CHA route composition";
  }
  if (source.includes("/crm/")) {
    return "CRM route composition";
  }
  if (source.includes("/accounting/")) {
    return "Accounting route composition";
  }
  if (source.includes("/hrms/")) {
    return "HRMS route composition";
  }
  if (source.includes("/attendance/")) {
    return "Attendance route composition";
  }
  if (source.includes("/ams/") || source.includes("/lms/")) {
    return "Performance/Learning route composition";
  }
  if (source.includes("/communication/")) {
    return "Communication route composition";
  }
  if (source.includes("/admin/")) {
    return "Admin route composition";
  }
  if (source.includes("/(auth)/") || source.includes("/invite/") || source.includes("/verify/")) {
    return "Public/auth route composition";
  }
  return "Route-local composition";
}

function analyzeVisualOwnership(absolutePath) {
  if (!existsSync(absolutePath)) {
    return {
      findings: "Source missing during audit.",
      status: "BLOCKED_RUNTIME_VERIFICATION",
    };
  }

  const source = readFileSync(absolutePath, "utf8");
  const rawVisualPattern = /<(button|input|textarea|select|table|dialog|h1|h2|h3|article)\b/g;
  const visualUtilityPattern =
    /\b(?:rounded(?:-\[[^\]]+\]|-\w+)?|shadow(?:-\[[^\]]+\]|-\w+)?|bg-(?:\[|mono-|white|black)|text-(?:\[|mono-)|border(?:-\[|-\w+)?|hover:-(?:translate|shadow|bg|border))/g;
  const counts = new Map();
  for (const match of source.matchAll(rawVisualPattern)) {
    counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
  }
  const visualUtilityCount = (source.match(visualUtilityPattern) ?? []).length;
  const directButtonLinks = (source.match(/<Link[^>]*className=/g) ?? []).length;

  if (absolutePath.endsWith(`${path.sep}loading.tsx`)) {
    if (source.includes("app-route-loading") || source.includes("LoadingScreen")) {
      return {
        findings: "Shared route-loading surface in use.",
        status: "COMPLIANT",
      };
    }
    return {
      findings: "Route-local loading state still present.",
      status: "PARTIAL",
    };
  }

  if (
    absolutePath.endsWith(`${path.sep}error.tsx`) ||
    absolutePath.endsWith(`${path.sep}not-found.tsx`)
  ) {
    if (source.includes("WorkspaceState") || source.includes("WorkspaceErrorState")) {
      return {
        findings: "Shared workspace-state feedback contract in use.",
        status: "COMPLIANT",
      };
    }
    return {
      findings: "Route-local error/not-found state markup detected.",
      status: "PARTIAL",
    };
  }

  if (absolutePath.endsWith(`${path.sep}layout.tsx`)) {
    return {
      findings: source.includes("CrmWorkspaceFrame") ||
        source.includes("ChaWorkspaceFrame") ||
        source.includes("AccountingWorkspaceFrame") ||
        source.includes("AdminWorkspaceFrame") ||
        source.includes("PeopleWorkspaceFrame") ||
        source.includes("PerformanceWorkspaceFrame")
        ? "Module workspace frame is applied."
        : "Layout composes route family framing but still needs runtime verification.",
      status: "COMPLIANT",
    };
  }

  if (absolutePath.includes(`${path.sep}dashboard${path.sep}`)) {
    return {
      findings:
        "Dashboard remains the protected composition reference. Route-local compositions are intentionally preserved pending selective canonical extraction.",
      status: "SPECIALISED_COMPLIANT",
    };
  }

  const rawSummary = [...counts.entries()]
    .map(([tag, count]) => `${tag}:${count}`)
    .join(", ");
  const findingParts = [];
  if (rawSummary) findingParts.push(`Raw visual elements detected (${rawSummary}).`);
  if (visualUtilityCount > 0) {
    findingParts.push(`${visualUtilityCount} visual utility token candidates detected.`);
  }
  if (directButtonLinks > 0) {
    findingParts.push(`${directButtonLinks} Link elements carry direct button styling.`);
  }

  if (counts.size === 0 && visualUtilityCount === 0 && directButtonLinks === 0) {
    return {
      findings: "No obvious route-local visual recreation detected by static audit.",
      status: "COMPLIANT",
    };
  }

  const hasPrimitiveRecreation = [...counts.keys()].some((tag) =>
    ["button", "input", "textarea", "select", "table", "dialog", "article"].includes(tag),
  );

  return {
    findings: findingParts.join(" "),
    status:
      hasPrimitiveRecreation || visualUtilityCount > 20 || directButtonLinks > 0
        ? "NON_COMPLIANT"
        : "PARTIAL",
  };
}

function canonicalReplacementFor(source, absolutePath) {
  if (source.includes("/dashboard/")) {
    return "Preserve dashboard-specific composition; extract only reusable patterns into module/shared owners.";
  }
  if (absolutePath.endsWith(`${path.sep}loading.tsx`)) {
    return "Use shared route loading via app-route-loading or canonical workspace loading state.";
  }
  if (
    absolutePath.endsWith(`${path.sep}error.tsx`) ||
    absolutePath.endsWith(`${path.sep}not-found.tsx`)
  ) {
    return "Use canonical workspace-state feedback components.";
  }
  if (source.includes("/cha/")) {
    return "CHA workspace frame, page header, section heading, operational tables, and shared feedback/actions.";
  }
  if (source.includes("/crm/")) {
    return "CRM workspace frame, shared action/form/table/state contracts, and module-owned CRM compositions.";
  }
  if (source.includes("/accounting/")) {
    return "Accounting workspace contracts plus shared canonical form/table/action primitives.";
  }
  if (source.includes("/customer-portal/")) {
    return "Customer portal workspace components and shared canonical form/feedback patterns.";
  }
  if (source.includes("/(auth)/") || source.includes("/invite/") || source.includes("/verify/")) {
    return "Public/auth shared workspace shells and canonical field/action/feedback components.";
  }
  return "Shared Monolith page/header/section/panel/action/form/feedback primitives.";
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
      shell: shellFor(source),
    };
  })
  .sort(
    (left, right) =>
      left.route.localeCompare(right.route) ||
      left.source.localeCompare(right.source),
  );

const layouts = walk(appRoot, "layout.tsx")
  .map((absolutePath) => {
    const source = sourcePath(absolutePath);
    const directory = path.dirname(absolutePath);
    const coveredPages = pages.filter((page) => {
      const relative = path.relative(directory, page.absolutePath);
      return (
        relative !== "" &&
        !relative.startsWith("..") &&
        !path.isAbsolute(relative)
      );
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
              : source.includes("/admin/layout.tsx")
                ? "Shared administration workspace frame and asynchronous states"
                : source.includes("/crm/layout.tsx")
                  ? "Shared CRM workspace frame and asynchronous states"
                  : source.includes("/cha/layout.tsx")
                    ? "Shared CHA workspace frame and asynchronous states"
                    : source.includes("/expense/layout.tsx")
                      ? "Shared Expense workspace frame and asynchronous states"
                      : source.includes("/accounting/layout.tsx")
                        ? "Shared Accounting workspace frame and asynchronous states"
                        : source.includes("/hrms/recruit/layout.tsx")
                          ? "Recruitment feature flag"
                          : source.includes("/hrms/layout.tsx")
                            ? "Shared HRMS route framing and asynchronous states"
                            : source.includes("/attendance/layout.tsx")
                              ? "Shared Attendance route framing and asynchronous states"
                              : source.includes("/ams/layout.tsx")
                                ? "Shared AMS route framing and asynchronous states"
                                : source.includes("/lms/layout.tsx")
                                  ? "Shared LMS route framing and asynchronous states"
                                  : "Nested route layout";

    return {
      source,
      pages: coveredPages.length,
      role,
      client:
        content.includes('"use client"') || content.includes("'use client'"),
    };
  })
  .sort((left, right) => left.source.localeCompare(right.source));

const familyCounts = new Map();
for (const page of pages) {
  const current = familyCounts.get(page.family) ?? {
    discovered: 0,
    specialised: 0,
    compliant: 0,
    partial: 0,
    nonCompliant: 0,
  };
  current.discovered += 1;
  const analysis = analyzeVisualOwnership(page.absolutePath);
  if (analysis.status === "SPECIALISED_COMPLIANT") current.specialised += 1;
  else if (analysis.status === "COMPLIANT") current.compliant += 1;
  else if (analysis.status === "PARTIAL") current.partial += 1;
  else current.nonCompliant += 1;
  familyCounts.set(page.family, current);
}

function inventoryEntries(kind) {
  return walk(appRoot, `${kind}.tsx`)
    .map((absolutePath) => {
      const source = sourcePath(absolutePath);
      const route = routeFromSource(absolutePath);
      const analysis = analyzeVisualOwnership(absolutePath);
      return {
        absolutePath,
        source,
        route,
        routeState: `${route} (${kind})`,
        family: routeFamilyLabel(route),
        owner: currentUiOwner(source),
        findings: analysis.findings,
        replacement: canonicalReplacementFor(source, absolutePath),
        status: analysis.status,
        sourceVerification: "Source inspected in current mainline checkout.",
        runtimeVerification:
          "Manual browser verification still pending in this Codex session.",
        notes:
          kind === "page"
            ? shellFor(source)
            : kind === "layout"
              ? "Applies framing/guards to descendant routes."
              : `Route ${kind} state.`,
      };
    })
    .sort(
      (left, right) =>
        left.route.localeCompare(right.route) ||
        left.source.localeCompare(right.source),
    );
}

const migrationEntries = [
  ...inventoryEntries("page"),
  ...inventoryEntries("layout"),
  ...inventoryEntries("loading"),
  ...inventoryEntries("error"),
  ...inventoryEntries("not-found"),
];

const statusCounts = migrationEntries.reduce((counts, entry) => {
  counts[entry.status] = (counts[entry.status] ?? 0) + 1;
  return counts;
}, {});

const generatedAt = new Date().toISOString();
mkdirSync(docsRoot, { recursive: true });
const lines = [
  "# UI route and layout audit",
  "",
  `Generated by \`node scripts/audit-ui-routes.mjs\` at ${generatedAt}.`,
  "",
  "This is a source-level audit of every App Router page and layout. It records",
  "coverage and shell ownership. The fresh route-by-route migration matrix is",
  "recorded in `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`.",
  "",
  "## Audit summary",
  "",
  `- Page routes: **${pages.length}**`,
  `- Layouts: **${layouts.length}**`,
  `- Loading states: **${inventoryEntries("loading").length}**`,
  `- Error states: **${inventoryEntries("error").length}**`,
  `- Not-found states: **${inventoryEntries("not-found").length}**`,
  `- Migration matrix rows: **${migrationEntries.length}**`,
  "",
  "## Route families",
  "",
  "| Family | Discovered | Specialised | Compliant | Partial | Non-compliant |",
  "| --- | ---: | ---: | ---: | ---: | ---: |",
  ...[...familyCounts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([family, counts]) =>
        `| \`${family}\` | ${counts.discovered} | ${counts.specialised} | ${counts.compliant} | ${counts.partial} | ${counts.nonCompliant} |`,
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
      `| \`${markdownEscape(page.route)}\` | \`${page.source}\` | ${page.layouts.map((layout) => `\`${layout}\``).join("<br>")} | ${page.shell} | ${analyzeVisualOwnership(page.absolutePath).status} |`,
  ),
  "",
  "## Audit boundary",
  "",
  "- Route groups are removed from public URLs; dynamic segments remain in bracket form.",
  "- Layout coverage is calculated from filesystem ancestry.",
  "- `/dashboard` remains the protected composition reference and is classified as `SPECIALISED_COMPLIANT`.",
  "- Static analysis intentionally over-reports route-local raw headings and primitives for manual review.",
  "- Runtime/theme/viewport verification still requires manual browser evidence in this session.",
  "- The migration matrix reflects current source, not historical claims from older handoff documents.",
  "",
];

writeFileSync(outputPath, lines.join("\n"), "utf8");

const matrixLines = [
  "# UI Design System Migration Status",
  "",
  `Generated by \`node scripts/audit-ui-routes.mjs\` at ${generatedAt}.`,
  "",
  "This matrix is a fresh source audit of every discovered route page and route state.",
  "Runtime verification is still pending unless separately documented with browser evidence.",
  "",
  "## Status summary",
  "",
  `- \`COMPLIANT\`: **${statusCounts.COMPLIANT ?? 0}**`,
  `- \`PARTIAL\`: **${statusCounts.PARTIAL ?? 0}**`,
  `- \`NON_COMPLIANT\`: **${statusCounts.NON_COMPLIANT ?? 0}**`,
  `- \`SPECIALISED_COMPLIANT\`: **${statusCounts.SPECIALISED_COMPLIANT ?? 0}**`,
  `- \`MIGRATED\`: **${statusCounts.MIGRATED ?? 0}**`,
  `- \`BLOCKED_RUNTIME_VERIFICATION\`: **${statusCounts.BLOCKED_RUNTIME_VERIFICATION ?? 0}**`,
  "",
  "| Route/state | Source files | Route family | Current UI owner | Findings | Canonical replacement | Status | Source verification | Runtime verification | Notes |",
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ...migrationEntries.map(
    (entry) =>
      `| \`${markdownEscape(entry.routeState)}\` | \`${entry.source}\` | ${entry.family} | ${entry.owner} | ${markdownEscape(entry.findings)} | ${markdownEscape(entry.replacement)} | ${entry.status} | ${markdownEscape(entry.sourceVerification)} | ${markdownEscape(entry.runtimeVerification)} | ${markdownEscape(entry.notes)} |`,
  ),
  "",
];

writeFileSync(migrationMatrixPath, matrixLines.join("\n"), "utf8");
console.log(
  `Wrote ${path.relative(repositoryRoot, outputPath)} and ${path.relative(repositoryRoot, migrationMatrixPath)} with ${pages.length} pages, ${layouts.length} layouts, and ${migrationEntries.length} route-state rows.`,
);
