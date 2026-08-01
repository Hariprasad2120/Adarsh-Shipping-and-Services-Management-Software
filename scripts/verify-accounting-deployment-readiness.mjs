import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const source = (path) => readFileSync(resolve(root, path), "utf8");
const checks = [];
const check = (code, ready, detail) =>
  checks.push({ code, status: ready ? "ready" : "blocked", detail });

const packageJson = JSON.parse(source("package.json"));
const dockerfile = source("Dockerfile");
const compose = source("docker-compose.yml");
const pipeline = source("src/modules/accounting/migration/pipeline.ts");
const migration = source(
  "prisma/migrations/20260730230000_accounting_phase6_migration_control/migration.sql",
);

check("BUILD_COMMAND", packageJson.scripts?.build === "npm run db:generate && next build", "Build includes Prisma generation");
check("MIGRATION_COMMAND", Boolean(packageJson.scripts?.["db:migrate:deploy"]), "Migration deployment is a distinct command");
check("SCHEMA_VERIFY_COMMAND", Boolean(packageJson.scripts?.["accounting:schema:verify"]), "Accounting schema verification is a distinct read-only command");
check("SCHEMA_PREFLIGHT_COMMAND", Boolean(packageJson.scripts?.["accounting:schema:preflight"]), "Development schema preflight is configured");
check("SAFE_DEPLOY_COMMAND", Boolean(packageJson.scripts?.["deploy:accounting-safe"]), "Deployment generation, validation, migration, verification, and build are sequenced");
check("STARTUP_ORDER", compose.includes("condition: service_healthy") && compose.includes("condition: service_completed_successfully"), "Database health and successful migration precede application startup");
check("DOCKER_MIGRATOR", dockerfile.includes("AS migrator") && dockerfile.includes('CMD ["npm", "run", "accounting:schema:deploy"]'), "Docker migration failure blocks application startup");
check("HEALTH_CHECK", dockerfile.includes("HEALTHCHECK") && compose.includes("/api/health"), "Non-mutating health check configured");
check("PROVIDER_DEFAULT", compose.includes("ACCOUNTING_PROVIDER_MODE: disabled") && compose.includes("EMAIL_PROVIDER: disabled"), "Providers default disabled");
check("PRODUCTION_MIGRATION_BLOCK", pipeline.includes('target === "production"') && pipeline.includes("PRODUCTION_BLOCKED"), "Phase 6 production execution is blocked");
check("ADDITIVE_MIGRATION", !/\b(?:DROP|TRUNCATE|DELETE\s+FROM)\b/i.test(migration), "Migration is expand-only");
check("HOST_PORT", !compose.includes('"5432:5432"'), "Compose does not expose host port 5432");
check("BACKUP_PREREQUISITE", false, "Production backup verification evidence is not accepted yet");
check("SCHEDULER_OWNERSHIP", false, "Production scheduler owner is not accepted yet");

if (process.argv.includes("--environment")) {
  const required = [
    "DATABASE_URL",
    "NEXTAUTH_SECRET",
    "ACCOUNTING_BACKUP_VERIFICATION_REF",
    "ACCOUNTING_SCHEDULER_OWNER",
  ];
  const missing = required.filter(
    (key) => typeof process.env[key] !== "string" || !process.env[key].trim(),
  );
  check(
    "ENVIRONMENT_VARIABLES",
    missing.length === 0,
    missing.length ? `Missing variable names: ${missing.join(", ")}` : "Required variables are present",
  );
  check(
    "ENV_PROVIDER_GUARD",
    process.env.ACCOUNTING_PROVIDER_MODE === "disabled" &&
      process.env.EMAIL_PROVIDER === "disabled",
    "Accounting and outbound providers must be disabled",
  );
}

const result = {
  ready: checks.every((entry) => entry.status === "ready"),
  checks,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
process.exitCode = result.ready ? 0 : 2;
