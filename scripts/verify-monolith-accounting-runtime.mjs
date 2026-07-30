import "dotenv/config";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import pg from "pg";
import { chromium } from "playwright";
import { assertExactStagingEnvironment } from "./staging-target-runtime.mjs";

const { connectionString } = assertExactStagingEnvironment(
  "Accounting runtime verification",
);

const useLocalSpecialAccount = process.argv.includes("--use-local-special-account");
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
  throw new Error("UI_TEST_BASE_URL, UI_TEST_EMAIL, and UI_TEST_PASSWORD are required.");
}
const outputDirectory = "artifacts/ui-migration/accounting";
const staticRoutes = [
  "/accounting",
  "/accounting/accounts",
  "/accounting/balance-sheet",
  "/accounting/banking",
  "/accounting/general-ledger",
  "/accounting/invoices-sales",
  "/accounting/invoices-sales/new",
  "/accounting/items",
  "/accounting/items/new",
  "/accounting/jobs",
  "/accounting/journal-entries",
  "/accounting/journal-entries/new",
  "/accounting/payment-entries",
  "/accounting/payment-entries/new",
  "/accounting/profit-loss",
  "/accounting/purchase-invoices",
  "/accounting/purchase-invoices/new",
  "/accounting/purchase-orders",
  "/accounting/purchase-orders/new",
  "/accounting/quotations",
  "/accounting/reports",
  "/accounting/sales-invoices",
  "/accounting/sales-invoices/new",
  "/accounting/sales-orders",
  "/accounting/sales-orders/new",
  "/accounting/settings",
  "/accounting/trial-balance",
];
const matrices = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 1024, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];
const themes = ["light", "night", "violet"];
const screenshotRoutes = new Set([
  "/accounting",
  "/accounting/accounts",
  "/accounting/items",
  "/accounting/items/new",
  "/accounting/journal-entries/new",
  "/accounting/quotations",
  "/accounting/reports",
  "/accounting/sales-invoices/new",
]);

await mkdir(outputDirectory, { recursive: true });
const fixtureClient = new pg.Client({ connectionString });
await fixtureClient.connect();
const fixture = await createFixtures(fixtureClient, email);
const routes = [
  ...staticRoutes,
  "/accounting/items/ITEM-001",
  `/accounting/journal-entries/${fixture.journalId}`,
  `/accounting/payment-entries/${fixture.paymentId}`,
  `/accounting/purchase-invoices/${fixture.purchaseInvoiceId}`,
  `/accounting/sales-invoices/${fixture.salesInvoiceId}`,
];

let browser;
const results = [];
const runtimeErrors = [];

try {
  if (routes.length !== 32 || new Set(routes).size !== 32) {
    throw new Error(`Expected 32 unique Accounting runtime routes, resolved ${routes.length}.`);
  }
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 500) runtimeErrors.push(`${response.status()} ${response.url()}`);
  });

  await login(page);

  for (const matrix of matrices) {
    await page.setViewportSize({ width: matrix.width, height: matrix.height });

    for (const theme of themes) {
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.evaluate((nextTheme) => window.localStorage.setItem("theme", nextTheme), theme);

      for (const route of routes) {
        const startedAt = Date.now();
        const priorErrorCount = runtimeErrors.length;
        console.log(`Checking ${matrix.name} ${theme} ${route}`);
        await page.goto(`${baseUrl}${route}`, {
          waitUntil: "domcontentloaded",
          timeout: 45_000,
        });

        const actualPath = new URL(page.url()).pathname;
        if (actualPath !== route) throw new Error(`${route} redirected to ${actualPath}.`);

        await page.locator(`.mnx-dashboard-shell[data-theme="${theme}"]`).waitFor({
          state: "visible",
          timeout: 30_000,
        });
        await page.locator('[data-accounting-workspace="true"]').waitFor({
          state: "visible",
          timeout: 30_000,
        });
        await page.locator(".mnx-workspace-state-loading").waitFor({
          state: "hidden",
          timeout: 30_000,
        });
        await page.locator(".mnx-accounting-page-header").waitFor({
          state: "visible",
          timeout: 30_000,
        });

        const verification = await page.evaluate(() => {
          const root = document.documentElement;
          const shell = document.querySelector(".mnx-dashboard-shell");
          const content = document.querySelector(".mnx-accounting-content");
          const classNames = [...(content?.querySelectorAll("[class]") ?? [])]
            .map((node) => node.getAttribute("class") ?? "")
            .join(" ");
          return {
            accountingHeaders: content?.querySelectorAll(".mnx-accounting-page-header").length ?? 0,
            errorText:
              document.body.textContent?.includes("Application error") ||
              document.body.textContent?.includes("Internal Server Error") ||
              false,
            legacyComposition: /\bmonolith-[a-z0-9_-]+/.test(classNames),
            pageOverflows: root.scrollWidth > root.clientWidth + 1,
            surface: getComputedStyle(root).getPropertyValue("--mn-color-surface").trim(),
            text: getComputedStyle(root).getPropertyValue("--mn-color-text").trim(),
            theme: shell?.getAttribute("data-theme"),
            unstandardButtons:
              content?.querySelectorAll(
                "button:not(.mnx-button):not(.mnx-accounting-record-card):not(.mnx-dialog-backdrop)",
              ).length ?? 0,
            unstandardInputs:
              content?.querySelectorAll(
                'input:not([type="hidden"]):not([type="file"]):not(.mnx-field-control):not(.mnx-checkbox input)',
              ).length ?? 0,
            unstandardSelects:
              content?.querySelectorAll("select:not(.mnx-field-control)").length ?? 0,
            unstandardTextareas:
              content?.querySelectorAll("textarea:not(.mnx-field-control)").length ?? 0,
            unstandardTables:
              content?.querySelectorAll("table:not(.mnx-workspace-table)").length ?? 0,
          };
        });
        const newRuntimeErrors = runtimeErrors.slice(priorErrorCount).filter(
          (message) =>
            !message.includes("Failed to load resource: the server responded with a status of 404"),
        );
        const failed =
          verification.accountingHeaders !== 1 ||
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
            `${route} ${theme} ${matrix.name} failed: ${JSON.stringify({
              ...verification,
              runtimeErrors: newRuntimeErrors,
            })}`,
          );
        }

        if (screenshotRoutes.has(route)) {
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

  await verifyDialogs(page);
  await writeFile(
    `${outputDirectory}/verification.json`,
    JSON.stringify(
      {
        checks: results.length,
        completedAt: new Date().toISOString(),
        routes,
        themes,
        viewports: matrices.map(({ name, width, height }) => ({ name, width, height })),
        results,
      },
      null,
      2,
    ),
  );
  console.log(`Verified ${results.length} authenticated Accounting route/theme/viewport combinations across 32 routes.`);
} finally {
  if (browser) await browser.close();
  await removeFixtures(fixtureClient, fixture);
  await fixtureClient.end();
}

async function login(targetPage) {
  await targetPage.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded", timeout: 45_000 });
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

async function verifyDialogs(targetPage) {
  await targetPage.setViewportSize({ width: 390, height: 844 });
  await targetPage.goto(`${baseUrl}/accounting/quotations`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await targetPage.getByRole("button", { name: /new quotation/i }).click();
  const dialog = targetPage.getByRole("dialog");
  await dialog.waitFor({ state: "visible" });
  const bounds = await dialog.boundingBox();
  if (!bounds || bounds.height > 844 || bounds.width > 390) {
    throw new Error(`Accounting dialog exceeds the mobile viewport: ${JSON.stringify(bounds)}.`);
  }
  await targetPage.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
}

async function createFixtures(client, loginEmail) {
  const identity = await client.query(
    `select u.id, u."orgId" from "User" u where lower(u.email) = lower($1) and u.active = true limit 1`,
    [loginEmail],
  );
  if (!identity.rowCount) throw new Error(`No active test user exists for ${loginEmail}.`);
  const { id: userId, orgId } = identity.rows[0];
  const accounts = await client.query(
    `select id from "Account" where "orgId" = $1 and "isActive" = true order by "accountCode" limit 2`,
    [orgId],
  );
  const customer = await client.query(
    `select id from "CrmAccount" where "orgId" = $1 and status = 'ACTIVE' order by name limit 1`,
    [orgId],
  );
  if (accounts.rows.length < 2 || !customer.rowCount) {
    throw new Error("Accounting runtime fixtures require two active ledger accounts and one active customer.");
  }

  const token = randomUUID().replaceAll("-", "");
  const ids = {
    journalId: `ui_jv_${token}`,
    journalLineDebitId: `ui_jvl_d_${token}`,
    journalLineCreditId: `ui_jvl_c_${token}`,
    paymentId: `ui_pay_${token}`,
    salesInvoiceId: `ui_si_${token}`,
    salesItemId: `ui_sii_${token}`,
    purchaseInvoiceId: `ui_pi_${token}`,
    purchaseItemId: `ui_pii_${token}`,
    vendorId: `ui_vendor_${token}`,
    createdVendor: true,
  };
  const [debitAccount, creditAccount] = accounts.rows;
  const customerId = customer.rows[0].id;
  const now = new Date();
  const dueDate = new Date(now.getTime() + 30 * 86400000);

  await client.query("begin");
  try {
    await client.query(
      `insert into "CrmVendor" (id, "orgId", "ownerId", name, status, "createdById", "updatedById", "createdAt", "updatedAt")
       values ($1, $2, $3, $4, 'ACTIVE', $3, $3, now(), now())`,
      [ids.vendorId, orgId, userId, `UI verification supplier ${token.slice(0, 6)}`],
    );
    await client.query(
      `insert into "JournalEntry" (id, "orgId", "voucherNo", "postingDate", remarks, status, "totalDebit", "totalCredit", "createdById", "createdAt", "updatedAt")
       values ($1, $2, $3, $4, 'Temporary visual verification fixture', 'DRAFT', 1250, 1250, $5, now(), now())`,
      [ids.journalId, orgId, `UI-JV-${token.slice(0, 8)}`, now, userId],
    );
    await client.query(
      `insert into "JournalEntryLine" (id, "journalEntryId", "accountId", debit, credit, remarks)
       values ($1, $3, $4, 1250, 0, 'Verification debit'), ($2, $3, $5, 0, 1250, 'Verification credit')`,
      [ids.journalLineDebitId, ids.journalLineCreditId, ids.journalId, debitAccount.id, creditAccount.id],
    );
    await client.query(
      `insert into "SalesInvoice" (id, "orgId", "invoiceNumber", "customerId", "postingDate", "dueDate", status, "grandTotal", "paidAmount", "outstandingAmount", "discountAmount", "taxAmount", remarks, "createdById", "createdAt", "updatedAt")
       values ($1, $2, $3, $4, $5, $6, 'DRAFT', 1180, 0, 1180, 0, 180, 'Temporary visual verification fixture', $7, now(), now())`,
      [ids.salesInvoiceId, orgId, `UI-SI-${token.slice(0, 8)}`, customerId, now, dueDate, userId],
    );
    await client.query(
      `insert into "SalesInvoiceItem" (id, "invoiceId", "itemName", qty, rate, amount, currency, "exchangeRate")
       values ($1, $2, 'Verification service', 1, 1000, 1000, 'INR', 1)`,
      [ids.salesItemId, ids.salesInvoiceId],
    );
    await client.query(
      `insert into "PurchaseInvoice" (id, "orgId", "invoiceNumber", "supplierId", "postingDate", "dueDate", status, "grandTotal", "paidAmount", "outstandingAmount", "discountAmount", "taxAmount", remarks, "createdById", "createdAt", "updatedAt")
       values ($1, $2, $3, $4, $5, $6, 'DRAFT', 590, 0, 590, 0, 90, 'Temporary visual verification fixture', $7, now(), now())`,
      [ids.purchaseInvoiceId, orgId, `UI-PI-${token.slice(0, 8)}`, ids.vendorId, now, dueDate, userId],
    );
    await client.query(
      `insert into "PurchaseInvoiceItem" (id, "invoiceId", "itemName", qty, rate, amount)
       values ($1, $2, 'Verification purchase', 1, 500, 500)`,
      [ids.purchaseItemId, ids.purchaseInvoiceId],
    );
    await client.query(
      `insert into "PaymentEntry" (id, "orgId", "paymentType", "postingDate", "partyType", "partyId", "paidFromAccountId", "paidToAccountId", amount, "referenceNo", remarks, status, "createdById", "createdAt", "updatedAt")
       values ($1, $2, 'RECEIVE', $3, 'CUSTOMER', $4, $5, $6, 250, $7, 'Temporary visual verification fixture', 'DRAFT', $8, now(), now())`,
      [ids.paymentId, orgId, now, customerId, debitAccount.id, creditAccount.id, `UI-PAY-${token.slice(0, 8)}`, userId],
    );
    await client.query("commit");
    return ids;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function removeFixtures(client, fixture) {
  await client.query("begin");
  try {
    await client.query(`delete from "PaymentEntry" where id = $1`, [fixture.paymentId]);
    await client.query(`delete from "PurchaseInvoice" where id = $1`, [fixture.purchaseInvoiceId]);
    await client.query(`delete from "SalesInvoice" where id = $1`, [fixture.salesInvoiceId]);
    await client.query(`delete from "JournalEntry" where id = $1`, [fixture.journalId]);
    if (fixture.createdVendor) {
      await client.query(`delete from "CrmVendor" where id = $1`, [fixture.vendorId]);
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}
