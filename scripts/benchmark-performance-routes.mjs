import { chromium } from "playwright";
import {
  assertLocalUiServerReady,
  getLocalUiBaseUrl,
} from "./local-ui-target.mjs";

const baseUrl = getLocalUiBaseUrl();
const email = process.env.UI_TEST_EMAIL;
const password = process.env.UI_TEST_PASSWORD;
if (!email || !password) {
  throw new Error(
    "UI_TEST_EMAIL and UI_TEST_PASSWORD are required for the normal localhost:3000 application.",
  );
}
await assertLocalUiServerReady(baseUrl);

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(email);
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
