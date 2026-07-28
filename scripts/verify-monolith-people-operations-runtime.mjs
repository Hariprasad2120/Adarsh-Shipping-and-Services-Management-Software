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

const outputDirectory = "artifacts/ui-migration/people-operations";
const staticRoutes = [
  "/attendance",
  "/attendance/biometric-sync",
  "/attendance/leaves",
  "/attendance/ot",
  "/attendance/punch",
  "/attendance/reports",
  "/attendance/timesheets",
  "/hrms",
  "/hrms/approvals",
  "/hrms/employees",
  "/hrms/employees/new",
  "/hrms/files",
  "/hrms/helpdesk",
  "/hrms/letters",
  "/hrms/on-duty-admin",
  "/hrms/onboarding",
  "/hrms/org-structure",
  "/hrms/ownership",
  "/hrms/payroll",
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
  "/hrms/reimbursement",
  "/hrms/salary-revisions",
  "/hrms/salary-structure",
  "/hrms/settings",
  "/hrms/tasks",
  "/hrms/tracking",
  "/hrms/travel",
  "/hrms/users",
  "/hrms/work-reports",
];
const themes = ["light", "night", "violet"];
const matrices = [
  {
    name: "desktop",
    width: 1440,
    height: 1000,
    themes,
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
  "/attendance",
  "/attendance/biometric-sync",
  "/attendance/leaves",
  "/attendance/ot",
  "/attendance/punch",
  "/hrms",
  "/hrms/employees",
  "/hrms/recruit/employer/jobs",
]);

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const results = [];

try {
  await login(page);
  const dynamicRoutes = await resolveDynamicRoutes(context);
  const routes = [...staticRoutes, ...dynamicRoutes];

  if (routes.length !== 45) {
    throw new Error(`Expected 45 runtime routes, resolved ${routes.length}.`);
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
          .locator('[data-people-workspace="true"]')
          .waitFor({ state: "visible", timeout: 30_000 });

        const verification = await page.evaluate(() => {
          const root = document.documentElement;
          const shell = document.querySelector(".mnx-dashboard-shell");
          const content = document.querySelector(".mnx-people-content");
          const classNames = [...(content?.querySelectorAll("[class]") ?? [])]
            .map((node) => node.getAttribute("class") ?? "")
            .join(" ");
          const unstandardButtons = content?.querySelectorAll(
            "button:not(.mnx-button):not(.mnx-field-control):not(.mnx-icon-button):not(.mnx-dialog-backdrop):not(.filter-button)",
          ).length;
          const unstandardInputs = content?.querySelectorAll(
            'input:not([type="hidden"]):not(.mnx-field-control):not(.mnx-choice-control):not(.mnx-managed-input):not(.sr-only)',
          ).length;
          const unstandardTables = content?.querySelectorAll(
            "table:not(.mnx-workspace-table)",
          ).length;
          const unstandardButtonDetails = [
            ...(content?.querySelectorAll(
              "button:not(.mnx-button):not(.mnx-field-control):not(.mnx-icon-button):not(.mnx-dialog-backdrop):not(.filter-button)",
            ) ?? []),
          ].map((button) => ({
            className: button.getAttribute("class"),
            text: button.textContent?.trim().slice(0, 80),
          }));

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
            unstandardButtonDetails,
            unstandardInputs: unstandardInputs ?? 0,
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
          route,
          theme,
          viewport: matrix.name,
          durationMs: Date.now() - startedAt,
        });
      }
    }
  }

  await verifyDialog(page);
  await writeFile(
    `${outputDirectory}/verification.json`,
    JSON.stringify(
      {
        checks: results.length,
        completedAt: new Date().toISOString(),
        results,
      },
      null,
      2,
    ),
  );
  console.log(
    `Verified ${results.length} authenticated route/theme/viewport combinations across 45 HRMS and Attendance routes.`,
  );
} finally {
  await browser.close();
}

async function login(targetPage) {
  await targetPage.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
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
  await targetPage.waitForURL((url) => !url.pathname.endsWith("/login"), {
    timeout: 30_000,
  });
}

async function resolveDynamicRoutes(targetContext) {
  const employeeResponse = await targetContext.request.get(
    `${baseUrl}/api/hrms/employees?active=true`,
  );
  if (!employeeResponse.ok()) {
    throw new Error(
      `Employee fixture request failed with ${employeeResponse.status()}.`,
    );
  }
  const employeePayload = await employeeResponse.json();
  const employeeId = employeePayload.data?.[0]?.id;
  if (!employeeId) throw new Error("No employee record is available.");

  const letterResponse = await targetContext.request.get(
    `${baseUrl}/api/hrms/letters`,
  );
  if (!letterResponse.ok()) {
    throw new Error(
      `Letter fixture request failed with ${letterResponse.status()}.`,
    );
  }
  const letterPayload = await letterResponse.json();
  const letterId = letterPayload.data?.[0]?.id;
  if (!letterId) throw new Error("No employee letter record is available.");

  return [`/hrms/employees/${employeeId}`, `/hrms/letters/view/${letterId}`];
}

async function verifyDialog(targetPage) {
  await targetPage.setViewportSize({ width: 1280, height: 900 });
  await targetPage.goto(`${baseUrl}/hrms/work-reports`, {
    waitUntil: "domcontentloaded",
  });
  const trigger = targetPage.getByRole("button", { name: /add daily update/i });
  if ((await trigger.count()) === 0) return;
  await trigger.first().click();
  await targetPage.getByRole("dialog").waitFor({ state: "visible" });
  await targetPage
    .getByRole("dialog")
    .locator(".mnx-dialog-content")
    .waitFor({ state: "visible" });
}
