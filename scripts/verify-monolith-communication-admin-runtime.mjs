import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const useLocalSpecialAccount = process.argv.includes(
  "--use-local-special-account",
);
const baseUrl =
  process.env.UI_TEST_BASE_URL ??
  (useLocalSpecialAccount ? "http://localhost:3000" : undefined);
const email =
  process.env.UI_TEST_EMAIL ??
  (useLocalSpecialAccount ? "hr@adarshshipping.in" : undefined);
const password =
  process.env.UI_TEST_PASSWORD ??
  (useLocalSpecialAccount ? "password@123" : undefined);

if (!baseUrl || !email || !password) {
  throw new Error(
    "UI_TEST_BASE_URL, UI_TEST_EMAIL, and UI_TEST_PASSWORD are required.",
  );
}

const outputDirectory = "artifacts/ui-migration/communication-admin";
const communicationRoutes = [
  "/communication",
  "/communication/calendar",
  "/communication/chat",
  "/communication/drive",
  "/communication/google-chat-live-view",
  "/communication/job-spaces",
  "/communication/mail",
  "/communication/meetings",
  "/communication/search",
  "/communication/settings",
];
const adminRoutes = [
  "/admin",
  "/admin/data-tools",
  "/admin/google-chat",
  "/admin/notifications",
  "/admin/passkeys",
  "/admin/roles",
  "/admin/sessions",
  "/admin/settings",
  "/admin/simulation",
];
const recruitRoutes = [
  "/hrms/recruit",
  "/hrms/recruit/audit",
  "/hrms/recruit/career",
  "/hrms/recruit/career/applications",
  "/hrms/recruit/career/assistant",
  "/hrms/recruit/career/jobs",
  "/hrms/recruit/career/profile",
  "/hrms/recruit/career/resumes",
  "/hrms/recruit/employer",
  "/hrms/recruit/employer/applications",
  "/hrms/recruit/employer/candidates",
  "/hrms/recruit/employer/candidates/new",
  "/hrms/recruit/employer/jobs",
  "/hrms/recruit/employer/jobs/new",
  "/hrms/recruit/settings",
];
const routes = [...communicationRoutes, ...adminRoutes, ...recruitRoutes];
const themes = ["light", "night", "violet"];
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 1024, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];
const screenshotRoutes = new Set([
  "/communication",
  "/communication/chat",
  "/communication/mail",
  "/communication/settings",
  "/admin",
  "/admin/roles",
  "/admin/sessions",
  "/hrms/recruit",
  "/hrms/recruit/employer/jobs",
]);

if (routes.length !== 34 || new Set(routes).size !== 34) {
  throw new Error(`Expected 34 unique runtime routes, resolved ${routes.length}.`);
}

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const results = [];
const runtimeErrors = [];

page.on("pageerror", (error) => runtimeErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") runtimeErrors.push(message.text());
});
page.on("response", (response) => {
  if (response.status() >= 500) {
    runtimeErrors.push(`${response.status()} ${response.url()}`);
  }
});

try {
  await login(page);

  for (const viewport of viewports) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });

    for (const theme of themes) {
      await navigate(page, `${baseUrl}/dashboard`);
      await page.evaluate(
        (nextTheme) => window.localStorage.setItem("theme", nextTheme),
        theme,
      );

      for (const route of routes) {
        const priorErrorCount = runtimeErrors.length;
        const startedAt = Date.now();
        console.log(`Checking ${viewport.name} ${theme} ${route}`);
        await navigate(page, `${baseUrl}${route}`);

        let actualPath = new URL(page.url()).pathname;
        if (actualPath === "/login") {
          await login(page);
          await navigate(page, `${baseUrl}${route}`);
          actualPath = new URL(page.url()).pathname;
        }
        if (actualPath !== route) {
          throw new Error(`${route} redirected to ${actualPath}.`);
        }

        await page
          .locator(`.mnx-dashboard-shell[data-theme="${theme}"]`)
          .waitFor({ state: "visible", timeout: 30_000 });

        const family = route.startsWith("/communication")
          ? "communication"
          : route.startsWith("/admin")
            ? "admin"
            : "recruit";
        const workspaceSelector =
          family === "communication"
            ? '[data-communication-workspace="true"]'
            : family === "admin"
              ? '[data-admin-workspace="true"]'
              : '[data-people-workspace="true"]';
        await page
          .locator(workspaceSelector)
          .waitFor({ state: "visible", timeout: 30_000 });
        const shellSelector = ".mnx-dashboard-shell";
        if ((await page.locator(shellSelector).getAttribute("data-theme")) !== theme) {
          await page.evaluate(
            (nextTheme) => window.localStorage.setItem("theme", nextTheme),
            theme,
          );
          await page.reload({
            waitUntil: "domcontentloaded",
            timeout: 60_000,
          });
          await page
            .locator(`${shellSelector}[data-theme="${theme}"]`)
            .waitFor({ state: "visible", timeout: 30_000 });
          await page
            .locator(workspaceSelector)
            .waitFor({ state: "visible", timeout: 30_000 });
        }

        const verification = await evaluateRoute(page, family);

        const newRuntimeErrors = runtimeErrors
          .slice(priorErrorCount)
          .filter(
            (message) =>
              !message.includes(
                "Failed to load resource: the server responded with a status of 404",
              ) &&
              !message.includes("TypeError: Failed to fetch"),
          );
        const failed =
          verification.errorText ||
          verification.legacyComposition ||
          verification.pageOverflows ||
          verification.theme !== theme ||
          !verification.surface ||
          !verification.text ||
          verification.unstandardButtons > 0 ||
          verification.unstandardInputs > 0 ||
          verification.unstandardSelects > 0 ||
          verification.unstandardTextareas > 0 ||
          verification.unstandardTables > 0 ||
          newRuntimeErrors.length > 0;

        if (failed) {
          throw new Error(
            `${route} ${theme} ${viewport.name} failed: ${JSON.stringify({
              ...verification,
              runtimeErrors: newRuntimeErrors,
            })}`,
          );
        }

        if (screenshotRoutes.has(route)) {
          await page.screenshot({
            path: `${outputDirectory}/${route
              .slice(1)
              .replaceAll("/", "-")}-${theme}-${viewport.name}.png`,
            fullPage: true,
          });
        }
        results.push({
          durationMs: Date.now() - startedAt,
          route,
          theme,
          viewport: viewport.name,
        });
      }
    }
  }

  await writeFile(
    `${outputDirectory}/verification.json`,
    JSON.stringify(
      {
        checks: results.length,
        completedAt: new Date().toISOString(),
        routes,
        themes,
        viewports,
        results,
      },
      null,
      2,
    ),
  );
  console.log(
    `Verified ${results.length} authenticated Communication, Admin, and Recruit route/theme/viewport combinations across 34 routes.`,
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

async function evaluateRoute(targetPage, family) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await targetPage.evaluate((currentFamily) => {
        const root = document.documentElement;
        const shell = document.querySelector(".mnx-dashboard-shell");
        const content = document.querySelector(
          currentFamily === "communication"
            ? ".mnx-communication-content"
            : currentFamily === "admin"
              ? ".mnx-admin-content"
              : ".mnx-people-content",
        );
        const classNames = [...(content?.querySelectorAll("[class]") ?? [])]
          .map((node) => node.getAttribute("class") ?? "")
          .join(" ");
        const strict = currentFamily !== "recruit";

        return {
          errorText:
            document.body.textContent?.includes("Application error") ||
            document.body.textContent?.includes("Internal Server Error") ||
            false,
          legacyComposition:
            strict && /\bmonolith-[a-z0-9_-]+/.test(classNames),
          pageOverflows: root.scrollWidth > root.clientWidth + 1,
          surface: getComputedStyle(root)
            .getPropertyValue("--mn-color-surface")
            .trim(),
          text: getComputedStyle(root)
            .getPropertyValue("--mn-color-text")
            .trim(),
          theme: shell?.getAttribute("data-theme"),
          unstandardButtons: strict
            ? (content?.querySelectorAll(
                "button:not(.mnx-button):not(.mnx-dialog-backdrop):not(.mnx-select-trigger)",
              ).length ?? 0)
            : 0,
          unstandardInputs: strict
            ? (content?.querySelectorAll(
                'input:not([type="hidden"]):not([type="file"]):not(.mnx-field-control):not(.mnx-choice-control):not(.mnx-managed-input)',
              ).length ?? 0)
            : 0,
          unstandardSelects: strict
            ? (content?.querySelectorAll(
                "select:not(.mnx-field-control):not(.hidden)",
              ).length ?? 0)
            : 0,
          unstandardTextareas: strict
            ? (content?.querySelectorAll("textarea:not(.mnx-field-control)")
                .length ?? 0)
            : 0,
          unstandardTables: strict
            ? (content?.querySelectorAll("table:not(.mnx-workspace-table)")
                .length ?? 0)
            : 0,
        };
      }, family);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        attempt === 2 ||
        !message.includes("Execution context was destroyed")
      ) {
        throw error;
      }
      await targetPage.waitForLoadState("domcontentloaded");
      await targetPage.waitForTimeout(250);
    }
  }
  throw new Error("Unable to evaluate the route.");
}
