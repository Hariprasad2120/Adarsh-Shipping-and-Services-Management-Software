import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const scanRoots = ["src/components", "src/app", "src/modules", "src/styles"];
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);
const routeFiles = new Set([
  "page.tsx",
  "layout.tsx",
  "loading.tsx",
  "error.tsx",
  "not-found.tsx",
  "route.ts",
  "template.tsx",
  "default.tsx",
]);

const normalize = (value) => value.replaceAll("\\", "/");
const relative = (value) => normalize(path.relative(root, value));
const quote = (value) => `\`${String(value).replaceAll("`", "\\`")}\``;
const cell = (value) => String(value || "—").replaceAll("|", "\\|").replaceAll("\n", "<br>");

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return extensions.has(path.extname(entry.name)) ? [absolute] : [];
  });
}

const files = scanRoots.flatMap((directory) => walk(path.join(root, directory)));
const records = new Map(
  files.map((absolute) => {
    const file = relative(absolute);
    return [
      file,
      {
        absolute,
        file,
        extension: path.extname(file),
        source: readFileSync(absolute, "utf8"),
        exports: new Set(),
        staticImports: [],
        dynamicImports: [],
        importers: new Set(),
        dynamicImporters: new Set(),
      },
    ];
  }),
);

const allSourcePaths = new Set(records.keys());

function resolveImport(importer, specifier) {
  let candidate;
  if (specifier.startsWith("@/")) {
    candidate = path.join(root, "src", specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    candidate = path.resolve(path.dirname(path.join(root, importer)), specifier);
  } else {
    return null;
  }

  const options = [
    candidate,
    ...[".ts", ".tsx", ".js", ".jsx", ".css"].map((extension) => `${candidate}${extension}`),
    ...["index.ts", "index.tsx", "index.js", "index.jsx"].map((name) => path.join(candidate, name)),
  ];
  return options.map(relative).find((option) => allSourcePaths.has(option)) ?? null;
}

function collectBindingNames(name, output) {
  if (ts.isIdentifier(name)) output.add(name.text);
  if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
    for (const element of name.elements) {
      if (ts.isBindingElement(element)) collectBindingNames(element.name, output);
    }
  }
}

for (const record of records.values()) {
  if (record.extension === ".css") continue;
  const kind = record.extension.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    record.file,
    record.source,
    ts.ScriptTarget.Latest,
    true,
    kind,
  );

  function visit(node) {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) ?? [] : [];
    const exported = modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
    const isDefault = modifiers.some(
      (modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword,
    );

    if (
      exported &&
      (ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isEnumDeclaration(node))
    ) {
      if (node.name) record.exports.add(node.name.text);
      if (isDefault) record.exports.add("default");
    }
    if (exported && ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        collectBindingNames(declaration.name, record.exports);
      }
    }
    if (ts.isExportAssignment(node)) record.exports.add("default");
    if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          record.exports.add(element.name.text);
        }
      } else {
        record.exports.add("*");
      }
    }
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      record.staticImports.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      record.dynamicImports.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

for (const record of records.values()) {
  for (const specifier of record.staticImports) {
    const target = resolveImport(record.file, specifier);
    if (target) records.get(target)?.importers.add(record.file);
  }
  for (const specifier of record.dynamicImports) {
    const target = resolveImport(record.file, specifier);
    if (target) {
      records.get(target)?.importers.add(record.file);
      records.get(target)?.dynamicImporters.add(record.file);
    }
  }
}

const basenameCounts = new Map();
for (const record of records.values()) {
  if (![".tsx", ".jsx"].includes(record.extension)) continue;
  const name = path.basename(record.file).toLowerCase();
  basenameCounts.set(name, (basenameCounts.get(name) ?? 0) + 1);
}

function moduleFromPath(file) {
  const moduleMatch = file.match(/^src\/modules\/([^/]+)/);
  if (moduleMatch) return moduleMatch[1];
  const componentMatch = file.match(/^src\/components\/(ams|cha|crm|hrms|items|mona|notifications)\//);
  if (componentMatch) return componentMatch[1];
  const appMatch = file.match(
    /^src\/app\/(?:\([^/]+\)\/)?(accounting|admin|ams|attendance|cha|communication|crm|customer-portal|dashboard|expense|hrms|invite|lms|notifications|product-catalogue|todo)(?:\/|$)/,
  );
  return appMatch?.[1] ?? null;
}

function inferredModule(record) {
  const direct = moduleFromPath(record.file);
  if (direct) return direct;
  const modules = new Set(
    [...record.importers].map(moduleFromPath).filter(Boolean),
  );
  return modules.size === 1 ? [...modules][0] : modules.size > 1 ? "cross-module" : "shared";
}

function proposedDestination(record) {
  const file = record.file;
  const name = path.basename(file);
  const stem = name.replace(/\.(?:tsx|jsx|ts|js|css)$/, "");
  if (file.startsWith("src/components/monolith/")) {
    const ui = new Set([
      "alert",
      "badge",
      "button",
      "button-1",
      "card",
      "date-input",
      "dropdown-menu",
      "dropdown-select",
      "folder-icon",
      "foundation",
      "input",
      "label",
      "modal",
      "native-select",
      "neon-checkbox",
      "textarea",
    ]);
    const forms = new Set(["file-upload-field", "filter-menu"]);
    const dataDisplay = new Set([
      "operations-overview",
      "people-data-table",
      "workspace-data-table",
    ]);
    const feedback = new Set(["warning-indicator-popover", "workspace-states"]);
    const layout = new Set([
      "app-shell",
      "public-workspace",
      "workspace",
      "workspace-dialog",
    ]);
    const moduleNames = {
      "accounting-delete-action": "accounting",
      "accounting-items": "accounting",
      "accounting-workspace": "accounting",
      "admin-workspace": "admin",
      "cha-workspace": "cha",
      "communication-workspace": "communication",
      "crm-workspace": "crm",
      "people-controls": "hrms",
      "people-workspace": "hrms",
      "performance-workspace": "ams",
    };
    const testSuffix = stem.match(/^(.*)\.test$/)?.[1];
    const base = testSuffix ?? stem;
    if (ui.has(base)) return `src/components/ui/${name}`;
    if (forms.has(base)) return `src/components/forms/${name}`;
    if (dataDisplay.has(base)) return `src/components/data-display/${name}`;
    if (feedback.has(base)) return `src/components/feedback/${name}`;
    if (layout.has(base)) return `src/components/layout/${name}`;
    if (moduleNames[base]) {
      return `src/modules/${moduleNames[base]}/components/${name}`;
    }
    if (name === "index.ts") return "remove after all canonical imports migrate";
  }

  const componentModuleMatch = file.match(
    /^src\/components\/(ams|cha|crm|hrms|items|mona|notifications)\/(.+)$/,
  );
  if (componentModuleMatch) {
    return `src/modules/${componentModuleMatch[1]}/components/${componentModuleMatch[2]}`;
  }
  if (file.startsWith("src/components/shared/data-table.")) {
    return `src/components/data-display/${name}`;
  }
  if (file.startsWith("src/components/shared/clickable-row.")) {
    return `src/components/navigation/${name}`;
  }
  if (file.startsWith("src/components/shared/demo-fill-button.")) {
    return `src/components/forms/development/${name}`;
  }
  if (file.startsWith("src/components/notifications/")) {
    return `src/modules/notifications/components/${name}`;
  }
  if (file.includes("/_components/")) {
    const owner = inferredModule(record);
    const owningDirectory = file.slice(0, file.indexOf("/_components/"));
    const outsideOwner = [...record.importers].some(
      (importer) => !importer.startsWith(`${owningDirectory}/`),
    );
    if (outsideOwner && owner && owner !== "shared" && owner !== "cross-module") {
      return `src/modules/${owner}/components/${name}`;
    }
    return file;
  }
  // Non-convention files may remain in App Router when they are genuinely
  // private to their exact route segment. Cross-segment `_components` imports
  // are handled above; broader route thinning is a reviewed, feature-specific
  // decision rather than an automatic move.
  return file;
}

function flags(record) {
  const source = record.source;
  const isComponent = [".tsx", ".jsx"].includes(record.extension);
  const businessLogic =
    /\b(prisma|server action|use server|permission|hasPermission|fetch\(|axios|zod|schema|transaction|createMany|updateMany|deleteMany)\b/i.test(
      source,
    );
  const routeSpecific =
    /(?:href|router\.(?:push|replace)|redirect)\s*\(\s*["'`]\//.test(source) ||
    /\b(?:CHA|CRM|HRMS|AMS|Accounting|Attendance|Customer Portal)\b/.test(source);
  const monolith =
    record.file.includes("/monolith/") ||
    /@\/components\/monolith/.test(source) ||
    /\bmnx?-/.test(source);
  const legacyStyles =
    /legacy|old-ui|(?:bg|text|border)-(?:slate|gray|zinc|red|blue|green|yellow|purple|indigo)-\d{2,3}|#[0-9a-f]{3,8}\b|rgba?\(/i.test(
      source,
    );
  const duplicate = (basenameCounts.get(path.basename(record.file).toLowerCase()) ?? 0) > 1;
  const active =
    record.importers.size > 0 ||
    routeFiles.has(path.basename(record.file)) ||
    record.file === "src/app/layout.tsx" ||
    record.file.endsWith(".css");
  const status = active
    ? duplicate
      ? "active; duplicate-name review"
      : "active"
    : record.file.includes("/generated/")
      ? "generated"
      : isComponent
        ? "uncertain"
        : "support/entrypoint review";
  return { businessLogic, routeSpecific, monolith, legacyStyles, duplicate, status };
}

const rows = [...records.values()]
  .map((record) => ({
    ...record,
    ...flags(record),
    owner: inferredModule(record),
    proposed: proposedDestination(record),
  }))
  .sort((a, b) => a.file.localeCompare(b.file));

const componentRows = rows.filter((row) => [".tsx", ".jsx"].includes(row.extension));
const migrationRows = rows.filter((row) => row.proposed !== row.file);
const deletionRows = componentRows.filter(
  (row) => row.importers.size === 0 && !routeFiles.has(path.basename(row.file)),
);
const uncertainRows = componentRows.filter(
  (row) => row.status.includes("uncertain") || row.owner === "cross-module",
);

function importList(record) {
  const importers = [...record.importers].sort();
  if (importers.length === 0) return "none found; manual retention review required";
  return importers.map(quote).join("<br>");
}

function exportedList(record) {
  return record.exports.size > 0 ? [...record.exports].sort().map(quote).join(", ") : "none";
}

const usage = `# Component usage map

Generated by \`node scripts/audit-component-architecture.mjs\`.

Scope: every TSX, JSX, TS, JS, and CSS file under \`src/components\`,
\`src/app\`, \`src/modules\`, and \`src/styles\`. Import relationships are
resolved with the TypeScript AST for static imports and string-literal dynamic
imports. Zero-import results are candidates for manual review, never deletion
proof.

## Summary

- Scanned files: ${rows.length}
- TSX/JSX component files: ${componentRows.length}
- Static/dynamic importer edges: ${rows.reduce((sum, row) => sum + row.importers.size, 0)}
- Files with string-literal dynamic importers: ${rows.filter((row) => row.dynamicImporters.size > 0).length}
- Proposed path changes: ${migrationRows.length}
- Zero-import component review candidates: ${deletionRows.length}

## Component records

| Current path | Exported symbols | Importing files | Dynamic imports | Owner | Business logic | Route-specific | Monolith system | Legacy/hardcoded styles | Proposed destination | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${componentRows
  .map(
    (row) =>
      `| ${cell(quote(row.file))} | ${cell(exportedList(row))} | ${cell(importList(row))} | ${cell([...row.dynamicImporters].sort().map(quote).join("<br>") || "none")} | ${cell(row.owner)} | ${row.businessLogic ? "yes; preserve boundary" : "no signal"} | ${row.routeSpecific ? "yes" : "no signal"} | ${row.monolith ? "yes" : "no signal"} | ${row.legacyStyles ? "review required" : "no signal"} | ${cell(quote(row.proposed))} | ${cell(row.status)} |`,
  )
  .join("\n")}

## Support-file inspection

| Path | Kind | Exported symbols | Importing files | Owner | Business logic | Route-specific | Legacy/hardcoded styles | Proposed destination | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${rows
  .filter((row) => ![".tsx", ".jsx"].includes(row.extension))
  .map(
    (row) =>
      `| ${cell(quote(row.file))} | ${cell(row.extension)} | ${cell(exportedList(row))} | ${cell(importList(row))} | ${cell(row.owner)} | ${row.businessLogic ? "yes; preserve boundary" : "no signal"} | ${row.routeSpecific ? "yes" : "no signal"} | ${row.legacyStyles ? "review required" : "no signal"} | ${cell(quote(row.proposed))} | ${cell(row.status)} |`,
  )
  .join("\n")}
`;

const migration = `# Component migration map

Generated before file moves by \`node scripts/audit-component-architecture.mjs\`.
Destinations apply the ownership model in the component-reorganization brief.
Every move still requires consumer, export, client/server, and visual-contract
review.

| Current path | Proposed destination | Owner | Importers | Reason |
| --- | --- | --- | ---: | --- |
${migrationRows
  .map((row) => {
    const reason = row.file.startsWith("src/components/monolith/")
      ? "split migration source into primitive, shared composite, or module ownership"
      : row.file.includes("/_components/")
        ? "cross-route private component ownership review"
        : row.file.startsWith("src/components/")
          ? "move business-owned component out of shared component space"
          : "thin App Router composition boundary";
    return `| ${cell(quote(row.file))} | ${cell(quote(row.proposed))} | ${cell(row.owner)} | ${row.importers.size} | ${reason} |`;
  })
  .join("\n")}
`;

const deletion = `# Component deletion candidates

Generated before moves. These are manual review candidates only. A missing AST
import is not deletion evidence: registries, string references, tests,
catalogues, archives, and framework entrypoints must also be checked.

| Path | Exports | Owner | Duplicate name | Style risk | Required next check |
| --- | --- | --- | --- | --- | --- |
${deletionRows
  .map(
    (row) =>
      `| ${cell(quote(row.file))} | ${cell(exportedList(row))} | ${cell(row.owner)} | ${row.duplicate ? "yes" : "no"} | ${row.legacyStyles ? "review" : "no signal"} | search registries, strings, tests, catalogues, docs, CSS coupling, and replacement consumers |`,
  )
  .join("\n")}
`;

const retention = `# Component retention list

The following files are retained until manual evidence resolves their ownership
or usage. Automated output does not authorize deletion.

| Path | Reason retained | Proposed destination |
| --- | --- | --- |
${uncertainRows
  .map((row) => {
    const reason =
      row.owner === "cross-module"
        ? "consumed across module boundaries; public/shared ownership requires review"
        : "no resolved importer; may be a registry, framework, demo, dynamic, or string-referenced entry";
    return `| ${cell(quote(row.file))} | ${reason} | ${cell(quote(row.proposed))} |`;
  })
  .join("\n")}
`;

writeFileSync(path.join(root, "docs/refactor/component-usage-map.md"), usage);
writeFileSync(path.join(root, "docs/refactor/component-migration-map.md"), migration);
writeFileSync(path.join(root, "docs/refactor/component-deletion-candidates.md"), deletion);
writeFileSync(path.join(root, "docs/refactor/component-retention-list.md"), retention);

console.log(
  `Scanned ${rows.length} files, mapped ${componentRows.length} component files, proposed ${migrationRows.length} path changes, and retained ${uncertainRows.length} uncertain/cross-module components for review.`,
);
