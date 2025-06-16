import { expect } from '@playwright/test';
import { waitForElement, fillInput, clickAndWait, waitForToast, waitForCollaboration } from '../utils/helpers.js';

export class CollaborationPage {
  constructor(page) {
    this.page = page;
    
    // Selectors
    this.collaborationSection = '[data-testid="collaboration-section"]';
    this.collaborationIndicator = '[data-testid="collaboration-indicator"]';
    this.userPresenceIndicator = '[data-testid="user-presence-indicator"]';
    this.connectionStatus = '[data-testid="connection-status"]';
    
    // User presence
    this.userList = '[data-testid="collaboration-user-list"]';
    this.userItem = (userId) => `[data-testid="user-${userId}"]`;
    this.userAvatar = (userId) => `[data-testid="user-avatar-${userId}"]`;
    this.userName = (userId) => `[data-testid="user-name-${userId}"]`;
    this.userStatus = (userId) => `[data-testid="user-status-${userId}"]`;
    
    // Selection indicators
    this.selectionHighlight = (userId, actionId) => `[data-testid="selection-${userId}-${actionId}"]`;
    this.userSelectionIndicator = (userId) => `[data-testid="user-selection-${userId}"]`;
    
    // Onboarding
    this.collaborationOnboarding = '[data-testid="collaboration-onboarding"]';
    this.displayNameInput = '[data-testid="display-name-input"]';
    this.joinCollaborationButton = '[data-testid="join-collaboration"]';
    this.skipOnboardingButton = '[data-testid="skip-onboarding"]';
    
    // Session control
    this.sessionControlPanel = '[data-testid="session-control-panel"]';
    this.startSessionButton = '[data-testid="start-session"]';
    this.endSessionButton = '[data-testid="end-session"]';
    this.sessionStatusIndicator = '[data-testid="session-status"]';
    
    // Real-time updates
    this.realtimeUpdateIndicator = '[data-testid="realtime-update"]';
    this.conflictResolutionDialog = '[data-testid="conflict-resolution-dialog"]';
    this.acceptChangesButton = '[data-testid="accept-changes"]';
    this.rejectChangesButton = '[data-testid="reject-changes"]';
    
    // Read-only mode
    this.readOnlyBanner = '[data-testid="read-only-banner"]';
    this.signInToEditButton = '[data-testid="sign-in-to-edit"]';
    this.createOwnPlanButton = '[data-testid="create-own-plan"]';
    
    // Share controls
    this.shareControlsPanel = '[data-testid="share-controls-panel"]';
    this.shareUrlDisplay = '[data-testid="share-url-display"]';
    this.copyShareLinkButton = '[data-testid="copy-share-link"]';
    this.revokeShareButton = '[data-testid="revoke-share"]';
    this.sharePermissionsSelect = '[data-testid="share-permissions"]';
  }

  async joinCollaboration(displayName) {
    try {
      await waitForElement(this.page, this.collaborationOnboarding, { timeout: 5000 });
      
      await fillInput(this.page, this.displayNameInput, displayName);
      await clickAndWait(this.page, this.joinCollaborationButton);
      
      // Wait for collaboration to be active
      await waitForCollaboration(this.page);
    } catch (error) {
      // Onboarding might not appear if already authenticated
      console.log('No collaboration onboarding appeared');
    }
  }

  async skipOnboarding() {
    try {
      await waitForElement(this.page, this.collaborationOnboarding, { timeout: 3000 });
      await clickAndWait(this.page, this.skipOnboardingButton);
    } catch (error) {
      // Onboarding might not appear
      console.log('No onboarding to skip');
    }
  }

  async verifyCollaborationActive() {
    await waitForElement(this.page, this.collaborationIndicator);
    await expect(this.page.locator(this.collaborationIndicator)).toContainText('Collaboration Active');
  }

  async verifyUserPresence(users) {
    await waitForElement(this.page, this.userPresenceIndicator);
    
    for (const user of users) {
      const userItem = this.page.locator(this.userItem(user.id));
      await expect(userItem).toBeVisible();
      
      const userName = this.page.locator(this.userName(user.id));
      await expect(userName).toContainText(user.displayName);
      
      // Verify user color
      const userAvatar = this.page.locator(this.userAvatar(user.id));
      const backgroundColor = await userAvatar.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      expect(backgroundColor).toContain(user.color);
    }
  }

  async verifyUserSelection(userId, actionId) {
    const selectionHighlight = this.page.locator(this.selectionHighlight(userId, actionId));
    await expect(selectionHighlight).toBeVisible();
    
    // Verify selection has user's color
    const borderColor = await selectionHighlight.evaluate(el => 
      window.getComputedStyle(el).borderColor
    );
    // Color verification would need the user's color to compare
  }

  async simulateUserSelection(actionId) {
    // Simulate another user selecting a boss action
    const bossAction = this.page.locator(`[data-testid="boss-action-${actionId}"]`);
    await bossAction.click();
    
    // Verify selection is highlighted
    await expect(bossAction).toHaveClass(/selected/);
  }

  async verifyRealtimeUpdate(expectedUpdateType) {
    const updateIndicator = this.page.locator(this.realtimeUpdateIndicator);
    await expect(updateIndicator).toBeVisible();
    await expect(updateIndicator).toContainText(expectedUpdateType);
    
    // Update indicator should disappear after a short time
    await expect(updateIndicator).not.toBeVisible({ timeout: 5000 });
  }

  async handleConflictResolution(action = 'accept') {
    try {
      await waitForElement(this.page, this.conflictResolutionDialog, { timeout: 3000 });
      
      const button = action === 'accept' ? this.acceptChangesButton : this.rejectChangesButton;
      await clickAndWait(this.page, button);
      
      // Verify dialog is closed
      await expect(this.page.locator(this.conflictResolutionDialog)).not.toBeVisible();
    } catch (error) {
      // No conflict to resolve
      console.log('No conflict resolution dialog appeared');
    }
  }

  async verifyReadOnlyMode() {
    await waitForElement(this.page, this.readOnlyBanner);
    await expect(this.page.locator(this.readOnlyBanner)).toContainText('Read-only mode');
    
    // Verify edit controls are disabled
    const dragElements = this.page.locator('[draggable="true"]');
    const count = await dragElements.count();
    expect(count).toBe(0);
  }

  async signInToEdit() {
    await clickAndWait(this.page, this.signInToEditButton);
    
    // This should trigger the auth modal
    await waitForElement(this.page, '[data-testid="auth-modal"]');
  }

  async createOwnPlan() {
    await clickAndWait(this.page, this.createOwnPlanButton);
    
    // Should navigate to a new plan
    await this.page.waitForURL('/');
  }

  async startCollaborationSession() {
    await clickAndWait(this.page, this.startSessionButton);
    await waitForToast(this.page, 'Collaboration session started');
    
    // Verify session is active
    const sessionStatus = this.page.locator(this.sessionStatusIndicator);
    await expect(sessionStatus).toContainText('Active');
  }

  async endCollaborationSession() {
    await clickAndWait(this.page, this.endSessionButton);
    await waitForToast(this.page, 'Collaboration session ended');
    
    // Verify session is inactive
    const sessionStatus = this.page.locator(this.sessionStatusIndicator);
    await expect(sessionStatus).toContainText('Inactive');
  }

  async copyShareLink() {
    await clickAndWait(this.page, this.copyShareLinkButton);
    await waitForToast(this.page, 'Share link copied to clipboard');
  }

  async revokeShare() {
    await clickAndWait(this.page, this.revokeShareButton);
    
    // Confirm revocation
    await this.page.getByRole('button', { name: 'Revoke' }).click();
    await waitForToast(this.page, 'Share access revoked');
  }

  async changeSharePermissions(permissions) {
    await this.page.locator(this.sharePermissionsSelect).selectOption(permissions);
    await waitForToast(this.page, 'Permissions updated');
  }

  async verifyConnectionStatus(expectedStatus) {
    const connectionStatus = this.page.locator(this.connectionStatus);
    await expect(connectionStatus).toContainText(expectedStatus);
  }

  async simulateNetworkDisconnection() {
    // Simulate network disconnection
    await this.page.context().setOffline(true);
    
    // Verify connection status updates
    await this.verifyConnectionStatus('Disconnected');
  }

  async simulateNetworkReconnection() {
    // Restore network connection
    await this.page.context().setOffline(false);
    
    // Verify connection status updates
    await this.verifyConnectionStatus('Connected');
  }

  async verifyUserCount(expectedCount) {
    const userItems = this.page.locator('[data-testid^="user-"]');
    await expect(userItems).toHaveCount(expectedCount);
  }

  async verifyCollaborativeEdit(actionId, abilityId, userId) {
    // Verify that a collaborative edit is reflected in real-time
    const assignedMitigation = this.page.locator(`[data-testid="assigned-mitigation-${actionId}-${abilityId}"]`);
    await expect(assignedMitigation).toBeVisible();
    
    // Verify edit attribution if available
    const editAttribution = assignedMitigation.locator(`[data-testid="edit-by-${userId}"]`);
    if (await editAttribution.count() > 0) {
      await expect(editAttribution).toBeVisible();
    }
  }

  async waitForCollaborationSync() {
    // Wait for any pending synchronization to complete
    await this.page.waitForTimeout(1000);
    
    // Verify no sync indicators are active
    const syncIndicators = this.page.locator('[data-testid*="sync"]');
    const count = await syncIndicators.count();
    
    for (let i = 0; i < count; i++) {
      const indicator = syncIndicators.nth(i);
      await expect(indicator).not.toHaveClass(/syncing|pending/);
    }
  }

  async verifySelectionPersistence(userId, actionId) {
    // Verify that user selections persist across page refreshes
    await this.page.reload();
    await waitForCollaboration(this.page);
    
    const selectionHighlight = this.page.locator(this.selectionHighlight(userId, actionId));
    await expect(selectionHighlight).toBeVisible();
  }
}
