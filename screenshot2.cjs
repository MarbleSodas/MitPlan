const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  
  // Take screenshots of different routes
  const routes = [
    { url: 'http://localhost:5173/', name: 'home' },
    { url: 'http://localhost:5173/planner', name: 'planner' },
    { url: 'http://localhost:5173/features', name: 'features' },
    { url: 'http://localhost:5173/privacy-policy', name: 'privacy' },
  ];
  
  for (const route of routes) {
    console.log(`Navigating to ${route.url}...`);
    await page.goto(route.url, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `/Users/eugene/Desktop/xivmitplan-${route.name}.png`, fullPage: false });
    console.log(`Saved: /Users/eugene/Desktop/xivmitplan-${route.name}.png`);
  }
  
  // Get page title
  const title = await page.title();
  console.log('Page title:', title);
  
  await browser.close();
  console.log('Done!');
})();
