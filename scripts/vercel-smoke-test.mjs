#!/usr/bin/env node

const baseUrl = (process.env.DEPLOYMENT_URL || process.argv[2] || "").replace(/\/$/, "");

if (!baseUrl) {
  console.error("DEPLOYMENT_URL or a first CLI argument is required.");
  process.exit(1);
}

const failures = [];
const notes = [];
let cookieJar = "";

function mergeCookies(response) {
  const headers = response.headers.getSetCookie?.() ?? [];
  if (!headers.length) return;
  const next = new Map();
  for (const part of cookieJar.split(/;\s*/).filter(Boolean)) {
    const [name, ...rest] = part.split("=");
    next.set(name, `${name}=${rest.join("=")}`);
  }
  for (const header of headers) {
    const [pair] = header.split(";");
    const [name] = pair.split("=");
    next.set(name, pair);
  }
  cookieJar = [...next.values()].join("; ");
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    ...init,
    headers: {
      ...(cookieJar ? { cookie: cookieJar } : {}),
      ...(init.headers || {}),
    },
  });
  mergeCookies(response);
  return response;
}

async function expectStatus(path, expected, init) {
  const response = await request(path, init);
  if (response.status !== expected) {
    failures.push(`${path} expected ${expected} but received ${response.status}`);
  }
  return response;
}

async function expectOk(path, init) {
  const response = await request(path, init);
  if (!response.ok) {
    failures.push(`${path} expected 2xx but received ${response.status}`);
  }
  return response;
}

async function loginIfConfigured() {
  const email = process.env.SMOKE_TEST_EMAIL;
  const password = process.env.SMOKE_TEST_PASSWORD;

  if (!email || !password) {
    notes.push("Credential login skipped; set SMOKE_TEST_EMAIL and SMOKE_TEST_PASSWORD to exercise authenticated paths.");
    return;
  }

  const csrfResponse = await expectOk("/api/auth/csrf");
  const csrfPayload = await csrfResponse.json();
  const csrfToken = csrfPayload?.csrfToken;
  if (!csrfToken) {
    failures.push("Missing csrfToken from /api/auth/csrf");
    return;
  }

  const body = new URLSearchParams({
    csrfToken,
    email,
    password,
    rememberMe: "false",
    callbackUrl: `${baseUrl}/dashboard`,
    json: "true",
  });

  const loginResponse = await request("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!(loginResponse.status === 200 || loginResponse.status === 302)) {
    failures.push(`/api/auth/callback/credentials expected 200/302 but received ${loginResponse.status}`);
    return;
  }

  const dashboardResponse = await request("/dashboard");
  if (!(dashboardResponse.ok || dashboardResponse.status === 307 || dashboardResponse.status === 308)) {
    failures.push(`/dashboard after login expected 2xx/307/308 but received ${dashboardResponse.status}`);
  }
}

async function main() {
  const healthResponse = await expectOk("/api/health");
  const health = await healthResponse.json().catch(() => null);
  if (!health?.ok) {
    failures.push("/api/health did not return { ok: true }");
  }

  await expectOk("/");
  await expectOk("/login");

  const unauthDashboard = await request("/dashboard");
  if (![200, 302, 307, 308].includes(unauthDashboard.status)) {
    failures.push(`/dashboard unauthenticated expected 200/302/307/308 but received ${unauthDashboard.status}`);
  }

  const cronResponse = await request("/api/cron/email-flush");
  if (![401, 403, 503].includes(cronResponse.status)) {
    failures.push(`/api/cron/email-flush without secret expected 401/403/503 but received ${cronResponse.status}`);
  }

  await loginIfConfigured();

  if (failures.length > 0) {
    console.error("Smoke test failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    for (const note of notes) console.error(`note: ${note}`);
    process.exit(1);
  }

  console.log(`Smoke test passed for ${baseUrl}`);
  for (const note of notes) console.log(`note: ${note}`);
}

await main();

