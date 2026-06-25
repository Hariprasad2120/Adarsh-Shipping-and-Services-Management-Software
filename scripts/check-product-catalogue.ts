/**
 * Product Catalogue Check Script
 *
 * Validates that the product catalogue is up-to-date.
 * Warns if new routes, APIs, or models exist but catalogue wasn't updated.
 *
 * Usage: npm run catalogue:check
 */
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const DOCS = path.join(ROOT, "docs");
const CATALOGUE_JSON = path.join(DOCS, "product-catalogue.json");
const REGISTRY_JSON = path.join(DOCS, "product-feature-registry.json");
const PRISMA_SCHEMA = path.join(ROOT, "prisma", "schema.prisma");

let warnings = 0;
let errors = 0;

function warn(msg: string) {
  console.warn(`⚠ WARNING: ${msg}`);
  warnings++;
}

function error(msg: string) {
  console.error(`❌ ERROR: ${msg}`);
  errors++;
}

function ok(msg: string) {
  console.log(`✅ ${msg}`);
}

// ─── 1. Check generated catalogue exists ─────────────────────────────────

function checkGeneratedCatalogue() {
  if (!fs.existsSync(CATALOGUE_JSON)) {
    error("docs/product-catalogue.json does not exist. Run: npm run catalogue:update");
    return null;
  }
  try {
    const data = JSON.parse(fs.readFileSync(CATALOGUE_JSON, "utf-8"));
    ok("docs/product-catalogue.json is valid JSON");
    return data;
  } catch {
    error("docs/product-catalogue.json is not valid JSON");
    return null;
  }
}

// ─── 2. Check manual registry exists and is valid ────────────────────────

function checkManualRegistry() {
  if (!fs.existsSync(REGISTRY_JSON)) {
    error("docs/product-feature-registry.json does not exist");
    return null;
  }
  try {
    const data = JSON.parse(fs.readFileSync(REGISTRY_JSON, "utf-8"));
    ok("docs/product-feature-registry.json is valid JSON");

    // Check required fields
    if (!data.product?.name) warn("Registry missing product.name");
    if (!data.modules?.length) warn("Registry has no modules");
    if (!data.features?.length) warn("Registry has no features");
    return data;
  } catch {
    error("docs/product-feature-registry.json is not valid JSON");
    return null;
  }
}

// ─── 3. Check for new routes not in catalogue ────────────────────────────

function walkFiles(dir: string, filter: RegExp): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkFiles(full, filter));
    else if (filter.test(entry.name)) results.push(full);
  }
  return results;
}

function checkForNewRoutes(catalogue: any) {
  if (!catalogue) return;

  // Check API routes
  const apiDir = path.join(ROOT, "src", "app", "api");
  const currentApiFiles = walkFiles(apiDir, /^route\.ts$/);
  const cataloguedApis = new Set(catalogue.apiRoutes?.map((r: any) => r.filePath) || []);

  for (const file of currentApiFiles) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    if (!cataloguedApis.has(rel)) {
      warn(`New API route not in catalogue: ${rel}`);
    }
  }

  // Check page routes
  const dashboardDir = path.join(ROOT, "src", "app", "(dashboard)");
  const currentPages = walkFiles(dashboardDir, /^page\.tsx$/);
  const cataloguedPages = new Set(catalogue.appRoutes?.map((r: any) => r.filePath) || []);

  for (const file of currentPages) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    if (!cataloguedPages.has(rel)) {
      warn(`New page route not in catalogue: ${rel}`);
    }
  }

  // Check Prisma models
  if (fs.existsSync(PRISMA_SCHEMA)) {
    const schema = fs.readFileSync(PRISMA_SCHEMA, "utf-8");
    const modelNames = [...schema.matchAll(/model\s+(\w+)\s*\{/g)].map(m => m[1]);
    const cataloguedModels = new Set(catalogue.prismaModels?.map((m: any) => m.name) || []);

    for (const name of modelNames) {
      if (!cataloguedModels.has(name)) {
        warn(`New Prisma model not in catalogue: ${name}`);
      }
    }
  }
}

// ─── 4. Check catalogue freshness ────────────────────────────────────────

function checkFreshness(catalogue: any) {
  if (!catalogue?.generatedAt) {
    warn("Catalogue has no generatedAt timestamp");
    return;
  }

  const generated = new Date(catalogue.generatedAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - generated.getTime()) / (1000 * 60 * 60);

  if (hoursDiff > 168) { // 7 days
    warn(`Catalogue is ${Math.round(hoursDiff / 24)} days old. Consider running: npm run catalogue:update`);
  } else {
    ok(`Catalogue generated ${Math.round(hoursDiff)} hours ago`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  console.log("🔍 Monolith Engine — Product Catalogue Check\n");

  const catalogue = checkGeneratedCatalogue();
  checkManualRegistry();
  checkForNewRoutes(catalogue);
  checkFreshness(catalogue);

  console.log(`\n─────────────────────────────────`);
  console.log(`Results: ${errors} errors, ${warnings} warnings`);

  if (errors > 0) {
    console.error("\n❌ Catalogue check FAILED. Fix errors above.");
    process.exit(1);
  } else if (warnings > 0) {
    console.warn("\n⚠ Catalogue check passed with warnings. Consider running: npm run catalogue:update");
    process.exit(0);
  } else {
    console.log("\n✅ Catalogue check passed!");
    process.exit(0);
  }
}

main();
