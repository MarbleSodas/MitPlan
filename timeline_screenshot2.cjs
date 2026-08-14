const { chromium } = require('playwright');

(async () => {
  const email = process.env.MITPLAN_TEST_EMAIL;
  const password = process.env.MITPLAN_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error('Set MITPLAN_TEST_EMAIL and MITPLAN_TEST_PASSWORD before running this script.');
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  console.log('Going to login page...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);

  // Fill in login
  await page.fill('input[type="email"], input[placeholder*="email" i], input[id*="email" i]', email);
  await page.fill('input[type="password"], input[placeholder*="password" i], input[id*="password" i]', password);
  await page.click('button[type="submit"], button:has-text("Sign In")');
  await page.waitForTimeout(3000);

  console.log('Logged in, now navigating to plan...');
  await page.goto('http://localhost:5173/plan/edit/-OoffjjEm24SpvRfHGG1', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/Users/eugene/Desktop/xivmitplan-timeline-editor.png', fullPage: false });
  console.log('Saved: timeline-editor.png');

  console.log('Page title:', await page.title());
  console.log('Current URL:', page.url());

  // Also take a full page screenshot
  await page.screenshot({ path: '/Users/eugene/Desktop/xivmitplan-timeline-full.png', fullPage: true });
  console.log('Saved: timeline-full.png');

  await browser.close();
  console.log('Done!');
})();
