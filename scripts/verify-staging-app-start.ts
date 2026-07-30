import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { resolve } from "node:path";
import { assertExactStagingEnvironment } from "./staging-target";

const host = "127.0.0.1";
const port = 3100;

function wait(milliseconds: number) {
  return new Promise((resolvePromise) =>
    setTimeout(resolvePromise, milliseconds),
  );
}

function isListening() {
  return new Promise<boolean>((resolvePromise) => {
    const socket = createConnection({ host, port });
    socket.once("connect", () => {
      socket.destroy();
      resolvePromise(true);
    });
    socket.once("error", () => resolvePromise(false));
    socket.setTimeout(1_000, () => {
      socket.destroy();
      resolvePromise(false);
    });
  });
}

async function stopChild(child: ReturnType<typeof spawn>) {
  if (child.exitCode !== null) {
    return;
  }
  child.kill("SIGTERM");
  await Promise.race([
    new Promise<void>((resolvePromise) =>
      child.once("exit", () => resolvePromise()),
    ),
    wait(10_000),
  ]);
  if (child.exitCode === null) {
    child.kill("SIGKILL");
    await new Promise<void>((resolvePromise) =>
      child.once("exit", () => resolvePromise()),
    );
  }
}

async function check() {
assertExactStagingEnvironment("Application check");
  if (await isListening()) {
    throw new Error(`Application check refused: port ${port} is occupied.`);
  }

  const nextEntrypoint = resolve(
    process.cwd(),
    "node_modules/next/dist/bin/next",
  );
  const child = spawn(
    process.execPath,
    [nextEntrypoint, "dev", "--webpack", "-H", host, "-p", String(port)],
    {
      cwd: process.cwd(),
      env: process.env,
      detached: process.platform === "win32",
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  child.stdout?.on("data", (chunk) => {
    output += String(chunk);
  });
  child.stderr?.on("data", (chunk) => {
    output += String(chunk);
  });

  try {
    let response: Response | undefined;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      if (child.exitCode !== null) {
        throw new Error(
          `Staging application exited before startup (code ${child.exitCode}).`,
        );
      }
      try {
        response = await fetch(`http://${host}:${port}`, {
          redirect: "manual",
          signal: AbortSignal.timeout(2_000),
        });
        break;
      } catch {
        await wait(500);
      }
    }
    if (!response) {
      throw new Error("Staging application did not respond within 60 seconds.");
    }
    console.log(
      `Staging application responded on ${host}:${port} with HTTP ${response.status}.`,
    );
  } catch (error) {
    const safeOutput = output
      .split(/\r?\n/)
      .filter(
        (line) =>
          line &&
          !/(DATABASE_URL|password|secret|token|postgresql:\/\/)/i.test(line),
      )
      .slice(-20)
      .join("\n");
    if (safeOutput) {
      console.error(safeOutput);
    }
    throw error;
  } finally {
    await stopChild(child);
    let portReleased = false;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (!(await isListening())) {
        portReleased = true;
        break;
      }
      await wait(250);
    }
    if (!portReleased) {
      throw new Error("Staging application port remained open after shutdown.");
    }
  }

  console.log("Staging application stopped and released its port.");
}

check().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
