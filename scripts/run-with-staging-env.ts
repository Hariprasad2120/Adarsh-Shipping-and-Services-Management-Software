import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { assertExactStagingEnvironment } from "./staging-target";

const root = process.cwd();
const envPath = resolve(root, ".env.staging.local");
const allowedCommands = new Set(["next", "prisma", "tsx", "vitest"]);

if (!existsSync(envPath)) {
  throw new Error(
    "Missing .env.staging.local. Run `npm run staging:db:setup` first.",
  );
}

const loaded = config({ path: envPath, override: true, quiet: true });
if (loaded.error) {
  throw loaded.error;
}

const { url: databaseUrl } = assertExactStagingEnvironment("Staging command");

const [command, ...commandArgs] = process.argv.slice(2);
if (!command || !allowedCommands.has(command)) {
  throw new Error(
    "Expected an approved local command: prisma, tsx, next, or vitest.",
  );
}

const entrypoints: Record<string, string> = {
  next: resolve(root, "node_modules/next/dist/bin/next"),
  prisma: resolve(root, "node_modules/prisma/build/index.js"),
  tsx: resolve(root, "node_modules/tsx/dist/cli.mjs"),
  vitest: resolve(root, "node_modules/vitest/vitest.mjs"),
};
const entrypoint = entrypoints[command];
if (!existsSync(entrypoint)) {
  throw new Error(
    `Local ${command} executable is unavailable. Run npm install.`,
  );
}

const childEnvironment = {
  ...process.env,
  DATABASE_URL: databaseUrl.toString(),
  MONOLITH_ENV: "staging",
  PGAPPNAME: "monolith-accounting-staging",
};
const isFinalUiAuditPreparation =
  command === "tsx" &&
  commandArgs.some((argument) =>
    argument.endsWith("scripts/prepare-final-ui-audit.ts"),
  );
const isFinalUiRuntime =
  command === "tsx" &&
  commandArgs.some((argument) =>
    argument.endsWith("scripts/verify-monolith-final-runtime.mjs"),
  );

if (isFinalUiAuditPreparation) {
  childEnvironment.UI_AUDIT_PASSWORD = process.env.STAGING_TEST_PASSWORD;
}
if (isFinalUiRuntime) {
  childEnvironment.UI_TEST_BASE_URL = "http://localhost:3100";
  childEnvironment.UI_TEST_EMAIL = "final-ui-audit@staging.example.com";
  childEnvironment.UI_TEST_PASSWORD = process.env.STAGING_TEST_PASSWORD;
  childEnvironment.PORTAL_TEST_EMAIL = "portal-customer@staging.example.com";
  childEnvironment.PORTAL_TEST_PASSWORD = process.env.STAGING_TEST_PASSWORD;
}
delete childEnvironment.STAGING_DATABASE_ADMIN_PASSWORD;
delete childEnvironment.STAGING_DATABASE_PASSWORD;
if (
  command !== "tsx" ||
  !commandArgs.some((argument) => argument.endsWith("prisma/seed.staging.ts"))
) {
  delete childEnvironment.STAGING_TEST_PASSWORD;
}

const isApplicationCheck =
  command === "tsx" &&
  commandArgs.some((argument) =>
    argument.endsWith("scripts/verify-staging-app-start.ts"),
  );
const tsconfigPath = resolve(root, "tsconfig.json");
const tsconfigBefore =
  isApplicationCheck && existsSync(tsconfigPath)
    ? readFileSync(tsconfigPath)
    : undefined;
const restoreTsconfig = () => {
  if (tsconfigBefore) {
    writeFileSync(tsconfigPath, tsconfigBefore);
  }
};

const child = spawn(process.execPath, [entrypoint, ...commandArgs], {
  cwd: root,
  env: childEnvironment,
  shell: false,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => child.kill(signal));
}

child.on("error", (error) => {
  restoreTsconfig();
  console.error(`Failed to start ${command}:`, error.message);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  restoreTsconfig();
  process.exitCode = signal ? 1 : (code ?? 1);
});
