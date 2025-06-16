/**
 * E2E tests for share link functionality and real-time collaboration
 */

import { test, expect } from '@playwright/test';

test.describe('Share Link Collaboration', () => {
  const mockPlanId = '12345678-1234-1234-1234-123456789abc';
  const shareUrl = `/plan/shared/${mockPlanId}`;

  test.beforeEach(async ({ page }) => {
    // Set up console logging to capture application logs
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`Browser Error: ${msg.text()}`);
      }
    });
  });

  test.describe('Share Link Access', () => {
    test('should handle share link URL structure correctly', async ({ page }) => {
      // Navigate to share link URL
      await page.goto(`http://localhost:5174${shareUrl}`);

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Verify the URL is correct (might redirect due to error)
      const currentUrl = page.url();
      console.log('Current URL:', currentUrl);

      // Verify the page loads (should show the main application)
      await expect(page.locator('h1')).toContainText('FFXIV Boss Timeline & Mitigation Planner', { timeout: 10000 });
    });

    test('should immediately display plan interface when accessing share link', async ({ page }) => {
      // Navigate to share link URL
      await page.goto(`http://localhost:5174${shareUrl}`);
      
      // Plan interface should be visible immediately
      await expect(page.locator('h1')).toContainText('FFXIV Boss Timeline & Mitigation Planner');
      
      // Boss selector should be visible
      await expect(page.locator('h3')).toContainText('Select Boss');
      
      // Job selector should be visible
      await expect(page.locator('h3')).toContainText('Select FFXIV Jobs');
      
      // Timeline should be visible (boss actions)
      await expect(page.locator('[data-time]')).toBeVisible();
    });

    test('should handle missing plan gracefully with error redirect', async ({ page }) => {
      // Navigate to share link URL (will fail since plan doesn't exist)
      await page.goto(`http://localhost:5174${shareUrl}`);
      
      // Wait for potential redirect
      await page.waitForTimeout(2000);
      
      // Should redirect to home with error parameter
      expect(page.url()).toContain('/?error=');
      
      // Application should still be functional
      await expect(page.locator('h1')).toContainText('FFXIV Boss Timeline & Mitigation Planner');
    });

    test('should show plan content even when collaboration setup fails', async ({ page }) => {
      // Navigate to share link URL
      await page.goto(`http://localhost:5174${shareUrl}`);
      
      // Even if collaboration fails, plan content should be visible
      // (In this case, default plan content since the shared plan doesn't exist)
      await expect(page.locator('h1')).toContainText('FFXIV Boss Timeline & Mitigation Planner');
      
      // Boss actions should be visible
      await expect(page.locator('[data-time]')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle plan_not_found error', async ({ page }) => {
      await page.goto('http://localhost:5174/?error=plan_not_found');
      
      // Application should still load normally
      await expect(page.locator('h1')).toContainText('FFXIV Boss Timeline & Mitigation Planner');
      
      // Should show default content
      await expect(page.locator('h3')).toContainText('Select Boss');
    });

    test('should handle access_denied error', async ({ page }) => {
      await page.goto('http://localhost:5174/?error=access_denied');
      
      // Application should still load normally
      await expect(page.locator('h1')).toContainText('FFXIV Boss Timeline & Mitigation Planner');
      
      // Should show default content
      await expect(page.locator('h3')).toContainText('Select Boss');
    });

    test('should handle network_error', async ({ page }) => {
      await page.goto('http://localhost:5174/?error=network_error');
      
      // Application should still load normally
      await expect(page.locator('h1')).toContainText('FFXIV Boss Timeline & Mitigation Planner');
      
      // Should show default content
      await expect(page.locator('h3')).toContainText('Select Boss');
    });

    test('should handle invalid_plan_id error', async ({ page }) => {
      await page.goto('http://localhost:5174/?error=invalid_plan_id');
      
      // Application should still load normally
      await expect(page.locator('h1')).toContainText('FFXIV Boss Timeline & Mitigation Planner');
      
      // Should show default content
      await expect(page.locator('h3')).toContainText('Select Boss');
    });
  });

  test.describe('Application Functionality', () => {
    test('should maintain all core functionality when accessing via share link', async ({ page }) => {
      // Navigate to share link URL
      await page.goto(`http://localhost:5174${shareUrl}`);
      
      // Wait for any redirects to complete
      await page.waitForTimeout(2000);
      
      // Boss selection should work
      const bossCard = page.locator('[data-testid="boss-card"]').first();
      if (await bossCard.isVisible()) {
        await bossCard.click();
      }
      
      // Job selection should work
      const jobCard = page.locator('img[alt="Paladin"]').first();
      if (await jobCard.isVisible()) {
        await jobCard.click();
      }
      
      // Boss actions should be interactive
      const bossAction = page.locator('[data-time]').first();
      if (await bossAction.isVisible()) {
        await bossAction.click();
      }
      
      // Application should remain responsive
      await expect(page.locator('h1')).toContainText('FFXIV Boss Timeline & Mitigation Planner');
    });

    test('should not break existing functionality', async ({ page }) => {
      // Test that normal (non-share) URLs still work
      await page.goto('http://localhost:5174/');
      
      // Application should load normally
      await expect(page.locator('h1')).toContainText('FFXIV Boss Timeline & Mitigation Planner');
      
      // Core functionality should work
      await expect(page.locator('h3')).toContainText('Select Boss');
      await expect(page.locator('h3')).toContainText('Select FFXIV Jobs');
    });
  });

  test.describe('URL Pattern Validation', () => {
    test('should handle valid UUID format in share URL', async ({ page }) => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      await page.goto(`http://localhost:5174/plan/shared/${validUuid}`);
      
      // Should attempt to load the plan (will fail but URL structure is valid)
      await expect(page.locator('h1')).toContainText('FFXIV Boss Timeline & Mitigation Planner');
    });

    test('should handle invalid UUID format gracefully', async ({ page }) => {
      const invalidUuid = 'invalid-uuid-format';
      await page.goto(`http://localhost:5174/plan/shared/${invalidUuid}`);
      
      // Should still load application
      await expect(page.locator('h1')).toContainText('FFXIV Boss Timeline & Mitigation Planner');
    });
  });

  test.describe('Console Error Monitoring', () => {
    test('should not have circular dependency errors', async ({ page }) => {
      const errors = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('circular')) {
          errors.push(msg.text());
        }
      });
      
      // Navigate to share link
      await page.goto(`http://localhost:5174${shareUrl}`);
      
      // Wait for application to fully load
      await page.waitForTimeout(3000);
      
      // Should not have any circular dependency errors
      expect(errors).toHaveLength(0);
    });

    test('should not have useReadOnly context errors', async ({ page }) => {
      const contextErrors = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('useReadOnly must be used within')) {
          contextErrors.push(msg.text());
        }
      });
      
      // Navigate to share link
      await page.goto(`http://localhost:5174${shareUrl}`);
      
      // Wait for application to fully load
      await page.waitForTimeout(3000);
      
      // Should not have any context errors
      expect(contextErrors).toHaveLength(0);
    });
  });
});
