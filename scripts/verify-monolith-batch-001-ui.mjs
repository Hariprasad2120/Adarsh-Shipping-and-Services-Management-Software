import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.UI_TEST_BASE_URL;
const email = process.env.UI_TEST_EMAIL;
const password = process.env.UI_TEST_PASSWORD;
const verificationMode = process.env.UI_TEST_MODE ?? "full";

if (!baseUrl || !email || !password) {
  throw new Error(
    "UI_TEST_BASE_URL, UI_TEST_EMAIL, and UI_TEST_PASSWORD are required.",
  );
}

const outputDirectory = "artifacts/ui-migration/batch-001";
const routes = [
  {
    path: "/product-catalogue",
    name: "product-catalogue",
    ready: ".mnx-catalogue-page",
  },
  { path: "/todo", name: "todo", ready: ".mnx-todo-list, .mnx-panel-state" },
  {
    path: "/notifications",
    name: "notifications",
    ready: ".mnx-notification-list, .mnx-panel-state",
  },
];
const allThemes = ["light", "night", "violet"];
const allViewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 1024, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];
const requestedThemes = process.env.UI_TEST_THEMES?.split(",").filter(Boolean);
const requestedViewports = process.env.UI_TEST_VIEWPORTS?.split(",").filter(Boolean);
const themes = requestedThemes?.length
  ? allThemes.filter((theme) => requestedThemes.includes(theme))
  : allThemes;
const viewports = requestedViewports?.length
  ? allViewports.filter((viewport) => requestedViewports.includes(viewport.name))
  : allViewports;

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
let authenticated = false;

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const submitButton = document.querySelector('button[type="submit"]');
    return Boolean(
      submitButton
      && Object.keys(submitButton).some((key) => key.startsWith("__reactProps$")),
    );
  });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), {
    timeout: 30000,
  });
  authenticated = true;

  if (process.env.UI_TEST_SKIP_INTERACTIONS !== "true") {
    await verifyInteractions(page, baseUrl);
  }

  if (verificationMode === "interactions") {
    process.exitCode = 0;
  } else {
  for (const viewport of viewports) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });

    for (const theme of themes) {
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
      await page.evaluate((nextTheme) => {
        window.localStorage.setItem("theme", nextTheme);
      }, theme);

      for (const route of routes) {
        await page.goto(`${baseUrl}${route.path}`, {
          waitUntil: "domcontentloaded",
        });
        if (new URL(page.url()).pathname !== route.path) {
          throw new Error(
            `${route.path} redirected to ${new URL(page.url()).pathname}`,
          );
        }

        await ensureTheme(page, theme);
        await page
          .locator(`.mnx-dashboard-shell[data-theme="${theme}"]`)
          .waitFor({ state: "visible" });
        await page.locator(route.ready).first().waitFor({ state: "visible" });

        const verification = await page.evaluate(() => {
          const root = document.documentElement;
          const shell = document.querySelector(".mnx-dashboard-shell");
          const classNames = [...document.querySelectorAll("[class]")]
            .map((node) => node.getAttribute("class") ?? "")
            .join(" ");
          return {
            legacyComposition:
              classNames.includes("monolith-shell-lg")
              || classNames.includes("monolith-card")
              || classNames.includes("monolith-table"),
            pageOverflows:
              root.scrollWidth > root.clientWidth + 1,
            surface: getComputedStyle(root).getPropertyValue("--mn-color-surface").trim(),
            text: getComputedStyle(root).getPropertyValue("--mn-color-text").trim(),
            theme: shell?.getAttribute("data-theme"),
          };
        });

        if (
          verification.legacyComposition
          || verification.pageOverflows
          || verification.theme !== theme
          || !verification.surface
          || !verification.text
        ) {
          throw new Error(
            `${route.path} ${theme} ${viewport.name} failed: `
              + JSON.stringify(verification),
          );
        }

        await page.screenshot({
          path: `${outputDirectory}/${route.name}-${theme}-${viewport.name}.png`,
          fullPage: true,
        });
      }

      await verifyProfile(page, outputDirectory, theme, viewport.name);
      await verifyCommonStates(page, outputDirectory, theme, viewport.name);
    }
  }
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

async function verifyProfile(targetPage, directory, theme, viewportName) {
  await targetPage.locator(".mnx-topbar-avatar").click();
  const popover = targetPage.locator(".mnx-profile-popover");
  await popover.waitFor({ state: "visible" });
  await popover.getByRole("menuitem", { name: /Security & sessions/i }).waitFor();
  await popover.getByRole("menuitem", { name: /Sign out/i }).waitFor();

  const overflow = await targetPage.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  if (overflow) {
    throw new Error(`Profile ${theme} ${viewportName} overflows horizontally`);
  }

  await targetPage.screenshot({
    path: `${directory}/user-profile-${theme}-${viewportName}.png`,
    fullPage: false,
  });
  await targetPage.locator(".mnx-topbar-avatar").click();
}

async function verifyCommonStates(targetPage, directory, theme, viewportName) {
  const statePage = await targetPage.context().newPage();
  await statePage.setViewportSize(await targetPage.viewportSize());
  await statePage.goto(targetPage.url(), { waitUntil: "domcontentloaded" });
  await statePage
    .locator(`.mnx-dashboard-shell[data-theme="${theme}"]`)
    .waitFor({ state: "visible" });
  await statePage.evaluate(() => {
    const main = document.querySelector(".mnx-dashboard-main");
    if (!main) throw new Error("Monolith dashboard main not found");
    main.innerHTML = `
      <div class="mnx-dashboard-page mnx-workspace-page">
        <section class="mnx-workspace-state mnx-workspace-state-permission">
          <span class="mnx-workspace-state-icon">!</span>
          <p class="mnx-dashboard-spec-label">PERMISSION REQUIRED</p>
          <h1>Permission denied</h1>
          <p>Ask an administrator for access to this workspace.</p>
        </section>
        <section class="mnx-workspace-state mnx-workspace-state-empty">
          <span class="mnx-workspace-state-icon">○</span>
          <p class="mnx-dashboard-spec-label">NOTHING HERE YET</p>
          <h1>No records found</h1>
          <p>Create the first record or adjust the current filters.</p>
        </section>
        <section class="mnx-workspace-state mnx-workspace-state-loading">
          <span class="mnx-workspace-state-icon">↻</span>
          <p class="mnx-dashboard-spec-label">LOADING WORKSPACE</p>
          <h1>Preparing your workspace</h1>
          <p>Loading the latest records and permissions.</p>
        </section>
        <section class="mnx-workspace-state mnx-workspace-state-danger">
          <span class="mnx-workspace-state-icon">×</span>
          <p class="mnx-dashboard-spec-label">WORKSPACE UNAVAILABLE</p>
          <h1>We couldn’t load this page</h1>
          <p>Your data is safe. Retry the request to continue.</p>
        </section>
      </div>
    `;
  });

  const overflow = await statePage.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  if (overflow) {
    throw new Error(`Common states ${theme} ${viewportName} overflow horizontally`);
  }

  await statePage.screenshot({
    path: `${directory}/common-states-${theme}-${viewportName}.png`,
    fullPage: true,
  });
  await statePage.close();
}

async function verifyInteractions(targetPage, targetBaseUrl) {
  await targetPage.setViewportSize({ width: 1280, height: 900 });
  await targetPage.goto(`${targetBaseUrl}/product-catalogue`, {
    waitUntil: "domcontentloaded",
  });
  await waitForReactHydration(targetPage, "#catalogue-search");
  await targetPage.locator("#catalogue-search").fill("no-module-matches-this");
  await targetPage.getByRole("heading", { name: "No modules found" }).waitFor();
  await targetPage.locator("#catalogue-search").fill("");
  await targetPage
    .locator(".mnx-catalogue-module-card")
    .first()
    .click();
  await targetPage.getByRole("button", { name: "Blueprint" }).click();
  await targetPage.locator(".mnx-catalogue-blueprint").waitFor();

  await targetPage.goto(`${targetBaseUrl}/todo`, {
    waitUntil: "domcontentloaded",
  });
  await waitForReactHydration(targetPage, 'button[aria-label="Open profile menu"]');
  await targetPage.getByRole("button", { name: "Create task" }).click();
  await targetPage.getByRole("dialog").waitFor();
  await targetPage.locator(".mnx-checkbox").first().waitFor();
  await targetPage.locator("#task-title").fill("Visual verification draft");
  await targetPage.getByRole("button", { name: "Cancel" }).click();
  await targetPage.getByRole("dialog").waitFor({ state: "detached" });
  if (await targetPage.locator(".mnx-todo-summary").count()) {
    await targetPage.locator(".mnx-todo-summary").first().click();
    await targetPage.locator(".mnx-todo-detail").first().waitFor();
  }

  await targetPage.goto(`${targetBaseUrl}/notifications`, {
    waitUntil: "domcontentloaded",
  });
  await waitForReactHydration(targetPage, 'button[aria-label="Open profile menu"]');
  await targetPage.locator("#notification-status").selectOption("unread");
  await targetPage.locator("#notification-ack").selectOption("yes");
  await targetPage.getByRole("button", { name: "Apply filters" }).waitFor();
}

async function waitForReactHydration(targetPage, selector) {
  await targetPage.waitForFunction((targetSelector) => {
    const element = document.querySelector(targetSelector);
    return Boolean(
      element
      && Object.keys(element).some((key) => key.startsWith("__reactProps$")),
    );
  }, selector);
}

async function ensureTheme(targetPage, theme) {
  const selector = `.mnx-theme-picker button[title="${theme[0].toUpperCase()}${theme.slice(1)} theme"]`;
  await waitForReactHydration(targetPage, selector);
  if (
    await targetPage
      .locator(`.mnx-dashboard-shell[data-theme="${theme}"]`)
      .count()
  ) {
    return;
  }
  await targetPage.locator(selector).click();
  await targetPage
    .locator(`.mnx-dashboard-shell[data-theme="${theme}"]`)
    .waitFor({ state: "visible" });
}
