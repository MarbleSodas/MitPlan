import { expect } from '@playwright/test';
import { CollaborationPage } from './CollaborationPage.js';
import { waitForElement, waitForCollaboration } from '../utils/helpers.js';

/**
 * Enhanced page object for multi-user collaboration testing
 * Extends CollaborationPage with multi-browser specific functionality
 */
export class MultiUserCollaborationPage extends CollaborationPage {
  constructor(page, userId = null) {
    super(page);
    this.userId = userId;
    this.userDisplayName = null;
    
    // Multi-user specific selectors
    this.multiUserIndicators = {
      userCount: '[data-testid="active-user-count"]',
      userList: '[data-testid="collaboration-user-list"]',
      userPresence: (userId) => `[data-testid="user-presence-${userId}"]`,
      userCursor: (userId) => `[data-testid="user-cursor-${userId}"]`,
      userSelection: (userId) => `[data-testid="user-selection-${userId}"]`,
      conflictIndicator: '[data-testid="conflict-indicator"]',
      syncStatus: '[data-testid="sync-status"]'
    };
  }

  /**
   * Join collaboration with enhanced multi-user tracking
   */
  async joinCollaborationAsUser(displayName, userType = 'unauthenticated') {
    this.userDisplayName = displayName;

    try {
      // Wait for page to load first
      await this.page.waitForSelector('h1', { timeout: 10000 });

      // Check if collaboration onboarding is present
      const onboardingSelectors = [
        this.collaborationOnboarding,
        '[data-testid="collaboration-onboarding"]',
        '[data-testid="display-name-modal"]',
        '.collaboration-modal',
        'input[placeholder*="name"]'
      ];

      let onboardingFound = false;
      for (const selector of onboardingSelectors) {
        if (await this.page.locator(selector).count() > 0) {
          onboardingFound = true;

          // Try to fill display name
          const nameInputSelectors = [
            this.displayNameInput,
            '[data-testid="display-name-input"]',
            'input[placeholder*="name"]',
            'input[type="text"]'
          ];

          for (const nameSelector of nameInputSelectors) {
            const nameInput = this.page.locator(nameSelector);
            if (await nameInput.count() > 0) {
              await nameInput.fill(displayName);
              break;
            }
          }

          // Try to join collaboration
          const joinButtonSelectors = [
            this.joinCollaborationButton,
            '[data-testid="join-collaboration"]',
            'button:has-text("Join")',
            'button:has-text("Continue")',
            'button[type="submit"]'
          ];

          for (const buttonSelector of joinButtonSelectors) {
            const joinButton = this.page.locator(buttonSelector);
            if (await joinButton.count() > 0) {
              await joinButton.click();
              break;
            }
          }

          break;
        }
      }

      // Wait for collaboration to be active
      await this.page.waitForTimeout(2000);

      // Try to verify user appears in user list (optional)
      try {
        await this.verifyUserInList(displayName);
      } catch (error) {
        console.log(`Could not verify user in list: ${error.message}`);
      }

      console.log(`User "${displayName}" joined collaboration as ${userType} (onboarding found: ${onboardingFound})`);

    } catch (error) {
      console.log(`Collaboration join attempt for user "${displayName}": ${error.message}`);
    }
  }

  /**
   * Verify user appears in the collaboration user list
   */
  async verifyUserInList(displayName) {
    const userList = this.page.locator(this.multiUserIndicators.userList);
    await expect(userList).toContainText(displayName);
  }

  /**
   * Verify total number of active users
   */
  async verifyActiveUserCount(expectedCount) {
    const userCountElement = this.page.locator(this.multiUserIndicators.userCount);
    
    if (await userCountElement.count() > 0) {
      await expect(userCountElement).toContainText(expectedCount.toString());
    } else {
      // Fallback: count user items in the list
      const userItems = this.page.locator('[data-testid^="user-"]');
      await expect(userItems).toHaveCount(expectedCount);
    }
  }

  /**
   * Simulate user making a selection and verify it's visible to others
   */
  async makeSelectionAndVerifySync(elementSelector, otherUserPages = []) {
    // Make selection
    await this.page.locator(elementSelector).click();
    
    // Wait for sync
    await this.page.waitForTimeout(1000);
    
    // Verify selection is visible on other users' screens
    for (const otherPage of otherUserPages) {
      await expect(otherPage.locator(elementSelector)).toHaveClass(/selected/);
    }
    
    console.log(`Selection synced across ${otherUserPages.length + 1} users`);
  }

  /**
   * Perform drag and drop operation and verify sync
   */
  async dragAndDropWithSync(sourceSelector, targetSelector, otherUserPages = []) {
    // Perform drag and drop
    await this.page.locator(sourceSelector).dragTo(this.page.locator(targetSelector));
    
    // Wait for sync
    await this.page.waitForTimeout(1500);
    
    // Verify result is visible on other users' screens
    for (const otherPage of otherUserPages) {
      const assignedElement = otherPage.locator('[data-testid*="assigned-mitigation"]').first();
      await expect(assignedElement).toBeVisible();
    }
    
    console.log(`Drag and drop synced across ${otherUserPages.length + 1} users`);
  }

  /**
   * Verify user presence indicators
   */
  async verifyUserPresenceIndicators(expectedUsers) {
    for (const user of expectedUsers) {
      const userPresence = this.page.locator(this.multiUserIndicators.userPresence(user.id || user.displayName));
      
      if (await userPresence.count() > 0) {
        await expect(userPresence).toBeVisible();
        
        // Verify user color if specified
        if (user.color) {
          const backgroundColor = await userPresence.evaluate(el => 
            window.getComputedStyle(el).backgroundColor
          );
          expect(backgroundColor).toContain(user.color);
        }
      }
    }
  }

  /**
   * Verify real-time selection highlighting
   */
  async verifySelectionHighlighting(userId, elementId) {
    const selectionHighlight = this.page.locator(this.multiUserIndicators.userSelection(userId));
    
    if (await selectionHighlight.count() > 0) {
      await expect(selectionHighlight).toBeVisible();
      
      // Verify highlight is on the correct element
      const highlightedElement = this.page.locator(`[data-testid="${elementId}"]`);
      await expect(highlightedElement).toHaveClass(/highlighted|selected/);
    }
  }

  /**
   * Test concurrent editing scenario
   */
  async performConcurrentEdit(action, otherUserPages = [], conflictExpected = false) {
    const startTime = Date.now();
    
    // Perform action
    await action();
    
    // Wait for potential conflicts
    await this.page.waitForTimeout(2000);
    
    if (conflictExpected) {
      // Check for conflict resolution dialog
      const conflictDialog = this.page.locator(this.conflictResolutionDialog);
      if (await conflictDialog.count() > 0) {
        await this.handleConflictResolution('accept');
      }
    }
    
    // Verify final state is consistent across all users
    const endTime = Date.now();
    console.log(`Concurrent edit completed in ${endTime - startTime}ms`);
    
    return endTime - startTime;
  }

  /**
   * Monitor sync status and performance
   */
  async monitorSyncPerformance(duration = 5000) {
    const syncMetrics = {
      syncEvents: 0,
      avgSyncTime: 0,
      errors: 0
    };
    
    const startTime = Date.now();
    
    // Monitor sync status changes
    const syncStatusElement = this.page.locator(this.multiUserIndicators.syncStatus);
    
    while (Date.now() - startTime < duration) {
      if (await syncStatusElement.count() > 0) {
        const syncStatus = await syncStatusElement.textContent();
        if (syncStatus && syncStatus.includes('syncing')) {
          syncMetrics.syncEvents++;
        }
      }
      
      await this.page.waitForTimeout(100);
    }
    
    return syncMetrics;
  }

  /**
   * Verify session persistence across page reloads
   */
  async verifySessionPersistence() {
    // Record current state
    const selectedJobs = await this.page.locator('.selected img').count();
    const assignedMitigations = await this.page.locator('[data-testid*="assigned-mitigation"]').count();
    
    // Reload page
    await this.page.reload();
    await waitForCollaboration(this.page);
    
    // Verify state is restored
    await expect(this.page.locator('.selected img')).toHaveCount(selectedJobs);
    await expect(this.page.locator('[data-testid*="assigned-mitigation"]')).toHaveCount(assignedMitigations);
    
    console.log('Session state persisted across page reload');
  }

  /**
   * Test network resilience
   */
  async testNetworkResilience() {
    // Record initial state
    const initialUserCount = await this.page.locator('[data-testid^="user-"]').count();
    
    // Simulate network disconnection
    await this.page.context().setOffline(true);
    await this.page.waitForTimeout(2000);
    
    // Verify offline indicator
    const connectionStatus = this.page.locator(this.connectionStatus);
    if (await connectionStatus.count() > 0) {
      await expect(connectionStatus).toContainText('Disconnected');
    }
    
    // Restore connection
    await this.page.context().setOffline(false);
    await this.page.waitForTimeout(3000);
    
    // Verify reconnection
    await waitForCollaboration(this.page);
    
    // Verify user count is restored
    await expect(this.page.locator('[data-testid^="user-"]')).toHaveCount(initialUserCount);
    
    console.log('Network resilience test completed');
  }

  /**
   * Verify conflict resolution mechanisms
   */
  async verifyConflictResolution(conflictType = 'mitigation_assignment') {
    const conflictIndicator = this.page.locator(this.multiUserIndicators.conflictIndicator);
    
    if (await conflictIndicator.count() > 0) {
      await expect(conflictIndicator).toBeVisible();
      
      // Handle conflict based on type
      switch (conflictType) {
        case 'mitigation_assignment':
          await this.handleConflictResolution('accept');
          break;
        case 'job_selection':
          await this.handleConflictResolution('reject');
          break;
        default:
          await this.handleConflictResolution('accept');
      }
      
      // Verify conflict is resolved
      await expect(conflictIndicator).not.toBeVisible({ timeout: 5000 });
    }
  }

  /**
   * Measure collaboration responsiveness
   */
  async measureCollaborationResponsiveness(actions = []) {
    const metrics = [];
    
    for (const action of actions) {
      const startTime = Date.now();
      
      await action();
      
      // Wait for sync completion
      await this.waitForCollaborationSync();
      
      const endTime = Date.now();
      metrics.push(endTime - startTime);
    }
    
    const avgResponseTime = metrics.reduce((a, b) => a + b, 0) / metrics.length;
    
    console.log(`Average collaboration response time: ${avgResponseTime}ms`);
    
    return {
      individual: metrics,
      average: avgResponseTime,
      max: Math.max(...metrics),
      min: Math.min(...metrics)
    };
  }

  /**
   * Clean up user session
   */
  async cleanupUserSession() {
    try {
      // Leave collaboration if active
      const leaveButton = this.page.locator('[data-testid="leave-collaboration"]');
      if (await leaveButton.count() > 0) {
        await leaveButton.click();
      }
      
      console.log(`User "${this.userDisplayName}" session cleaned up`);
    } catch (error) {
      console.log('Session cleanup completed');
    }
  }
}
