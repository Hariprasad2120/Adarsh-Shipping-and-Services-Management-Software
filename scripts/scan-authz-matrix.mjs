import fs from "node:fs";
import path from "node:path";
import { KNOWN_PUBLIC } from "./scan-route-auth-coverage.mjs";

// Full authorization / tenant-isolation matrix for every API route handler,
// server action file, and dynamic dashboard page. Static heuristics — output is
// a review aid, not proof. Emits JSON (default) or a Markdown table (--md).

const API_ROOT = "src/app/api";
const APP_ROOT = "src/app";
const MODULES_ROOT = "src/modules";
const LIB_ROOT = "src/lib";

const RX = {
  method: /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b|export\s+const\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*=/g,
  authGate:
    /requireApiActor|requireApiPermission|getSessionOrUnauth|withApiAuth|\bauth\(\)|getSession\b|getDashboardContext|getMobileUser|getMobileCrmUser|getPortalSession|getPortalSessionToken|requireCronSecret|requireProductionSecret|verifyWebhookToken|assertPortalSession/,
  permCheck: /requirePermission|requireApiPermission|\bcan\(|canAll\(|hasPermission|assertPermission|requireRole/,
  tenantScope:
    /\borgId\b|tenantWhere|assertSameOrg|assertOrgMatchesSession|session\.user\.orgId|portalUser\.customerId|\.customerId\b|actor\.orgId/,
  inputSchema: /z\.object\(|\.safeParse\(|schema\.parse\(|zodResolver|\bparse\(await\b/,
  writesDb: /db\.\w+\.(create|update|updateMany|upsert|delete|deleteMany|createMany)\(/,
  byId: /\[(\.\.\.)?[a-zA-Z_]+\]/,
  readsParams: /\bparams\b/,
  serverAction: /["']use server["']/,
};

function walk(dir, filter, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name).split(path.sep).join("/");
    if (e.isDirectory()) walk(p, filter, acc);
    else if (filter(p)) acc.push(p);
  }
  return acc;
}

function classifyFile(file, kind) {
  const text = fs.readFileSync(file, "utf8");
  const methods = new Set();
  let m;
  RX.method.lastIndex = 0;
  while ((m = RX.method.exec(text))) methods.add(m[1] || m[2]);

  const isMutating =
    kind === "action" ||
    [...methods].some((x) => ["POST", "PUT", "PATCH", "DELETE"].includes(x));
  const hasAuth = RX.authGate.test(text);
  const hasPerm = RX.permCheck.test(text);
  const hasTenant = RX.tenantScope.test(text);
  const hasSchema = RX.inputSchema.test(text);
  const writesDb = RX.writesDb.test(text);
  const byId = RX.byId.test(file) || (kind !== "action" && RX.readsParams.test(text));

  const flags = [];
  if (isMutating && !hasAuth && kind !== "public")
    flags.push("NO_AUTH_GATE");
  if (byId && !hasTenant && kind !== "public")
    flags.push("BYID_NO_TENANT_SCOPE");
  if (isMutating && writesDb && !hasSchema)
    flags.push("WRITE_NO_INPUT_SCHEMA");
  if (isMutating && !hasPerm && !/\/(auth|setup|health|cron|webhook)\//.test(file))
    flags.push("MUTATION_NO_PERMISSION_CHECK");

  return {
    file,
    kind,
    methods: [...methods].sort(),
    mutating: isMutating,
    auth: hasAuth,
    permission: hasPerm,
    tenant: hasTenant,
    inputSchema: hasSchema,
    writesDb,
    byId,
    flags,
  };
}

// Known-public route allow-list (shared with scan-route-auth-coverage.mjs).
const PUBLIC = KNOWN_PUBLIC;

const routeFiles = walk(API_ROOT, (p) => p.endsWith("/route.ts"));
const actionFiles = [
  ...walk(MODULES_ROOT, (p) => p.endsWith(".ts") && !p.endsWith(".test.ts")),
  ...walk(APP_ROOT, (p) => p.endsWith(".ts") && !p.endsWith(".test.ts") && !p.endsWith("/route.ts")),
  ...walk(LIB_ROOT, (p) => p.endsWith(".ts") && !p.endsWith(".test.ts")),
].filter((p) => {
  try {
    return RX.serverAction.test(fs.readFileSync(p, "utf8").slice(0, 400));
  } catch {
    return false;
  }
});
const pageFiles = walk(
  APP_ROOT,
  (p) => /\/page\.tsx$/.test(p) && RX.byId.test(p),
);

const rows = [
  ...routeFiles.map((f) => classifyFile(f, PUBLIC.has(f) ? "public" : "route")),
  ...actionFiles.map((f) => classifyFile(f, "action")),
  ...pageFiles.map((f) => classifyFile(f, "page")),
];

const flagged = rows.filter((r) => r.flags.length > 0 && r.kind !== "public");
const summary = {
  routes: routeFiles.length,
  actions: actionFiles.length,
  dynamicPages: pageFiles.length,
  flagged: flagged.length,
  byFlag: {},
};
for (const r of flagged)
  for (const f of r.flags) summary.byFlag[f] = (summary.byFlag[f] ?? 0) + 1;

if (process.argv.includes("--md")) {
  console.log("| file | kind | methods | auth | perm | tenant | schema | flags |");
  console.log("|---|---|---|---|---|---|---|---|");
  for (const r of rows.sort((a, b) => (b.flags.length - a.flags.length) || a.file.localeCompare(b.file))) {
    const y = (v) => (v ? "✓" : "·");
    console.log(
      `| ${r.file} | ${r.kind} | ${r.methods.join(",") || "—"} | ${y(r.auth)} | ${y(r.permission)} | ${y(r.tenant)} | ${y(r.inputSchema)} | ${r.flags.join(", ")} |`,
    );
  }
  console.error(JSON.stringify(summary, null, 2));
} else {
  console.log(JSON.stringify({ summary, flagged }, null, 2));
}

export { classifyFile, summary };
