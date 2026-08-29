import fs from "node:fs";
import path from "node:path";

// Heuristic tenant-isolation scan. Flags API route / server-action files that
// call db.<model>.findUnique(...) (which can only key on a unique field, so it
// cannot itself filter by orgId) without any organisation-scoping signal in the
// same file. Not proof of a bug, but every flagged file must be reviewed and
// either fixed or added to REVIEWED_OK with a reason.

const API_ROOT = "src/app/api";
const MODULES_ROOT = "src/modules";

const FINDUNIQUE = /\.findUnique\s*\(/;
const ORG_SIGNAL =
  /orgId|tenantWhere|assertSameOrg|assertOrgMatchesSession|organisationId|legalEntityId|\.org\.|by(?:Org|Tenant)|scopedTo/;
// findUnique on these models is inherently safe (global / non-tenant data).
const SAFE_MODEL =
  /\.(permission|role|feature|setting|appEdition|systemConfig|migration|healthCheck)\.findUnique/i;

// Files reviewed and confirmed safe despite matching the heuristic.
export const REVIEWED_OK = new Set([
  // Chat display lookups only (partner name / Google connection). Access is
  // already gated by Google Chat space membership resolved per session user;
  // no tenant-owned business record is returned by the findUnique calls.
  "src/app/api/communication/chat/space/members/route.ts",
  "src/app/api/communication/chat/sse/route.ts",
]);

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, acc);
    else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts"))
      acc.push(p.split(path.sep).join("/"));
  }
  return acc;
}

export function scanTenantScopeCoverage() {
  const routeFiles = walk(API_ROOT);
  const actionFiles = walk(MODULES_ROOT).filter((f) => {
    try {
      return /["']use server["']/.test(fs.readFileSync(f, "utf8").slice(0, 200));
    } catch {
      return false;
    }
  });
  const files = [...new Set([...routeFiles, ...actionFiles])];

  const flagged = [];
  let scanned = 0;
  for (const f of files) {
    const text = fs.readFileSync(f, "utf8");
    if (!FINDUNIQUE.test(text)) continue;
    scanned++;
    if (REVIEWED_OK.has(f)) continue;
    // Strip lines whose findUnique is on a known-safe global model.
    const risky = text
      .split("\n")
      .some(
        (line) => FINDUNIQUE.test(line) && !SAFE_MODEL.test(line),
      );
    if (!risky) continue;
    if (!ORG_SIGNAL.test(text)) flagged.push(f);
  }
  return { scanned, flagged: flagged.sort() };
}

const invokedDirectly =
  process.argv[1] &&
  process.argv[1].replace(/\\/g, "/").endsWith("scan-tenant-scope-coverage.mjs");
if (invokedDirectly) {
  console.log(JSON.stringify(scanTenantScopeCoverage(), null, 2));
}
