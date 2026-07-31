import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import {
  assertLocalUiServerReady,
  getLocalUiBaseUrl,
} from "./local-ui-target.mjs";

const baseUrl = getLocalUiBaseUrl();
const email = process.env.UI_TEST_EMAIL;
const password = process.env.UI_TEST_PASSWORD;
const portalEmail = process.env.PORTAL_TEST_EMAIL;
const portalPassword = process.env.PORTAL_TEST_PASSWORD;

if (!email || !password || !portalEmail || !portalPassword) {
  throw new Error(
    "UI_TEST_EMAIL, UI_TEST_PASSWORD, PORTAL_TEST_EMAIL, and PORTAL_TEST_PASSWORD are required for the normal localhost:3000 application.",
  );
}
await assertLocalUiServerReady(baseUrl);

const outputDirectory = "artifacts/ui-migration/final-runtime";
const authenticatedRoutes = [
  { module: "Dashboard", route: "/dashboard" },
  { module: "Account", route: "/account/security" },
  { module: "Accounting", route: "/accounting/accounts" },
  { module: "Admin", route: "/admin/design-system" },
  { module: "AMS", route: "/ams" },
  { module: "Attendance", route: "/attendance" },
  { module: "CHA", route: "/cha/jobs" },
  { module: "Communication", route: "/communication" },
  { module: "CRM", route: "/crm/leads" },
  { module: "Expense", route: "/expense" },
  { module: "HRMS", route: "/hrms/employees" },
  { module: "LMS", route: "/lms" },
  { module: "Notifications", route: "/notifications" },
  { module: "Product catalogue", route: "/product-catalogue" },
  { module: "Todo", route: "/todo" },
];
const portalRoutes = [
  "/customer-portal/dashboard",
  "/customer-portal/shipments",
  "/customer-portal/approvals",
  "/customer-portal/kyc",
  "/customer-portal/notifications",
];
const publicRoutes = [
  "/login",
  "/setup",
  "/invite/employee?token=final-ui-audit-invalid",
  "/invite/employee/ready",
  "/verify/final-ui-audit-invalid",
  "/google-chat-link?token=final-ui-audit-invalid",
];
const matrices = [
  {
    name: "desktop",
    width: 1440,
    height: 1000,
    themes: ["violet"],
  },
  { name: "mobile", width: 390, height: 844, themes: ["violet"] },
];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  const authenticatedContext = await browser.newContext();
  const authenticatedPage = await authenticatedContext.newPage();
  await login(authenticatedPage, email, password);
  await verifyRootRedirect(authenticatedPage);

  for (const matrix of matrices) {
    await authenticatedPage.setViewportSize(matrix);
    for (const theme of matrix.themes) {
      await setTheme(authenticatedPage, theme, "/dashboard");
      for (const entry of authenticatedRoutes) {
        await verifyRoute({
          expectedPath: entry.route,
          kind: "authenticated",
          matrix,
          module: entry.module,
          page: authenticatedPage,
          route: entry.route,
          theme,
        });
      }
    }
  }
  await verifyThemeSmoke({
    kind: "authenticated",
    module: "Dashboard",
    page: authenticatedPage,
    routes: ["/dashboard", "/admin/design-system"],
  });
  await authenticatedContext.close();

  const portalContext = await browser.newContext();
  const portalPage = await portalContext.newPage();
  await portalLogin(portalPage);

  for (const matrix of matrices) {
    await portalPage.setViewportSize(matrix);
    for (const theme of matrix.themes) {
      await setTheme(portalPage, theme, "/customer-portal/dashboard");
      for (const route of portalRoutes) {
        await verifyRoute({
          expectedPath: route,
          kind: "portal",
          matrix,
          module: "Customer portal",
          page: portalPage,
          route,
          theme,
        });
      }
    }
  }
  await verifyThemeSmoke({
    kind: "portal",
    module: "Customer portal",
    page: portalPage,
    routes: ["/customer-portal/dashboard"],
  });
  await portalContext.close();

  const publicContext = await browser.newContext();
  const publicPage = await publicContext.newPage();
  for (const matrix of matrices) {
    await publicPage.setViewportSize(matrix);
    for (const theme of matrix.themes) {
      for (const route of publicRoutes) {
        await setTheme(publicPage, theme, "/login");
        await verifyRoute({
          expectedPath: new URL(route, baseUrl).pathname,
          kind: "public",
          matrix,
          module: "Public and authentication",
          page: publicPage,
          route,
          theme,
        });
      }
    }
  }
  await verifyThemeSmoke({
    kind: "public",
    module: "Public and authentication",
    page: publicPage,
    routes: ["/login"],
  });
  await publicContext.close();

  const report = {
    checks: results.length,
    completedAt: new Date().toISOString(),
    modules: [...new Set(results.map(({ module }) => module))],
    results,
  };
  await writeFile(
    `${outputDirectory}/verification.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(
    `Verified ${results.length} route/theme/viewport combinations across ${report.modules.length} module families.`,
  );
} finally {
  await browser.close();
}

async function login(page, loginEmail, loginPassword) {
  await page.goto(`${baseUrl}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.locator("[data-monolith-login]").waitFor({
    state: "visible",
    timeout: 60_000,
  });
  await page.locator('input[name="email"]').fill(loginEmail);
  await page.locator('input[name="password"]').fill(loginPassword);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname === "/dashboard", {
    timeout: 60_000,
  });
}

async function portalLogin(page) {
  await page.goto(`${baseUrl}/customer-portal/login`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.locator(".mnx-customer-portal-auth").waitFor({
    state: "visible",
    timeout: 60_000,
  });
  await page.locator('input[type="email"]').fill(portalEmail);
  await page.locator('input[type="password"]').fill(portalPassword);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(
    (url) => url.pathname === "/customer-portal/dashboard",
    {
      timeout: 60_000,
    },
  );
}

async function verifyRootRedirect(page) {
  await page.goto(`${baseUrl}/`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForURL((url) => url.pathname === "/dashboard", {
    timeout: 60_000,
  });
}

async function setTheme(page, theme, stagingRoute) {
  await page.goto(`${baseUrl}${stagingRoute}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.evaluate((nextTheme) => {
    window.localStorage.setItem("theme", nextTheme);
  }, theme);
}

async function verifyThemeSmoke({ kind, module, page, routes }) {
  const matrix = {
    name: "desktop-theme-smoke",
    width: 1440,
    height: 1000,
  };
  await page.setViewportSize(matrix);

  for (const theme of ["light", "night"]) {
    for (const route of routes) {
      const stagingRoute =
        kind === "portal" ? "/customer-portal/dashboard" : "/dashboard";
      await setTheme(page, theme, kind === "public" ? "/login" : stagingRoute);
      await verifyRoute({
        expectedPath: route,
        kind,
        matrix,
        module,
        page,
        route,
        theme,
      });
    }
  }
}

async function verifyRoute({
  expectedPath,
  kind,
  matrix,
  module,
  page,
  route,
  theme,
}) {
  const serverErrors = [];
  const pageErrors = [];
  const onPageError = (error) => pageErrors.push(error.message);
  const onResponse = (response) => {
    if (response.status() >= 500) {
      serverErrors.push(`${response.status()} ${response.url()}`);
    }
  };
  page.on("pageerror", onPageError);
  page.on("response", onResponse);

  const startedAt = Date.now();
  try {
    console.log(`[${matrix.name}] [${theme}] ${kind}: ${route}`);
    await page.goto(`${baseUrl}${route}`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await page.waitForFunction(
      (expectedTheme) =>
        document.documentElement.classList.contains(`theme-${expectedTheme}`),
      theme,
      { timeout: 30_000 },
    );

    const actualPath = new URL(page.url()).pathname;
    if (actualPath !== expectedPath) {
      throw new Error(`${route} redirected to ${actualPath}.`);
    }

    const shellSelector =
      kind === "authenticated"
        ? ".mnx-dashboard-shell"
        : kind === "portal"
          ? ".mnx-customer-portal-shell"
          : ".mnx-public-shell, [data-monolith-login]";
    await page.locator(shellSelector).first().waitFor({
      state: "visible",
      timeout: 60_000,
    });
    if (kind === "authenticated") {
      await page.waitForFunction(
        (expectedTheme) =>
          document
            .querySelector(".mnx-dashboard-shell")
            ?.getAttribute("data-theme") === expectedTheme,
        theme,
        { timeout: 30_000 },
      );
    }
    if (kind === "portal") {
      await page.waitForFunction(
        (expectedTheme) =>
          document.documentElement.dataset.dashboardTheme === expectedTheme,
        theme,
        { timeout: 30_000 },
      );
    }

    const verification = await page.evaluate(
      ({ expectedKind, expectedTheme, isMobile }) => {
        const root = document.documentElement;
        const body = document.body;
        const shell =
          document.querySelector(".mnx-dashboard-shell") ??
          document.querySelector(".mnx-customer-portal-shell") ??
          document.querySelector(".mnx-public-shell") ??
          document.querySelector("[data-monolith-login]");
        const mobileNavigation =
          expectedKind === "portal"
            ? document.querySelector(".mnx-customer-portal-mobile-nav")
            : document.querySelector(".mnx-mobile-menu");
        const hasApplicationError =
          body.textContent?.includes("Application error") ||
          body.textContent?.includes("Internal Server Error");
        const rootScrolls =
          root.scrollHeight > window.innerHeight + 2 ||
          body.scrollHeight > window.innerHeight + 2;

        return {
          applicationError: Boolean(hasApplicationError),
          dashboardTheme: root.dataset.dashboardTheme ?? null,
          horizontalOverflow:
            root.scrollWidth > root.clientWidth + 1 ||
            body.scrollWidth > body.clientWidth + 1,
          mobileNavigationVisible:
            !isMobile ||
            expectedKind === "public" ||
            (mobileNavigation !== null &&
              getComputedStyle(mobileNavigation).display !== "none"),
          rootDoubleScroll: expectedKind !== "public" && rootScrolls,
          shellTheme: shell?.getAttribute("data-theme") ?? null,
          themeClass: root.classList.contains(`theme-${expectedTheme}`),
          tokenSurface: getComputedStyle(root)
            .getPropertyValue("--mn-color-surface")
            .trim(),
          tokenText: getComputedStyle(root)
            .getPropertyValue("--mn-color-text")
            .trim(),
        };
      },
      {
        expectedKind: kind,
        expectedTheme: theme,
        isMobile: matrix.name === "mobile",
      },
    );

    if (
      verification.applicationError ||
      verification.horizontalOverflow ||
      !verification.mobileNavigationVisible ||
      verification.rootDoubleScroll ||
      !verification.themeClass ||
      !verification.tokenSurface ||
      !verification.tokenText ||
      pageErrors.length > 0 ||
      serverErrors.length > 0
    ) {
      throw new Error(
        `${route} ${theme} ${matrix.name} failed: ${JSON.stringify({
          pageErrors,
          serverErrors,
          verification,
        })}`,
      );
    }

    if (kind === "authenticated" && verification.shellTheme !== theme) {
      throw new Error(
        `${route} ${theme} ${matrix.name} shell theme was ${verification.shellTheme}.`,
      );
    }
    if (kind === "portal" && verification.dashboardTheme !== theme) {
      throw new Error(
        `${route} ${theme} ${matrix.name} portal theme was ${verification.dashboardTheme}.`,
      );
    }
    if (
      route === "/admin/design-system" &&
      (await page.locator('[data-production-catalogue="true"]').count()) !== 1
    ) {
      throw new Error(
        "Admin Design System did not render its production catalogue.",
      );
    }

    if (
      matrix.name === "desktop" &&
      theme === "violet" &&
      [
        "/dashboard",
        "/admin/design-system",
        "/customer-portal/dashboard",
        "/login",
      ].includes(expectedPath)
    ) {
      const fileName =
        expectedPath.replace(/^\/+/, "").replaceAll("/", "-") || "root";
      await page.screenshot({
        path: `${outputDirectory}/${fileName}-${theme}-${matrix.name}.png`,
        fullPage: true,
      });
    }

    results.push({
      durationMs: Date.now() - startedAt,
      kind,
      module,
      route: expectedPath,
      theme,
      viewport: matrix.name,
    });
  } finally {
    page.off("pageerror", onPageError);
    page.off("response", onResponse);
  }
}
