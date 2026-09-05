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
await p.waitForTimeout(1500);

const d = await p.evaluate(() => {
  const out = [];
  // find Upcoming Deadlines card
  const cards = [...document.querySelectorAll(".ds-dash-panel-stack")];
  let target = null;
  for (const c of cards) if (c.textContent.includes("Upcoming Deadlines")) target = c;
  if (!target) return { err: "no deadlines card" };
  const cr = target.getBoundingClientRect();
  out.push({ card: "Upcoming Deadlines", right: cr.right, width: cr.width });
  target.querySelectorAll(".ds-deflist-row").forEach((row, i) => {
    const rr = row.getBoundingClientRect();
    const dd = row.querySelector(".ds-deflist-desc");
    const badge = row.querySelector(".ds-mod-badge");
    const inner = dd && dd.firstElementChild;
    out.push({
      row: i,
      rowRight: Math.round(rr.right),
      rowOverflow: row.scrollWidth > row.clientWidth ? `${row.scrollWidth} > ${row.clientWidth}` : "ok",
      ddRight: dd ? Math.round(dd.getBoundingClientRect().right) : null,
      ddScroll: dd ? `${dd.scrollWidth}/${dd.clientWidth}` : null,
      innerCls: inner ? inner.className : null,
      innerRight: inner ? Math.round(inner.getBoundingClientRect().right) : null,
      innerScroll: inner ? `${inner.scrollWidth}/${inner.clientWidth}` : null,
      badgeRight: badge ? Math.round(badge.getBoundingClientRect().right) : null,
      badgeText: badge ? badge.textContent.trim() : null,
      badgeVisible: badge ? (badge.getBoundingClientRect().right <= rr.right + 0.5) : null,
    });
  });
  return out;
});
console.log(JSON.stringify(d, null, 2));
await b.close();
