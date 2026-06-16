import "dotenv/config";
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { getJustdialConfig } from "./src/modules/crm/lead-source.service";

async function main() {
  const config = await getJustdialConfig("cmp4cw6gu0000gkbwxbrjb8oz");
  if (!config) return;

  const cookiesJson = config.cookiesJson;
  const rawCookies = JSON.parse(cookiesJson!);
  const playwrightCookies = rawCookies.map((c: any) => ({
    name: c.name,
    value: c.value,
    domain: c.domain.startsWith(".") ? c.domain : `.${c.domain}`,
    path: c.path || "/",
    expires: c.expirationDate || undefined,
    httpOnly: c.httpOnly || false,
    secure: c.secure || false,
    sameSite: c.sameSite === "no_restriction" || !c.sameSite ? "Lax" : "Lax"
  }));

  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-http2"]
  });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 }
  });
  await context.addCookies(playwrightCookies);
  const page = await context.newPage();

  console.log("Navigating to Justdial dashboard URL...");
  await page.goto(config.dashboardUrl, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(5000);

  const detailsBtn = page.locator('a:has-text("Details")').first();
  if (await detailsBtn.count() > 0) {
    console.log("Details link found! Clicking it...");
    await detailsBtn.click();
    console.log("Waiting 5 seconds for navigation...");
    await page.waitForTimeout(5000);

    const newUrl = page.url();
    console.log(`Current page URL after clicking details: ${newUrl}`);

    const scratchDir = "C:/Users/Purushothaman/.gemini/antigravity-ide/brain/eed1eda0-7f23-415a-ab49-91e5ab83db8e/scratch";
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }

    await page.screenshot({ path: path.join(scratchDir, "details_page.png") });
    console.log("Screenshot saved to scratch/details_page.png");

    const html = await page.content();
    fs.writeFileSync(path.join(scratchDir, "details_page.html"), html, "utf8");
    console.log("Details page HTML saved to scratch/details_page.html");

    // Try clicking "Hide details"
    const hideBtn = page.locator('a:has-text("Hide details")').first();
    if (await hideBtn.count() > 0) {
      console.log("Found 'Hide details' link! Clicking it...");
      await hideBtn.click();
      await page.waitForTimeout(3000);
      console.log(`Page URL after clicking 'Hide details': ${page.url()}`);
    } else {
      console.log("'Hide details' link not found, trying browser back...");
      await page.goBack();
      await page.waitForTimeout(3000);
      console.log(`Page URL after page.goBack(): ${page.url()}`);
    }
  } else {
    console.log("Details button not found.");
  }

  await browser.close();
}

main().catch(console.error);
