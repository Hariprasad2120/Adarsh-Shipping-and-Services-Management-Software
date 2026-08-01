import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const source = (relativePath) => readFileSync(resolve(root, relativePath), "utf8");

const failures = [];

function check(name, passed, detail) {
  if (!passed) failures.push(`${name}: ${detail}`);
}

const operationalQueries = source("src/modules/accounting/operational-queries.ts");
const capabilityModule = source("src/modules/accounting/capability-policies.ts");
const actions = source("src/modules/accounting/actions.ts");
const routeAccess = source("src/modules/accounting/operational-access.ts");
const navigation = source("src/lib/navigation.ts");
const recurringPage = source("src/app/(dashboard)/accounting/recurring/page.tsx");
const depreciationPage = source("src/app/(dashboard)/accounting/depreciation/page.tsx");
const partnersPage = source("src/app/(dashboard)/accounting/partners/page.tsx");
const configurationPage = source("src/app/(dashboard)/accounting/configuration/page.tsx");
const outboxPage = source("src/app/(dashboard)/accounting/outbox/page.tsx");
const packageJson = source("package.json");
const schema = source("prisma/schema.prisma");
const phasePlan = source("docs/accounting/phase-9-full-module-completion-plan.md");

for (const signal of [
  "depreciation: false",
  "recurringGeneration: false",
  "partnerTransactions: false",
  "productionOutbox: false",
]) {
  check("HARDCODED_GATE_REMOVED", !operationalQueries.includes(signal), `${signal} is still present`);
}

check(
  "CAPABILITY_MODEL_PRESENT",
  schema.includes("model AccountingCapabilityPolicy"),
  "AccountingCapabilityPolicy Prisma model is missing",
);
check(
  "CAPABILITY_ROUTE_PRESENT",
  routeAccess.includes('"/accounting/capabilities"'),
  "Accounting capabilities route access is missing",
);
check(
  "CAPABILITY_NAV_PRESENT",
  navigation.includes('href: "/accounting/capabilities"'),
  "Accounting capabilities navigation item is missing",
);
check(
  "CAPABILITY_RBAC_PRESENT",
  routeAccess.includes("accounting.capability-policy.read") &&
    routeAccess.includes("accounting.capability-policy.manage") &&
    routeAccess.includes("accounting.capability-policy.approve"),
  "Capability-policy RBAC mapping is incomplete",
);
check(
  "CAPABILITY_RESOLVER_PRESENT",
  capabilityModule.includes("resolveAccountingCapabilityReadiness") &&
    capabilityModule.includes("configurationHash"),
  "Capability readiness resolver is missing",
);
check(
  "CAPABILITY_ACTIONS_PRESENT",
  actions.includes("saveAccountingCapabilityPolicyDraftAction") &&
    actions.includes("approveAccountingCapabilityPolicyAction"),
  "Capability-policy actions are missing",
);
check(
  "CAPABILITY_UI_GATES_PRESENT",
  recurringPage.includes("capabilityReadiness.recurringGeneration") &&
    depreciationPage.includes("capabilityReadiness.depreciation") &&
    partnersPage.includes("capabilityReadiness.partnerTransactions") &&
    configurationPage.includes("capabilityReadiness.productionOutbox") &&
    outboxPage.includes("capabilityReadiness.productionOutbox"),
  "Capability readiness is not wired into every gated page",
);
check(
  "PHASE9_SCRIPTS_PRESENT",
  packageJson.includes('"accounting:phase9:verify"') &&
    packageJson.includes('"accounting:phase9:test"') &&
    packageJson.includes('"accounting:phase9:benchmark"') &&
    packageJson.includes('"accounting:phase9:safety-scan"'),
  "Phase 9 npm scripts are incomplete",
);
check(
  "NO_PRISMA_DB_PUSH_IN_PHASE9_PLAN",
  !phasePlan.includes("prisma db push"),
  "Phase 9 plan must not instruct prisma db push",
);
check(
  "NO_AUTOMATIC_ZOHO_IMPORT",
  !/Zoho.*(?:auto|automatic).*import/i.test(actions) &&
    !/auto.*Zoho/i.test(capabilityModule),
  "Automatic Zoho import logic was detected",
);
check(
  "NO_DIRECT_POSTED_JOURNAL_EDITS",
  !/journalEntry\s*\.\s*(?:update|updateMany|delete|deleteMany)\s*\(/.test(capabilityModule),
  "Direct journal mutation was detected in the capability-policy module",
);

if (failures.length) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `${JSON.stringify(
      {
        status: "PASSED",
        checks: 11,
        phase9PlanImported: true,
        hardcodedCapabilityBooleansRemoved: true,
      },
      null,
      2,
    )}\n`,
  );
}
