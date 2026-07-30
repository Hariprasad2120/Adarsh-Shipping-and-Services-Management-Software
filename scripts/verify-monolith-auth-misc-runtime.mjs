import "dotenv/config";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import pg from "pg";
import { chromium } from "playwright";
import { assertExactStagingEnvironment } from "./staging-target-runtime.mjs";

const { connectionString } = assertExactStagingEnvironment(
  "Authentication runtime verification",
);

const useLocalSpecialAccount = process.argv.includes(
  "--use-local-special-account",
);
const baseUrl =
  process.env.UI_TEST_BASE_URL ??
  (useLocalSpecialAccount ? "http://localhost:3000" : undefined);
const email =
  process.env.UI_TEST_EMAIL ??
  (useLocalSpecialAccount ? "obj268version4@gmail.com" : undefined);
const password =
  process.env.UI_TEST_PASSWORD ??
  (useLocalSpecialAccount ? "password@123" : undefined);

if (!baseUrl || !email || !password) {
  throw new Error(
    "UI_TEST_BASE_URL, UI_TEST_EMAIL, and UI_TEST_PASSWORD are required.",
  );
}
const outputDirectory = "artifacts/ui-migration/auth-misc";
const themes = ["light", "night", "violet"];
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 1024, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];
const fixtureClient = new pg.Client({
  connectionString,
});
const results = [];
const runtimeErrors = [];
let browser;
let fixture;

await mkdir(outputDirectory, { recursive: true });
await fixtureClient.connect();

try {
  fixture = await createDocumentFixture(fixtureClient, email);
  const routes = [
    { route: "/", url: "/" },
    { route: "/login", url: "/login" },
    { route: "/setup", url: "/setup" },
    {
      route: "/verify/[id]",
      url: `/verify/${fixture.id}`,
    },
    {
      route: "/google-chat-link",
      url: "/google-chat-link?token=auth-misc-visual-verification",
    },
  ];

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 500) {
      runtimeErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.route("**/api/google-chat/link**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          valid: true,
          googleEmail: "visual.verification@example.com",
          googleDisplayName: "Visual Verification",
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  await login(page);

  for (const viewport of viewports) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });

    for (const theme of themes) {
      await page.evaluate(
        (nextTheme) => window.localStorage.setItem("theme", nextTheme),
        theme,
      );

      for (const entry of routes) {
        const priorErrorCount = runtimeErrors.length;
        const startedAt = Date.now();
        console.log(
          `Checking ${viewport.name} ${theme} ${entry.route}`,
        );
        await navigate(page, `${baseUrl}${entry.url}`);

        const actualPath = new URL(page.url()).pathname;
        const expectedPath =
          entry.route === "/verify/[id]" ? `/verify/${fixture.id}` : entry.route;
        if (actualPath !== expectedPath) {
          throw new Error(`${entry.route} redirected to ${actualPath}.`);
        }

        await page
          .locator(".mnx-public-shell")
          .waitFor({ state: "visible", timeout: 30_000 });
        if (entry.route === "/google-chat-link") {
          await page
            .getByText("Visual Verification", { exact: true })
            .waitFor({ state: "visible", timeout: 30_000 });
        }
        if (entry.route === "/verify/[id]") {
          await page
            .getByText(fixture.letterNumber, { exact: true })
            .waitFor({ state: "visible", timeout: 30_000 });
        }
        await page.waitForTimeout(750);

        const verification = await evaluateRoute(page, theme, entry.route);
        const newRuntimeErrors = runtimeErrors
          .slice(priorErrorCount)
          .filter(
            (message) =>
              !message.includes(
                "Failed to load resource: the server responded with a status of 404",
              ),
          );

        const failed =
          verification.errorText ||
          verification.legacyComposition ||
          verification.legacyControlColor ||
          verification.pageOverflows ||
          verification.frameOpacity < 0.99 ||
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
            `${entry.route} ${theme} ${viewport.name} failed: ${JSON.stringify({
              ...verification,
              runtimeErrors: newRuntimeErrors,
            })}`,
          );
        }

        const screenshotName =
          entry.route === "/"
            ? "root-control"
            : entry.route
                .replace("[id]", "document")
                .slice(1)
                .replaceAll("/", "-");
        await page.screenshot({
          path: `${outputDirectory}/${screenshotName}-${theme}-${viewport.name}.png`,
          fullPage: true,
        });

        results.push({
          durationMs: Date.now() - startedAt,
          route: entry.route,
          theme,
          viewport: viewport.name,
        });
      }
    }
  }

  await verifySafeInteractions(page, fixture);

  await writeFile(
    `${outputDirectory}/verification.json`,
    JSON.stringify(
      {
        checks: results.length,
        completedAt: new Date().toISOString(),
        routes: routes.map((entry) => entry.route),
        themes,
        viewports,
        results,
      },
      null,
      2,
    ),
  );
  console.log(
    `Verified ${results.length} Authentication/Miscellaneous route/theme/viewport combinations across 5 routes.`,
  );
} finally {
  if (browser) await browser.close();
  if (fixture) {
    await fixtureClient.query(
      `delete from "HRLetterRequest" where id = $1`,
      [fixture.id],
    );
  }
  await fixtureClient.end();
}

async function login(targetPage) {
  await navigate(targetPage, `${baseUrl}/login`);
  await targetPage
    .locator('input[name="email"]')
    .waitFor({ state: "visible", timeout: 30_000 });
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

async function evaluateRoute(targetPage, expectedTheme, route) {
  return targetPage.evaluate(
    ({ currentRoute, theme }) => {
      const root = document.documentElement;
      const shell = document.querySelector(".mnx-public-shell");
      const frame = document.querySelector(".mnx-public-frame");
      const firstControl = shell?.querySelector(".mnx-field-control");
      const classNames = [...(shell?.querySelectorAll("[class]") ?? [])]
        .map((node) => node.getAttribute("class") ?? "")
        .join(" ");
      const computed = shell ? getComputedStyle(shell) : null;

      return {
        errorText:
          document.body.textContent?.includes("Application error") ||
          document.body.textContent?.includes("Internal Server Error") ||
          false,
        legacyComposition:
          /\bmonolith-(?:h1|h2|h3|card|label|numeric|accent)\b/.test(
            classNames,
          ) ||
          Boolean(document.querySelector("[data-legacy-shell]")),
        legacyControlColor: firstControl
          ? /0,\s*206,\s*196/.test(
              getComputedStyle(firstControl).borderTopColor,
            )
          : false,
        frameOpacity: frame
          ? Number.parseFloat(getComputedStyle(frame).opacity)
          : 0,
        pageOverflows: root.scrollWidth > root.clientWidth + 1,
        route: currentRoute,
        surface: computed?.getPropertyValue("--mnx-surface").trim() ?? "",
        text: computed?.getPropertyValue("--mnx-text").trim() ?? "",
        theme: root.classList.contains(`theme-${theme}`) ? theme : null,
        unstandardButtons:
          shell?.querySelectorAll(
            "button:not(.mnx-button):not(.mnx-dialog-backdrop):not(.mnx-select-trigger)",
          ).length ?? 0,
        unstandardInputs:
          [
            ...(shell?.querySelectorAll(
              'input:not([type="hidden"]):not([type="file"]):not(.mnx-field-control):not(.mnx-choice-control):not(.mnx-managed-input)',
            ) ?? []),
          ].filter((input) => !input.closest(".mnx-checkbox")).length,
        unstandardSelects:
          shell?.querySelectorAll("select:not(.mnx-field-control):not(.hidden)")
            .length ?? 0,
        unstandardTextareas:
          shell?.querySelectorAll("textarea:not(.mnx-field-control)").length ??
          0,
        unstandardTables:
          shell?.querySelectorAll("table:not(.mnx-workspace-table)").length ??
          0,
      };
    },
    { currentRoute: route, theme: expectedTheme },
  );
}

async function verifySafeInteractions(targetPage, documentFixture) {
  await targetPage.setViewportSize({ width: 390, height: 844 });
  await navigate(targetPage, `${baseUrl}/login`);
  await targetPage.locator('button[type="submit"]').click();
  await targetPage
    .getByText("Enter a valid work email.", { exact: true })
    .waitFor({ state: "visible" });
  await targetPage.locator('input[name="password"]').fill("masked-value");
  await targetPage.getByRole("button", { name: "Show password" }).click();
  if (
    (await targetPage.locator('input[name="password"]').getAttribute("type")) !==
    "text"
  ) {
    throw new Error("Login password visibility control did not update.");
  }

  await navigate(
    targetPage,
    `${baseUrl}/google-chat-link?token=auth-misc-visual-verification`,
  );
  await targetPage
    .getByText("Visual Verification", { exact: true })
    .waitFor({ state: "visible" });
  await targetPage
    .getByRole("button", { name: /Link my Monolith account/i })
    .click();
  await targetPage
    .getByText("Accounts linked", { exact: true })
    .waitFor({ state: "visible" });

  await navigate(targetPage, `${baseUrl}/verify/${documentFixture.id}`);
  await targetPage
    .getByText(documentFixture.letterNumber, { exact: true })
    .waitFor({ state: "visible" });
}

async function createDocumentFixture(client, userEmail) {
  const userResult = await client.query(
    `select id, "orgId" from "User" where lower(email) = lower($1) limit 1`,
    [userEmail],
  );
  if (!userResult.rows[0]) {
    throw new Error(`Runtime account ${userEmail} was not found.`);
  }

  const id = randomUUID();
  const letterNumber = `UI-VERIFY-${Date.now()}`;
  const documentHash = randomUUID().replaceAll("-", "").padEnd(64, "0");
  await client.query(
    `insert into "HRLetterRequest"
      (id, "orgId", "userId", "templateId", "letterNumber", status, details,
       "documentHash", "issuedAt", "createdAt", "updatedAt")
     values ($1, $2, $3, $4, $5, 'ISSUED', $6::jsonb, $7, now(), now(), now())`,
    [
      id,
      userResult.rows[0].orgId,
      userResult.rows[0].id,
      "auth-misc-visual-verification",
      letterNumber,
      JSON.stringify({
        personal_email: "visual.verification@example.com",
        masked_aadhaar: "XXXX-XXXX-1234",
      }),
      documentHash,
    ],
  );

  return { id, letterNumber };
}
