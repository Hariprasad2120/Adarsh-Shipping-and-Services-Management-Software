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

const outputDirectory = "artifacts/ui-migration/design-system-parity";
const themes = ["light", "night", "violet"];
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 1024, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];
const computedProperties = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const runtimeErrors = [];
const results = [];

page.on("pageerror", (error) => runtimeErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") runtimeErrors.push(message.text());
});
page.on("response", (response) => {
  if (response.status() >= 500) runtimeErrors.push(`${response.status()} ${response.url()}`);
});

try {
  await login(page);
  // Authentication lands on the existing dashboard, whose animated SVG graphics
  // can emit Chromium attribute warnings while the route is being replaced.
  // Warm the target route before measuring catalogue/CHA runtime parity so this
  // verifier reports errors owned by the routes under test.
  await navigate(page, `${baseUrl}/admin/design-system`);
  await page.locator('[data-catalogue-id="workspace-section-heading"]').waitFor();
  runtimeErrors.length = 0;

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);

    for (const theme of themes) {
      const priorErrorCount = runtimeErrors.length;
      await page.evaluate((nextTheme) => localStorage.setItem("theme", nextTheme), theme);
      await navigate(page, `${baseUrl}/admin/design-system`);
      await page.locator('[data-catalogue-id="workspace-section-heading"]').waitFor();

      const catalogueHeading = await headingSnapshot(
        page,
        '[data-catalogue-id="workspace-section-heading"] .mnx-section-heading',
      );
      const panelBehavior = await verifyPanelBehavior(page);
      const catalogueVerification = await page.evaluate((expectedTheme) => {
        const root = document.documentElement;
        return {
          entries: document.querySelectorAll("[data-catalogue-id]").length,
          errorText:
            document.body.textContent?.includes("Application error") ||
            document.body.textContent?.includes("Internal Server Error") ||
            false,
          overflow: root.scrollWidth > root.clientWidth + 1,
          rootTheme: root.classList.contains(`theme-${expectedTheme}`),
          productionSelectorsInCatalogue: Boolean(
            document.querySelector(".section-heading, .btn, .surface-card"),
          ),
        };
      }, theme);

      await navigate(page, `${baseUrl}/cha`);
      const chaHeadingLocator = page
        .locator(".mnx-section-heading")
        .filter({ hasText: "My Assigned Jobs" })
        .first();
      await chaHeadingLocator.waitFor();
      const chaHeading = await headingSnapshot(
        page,
        '.mnx-section-heading:has-text("My Assigned Jobs")',
      );

      for (const property of computedProperties) {
        if (catalogueHeading.title[property] !== chaHeading.title[property]) {
          throw new Error(
            `${viewport.name} ${theme}: heading ${property} mismatch: ` +
              `${catalogueHeading.title[property]} !== ${chaHeading.title[property]}`,
          );
        }
      }
      for (const property of ["color", "fontSize", "fontWeight", "lineHeight"]) {
        if (catalogueHeading.index[property] !== chaHeading.index[property]) {
          throw new Error(
            `${viewport.name} ${theme}: heading index ${property} mismatch.`,
          );
        }
      }
      for (const property of ["columnGap", "paddingTop", "paddingBottom"]) {
        if (catalogueHeading.container[property] !== chaHeading.container[property]) {
          throw new Error(
            `${viewport.name} ${theme}: heading container ${property} mismatch.`,
          );
        }
      }

      const newErrors = runtimeErrors.slice(priorErrorCount);
      if (
        newErrors.length ||
        catalogueVerification.entries < 19 ||
        catalogueVerification.errorText ||
        catalogueVerification.overflow ||
        !catalogueVerification.rootTheme ||
        catalogueVerification.productionSelectorsInCatalogue ||
        panelBehavior.staticMoved ||
        !panelBehavior.interactiveMoved ||
        !panelBehavior.interactiveFocusVisible
      ) {
        throw new Error(
          `${viewport.name} ${theme} failed: ${JSON.stringify({
            catalogueVerification,
            newErrors,
            panelBehavior,
          })}`,
        );
      }

      await navigate(page, `${baseUrl}/admin/design-system`);
      const screenshotPath = `${outputDirectory}/catalogue-${theme}-${viewport.name}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      results.push({
        catalogueHeading,
        catalogueVerification,
        chaHeading,
        panelBehavior,
        screenshotPath,
        theme,
        viewport: viewport.name,
      });
    }
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  await navigate(page, `${baseUrl}/admin/design-system`);
  const reducedMotion = await page
    .locator('[data-catalogue-id="workspace-panel"] [data-interactive="true"]')
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  if (!reducedMotion.split(",").every((value) => Number.parseFloat(value) <= 0.01)) {
    throw new Error(`Reduced-motion transition is not suppressed: ${reducedMotion}`);
  }

  await writeFile(
    `${outputDirectory}/verification.json`,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        reducedMotion,
        results,
        routes: ["/admin/design-system", "/cha"],
        themes,
        viewports,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `Verified ${results.length} catalogue/CHA heading parity combinations, static and interactive panels, keyboard focus, overflow, themes, and reduced motion.`,
  );
} finally {
  await browser.close();
}

async function headingSnapshot(targetPage, selector) {
  return targetPage.locator(selector).first().evaluate((heading) => {
    const title = heading.querySelector("h2");
    const index = heading.querySelector(".mnx-section-heading-index");
    const nextSurface = heading.nextElementSibling;
    if (!title || !index) throw new Error("Canonical heading anatomy is missing.");
    const titleStyle = getComputedStyle(title);
    const indexStyle = getComputedStyle(index);
    const containerStyle = getComputedStyle(heading);
    const headingBox = heading.getBoundingClientRect();
    const surfaceBox = nextSurface?.getBoundingClientRect();
    return {
      container: {
        columnGap: containerStyle.columnGap,
        paddingBottom: containerStyle.paddingBottom,
        paddingTop: containerStyle.paddingTop,
      },
      descriptionAlignment: getComputedStyle(
        heading.querySelector(".mnx-section-heading-aside") ?? heading,
      ).justifyItems,
      index: {
        color: indexStyle.color,
        fontSize: indexStyle.fontSize,
        fontWeight: indexStyle.fontWeight,
        lineHeight: indexStyle.lineHeight,
      },
      surfaceGap: surfaceBox ? Math.round(surfaceBox.top - headingBox.bottom) : null,
      title: {
        fontFamily: titleStyle.fontFamily,
        fontSize: titleStyle.fontSize,
        fontWeight: titleStyle.fontWeight,
        letterSpacing: titleStyle.letterSpacing,
        lineHeight: titleStyle.lineHeight,
      },
    };
  });
}

async function verifyPanelBehavior(targetPage) {
  const specimen = targetPage.locator('[data-catalogue-id="workspace-panel"]');
  const staticPanel = specimen.locator('[data-interactive="true"]').locator("xpath=preceding-sibling::*[1]");
  const interactivePanel = specimen.locator('[data-interactive="true"]');
  const staticBefore = await staticPanel.evaluate((element) => getComputedStyle(element).transform);
  await staticPanel.hover();
  await targetPage.waitForTimeout(220);
  const staticAfter = await staticPanel.evaluate((element) => getComputedStyle(element).transform);
  const interactiveBefore = await interactivePanel.evaluate(
    (element) => getComputedStyle(element).transform,
  );
  await interactivePanel.hover();
  await targetPage.waitForTimeout(220);
  const interactiveAfter = await interactivePanel.evaluate(
    (element) => getComputedStyle(element).transform,
  );
  await interactivePanel.focus();
  const interactiveFocusVisible = await interactivePanel.evaluate(
    (element) => getComputedStyle(element).outlineStyle !== "none",
  );
  return {
    interactiveFocusVisible,
    interactiveMoved: interactiveBefore !== interactiveAfter,
    staticMoved: staticBefore !== staticAfter,
  };
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
  await targetPage.waitForURL((url) => url.pathname !== "/login", { timeout: 30_000 });
}

async function navigate(targetPage, url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await targetPage.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt === 2 || !message.includes("ERR_ABORTED")) throw error;
      await targetPage.waitForTimeout(250);
    }
  }
}
