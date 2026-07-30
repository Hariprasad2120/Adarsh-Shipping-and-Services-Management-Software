import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { resolve } from "node:path";
import {
  assertStagingOutboundDeliveryDisabled,
  STAGING_LOGIN_IDENTITY,
} from "./staging-login-policy";
import {
  assertExactStagingEnvironment,
  verifyExactStagingDatabaseIdentity,
} from "./staging-target";

const host = "127.0.0.1";
const port = 3100;
const baseUrl = `http://${host}:${port}`;

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

function mergeCookies(
  cookieMap: Map<string, string>,
  response: Response,
) {
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";", 1)[0];
    const separator = pair.indexOf("=");
    if (separator > 0) {
      cookieMap.set(pair.slice(0, separator), pair);
    }
  }
}

function cookieHeader(cookieMap: Map<string, string>) {
  return [...cookieMap.values()].join("; ");
}

async function csrf(cookieMap: Map<string, string>) {
  const response = await fetch(`${baseUrl}/api/auth/csrf`, {
    headers: cookieMap.size ? { cookie: cookieHeader(cookieMap) } : undefined,
  });
  if (!response.ok) {
    throw new Error("[STAGING_LOGIN_CSRF_FAILED]");
  }
  mergeCookies(cookieMap, response);
  const payload = (await response.json()) as { csrfToken?: string };
  if (!payload.csrfToken) {
    throw new Error("[STAGING_LOGIN_CSRF_MISSING]");
  }
  return payload.csrfToken;
}

async function verifyLogin() {
  assertExactStagingEnvironment("Staging credential-login verification");
  assertStagingOutboundDeliveryDisabled(process.env);
  await verifyExactStagingDatabaseIdentity(
    "Staging credential-login verification",
  );
  const password = process.env.STAGING_TEST_PASSWORD;
  if (!password) {
    throw new Error("[STAGING_TEST_PASSWORD_MISSING]");
  }
  if (await isListening()) {
    throw new Error(`[STAGING_LOGIN_PORT_OCCUPIED] port=${port}`);
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
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      if (child.exitCode !== null) {
        throw new Error("[STAGING_LOGIN_APP_EXITED]");
      }
      try {
        const response = await fetch(`${baseUrl}/api/auth/providers`, {
          signal: AbortSignal.timeout(2_000),
        });
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {
        await wait(500);
      }
    }
    if (!ready) {
      throw new Error("[STAGING_LOGIN_APP_START_TIMEOUT]");
    }

    const cookies = new Map<string, string>();
    const csrfToken = await csrf(cookies);
    const callback = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
      method: "POST",
      headers: {
        cookie: cookieHeader(cookies),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        csrfToken,
        email: STAGING_LOGIN_IDENTITY.email,
        password,
        rememberMe: "false",
        callbackUrl: `${baseUrl}/dashboard`,
      }),
      redirect: "manual",
    });
    mergeCookies(cookies, callback);
    const callbackLocation = callback.headers.get("location") ?? "";
    if (
      callback.status < 300 ||
      callback.status >= 400 ||
      callbackLocation.includes("error=")
    ) {
      throw new Error("[STAGING_LOGIN_CALLBACK_REJECTED]");
    }

    const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { cookie: cookieHeader(cookies) },
    });
    const session = (await sessionResponse.json()) as {
      user?: { email?: string };
    };
    if (
      !sessionResponse.ok ||
      session.user?.email !== STAGING_LOGIN_IDENTITY.email
    ) {
      throw new Error("[STAGING_LOGIN_SESSION_INVALID]");
    }

    const signOutCsrfToken = await csrf(cookies);
    const signOut = await fetch(`${baseUrl}/api/auth/signout`, {
      method: "POST",
      headers: {
        cookie: cookieHeader(cookies),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        csrfToken: signOutCsrfToken,
        callbackUrl: `${baseUrl}/login`,
      }),
      redirect: "manual",
    });
    if (signOut.status < 300 || signOut.status >= 400) {
      throw new Error("[STAGING_LOGIN_SIGNOUT_FAILED]");
    }
    console.log(
      "Guarded staging credential and session checks passed; stopping the local app.",
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
      throw new Error("[STAGING_LOGIN_PORT_NOT_RELEASED]");
    }
  }

  console.log(
    "Guarded staging credential login and session verification passed.",
  );
}

verifyLogin().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
