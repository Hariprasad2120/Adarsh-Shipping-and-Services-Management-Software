import { mkdir, writeFile } from "node:fs/promises";

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

const routes = [
  "/accounting",
  "/accounting/sales-invoices",
  "/accounting/purchase-invoices",
  "/accounting/customer-receipts",
  "/accounting/vendor-payments",
  "/accounting/payments",
  "/accounting/allocations",
  "/accounting/credit-notes",
  "/accounting/debit-notes",
  "/accounting/journal-entries",
  "/accounting/general-ledger",
  "/accounting/recurring",
  "/accounting/depreciation",
  "/accounting/partners",
  "/accounting/outbox",
  "/accounting/configuration",
];
const outputDirectory = "artifacts/ui-migration/accounting";
const browser = await chromium.launch({ headless: true });
const results = [];
const unexpectedOrigins = new Set();

try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const runtimeErrors = [];

  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (
      ["http:", "https:"].includes(requestUrl.protocol) &&
      requestUrl.origin !== baseUrl
    ) {
      unexpectedOrigins.add(requestUrl.origin);
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 500) {
      runtimeErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto(`${baseUrl}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname !== "/login", {
    timeout: 30_000,
  });

  for (const route of routes) {
    const priorErrorCount = runtimeErrors.length;
    const startedAt = Date.now();
    const response = await page.goto(`${baseUrl}${route}`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    const actualUrl = new URL(page.url());
    const bodyText = (await page.locator("body").innerText()).slice(0, 100_000);
    const routeErrors = runtimeErrors.slice(priorErrorCount);

    if (!response || response.status() >= 500) {
      throw new Error(
        `${route} failed with HTTP ${response?.status() ?? "no response"}.`,
      );
    }
    if (actualUrl.origin !== baseUrl || actualUrl.pathname !== route) {
      throw new Error(`${route} redirected unexpectedly to ${page.url()}.`);
    }
    if (
      /(table public\.[A-Za-z0-9_]+ does not exist|PrismaClientKnownRequestError|Application error|Internal Server Error|raw stack trace)/i.test(
        bodyText,
      )
    ) {
      throw new Error(`${route} rendered a database or application error.`);
    }
    if (routeErrors.length > 0) {
      throw new Error(
        `${route} emitted runtime errors: ${routeErrors.join(" | ")}`,
      );
    }

    results.push({
      durationMs: Date.now() - startedAt,
      route,
      status: response.status(),
    });
    console.log(`Verified ${baseUrl}${route} (HTTP ${response.status()}).`);
  }

  if (unexpectedOrigins.size > 0) {
    throw new Error(
      `Accounting verification made unexpected cross-origin requests: ${[
        ...unexpectedOrigins,
      ].join(", ")}`,
    );
  }

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    `${outputDirectory}/localhost-3000-verification.json`,
    `${JSON.stringify(
      {
        baseUrl,
        completedAt: new Date().toISOString(),
        results,
        unexpectedOrigins: [],
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `Verified ${results.length} Accounting routes on the existing localhost:3000 application without database fixtures.`,
  );
} finally {
  await browser.close();
}
