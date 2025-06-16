import { expect } from '@playwright/test';

/**
 * Common helper functions for MitPlan E2E tests
 */

/**
 * Wait for element to be visible and stable
 */
export async function waitForElement(page, selector, options = {}) {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', ...options });
  return element;
}

/**
 * Wait for page to load completely
 */
export async function waitForPageLoad(page) {
  await page.waitForLoadState('networkidle');

  // Try multiple selectors that might exist in the application
  const selectors = [
    'h1', // Main title
    '[data-testid="app-container"]', // If it exists
    '#root', // React root
    '.app', // App container
    'main', // Main content
    'body' // Fallback
  ];

  let elementFound = false;
  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { timeout: 3000 });
      elementFound = true;
      break;
    } catch (error) {
      // Try next selector
      continue;
    }
  }

  if (!elementFound) {
    console.warn('No expected page elements found, but page loaded');
  }
}

/**
 * Clear and type text into an input field
 */
export async function fillInput(page, selector, text) {
  const input = page.locator(selector);
  await input.clear();
  await input.fill(text);
  return input;
}

/**
 * Click element and wait for navigation if needed
 */
export async function clickAndWait(page, selector, waitForNavigation = false) {
  const element = page.locator(selector);
  
  if (waitForNavigation) {
    await Promise.all([
      page.waitForNavigation(),
      element.click()
    ]);
  } else {
    await element.click();
  }
  
  return element;
}

/**
 * Drag and drop element from source to target
 */
export async function dragAndDrop(page, sourceSelector, targetSelector) {
  const source = page.locator(sourceSelector);
  const target = page.locator(targetSelector);
  
  await source.dragTo(target);
}

/**
 * Wait for toast notification and verify message
 */
export async function waitForToast(page, expectedMessage) {
  const toast = page.locator('[data-testid="notification-banner"]');
  await toast.waitFor({ state: 'visible', timeout: 5000 });
  
  if (expectedMessage) {
    await expect(toast).toContainText(expectedMessage);
  }
  
  return toast;
}

/**
 * Mock Firebase authentication state
 */
export async function mockAuthState(page, user = null) {
  await page.addInitScript((userData) => {
    window.__TEST_AUTH_STATE__ = userData;
  }, user);
}

/**
 * Mock network requests
 */
export async function mockNetworkRequest(page, url, response, status = 200) {
  await page.route(url, route => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response)
    });
  });
}

/**
 * Generate random test email
 */
export function generateTestEmail() {
  const timestamp = Date.now();
  return `test-${timestamp}@mitplan.dev`;
}

/**
 * Generate random plan name
 */
export function generatePlanName() {
  const timestamp = Date.now();
  return `Test Plan ${timestamp}`;
}

/**
 * Wait for element to disappear
 */
export async function waitForElementToDisappear(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { state: 'hidden', timeout });
  } catch (error) {
    // Element might not exist, which is fine
  }
}

/**
 * Verify job selection state
 */
export async function verifyJobSelection(page, jobId, shouldBeSelected = true) {
  const jobCard = page.locator(`[data-testid="job-card-${jobId}"]`);
  await jobCard.waitFor({ state: 'visible' });
  
  if (shouldBeSelected) {
    await expect(jobCard).toHaveClass(/selected/);
  } else {
    await expect(jobCard).not.toHaveClass(/selected/);
  }
}

/**
 * Verify mitigation assignment
 */
export async function verifyMitigationAssignment(page, bossActionId, abilityId) {
  const bossAction = page.locator(`[data-testid="boss-action-${bossActionId}"]`);
  const assignedMitigation = bossAction.locator(`[data-testid="assigned-mitigation-${abilityId}"]`);
  
  await expect(assignedMitigation).toBeVisible();
}

/**
 * Clear all mitigation assignments
 */
export async function clearAllAssignments(page) {
  const removeButtons = page.locator('[data-testid^="remove-mitigation-"]');
  const count = await removeButtons.count();
  
  for (let i = 0; i < count; i++) {
    await removeButtons.nth(0).click();
    await page.waitForTimeout(100); // Small delay between removals
  }
}

/**
 * Select boss from dropdown
 */
export async function selectBoss(page, bossId) {
  const bossSelector = page.locator('[data-testid="boss-selector"]');
  await bossSelector.click();
  
  const bossOption = page.locator(`[data-testid="boss-option-${bossId}"]`);
  await bossOption.click();
  
  // Wait for boss actions to load
  await page.waitForSelector(`[data-testid^="boss-action-"]`, { timeout: 5000 });
}

/**
 * Select multiple jobs
 */
export async function selectJobs(page, jobs) {
  for (const job of jobs) {
    const jobCard = page.locator(`[data-testid="job-card-${job.id}"]`);
    await jobCard.click();
    await verifyJobSelection(page, job.id, true);
  }
}

/**
 * Verify health bar calculation
 */
export async function verifyHealthBar(page, bossActionId, expectedMitigation) {
  const healthBar = page.locator(`[data-testid="health-bar-${bossActionId}"]`);
  await healthBar.waitFor({ state: 'visible' });
  
  if (expectedMitigation) {
    const mitigationText = page.locator(`[data-testid="mitigation-percentage-${bossActionId}"]`);
    await expect(mitigationText).toContainText(`${expectedMitigation}%`);
  }
}

/**
 * Wait for collaboration features to be ready
 */
export async function waitForCollaboration(page) {
  await page.waitForSelector('[data-testid="collaboration-indicator"]', { timeout: 10000 });
}

/**
 * Simulate mobile viewport
 */
export async function setMobileViewport(page) {
  await page.setViewportSize({ width: 375, height: 667 });
}

/**
 * Simulate desktop viewport
 */
export async function setDesktopViewport(page) {
  await page.setViewportSize({ width: 1920, height: 1080 });
}
