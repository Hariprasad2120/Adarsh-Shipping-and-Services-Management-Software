import { execFileSync, spawn, spawnSync } from "node:child_process";
import { join, normalize } from "node:path";

const PORT = 3000;
const ROOT = process.cwd();
const RESTART = process.argv.includes("--restart");
const BUNDLER = process.argv.includes("--webpack") ? "--webpack" : "--turbopack";
const RUN_PREFLIGHT =
  process.argv.includes("--with-preflight") ||
  process.env.MONOLITH_DEV_PREFLIGHT === "1";
const NODE_OPTIONS = mergeNodeOptions(process.env.NODE_OPTIONS);

function mergeNodeOptions(current = "") {
  const withoutOldHeapSetting = current.replace(
    /(?:^|\s)--max-old-space-size(?:=|\s+)\d+/g,
    "",
  );
  return `${withoutOldHeapSetting.trim()} --max-old-space-size=8192`.trim();
}

function findWindowsListener() {
  const script = [
    `$connection = Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1`,
    "if ($connection) {",
    "  $process = Get-CimInstance Win32_Process -Filter \"ProcessId = $($connection.OwningProcess)\" -ErrorAction SilentlyContinue",
    "  [pscustomobject]@{ pid = $connection.OwningProcess; commandLine = $process.CommandLine } | ConvertTo-Json -Compress",
    "}",
    "exit 0",
  ].join("\n");

  const output = execFileSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    { encoding: "utf8" },
  ).trim();

  return output ? JSON.parse(output) : null;
}

function findPosixListener() {
  for (const [command, args] of [
    ["lsof", ["-nP", `-iTCP:${PORT}`, "-sTCP:LISTEN", "-t"]],
    ["fuser", [`${PORT}/tcp`]],
  ]) {
    const result = spawnSync(command, args, { encoding: "utf8" });
    if (result.error?.code === "ENOENT") continue;

    const pid = Number(`${result.stdout} ${result.stderr}`.match(/\d+/)?.[0]);
    if (!pid) return null;

    const commandResult = spawnSync("ps", ["-p", String(pid), "-o", "command="], {
      encoding: "utf8",
    });
    return { pid, commandLine: commandResult.stdout.trim() };
  }

  return null;
}

function findListener() {
  try {
    return process.platform === "win32"
      ? findWindowsListener()
      : findPosixListener();
  } catch (error) {
    console.error(`Unable to inspect port ${PORT}: ${error.message}`);
    process.exit(1);
  }
}

function isThisProject(listener) {
  const commandLine = normalize(listener.commandLine ?? "").toLowerCase();
  const projectNextPath = normalize(join(ROOT, "node_modules", "next")).toLowerCase();
  return commandLine.includes(projectNextPath);
}

async function serverResponds() {
  try {
    await fetch(`http://127.0.0.1:${PORT}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    return true;
  } catch {
    return false;
  }
}

function stopListener(pid) {
  console.log(`Stopping the existing Monolith dev server on port ${PORT} (PID ${pid})...`);

  if (process.platform === "win32") {
    const result = spawnSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], {
      stdio: "inherit",
    });
    if (result.status !== 0) process.exit(result.status ?? 1);
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch (error) {
    console.error(`Unable to stop PID ${pid}: ${error.message}`);
    process.exit(1);
  }
}

async function waitForPortToClose() {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (!findListener()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  console.error(`Port ${PORT} did not become available after stopping the old server.`);
  process.exit(1);
}

function runPreflight() {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    console.error("This launcher must be run through npm (for example, npm run dev).");
    process.exit(1);
  }

  const result = spawnSync(
    process.execPath,
    [npmCli, "run", "accounting:schema:preflight"],
    {
      cwd: ROOT,
      env: { ...process.env, NODE_OPTIONS },
      stdio: "inherit",
    },
  );

  if (result.status !== 0) process.exit(result.status ?? 1);
}

function startNext() {
  const nextCli = join(ROOT, "node_modules", "next", "dist", "bin", "next");
  const child = spawn(
    process.execPath,
    [nextCli, "dev", BUNDLER, "-p", String(PORT)],
    {
      cwd: ROOT,
      env: { ...process.env, NODE_OPTIONS },
      stdio: "inherit",
    },
  );

  child.once("error", (error) => {
    console.error(`Failed to launch Next.js: ${error.message}`);
    process.exitCode = 1;
  });
  child.once("exit", (code, signal) => {
    if (signal) console.log(`Next.js stopped by ${signal}.`);
    process.exitCode = code ?? (signal ? 1 : 0);
  });
}

const listener = findListener();
if (listener) {
  if (!isThisProject(listener)) {
    console.error(
      `Port ${PORT} is being used by another application (PID ${listener.pid}). ` +
        "Stop that application or choose another port before starting Monolith.",
    );
    process.exit(1);
  }

  if (!RESTART && (await serverResponds())) {
    console.log(`Monolith is already running at http://localhost:${PORT} (PID ${listener.pid}).`);
    console.log("The existing server will be reused. Run `npm run dev:restart` to replace it.");
    process.exit(0);
  }

  stopListener(listener.pid);
  await waitForPortToClose();
}

if (RUN_PREFLIGHT) {
  runPreflight();
}
startNext();
