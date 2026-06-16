import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { getJustdialConfig, updateImportLog } from "./lead-source.service";
import { processJustdialLead } from "./crm-lead-conversion.service";

const globalForScraper = globalThis as unknown as {
  justdialStatus?: Record<string, any>;
  justdialScreenshot?: Record<string, string>;
};

if (!globalForScraper.justdialStatus) {
  globalForScraper.justdialStatus = {};
}
if (!globalForScraper.justdialScreenshot) {
  globalForScraper.justdialScreenshot = {};
}

function updateScrapeProgress(
  orgId: string,
  status: "IDLE" | "RUNNING" | "SUCCESS" | "FAILED",
  currentStep: string,
  newLog: string | null,
  currentUrl: string,
  processedCount: number,
  totalCount: number,
  existingLogs: string[]
) {
  if (newLog) {
    existingLogs.push(`[${new Date().toLocaleTimeString("en-IN")}] ${newLog}`);
    if (existingLogs.length > 15) {
      existingLogs.shift();
    }
  }

  globalForScraper.justdialStatus![orgId] = {
    status,
    currentStep,
    processedCount,
    totalCount,
    logs: existingLogs,
    currentUrl,
    timestamp: new Date().toISOString(),
  };
}

async function captureScrapeScreenshot(orgId: string, page: any) {
  try {
    const screenshotBuffer = await page.screenshot({ type: "png", timeout: 4000 });
    const base64 = screenshotBuffer.toString("base64");
    globalForScraper.justdialScreenshot![orgId] = `data:image/png;base64,${base64}`;
  } catch (err) {
    console.error("[Justdial Scraper] Error capturing live screenshot in memory:", err);
  }
}

export async function runJustdialImport(orgId: string, sysUserId: string, logId: string) {
  let browser: any = null;
  let page: any = null;
  let successCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  let totalCount = 0;

  const scraperLogs: string[] = [];
  let currentUrl = "";
  
  const updateProgress = (step: string, logMsg: string | null) => {
    updateScrapeProgress(
      orgId,
      "RUNNING",
      step,
      logMsg,
      currentUrl,
      successCount + updatedCount + failedCount + skippedCount,
      totalCount,
      scraperLogs
    );
  };

  try {
    updateProgress("Initializing browser context...", "Initializing Justdial Importer scraper...");

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
    const isVercel = !!process.env.VERCEL || !!process.env.VERCEL_ENV;
    const remoteUrl = process.env.PLAYWRIGHT_SERVICE_URL || process.env.BROWSERLESS_URL;

    if (remoteUrl) {
      updateProgress("Connecting to remote browser...", `Connecting to browser service at: ${remoteUrl}`);
      browser = await chromium.connectOverCDP(remoteUrl);
    } else {
      const launchArgs = [
        "--disable-http2",
        "--disable-blink-features=AutomationControlled"
      ];
      
      let runHeadless = headless;
      if (isVercel) {
        // Vercel serverless environment does not support GUI/display server, must run headless
        runHeadless = true;
      } else if (headless) {
        // Local dev: run headful offscreen to bypass bot WAF detection filters
        runHeadless = false;
        launchArgs.push("--window-position=4000,0");
        launchArgs.push("--window-size=1280,800");
      }

      updateProgress("Launching browser...", `Launching local browser (headless: ${runHeadless})...`);
      browser = await chromium.launch({
        headless: runHeadless,
        args: launchArgs
      });
    }

    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 }
    });

    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => false,
      });
    });

    await context.addCookies(playwrightCookies);
    page = await context.newPage();

    let targetUrl = dashboardUrl;
    
    // Unconditionally convert leaddashboard pages to enquiries and strip searchid snapshot constraints
    targetUrl = targetUrl.replace(/leaddashboard/g, "enquiries");
    try {
      const urlObj = new URL(targetUrl);
      urlObj.searchParams.delete("searchid");
      targetUrl = urlObj.toString();
    } catch (e) {}
    currentUrl = targetUrl;
    updateProgress("Navigating to Justdial...", `Navigating browser to enquiries page: ${targetUrl}`);
    
    let navigationDone = false;
    const screenshotLoop = (async () => {
      while (!navigationDone) {
        try {
          if (page && !page.isClosed()) {
            await captureScrapeScreenshot(orgId, page);
          }
        } catch (e) {}
        await new Promise(r => setTimeout(r, 4000));
      }
    })();

    try {
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 35000 });
    } catch (e: any) {
      console.warn("[Justdial Scraper] Navigation warning/timeout, proceeding anyway:", e.message);
      await page.waitForTimeout(5000);
    } finally {
      navigationDone = true;
    }
    currentUrl = page.url();
    await captureScrapeScreenshot(orgId, page);
    await page.waitForTimeout(2000);
    await captureScrapeScreenshot(orgId, page);
    // Check if redirect to login happened
    const currentUrlCheck = page.url();
    if (currentUrlCheck.includes("/login") || currentUrlCheck.includes("/signin") || await page.locator('input[type="tel"]').count() > 0 && await page.locator('button:has-text("Login")').count() > 0) {
      updateScrapeProgress(orgId, "FAILED", "Session Expired", "Authentication expired. Redirection to login detected.", currentUrlCheck, 0, 0, scraperLogs);
      throw new Error("Justdial session expired or invalid. Please refresh the Cookie JSON in Lead Sources settings.");
    }

    updateProgress("Session verified. Loading leads container...", "Justdial session cookie verified. Locating leads grid...");

    // 3. Extract Lead Cards
    // Wait for the cards container to render
    const cardWrapper = page.locator('div.enquiry-card');
    try {
      await cardWrapper.first().waitFor({ state: "visible", timeout: 25000 });
    } catch (e: any) {
      const htmlContent = await page.content();
      if (htmlContent.includes("Cloudflare") || htmlContent.includes("Attention Required!")) {
        throw new Error("Blocked by Cloudflare protection. Please refresh cookies in configuration.");
      }
      if (htmlContent.length < 800) {
        throw new Error("Empty response or blank page received from Justdial. Session cookies are expired or invalid.");
      }
      if (await page.locator('input[type="tel"]').count() > 0) {
        throw new Error("Justdial redirected to login. Cookies are expired.");
      }
      throw new Error(`Leads container not found. HTML size: ${htmlContent.length} bytes.`);
    }
    await captureScrapeScreenshot(orgId, page);

    // Scroll to load more cards if needed
    const limit = config.maxLeads || 50;
    let prevCount = 0;
    for (let scroll = 0; scroll < 10; scroll++) {
      const currentCount = await cardWrapper.locator('div.card-body').count();
      if (currentCount >= limit || currentCount === prevCount) {
        break;
      }
      prevCount = currentCount;
      updateProgress(`Scrolling to load more leads... (Found: ${currentCount})`, `Scrolling to load more leads. Found so far: ${currentCount}`);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
      await captureScrapeScreenshot(orgId, page);
    }

    const cards = await cardWrapper.locator('div.card-body').all();
    totalCount = Math.min(cards.length, limit);
    updateProgress(`Found ${cards.length} leads. Starting extraction...`, `Found ${cards.length} lead elements. Extracting top ${totalCount} records.`);

    const leadsData: any[] = [];

    for (let i = 0; i < totalCount; i++) {
      try {
        const card = cards[i];

        // Name (inside styles_userInfo__cLXcm -> span.font14.fw-semibold)
        const nameEl = card.locator('.styles_userInfo__cLXcm span.font14.fw-semibold');
        if (await nameEl.count() === 0) continue;
        const customerName = (await nameEl.innerText()).trim();

        updateProgress(`Extracting lead ${i + 1}/${totalCount}: ${customerName}`, `Retrieving details for ${customerName}...`);
        
        try {
          await card.scrollIntoViewIfNeeded();
          await page.waitForTimeout(500);
          await captureScrapeScreenshot(orgId, page);
        } catch (e) {}

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
          updateProgress(`Extracting lead ${i + 1}/${totalCount}: Clicking Call...`, `Clicking Call button for ${customerName}`);
          await callBtn.click();
          await page.waitForTimeout(1500); // wait for popover rendering
          await captureScrapeScreenshot(orgId, page);

          const tooltip = page.locator('.tooltip-inner').last();
          if (await tooltip.count() > 0) {
            mobile = (await tooltip.innerText()).trim();
            updateProgress(`Extracting lead ${i + 1}/${totalCount}: Phone retrieved`, `Retrieved phone number for ${customerName}: ${mobile}`);
          } else {
            updateProgress(`Extracting lead ${i + 1}/${totalCount}: Tooltip missing`, `Warning: Call tooltip not found for ${customerName}`);
          }
        }

        if (!mobile) {
          console.log(`[Justdial Scraper] Skipping lead ${customerName} because mobile number could not be retrieved.`);
          failedCount++;
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
        failedCount++;
      }
    }

    updateProgress("Ingesting leads into database...", `Parsed ${leadsData.length} records successfully. Running CRM database ingestion...`);

    // 4. Ingest into CRM DB
    for (const lead of leadsData) {
      updateProgress(`Saving lead: ${lead.customerName}`, `Ingesting parsed lead for ${lead.customerName}...`);
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

    updateScrapeProgress(
      orgId,
      "SUCCESS",
      "Sync Completed",
      `Completed successfully. New: ${successCount}, Updated: ${updatedCount}, Failed/Skipped: ${failedCount}`,
      currentUrl,
      totalCount,
      totalCount,
      scraperLogs
    );

  } catch (err: any) {
    console.error("[Justdial Scraper] Scrape operation failed: ", err);
    
    // Save error screenshot
    try {
      if (browser && page) {
        await captureScrapeScreenshot(orgId, page);
      }
    } catch (ssErr) {
      console.error("[Justdial Scraper] Failed to save error screenshot: ", ssErr);
    }

    await updateImportLog(logId, {
      status: "FAILED",
      errorMessage: err.message || "An unknown error occurred during Playwright execution."
    });

    updateScrapeProgress(
      orgId,
      "FAILED",
      "Failed: " + (err.message || "Scraper error"),
      `Crawl failure: ${err.message || "An unknown error occurred"}`,
      currentUrl,
      successCount + updatedCount + failedCount + skippedCount,
      totalCount,
      scraperLogs
    );

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
    const isVercel = !!process.env.VERCEL || !!process.env.VERCEL_ENV;
    const remoteUrl = process.env.PLAYWRIGHT_SERVICE_URL || process.env.BROWSERLESS_URL;

    if (remoteUrl) {
      browser = await chromium.connectOverCDP(remoteUrl);
    } else {
      const launchArgs = [
        "--disable-http2",
        "--disable-blink-features=AutomationControlled"
      ];
      
      let runHeadless = headless;
      if (isVercel) {
        runHeadless = true;
      } else if (headless) {
        runHeadless = false;
        launchArgs.push("--window-position=4000,0");
        launchArgs.push("--window-size=1280,800");
      }

      browser = await chromium.launch({
        headless: runHeadless,
        args: launchArgs
      });
    }
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 }
    });
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => false,
      });
    });
    await context.addCookies(playwrightCookies);
    const page = await context.newPage();

    try {
      await page.goto(config.dashboardUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    } catch (e: any) {
      console.warn("[Justdial Session check] page.goto warning/timeout:", e.message);
      await page.waitForTimeout(3000);
    }
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
