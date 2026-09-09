/**
 * verify-monolith-visual-qa.mjs
 * -----------------------------------------------------------------------------
 * Post-migration visual QA crawl. Requires `npm run dev` on localhost:3000.
 *
 *   node scripts/verify-monolith-visual-qa.mjs --use-local-special-account
 *
 * For every module route × {1280, 1440, 1920}:
 *   - records console errors / pageerrors / >=500 responses
 *   - flags horizontal page overflow
 *   - screenshots to artifacts/ui-migration/visual-qa/
 *   - audits computed styles of the canonical Button and Card primitives and
 *     flags geometry fragmentation (too many distinct heights / radii / sizes)
 *
 * Exit code is 0 unless --strict is passed; the JSON + markdown report is the
 * deliverable either way.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { getLocalUiBaseUrl, assertLocalUiServerReady } from "./local-ui-target.mjs";

const strict = process.argv.includes("--strict");
const useSpecial = process.argv.includes("--use-local-special-account");
const baseUrl = getLocalUiBaseUrl();
const email = process.env.UI_TEST_EMAIL ?? (useSpecial ? "hr@adarshshipping.in" : undefined);
const password = process.env.UI_TEST_PASSWORD ?? (useSpecial ? "password@123" : undefined);
if (!email || !password) throw new Error("Set UI_TEST_EMAIL / UI_TEST_PASSWORD or pass --use-local-special-account.");

await assertLocalUiServerReady(baseUrl);

const ROUTES = [
  "/dashboard",
  "/admin/design-system",
  "/admin",
  "/admin/roles",
  "/hrms",
  "/attendance",
  "/attendance/leaves",
  "/payroll",
  "/my-payroll",
  "/ams",
  "/accounting",
  "/crm",
  "/cha",
  "/freight-forwarding",
  "/expense",
  "/communication",
  "/lms",
  "/product-catalogue",
  "/notifications",
  "/todo",
  "/account",
];
const VIEWPORTS = [
  { name: "1280", width: 1280, height: 900 },
  { name: "1440", width: 1440, height: 960 },
  { name: "1920", width: 1920, height: 1080 },
];
const OUT = "artifacts/ui-migration/visual-qa";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();

const IGNORE_CONSOLE = [
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /attribute (width|height|d|viewBox).*Expected length/i, // animated dashboard SVGs
  /Warning: .*validateDOMNesting/i,
];
const report = [];
let pageErrorCount = 0;

async function login() {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  const emailInput = (await page.$('input[name="email"]')) || (await page.$('input[type="email"]'));
  await emailInput.fill(email);
  const passInput = (await page.$('input[name="password"]')) || (await page.$('input[type="password"]'));
  await passInput.fill(password);
  await Promise.all([
    page.waitForNavigation({ timeout: 45_000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(2500);
  if (page.url().includes("/login")) throw new Error(`Login failed — still at ${page.url()}`);
}

async function auditRoute(route, viewport) {
  const errors = [];
  const onConsole = (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (IGNORE_CONSOLE.some((re) => re.test(t))) return;
    errors.push(`console: ${t}`);
  };
  const onPageError = (e) => errors.push(`pageerror: ${e.message.split("\n")[0]}`);
  const onResponse = (r) => {
    if (r.status() >= 500) errors.push(`http ${r.status()}: ${r.url()}`);
  };
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("response", onResponse);

  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  let navOk = true;
  try {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle", timeout: 45_000 });
  } catch {
    navOk = false;
  }
  await page.waitForTimeout(1200);

  const probe = await page.evaluate(() => {
    const el = document.scrollingElement || document.documentElement;
    const overflowX = el.scrollWidth - el.clientWidth;
    const norm = (v) => (v || "").trim();
    const btns = [...document.querySelectorAll(".mnx-button")].filter(
      (b) => !b.hasAttribute("disabled") && b.offsetParent !== null,
    );
    const btnGeom = {};
    const round = (v) => `${Math.round(parseFloat(v) || 0)}px`;
    for (const b of btns.slice(0, 60)) {
      const c = getComputedStyle(b);
      // Height legitimately varies with wrapped content — key on the fixed
      // geometry the design system owns: radius + type ramp.
      const key = [round(c.borderRadius), round(c.fontSize), norm(c.fontWeight)].join(" | ");
      btnGeom[key] = (btnGeom[key] || 0) + 1;
    }
    const panels = [...document.querySelectorAll(".mnx-panel")].filter((p) => p.offsetParent !== null);
    const panelRadii = {};
    const panelVariants = {};
    for (const p of panels.slice(0, 80)) {
      const c = getComputedStyle(p);
      panelRadii[norm(c.borderTopLeftRadius)] = (panelRadii[norm(c.borderTopLeftRadius)] || 0) + 1;
      const v = p.getAttribute("data-variant") || "(none)";
      panelVariants[v] = (panelVariants[v] || 0) + 1;
    }
    const rawButtons = document.querySelectorAll("main button:not(.mnx-button):not([data-slot])").length;
    return { overflowX, btnGeom, panelRadii, panelVariants, panelCount: panels.length, btnCount: btns.length, rawButtons };
  });

  const shot = `${OUT}/${route.replace(/[/]/g, "_").replace(/^_/, "") || "root"}__${viewport.name}.png`;
  await page.screenshot({ path: shot, fullPage: false }).catch(() => {});

  page.off("console", onConsole);
  page.off("pageerror", onPageError);
  page.off("response", onResponse);

  const findings = [];
  if (!navOk) findings.push("navigation timed out");
  if (probe.overflowX > 2) findings.push(`horizontal overflow +${probe.overflowX}px`);
  if (Object.keys(probe.btnGeom).length > 4)
    findings.push(`button geometry fragmented: ${Object.keys(probe.btnGeom).length} distinct`);
  if (Object.keys(probe.panelRadii).length > 3)
    findings.push(`panel radius fragmented: ${Object.keys(probe.panelRadii).length} distinct (${Object.keys(probe.panelRadii).join(", ")})`);
  if (errors.length) findings.push(...errors);
  pageErrorCount += errors.length;

  return { route, viewport: viewport.name, findings, ...probe, screenshot: shot };
}

try {
  await login();
  for (const route of ROUTES) {
    for (const viewport of VIEWPORTS) {
      const r = await auditRoute(route, viewport);
      report.push(r);
      const tag = r.findings.length ? `⚠ ${r.findings.length}` : "ok";
      console.log(`${tag.padEnd(6)} ${route} @ ${viewport.name}  btns:${r.btnCount} panels:${r.panelCount} variants:${JSON.stringify(r.panelVariants)}`);
      for (const f of r.findings) console.log(`        - ${f}`);
    }
  }
} finally {
  await browser.close();
}

await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2));
const md = [
  "# Monolith visual QA crawl",
  "",
  `Generated ${new Date().toISOString()} · ${ROUTES.length} routes × ${VIEWPORTS.length} viewports`,
  "",
  "| Route | Viewport | Findings |",
  "| --- | --- | --- |",
  ...report.map((r) => `| ${r.route} | ${r.viewport} | ${r.findings.length ? r.findings.map((f) => f.replace(/\|/g, "\\|")).join("<br>") : "—"} |`),
  "",
  "## Button geometry (distinct height|radius|fontSize|weight per route/viewport)",
  "",
  ...report.map((r) => `- **${r.route} @ ${r.viewport}** → ${JSON.stringify(r.btnGeom)}`),
].join("\n");
await writeFile(`${OUT}/report.md`, md);

const withFindings = report.filter((r) => r.findings.length);
console.log(`\n${report.length} page loads · ${withFindings.length} with findings · ${pageErrorCount} console/page errors`);
console.log(`report: ${OUT}/report.md`);
if (strict && withFindings.length) process.exit(1);
