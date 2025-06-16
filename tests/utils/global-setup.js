import { chromium } from '@playwright/test';

async function globalSetup() {
  console.log('🚀 Starting global test setup...');
  
  // Launch browser for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Wait for the application to be ready
    console.log('⏳ Waiting for application to be ready...');
    await page.goto('http://localhost:5174');
    
    // Wait for the main app to load
    await page.waitForSelector('h1:has-text("FFXIV Boss Timeline & Mitigation Planner")', { timeout: 30000 });
    
    console.log('✅ Application is ready for testing');
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
