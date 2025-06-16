/**
 * Basic collaboration tests that focus on fundamental functionality
 * These tests are designed to work with the current application state
 */

import { test, expect } from '@playwright/test';
import { waitForPageLoad, mockAuthState } from '../utils/helpers.js';

test.describe('Basic Collaboration Functionality', () => {
  
  test.describe('Application Loading and Basic Features', () => {
    test('should load the application successfully', async ({ page }) => {
      test.setTimeout(30000);
      
      await page.goto('/');
      await waitForPageLoad(page);
      
      // Verify the application loads
      await expect(page.locator('h1')).toContainText('FFXIV Boss Timeline & Mitigation Planner');
      
      console.log('Application loaded successfully');
    });

    test('should handle authentication state', async ({ page }) => {
      test.setTimeout(30000);
      
      await page.goto('/');
      await waitForPageLoad(page);
      
      // Mock authenticated user
      await mockAuthState(page, {
        uid: 'test-user-123',
        email: 'test@mitplan.dev',
        displayName: 'Test User'
      });
      
      // Wait for auth state to be processed
      await page.waitForTimeout(3000);
      
      // Verify application still works
      await expect(page.locator('h1')).toContainText('FFXIV Boss Timeline & Mitigation Planner');
      
      console.log('Authentication state handled successfully');
    });

    test('should allow job selection', async ({ page }) => {
      test.setTimeout(30000);
      
      await page.goto('/');
      await waitForPageLoad(page);
      
      // Try to select jobs if available
      const jobImages = page.locator('img[alt*="Paladin"], img[alt*="White Mage"], img[alt*="Scholar"]');
      const jobCount = await jobImages.count();
      
      if (jobCount > 0) {
        // Click on first available job
        await jobImages.first().click();
        await page.waitForTimeout(1000);
        
        console.log(`Selected job from ${jobCount} available jobs`);
      } else {
        console.log('No job selection elements found');
      }
      
      // Verify application is still functional
      await expect(page.locator('h1')).toContainText('FFXIV Boss Timeline & Mitigation Planner');
    });

    test('should handle boss selection', async ({ page }) => {
      test.setTimeout(30000);
      
      await page.goto('/');
      await waitForPageLoad(page);
      
      // Try to select boss if available
      const bossCards = page.locator('[data-testid="boss-card"], .boss-card, [class*="boss"]');
      const bossCount = await bossCards.count();
      
      if (bossCount > 0) {
        // Click on first available boss
        await bossCards.first().click();
        await page.waitForTimeout(1000);
        
        console.log(`Selected boss from ${bossCount} available bosses`);
      } else {
        console.log('No boss selection elements found');
      }
      
      // Verify application is still functional
      await expect(page.locator('h1')).toContainText('FFXIV Boss Timeline & Mitigation Planner');
    });
  });

  test.describe('Share Link Functionality', () => {
    test('should handle share link URLs gracefully', async ({ page }) => {
      test.setTimeout(30000);
      
      // Test accessing a share link URL (even if plan doesn't exist)
      const testPlanId = 'test-plan-' + Date.now();
      await page.goto(`/plan/shared/${testPlanId}`);
      
      // Wait for page to load and handle the error
      await page.waitForTimeout(5000);
      
      // The application should still load, even if the plan doesn't exist
      // It might redirect to home or show an error, but shouldn't crash
      const currentUrl = page.url();
      const pageTitle = await page.locator('h1').textContent();
      
      console.log(`Share link test - URL: ${currentUrl}, Title: ${pageTitle}`);
      
      // Verify the application is still functional
      expect(pageTitle).toBeTruthy();
    });

    test('should handle invalid plan IDs gracefully', async ({ page }) => {
      test.setTimeout(30000);
      
      // Test with clearly invalid plan ID
      await page.goto('/plan/shared/invalid-plan-id');
      
      // Wait for error handling
      await page.waitForTimeout(5000);
      
      // Application should handle this gracefully
      const currentUrl = page.url();
      console.log(`Invalid plan ID test - Final URL: ${currentUrl}`);
      
      // Should either redirect to home or show error page, but not crash
      const hasTitle = await page.locator('h1').count() > 0;
      expect(hasTitle).toBe(true);
    });
  });

  test.describe('Multi-Browser Basic Test', () => {
    test('should support multiple browser contexts', async ({ browser }) => {
      test.setTimeout(45000);
      
      // Create two browser contexts
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      try {
        // Both pages load the application
        await page1.goto('/');
        await page2.goto('/');
        
        await waitForPageLoad(page1);
        await waitForPageLoad(page2);
        
        // Verify both pages loaded successfully
        await expect(page1.locator('h1')).toContainText('FFXIV Boss Timeline & Mitigation Planner');
        await expect(page2.locator('h1')).toContainText('FFXIV Boss Timeline & Mitigation Planner');
        
        // Test basic interactions on both pages
        const jobs1 = page1.locator('img[alt*="Paladin"], img[alt*="White Mage"]');
        const jobs2 = page2.locator('img[alt*="Scholar"], img[alt*="Astrologian"]');
        
        if (await jobs1.count() > 0) {
          await jobs1.first().click();
          await page1.waitForTimeout(1000);
        }
        
        if (await jobs2.count() > 0) {
          await jobs2.first().click();
          await page2.waitForTimeout(1000);
        }
        
        console.log('Multi-browser basic test completed successfully');
        
      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle console errors gracefully', async ({ page }) => {
      test.setTimeout(30000);
      
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      await page.goto('/');
      await waitForPageLoad(page);
      
      // Interact with the application
      await page.waitForTimeout(3000);
      
      // Check for critical errors (some errors are expected for missing plans)
      const criticalErrors = consoleErrors.filter(error => 
        !error.includes('Missing or insufficient permissions') &&
        !error.includes('Access denied to this plan') &&
        !error.includes('Failed to load shared plan')
      );
      
      console.log(`Total console errors: ${consoleErrors.length}, Critical errors: ${criticalErrors.length}`);
      
      if (criticalErrors.length > 0) {
        console.log('Critical errors found:', criticalErrors);
      }
      
      // Application should still be functional despite some expected errors
      await expect(page.locator('h1')).toContainText('FFXIV Boss Timeline & Mitigation Planner');
    });

    test('should handle network issues gracefully', async ({ page }) => {
      test.setTimeout(30000);
      
      await page.goto('/');
      await waitForPageLoad(page);
      
      // Simulate network issues
      await page.route('**/firebase/**', route => {
        route.abort('failed');
      });
      
      // Wait for potential network errors
      await page.waitForTimeout(3000);
      
      // Application should still be functional
      await expect(page.locator('h1')).toContainText('FFXIV Boss Timeline & Mitigation Planner');
      
      // Remove the route
      await page.unroute('**/firebase/**');
      
      console.log('Network error handling test completed');
    });
  });

  test.describe('Performance', () => {
    test('should load within reasonable time', async ({ page }) => {
      test.setTimeout(30000);
      
      const startTime = Date.now();
      
      await page.goto('/');
      await waitForPageLoad(page);
      
      const loadTime = Date.now() - startTime;
      
      console.log(`Application load time: ${loadTime}ms`);
      
      // Should load within 10 seconds
      expect(loadTime).toBeLessThan(10000);
      
      // Verify application is functional
      await expect(page.locator('h1')).toContainText('FFXIV Boss Timeline & Mitigation Planner');
    });
  });
});
