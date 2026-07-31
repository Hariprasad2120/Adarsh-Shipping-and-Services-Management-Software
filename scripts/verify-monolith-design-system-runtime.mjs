import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import {
  assertLocalUiServerReady,
  getLocalUiBaseUrl,
} from "./local-ui-target.mjs";

const useLocalSpecialAccount = process.argv.includes(
  "--use-local-special-account",
);
const baseUrl = getLocalUiBaseUrl();
const email =
  process.env.UI_TEST_EMAIL ??
  (useLocalSpecialAccount ? "hr@adarshshipping.in" : undefined);
const password =
  process.env.UI_TEST_PASSWORD ??
  (useLocalSpecialAccount ? "password@123" : undefined);

if (!email || !password) {
  throw new Error(
    "UI_TEST_EMAIL and UI_TEST_PASSWORD are required for the normal localhost:3000 application.",
  );
}
await assertLocalUiServerReady(baseUrl);

const outputDirectory = "artifacts/ui-migration/design-system-catalogue";
const themes = ["light", "night", "violet"];
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 1024, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const runtimeErrors = [];
const results = [];

page.on("pageerror", (error) => runtimeErrors.push(error.message));
page.on("console", (message) => {
  const text = message.text();
  if (
    message.type() === "error" &&
    !text.includes("Failed to mark notifications presented TypeError: Failed to fetch")
  ) {
    runtimeErrors.push(text);
  }
});
page.on("response", (response) => {
  if (response.status() >= 500) {
    runtimeErrors.push(`${response.status()} ${response.url()}`);
  }
});

try {
  await login(page);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);

    for (const theme of themes) {
      const priorErrorCount = runtimeErrors.length;
      await page.evaluate(
        (nextTheme) => window.localStorage.setItem("theme", nextTheme),
        theme,
      );
      await navigate(page, `${baseUrl}/admin/design-system`);
      await page
        .locator('[data-production-catalogue="true"]')
        .filter({ visible: true })
        .first()
        .waitFor();

      const themePicker = page.getByRole("group", {
        name: "Catalogue test theme",
      });
      await themePicker.getByTitle(`${theme[0].toUpperCase()}${theme.slice(1)} theme`).click();
      await page
        .locator(`.mnx-dashboard-shell[data-theme="${theme}"]`)
        .waitFor();

      await page
        .getByRole("tab", { name: "CRM · Configuration" })
        .click();
      await page.getByText("Configuration required", { exact: true }).waitFor();

      await page
        .getByRole("button", { name: "Open production dialog" })
        .click();
      await page.getByRole("dialog", { name: "Production dialog" }).waitFor();
      await page.keyboard.press("Escape");
      await page
        .getByRole("dialog", { name: "Production dialog" })
        .waitFor({ state: "detached" });

      const verification = await page.evaluate((expectedTheme) => {
        const root = document.documentElement;
        const catalogue = document.querySelector(
          '[data-production-catalogue="true"]',
        );
        const shell = document.querySelector(".mnx-dashboard-shell");
        const componentBadges = document.querySelectorAll(
          "#component-index .mnx-catalogue-component-list .mnx-badge",
        );
        return {
          componentCount: new Set(
            [...componentBadges].map((badge) => badge.textContent?.trim()),
          ).size,
          errorText:
            document.body.textContent?.includes("Application error") ||
            document.body.textContent?.includes("Internal Server Error") ||
            false,
          hasCatalogue: Boolean(catalogue),
          pageOverflows: root.scrollWidth > root.clientWidth + 1,
          persistedTheme: window.localStorage.getItem("theme"),
          rootClass: root.classList.contains(`theme-${expectedTheme}`),
          semanticAccent: getComputedStyle(root)
            .getPropertyValue("--mn-color-accent")
            .trim(),
          theme: shell?.getAttribute("data-theme"),
        };
      }, theme);

      const newErrors = runtimeErrors.slice(priorErrorCount);
      if (
        newErrors.length > 0 ||
        verification.errorText ||
        !verification.hasCatalogue ||
        verification.pageOverflows ||
        verification.componentCount < 100 ||
        verification.theme !== theme ||
        verification.persistedTheme !== theme ||
        !verification.rootClass ||
        !verification.semanticAccent
      ) {
        throw new Error(
          `${viewport.name} ${theme} failed: ${JSON.stringify({
            newErrors,
            verification,
          })}`,
        );
      }

      await page.evaluate(() => {
        window.scrollTo({ left: 0, top: 0 });
        document.querySelector(".mnx-dashboard-main")?.scrollTo({
          left: 0,
          top: 0,
        });
      });
      await page.waitForTimeout(200);
      const screenshotPath = `${outputDirectory}/catalogue-${theme}-${viewport.name}.png`;
      await page.screenshot({
        path: screenshotPath,
        fullPage: false,
      });
      results.push({
        screenshotPath,
        theme,
        verification,
        viewport: viewport.name,
      });
    }
  }

  await writeFile(
    `${outputDirectory}/verification.json`,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        results,
        route: "/admin/design-system",
        themes,
        viewports,
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    `Verified ${results.length} authenticated component-catalogue theme/viewport combinations, shared theme interaction, module state selection, dialog behavior, runtime inventory, and responsive overflow.`,
  );
} finally {
  await browser.close();
}

async function login(targetPage) {
  await navigate(targetPage, `${baseUrl}/login`);
  await targetPage.waitForFunction(() => {
    const submitButton = document.querySelector('button[type="submit"]');
    return Boolean(
      submitButton &&
        Object.keys(submitButton).some((key) => key.startsWith("__reactProps$")),
    );
  });
  await targetPage.locator('input[name="email"]').fill(email);
  await targetPage.locator('input[name="password"]').fill(password);
  await targetPage.locator('button[type="submit"]').click();
  await targetPage.waitForURL((url) => url.pathname !== "/login", {
    timeout: 30_000,
  });
}

async function navigate(targetPage, url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await targetPage.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt === 2 || !message.includes("ERR_ABORTED")) throw error;
      await targetPage.waitForTimeout(250);
    }
  }
}
