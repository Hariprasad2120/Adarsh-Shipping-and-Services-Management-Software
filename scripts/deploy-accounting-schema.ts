import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";

const VERIFY_ONLY = process.argv.includes("--verify-only");
const nodeOptions = process.env.NODE_OPTIONS?.includes("--max-old-space-size")
  ? process.env.NODE_OPTIONS
  : `${process.env.NODE_OPTIONS ?? ""} --max-old-space-size=8192`.trim();
const childEnvironment = {
  ...process.env,
  NODE_OPTIONS: nodeOptions,
};
const npmCli = process.env.npm_execpath;
if (!npmCli) {
  throw new Error("npm_execpath is unavailable; run this preflight through npm.");
}
const cliPath = (name: "npm" | "npx") =>
  name === "npm" ? npmCli : resolve(dirname(npmCli), "npx-cli.js");

function redact(output: string) {
  return output.replace(
    /postgres(?:ql)?:\/\/[^\s]+/gi,
    "postgresql://[redacted]",
  );
}

function run(
  command: "npm" | "npx",
  args: string[],
  options: { allowPendingMigrations?: boolean } = {},
) {
  const result = spawnSync(process.execPath, [cliPath(command), ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: childEnvironment,
    maxBuffer: 32 * 1024 * 1024,
    shell: false,
  });
  const output = redact(`${result.stdout ?? ""}${result.stderr ?? ""}`);
  process.stdout.write(output);

  if (result.error) throw result.error;
  if (result.status === 0) return;
  if (
    options.allowPendingMigrations &&
    /Following migrations? (?:have|has) not yet been applied:/i.test(output) &&
    !/failed migrations|diverged|migration history.*conflict/i.test(output)
  ) {
    return;
  }
  throw new Error(
    `${command} ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}.`,
  );
}

try {
  run("npm", ["run", "db:generate"]);
  run("npx", ["prisma", "validate"]);
  run("npx", ["prisma", "migrate", "status"], {
    allowPendingMigrations: !VERIFY_ONLY,
  });

  if (!VERIFY_ONLY) {
    run("npm", ["run", "db:migrate:deploy"]);
    run("npx", ["prisma", "migrate", "status"]);
  }

  run("npm", ["run", "accounting:schema:verify"]);
} catch (error) {
  console.error(
    error instanceof Error
      ? `Accounting schema preflight failed: ${redact(error.message)}`
      : "Accounting schema preflight failed.",
  );
  process.exitCode = 1;
}
