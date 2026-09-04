import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const EMAIL = process.env.EMAIL || "hr@adarshshipping.in";
const PASSWORD = process.env.PASSWORD || "password@123";
const OUT = process.env.OUT || "./pw-out";
const SHOTS = process.env.SHOTS === "1";
const PAGES = (process.env.PAGES || "/hrms,/attendance").split(",").map(s => s.trim()).filter(Boolean);

fs.mkdirSync(OUT, { recursive: true });
const resFile = path.join(OUT, "results.json");
let results = [];
try { results = JSON.parse(fs.readFileSync(resFile, "utf8")); } catch {}
const done = new Set(results.map(r => r.path));
const save = () => fs.writeFileSync(resFile, JSON.stringify(results, null, 2));

const browser = await chromium.launch({
  headless: true,
  args: ["--disable-dev-shm-usage", "--no-sandbox", "--js-flags=--max-old-space-size=512",
         "--disable-gpu", "--disable-extensions", "--renderer-process-limit=1"],
});
let ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
let page = await ctx.newPage();

async function login() {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  const emailSel = 'input[type="email"], input[name="email"]';
  const pwSel = 'input[type="password"], input[name="password"]';
  await page.waitForSelector(emailSel, { state: "visible", timeout: 20000 });
  await page.waitForFunction((s) => { const el = document.querySelector(s); return el && !el.disabled; }, emailSel, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.fill(emailSel, EMAIL);
  await page.fill(pwSel, PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  return !page.url().includes("/login");
}

async function freshPage() {
  try { await page.close(); } catch {}
  try { await ctx.close(); } catch {}
  ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await ctx.newPage();
  await login();
}

if (!(await login())) {
  console.log(`LOGIN ${EMAIL}: FAILED -> ${page.url()}`);
  await browser.close();
  process.exit(2);
}
console.log(`LOGIN ${EMAIL}: OK -> ${page.url()}`);

let sinceFresh = 0;
for (const p of PAGES) {
  if (done.has(p)) { console.log(`skip ${p} (done)`); continue; }
  if (sinceFresh >= 5) { await freshPage(); sinceFresh = 0; }

  let rec = null;
  for (let attempt = 1; attempt <= 2 && !rec; attempt++) {
    const consoleErrors = [], pageErrors = [], netFail = [];
    const onConsole = (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 400)); };
    const onPageErr = (e) => pageErrors.push(String(e).slice(0, 400));
    const onResp = (r) => { if (r.status() >= 400) netFail.push(`${r.status()} ${r.request().method()} ${r.url().replace(BASE, "")}`); };
    page.on("console", onConsole); page.on("pageerror", onPageErr); page.on("response", onResp);
    let status = "ok", httpStatus = null;
    try {
      const resp = await page.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded", timeout: 35000 });
      httpStatus = resp?.status() ?? null;
      await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(400);
      const h1 = await page.locator("h1").first().textContent().catch(() => null);
      const bodyText = ((await page.textContent("body").catch(() => "")) || "").replace(/\s+/g, " ").slice(0, 20000);
      if (SHOTS) {
        const slug = p.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "root";
        await page.screenshot({ path: path.join(OUT, `${slug}.png`) }).catch(() => {});
      }
      const looksError = /Application error: a (server-side|client-side) exception|Unhandled Runtime Error|digest: "\d|500: Internal Server Error/i.test(bodyText);
      const accessDenied = /(not authori[sz]ed|access denied|permission denied|you do not have permission|forbidden)/i.test(bodyText) && bodyText.length < 4000;
      rec = { path: p, httpStatus, status, h1: (h1 || "").trim().slice(0, 120),
              looksError, accessDenied, thin: bodyText.length < 400, bodyLen: bodyText.length,
              consoleErrors, pageErrors, netFail: [...new Set(netFail)] };
    } catch (e) {
      const msg = String(e).slice(0, 200);
      if (attempt === 1 && /crash|Target closed|Navigation failed because/i.test(msg)) {
        console.log(`  ${p} crashed, recreating page...`);
        page.off("console", onConsole); page.off("pageerror", onPageErr); page.off("response", onResp);
        await freshPage(); sinceFresh = 0;
        continue;
      }
      rec = { path: p, httpStatus, status: "nav-error: " + msg, h1: "", looksError: false,
              accessDenied: false, thin: true, bodyLen: 0, consoleErrors, pageErrors, netFail: [...new Set(netFail)] };
    } finally {
      page.off("console", onConsole); page.off("pageerror", onPageErr); page.off("response", onResp);
    }
  }
  results.push(rec); save(); sinceFresh++;
  const f = [];
  if (rec.looksError) f.push("ERR");
  if (rec.accessDenied) f.push("DENIED");
  if (rec.thin) f.push("THIN");
  if (rec.status !== "ok") f.push(rec.status.slice(0, 40));
  if (rec.consoleErrors.length) f.push("cErr" + rec.consoleErrors.length);
  if (rec.netFail.length) f.push("net:" + rec.netFail.join("|").slice(0, 100));
  if (rec.pageErrors.length) f.push("pErr:" + rec.pageErrors.join(";").slice(0, 120));
  console.log(`${p} [${rec.httpStatus}] "${(rec.h1 || "").slice(0, 28)}" ${f.join("  ")}`);
}

save();
await browser.close();
console.log("\nWROTE", resFile, `(${results.length} pages)`);
