import { chromium } from "playwright-core";
const BASE = "http://localhost:3000";
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext({ viewport: { width: 1440, height: 960 } })).newPage();
await p.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await p.waitForSelector('input[name="email"]', { timeout: 90000 });
await p.fill('input[name="email"]', "hr@adarshshipping.in");
await p.fill('input[name="password"]', "password@123");
await Promise.all([p.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 30000 }).catch(() => {}), p.click('button[type="submit"]')]);
await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
await p.evaluate(() => localStorage.setItem("theme", "dark"));
await p.reload({ waitUntil: "networkidle" });
await p.waitForTimeout(1500);

const d = await p.evaluate(() => {
  const out = {};
  // shell classes
  const shell = document.querySelector("[class*='mnx-dashboard-shell'], [class*='mono-shell']");
  out.shellClass = shell ? shell.className : "NONE";
  out.htmlClass = document.documentElement.className;
  out.htmlDataTheme = document.documentElement.getAttribute("data-theme");

  // find the KPI card, walk up
  const kpi = document.querySelector(".ds-statgrid > .ds-card");
  if (kpi) {
    const cs = getComputedStyle(kpi);
    out.kpi = { bg: cs.backgroundColor, border: cs.borderColor, shadow: cs.boxShadow.slice(0,90) };
    // which rule sets background? enumerate matched
  }
  // punch button
  const pb = document.querySelector(".ds-punch-actions button");
  if (pb) {
    const cs = getComputedStyle(pb);
    out.punchBtn = { text: pb.textContent.trim(), bg: cs.backgroundColor, color: cs.color, border: cs.borderColor, tone: pb.getAttribute("data-tone") };
  }
  // resolved tokens at shell + at :root
  const rootCS = getComputedStyle(document.documentElement);
  out.rootTokens = {
    surfaceElevated: rootCS.getPropertyValue("--surface-elevated").trim(),
    border: rootCS.getPropertyValue("--border").trim(),
    dsSurfaceRaised: rootCS.getPropertyValue("--ds-surface-raised").trim(),
    dsBorder: rootCS.getPropertyValue("--ds-border").trim(),
    background: rootCS.getPropertyValue("--background").trim(),
  };
  if (shell) {
    const sc = getComputedStyle(shell);
    out.shellTokens = {
      surfaceElevated: sc.getPropertyValue("--surface-elevated").trim(),
      border: sc.getPropertyValue("--border").trim(),
      dsSurfaceRaised: sc.getPropertyValue("--ds-surface-raised").trim(),
      dsBorder: sc.getPropertyValue("--ds-border").trim(),
    };
  }
  // list all stylesheet hrefs + count of rules mentioning mnx-dashboard-shell.mono-shell
  out.sheets = [];
  for (const ss of document.styleSheets) {
    let hit = 0, total = 0;
    try {
      for (const r of ss.cssRules) { total++; if (r.cssText && r.cssText.includes("mnx-dashboard-shell") && r.cssText.includes("mono-shell")) hit++; }
    } catch (e) { out.sheets.push({ href: ss.href, error: String(e).slice(0,60) }); continue; }
    out.sheets.push({ href: ss.href ? ss.href.split("/").pop() : "inline", total, monoShellRules: hit });
  }
  return out;
});
console.log(JSON.stringify(d, null, 2));
await b.close();
