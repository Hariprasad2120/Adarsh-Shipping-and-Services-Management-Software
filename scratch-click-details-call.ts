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

  // Construct or use direct enquiries URL
  const enquiriesUrl = "https://wap.justdial.com/analytics/enquiries?searchid=20260615202524044pxx44xx44101103084537i5s56a300eebde3a4b6d6f94ac1a&el=0&nh=1&hide_header=1&m=1&old=1&source=77&wap=77&tab=enquiries&docid=044PXX44.XX44.101103084537.I5S5&ln=en";

  console.log("Navigating to Justdial Enquiries URL...");
  await page.goto(enquiriesUrl, { waitUntil: "load", timeout: 60000 });
  console.log("Waiting 10 seconds...");
  await page.waitForTimeout(10000);

  const callBtn = page.locator('button[aria-label="Make Call"]').first();
  if (await callBtn.count() > 0) {
    console.log("Found call button in enquiries list! Clicking it...");
    await callBtn.click();
    console.log("Waiting 3 seconds for popover...");
    await page.waitForTimeout(3000);

    const scratchDir = "C:/Users/Purushothaman/.gemini/antigravity-ide/brain/eed1eda0-7f23-415a-ab49-91e5ab83db8e/scratch";
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }

    await page.screenshot({ path: path.join(scratchDir, "enquiries_clicked_page.png") });
    console.log("Screenshot saved to scratch/enquiries_clicked_page.png");

    const html = await page.content();
    fs.writeFileSync(path.join(scratchDir, "enquiries_clicked_body.html"), html, "utf8");
    console.log("Clicked enquiries HTML body saved to scratch/enquiries_clicked_body.html");
  } else {
    console.log("No call button found in enquiries list!");
  }

  await browser.close();
}

main().catch(console.error);
