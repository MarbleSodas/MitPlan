const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  
  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });
  
  // Wait a bit for React to fully render
  await page.waitForTimeout(2000);
  
  // Take screenshot of home page
  await page.screenshot({ path: '/Users/eugene/Desktop/xivmitplan-home.png', fullPage: false });
  console.log('Saved: /Users/eugene/Desktop/xivmitplan-home.png');
  
  const title = await page.title();
  console.log('Page title:', title);
  
  // Try to navigate to timeline editor if there's a link
  const links = await page.$$eval('a', links => links.map(a => ({ text: a.textContent?.trim(), href: a.href })).filter(l => l.text && l.href));
  console.log('Found links:', links.slice(0, 10));
  
  await browser.close();
  console.log('Done!');
})();
