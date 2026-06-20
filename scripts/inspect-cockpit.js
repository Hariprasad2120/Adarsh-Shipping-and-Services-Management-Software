const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to login...');
  await page.goto('http://localhost:3000/login');
  await page.waitForSelector('#email');
  
  console.log('Logging in as poornima.v@adarshshipping.in...');
  await page.fill('#email', 'poornima.v@adarshshipping.in');
  await page.fill('#password', 'Adarsh@2026');
  
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle' })
  ]);
  
  console.log('Current URL:', page.url());
  
  const cockpitFound = await page.evaluate(() => {
    const banner = document.querySelector('.ds-dark-banner');
    if (!banner) return 'Banner NOT found';
    
    const h1 = banner.querySelector('h1');
    const computedH1 = h1 ? window.getComputedStyle(h1) : null;
    
    // Find all text elements and check their class and computed color
    const elements = Array.from(banner.querySelectorAll('*'));
    const textInfo = elements.map(el => {
      const computed = window.getComputedStyle(el);
      const text = el.innerText || '';
      if (text.length > 50 || text.includes('\n') || !el.className) return null;
      return {
        tag: el.tagName,
        className: el.className,
        color: computed.color,
        text: text
      };
    }).filter(Boolean);
    
    return {
      h1: h1 ? { className: h1.className, color: computedH1.color } : null,
      allText: textInfo
    };
  });
  
  console.log('Cockpit styles check:', JSON.stringify(cockpitFound, null, 2));
  
  await browser.close();
}

main().catch(console.error);
