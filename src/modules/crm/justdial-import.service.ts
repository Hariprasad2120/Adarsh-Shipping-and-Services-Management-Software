import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { getJustdialConfig, updateImportLog } from "./lead-source.service";
import { processJustdialLead } from "./crm-lead-conversion.service";

export async function runJustdialImport(orgId: string, sysUserId: string, logId: string) {
  let browser: any = null;
  let successCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  let totalCount = 0;

  try {
    const config = await getJustdialConfig(orgId);
    if (!config) {
      throw new Error("Justdial integration is not configured for this organisation.");
    }

    const dashboardUrl = config.dashboardUrl;
    if (!dashboardUrl || dashboardUrl.trim() === "") {
      throw new Error("Justdial dashboard URL is not set in configuration.");
    }

    // 1. Gather cookies from db or fallback to C:/Users/Purushothaman/Downloads/Cookie.txt
    let cookiesJson = config.cookiesJson;
    if (!cookiesJson || cookiesJson.trim() === "") {
      const localCookiePath = "C:/Users/Purushothaman/Downloads/Cookie.txt";
      if (fs.existsSync(localCookiePath)) {
        cookiesJson = fs.readFileSync(localCookiePath, "utf8");
      }
    }

    if (!cookiesJson || cookiesJson.trim() === "") {
      throw new Error("Active session cookies are required. Please paste your cookie JSON in configuration.");
    }

    let rawCookies: any[] = [];
    try {
      rawCookies = JSON.parse(cookiesJson);
    } catch (e) {
      throw new Error("Invalid cookie JSON format. Please paste a valid JSON array of cookies.");
    }

    // Map cookies format to Playwright format
    const playwrightCookies = rawCookies.map((c: any) => {
      let sameSite = c.sameSite;
      if (sameSite === "no_restriction" || sameSite === null || sameSite === undefined) {
        sameSite = "Lax";
      } else if (sameSite.toLowerCase() === "strict") {
        sameSite = "Strict";
      } else if (sameSite.toLowerCase() === "lax") {
        sameSite = "Lax";
      } else if (sameSite.toLowerCase() === "none") {
        sameSite = "None";
      } else {
        sameSite = "Lax";
      }
      return {
        name: c.name,
        value: c.value,
        domain: c.domain.startsWith(".") ? c.domain : `.${c.domain}`,
        path: c.path || "/",
        expires: c.expirationDate || undefined,
        httpOnly: c.httpOnly || false,
        secure: c.secure || false,
        sameSite: sameSite,
      };
    });

    // 2. Launch Browser
    const headless = process.env.JUSTDIAL_HEADLESS !== "false";
    browser = await chromium.launch({
      headless,
      args: ["--disable-http2"] // HTTP/1.1 bypasses some cloudflare h2 protocol block errors
    });

    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 }
    });

    await context.addCookies(playwrightCookies);
    const page = await context.newPage();

    let targetUrl = dashboardUrl;
    if (targetUrl.includes("leaddashboard")) {
      targetUrl = targetUrl
        .replace("leaddashboard", "enquiries")
        .replace("tab=leaddashboard", "tab=enquiries");
      try {
        const urlObj = new URL(targetUrl);
        urlObj.searchParams.delete("searchid");
        targetUrl = urlObj.toString();
      } catch (e) {}
    }

    console.log(`[Justdial Scraper] Navigating to ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(5000);

    // Check if redirect to login happened
    const currentUrl = page.url();
    if (currentUrl.includes("/login") || currentUrl.includes("/signin") || await page.locator('input[type="tel"]').count() > 0 && await page.locator('button:has-text("Login")').count() > 0) {
      throw new Error("Justdial session expired or invalid. Please refresh the Cookie JSON in Lead Sources settings.");
    }

    // 3. Extract Lead Cards
    // Wait for the cards container to render
    const cardWrapper = page.locator('div.enquiry-card');
    await cardWrapper.first().waitFor({ state: "visible", timeout: 20000 });

    // Scroll to load more cards if needed
    const limit = config.maxLeads || 50;
    let prevCount = 0;
    for (let scroll = 0; scroll < 10; scroll++) {
      const currentCount = await cardWrapper.locator('div.card-body').count();
      if (currentCount >= limit || currentCount === prevCount) {
        break;
      }
      prevCount = currentCount;
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
    }

    const cards = await cardWrapper.locator('div.card-body').all();
    console.log(`[Justdial Scraper] Found ${cards.length} lead card elements.`);

    const leadsData: any[] = [];

    for (let i = 0; i < Math.min(cards.length, limit); i++) {
      try {
        const card = cards[i];

        // Name (inside styles_userInfo__cLXcm -> span.font14.fw-semibold)
        const nameEl = card.locator('.styles_userInfo__cLXcm span.font14.fw-semibold');
        if (await nameEl.count() === 0) continue;
        const customerName = (await nameEl.innerText()).trim();

        // Location (inside styles_userInfo__cLXcm -> p.font12.mb-0)
        const locEl = card.locator('.styles_userInfo__cLXcm p.font12.mb-0');
        const city = (await locEl.count() > 0) ? (await locEl.innerText()).trim() : "";

        // Category (inside styles_userInfo__cLXcm -> span.font12.fw-medium)
        const catEl = card.locator('.styles_userInfo__cLXcm span.font12.fw-medium');
        const category = (await catEl.count() > 0) ? (await catEl.innerText()).trim() : "";

        // Date/Time (small text)
        const dateEl = card.locator('p.color717.small.mb-0');
        const enquiryDateTime = (await dateEl.count() > 0) ? (await dateEl.innerText()).trim() : new Date().toLocaleString();

        // Status Badges & isHot
        const badges = await card.locator('span.badge').all();
        const statusTags: string[] = [];
        let isHot = false;
        let originalStatus = "NEW";

        for (const badge of badges) {
          const text = (await badge.innerText()).trim();
          statusTags.push(text);
          if (text.toLowerCase().includes("hot")) {
            isHot = true;
          }
          if (text.toLowerCase() === "read" || text.toLowerCase() === "missed enquiry") {
            originalStatus = text;
          }
        }

        // Scrape Intent Score (VERY HIGH, HIGH, etc.)
        let intentScore = "";
        const intentEl = card.locator('.intent-badge');
        if (await intentEl.count() > 0) {
          const rawIntent = await intentEl.first().innerText();
          intentScore = rawIntent.replace(/:/g, "").trim();
          if (intentScore.toLowerCase().includes("high") || intentScore.toLowerCase().includes("very high")) {
            isHot = true;
          }
        }

        // Query & Enquiry Source (resilient lookup)
        let queryText = "";
        let enquirySource = "";
        const queryItems = await card.locator('div.styles_mbItem__9kLwq').all();
        for (const item of queryItems) {
          const labelEl = item.locator('p.font10');
          if (await labelEl.count() > 0) {
            const label = (await labelEl.innerText()).trim().toLowerCase();
            if (label === "query") {
              queryText = (await item.locator('span.font12').innerText()).trim();
            } else if (label === "enquiry source") {
              enquirySource = (await item.locator('span.font12').innerText()).trim();
            }
          }
        }

        // Click Call Button to get Phone
        let mobile = "";
        const callBtn = card.locator('button[aria-label="Make Call"]').first();
        if (await callBtn.count() > 0) {
          console.log(`[Justdial Scraper] Clicking Call button for ${customerName}...`);
          await callBtn.click();
          await page.waitForTimeout(1500); // wait for popover rendering

          const tooltip = page.locator('.tooltip-inner').last();
          if (await tooltip.count() > 0) {
            mobile = (await tooltip.innerText()).trim();
            console.log(`[Justdial Scraper] Retrieved phone: ${mobile}`);
          } else {
            console.log(`[Justdial Scraper] Tooltip not found for ${customerName}`);
          }
        }

        if (!mobile) {
          console.log(`[Justdial Scraper] Skipping lead ${customerName} because mobile number could not be retrieved.`);
          continue;
        }

        const rawText = await card.innerText();

        leadsData.push({
          customerName,
          mobileNumber: mobile,
          city,
          category,
          queryText: queryText || category,
          enquirySource: enquirySource || "Justdial Web Dashboard",
          enquiryStatus: originalStatus,
          enquiryDateTime,
          jdLeadStatus: originalStatus,
          isHot,
          rawPayload: {
            innerText: rawText,
            scrapedAt: new Date().toISOString(),
            intentScore: intentScore || undefined
          }
        });
      } catch (err) {
        console.error("[Justdial Scraper] Error parsing individual card: ", err);
      }
    }

    totalCount = leadsData.length;
    console.log(`[Justdial Scraper] Ingesting ${totalCount} parsed records into CRM...`);

    // 4. Ingest into CRM DB
    for (const lead of leadsData) {
      const result = await processJustdialLead(orgId, sysUserId, lead, {
        duplicateHandling: config.duplicateHandling,
        defaultOwnerId: config.defaultOwnerId,
        defaultStage: config.defaultStage
      });

      if (result.ok) {
        if (result.status === "NEW_LEAD") successCount++;
        else if (result.status === "DUPLICATE_UPDATED") updatedCount++;
        else if (result.status === "DUPLICATE_SKIPPED") skippedCount++;
      } else {
        failedCount++;
      }
    }

    // 5. Complete Log
    await updateImportLog(logId, {
      status: "SUCCESS",
      totalScanned: totalCount,
      newLeads: successCount,
      updatedLeads: updatedCount,
      failedLeads: failedCount + skippedCount,
    });

    // Update lastSyncedAt on config
    await db.crmLeadSourceJustdialConfig.update({
      where: { orgId },
      data: { lastSyncedAt: new Date() }
    });

  } catch (err: any) {
    console.error("[Justdial Scraper] Scrape operation failed: ", err);
    
    // Save error screenshot
    try {
      if (browser) {
        const pages = browser.contexts()[0]?.pages();
        if (pages && pages[0]) {
          const scratchDir = "C:/Users/Purushothaman/.gemini/antigravity-ide/brain/eed1eda0-7f23-415a-ab49-91e5ab83db8e/scratch";
          if (!fs.existsSync(scratchDir)) {
            fs.mkdirSync(scratchDir, { recursive: true });
          }
          await pages[0].screenshot({ path: path.join(scratchDir, "justdial_error_run.png") });
        }
      }
    } catch (ssErr) {
      console.error("[Justdial Scraper] Failed to save error screenshot: ", ssErr);
    }

    await updateImportLog(logId, {
      status: "FAILED",
      errorMessage: err.message || "An unknown error occurred during Playwright execution."
    });
    throw err;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function testJustdialSession(orgId: string): Promise<{ ok: boolean; title?: string; error?: string }> {
  let browser: any = null;
  try {
    const config = await getJustdialConfig(orgId);
    if (!config) throw new Error("Config not found");

    let cookiesJson = config.cookiesJson;
    if (!cookiesJson || cookiesJson.trim() === "") {
      const localCookiePath = "C:/Users/Purushothaman/Downloads/Cookie.txt";
      if (fs.existsSync(localCookiePath)) {
        cookiesJson = fs.readFileSync(localCookiePath, "utf8");
      }
    }

    if (!cookiesJson) throw new Error("No cookies set");

    const rawCookies = JSON.parse(cookiesJson);
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

    const headless = process.env.JUSTDIAL_HEADLESS !== "false";
    browser = await chromium.launch({
      headless,
      args: ["--disable-http2"]
    });
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 }
    });
    await context.addCookies(playwrightCookies);
    const page = await context.newPage();

    await page.goto(config.dashboardUrl, { waitUntil: "load", timeout: 30000 });
    const title = await page.title();
    
    // Check if login fields are visible
    if (await page.locator('input[type="tel"]').count() > 0 && await page.locator('button:has-text("Login")').count() > 0) {
      return { ok: false, error: "Authentication expired. Redirection to login detected." };
    }

    return { ok: true, title };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed session check" };
  } finally {
    if (browser) await browser.close();
  }
}
