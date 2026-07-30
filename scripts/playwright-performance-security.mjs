import { chromium } from "playwright";

const baseUrl = process.env.UI_TEST_BASE_URL ?? "http://127.0.0.1:3000";
const sentinelPassword = "url-leak-sentinel-password";
let browser;

try {
  browser = await chromium.launch({ headless: true });

  const noJavaScript = await browser.newContext({ javaScriptEnabled: false });
  const page = await noJavaScript.newPage();
  const requestedUrls = [];
  page.on("request", (request) => requestedUrls.push(request.url()));

  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  const form = page.locator("form");
  if ((await form.getAttribute("method"))?.toLowerCase() !== "post") {
    throw new Error("Login form does not declare a native POST fallback.");
  }
  // Production intentionally disables controls until hydration. Remove only
  // that safety belt in the isolated browser so the native fallback itself is
  // exercised with JavaScript disabled.
  await page.locator("input, button").evaluateAll((elements) => {
    for (const element of elements) element.removeAttribute("disabled");
  });
  await page.locator('input[name="email"]').fill("security-test@example.invalid");
  await page.locator('input[name="password"]').fill(sentinelPassword);
  await Promise.all([
    page.waitForLoadState("domcontentloaded").catch(() => undefined),
    form.evaluate((element) => element.requestSubmit()),
  ]);

  const leakedUrl = [page.url(), ...requestedUrls].find((url) =>
    decodeURIComponent(url).includes(sentinelPassword),
  );
  if (leakedUrl || new URL(page.url()).searchParams.has("password")) {
    throw new Error("Login password appeared in a URL during native form submission.");
  }
  await noJavaScript.close();

  const email = process.env.UI_TEST_EMAIL;
  const password = process.env.UI_TEST_PASSWORD;
  if (email && password) {
    const authenticated = await browser.newContext();
    const dashboard = await authenticated.newPage();
    const motionWarnings = [];
    dashboard.on("console", (message) => {
      if (/not an animatable value/i.test(message.text())) {
        motionWarnings.push(message.text());
      }
    });
    await dashboard.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
    await dashboard.locator('input[name="email"]').fill(email);
    await dashboard.locator('input[name="password"]').fill(password);
    await dashboard.locator('button[type="submit"]').click();
    await dashboard.waitForURL((url) => url.pathname !== "/login", { timeout: 30_000 });
    await dashboard.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
    if (motionWarnings.length > 0) {
      throw new Error(`Motion console warning detected: ${motionWarnings.join(" | ")}`);
    }
    await authenticated.close();
  }

  console.log(
    email && password
      ? "Passed native login URL-leak and authenticated motion-warning checks."
      : "Passed native login URL-leak check; authenticated motion check skipped (credentials not provided).",
  );
} finally {
  await browser?.close();
}
