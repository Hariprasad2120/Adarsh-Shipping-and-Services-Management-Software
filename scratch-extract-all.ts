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

  console.log("Navigating to Justdial dashboard URL...");
  await page.goto(config.dashboardUrl, { waitUntil: "load", timeout: 60000 });
  console.log("Waiting 10 seconds for rendering...");
  await page.waitForTimeout(10000);

  const cards = await page.locator('li.recentleadlist').all();
  console.log(`Found ${cards.length} lead cards.`);

  const scrapedLeads = [];

  for (let i = 0; i < cards.length; i++) {
    console.log(`\n--- Processing Lead Card ${i + 1}/${cards.length} ---`);
    const card = cards[i];

    // Name
    const nameEl = card.locator('.leadsname');
    const name = (await nameEl.count() > 0) ? (await nameEl.innerText()).trim() : "Unknown";

    // Location
    const locEl = card.locator('.rl_row').first();
    const location = (await locEl.count() > 0) ? (await locEl.innerText()).trim() : "";

    // Category
    const catEl = card.locator('.clamp1.pr-30');
    const category = (await catEl.count() > 0) ? (await catEl.innerText()).trim() : "";

    // Date/Time
    const dateEl = card.locator('.lead_option_end');
    const dateTime = (await dateEl.count() > 0) ? (await dateEl.innerText()).trim() : "";

    // Status Tags
    const statusTags = [];
    const statusTagsCount = await card.locator('.leads__cmn').count();
    for (let t = 0; t < statusTagsCount; t++) {
      const tagText = await card.locator('.leads__cmn').nth(t).innerText();
      statusTags.push(tagText.trim());
    }

    console.log(`Scraped text fields: Name=${name}, Location=${location}, Category=${category}, Date=${dateTime}, Tags=${statusTags.join(', ')}`);

    // Phone number from Call button popover
    let phone = "";
    const callBtn = card.locator('span.call_act');
    if (await callBtn.count() > 0) {
      console.log("Clicking call button to get phone number...");
      await callBtn.click();
      await page.waitForTimeout(1000); // wait for popover

      const tooltip = card.locator('.msgtooltip');
      if (await tooltip.count() > 0) {
        phone = (await tooltip.innerText()).trim();
        console.log(`Successfully retrieved phone number: ${phone}`);
      } else {
        console.log("Tooltip element not populated after click!");
      }
    } else {
      console.log("Call button not found on card!");
    }

    // Expand details to get Query & Enquiry Source
    let query = "";
    let enquirySource = "";
    const detailsBtn = card.locator('a:has-text("Details")').first();
    if (await detailsBtn.count() > 0) {
      console.log("Clicking Details link...");
      await detailsBtn.click();
      await page.waitForTimeout(1500); // transition wait

      // Read details from the expanded layout
      const cardText = await card.innerText();
      const lines = cardText.split('\n').map(l => l.trim()).filter(Boolean);
      
      const queryIdx = lines.findIndex(l => l.toLowerCase() === 'query');
      if (queryIdx !== -1 && lines[queryIdx + 1]) {
        query = lines[queryIdx + 1];
      }

      const sourceIdx = lines.findIndex(l => l.toLowerCase() === 'enquiry source');
      if (sourceIdx !== -1 && lines[sourceIdx + 1]) {
        enquirySource = lines[sourceIdx + 1];
      }

      console.log(`Scraped expanded fields: Query="${query}", Source="${enquirySource}"`);

      // Hide details again to revert card height
      const hideBtn = card.locator('a:has-text("Hide details")').first();
      if (await hideBtn.count() > 0) {
        await hideBtn.click();
        await page.waitForTimeout(500);
      }
    } else {
      console.log("Details link not found!");
    }

    scrapedLeads.push({
      name,
      location,
      category,
      dateTime,
      statusTags,
      phone,
      query,
      enquirySource
    });
  }

  console.log("\n=================================");
  console.log(`Completed mock scrape. Total leads: ${scrapedLeads.length}`);
  console.log(JSON.stringify(scrapedLeads, null, 2));
  console.log("=================================");

  await browser.close();
}

main().catch(console.error);
