import { expect } from '@playwright/test';
import { waitForElement, fillInput, clickAndWait, waitForToast } from '../utils/helpers.js';

export class AuthPage {
  constructor(page) {
    this.page = page;
    
    // Selectors
    this.authButton = '[data-testid="auth-button"]';
    this.authModal = '[data-testid="auth-modal"]';
    this.loginTab = '[data-testid="login-tab"]';
    this.registerTab = '[data-testid="register-tab"]';
    this.forgotPasswordTab = '[data-testid="forgot-password-tab"]';
    
    // Login form
    this.loginEmailInput = '[data-testid="login-email"]';
    this.loginPasswordInput = '[data-testid="login-password"]';
    this.loginSubmitButton = '[data-testid="login-submit"]';
    this.googleSignInButton = '[data-testid="google-signin"]';
    
    // Register form
    this.registerEmailInput = '[data-testid="register-email"]';
    this.registerPasswordInput = '[data-testid="register-password"]';
    this.registerConfirmPasswordInput = '[data-testid="register-confirm-password"]';
    this.registerDisplayNameInput = '[data-testid="register-display-name"]';
    this.registerSubmitButton = '[data-testid="register-submit"]';
    
    // Forgot password form
    this.forgotPasswordEmailInput = '[data-testid="forgot-password-email"]';
    this.forgotPasswordSubmitButton = '[data-testid="forgot-password-submit"]';
    
    // User menu
    this.userMenuButton = '[data-testid="user-menu-button"]';
    this.userDropdown = '[data-testid="user-dropdown"]';
    this.profileMenuItem = '[data-testid="profile-menu-item"]';
    this.settingsMenuItem = '[data-testid="settings-menu-item"]';
    this.signOutMenuItem = '[data-testid="signout-menu-item"]';
    
    // Profile modal
    this.profileModal = '[data-testid="profile-modal"]';
    this.profileDisplayNameInput = '[data-testid="profile-display-name"]';
    this.profileSaveButton = '[data-testid="profile-save"]';
    this.profileCloseButton = '[data-testid="profile-close"]';
    
    // Settings modal
    this.settingsModal = '[data-testid="settings-modal"]';
    this.changePasswordButton = '[data-testid="change-password-button"]';
    this.currentPasswordInput = '[data-testid="current-password"]';
    this.newPasswordInput = '[data-testid="new-password"]';
    this.confirmNewPasswordInput = '[data-testid="confirm-new-password"]';
    this.savePasswordButton = '[data-testid="save-password"]';
  }

  async openAuthModal() {
    await clickAndWait(this.page, this.authButton);
    await waitForElement(this.page, this.authModal);
  }

  async closeAuthModal() {
    await this.page.keyboard.press('Escape');
    await this.page.waitForSelector(this.authModal, { state: 'hidden' });
  }

  async switchToLoginTab() {
    await clickAndWait(this.page, this.loginTab);
  }

  async switchToRegisterTab() {
    await clickAndWait(this.page, this.registerTab);
  }

  async switchToForgotPasswordTab() {
    await clickAndWait(this.page, this.forgotPasswordTab);
  }

  async login(email, password) {
    await this.openAuthModal();
    await this.switchToLoginTab();
    
    await fillInput(this.page, this.loginEmailInput, email);
    await fillInput(this.page, this.loginPasswordInput, password);
    
    await clickAndWait(this.page, this.loginSubmitButton);
  }

  async loginWithGoogle() {
    await this.openAuthModal();
    await this.switchToLoginTab();
    
    await clickAndWait(this.page, this.googleSignInButton);
  }

  async register(email, password, confirmPassword, displayName) {
    await this.openAuthModal();
    await this.switchToRegisterTab();
    
    await fillInput(this.page, this.registerEmailInput, email);
    await fillInput(this.page, this.registerPasswordInput, password);
    await fillInput(this.page, this.registerConfirmPasswordInput, confirmPassword);
    await fillInput(this.page, this.registerDisplayNameInput, displayName);
    
    await clickAndWait(this.page, this.registerSubmitButton);
  }

  async resetPassword(email) {
    await this.openAuthModal();
    await this.switchToForgotPasswordTab();
    
    await fillInput(this.page, this.forgotPasswordEmailInput, email);
    await clickAndWait(this.page, this.forgotPasswordSubmitButton);
  }

  async openUserMenu() {
    await clickAndWait(this.page, this.userMenuButton);
    await waitForElement(this.page, this.userDropdown);
  }

  async openProfile() {
    await this.openUserMenu();
    await clickAndWait(this.page, this.profileMenuItem);
    await waitForElement(this.page, this.profileModal);
  }

  async updateProfile(displayName) {
    await this.openProfile();
    await fillInput(this.page, this.profileDisplayNameInput, displayName);
    await clickAndWait(this.page, this.profileSaveButton);
  }

  async openSettings() {
    await this.openUserMenu();
    await clickAndWait(this.page, this.settingsMenuItem);
    await waitForElement(this.page, this.settingsModal);
  }

  async changePassword(currentPassword, newPassword) {
    await this.openSettings();
    await clickAndWait(this.page, this.changePasswordButton);
    
    await fillInput(this.page, this.currentPasswordInput, currentPassword);
    await fillInput(this.page, this.newPasswordInput, newPassword);
    await fillInput(this.page, this.confirmNewPasswordInput, newPassword);
    
    await clickAndWait(this.page, this.savePasswordButton);
  }

  async signOut() {
    await this.openUserMenu();
    await clickAndWait(this.page, this.signOutMenuItem);
  }

  async verifyLoggedIn(displayName) {
    await waitForElement(this.page, this.userMenuButton);
    await expect(this.page.locator(this.userMenuButton)).toContainText(displayName);
  }

  async verifyLoggedOut() {
    await waitForElement(this.page, this.authButton);
    await expect(this.page.locator(this.authButton)).toContainText('Sign In');
  }

  async verifyAuthError(expectedMessage) {
    await waitForToast(this.page, expectedMessage);
  }

  async verifySuccessMessage(expectedMessage) {
    await waitForToast(this.page, expectedMessage);
  }
}
