import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const EMAIL = process.env.EMAIL || "hr@adarshshipping.in";
const PW = process.env.PASSWORD || "password@123";
const PAGES = (process.env.PAGES || "/attendance,/attendance/reports,/hrms/settings").split(",");

const browser = await chromium.launch({ headless: true, args: ["--disable-dev-shm-usage", "--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.waitForSelector('input[name="email"]', { state: "visible" });
await page.waitForTimeout(800);
await page.fill('input[name="email"]', EMAIL);
await page.fill('input[name="password"]', PW);
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 }).catch(() => {});
console.log("login:", page.url());

for (const p of PAGES) {
  const cons = [], net = [], perr = [];
  const c = (m) => { if (m.type() === "error") cons.push(m.text().slice(0, 300)); };
  const n = (r) => { if (r.status() >= 400) net.push(`${r.status()} ${r.request().method()} ${r.url().replace(BASE, "")}`); };
  const e = (x) => perr.push(String(x).slice(0, 300));
  page.on("console", c); page.on("response", n); page.on("pageerror", e);
  let code = null;
  try { const r = await page.goto(`${BASE}${p}`, { waitUntil: "networkidle", timeout: 45000 }); code = r?.status(); }
  catch (err) { console.log(`${p} NAV-ERR ${String(err).slice(0, 120)}`); }
  await page.waitForTimeout(2000);
  const h1 = await page.locator("h1").first().textContent().catch(() => "");
  page.off("console", c); page.off("response", n); page.off("pageerror", e);
  console.log(`\n### ${p} [${code}] h1="${(h1 || "").trim()}"`);
  if (perr.length) console.log("  pageErrors:", perr);
  if (net.length) console.log("  netFail:", [...new Set(net)]);
  if (cons.length) console.log("  console(", cons.length, "):", [...new Set(cons)].slice(0, 8));
  if (!perr.length && !net.length && !cons.length) console.log("  clean");
}
await browser.close();
