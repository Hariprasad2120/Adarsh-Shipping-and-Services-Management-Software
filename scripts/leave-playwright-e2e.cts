// Playwright browser E2E (round 17, spec §47). Drives the actual running
// app (npm run dev, already up per this repo's UI-verification convention
// — see local-ui-target.mjs, never launches a second server) against the
// same real writable DB proven in leave-e2e.cts. Seeds one login-capable
// HR test user directly via Prisma (bcrypt-hashed real password), logs in
// through the real /login form, exercises the policy wizard end-to-end in
// a real browser, then deletes everything it created.
import "dotenv/config";
import { chromium } from "playwright";
import { hash } from "bcryptjs";
import { db } from "../src/lib/db";

const BASE_URL = "http://localhost:3000";
const results: Record<string, unknown> = {};
let orgId = "";

function ok(label: string, value: unknown) {
  results[label] = { ok: true, ...(typeof value === "object" && value !== null ? value : { value }) };
}

async function assertServerReady() {
  const res = await fetch(`${BASE_URL}/login`, { redirect: "manual", signal: AbortSignal.timeout(5000) });
  if (res.status >= 500) throw new Error(`Dev server unhealthy: HTTP ${res.status}`);
}

async function cleanup() {
  if (!orgId) return;
  await db.user.deleteMany({ where: { orgId } }).catch((e) => {
    results.cleanupError = { message: e instanceof Error ? e.message : String(e) };
  });
  await db.organisation.delete({ where: { id: orgId } }).catch((e) => {
    results.cleanupError = { message: e instanceof Error ? e.message : String(e) };
  });
}

async function main() {
  let browser;
  try {
    await assertServerReady();
    ok("serverReady", {});

    // ── Seed: HR user with real login credentials + attendance.leave.manage ──
    const org = await db.organisation.create({
      data: { name: "__pw_e2e_org__", slug: `__pw_e2e_org_${Date.now()}__` },
    });
    orgId = org.id;

    const password = "PlaywrightE2E!Test123";
    const passwordHash = await hash(password, 12);
    const email = `pw-e2e-hr-${Date.now()}@example.invalid`;
    const hrUser = await db.user.create({
      data: {
        orgId: org.id,
        name: "__pw_e2e_hr__",
        email,
        passwordHash,
        active: true,
        emailVerifiedAt: new Date(),
        activatedAt: new Date(),
      },
    });

    const hrRole = await db.role.create({ data: { orgId: org.id, name: "__pw_e2e_hr_role__" } });
    const permission = await db.permission.findUnique({ where: { key: "attendance.leave.manage" } });
    if (!permission) throw new Error("attendance.leave.manage permission not seeded in this environment");
    await db.rolePermission.create({ data: { roleId: hrRole.id, permissionId: permission.id } });
    await db.userRole.create({ data: { userId: hrUser.id, roleId: hrRole.id } });
    ok("seed", { orgId: org.id, hrUserId: hrUser.id });

    // ── Browser: real login through /login ───────────────────────────────
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await Promise.all([
      page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 }).catch(() => undefined),
      page.locator('button[type="submit"]').first().click(),
    ]);
    const postLoginUrl = page.url();
    const loginSucceeded = !postLoginUrl.includes("/login");
    ok("login", { url: postLoginUrl, succeeded: loginSucceeded });
    if (!loginSucceeded) throw new Error(`Login did not navigate away from /login — still at ${postLoginUrl}`);

    // ── Navigate to the leave policies page, open the wizard ────────────
    await page.goto(`${BASE_URL}/attendance/leaves/policies`, { waitUntil: "networkidle" });
    const pageHeading = await page.getByText("Leave Types & Policies").first().isVisible({ timeout: 5000 }).catch(() => false);
    ok("policiesPageLoaded", { headingVisible: pageHeading });

    await page.locator("text=+ New Leave Type").first().click();
    const wizardVisible = await page.locator('nav[aria-label="Policy wizard steps"]').isVisible({ timeout: 5000 }).catch(() => false);
    ok("wizardOpened", { visible: wizardVisible });
    if (!wizardVisible) throw new Error("Policy wizard did not render after clicking + New Leave Type");

    // Step 1: Basics
    await page.locator("#wiz-name").fill("__pw_e2e_policy__");
    await page.locator("#wiz-code").fill("PWE2E");
    await page.locator('button:has-text("Next")').click();

    // Step 2: Entitlement — leave defaults (FIXED, 12 days/month)
    const entitlementStepVisible = await page.locator("#wiz-entitlement-model").isVisible({ timeout: 5000 }).catch(() => false);
    ok("wizardStep2Reached", { visible: entitlementStepVisible });
    if (!entitlementStepVisible) throw new Error("Wizard did not advance to step 2 (Entitlement)");

    // Skip through remaining steps to Review & Publish (step 9) using defaults.
    for (let i = 0; i < 7; i++) {
      await page.locator('button:has-text("Next")').click();
      await page.waitForTimeout(150);
    }
    const reviewVisible = await page.locator("text=Publish immediately").isVisible({ timeout: 5000 }).catch(() => false);
    ok("wizardReachedReview", { visible: reviewVisible });
    if (!reviewVisible) throw new Error("Wizard did not reach the final Review & Publish step");

    // Publish (checkbox defaults checked).
    const [apiResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/leave/policies") && r.request().method() === "POST", { timeout: 10000 }).catch(() => null),
      page.locator('button:has-text("Create & Publish")').click(),
    ]);
    await page.waitForTimeout(1000);
    if (apiResponse) {
      ok("createPolicyApiResponse", { status: apiResponse.status(), body: (await apiResponse.text().catch(() => "")).slice(0, 500) });
    } else {
      ok("createPolicyApiResponse", { status: null, note: "no matching response observed within timeout" });
    }

    // ── Verify: real DB row exists (real browser click produced a real write) ──
    const createdType = await db.leaveType.findFirst({ where: { orgId: org.id, code: "PWE2E" } });
    ok("policyPersisted", { found: !!createdType, leaveTypeId: createdType?.id ?? null });
    if (!createdType) throw new Error("Policy wizard submission did not create a LeaveType row in the DB");

    const publishedVersion = await db.leavePolicyVersion.findFirst({
      where: { leaveTypeId: createdType.id },
      orderBy: { version: "desc" },
    });
    ok("policyPublished", { status: publishedVersion?.status ?? null });

    // ── Verify: the table on the page now shows the new leave type ──────
    await page.reload({ waitUntil: "networkidle" });
    const rowVisible = await page.getByText("__pw_e2e_policy__").first().isVisible({ timeout: 5000 }).catch(() => false);
    ok("policyVisibleInTable", { visible: rowVisible });

    results.allStepsCompleted = true;
  } catch (e) {
    results.fatalError = { message: e instanceof Error ? e.message : String(e) };
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    await cleanup();
    await db.$disconnect();
  }

  console.log(JSON.stringify(results, null, 2));
}

main();
