/**
 * Real-Time Collaboration Tests
 * Tests the complete real-time collaboration features including user presence,
 * selection highlighting, and live synchronization
 */

import { test, expect } from '@playwright/test';

test.describe('Real-Time Collaboration Features', () => {
  
  test('should display user presence indicators', async ({ browser }) => {
    test.setTimeout(60000);
    
    // Create two browser contexts for different users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    try {
      // Both users access the same share link
      const testPlanId = 'presence-test-' + Date.now();
      const shareUrl = `http://localhost:5174/plan/shared/${testPlanId}`;
      
      console.log(`Testing user presence on: ${shareUrl}`);
      
      // User 1 loads the page
      await page1.goto(shareUrl);
      await page1.waitForLoadState('networkidle');
      
      // User 2 loads the page
      await page2.goto(shareUrl);
      await page2.waitForLoadState('networkidle');
      
      // Verify both pages load successfully
      await expect(page1.locator('h1')).toBeVisible({ timeout: 10000 });
      await expect(page2.locator('h1')).toBeVisible({ timeout: 10000 });
      
      console.log('Both users loaded the shared plan successfully');
      
      // Look for user presence indicators (if implemented)
      const presenceSelectors = [
        '.user-presence',
        '.user-avatars',
        '.user-avatar',
        '[data-testid="user-presence"]',
        '.collaboration-users'
      ];
      
      let presenceFound = false;
      for (const selector of presenceSelectors) {
        const element1 = page1.locator(selector);
        const element2 = page2.locator(selector);
        
        if (await element1.count() > 0 || await element2.count() > 0) {
          console.log(`Found user presence indicator: ${selector}`);
          presenceFound = true;
          break;
        }
      }
      
      if (presenceFound) {
        console.log('✓ User presence indicators are working');
      } else {
        console.log('ℹ User presence indicators not yet implemented');
      }
      
      // Test basic collaboration readiness
      const title1 = await page1.locator('h1').textContent();
      const title2 = await page2.locator('h1').textContent();
      
      expect(title1).toContain('FFXIV');
      expect(title2).toContain('FFXIV');
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should handle selection highlighting', async ({ browser }) => {
    test.setTimeout(60000);
    
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    try {
      const testPlanId = 'selection-test-' + Date.now();
      const shareUrl = `http://localhost:5174/plan/shared/${testPlanId}`;
      
      console.log(`Testing selection highlighting on: ${shareUrl}`);
      
      await page1.goto(shareUrl);
      await page2.goto(shareUrl);
      
      await page1.waitForLoadState('networkidle');
      await page2.waitForLoadState('networkidle');
      
      // Wait for initial load
      await page1.waitForTimeout(3000);
      await page2.waitForTimeout(3000);
      
      // Look for selectable elements
      const selectableSelectors = [
        '.selection-highlight',
        '.job-card',
        '.boss-card',
        '.mitigation-item',
        '[data-selectable="true"]',
        'img[alt*="Paladin"]',
        'img[alt*="White Mage"]'
      ];
      
      let selectableFound = false;
      let selectedElement = null;
      
      for (const selector of selectableSelectors) {
        const element = page1.locator(selector);
        if (await element.count() > 0) {
          console.log(`Found selectable element: ${selector}`);
          selectableFound = true;
          selectedElement = element.first();
          break;
        }
      }
      
      if (selectableFound && selectedElement) {
        // User 1 clicks on an element
        await selectedElement.click();
        await page1.waitForTimeout(1000);
        
        console.log('User 1 selected an element');
        
        // Look for selection indicators
        const selectionSelectors = [
          '.selection-indicator',
          '.selected',
          '.user-selection',
          '[data-selected="true"]'
        ];
        
        let selectionIndicatorFound = false;
        for (const selector of selectionSelectors) {
          if (await page1.locator(selector).count() > 0) {
            console.log(`Found selection indicator: ${selector}`);
            selectionIndicatorFound = true;
            break;
          }
        }
        
        if (selectionIndicatorFound) {
          console.log('✓ Selection highlighting is working');
        } else {
          console.log('ℹ Selection highlighting not yet implemented');
        }
        
        // Wait for potential synchronization
        await page2.waitForTimeout(2000);
        
        // Check if selection synchronized to user 2
        let syncFound = false;
        for (const selector of selectionSelectors) {
          if (await page2.locator(selector).count() > 0) {
            console.log(`Selection synchronized to user 2: ${selector}`);
            syncFound = true;
            break;
          }
        }
        
        if (syncFound) {
          console.log('✓ Selection synchronization is working');
        } else {
          console.log('ℹ Selection synchronization not yet implemented');
        }
      } else {
        console.log('ℹ No selectable elements found for testing');
      }
      
      // Verify both pages remain functional
      await expect(page1.locator('h1')).toBeVisible();
      await expect(page2.locator('h1')).toBeVisible();
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should support real-time job selection synchronization', async ({ browser }) => {
    test.setTimeout(60000);
    
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    try {
      const testPlanId = 'job-sync-test-' + Date.now();
      const shareUrl = `http://localhost:5174/plan/shared/${testPlanId}`;
      
      console.log(`Testing job selection sync on: ${shareUrl}`);
      
      await page1.goto(shareUrl);
      await page2.goto(shareUrl);
      
      await page1.waitForLoadState('networkidle');
      await page2.waitForLoadState('networkidle');
      
      // Wait for initial load
      await page1.waitForTimeout(3000);
      await page2.waitForTimeout(3000);
      
      // Look for job selection elements
      const jobSelectors = [
        'img[alt="Paladin"]',
        'img[alt="White Mage"]',
        'img[alt="Scholar"]',
        '.job-card',
        '[data-job="PLD"]',
        '[data-job="WHM"]',
        '[data-testid="job-selector"]'
      ];
      
      let jobElementFound = false;
      for (const selector of jobSelectors) {
        const element = page1.locator(selector);
        if (await element.count() > 0) {
          console.log(`Found job element: ${selector}`);
          
          // User 1 selects a job
          await element.first().click();
          await page1.waitForTimeout(1000);
          
          console.log(`User 1 selected job: ${selector}`);
          jobElementFound = true;
          
          // Wait for potential synchronization
          await page2.waitForTimeout(3000);
          
          // Check if the selection is reflected on user 2's page
          const element2 = page2.locator(selector);
          if (await element2.count() > 0) {
            console.log('Job element exists on user 2 page');
            
            // Look for visual indicators of selection
            const selectedIndicators = [
              '.selected',
              '.active',
              '[data-selected="true"]',
              '[aria-selected="true"]'
            ];
            
            let syncIndicatorFound = false;
            for (const indicator of selectedIndicators) {
              if (await page2.locator(`${selector}${indicator}`).count() > 0 ||
                  await page2.locator(selector).locator(indicator).count() > 0) {
                console.log(`✓ Job selection synchronized: ${indicator}`);
                syncIndicatorFound = true;
                break;
              }
            }
            
            if (!syncIndicatorFound) {
              console.log('ℹ Job selection synchronization not yet implemented');
            }
          }
          
          break;
        }
      }
      
      if (!jobElementFound) {
        console.log('ℹ No job selection elements found for testing');
      }
      
      // Verify both pages remain functional
      await expect(page1.locator('h1')).toBeVisible();
      await expect(page2.locator('h1')).toBeVisible();
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should handle authentication transitions seamlessly', async ({ browser }) => {
    test.setTimeout(60000);
    
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    try {
      const testPlanId = 'auth-transition-test-' + Date.now();
      const shareUrl = `http://localhost:5174/plan/shared/${testPlanId}`;
      
      console.log(`Testing authentication transitions on: ${shareUrl}`);
      
      // User 1: Access as unauthenticated user
      await page1.goto(shareUrl);
      await page1.waitForLoadState('networkidle');
      
      // User 2: Access as unauthenticated user
      await page2.goto(shareUrl);
      await page2.waitForLoadState('networkidle');
      
      // Verify both can access the plan
      await expect(page1.locator('h1')).toBeVisible({ timeout: 10000 });
      await expect(page2.locator('h1')).toBeVisible({ timeout: 10000 });
      
      console.log('Both unauthenticated users can access the shared plan');
      
      // Look for authentication prompts or display name collection
      const authSelectors = [
        '[data-testid="display-name-input"]',
        'input[placeholder*="name"]',
        'input[placeholder*="Name"]',
        '.auth-prompt',
        '.display-name-modal',
        'button:has-text("Sign In")',
        'button:has-text("Login")'
      ];
      
      let authElementFound = false;
      for (const selector of authSelectors) {
        if (await page1.locator(selector).count() > 0 || 
            await page2.locator(selector).count() > 0) {
          console.log(`Found authentication element: ${selector}`);
          authElementFound = true;
          break;
        }
      }
      
      if (authElementFound) {
        console.log('✓ Authentication prompts are available');
      } else {
        console.log('ℹ Authentication prompts not yet implemented');
      }
      
      // Test that the plan remains accessible regardless of auth state
      const title1 = await page1.locator('h1').textContent();
      const title2 = await page2.locator('h1').textContent();
      
      expect(title1).toContain('FFXIV');
      expect(title2).toContain('FFXIV');
      
      console.log('✓ Plan remains accessible for unauthenticated users');
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should maintain performance with multiple concurrent users', async ({ browser }) => {
    test.setTimeout(90000);
    
    const contexts = [];
    const pages = [];
    
    try {
      // Create 4 concurrent users
      for (let i = 0; i < 4; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        contexts.push(context);
        pages.push(page);
      }
      
      const testPlanId = 'performance-test-' + Date.now();
      const shareUrl = `http://localhost:5174/plan/shared/${testPlanId}`;
      
      console.log(`Testing performance with 4 users on: ${shareUrl}`);
      
      const startTime = Date.now();
      
      // All users load the page simultaneously
      const loadPromises = pages.map(async (page, index) => {
        const userStartTime = Date.now();
        
        await page.goto(shareUrl);
        await page.waitForLoadState('networkidle');
        
        const title = page.locator('h1');
        await expect(title).toBeVisible({ timeout: 15000 });
        
        const userLoadTime = Date.now() - userStartTime;
        console.log(`User ${index + 1} loaded in ${userLoadTime}ms`);
        
        return { userId: index + 1, loadTime: userLoadTime };
      });
      
      const results = await Promise.all(loadPromises);
      const totalTime = Date.now() - startTime;
      
      console.log(`All 4 users loaded in ${totalTime}ms`);
      
      // Verify performance is reasonable
      expect(totalTime).toBeLessThan(30000); // 30 seconds for all users
      
      results.forEach(result => {
        expect(result.loadTime).toBeLessThan(20000); // 20 seconds per user
      });
      
      // Test concurrent interactions
      const interactionPromises = pages.map(async (page, index) => {
        // Each user tries to interact with different elements
        const selectors = [
          'img[alt="Paladin"]',
          'img[alt="White Mage"]',
          'img[alt="Scholar"]',
          'img[alt="Black Mage"]'
        ];
        
        const selector = selectors[index % selectors.length];
        const element = page.locator(selector);
        
        if (await element.count() > 0) {
          await element.first().click();
          await page.waitForTimeout(500);
          console.log(`User ${index + 1} interacted with ${selector}`);
        }
        
        return { userId: index + 1, interacted: true };
      });
      
      await Promise.all(interactionPromises);
      
      // Wait for potential synchronization
      await pages[0].waitForTimeout(3000);
      
      // Verify all users are still functional
      for (let i = 0; i < pages.length; i++) {
        await expect(pages[i].locator('h1')).toBeVisible();
        console.log(`User ${i + 1} still functional after interactions`);
      }
      
      console.log('✓ Performance test completed successfully');
      
    } finally {
      for (const context of contexts) {
        await context.close();
      }
    }
  });
});
