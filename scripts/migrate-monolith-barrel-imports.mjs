import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const legacySpecifier = "@/components/ui/index";
const providers = [
  "src/components/ui/alert.tsx",
  "src/components/ui/badge.tsx",
  "src/components/ui/button.tsx",
  "src/components/ui/card.tsx",
  "src/components/ui/date-input.tsx",
  "src/components/ui/dropdown-menu.tsx",
  "src/components/ui/dropdown-select.tsx",
  "src/components/ui/folder-icon.tsx",
  "src/components/ui/foundation.tsx",
  "src/components/ui/input.tsx",
  "src/components/ui/label.tsx",
  "src/components/ui/modal.tsx",
  "src/components/ui/native-select.tsx",
  "src/components/ui/neon-checkbox.tsx",
  "src/components/ui/textarea.tsx",
  "src/components/forms/file-upload/file-upload-field.tsx",
  "src/components/forms/filter-menu.tsx",
  "src/components/feedback/warning-indicator-popover.tsx",
  "src/components/feedback/workspace-states.tsx",
  "src/components/layout/workspace.tsx",
  "src/components/layout/workspace-dialog.tsx",
  "src/modules/accounting/components/accounting-workspace.tsx",
  "src/modules/accounting/components/accounting-items.tsx",
  "src/modules/accounting/components/accounting-delete-action.tsx",
  "src/modules/admin/components/admin-workspace.tsx",
  "src/modules/auth/components/public-workspace.tsx",
  "src/modules/cha/components/workspace/cha-workspace.tsx",
  "src/modules/communication/components/workspace/communication-workspace.tsx",
  "src/modules/core/components/monolith-app-shell.tsx",
  "src/modules/crm/components/workspace/crm-workspace.tsx",
  "src/modules/people/components/people-controls.tsx",
  "src/modules/people/components/people-data-table.tsx",
  "src/modules/people/components/people-workspace.tsx",
  "src/modules/performance/components/performance-workspace.tsx",
];

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

const configPath = ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.json");
if (!configPath) throw new Error("tsconfig.json not found");
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const program = ts.createProgram({
  rootNames: providers.map((provider) => path.join(root, provider)),
  options: parsed.options,
});
const checker = program.getTypeChecker();
const exportsToProvider = new Map();

for (const provider of providers) {
  const sourceFile = program.getSourceFile(path.join(root, provider));
  if (!sourceFile) throw new Error(`Provider not found: ${provider}`);
  const symbol = checker.getSymbolAtLocation(sourceFile);
  if (!symbol) throw new Error(`Provider has no module symbol: ${provider}`);
  const specifier = `@/${provider.slice("src/".length).replace(/\.(?:ts|tsx)$/, "")}`;
  for (const exported of checker.getExportsOfModule(symbol)) {
    if (!exportsToProvider.has(exported.name)) {
      exportsToProvider.set(exported.name, specifier);
    }
  }
}

let changedFiles = 0;
for (const absolute of walk(path.join(root, "src")).filter((file) =>
  /\.(?:ts|tsx)$/.test(file),
)) {
  const source = readFileSync(absolute, "utf8");
  if (!source.includes(legacySpecifier)) continue;
  const sourceFile = ts.createSourceFile(
    absolute,
    source,
    ts.ScriptTarget.Latest,
    true,
    absolute.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const replacements = [];

  for (const node of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(node) ||
      !ts.isStringLiteral(node.moduleSpecifier) ||
      node.moduleSpecifier.text !== legacySpecifier
    ) {
      continue;
    }
    const clause = node.importClause;
    if (!clause?.namedBindings || !ts.isNamedImports(clause.namedBindings)) {
      throw new Error(`Unsupported barrel import in ${absolute}`);
    }
    const groups = new Map();
    for (const specifier of clause.namedBindings.elements) {
      const importedName = specifier.propertyName?.text ?? specifier.name.text;
      const provider = exportsToProvider.get(importedName);
      if (!provider) {
        throw new Error(`No canonical provider for ${importedName} in ${absolute}`);
      }
      const entries = groups.get(provider) ?? [];
      const typePrefix = specifier.isTypeOnly && !clause.isTypeOnly ? "type " : "";
      const alias = specifier.propertyName
        ? `${specifier.propertyName.text} as ${specifier.name.text}`
        : specifier.name.text;
      entries.push(`${typePrefix}${alias}`);
      groups.set(provider, entries);
    }
    const importPrefix = clause.isTypeOnly ? "import type" : "import";
    const replacement = [...groups]
      .map(
        ([provider, names]) =>
          `${importPrefix} { ${names.join(", ")} } from ${JSON.stringify(provider)};`,
      )
      .join("\n");
    replacements.push({
      start: node.getStart(sourceFile),
      end: node.getEnd(),
      replacement,
    });
  }

  let next = source;
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    next =
      next.slice(0, replacement.start) +
      replacement.replacement +
      next.slice(replacement.end);
  }
  writeFileSync(absolute, next);
  changedFiles += 1;
}

console.log(
  `Migrated ${changedFiles} legacy barrel consumers to canonical primitive, shared, and module paths.`,
);
