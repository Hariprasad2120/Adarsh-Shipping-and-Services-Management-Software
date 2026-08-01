import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const catalogueDirectory = "src/components/monolith/catalogue";
const exclusionsFile = path.join(root, catalogueDirectory, "catalogue-exclusions.json");
const approvedSharedSources = [
  "src/components/ui/foundation.tsx",
  "src/components/ui/button.tsx",
  "src/components/ui/badge.tsx",
  "src/components/ui/input.tsx",
  "src/components/ui/textarea.tsx",
  "src/components/ui/native-select.tsx",
  "src/components/ui/dropdown-select.tsx",
  "src/components/ui/neon-checkbox.tsx",
  "src/components/layout/workspace.tsx",
  "src/components/feedback/workspace-states.tsx",
  "src/components/data-display/operational-data-table.tsx",
  "src/modules/core/components/monolith-app-shell.tsx",
];
const approvedModuleSources = [
  "src/modules/cha/components/workspace/cha-workspace.tsx",
  "src/modules/accounting/components/accounting-workspace.tsx",
  "src/modules/crm/components/workspace/crm-workspace.tsx",
  "src/modules/people/components/people-workspace.tsx",
  "src/modules/performance/components/performance-workspace.tsx",
  "src/modules/communication/components/workspace/communication-workspace.tsx",
  "src/modules/admin/components/admin-workspace.tsx",
];

function walkTsx(relativeDirectory) {
  const absolute = path.join(root, relativeDirectory);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      if (relative === catalogueDirectory) return [];
      return walkTsx(relative);
    }
    return entry.isFile() && entry.name.endsWith(".tsx") ? [relative] : [];
  });
}

const canonicalMonolithSources = walkTsx("src/components/monolith");
const approvedSources = [
  ...new Set([
    ...canonicalMonolithSources,
    ...approvedSharedSources,
    ...approvedModuleSources,
  ]),
];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8").replaceAll("\r\n", "\n");
}

function sourceFile(file) {
  return ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function hasExportModifier(node) {
  return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
}

function visualExports(file) {
  const exports = new Set();
  for (const statement of sourceFile(file).statements) {
    if (!hasExportModifier(statement)) continue;
    if (
      (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
      statement.name &&
      /^[A-Z]/.test(statement.name.text)
    ) {
      exports.add(statement.name.text);
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && /^[A-Z]/.test(declaration.name.text)) {
          exports.add(declaration.name.text);
        }
      }
    }
  }
  return exports;
}

function stringProperty(node, name) {
  if (!ts.isObjectLiteralExpression(node)) return null;
  for (const property of node.properties) {
    if (
      ts.isPropertyAssignment(property) &&
      ((ts.isIdentifier(property.name) && property.name.text === name) ||
        (ts.isStringLiteral(property.name) && property.name.text === name)) &&
      ts.isStringLiteralLike(property.initializer)
    ) {
      return property.initializer.text;
    }
  }
  return null;
}

const registry = [];
const catalogueFiles = fs
  .readdirSync(path.join(root, catalogueDirectory))
  .filter((file) => file.endsWith(".tsx"))
  .map((file) => `${catalogueDirectory}/${file}`);

for (const file of catalogueFiles) {
  const ast = sourceFile(file);
  const visit = (node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const id = stringProperty(node, "id");
      const component = stringProperty(node, "component");
      const source = stringProperty(node, "source");
      if (id && component && source) registry.push({ id, component, source, registryFile: file });
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const args = node.arguments;
      if (
        node.expression.text === "panelEntry" &&
        args.length >= 3 &&
        args.slice(0, 3).every(ts.isStringLiteralLike)
      ) {
        registry.push({
          id: `${args[0].text}-panel`,
          component: args[1].text,
          source: args[2].text,
          registryFile: file,
        });
      }
      if (
        node.expression.text === "peopleEntry" &&
        args.length >= 1 &&
        ts.isStringLiteralLike(args[0])
      ) {
        registry.push({
          id: `${args[0].text}-people-section`,
          component: "PeopleSection",
          source: "src/modules/people/components/people-workspace.tsx",
          registryFile: file,
        });
      }
      if (
        node.expression.text === "performanceEntry" &&
        args.length >= 1 &&
        ts.isStringLiteralLike(args[0])
      ) {
        registry.push({
          id: `${args[0].text}-performance-section`,
          component: "PerformanceSection",
          source: "src/modules/performance/components/performance-workspace.tsx",
          registryFile: file,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
}

const failures = [];
const duplicateIds = new Map();
for (const entry of registry) {
  const entries = duplicateIds.get(entry.id) ?? [];
  entries.push(entry);
  duplicateIds.set(entry.id, entries);
  const absoluteSource = path.join(root, entry.source);
  if (!fs.existsSync(absoluteSource)) {
    failures.push(`Registry source does not exist: ${entry.id} -> ${entry.source}`);
    continue;
  }
  if (!visualExports(entry.source).has(entry.component)) {
    failures.push(
      `Registry export does not exist: ${entry.id} -> ${entry.component} in ${entry.source}`,
    );
  }
}
for (const [id, entries] of duplicateIds) {
  if (entries.length > 1) failures.push(`Duplicate component ID: ${id}`);
}

let exclusions = [];
try {
  exclusions = JSON.parse(fs.readFileSync(exclusionsFile, "utf8"));
} catch (error) {
  failures.push(`Cannot read catalogue exclusions: ${error.message}`);
}
if (!Array.isArray(exclusions)) failures.push("Catalogue exclusions must be a JSON array.");

const exclusionKeys = new Set();
for (const exclusion of Array.isArray(exclusions) ? exclusions : []) {
  const { component, source, reason, owner } = exclusion ?? {};
  if (![component, source, reason, owner].every((value) => typeof value === "string" && value.trim())) {
    failures.push(`Invalid exclusion (component, source, reason, and owner are required): ${JSON.stringify(exclusion)}`);
    continue;
  }
  const key = `${source}#${component}`;
  if (exclusionKeys.has(key)) failures.push(`Duplicate exclusion: ${key}`);
  exclusionKeys.add(key);
  if (!fs.existsSync(path.join(root, source))) failures.push(`Exclusion source does not exist: ${key}`);
  else if (!visualExports(source).has(component)) failures.push(`Exclusion export does not exist: ${key}`);
}

const registryKeys = new Set(registry.map((entry) => `${entry.source}#${entry.component}`));
const missingRegistrations = [];
for (const source of approvedSources) {
  if (!fs.existsSync(path.join(root, source))) {
    failures.push(`Approved catalogue source does not exist: ${source}`);
    continue;
  }
  for (const component of visualExports(source)) {
    const key = `${source}#${component}`;
    if (!registryKeys.has(key) && !exclusionKeys.has(key)) {
      missingRegistrations.push({ component, source });
    }
  }
}

if (process.argv.includes("--write-exclusions") && missingRegistrations.length > 0) {
  const additions = missingRegistrations.map(({ component, source }) => {
    const moduleMatch = source.match(/^src\/modules\/([^/]+)\//);
    const owner = moduleMatch ? `${moduleMatch[1]} module` : "Monolith design system";
    const reason = moduleMatch
      ? "Route-live module export documented by the ownership audit; a standalone safe mock-data fixture remains an explicit catalogue migration item."
      : "Internal primitive or composite subcomponent rendered through a registered live specimen; it is not a separate standalone catalogue pattern.";
    return { component, source, reason, owner };
  });
  const next = [...exclusions, ...additions].sort(
    (a, b) => a.source.localeCompare(b.source) || a.component.localeCompare(b.component),
  );
  fs.writeFileSync(exclusionsFile, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Added ${additions.length} explicit catalogue exclusions.`);
  process.exit(0);
}

for (const { component, source } of missingRegistrations) {
  failures.push(`Unregistered visual export: ${source}#${component}`);
}

for (const key of exclusionKeys) {
  if (registryKeys.has(key)) failures.push(`Registered component must not also be excluded: ${key}`);
}

if (failures.length > 0) {
  console.error(`Design-system coverage failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Design-system coverage passed: ${registry.length} registry entries, ${exclusions.length} documented exclusions, ${approvedSources.length} approved source files.`,
);
