import fs from "node:fs";
import path from "node:path";

// Classifies every route.ts under src/app/api as auth-guarded, known-public,
// or missing an auth token. Used by scripts + the route-auth-coverage test.
// Prints JSON: { total, guarded, public, missing: string[] }.

const ROOT = "src/app/api";

export const AUTH_TOKEN =
  /requireApiActor|requireApiPermission|getSessionOrUnauth|requirePermission|withApiAuth|\bauth\(\)|getSession\b|getDashboardContext|getMobileUser|getMobileCrmUser|getPortalSession|getPortalSessionToken|requireCronSecret|requireProductionSecret|verifyWebhookToken|assertPortalSession|resolveActor|getServerAuthSession/;

// Routes that are intentionally unauthenticated (public / pre-auth by design).
// Every entry has been individually reviewed. Adding a route here requires a
// justification comment.
export const KNOWN_PUBLIC = new Set([
  "src/app/api/auth/[...nextauth]/route.ts", // NextAuth handler
  "src/app/api/health/route.ts", // static health probe
  "src/app/api/erp/ping/route.ts", // static ping
  "src/app/api/setup/route.ts", // first-run setup, guarded by SETUP_SECRET + admin-exists block
  // Pre-auth credential flows (no session yet by definition):
  "src/app/api/customer-portal/auth/activate/route.ts",
  "src/app/api/customer-portal/auth/forgot-password/route.ts",
  "src/app/api/customer-portal/auth/login/route.ts",
  "src/app/api/customer-portal/auth/logout/route.ts",
  "src/app/api/mobile/auth/login/route.ts",
  "src/app/api/mobile/crm/auth/login/route.ts",
  "src/app/api/hrms/invitations/accept/route.ts", // token-bearing invite acceptance
  "src/app/api/hrms/letters/verify/route.ts", // public HR-letter QR verification
  // Static / self-gated:
  "src/app/api/mobile/crm/update/route.ts", // static app-version + changelog
  "src/app/api/google-chat/route.ts", // re-exports the token-verified webhook handler
  "src/app/api/google-chat/debug/route.ts", // isDebugRouteEnabled() + rate-limited, off in prod
  "src/app/api/dev/clear-auth-cookies/route.ts", // proxy blocks it outside development
]);

export function scanRouteAuthCoverage(root = ROOT) {
  const files = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name === "route.ts") files.push(p.split(path.sep).join("/"));
    }
  })(root);

  const missing = [];
  let guarded = 0;
  for (const f of files) {
    if (KNOWN_PUBLIC.has(f)) continue;
    const text = fs.readFileSync(f, "utf8");
    if (AUTH_TOKEN.test(text)) guarded++;
    else missing.push(f);
  }
  return {
    total: files.length,
    guarded,
    public: KNOWN_PUBLIC.size,
    missing: missing.sort(),
  };
}

const invokedDirectly =
  process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scan-route-auth-coverage.mjs");
if (invokedDirectly) {
  console.log(JSON.stringify(scanRouteAuthCoverage(), null, 2));
}
