/**
 * Simple collaboration tests that focus on core functionality
 * These tests are designed to validate the basic application works
 */

import { test, expect } from '@playwright/test';

test.describe('Simple Collaboration Tests', () => {
  
  test('should load the application successfully', async ({ page }) => {
    test.setTimeout(30000);
    
    await page.goto('http://localhost:5174');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check if the main title is present
    const title = page.locator('h1');
    await expect(title).toBeVisible({ timeout: 10000 });
    
    const titleText = await title.textContent();
    console.log(`Application title: ${titleText}`);
    
    // Verify it contains expected text
    expect(titleText).toContain('FFXIV');
  });

  test('should handle share link URLs', async ({ page }) => {
    test.setTimeout(30000);
    
    // Test accessing a share link URL
    const testPlanId = 'test-plan-' + Date.now();
    await page.goto(`http://localhost:5174/plan/shared/${testPlanId}`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // The application should load even if the plan doesn't exist
    const title = page.locator('h1');
    await expect(title).toBeVisible({ timeout: 10000 });
    
    const titleText = await title.textContent();
    console.log(`Share link page title: ${titleText}`);
    
    // Should still show the main application
    expect(titleText).toContain('FFXIV');
  });

  test('should support multiple browser contexts', async ({ browser }) => {
    test.setTimeout(45000);
    
    // Create two browser contexts
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    try {
      // Both pages load the application
      await page1.goto('http://localhost:5174');
      await page2.goto('http://localhost:5174');
      
      await page1.waitForLoadState('networkidle');
      await page2.waitForLoadState('networkidle');
      
      // Verify both pages loaded successfully
      const title1 = page1.locator('h1');
      const title2 = page2.locator('h1');
      
      await expect(title1).toBeVisible({ timeout: 10000 });
      await expect(title2).toBeVisible({ timeout: 10000 });
      
      const titleText1 = await title1.textContent();
      const titleText2 = await title2.textContent();
      
      console.log(`Page 1 title: ${titleText1}`);
      console.log(`Page 2 title: ${titleText2}`);
      
      expect(titleText1).toContain('FFXIV');
      expect(titleText2).toContain('FFXIV');
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should handle console errors gracefully', async ({ page }) => {
    test.setTimeout(30000);
    
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for any async operations
    await page.waitForTimeout(3000);
    
    // Check for critical errors (some errors are expected for missing plans)
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('Missing or insufficient permissions') &&
      !error.includes('Access denied to this plan') &&
      !error.includes('Failed to load shared plan') &&
      !error.includes('Firebase') // Firebase errors are expected in test environment
    );
    
    console.log(`Total console errors: ${consoleErrors.length}`);
    console.log(`Critical errors: ${criticalErrors.length}`);
    
    if (criticalErrors.length > 0) {
      console.log('Critical errors found:', criticalErrors.slice(0, 3)); // Show first 3
    }
    
    // Application should still be functional
    const title = page.locator('h1');
    await expect(title).toBeVisible();
    
    const titleText = await title.textContent();
    expect(titleText).toContain('FFXIV');
  });

  test('should handle invalid plan IDs gracefully', async ({ page }) => {
    test.setTimeout(30000);
    
    // Test with clearly invalid plan ID
    await page.goto('http://localhost:5174/plan/shared/invalid-plan-id');
    
    // Wait for error handling
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Application should handle this gracefully
    const currentUrl = page.url();
    console.log(`Invalid plan ID test - Final URL: ${currentUrl}`);
    
    // Should either redirect to home or show error page, but not crash
    const title = page.locator('h1');
    await expect(title).toBeVisible({ timeout: 10000 });
    
    const titleText = await title.textContent();
    expect(titleText).toBeTruthy();
    console.log(`Invalid plan page title: ${titleText}`);
  });

  test('should load within reasonable time', async ({ page }) => {
    test.setTimeout(30000);
    
    const startTime = Date.now();
    
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
    
    // Wait for main content to be visible
    const title = page.locator('h1');
    await expect(title).toBeVisible({ timeout: 10000 });
    
    const loadTime = Date.now() - startTime;
    
    console.log(`Application load time: ${loadTime}ms`);
    
    // Should load within 15 seconds (generous for CI environments)
    expect(loadTime).toBeLessThan(15000);
    
    // Verify application is functional
    const titleText = await title.textContent();
    expect(titleText).toContain('FFXIV');
  });

  test('should handle network issues gracefully', async ({ page }) => {
    test.setTimeout(30000);
    
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
    
    // Verify initial load
    const title = page.locator('h1');
    await expect(title).toBeVisible({ timeout: 10000 });
    
    // Simulate network issues for Firebase
    await page.route('**/firebase/**', route => {
      route.abort('failed');
    });
    
    // Wait for potential network errors
    await page.waitForTimeout(3000);
    
    // Application should still be functional
    await expect(title).toBeVisible();
    
    const titleText = await title.textContent();
    expect(titleText).toContain('FFXIV');
    
    // Remove the route
    await page.unroute('**/firebase/**');
    
    console.log('Network error handling test completed');
  });

  test('should handle Firebase connection errors', async ({ page }) => {
    test.setTimeout(30000);
    
    // Block Firebase requests from the start
    await page.route('**/firebaseapp.com/**', route => {
      route.abort('failed');
    });
    
    await page.route('**/googleapis.com/**', route => {
      route.abort('failed');
    });
    
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
    
    // Application should still load even without Firebase
    const title = page.locator('h1');
    await expect(title).toBeVisible({ timeout: 10000 });
    
    const titleText = await title.textContent();
    console.log(`Firebase blocked page title: ${titleText}`);
    
    expect(titleText).toContain('FFXIV');
    
    console.log('Firebase connection error test completed');
  });
});
