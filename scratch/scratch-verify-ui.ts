import { chromium } from "playwright";

async function main() {
  console.log("Launching headless browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Navigating to login page...");
  await page.goto("http://localhost:3000/login");

  console.log("Entering credentials...");
  await page.fill("#email", "srivathsan.r@adarshshipping.in");
  await page.fill("#password", "password123");

  console.log("Submitting login form...");
  await page.click("button[type='submit']");

  console.log("Waiting for redirection to dashboard...");
  await page.waitForURL("**/dashboard", { timeout: 10000 });
  console.log("Login successful! Currently at:", page.url());

  console.log("Navigating to /ams...");
  await page.goto("http://localhost:3000/ams");
  await page.waitForLoadState("networkidle");
  console.log("Loaded /ams.");

  // Get the entire HTML of the header to inspect
  const headerHtml = await page.innerHTML("header");
  console.log("\n--- HEADER HTML ---");
  console.log(headerHtml);
  console.log("--------------------\n");

  // Find the icon and inspect its styles
  const info = await page.evaluate(() => {
    const header = document.querySelector("header");
    if (!header) return { error: "No header found" };
    
    // Find divs that look like icon containers
    const divs = Array.from(header.querySelectorAll("div"));
    const results = divs.map((div, idx) => {
      const svg = div.querySelector("svg");
      return {
        index: idx,
        tagName: div.tagName,
        className: div.className,
        computedBg: window.getComputedStyle(div).backgroundColor,
        hasSvg: !!svg,
        svgClass: svg ? svg.className.baseVal : "",
        svgComputedColor: svg ? window.getComputedStyle(svg).color : "",
        svgComputedFill: svg ? window.getComputedStyle(svg).fill : "",
      };
    }).filter(d => d.hasSvg || d.className.includes("bg-") || d.className.includes("rounded"));

    return { results };
  });

  console.log("Header elements analysis:", JSON.stringify(info, null, 2));

  await browser.close();
  console.log("Done.");
}

main().catch(console.error);
