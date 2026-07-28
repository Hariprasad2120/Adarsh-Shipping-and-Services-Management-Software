import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const useLocalSpecialAccount = process.argv.includes(
  "--use-local-special-account",
);
const baseUrl =
  process.env.UI_TEST_BASE_URL ??
  (useLocalSpecialAccount ? "http://localhost:3000" : undefined);
const loginBaseUrl = process.env.UI_TEST_LOGIN_BASE_URL ?? baseUrl;
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

const outputDirectory = "artifacts/ui-migration/performance-learning";
const staticRoutes = [
  "/ams",
  "/ams/appraisals",
  "/ams/assets",
  "/ams/criteria",
  "/ams/cycles",
  "/ams/extensions",
  "/ams/history",
  "/ams/kpi",
  "/ams/my-appraisal",
  "/ams/my-reviews",
  "/ams/pms",
  "/ams/slabs",
  "/lms",
  "/lms/assignments",
  "/lms/courses",
  "/lms/my-learning",
  "/lms/reports",
];
const matrices = [
  {
    name: "desktop",
    width: 1440,
    height: 1000,
    themes: ["light", "night", "violet"],
  },
  {
    name: "tablet",
    width: 1024,
    height: 900,
    themes: ["violet"],
  },
  {
    name: "mobile",
    width: 390,
    height: 844,
    themes: ["light"],
  },
];
const screenshotRoutes = new Set([
  "/ams",
  "/ams/appraisals",
  "/ams/criteria",
  "/ams/assets",
  "/ams/pms",
  "/lms",
]);

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const results = [];

try {
  await login(page);
  const dynamicRouteResolution = await resolveDynamicRoutes(page, context);
  const routes = [...staticRoutes, ...dynamicRouteResolution.routes];
  const fallbackRouteSet = new Set(dynamicRouteResolution.fallbackRoutes);

  if (routes.length !== 23) {
    throw new Error(`Expected 23 runtime routes, resolved ${routes.length}.`);
  }

  for (const matrix of matrices) {
    await page.setViewportSize({
      width: matrix.width,
      height: matrix.height,
    });

    for (const theme of matrix.themes) {
      await page.goto(`${baseUrl}/dashboard`, {
        waitUntil: "domcontentloaded",
      });
      await page.evaluate((nextTheme) => {
        window.localStorage.setItem("theme", nextTheme);
      }, theme);

      for (const route of routes) {
        const startedAt = Date.now();
        console.log(`Checking ${matrix.name} ${theme} ${route}`);
        await page.goto(`${baseUrl}${route}`, {
          waitUntil: "domcontentloaded",
          timeout: 45_000,
        });

        const actualPath = new URL(page.url()).pathname;
        if (actualPath !== route) {
          throw new Error(`${route} redirected to ${actualPath}.`);
        }

        await page
          .locator(`.mnx-dashboard-shell[data-theme="${theme}"]`)
          .waitFor({ state: "visible", timeout: 30_000 });
        await page
          .locator(
            fallbackRouteSet.has(route)
              ? ".mnx-workspace-state-danger"
              : '[data-performance-workspace="true"]',
          )
          .waitFor({ state: "visible", timeout: 30_000 });
        if (!fallbackRouteSet.has(route)) {
          await page
            .locator(".mnx-workspace-state-loading")
            .waitFor({ state: "hidden", timeout: 30_000 });
        }

        const verification = await page.evaluate(() => {
          const root = document.documentElement;
          const shell = document.querySelector(".mnx-dashboard-shell");
          const content =
            document.querySelector(".mnx-performance-content") ??
            document.querySelector(".mnx-workspace-state");
          const classNames = [...(content?.querySelectorAll("[class]") ?? [])]
            .map((node) => node.getAttribute("class") ?? "")
            .join(" ");
          const unstandardButtons = content?.querySelectorAll(
            "button:not(.mnx-button):not(.mnx-field-control):not(.mnx-icon-button):not(.mnx-dialog-backdrop):not(.filter-button)",
          ).length;
          const unstandardInputs = content?.querySelectorAll(
            'input:not([type="hidden"]):not(.mnx-field-control):not(.mnx-choice-control):not(.mnx-range-control):not(.mnx-managed-input):not(.sr-only)',
          ).length;
          const unstandardSelects = content?.querySelectorAll(
            "select:not(.mnx-field-control)",
          ).length;
          const unstandardTextareas = content?.querySelectorAll(
            "textarea:not(.mnx-field-control)",
          ).length;
          const unstandardTables = content?.querySelectorAll(
            "table:not(.mnx-workspace-table)",
          ).length;

          return {
            errorText:
              document.body.textContent?.includes("Application error") ?? false,
            legacyComposition: /\bmonolith-[a-z0-9_-]+/.test(classNames),
            pageOverflows: root.scrollWidth > root.clientWidth + 1,
            surface: getComputedStyle(root)
              .getPropertyValue("--mn-color-surface")
              .trim(),
            text: getComputedStyle(root)
              .getPropertyValue("--mn-color-text")
              .trim(),
            theme: shell?.getAttribute("data-theme"),
            unstandardButtons: unstandardButtons ?? 0,
            unstandardInputs: unstandardInputs ?? 0,
            unstandardSelects: unstandardSelects ?? 0,
            unstandardTextareas: unstandardTextareas ?? 0,
            unstandardTables: unstandardTables ?? 0,
          };
        });

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
          verification.unstandardTables > 0;

        if (failed) {
          throw new Error(
            `${route} ${theme} ${matrix.name} failed: ${JSON.stringify(
              verification,
            )}`,
          );
        }

        if (
          screenshotRoutes.has(route) &&
          (matrix.name === "desktop" || theme === "light")
        ) {
          const name = route.slice(1).replaceAll("/", "-");
          await page.screenshot({
            path: `${outputDirectory}/${name}-${theme}-${matrix.name}.png`,
            fullPage: true,
          });
        }

        results.push({
          durationMs: Date.now() - startedAt,
          route,
          theme,
          viewport: matrix.name,
        });
      }
    }
  }

  await verifyNonMutatingInteractions(page);
  await writeFile(
    `${outputDirectory}/verification.json`,
    JSON.stringify(
      {
        checks: results.length,
        completedAt: new Date().toISOString(),
        dynamicRouteResolution,
        results,
      },
      null,
      2,
    ),
  );
  console.log(
    `Verified ${results.length} authenticated route/theme/viewport combinations across 23 AMS and LMS routes.`,
  );
} finally {
  await browser.close();
}

async function login(targetPage) {
  const attempts = 3;
  let lastFailure;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await targetPage.goto(`${loginBaseUrl}/login`, {
        timeout: 30_000,
        waitUntil: "domcontentloaded",
      });

      if (!targetPage.url().endsWith("/login")) {
        return;
      }

      await targetPage.waitForFunction(
        () => {
          const submitButton = document.querySelector('button[type="submit"]');
          return Boolean(
            submitButton &&
            Object.keys(submitButton).some((key) =>
              key.startsWith("__reactProps$"),
            ),
          );
        },
        { timeout: 30_000 },
      );
      await targetPage.locator('input[name="email"]').fill(email);
      await targetPage.locator('input[name="password"]').fill(password);
      await targetPage.locator('button[type="submit"]').click({
        noWaitAfter: true,
      });
      await targetPage.waitForFunction(
        () => window.location.pathname !== "/login",
        { timeout: 30_000 },
      );
      return;
    } catch (error) {
      const message = await targetPage
        .locator("#login-message")
        .textContent()
        .catch(() => null);
      lastFailure = new Error(
        `Login attempt ${attempt}/${attempts} failed${
          message ? `: ${message.trim()}` : ""
        }. ${error instanceof Error ? error.message : String(error)}`,
      );

      if (attempt < attempts) {
        await targetPage.context().clearCookies();
      }
    }
  }

  throw lastFailure;
}

async function getJson(request, route) {
  const response = await request.get(`${baseUrl}${route}`);
  if (!response.ok()) {
    throw new Error(
      `${route} fixture request failed with ${response.status()}.`,
    );
  }
  return response.json();
}

async function resolveDynamicRoutes(targetPage, targetContext) {
  const [mePayload, employeePayload, appraisalPayload] = await Promise.all([
    getJson(targetContext.request, "/api/hrms/me"),
    getJson(targetContext.request, "/api/hrms/employees?active=true"),
    getJson(targetContext.request, "/api/ams/appraisals"),
  ]);
  const currentUserId = mePayload.data?.user?.id ?? mePayload.data?.id;
  const employeeId = employeePayload.data?.[0]?.id;
  const appraisals = Array.isArray(appraisalPayload)
    ? appraisalPayload
    : (appraisalPayload.data ?? []);

  if (!currentUserId)
    throw new Error("Current employee fixture is unavailable.");
  if (!employeeId) throw new Error("No employee fixture is available.");

  const detailAppraisal =
    appraisals.find((appraisal) => appraisal.stage !== "DUE_NOTIFIED") ??
    appraisals[0];
  const managementAppraisal = appraisals.find((appraisal) => {
    if (appraisal.stage !== "MANAGEMENT_REVIEW") return false;
    const claim = appraisal.reviewers?.find(
      (reviewer) => reviewer.kind === "MANAGEMENT",
    );
    return !claim || claim.userId === currentUserId;
  });
  const reviewAppraisal = appraisals.find((appraisal) =>
    appraisal.reviewers?.some(
      (reviewer) =>
        reviewer.userId === currentUserId && reviewer.kind !== "MANAGEMENT",
    ),
  );

  const selfCandidates = appraisals.filter(
    (appraisal) => appraisal.employee?.id === currentUserId,
  );
  let selfAppraisal;
  for (const appraisal of selfCandidates) {
    const payload = await getJson(
      targetContext.request,
      `/api/ams/appraisals/${appraisal.id}`,
    );
    if (
      payload.data?.stage === "SELF_ASSESSMENT_OPEN" ||
      payload.data?.selfAssessment
    ) {
      selfAppraisal = appraisal;
      break;
    }
  }

  await targetPage.goto(`${baseUrl}/ams/assets`, {
    waitUntil: "domcontentloaded",
  });
  const assetHref = await targetPage
    .locator('a[href^="/ams/assets/"]')
    .first()
    .getAttribute("href")
    .catch(() => null);

  const fallbackId = "runtime-fixture-unavailable";
  const resolution = {
    appraisalDetail: detailAppraisal ? "record" : "not-found boundary",
    appraisalManagement: managementAppraisal ? "record" : "not-found boundary",
    appraisalReview: reviewAppraisal ? "record" : "not-found boundary",
    asset: assetHref ? "record" : "not-found boundary",
    selfAssessment: selfAppraisal ? "record" : "not-found boundary",
  };

  const routes = [
    `/ams/appraisals/${detailAppraisal?.id ?? fallbackId}`,
    `/ams/appraisals/${managementAppraisal?.id ?? fallbackId}/management-review`,
    `/ams/appraisals/assign/${employeeId}`,
    assetHref ?? `/ams/assets/${fallbackId}`,
    `/ams/my-appraisal/${selfAppraisal?.id ?? fallbackId}/self-assessment`,
    `/ams/my-reviews/${reviewAppraisal?.id ?? fallbackId}`,
  ];
  const fallbackRoutes = routes.filter((route) => route.includes(fallbackId));

  return {
    fallbackRoutes,
    fixtureResolution: resolution,
    routes,
  };
}

async function verifyNonMutatingInteractions(targetPage) {
  await targetPage.setViewportSize({ width: 1280, height: 900 });
  await targetPage.goto(`${baseUrl}/ams/pms`, {
    waitUntil: "domcontentloaded",
  });
  const skillsTab = targetPage.getByRole("tab", { name: /skills matrix/i });
  await skillsTab.click();
  if ((await skillsTab.getAttribute("aria-selected")) !== "true") {
    throw new Error("PMS skills tab did not become active.");
  }
  const feedbackTab = targetPage.getByRole("tab", {
    name: /feedback journal/i,
  });
  await feedbackTab.click();
  const feedbackTrigger = targetPage.getByRole("button", {
    name: /give feedback/i,
  });
  if ((await feedbackTrigger.count()) > 0) {
    await feedbackTrigger.click();
    await targetPage
      .locator("#pms-feedback-content")
      .waitFor({ state: "visible" });
    await targetPage.getByRole("button", { name: "Cancel" }).click();
  }

  await targetPage.goto(`${baseUrl}/lms`, { waitUntil: "domcontentloaded" });
  await targetPage
    .locator(".mnx-performance-summary-grid")
    .waitFor({ state: "visible" });
}
