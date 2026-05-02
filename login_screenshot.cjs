const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  console.log('Navigating to login page...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);

  // Fill in login form
  console.log('Logging in...');
  await page.fill('input[type="email"], input[placeholder*="email" i], input[id*="email" i]', 'eugenepark03@gmail.com');
  await page.fill('input[type="password"], input[placeholder*="password" i], input[id*="password" i]', 'Epepep1434!');

  // Click sign in
  await page.click('button[type="submit"], button:has-text("Sign In")');
  await page.waitForTimeout(3000);

  // Take screenshot after login
  await page.screenshot({ path: '/Users/eugene/Desktop/xivmitplan-after-login.png', fullPage: false });
  console.log('Saved: after-login.png');

  // Navigate to planner
  console.log('Navigating to planner...');
  await page.goto('http://localhost:5173/planner', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/Users/eugene/Desktop/xivmitplan-planner-loggedin.png', fullPage: false });
  console.log('Saved: planner-loggedin.png');

  // Navigate to features
  console.log('Navigating to features...');
  await page.goto('http://localhost:5173/features', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/Users/eugene/Desktop/xivmitplan-features-loggedin.png', fullPage: false });
  console.log('Saved: features-loggedin.png');

  // Get page titles
  console.log('Current URL:', page.url());
  console.log('Page title:', await page.title());

  await browser.close();
  console.log('Done!');
})();
