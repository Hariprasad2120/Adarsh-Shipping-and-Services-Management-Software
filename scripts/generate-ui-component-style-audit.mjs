import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import ts from "typescript";

const root = process.cwd();
const sourceRoots = ["src/app", "src/components", "src/modules", "src/styles"];
const ignoredDirectories = new Set(["node_modules", ".next", "_design-reference", "OLD UI code"]);

function walk(relativeDirectory, predicate = () => true) {
  const absoluteDirectory = path.join(root, relativeDirectory);
  if (!fs.existsSync(absoluteDirectory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;
    const relative = path.posix.join(relativeDirectory.replaceAll("\\", "/"), entry.name);
    if (entry.isDirectory()) files.push(...walk(relative, predicate));
    else if (predicate(relative)) files.push(relative);
  }
  return files.sort();
}

function read(relativeFile) {
  return fs.readFileSync(path.join(root, relativeFile), "utf8").replaceAll("\r\n", "\n");
}

function lineNumber(source, offset) {
  return source.slice(0, offset).split("\n").length;
}

function table(headers, rows) {
  if (rows.length === 0) return "_None._\n";
  const escape = (value) => String(value).replaceAll("|", "\\|").replaceAll("\n", "<br>");
  return [
    `| ${headers.map(escape).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escape).join(" | ")} |`),
    "",
  ].join("\n");
}

function classifyFile(file) {
  if (file === "src/app/globals.css") return "FOUNDATION";
  if (file === "src/styles/monolith-tokens.css") return "TOKEN";
  if (file === "src/styles/monolith-system.css") return "SHARED_COMPONENT";
  if (file === "src/styles/legacy-compatibility.css") return "LEGACY";
  if (file.startsWith("src/styles/modules/")) return "MODULE_COMPONENT";
  if (file.includes("/admin/design-system/")) return "CATALOGUE_LAYOUT_ONLY";
  if (file.endsWith(".module.css")) return file.includes("/auth/") ? "MODULE_COMPONENT" : "SHARED_COMPONENT";
  if (file.startsWith("src/components/")) return "SHARED_COMPONENT";
  if (file.startsWith("src/modules/")) return "MODULE_COMPONENT";
  if (file.startsWith("src/app/")) return "BUSINESS_LAYOUT_ONLY";
  return "LEGACY";
}

const allSourceFiles = sourceRoots.flatMap((directory) =>
  walk(directory, (file) => /\.(?:css|tsx?|jsx?)$/.test(file)),
);
const cssFiles = [...new Set(allSourceFiles.filter((file) => file.endsWith(".css")))].sort();
const scriptFiles = allSourceFiles.filter((file) => /\.(?:tsx?|jsx?)$/.test(file));

const cssImports = [];
for (const file of allSourceFiles) {
  const source = read(file);
  const patterns = [
    /@import\s+["']([^"']+\.css)["']/g,
    /(?<!@)\bimport\s+(?:\w+\s+from\s+)?["']([^"']+\.css)["']/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      cssImports.push({
        importer: file,
        imported: match[1],
        line: lineNumber(source, match.index),
        order: cssImports.filter((item) => item.importer === file).length + 1,
      });
    }
  }
}

const selectorOwners = new Map();
const cssStats = [];
const bypasses = [];
const declarationPattern =
  /\b(font-family|font-size|border-radius|box-shadow|color|background(?:-color)?|transition(?:-duration|-timing-function)?|animation(?:-duration|-timing-function)?)\s*:\s*([^;{}]+);/g;
const bypassValuePattern =
  /#(?:[\da-f]{3,8})\b|\brgba?\(|\bhsla?\(|\b(?:\d*\.?\d+)(?:px|rem|em|ms|s)\b|(?:^|[\s,(])(?:Inter|Geist|"Segoe UI"|'Segoe UI')\b/i;

for (const file of cssFiles) {
  const source = read(file);
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  let selectorCount = 0;
  postcss.parse(withoutComments, { from: file }).walkRules((rule) => {
    let parent = rule.parent;
    while (parent && parent.type !== "root") {
      if (parent.type === "atrule" && /keyframes$/i.test(parent.name)) return;
      parent = parent.parent;
    }
    const selector = rule.selector.trim().replace(/\s+/g, " ");
    if (!selector || selector === "from" || selector === "to" || /^\d+%$/.test(selector)) return;
    selectorCount += 1;
    const owners = selectorOwners.get(selector) ?? [];
    owners.push(`${file}:${rule.source?.start?.line ?? 1}`);
    selectorOwners.set(selector, owners);
  });
  for (const match of source.matchAll(declarationPattern)) {
    const value = match[2].trim();
    if (!bypassValuePattern.test(value)) continue;
    if (/var\(--mn(?:x)?-/.test(value) && !/#|\brgba?\(|\bhsla?\(/i.test(value)) continue;
    bypasses.push([
      classifyFile(file),
      `${file}:${lineNumber(source, match.index)}`,
      match[1],
      `\`${value.replaceAll("`", "\\`")}\``,
    ]);
  }
  cssStats.push([
    classifyFile(file),
    file,
    source.split("\n").length,
    selectorCount,
    cssImports.filter((item) => item.imported.includes(path.basename(file))).length,
  ]);
}

const duplicateSelectors = [...selectorOwners.entries()]
  .filter(([, owners]) => new Set(owners.map((owner) => owner.split(":").slice(0, -1).join(":"))).size > 1)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([selector, owners]) => ["DUPLICATE", `\`${selector}\``, owners.join("<br>")]);

const mnxFiles = allSourceFiles
  .filter((file) => read(file).includes("mnx-"))
  .map((file) => [classifyFile(file), file]);

function exportedVisualComponents(file) {
  if (!file.endsWith(".tsx") || /(?:^|\/)(?:index|.*\.test)\.tsx?$/.test(file)) return [];
  const source = read(file);
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = new Set();
  const hasExportModifier = (node) =>
    node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
  for (const statement of sourceFile.statements) {
    if (!hasExportModifier(statement)) continue;
    if (ts.isFunctionDeclaration(statement) && statement.name && /^[A-Z]/.test(statement.name.text)) {
      names.add(statement.name.text);
    }
    if (ts.isClassDeclaration(statement) && statement.name && /^[A-Z]/.test(statement.name.text)) {
      names.add(statement.name.text);
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && /^[A-Z]/.test(declaration.name.text)) {
          names.add(declaration.name.text);
        }
      }
    }
  }
  return [...names].sort();
}

const visualComponents = [];
for (const file of scriptFiles) {
  for (const component of exportedVisualComponents(file)) {
    visualComponents.push({
      component,
      file,
      classification: classifyFile(file),
    });
  }
}
visualComponents.sort((a, b) => a.file.localeCompare(b.file) || a.component.localeCompare(b.component));

const catalogueFiles = scriptFiles.filter(
  (file) =>
    file.includes("/admin/design-system/") ||
    file.startsWith("src/components/monolith/catalogue/"),
);
const catalogueSource = catalogueFiles.map(read).join("\n");
const catalogueExclusions = JSON.parse(
  read("src/components/monolith/catalogue/catalogue-exclusions.json"),
);
const exclusionKeys = new Set(
  catalogueExclusions.map(({ source, component }) => `${source}#${component}`),
);
const componentRows = visualComponents.map(({ component, file, classification }) => [
  classification,
  component,
  file,
  new RegExp(`\\b${component}\\b`).test(catalogueSource)
    ? "REGISTERED"
    : exclusionKeys.has(`${file}#${component}`)
      ? "EXCLUDED WITH OWNER/REASON"
      : "OUTSIDE ENFORCED REUSABLE SCOPE",
]);

const routeLocalCandidates = [];
const rawVisualPattern = /<(button|input|textarea|select|table|dialog|h1|h2|h3|article)\b/g;
for (const file of scriptFiles.filter((value) => value.startsWith("src/app/") || value.startsWith("src/modules/"))) {
  const source = read(file);
  const counts = new Map();
  for (const match of source.matchAll(rawVisualPattern)) {
    counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
  }
  const visualUtilityCount = (
    source.match(
      /\b(?:rounded(?:-\[[^\]]+\]|-\w+)?|shadow(?:-\[[^\]]+\]|-\w+)?|bg-(?:\[|mono-|white|black)|text-(?:\[|mono-)|border(?:-\[|-\w+)?|hover:-(?:translate|shadow|bg|border))/g,
    ) ?? []
  ).length;
  if (counts.size === 0 && visualUtilityCount === 0) continue;
  routeLocalCandidates.push([
    "BUSINESS_LAYOUT_ONLY",
    file,
    [...counts.entries()].map(([tag, count]) => `${tag}:${count}`).join(", ") || "none",
    visualUtilityCount,
    visualUtilityCount > 0 || [...counts.keys()].some((tag) => !["h1", "h2", "h3"].includes(tag))
      ? "REVIEW / REPLACE"
      : "REVIEW",
  ]);
}

const directComponentStylesInCatalogue = [];
for (const file of cssFiles.filter((value) => value.includes("/admin/design-system/"))) {
  const source = read(file);
  for (const match of source.matchAll(/([^{}]+)\{/g)) {
    const selector = match[1].trim();
    const classNames = [...selector.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map(
      (classMatch) => classMatch[1],
    );
    if (classNames.some((className) => !className.startsWith("mnx-catalogue-"))) {
      directComponentStylesInCatalogue.push([
        "DUPLICATE",
        `${file}:${lineNumber(source, match.index)}`,
        `\`${selector.replaceAll("`", "\\`")}\``,
      ]);
    }
  }
}

const globalFiles = cssFiles.filter((file) => !file.endsWith(".module.css"));
const moduleCssFiles = cssFiles.filter((file) => file.endsWith(".module.css"));
const designOnlyFiles = cssFiles.filter((file) => file.includes("/admin/design-system/"));
const sharedComponents = visualComponents.filter((item) => item.classification === "SHARED_COMPONENT");
const moduleComponents = visualComponents.filter((item) => item.classification === "MODULE_COMPONENT");
const missingComponents = visualComponents.filter(
  ({ component, file }) =>
    !new RegExp(`\\b${component}\\b`).test(catalogueSource) &&
    !exclusionKeys.has(`${file}#${component}`),
);

const generatedAt = new Date().toISOString();
const output = `# UI component and style ownership audit

Generated by \`scripts/generate-ui-component-style-audit.mjs\` at ${generatedAt}.

This audit covers active source under \`src/app\`, \`src/components\`, and
\`src/modules\`. Read-only \`_design-reference\`, archived \`OLD UI code\`,
dependencies, and build output are deliberately excluded. The classification
column uses the required ownership vocabulary. Candidate rows are evidence for
manual migration; they are not permission to change business behavior.

## Executive findings

- CSS files imported by the application: **${cssFiles.length}**.
- Global stylesheets: **${globalFiles.length}**.
- Design-system-only stylesheets: **${designOnlyFiles.length}**.
- CSS modules: **${moduleCssFiles.length}**.
- Files containing \`.mnx-*\` classes: **${mnxFiles.length}**.
- Selectors with more than one stylesheet owner: **${duplicateSelectors.length}**.
- Direct declaration candidates bypassing semantic tokens: **${bypasses.length}**.
- Exported visual React components discovered: **${visualComponents.length}**
  (${sharedComponents.length} shared, ${moduleComponents.length} module-owned).
- Visual exports outside the enforced registry/exclusion scope: **${missingComponents.length}**.
- Route/module files requiring route-local visual recreation review: **${routeLocalCandidates.length}**.
- Catalogue selectors that appear to style components rather than arrangement: **${directComponentStylesInCatalogue.length}**.

## CSS import graph and order

${table(
  ["Ownership", "Importer", "Order", "Imported stylesheet", "Line"],
  cssImports.map((item) => [
    classifyFile(item.importer),
    item.importer,
    item.order,
    item.imported,
    item.line,
  ]),
)}

Effective order begins at \`src/app/layout.tsx\`: \`globals.css\` imports tokens
first and the production system second. Route CSS is appended when the
administrator catalogue route is loaded. The authentication CSS module is
locally scoped to the animated login component.

## Stylesheet inventory

${table(["Ownership", "File", "Lines", "Selectors", "Import references"], cssStats)}

### Global stylesheets

${table(["Ownership", "File"], globalFiles.map((file) => [classifyFile(file), file]))}

### Design-system-only stylesheets

${table(["Ownership", "File"], designOnlyFiles.map((file) => [classifyFile(file), file]))}

### CSS modules

${table(["Ownership", "File"], moduleCssFiles.map((file) => [classifyFile(file), file]))}

## Duplicate selector ownership

${table(["Ownership", "Selector", "Definitions"], duplicateSelectors)}

## Direct declaration/token-bypass candidates

The list is intentionally exhaustive and includes justified code typography,
keyframes, resets, and compatibility rules so each declaration can be retained,
tokenized, or retired deliberately.

${table(["Ownership", "Location", "Property", "Value"], bypasses)}

## Files containing \`.mnx-*\` classes

${table(["Ownership", "File"], mnxFiles)}

## Catalogue-owned production styling

These selectors are disconnected or override-capable catalogue styling. The
catalogue may keep only arrangement selectors after correction.

${table(["Ownership", "Location", "Selector"], directComponentStylesInCatalogue)}

## Exported shared visual components and catalogue coverage

${table(
  ["Ownership", "Export", "Source", "Current catalogue coverage"],
  componentRows.filter((row) => row[0] === "SHARED_COMPONENT"),
)}

## CHA-specific visual components

${table(
  ["Ownership", "Export", "Source", "Current catalogue coverage"],
  componentRows.filter((row) => row[2].includes("/cha/")),
)}

## Other module-specific visual components

${table(
  ["Ownership", "Export", "Source", "Current catalogue coverage"],
  componentRows.filter((row) => row[0] === "MODULE_COMPONENT" && !row[2].includes("/cha/")),
)}

## Components missing from the current design-system page

${table(
  ["Ownership", "Export", "Source"],
  missingComponents.map((item) => [item.classification, item.component, item.file]),
)}

## Disconnected production concepts in the current catalogue

The route-local \`SectionTitle\`, raw \`button\`/\`input\`/\`select\` specimens,
raw cards/panels, badges, alerts, navigation, upload, motion cards, and theme
controls in \`design-system-client.tsx\` are disconnected mock markup. The only
directly imported production family is the operational data table and
\`NeonCheckbox\`. All other specimens must be replaced by registered canonical
components.

${table(
  ["Ownership", "Catalogue source", "Required canonical owner"],
  [
    ["DUPLICATE", "SectionTitle / section-heading", "WorkspaceSectionHeading"],
    ["DUPLICATE", "btn / icon-button / copy-token", "Button / MonolithAction / MonolithIconAction"],
    ["DUPLICATE", "field / select-wrap / upload", "WorkspaceField and canonical controls"],
    ["DUPLICATE", "surface-card / card-grid / feedback-card", "WorkspacePanel / MonolithSurface"],
    ["DUPLICATE", "status-chip / badge examples", "Badge / WorkspaceBadge"],
    ["DUPLICATE", "feedback alert examples", "Alert / WorkspaceAlert / route states"],
    ["DUPLICATE", "sidebar / topbar / tabs / breadcrumb examples", "canonical navigation and shell components"],
    ["DUPLICATE", "motion-card", "explicitly interactive MonolithSurface or WorkspacePanel"],
  ],
)}

## Route-local recreation candidates

This inventory records raw visual elements and visual utility density. Each
candidate must be checked against the canonical component contract; no broad
replacement is authorized.

${table(
  ["Ownership", "File", "Raw visual elements", "Visual utility tokens", "Disposition"],
  routeLocalCandidates,
)}

## Target ownership decisions

| Ownership | Target responsibility |
| --- | --- |
| FOUNDATION | \`globals.css\`: imports, reset, document behavior only. |
| TOKEN | \`monolith-tokens.css\`: semantic tokens and themes only. |
| SHARED_COMPONENT | Canonical shared React owners and \`monolith-system.css\` shared styles. |
| MODULE_COMPONENT | Typed module compositions plus one module stylesheet owner where needed. |
| CATALOGUE_LAYOUT_ONLY | \`.mnx-catalogue-*\` arrangement only; no production component selectors. |
| LEGACY | Explicit compatibility file while active usages remain. |
| UNUSED | Remove only after import/usage verification. |
| DUPLICATE | Consolidate into the canonical owner before deletion. |
| BUSINESS_LAYOUT_ONLY | Route-specific data arrangement that does not recreate a visual primitive. |

## Audit limitations and enforcement follow-up

TypeScript export discovery is AST-based. Route-local recreation detection and
CSS selector extraction are conservative heuristics and intentionally over-report
for manual review. The production coverage verifier must use the same export
inventory plus an explicit exclusion record, reject missing/duplicate/stale
entries, and reject production selectors in catalogue CSS.
`;

const outputFile = path.join(root, "docs", "ui-component-and-style-ownership-audit.md");
fs.writeFileSync(outputFile, output);
console.log(`Wrote ${path.relative(root, outputFile)} (${output.split("\n").length} lines).`);
