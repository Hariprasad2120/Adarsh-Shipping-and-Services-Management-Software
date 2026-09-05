import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const OUT = process.argv[2] || "shots";
const BASE = "http://localhost:3000";
const EMAIL = "hr@adarshshipping.in";
const PASS = "password@123";
fs.mkdirSync(OUT, { recursive: true });

const consoleErrors = [];
const pageErrors = [];
const badRequests = [];

const browser = await chromium.launch({
  headless: true,
  executablePath: undefined, // let playwright-core resolve
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
page.on("pageerror", (e) => pageErrors.push(String(e)));
page.on("response", (r) => {
  if (r.status() >= 400) badRequests.push(`${r.status()} ${r.url()}`);
});

async function shot(name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  console.log("shot:", name);
}

// --- login ---
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
try {
  await page.waitForSelector('input[name="email"]', { timeout: 90000 });
} catch (e) {
  await page.screenshot({ path: path.join(OUT, "login-FAIL.png"), fullPage: true });
  console.log("LOGIN PAGE HTML SNIPPET:", (await page.content()).slice(0, 2000));
  throw e;
}
await page.fill('input[name="email"]', EMAIL);
await page.fill('input[name="password"]', PASS);
await Promise.all([
  page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 30000 }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
await page.waitForLoadState("networkidle").catch(() => {});
console.log("after login url:", page.url());

// --- dashboard ---
await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

async function setTheme(theme) {
  await page.evaluate((t) => {
    localStorage.setItem("theme", t);
    document.documentElement.setAttribute("data-theme", t);
  }, theme);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const applied = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  console.log(`theme requested=${theme} applied=${applied}`);
}

// probe helpers
async function probe(theme) {
  const report = await page.evaluate(() => {
    const out = { theme: document.documentElement.getAttribute("data-theme"), issues: [] };
    const vh = window.innerHeight, vw = window.innerWidth;

    // overflow on body
    if (document.documentElement.scrollWidth > vw + 2)
      out.issues.push(`horizontal overflow: scrollWidth=${document.documentElement.scrollWidth} vw=${vw}`);

    const px = (v) => parseFloat(v) || 0;
    const contrastMiss = [];
    const zeroSize = [];
    const clipped = [];
    const transparentText = [];

    const els = Array.from(document.querySelectorAll(".ds-dash *, .ds-punch *, .ds-metric *, .ds-quickaction, button, a"));
    for (const el of els) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const tag = el.tagName.toLowerCase();
      const cls = (el.className && el.className.baseVal !== undefined) ? el.className.baseVal : String(el.className || "");
      const id = `${tag}.${cls.split(" ").filter(Boolean).slice(0,2).join(".")}`;

      // invisible but has text
      const txt = (el.textContent || "").trim();
      if (txt && (cs.color === "rgba(0, 0, 0, 0)" || cs.color === "transparent"))
        transparentText.push(id);

      // buttons/links with zero box but visible
      if ((tag === "button" || tag === "a") && cs.display !== "none" && cs.visibility !== "hidden") {
        if (r.width < 2 || r.height < 2) zeroSize.push(`${id} (${Math.round(r.width)}x${Math.round(r.height)})`);
        // tap target
        if (r.width > 0 && r.height > 0 && (r.height < 24 || r.width < 24))
          out.issues.push(`small tap target ${id}: ${Math.round(r.width)}x${Math.round(r.height)}`);
      }

      // content clipped by overflow hidden + text wider than box
      if (cs.overflow === "hidden" && el.scrollWidth > el.clientWidth + 4 && txt.length > 0 && r.height > 0) {
        clipped.push(`${id}: scrollW=${el.scrollWidth} clientW=${el.clientWidth} "${txt.slice(0,40)}"`);
      }
    }
    if (transparentText.length) out.issues.push("transparent text: " + [...new Set(transparentText)].slice(0,10).join(", "));
    if (zeroSize.length) out.issues.push("zero-size interactive: " + [...new Set(zeroSize)].slice(0,10).join(", "));
    if (clipped.length) out.issues.push("clipped text: " + clipped.slice(0,10).join(" | "));

    // unresolved css vars (computed value literally 'var(' — rare) or empty backgrounds on cards
    const cards = Array.from(document.querySelectorAll(".ds-metric, .ds-punch, .ds-dash-panel-stack, .ds-card"));
    for (const c of cards) {
      const cs = getComputedStyle(c);
      const bg = cs.backgroundColor;
      const r = c.getBoundingClientRect();
      if (r.height < 10) out.issues.push(`collapsed card ${c.className}: h=${Math.round(r.height)}`);
    }

    return out;
  });
  report.consoleErrors = [...consoleErrors];
  report.pageErrors = [...pageErrors];
  report.badRequests = [...new Set(badRequests)].filter((u) => !u.includes("favicon"));
  return report;
}

const results = {};
for (const theme of ["light", "dark"]) {
  consoleErrors.length = 0; pageErrors.length = 0; badRequests.length = 0;
  await page.mouse.move(5, 5);
  await setTheme(theme);
  await page.mouse.move(5, 5);
  await page.waitForTimeout(300);
  await shot(`dashboard-${theme}`);

  // click through punch actions if present
  const punch = page.locator(".ds-punch");
  if (await punch.count()) {
    await punch.first().screenshot({ path: path.join(OUT, `punch-${theme}.png`) });
  }
  // metric cards
  const metrics = page.locator(".ds-statgrid");
  if (await metrics.count()) {
    await metrics.first().screenshot({ path: path.join(OUT, `metrics-${theme}.png`) });
  }
  // hover first quick action / button
  const btn = page.locator(".ds-dash button, .ds-punch button").first();
  if (await btn.count()) {
    await btn.hover().catch(() => {});
    await page.waitForTimeout(300);
    await shot(`dashboard-${theme}-hover`);
  }

  results[theme] = await probe(theme);
}

fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(results, null, 2));
console.log("\n==== REPORT ====");
console.log(JSON.stringify(results, null, 2));

await browser.close();
