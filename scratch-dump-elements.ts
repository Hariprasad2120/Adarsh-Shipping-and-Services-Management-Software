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
  console.log("Waiting 10 seconds...");
  await page.waitForTimeout(10000);

  const scratchDir = "C:/Users/Purushothaman/.gemini/antigravity-ide/brain/eed1eda0-7f23-415a-ab49-91e5ab83db8e/scratch";
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  await page.screenshot({ path: path.join(scratchDir, "dump_page.png") });
  console.log("Screenshot saved to scratch/dump_page.png");

  console.log("--- Inner Text of Body ---");
  const textContent = await page.evaluate(() => document.body.innerText);
  console.log(textContent.substring(0, 3000));
  console.log("--------------------------");

  // Let's dump all interactive elements
  const anchors = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('a, button, [role="button"]'));
    return items.map(el => ({
      tag: el.tagName,
      text: (el as HTMLElement).innerText || "",
      href: el.getAttribute('href') || "",
      id: el.id,
      className: el.className
    }));
  });

  console.log(`Found ${anchors.length} interactive elements:`);
  console.log(anchors.slice(0, 50));

  await browser.close();
}

main().catch(console.error);
