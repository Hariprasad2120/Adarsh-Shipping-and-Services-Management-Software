import { chromium } from "playwright-core";
const BASE = "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('input[name="email"]', { timeout: 90000 });
await page.fill('input[name="email"]', "hr@adarshshipping.in");
await page.fill('input[name="password"]', "password@123");
await Promise.all([page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 30000 }).catch(() => {}), page.click('button[type="submit"]')]);
await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
await page.evaluate(() => { localStorage.setItem("theme", "dark"); });
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.mouse.move(3, 3);

const data = await page.evaluate(() => {
  const root = getComputedStyle(document.documentElement);
  const pick = (n) => root.getPropertyValue(n).trim();
  const out = {
    theme: document.documentElement.getAttribute("data-theme"),
    tokens: {
      "--ds-surface": pick("--ds-surface"),
      "--ds-border-subtle": pick("--ds-border-subtle"),
      "--ds-border": pick("--ds-border"),
      "--ds-shadow-sm": pick("--ds-shadow-sm"),
      "--background": pick("--background"),
      "--surface": pick("--surface"),
    },
    kpiCards: [],
    punchCard: null,
    punchButtons: [],
    rightPanels: [],
  };
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  out.bodyBg = bodyBg;

  document.querySelectorAll(".ds-statgrid > .ds-card").forEach((c) => {
    const cs = getComputedStyle(c);
    out.kpiCards.push({ bg: cs.backgroundColor, border: cs.borderColor, borderWidth: cs.borderWidth, boxShadow: cs.boxShadow.slice(0, 80) });
  });
  const pc = document.querySelector(".ds-punch");
  if (pc) { const cs = getComputedStyle(pc); out.punchCard = { bg: cs.backgroundColor, border: cs.borderColor, boxShadow: cs.boxShadow }; }
  document.querySelectorAll(".ds-punch-actions button").forEach((b) => {
    const cs = getComputedStyle(b);
    out.punchButtons.push({ text: b.textContent.trim(), bg: cs.backgroundColor, color: cs.color, border: cs.borderColor, opacity: cs.opacity });
  });
  document.querySelectorAll(".ds-dash-panel-stack, .ds-dash-widget-grid > .ds-card").forEach((c) => {
    const cs = getComputedStyle(c);
    out.rightPanels.push({ cls: c.className.slice(0, 40), bg: cs.backgroundColor, border: cs.borderColor });
  });
  // welcome card glow source
  const wc = document.querySelector(".ds-welcome, [class*='welcome']");
  if (wc) { const cs = getComputedStyle(wc); out.welcome = { cls: wc.className.slice(0,60), bg: cs.backgroundColor, boxShadow: cs.boxShadow, border: cs.borderColor }; }
  return out;
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
