import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.UI_TEST_BASE_URL;
const email = process.env.UI_TEST_EMAIL;
const password = process.env.UI_TEST_PASSWORD;

if (!baseUrl || !email || !password) {
  throw new Error(
    "UI_TEST_BASE_URL, UI_TEST_EMAIL, and UI_TEST_PASSWORD are required.",
  );
}

const outputDirectory = "artifacts/ui-migration";
const viewports = [
  { theme: "light", name: "desktop", width: 1440, height: 1000 },
  { theme: "night", name: "tablet", width: 1024, height: 900 },
  { theme: "violet", name: "mobile", width: 390, height: 844 },
];

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const authResponses = [];
let authenticated = false;

page.on("response", (response) => {
  if (response.url().includes("/api/auth/")) {
    authResponses.push({
      status: response.status(),
      url: new URL(response.url()).pathname,
    });
  }
});

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  const emailInput = page.locator('input[name="email"]');
  const passwordInput = page.locator('input[name="password"]');
  await emailInput.waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const submitButton = document.querySelector('button[type="submit"]');
    return Boolean(
      submitButton
        && Object.keys(submitButton).some((key) => key.startsWith("__reactProps$")),
    );
  });
  await emailInput.fill(email);
  await passwordInput.fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(20_000);

  if (new URL(page.url()).pathname.endsWith("/login")) {
    const message = await page
      .locator("#login-message")
      .textContent()
      .catch(() => "");
    throw new Error(
      `Login did not complete: ${message?.trim() || "no form message"}; `
        + `auth responses: ${JSON.stringify(authResponses)}`,
    );
  }
  authenticated = true;

  await page.goto(`${baseUrl}/account/security`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator(".mnx-workspace-page").waitFor({ state: "visible" });

  for (const viewport of viewports) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.evaluate((theme) => {
      window.localStorage.setItem("theme", theme);
    }, viewport.theme);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page
      .locator(`.mnx-dashboard-shell[data-theme="${viewport.theme}"]`)
      .waitFor({ state: "visible" });

    const verification = await page.evaluate(() => ({
      hasLegacyTable: Boolean(document.querySelector(".monolith-table")),
      hasWorkspaceTable: Boolean(document.querySelector(".mnx-workspace-table")),
      pageOverflows:
        document.documentElement.scrollWidth > document.documentElement.clientWidth,
      theme: document
        .querySelector(".mnx-dashboard-shell")
        ?.getAttribute("data-theme"),
    }));

    if (
      verification.hasLegacyTable
      || !verification.hasWorkspaceTable
      || verification.pageOverflows
      || verification.theme !== viewport.theme
    ) {
      throw new Error(
        `${viewport.name} verification failed: ${JSON.stringify(verification)}`,
      );
    }

    await page.screenshot({
      path: `${outputDirectory}/account-security-${viewport.theme}-${viewport.name}.png`,
      fullPage: true,
    });
  }
} finally {
  if (authenticated) {
    const csrfResponse = await context.request.get(`${baseUrl}/api/auth/csrf`);
    if (csrfResponse.ok()) {
      const { csrfToken } = await csrfResponse.json();
      await context.request.post(`${baseUrl}/api/auth/signout`, {
        form: {
          callbackUrl: `${baseUrl}/login`,
          csrfToken,
          json: "true",
        },
      });
    }
  }
  await browser.close();
}
