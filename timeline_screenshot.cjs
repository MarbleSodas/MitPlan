const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  console.log('Navigating to plan...');
  await page.goto('https://www.xivmitplan.com/plan/edit/-OoffjjEm24SpvRfHGG1', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/Users/eugene/Desktop/xivmitplan-timeline-editor.png', fullPage: false });
  console.log('Saved: timeline-editor.png');

  console.log('Page title:', await page.title());
  console.log('Current URL:', page.url());

  await browser.close();
  console.log('Done!');
})();
