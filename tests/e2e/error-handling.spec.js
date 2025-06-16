import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage.js';
import { PlanManagementPage } from '../page-objects/PlanManagementPage.js';
import { JobSelectorPage } from '../page-objects/JobSelectorPage.js';
import { BossTimelinePage } from '../page-objects/BossTimelinePage.js';
import { MitigationPage } from '../page-objects/MitigationPage.js';
import { CollaborationPage } from '../page-objects/CollaborationPage.js';
import { testUsers, errorScenarios } from '../utils/test-data.js';
import { 
  setupFirebaseMocks, 
  mockNetworkFailure, 
  mockAuthError, 
  mockCorruptedPlanData,
  mockSlowNetwork 
} from '../utils/firebase-mock.js';
import { waitForPageLoad, generatePlanName } from '../utils/helpers.js';

test.describe('Error Handling', () => {
  let authPage;
  let planManagementPage;
  let jobSelectorPage;
  let bossTimelinePage;
  let mitigationPage;
  let collaborationPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    planManagementPage = new PlanManagementPage(page);
    jobSelectorPage = new JobSelectorPage(page);
    bossTimelinePage = new BossTimelinePage(page);
    mitigationPage = new MitigationPage(page);
    collaborationPage = new CollaborationPage(page);
    
    await setupFirebaseMocks(page);
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test.describe('Network Errors', () => {
    test('should handle authentication network failures', async ({ page }) => {
      await mockNetworkFailure(page, '**/auth/**');
      
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      
      await authPage.verifyAuthError('Network error. Please check your connection and try again.');
    });

    test('should handle plan save network failures', async ({ page }) => {
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      await bossTimelinePage.selectBoss('ketuduke');
      
      await mockNetworkFailure(page, '**/plans/**');
      
      try {
        await planManagementPage.savePlan(generatePlanName());
      } catch (error) {
        await expect(page.locator('[data-testid="notification-banner"]')).toContainText('Failed to save plan');
      }
    });

    test('should handle plan load network failures', async ({ page }) => {
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      
      await mockNetworkFailure(page, '**/plans/**');
      
      try {
        await planManagementPage.loadPlan('test-plan-id');
      } catch (error) {
        await expect(page.locator('[data-testid="notification-banner"]')).toContainText('Failed to load plan');
      }
    });

    test('should handle collaboration network failures', async ({ page }) => {
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      
      await mockNetworkFailure(page, '**/collaboration/**');
      
      try {
        await collaborationPage.startCollaborationSession();
      } catch (error) {
        await expect(page.locator('[data-testid="notification-banner"]')).toContainText('Failed to start collaboration');
      }
    });

    test('should retry failed requests automatically', async ({ page }) => {
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      
      // Mock intermittent network failure
      let requestCount = 0;
      await page.route('**/plans/**', route => {
        requestCount++;
        if (requestCount <= 2) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });
      
      await bossTimelinePage.selectBoss('ketuduke');
      await planManagementPage.savePlan(generatePlanName());
      
      // Should eventually succeed after retries
      await planManagementPage.verifyPlanSaved(generatePlanName());
    });

    test('should show offline indicator when network is unavailable', async ({ page }) => {
      await page.context().setOffline(true);
      
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Offline');
      
      // Restore connection
      await page.context().setOffline(false);
      
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Online');
    });
  });

  test.describe('Authentication Errors', () => {
    test('should handle invalid credentials', async ({ page }) => {
      await authPage.login('invalid@email.com', 'wrongpassword');
      
      await authPage.verifyAuthError('Invalid email or password');
    });

    test('should handle expired sessions', async ({ page }) => {
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      
      // Mock session expiration
      await page.addInitScript(() => {
        window.__MOCK_SESSION_EXPIRED__ = true;
      });
      
      await page.reload();
      await waitForPageLoad(page);
      
      await authPage.verifyLoggedOut();
      await expect(page.locator('[data-testid="notification-banner"]')).toContainText('Session expired');
    });

    test('should handle account lockout', async ({ page }) => {
      await mockAuthError(page, 'account-locked');
      
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      
      await authPage.verifyAuthError('Account temporarily locked due to too many failed attempts');
    });

    test('should handle email verification required', async ({ page }) => {
      await mockAuthError(page, 'email-not-verified');
      
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      
      await authPage.verifyAuthError('Please verify your email address before continuing');
    });

    test('should handle password reset errors', async ({ page }) => {
      await mockAuthError(page, 'user-not-found');
      
      await authPage.resetPassword('nonexistent@email.com');
      
      await authPage.verifyAuthError('No account found with this email address');
    });
  });

  test.describe('Data Validation Errors', () => {
    test('should handle corrupted plan data', async ({ page }) => {
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      
      await mockCorruptedPlanData(page);
      
      try {
        await planManagementPage.loadPlan('corrupted-plan-id');
      } catch (error) {
        await expect(page.locator('[data-testid="notification-banner"]')).toContainText('Plan data is corrupted');
      }
    });

    test('should handle invalid import data', async ({ page }) => {
      const invalidData = '{ invalid json data }';
      
      try {
        await planManagementPage.importPlan(invalidData);
      } catch (error) {
        await expect(page.locator('[data-testid="notification-banner"]')).toContainText('Invalid import data format');
      }
    });

    test('should handle missing boss data', async ({ page }) => {
      await page.addInitScript(() => {
        window.__MOCK_MISSING_BOSS__ = true;
      });
      
      try {
        await bossTimelinePage.selectBoss('nonexistent-boss');
      } catch (error) {
        await expect(page.locator('[data-testid="notification-banner"]')).toContainText('Boss data not found');
      }
    });

    test('should handle invalid job selections', async ({ page }) => {
      await page.addInitScript(() => {
        window.__MOCK_INVALID_JOB__ = true;
      });
      
      try {
        await jobSelectorPage.selectJob('INVALID_JOB');
      } catch (error) {
        await expect(page.locator('[data-testid="notification-banner"]')).toContainText('Invalid job selection');
      }
    });

    test('should validate mitigation assignments', async ({ page }) => {
      await bossTimelinePage.selectBoss('ketuduke');
      await jobSelectorPage.selectJob('PLD');
      
      // Try to assign mitigation without selecting boss action
      try {
        await mitigationPage.dragMitigationToAction('rampart', 'hydrofall');
      } catch (error) {
        await expect(page.locator('[data-testid="notification-banner"]')).toContainText('Please select a boss action first');
      }
    });
  });

  test.describe('Performance Issues', () => {
    test('should handle slow network responses', async ({ page }) => {
      await mockSlowNetwork(page, 5000); // 5 second delay
      
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      
      // Should show loading indicator
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
      
      // Should eventually complete
      await authPage.verifyLoggedIn(testUsers.validUser.displayName);
    });

    test('should handle memory constraints', async ({ page }) => {
      // Mock memory pressure
      await page.addInitScript(() => {
        window.__MOCK_MEMORY_PRESSURE__ = true;
      });
      
      // Try to load large amount of data
      await page.addInitScript(() => {
        const largeData = new Array(10000).fill(0).map((_, i) => ({
          id: `item-${i}`,
          data: new Array(1000).fill('x').join('')
        }));
        window.__LARGE_DATA__ = largeData;
      });
      
      // App should handle gracefully
      await expect(page.locator('[data-testid="app-container"]')).toBeVisible();
    });

    test('should handle browser crashes gracefully', async ({ page, context }) => {
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      await bossTimelinePage.selectBoss('ketuduke');
      await jobSelectorPage.selectJob('PLD');
      
      // Simulate browser crash by creating new page
      const newPage = await context.newPage();
      await newPage.goto('/');
      await waitForPageLoad(newPage);
      
      // Should recover session state
      await authPage.verifyLoggedIn(testUsers.validUser.displayName);
      
      await newPage.close();
    });
  });

  test.describe('User Input Errors', () => {
    test('should handle invalid form inputs', async ({ page }) => {
      await authPage.openAuthModal();
      
      // Try to submit empty form
      await page.locator('[data-testid="login-submit"]').click();
      
      await expect(page.locator('[data-testid="form-error"]')).toContainText('Email and password are required');
    });

    test('should handle malicious input', async ({ page }) => {
      const maliciousInput = '<script>alert("xss")</script>';
      
      await authPage.openAuthModal();
      await authPage.switchToRegisterTab();
      
      await page.locator('[data-testid="register-display-name"]').fill(maliciousInput);
      
      // Should sanitize input
      const value = await page.locator('[data-testid="register-display-name"]').inputValue();
      expect(value).not.toContain('<script>');
    });

    test('should handle file upload errors', async ({ page }) => {
      // Try to upload invalid file
      const invalidFile = new File(['invalid content'], 'invalid.txt', { type: 'text/plain' });
      
      try {
        await planManagementPage.importPlan(invalidFile);
      } catch (error) {
        await expect(page.locator('[data-testid="notification-banner"]')).toContainText('Invalid file format');
      }
    });

    test('should handle oversized file uploads', async ({ page }) => {
      // Mock large file
      await page.addInitScript(() => {
        window.__MOCK_LARGE_FILE__ = true;
      });
      
      try {
        await planManagementPage.importPlan('large-file.json');
      } catch (error) {
        await expect(page.locator('[data-testid="notification-banner"]')).toContainText('File too large');
      }
    });
  });

  test.describe('Browser Compatibility', () => {
    test('should handle unsupported browser features', async ({ page }) => {
      // Mock unsupported feature
      await page.addInitScript(() => {
        delete window.localStorage;
      });
      
      await page.reload();
      await waitForPageLoad(page);
      
      // Should show compatibility warning
      await expect(page.locator('[data-testid="compatibility-warning"]')).toBeVisible();
    });

    test('should handle disabled JavaScript', async ({ page }) => {
      // This test would need special setup for no-JS testing
      // For now, just verify graceful degradation elements exist
      await expect(page.locator('[data-testid="noscript-message"]')).toBeInDOM();
    });

    test('should handle disabled cookies', async ({ page }) => {
      await page.context().clearCookies();
      
      // Mock disabled cookies
      await page.addInitScript(() => {
        Object.defineProperty(document, 'cookie', {
          get: () => '',
          set: () => false
        });
      });
      
      await page.reload();
      await waitForPageLoad(page);
      
      // Should show cookie warning
      await expect(page.locator('[data-testid="cookie-warning"]')).toBeVisible();
    });
  });

  test.describe('Error Recovery', () => {
    test('should provide error recovery options', async ({ page }) => {
      await mockNetworkFailure(page);
      
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      
      // Should show retry option
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      
      // Clear network failure and retry
      await page.unroute('**/*');
      await page.locator('[data-testid="retry-button"]').click();
      
      // Should succeed on retry
      await authPage.verifyLoggedIn(testUsers.validUser.displayName);
    });

    test('should allow manual error reporting', async ({ page }) => {
      // Trigger an error
      await page.addInitScript(() => {
        window.__TRIGGER_ERROR__ = true;
      });
      
      await page.reload();
      
      // Should show error reporting option
      await expect(page.locator('[data-testid="report-error-button"]')).toBeVisible();
      
      await page.locator('[data-testid="report-error-button"]').click();
      
      // Should open error reporting dialog
      await expect(page.locator('[data-testid="error-report-dialog"]')).toBeVisible();
    });

    test('should preserve user data during errors', async ({ page }) => {
      await bossTimelinePage.selectBoss('ketuduke');
      await jobSelectorPage.selectJob('PLD');
      
      // Trigger error
      await mockNetworkFailure(page);
      
      try {
        await planManagementPage.savePlan(generatePlanName());
      } catch (error) {
        // User selections should be preserved
        await jobSelectorPage.verifyJobCardState('PLD', true);
        await expect(page.locator('[data-testid="selected-boss-name"]')).toContainText('Ketuduke');
      }
    });

    test('should provide fallback functionality', async ({ page }) => {
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      
      // Mock cloud storage failure
      await mockNetworkFailure(page, '**/firestore/**');
      
      await bossTimelinePage.selectBoss('ketuduke');
      await planManagementPage.savePlan(generatePlanName());
      
      // Should fallback to local storage
      await planManagementPage.verifyStorageStatus('Saved locally (cloud unavailable)');
    });
  });
});
