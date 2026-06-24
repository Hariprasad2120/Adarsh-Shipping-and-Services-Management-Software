/**
 * Product Catalogue Auto-Update Script
 *
 * Scans the Monolith Engine codebase and generates:
 *   - docs/product-catalogue.json (machine-readable)
 *   - docs/product-catalogue.generated.md (human-readable)
 *
 * Merges auto-detected data with manual registry (docs/product-feature-registry.json).
 *
 * Usage: npm run catalogue:update
 */
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const PRISMA_SCHEMA = path.join(ROOT, "prisma", "schema.prisma");
const DOCS = path.join(ROOT, "docs");
const REGISTRY_PATH = path.join(DOCS, "product-feature-registry.json");
const OUTPUT_JSON = path.join(DOCS, "product-catalogue.json");
const OUTPUT_MD = path.join(DOCS, "product-catalogue.generated.md");

// ─── Helpers ────────────────────────────────────────────────────────────────

function walk(dir: string, filter?: RegExp): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full, filter));
    } else if (!filter || filter.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function relativeTo(base: string, p: string): string {
  return path.relative(base, p).replace(/\\/g, "/");
}

// ─── 1. Scan App Routes ─────────────────────────────────────────────────────

interface AppRoute {
  route: string;
  filePath: string;
  module: string;
  type: "page" | "layout" | "loading" | "error";
}

function scanAppRoutes(): AppRoute[] {
  const dashboardDir = path.join(SRC, "app", "(dashboard)");
  const authDir = path.join(SRC, "app", "(auth)");
  const routes: AppRoute[] = [];

  for (const dir of [dashboardDir, authDir]) {
    const files = walk(dir, /^(page|layout|loading|error)\.tsx$/);
    for (const file of files) {
      const rel = relativeTo(dir, file);
      const parts = rel.split("/");
      const fileName = parts.pop()!;
      const type = fileName.replace(".tsx", "") as AppRoute["type"];
      const routePath = "/" + parts.join("/");
      const module = parts[0] || "core";
      routes.push({ route: routePath, filePath: relativeTo(ROOT, file), module, type });
    }
  }
  return routes;
}

// ─── 2. Scan API Routes ─────────────────────────────────────────────────────

interface ApiRoute {
  path: string;
  filePath: string;
  module: string;
  methods: string[];
}

function scanApiRoutes(): ApiRoute[] {
  const apiDir = path.join(SRC, "app", "api");
  const files = walk(apiDir, /^route\.ts$/);
  const routes: ApiRoute[] = [];

  for (const file of files) {
    const rel = relativeTo(apiDir, file);
    const parts = rel.split("/");
    parts.pop(); // remove route.ts
    const apiPath = "/api/" + parts.join("/");
    const module = parts[0] || "core";

    // Read the file to detect HTTP methods
    const content = fs.readFileSync(file, "utf-8");
    const methods: string[] = [];
    for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
      if (content.includes(`export async function ${method}`) || content.includes(`export function ${method}`)) {
        methods.push(method);
      }
    }

    routes.push({ path: apiPath, filePath: relativeTo(ROOT, file), module, methods });
  }
  return routes;
}

// ─── 3. Scan Prisma Models ──────────────────────────────────────────────────

interface PrismaModel {
  name: string;
  fields: string[];
  relations: string[];
  module: string;
}

function scanPrismaModels(): PrismaModel[] {
  if (!fs.existsSync(PRISMA_SCHEMA)) return [];
  const content = fs.readFileSync(PRISMA_SCHEMA, "utf-8");
  const models: PrismaModel[] = [];

  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
  let match;
  while ((match = modelRegex.exec(content)) !== null) {
    const name = match[1];
    const body = match[2];
    const fields: string[] = [];
    const relations: string[] = [];

    for (const line of body.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("@@") || trimmed.startsWith("@")) continue;
      const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(\[\])?\s*/);
      if (fieldMatch) {
        fields.push(fieldMatch[1]);
        // Check if it's a relation (type starts with uppercase and isn't a scalar)
        const fieldType = fieldMatch[2];
        const scalars = ["String", "Int", "Float", "Boolean", "DateTime", "Json", "BigInt", "Decimal", "Bytes"];
        if (fieldType && /^[A-Z]/.test(fieldType) && !scalars.includes(fieldType)) {
          relations.push(fieldType);
        }
      }
    }

    // Infer module from model name prefix
    let module = "core";
    if (name.startsWith("Crm")) module = "crm";
    else if (name.startsWith("Cha")) module = "cha";
    else if (name.startsWith("Recruit")) module = "recruit";
    else if (name.startsWith("GoogleChat")) module = "google-chat";
    else if (name.startsWith("GoogleWorkspace")) module = "communication";
    else if (name.includes("Attendance") || name.includes("Punch") || name.includes("Shift")) module = "attendance";
    else if (name.includes("Leave") || name.includes("Holiday")) module = "hrms";
    else if (name.includes("Appraisal") || name.includes("Hike") || name.includes("SelfAssessment") || name.includes("ReviewerRating") || name.includes("ManagementReview")) module = "ams";
    else if (name.includes("Employee") || name.includes("Employment") || name.includes("Salary") || name.includes("HRLetter") || name.includes("HRCase")) module = "hrms";
    else if (name.includes("Asset") || name.includes("Depreciation")) module = "ams";
    else if (name.includes("Account") || name.includes("Journal") || name.includes("Ledger") || name.includes("Invoice") || name.includes("Payment") || name.includes("Fiscal") || name.includes("Tax")) module = "accounting";
    else if (name.includes("Todo") || name.includes("Subtask")) module = "todo";
    else if (name.includes("Notification")) module = "notifications";
    else if (name.includes("User") || name.includes("Role") || name.includes("Permission") || name.includes("Organisation") || name.includes("Branch") || name.includes("Department") || name.includes("Division")) module = "core";
    else if (name.includes("Course") || name.includes("Survey")) module = "lms";
    else if (name.includes("File") || name.includes("Document")) module = "core";
    else if (name.includes("Tracking") || name.includes("Location") || name.includes("Fuel") || name.includes("Agreement") || name.includes("Face") || name.includes("Mobile")) module = "hrms";
    else if (name.includes("Travel") || name.includes("Timesheet") || name.includes("WorkReport") || name.includes("Announcement") || name.includes("OT") || name.includes("Ot") || name.includes("Goal") || name.includes("Skill") || name.includes("Feedback")) module = "hrms";

    models.push({ name, fields, relations: [...new Set(relations)], module });
  }
  return models;
}

// ─── 4. Scan Module Service Files ───────────────────────────────────────────

interface ModuleServiceFile {
  module: string;
  fileName: string;
  filePath: string;
  exportedFunctions: string[];
}

function scanModuleServices(): ModuleServiceFile[] {
  const modulesDir = path.join(SRC, "modules");
  if (!fs.existsSync(modulesDir)) return [];

  const results: ModuleServiceFile[] = [];
  const files = walk(modulesDir, /\.ts$/);

  for (const file of files) {
    const rel = relativeTo(modulesDir, file);
    const parts = rel.split("/");
    const module = parts[0];
    const content = fs.readFileSync(file, "utf-8");

    // Extract exported function names
    const exports: string[] = [];
    const funcRegex = /export\s+(?:async\s+)?function\s+(\w+)/g;
    let m;
    while ((m = funcRegex.exec(content)) !== null) {
      exports.push(m[1]);
    }

    results.push({
      module,
      fileName: path.basename(file),
      filePath: relativeTo(ROOT, file),
      exportedFunctions: exports,
    });
  }
  return results;
}

// ─── 5. Scan Components ─────────────────────────────────────────────────────

interface ComponentInfo {
  module: string;
  fileName: string;
  filePath: string;
}

function scanComponents(): ComponentInfo[] {
  const componentsDir = path.join(SRC, "components");
  if (!fs.existsSync(componentsDir)) return [];

  const results: ComponentInfo[] = [];
  const files = walk(componentsDir, /\.tsx$/);

  for (const file of files) {
    const rel = relativeTo(componentsDir, file);
    const parts = rel.split("/");
    const module = parts.length > 1 ? parts[0] : "shared";
    results.push({
      module,
      fileName: path.basename(file),
      filePath: relativeTo(ROOT, file),
    });
  }
  return results;
}

// ─── 6. Load Manual Registry ────────────────────────────────────────────────

function loadManualRegistry(): any {
  if (!fs.existsSync(REGISTRY_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf-8"));
  } catch {
    console.warn("⚠ Warning: Could not parse product-feature-registry.json");
    return null;
  }
}

// ─── 7. Build Catalogue ─────────────────────────────────────────────────────

interface ProductCatalogue {
  generatedAt: string;
  product: {
    name: string;
    company: string;
    version: string;
  };
  stats: {
    totalAppRoutes: number;
    totalApiRoutes: number;
    totalPrismaModels: number;
    totalModuleServices: number;
    totalComponents: number;
  };
  appRoutes: AppRoute[];
  apiRoutes: ApiRoute[];
  prismaModels: PrismaModel[];
  moduleServices: ModuleServiceFile[];
  components: ComponentInfo[];
  modulesSummary: Record<string, {
    appRoutes: number;
    apiRoutes: number;
    prismaModels: number;
    serviceFiles: number;
    components: number;
  }>;
  manualRegistry: any;
}

function buildCatalogue(): ProductCatalogue {
  console.log("📂 Scanning codebase...");

  const appRoutes = scanAppRoutes();
  console.log(`  ✓ Found ${appRoutes.length} app routes`);

  const apiRoutes = scanApiRoutes();
  console.log(`  ✓ Found ${apiRoutes.length} API routes`);

  const prismaModels = scanPrismaModels();
  console.log(`  ✓ Found ${prismaModels.length} Prisma models`);

  const moduleServices = scanModuleServices();
  console.log(`  ✓ Found ${moduleServices.length} module service files`);

  const components = scanComponents();
  console.log(`  ✓ Found ${components.length} components`);

  const manualRegistry = loadManualRegistry();
  if (manualRegistry) {
    console.log(`  ✓ Loaded manual feature registry`);
  }

  // Build per-module summary
  const allModules = new Set<string>();
  appRoutes.forEach(r => allModules.add(r.module));
  apiRoutes.forEach(r => allModules.add(r.module));
  prismaModels.forEach(r => allModules.add(r.module));
  moduleServices.forEach(r => allModules.add(r.module));
  components.forEach(r => allModules.add(r.module));

  const modulesSummary: Record<string, any> = {};
  for (const mod of [...allModules].sort()) {
    modulesSummary[mod] = {
      appRoutes: appRoutes.filter(r => r.module === mod).length,
      apiRoutes: apiRoutes.filter(r => r.module === mod).length,
      prismaModels: prismaModels.filter(r => r.module === mod).length,
      serviceFiles: moduleServices.filter(r => r.module === mod).length,
      components: components.filter(r => r.module === mod).length,
    };
  }

  // Read package.json for version
  const pkgPath = path.join(ROOT, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

  return {
    generatedAt: new Date().toISOString(),
    product: {
      name: "Monolith Engine",
      company: "Adarsh Shipping & Services",
      version: pkg.version || "0.1.0",
    },
    stats: {
      totalAppRoutes: appRoutes.length,
      totalApiRoutes: apiRoutes.length,
      totalPrismaModels: prismaModels.length,
      totalModuleServices: moduleServices.length,
      totalComponents: components.length,
    },
    appRoutes,
    apiRoutes,
    prismaModels,
    moduleServices,
    components,
    modulesSummary,
    manualRegistry,
  };
}

// ─── 8. Generate Markdown ───────────────────────────────────────────────────

function generateMarkdown(catalogue: ProductCatalogue): string {
  const lines: string[] = [];

  lines.push("# Monolith Engine — Product Catalogue (Auto-Generated)");
  lines.push("");
  lines.push(`> Generated at: ${catalogue.generatedAt}`);
  lines.push(`> Version: ${catalogue.product.version}`);
  lines.push("");

  // Stats
  lines.push("## Codebase Statistics");
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("|---|---|");
  lines.push(`| App Routes (Pages) | ${catalogue.stats.totalAppRoutes} |`);
  lines.push(`| API Routes | ${catalogue.stats.totalApiRoutes} |`);
  lines.push(`| Prisma Models | ${catalogue.stats.totalPrismaModels} |`);
  lines.push(`| Module Service Files | ${catalogue.stats.totalModuleServices} |`);
  lines.push(`| UI Components | ${catalogue.stats.totalComponents} |`);
  lines.push("");

  // Module Summary
  lines.push("## Modules Overview");
  lines.push("");
  lines.push("| Module | Pages | APIs | Models | Services | Components |");
  lines.push("|---|---|---|---|---|---|");
  for (const [mod, stats] of Object.entries(catalogue.modulesSummary)) {
    const s = stats as any;
    lines.push(`| ${mod} | ${s.appRoutes} | ${s.apiRoutes} | ${s.prismaModels} | ${s.serviceFiles} | ${s.components} |`);
  }
  lines.push("");

  // API Routes
  lines.push("## API Routes");
  lines.push("");
  lines.push("| Method(s) | Path | Module |");
  lines.push("|---|---|---|");
  for (const route of catalogue.apiRoutes) {
    lines.push(`| ${route.methods.join(", ")} | \`${route.path}\` | ${route.module} |`);
  }
  lines.push("");

  // App Routes (Pages)
  lines.push("## App Routes (Pages)");
  lines.push("");
  lines.push("| Route | Module | Type |");
  lines.push("|---|---|---|");
  for (const route of catalogue.appRoutes.filter(r => r.type === "page")) {
    lines.push(`| \`${route.route}\` | ${route.module} | ${route.type} |`);
  }
  lines.push("");

  // Prisma Models
  lines.push("## Database Models");
  lines.push("");
  lines.push("| Model | Module | Fields | Relations |");
  lines.push("|---|---|---|---|");
  for (const model of catalogue.prismaModels) {
    lines.push(`| ${model.name} | ${model.module} | ${model.fields.length} | ${model.relations.join(", ") || "—"} |`);
  }
  lines.push("");

  // Module Services
  lines.push("## Module Service Files");
  lines.push("");
  for (const [mod] of Object.entries(catalogue.modulesSummary)) {
    const services = catalogue.moduleServices.filter(s => s.module === mod);
    if (services.length === 0) continue;
    lines.push(`### ${mod}`);
    for (const svc of services) {
      lines.push(`- **${svc.fileName}**: ${svc.exportedFunctions.join(", ") || "no exports detected"}`);
    }
    lines.push("");
  }

  // Manual registry features
  if (catalogue.manualRegistry?.features?.length) {
    lines.push("## Feature Status");
    lines.push("");
    lines.push("| Feature | Module | Status |");
    lines.push("|---|---|---|");
    for (const feat of catalogue.manualRegistry.features) {
      const badge = feat.status === "Implemented" ? "✅" : feat.status === "Partial" ? "🟡" : feat.status === "Planned" ? "📋" : "❓";
      lines.push(`| ${feat.name} | ${feat.module} | ${badge} ${feat.status} |`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("*This file is auto-generated by `npm run catalogue:update`. Do not edit manually.*");

  return lines.join("\n");
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  console.log("🔄 Monolith Engine — Product Catalogue Update\n");

  // Ensure docs directory exists
  if (!fs.existsSync(DOCS)) {
    fs.mkdirSync(DOCS, { recursive: true });
  }

  const catalogue = buildCatalogue();

  // Write JSON
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(catalogue, null, 2), "utf-8");
  console.log(`\n📄 Written: ${relativeTo(ROOT, OUTPUT_JSON)}`);

  // Write Markdown
  const md = generateMarkdown(catalogue);
  fs.writeFileSync(OUTPUT_MD, md, "utf-8");
  console.log(`📄 Written: ${relativeTo(ROOT, OUTPUT_MD)}`);

  console.log("\n✅ Product catalogue updated successfully!");
}

main();
