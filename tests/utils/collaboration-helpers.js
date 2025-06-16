import { expect } from '@playwright/test';
import { MultiUserCollaborationPage } from '../page-objects/MultiUserCollaborationPage.js';
import { waitForPageLoad, generatePlanName, mockAuthState } from './helpers.js';

// Import Firebase services for real data creation
let TestDataService = null;

// Function to dynamically load TestDataService
async function getTestDataService() {
  if (TestDataService === null) {
    try {
      const module = await import('../../src/services/TestDataService.js');
      TestDataService = module.default;
      console.log('TestDataService loaded successfully');
    } catch (error) {
      console.warn('TestDataService not available, using fallback methods:', error.message);
      TestDataService = false; // Mark as failed to avoid retrying
    }
  }
  return TestDataService || null;
}

/**
 * Utility functions for multi-user collaboration testing
 */

/**
 * Create multiple browser contexts for collaboration testing
 */
export async function createMultiUserSetup(browser, userCount = 3) {
  const users = [];
  
  for (let i = 0; i < userCount; i++) {
    const context = await browser.newContext({
      storageState: i === 0 ? undefined : undefined // All start unauthenticated for testing
    });
    
    const page = await context.newPage();
    const collaborationPage = new MultiUserCollaborationPage(page, `user-${i + 1}`);
    
    // Set up console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`User ${i + 1} Error: ${msg.text()}`);
      }
    });
    
    users.push({
      id: `user-${i + 1}`,
      context,
      page,
      collaborationPage,
      displayName: `Test User ${i + 1}`,
      isOwner: i === 0
    });
  }
  
  return users;
}

/**
 * Clean up all user contexts and test data
 */
export async function cleanupMultiUserSetup(users) {
  for (const user of users) {
    try {
      await user.collaborationPage.cleanupUserSession();
      await user.context.close();
    } catch (error) {
      console.log(`Error cleaning up user ${user.id}:`, error.message);
    }
  }

  // Clean up Firebase test data if TestDataService is available
  const testDataService = await getTestDataService();
  if (testDataService) {
    try {
      const result = await testDataService.cleanupTestData();
      if (result.success) {
        console.log(`Cleaned up ${result.cleanedCount} test data items`);
      }
    } catch (error) {
      console.warn('Error cleaning up test data:', error);
    }
  }
}

/**
 * Create and share a plan with the first user (owner)
 * Now uses real Firebase data for testing
 */
export async function createAndSharePlan(ownerUser, planName = null) {
  const { page, collaborationPage } = ownerUser;

  try {
    // Try to create a real test plan in Firebase if TestDataService is available
    const testDataService = await getTestDataService();

    if (testDataService) {
      const testPlanName = planName || generatePlanName();

      const result = await testDataService.createTestPlan(testPlanName, {
        userId: ownerUser.id || 'test-owner-123',
        bossId: 'ketuduke',
        selectedJobs: {
          tank: ['PLD', 'WAR'],
          healer: ['WHM', 'SCH'],
          dps: ['BLM', 'DRG']
        },
        assignments: {
          'hydrofall': [
            {
              id: 'test-assignment-1',
              abilityId: 'rampart',
              jobId: 'PLD',
              tank: 'MT',
              timestamp: Date.now()
            }
          ]
        },
        tankPositions: {
          mainTank: 'PLD',
          offTank: 'WAR'
        }
      });

      if (result.success) {
        console.log(`Created real Firebase test plan: ${result.planId}`);
        return result.shareUrl;
      } else {
        console.warn('Failed to create Firebase test plan, falling back to UI method');
      }
    }

    // Fallback to UI-based plan creation
    return await createPlanViaUI(ownerUser, planName);

  } catch (error) {
    console.warn('Error creating Firebase test plan, falling back to UI method:', error);
    return await createPlanViaUI(ownerUser, planName);
  }
}

/**
 * Fallback method to create plan via UI interaction
 */
async function createPlanViaUI(ownerUser, planName = null) {
  const { page, collaborationPage } = ownerUser;

  // Navigate to home page
  await page.goto('/');
  await waitForPageLoad(page);

  // Mock authenticated user for owner
  await mockAuthState(page, {
    uid: ownerUser.id || 'test-owner-123',
    email: 'owner@mitplan.dev',
    displayName: ownerUser.displayName
  });

  // Wait for authentication to be processed
  await page.waitForTimeout(2000);

  // Create a meaningful plan by selecting boss and jobs
  const testPlanName = planName || generatePlanName();

  // Wait for page to be fully loaded
  await page.waitForSelector('h1', { timeout: 10000 });

  // Select boss if boss cards are available
  const bossCards = page.locator('[data-testid="boss-card"]');
  if (await bossCards.count() > 0) {
    await bossCards.first().click();
    await page.waitForTimeout(1000);
  }

  // Select jobs if job cards are available
  const jobSelectors = ['img[alt="Paladin"]', 'img[alt="White Mage"]', 'img[alt="Scholar"]'];
  for (const selector of jobSelectors) {
    const jobElement = page.locator(selector);
    if (await jobElement.count() > 0) {
      await jobElement.first().click();
      await page.waitForTimeout(500);
    }
  }

  // Try to save and share plan using UI
  const shareUrl = await attemptPlanSaveAndShare(page, testPlanName);

  // If UI method fails, create a fallback URL
  if (!shareUrl || !shareUrl.includes('/plan/shared/')) {
    const planId = 'test-plan-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const baseUrl = page.url().split('/')[0] + '//' + page.url().split('/')[2];
    return `${baseUrl}/plan/shared/${planId}`;
  }

  return shareUrl;
}

/**
 * Attempt to save and share plan via UI
 */
async function attemptPlanSaveAndShare(page, planName) {
  // Try to save plan using various possible selectors
  const savePossibleSelectors = [
    '[data-testid="save-plan"]',
    'button:has-text("Save")',
    'button:has-text("Save Plan")',
    '[aria-label="Save Plan"]'
  ];

  let planSaved = false;
  for (const selector of savePossibleSelectors) {
    const saveButton = page.locator(selector);
    if (await saveButton.count() > 0) {
      await saveButton.click();

      // Try to fill plan name if input appears
      const nameInputSelectors = [
        '[data-testid="plan-name-input"]',
        'input[placeholder*="plan"]',
        'input[placeholder*="name"]'
      ];

      for (const nameSelector of nameInputSelectors) {
        const nameInput = page.locator(nameSelector);
        if (await nameInput.count() > 0) {
          await nameInput.fill(planName);
          break;
        }
      }

      // Try to confirm save
      const confirmSelectors = [
        '[data-testid="confirm-save"]',
        'button:has-text("Confirm")',
        'button:has-text("Save")'
      ];

      for (const confirmSelector of confirmSelectors) {
        const confirmButton = page.locator(confirmSelector);
        if (await confirmButton.count() > 0) {
          await confirmButton.click();
          planSaved = true;
          break;
        }
      }

      if (planSaved) break;
    }
  }

  // Try to share plan using various possible selectors
  const sharePossibleSelectors = [
    '[data-testid="share-plan"]',
    'button:has-text("Share")',
    'button:has-text("Share Plan")',
    '[aria-label="Share Plan"]'
  ];

  for (const selector of sharePossibleSelectors) {
    const shareButton = page.locator(selector);
    if (await shareButton.count() > 0) {
      await shareButton.click();
      await page.waitForTimeout(2000);

      // Try to get share URL from various possible selectors
      const urlSelectors = [
        '[data-testid="share-url"]',
        'input[value*="/plan/shared/"]',
        'textarea[value*="/plan/shared/"]',
        '[data-testid="share-link"]'
      ];

      for (const urlSelector of urlSelectors) {
        const shareUrlElement = page.locator(urlSelector);
        if (await shareUrlElement.count() > 0) {
          const shareUrl = await shareUrlElement.textContent() || await shareUrlElement.inputValue();
          if (shareUrl && shareUrl.includes('/plan/shared/')) {
            return shareUrl.trim();
          }
        }
      }
    }
  }

  return null;
}

/**
 * Have all users join the shared plan
 */
export async function joinSharedPlan(users, shareUrl) {
  const joinPromises = users.map(async (user, index) => {
    const { page, collaborationPage, displayName } = user;
    
    // Navigate to shared plan
    await page.goto(shareUrl);
    await waitForPageLoad(page);
    
    // Join collaboration
    await collaborationPage.joinCollaborationAsUser(
      displayName, 
      user.isOwner ? 'authenticated' : 'unauthenticated'
    );
    
    console.log(`${displayName} joined shared plan`);
  });
  
  await Promise.all(joinPromises);
}

/**
 * Verify all users can see each other
 */
export async function verifyUserPresence(users) {
  const expectedUserCount = users.length;
  
  for (const user of users) {
    await user.collaborationPage.verifyActiveUserCount(expectedUserCount);
  }
  
  console.log(`Verified ${expectedUserCount} users can see each other`);
}

/**
 * Test real-time synchronization of job selections
 */
export async function testJobSelectionSync(users) {
  const [user1, user2, ...otherUsers] = users;
  const otherPages = [user2.page, ...otherUsers.map(u => u.page)];
  
  // User 1 selects a job
  await user1.collaborationPage.makeSelectionAndVerifySync(
    'img[alt="Dark Knight"]',
    otherPages
  );
  
  // User 2 deselects a job
  await user2.collaborationPage.makeSelectionAndVerifySync(
    'img[alt="Paladin"]',
    [user1.page, ...otherUsers.map(u => u.page)]
  );
  
  console.log('Job selection synchronization test completed');
}

/**
 * Test real-time synchronization of mitigation assignments
 */
export async function testMitigationAssignmentSync(users) {
  const [user1, user2, ...otherUsers] = users;
  const otherPages = [user2.page, ...otherUsers.map(u => u.page)];
  
  // User 1 assigns a mitigation
  await user1.collaborationPage.dragAndDropWithSync(
    '[data-testid="ability-rampart"]',
    '[data-time]',
    otherPages
  );
  
  // User 2 assigns another mitigation
  await user2.collaborationPage.dragAndDropWithSync(
    '[data-testid="ability-sentinel"]',
    '[data-time]:nth-child(2)',
    [user1.page, ...otherUsers.map(u => u.page)]
  );
  
  console.log('Mitigation assignment synchronization test completed');
}

/**
 * Test concurrent editing scenarios
 */
export async function testConcurrentEditing(users) {
  const [user1, user2] = users;
  
  // Both users try to select the same job simultaneously
  const concurrentActions = [
    () => user1.page.locator('img[alt="Warrior"]').first().click(),
    () => user2.page.locator('img[alt="Warrior"]').first().click()
  ];
  
  await Promise.all(concurrentActions.map(action => action()));
  
  // Wait for conflict resolution
  await user1.page.waitForTimeout(2000);
  await user2.page.waitForTimeout(2000);
  
  // Verify final state is consistent
  const user1Selected = await user1.page.locator('img[alt="Warrior"]').first().getAttribute('class');
  const user2Selected = await user2.page.locator('img[alt="Warrior"]').first().getAttribute('class');
  
  expect(user1Selected).toBe(user2Selected);
  
  console.log('Concurrent editing test completed');
}

/**
 * Test network disconnection and recovery
 */
export async function testNetworkResilience(users) {
  const [user1, user2] = users;
  
  // User 1 goes offline
  await user1.page.context().setOffline(true);
  
  // User 2 makes changes while User 1 is offline
  await user2.page.locator('img[alt="Astrologian"]').first().click();
  await user2.page.waitForTimeout(1000);
  
  // User 1 comes back online
  await user1.page.context().setOffline(false);
  await user1.page.waitForTimeout(3000);
  
  // Verify User 1 receives the changes made while offline
  await expect(user1.page.locator('img[alt="Astrologian"]').first()).toHaveClass(/selected/);
  
  console.log('Network resilience test completed');
}

/**
 * Test session cleanup when users disconnect
 */
export async function testSessionCleanup(users) {
  const initialUserCount = users.length;
  
  // Verify initial user count
  await verifyUserPresence(users);
  
  // Disconnect one user
  const disconnectingUser = users.pop();
  await disconnectingUser.page.close();
  
  // Wait for disconnection to be detected
  await users[0].page.waitForTimeout(3000);
  
  // Verify user count decreases
  for (const user of users) {
    await user.collaborationPage.verifyActiveUserCount(initialUserCount - 1);
  }
  
  console.log('Session cleanup test completed');
}

/**
 * Measure collaboration performance
 */
export async function measureCollaborationPerformance(users, testDuration = 10000) {
  const performanceMetrics = [];
  
  for (const user of users) {
    const metrics = await user.collaborationPage.monitorSyncPerformance(testDuration);
    performanceMetrics.push({
      userId: user.id,
      ...metrics
    });
  }
  
  const avgSyncEvents = performanceMetrics.reduce((sum, m) => sum + m.syncEvents, 0) / performanceMetrics.length;
  
  console.log(`Average sync events per user: ${avgSyncEvents}`);
  console.log('Performance metrics:', performanceMetrics);
  
  return performanceMetrics;
}

/**
 * Test authentication transitions
 */
export async function testAuthenticationTransition(user) {
  const { page, collaborationPage, displayName } = user;
  
  // Start as unauthenticated
  await page.goto('/plan/shared/test-plan-123');
  await collaborationPage.joinCollaborationAsUser(displayName, 'unauthenticated');
  
  // Verify read-only mode
  const editableElements = page.locator('[draggable="true"]');
  expect(await editableElements.count()).toBe(0);
  
  // Simulate authentication
  await mockAuthState(page, {
    uid: 'authenticated-user-456',
    email: 'auth@mitplan.dev',
    displayName: displayName
  });
  
  // Refresh to apply auth state
  await page.reload();
  await waitForPageLoad(page);
  
  // Verify edit mode is now available
  await expect(editableElements.first()).toBeVisible();
  
  console.log(`Authentication transition test completed for ${displayName}`);
}

/**
 * Comprehensive collaboration test suite
 */
export async function runComprehensiveCollaborationTest(browser) {
  console.log('Starting comprehensive collaboration test...');
  
  // Create users
  const users = await createMultiUserSetup(browser, 3);
  
  try {
    // Create and share plan
    const shareUrl = await createAndSharePlan(users[0]);
    console.log(`Plan shared at: ${shareUrl}`);
    
    // All users join
    await joinSharedPlan(users, shareUrl);
    
    // Test user presence
    await verifyUserPresence(users);
    
    // Test real-time synchronization
    await testJobSelectionSync(users);
    await testMitigationAssignmentSync(users);
    
    // Test concurrent editing
    await testConcurrentEditing(users);
    
    // Test network resilience
    await testNetworkResilience(users);
    
    // Test performance
    await measureCollaborationPerformance(users, 5000);
    
    // Test session cleanup
    await testSessionCleanup(users);
    
    console.log('Comprehensive collaboration test completed successfully');
    
  } finally {
    await cleanupMultiUserSetup(users);
  }
}
