import { chromium } from "playwright-core";
const BASE = "http://localhost:3000";
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 960 } });
const p = await ctx.newPage();
await p.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await p.waitForSelector('input[name="email"]', { timeout: 90000 });
await p.fill('input[name="email"]', "hr@adarshshipping.in");
await p.fill('input[name="password"]', "password@123");
await Promise.all([p.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 30000 }).catch(()=>{}), p.click('button[type="submit"]')]);
await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
const OUT = process.argv[2];
for (const t of ["light","dark"]) {
  await p.evaluate((th)=>{ localStorage.setItem("theme",th); }, t);
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  // park mouse far away, off any interactive element
  await p.mouse.move(720, 12);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/clean-${t}.png`, fullPage: true });
  const pc = p.locator(".ds-punch");
  if (await pc.count()) await pc.first().screenshot({ path: `${OUT}/punch-${t}.png` });
  console.log("shot", t);
}
await b.close();
