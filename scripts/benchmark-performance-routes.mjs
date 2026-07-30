import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { parse } from "dotenv";

const baseUrl = process.env.UI_TEST_BASE_URL ?? "http://127.0.0.1:3100";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(baseUrl)) {
  throw new Error("Benchmarks are restricted to a local application URL.");
}
const staging = parse(readFileSync(resolve(".env.staging.local")));
const password = staging.STAGING_TEST_PASSWORD;
if (!password) throw new Error("Local staging test password is missing.");

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill("accounting-maker@staging.example.com");
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname !== "/login", { timeout: 30_000 });

  const routes = process.env.BENCHMARK_ROUTES?.split(",").filter(Boolean) ??
    ["/dashboard", "/cha", "/cha/jobs", "/api/runtime/updates"];
  const result = {};
  const iterations = Number(process.env.BENCHMARK_ITERATIONS ?? "10");
  for (const route of routes) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
    const samples = [];
    for (let index = 0; index < iterations; index += 1) {
      const startedAt = performance.now();
      const response = await context.request.get(`${baseUrl}${route}`);
      const elapsedMs = performance.now() - startedAt;
      if (!response.ok()) throw new Error(`${route} returned ${response.status()}.`);
      samples.push(Number(elapsedMs.toFixed(1)));
    }
    result[route] = {
      samples,
      medianMs: percentile(samples, 0.5),
      p95Ms: percentile(samples, 0.95),
    };
  }
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
