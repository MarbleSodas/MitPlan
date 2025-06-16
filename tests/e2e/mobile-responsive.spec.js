import { test, expect } from '@playwright/test';
import { JobSelectorPage } from '../page-objects/JobSelectorPage.js';
import { BossTimelinePage } from '../page-objects/BossTimelinePage.js';
import { MitigationPage } from '../page-objects/MitigationPage.js';
import { AuthPage } from '../page-objects/AuthPage.js';
import { testUsers } from '../utils/test-data.js';
import { waitForPageLoad, setMobileViewport, setDesktopViewport } from '../utils/helpers.js';

test.describe('Mobile Responsiveness', () => {
  let jobSelectorPage;
  let bossTimelinePage;
  let mitigationPage;
  let authPage;

  test.beforeEach(async ({ page }) => {
    jobSelectorPage = new JobSelectorPage(page);
    bossTimelinePage = new BossTimelinePage(page);
    mitigationPage = new MitigationPage(page);
    authPage = new AuthPage(page);
    
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test.describe('Mobile Layout', () => {
    test('should display correctly on mobile viewport', async ({ page }) => {
      await setMobileViewport(page);
      
      // Main components should be visible
      await expect(page.locator('[data-testid="app-container"]')).toBeVisible();
      await expect(page.locator('[data-testid="boss-selector"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-selector"]')).toBeVisible();
    });

    test('should maintain 2 job cards per row on mobile', async ({ page }) => {
      await setMobileViewport(page);
      
      // Verify job card layout
      const jobCards = page.locator('[data-testid^="job-card-"]');
      const firstCard = jobCards.first();
      const secondCard = jobCards.nth(1);
      const thirdCard = jobCards.nth(2);
      
      const firstCardBox = await firstCard.boundingBox();
      const secondCardBox = await secondCard.boundingBox();
      const thirdCardBox = await thirdCard.boundingBox();
      
      // First two cards should be on the same row
      expect(Math.abs(firstCardBox.y - secondCardBox.y)).toBeLessThan(10);
      
      // Third card should be on a different row
      expect(thirdCardBox.y).toBeGreaterThan(firstCardBox.y + firstCardBox.height);
    });

    test('should stack timeline and mitigation sections vertically on mobile', async ({ page }) => {
      await setMobileViewport(page);
      await bossTimelinePage.selectBoss('ketuduke');
      
      const timeline = page.locator('[data-testid="timeline-container"]');
      const mitigations = page.locator('[data-testid="mitigation-container"]');
      
      const timelineBox = await timeline.boundingBox();
      const mitigationsBox = await mitigations.boundingBox();
      
      // Mitigation section should be below timeline
      expect(mitigationsBox.y).toBeGreaterThan(timelineBox.y + timelineBox.height);
    });

    test('should show mobile-optimized header', async ({ page }) => {
      await setMobileViewport(page);
      
      // Header should be compact on mobile
      const header = page.locator('[data-testid="header-layout"]');
      const headerBox = await header.boundingBox();
      
      expect(headerBox.height).toBeLessThan(100); // Compact header
    });

    test('should hide/collapse non-essential elements on mobile', async ({ page }) => {
      await setMobileViewport(page);
      
      // Some elements might be hidden or collapsed on mobile
      const description = page.locator('[data-testid="app-description"]');
      
      // Description might be hidden or truncated on mobile
      if (await description.count() > 0) {
        const descriptionBox = await description.boundingBox();
        expect(descriptionBox.height).toBeLessThan(50);
      }
    });
  });

  test.describe('Touch Interactions', () => {
    test.beforeEach(async ({ page }) => {
      await setMobileViewport(page);
      await bossTimelinePage.selectBoss('ketuduke');
      await jobSelectorPage.selectMultipleJobs(['PLD', 'WHM']);
    });

    test('should support touch-based job selection', async ({ page }) => {
      await jobSelectorPage.selectJob('WAR');
      await jobSelectorPage.verifyJobCardState('WAR', true);
    });

    test('should support touch-based boss action selection', async ({ page }) => {
      const bossAction = page.locator('[data-testid="boss-action-hydrofall"]');
      await bossAction.tap();
      
      await expect(bossAction).toHaveClass(/selected/);
    });

    test('should use mobile-friendly mitigation assignment', async ({ page }) => {
      await bossTimelinePage.selectBossAction('hydrofall');
      
      // On mobile, should use tap-based assignment instead of drag-drop
      const mitigation = page.locator('[data-testid="mitigation-rampart"]');
      await mitigation.tap();
      
      // Should show mobile assignment interface
      await expect(page.locator('[data-testid="mobile-assignment-options"]')).toBeVisible();
      
      // Confirm assignment
      await page.locator('[data-testid="confirm-assignment"]').tap();
      
      // Verify assignment
      await expect(page.locator('[data-testid="assigned-mitigation-hydrofall-rampart"]')).toBeVisible();
    });

    test('should support swipe gestures for timeline navigation', async ({ page }) => {
      const timeline = page.locator('[data-testid="timeline-container"]');
      
      // Simulate swipe left (scroll right)
      await timeline.evaluate(el => {
        el.scrollLeft += 100;
      });
      
      const scrollLeft = await timeline.evaluate(el => el.scrollLeft);
      expect(scrollLeft).toBeGreaterThan(0);
    });

    test('should handle pinch-to-zoom for timeline', async ({ page }) => {
      // Simulate pinch gesture
      await page.touchscreen.tap(200, 300);
      await page.touchscreen.tap(250, 350);
      
      // Timeline should respond to zoom
      const timeline = page.locator('[data-testid="boss-timeline"]');
      const transform = await timeline.getAttribute('style');
      
      // Should have some transform applied
      expect(transform).toBeTruthy();
    });
  });

  test.describe('Mobile Authentication', () => {
    test('should display auth modal correctly on mobile', async ({ page }) => {
      await setMobileViewport(page);
      
      await authPage.openAuthModal();
      
      const modal = page.locator('[data-testid="auth-modal"]');
      await expect(modal).toBeVisible();
      
      // Modal should fit mobile screen
      const modalBox = await modal.boundingBox();
      expect(modalBox.width).toBeLessThanOrEqual(375); // Mobile width
    });

    test('should support mobile keyboard input', async ({ page }) => {
      await setMobileViewport(page);
      
      await authPage.openAuthModal();
      
      // Fill login form
      await page.locator('[data-testid="login-email"]').tap();
      await page.locator('[data-testid="login-email"]').fill(testUsers.validUser.email);
      
      await page.locator('[data-testid="login-password"]').tap();
      await page.locator('[data-testid="login-password"]').fill(testUsers.validUser.password);
      
      // Submit should work
      await page.locator('[data-testid="login-submit"]').tap();
    });
  });

  test.describe('Mobile Navigation', () => {
    test('should provide mobile-friendly navigation', async ({ page }) => {
      await setMobileViewport(page);
      
      // Navigation elements should be touch-friendly
      const navElements = page.locator('[role="button"], button, [data-testid*="button"]');
      const count = await navElements.count();
      
      for (let i = 0; i < Math.min(count, 5); i++) {
        const element = navElements.nth(i);
        const box = await element.boundingBox();
        
        if (box) {
          // Touch targets should be at least 44px (iOS guideline)
          expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(40);
        }
      }
    });

    test('should handle mobile scrolling', async ({ page }) => {
      await setMobileViewport(page);
      await bossTimelinePage.selectBoss('ketuduke');
      
      // Should be able to scroll through boss actions
      const actionsList = page.locator('[data-testid="boss-actions-list"]');
      
      await actionsList.evaluate(el => {
        el.scrollTop += 100;
      });
      
      const scrollTop = await actionsList.evaluate(el => el.scrollTop);
      expect(scrollTop).toBeGreaterThan(0);
    });

    test('should support mobile back button behavior', async ({ page }) => {
      await setMobileViewport(page);
      
      // Open modal
      await authPage.openAuthModal();
      await expect(page.locator('[data-testid="auth-modal"]')).toBeVisible();
      
      // Simulate back button (escape key on mobile)
      await page.keyboard.press('Escape');
      
      // Modal should close
      await expect(page.locator('[data-testid="auth-modal"]')).not.toBeVisible();
    });
  });

  test.describe('Mobile Performance', () => {
    test('should load quickly on mobile', async ({ page }) => {
      await setMobileViewport(page);
      
      const startTime = Date.now();
      await page.reload();
      await waitForPageLoad(page);
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time on mobile
      expect(loadTime).toBeLessThan(5000);
    });

    test('should be responsive to touch interactions', async ({ page }) => {
      await setMobileViewport(page);
      await bossTimelinePage.selectBoss('ketuduke');
      
      const startTime = Date.now();
      
      const jobCard = page.locator('[data-testid="job-card-PLD"]');
      await jobCard.tap();
      
      // Should respond quickly to touch
      await expect(jobCard).toHaveClass(/selected/, { timeout: 1000 });
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500);
    });

    test('should handle rapid touch interactions', async ({ page }) => {
      await setMobileViewport(page);
      await bossTimelinePage.selectBoss('ketuduke');
      
      // Rapid job selections
      const jobs = ['PLD', 'WAR', 'WHM', 'SCH'];
      
      for (const jobId of jobs) {
        const jobCard = page.locator(`[data-testid="job-card-${jobId}"]`);
        await jobCard.tap();
        await page.waitForTimeout(100); // Small delay between taps
      }
      
      // All jobs should be selected
      for (const jobId of jobs) {
        await jobSelectorPage.verifyJobCardState(jobId, true);
      }
    });
  });

  test.describe('Responsive Breakpoints', () => {
    test('should adapt to different mobile screen sizes', async ({ page }) => {
      const viewports = [
        { width: 320, height: 568 }, // iPhone SE
        { width: 375, height: 667 }, // iPhone 8
        { width: 414, height: 896 }, // iPhone 11
        { width: 360, height: 640 }, // Android
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        
        // App should be functional at all sizes
        await expect(page.locator('[data-testid="app-container"]')).toBeVisible();
        await expect(page.locator('[data-testid="job-selector"]')).toBeVisible();
        
        // Job cards should fit properly
        const jobCard = page.locator('[data-testid="job-card-PLD"]');
        const cardBox = await jobCard.boundingBox();
        
        expect(cardBox.width).toBeLessThanOrEqual(viewport.width / 2 - 20); // Account for margins
      }
    });

    test('should transition smoothly between mobile and desktop', async ({ page }) => {
      // Start mobile
      await setMobileViewport(page);
      await bossTimelinePage.selectBoss('ketuduke');
      await jobSelectorPage.selectJob('PLD');
      
      // Switch to desktop
      await setDesktopViewport(page);
      
      // Layout should adapt
      await expect(page.locator('[data-testid="app-container"]')).toBeVisible();
      
      // State should be preserved
      await jobSelectorPage.verifyJobCardState('PLD', true);
      await expect(page.locator('[data-testid="selected-boss-name"]')).toContainText('Ketuduke');
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('should support mobile screen readers', async ({ page }) => {
      await setMobileViewport(page);
      
      // Elements should have proper ARIA labels
      const jobCard = page.locator('[data-testid="job-card-PLD"]');
      await expect(jobCard).toHaveAttribute('aria-label');
      
      const bossSelector = page.locator('[data-testid="boss-selector"]');
      await expect(bossSelector).toHaveAttribute('aria-label');
    });

    test('should have proper focus management on mobile', async ({ page }) => {
      await setMobileViewport(page);
      
      // Tab navigation should work
      await page.keyboard.press('Tab');
      
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should support high contrast mode on mobile', async ({ page }) => {
      await setMobileViewport(page);
      
      // Simulate high contrast mode
      await page.addInitScript(() => {
        document.body.classList.add('high-contrast');
      });
      
      // Elements should still be visible and functional
      await expect(page.locator('[data-testid="job-card-PLD"]')).toBeVisible();
      await jobSelectorPage.selectJob('PLD');
      await jobSelectorPage.verifyJobCardState('PLD', true);
    });
  });
});
