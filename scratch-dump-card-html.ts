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

  const balajiElement = page.locator(':text("Balaji")').first();
  if (await balajiElement.count() > 0) {
    console.log("Found Balaji element!");
    let parent = balajiElement;
    for (let i = 0; i < 6; i++) {
      parent = parent.locator("xpath=..");
      const text = await parent.innerText();
      if (text.includes("Details")) {
        const html = await parent.innerHTML();
        console.log(`Parent depth ${i} HTML retrieved.`);
        
        const scratchDir = "C:/Users/Purushothaman/.gemini/antigravity-ide/brain/eed1eda0-7f23-415a-ab49-91e5ab83db8e/scratch";
        if (!fs.existsSync(scratchDir)) {
          fs.mkdirSync(scratchDir, { recursive: true });
        }
        fs.writeFileSync(path.join(scratchDir, "card_balaji.html"), html, "utf8");
        console.log("Saved HTML structure to scratch/card_balaji.html");
        break;
      }
    }
  } else {
    console.log("Balaji element NOT found on the page!");
  }

  await browser.close();
}

main().catch(console.error);
