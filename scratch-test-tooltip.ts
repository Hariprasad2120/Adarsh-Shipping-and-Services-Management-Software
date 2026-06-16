import "dotenv/config";
import { chromium } from "playwright";
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

  let enquiriesUrl = config.dashboardUrl;
  if (enquiriesUrl.includes("leaddashboard")) {
    enquiriesUrl = enquiriesUrl
      .replace("leaddashboard", "enquiries")
      .replace("tab=leaddashboard", "tab=enquiries");
    const urlObj = new URL(enquiriesUrl);
    urlObj.searchParams.delete("searchid");
    enquiriesUrl = urlObj.toString();
  }

  await page.goto(enquiriesUrl, { waitUntil: "load", timeout: 60000 });
  
  console.log("Waiting for cards to render...");
  await page.locator('div.enquiry-card').first().waitFor({ state: "visible", timeout: 20000 });

  const cards = await page.locator('div.enquiry-card div.card-body').all();
  console.log(`Found ${cards.length} cards.`);

  for (let i = 0; i < Math.min(cards.length, 3); i++) {
    const card = cards[i];
    const name = await card.locator('.styles_userInfo__cLXcm span.font14.fw-semibold').innerText();
    const callBtn = card.locator('button[aria-label="Make Call"]').first();

    if (await callBtn.count() > 0) {
      console.log(`\nClicking Call for ${name}...`);
      await callBtn.click();
      await page.waitForTimeout(1000);

      const tooltip = page.locator('.tooltip-inner').first();
      const text = await tooltip.innerText();
      console.log(`Retrieved phone: ${text}`);

      // Dismiss the tooltip by clicking on a neutral area (like navigation header or body padding)
      console.log("Dismissing tooltip...");
      await page.mouse.click(10, 10); // click top-left corner
      await page.waitForTimeout(1000); // wait for fade out
      
      const tooltipCount = await page.locator('.tooltip-inner').count();
      console.log(`Tooltip elements count after dismiss: ${tooltipCount}`);
    }
  }

  await browser.close();
}

main().catch(console.error);
