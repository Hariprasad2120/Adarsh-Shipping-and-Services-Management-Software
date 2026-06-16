import "dotenv/config";
import { chromium } from "playwright";
import { getJustdialConfig } from "./src/modules/crm/lead-source.service";

async function main() {
  const config = await getJustdialConfig("cmp4cw6gu0000gkbwxbrjb8oz");
  if (!config) {
    console.error("Config not found!");
    return;
  }

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

  // Construct enquiries page URL directly
  let enquiriesUrl = config.dashboardUrl;
  if (enquiriesUrl.includes("leaddashboard")) {
    enquiriesUrl = enquiriesUrl
      .replace("leaddashboard", "enquiries")
      .replace("tab=leaddashboard", "tab=enquiries");
    // Remove searchid if it's there
    const urlObj = new URL(enquiriesUrl);
    urlObj.searchParams.delete("searchid");
    enquiriesUrl = urlObj.toString();
  }

  console.log(`Navigating directly to Enquiries URL: ${enquiriesUrl}`);
  await page.goto(enquiriesUrl, { waitUntil: "load", timeout: 60000 });
  console.log("Waiting 10 seconds for enquiries to load...");
  await page.waitForTimeout(10000);

  const cardWrapper = page.locator('div.enquiry-card');
  const cards = await cardWrapper.locator('div.card-body').all();
  console.log(`Found ${cards.length} enquiry cards.`);

  const scrapedLeads = [];

  for (let i = 0; i < Math.min(cards.length, 5); i++) {
    console.log(`\n--- Scraped Card ${i + 1} ---`);
    const card = cards[i];

    // Name (inside styles_userInfo__cLXcm -> span.font14.fw-semibold)
    const nameEl = card.locator('.styles_userInfo__cLXcm span.font14.fw-semibold');
    const name = (await nameEl.count() > 0) ? (await nameEl.innerText()).trim() : "Unknown";

    // Location (inside styles_userInfo__cLXcm -> p.font12.mb-0)
    const locEl = card.locator('.styles_userInfo__cLXcm p.font12.mb-0');
    const location = (await locEl.count() > 0) ? (await locEl.innerText()).trim() : "";

    // Category (inside styles_userInfo__cLXcm -> span.font12.fw-medium)
    const catEl = card.locator('.styles_userInfo__cLXcm span.font12.fw-medium');
    const category = (await catEl.count() > 0) ? (await catEl.innerText()).trim() : "";

    // Date/Time
    const dateEl = card.locator('p.color717.small.mb-0');
    const dateTime = (await dateEl.count() > 0) ? (await dateEl.innerText()).trim() : "";

    // Status Tags
    const statusTags = [];
    const badges = await card.locator('span.badge').all();
    for (const badge of badges) {
      statusTags.push((await badge.innerText()).trim());
    }

    // Query (resilient lookup)
    let query = "";
    const queryItems = await card.locator('div.styles_mbItem__9kLwq').all();
    for (const item of queryItems) {
      const labelEl = item.locator('p.font10');
      if (await labelEl.count() > 0) {
        const label = (await labelEl.innerText()).trim();
        if (label.toLowerCase() === "query") {
          query = (await item.locator('span.font12').innerText()).trim();
        }
      }
    }

    // Enquiry Source
    let enquirySource = "";
    for (const item of queryItems) {
      const labelEl = item.locator('p.font10');
      if (await labelEl.count() > 0) {
        const label = (await labelEl.innerText()).trim();
        if (label.toLowerCase() === "enquiry source") {
          enquirySource = (await item.locator('span.font12').innerText()).trim();
        }
      }
    }

    // Click Call button to get Phone number
    let phone = "";
    const callBtn = card.locator('button[aria-label="Make Call"]').first();
    if (await callBtn.count() > 0) {
      console.log(`Clicking Call button for ${name}...`);
      await callBtn.click();
      await page.waitForTimeout(1000); // wait for tooltip animation

      const tooltip = page.locator('.tooltip-inner').first();
      if (await tooltip.count() > 0) {
        phone = (await tooltip.innerText()).trim();
        console.log(`Phone retrieved: ${phone}`);
      } else {
        console.log(`Failed to retrieve phone tooltip for ${name}`);
      }
    }

    const data = {
      name,
      location,
      category,
      dateTime,
      statusTags,
      query,
      enquirySource,
      phone
    };

    console.log("Extracted Lead Data:", data);
    scrapedLeads.push(data);
  }

  console.log("\n=================================");
  console.log(`Mock Scrape Done. Total leads: ${scrapedLeads.length}`);
  console.log(JSON.stringify(scrapedLeads, null, 2));
  console.log("=================================");

  await browser.close();
}

main().catch(console.error);
