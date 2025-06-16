import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage.js';
import { testUsers } from '../utils/test-data.js';
import { setupFirebaseMocks, mockAuthError, resetMocks } from '../utils/firebase-mock.js';
import { waitForPageLoad, generateTestEmail } from '../utils/helpers.js';

test.describe('Authentication', () => {
  let authPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    await setupFirebaseMocks(page);
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test.afterEach(async ({ page }) => {
    await resetMocks(page);
  });

  test.describe('Login', () => {
    test('should login with valid credentials', async ({ page }) => {
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      
      await authPage.verifyLoggedIn(testUsers.validUser.displayName);
      await authPage.verifySuccessMessage('Login successful');
    });

    test('should show error with invalid credentials', async ({ page }) => {
      await authPage.login(testUsers.invalidUser.email, testUsers.invalidUser.password);
      
      await authPage.verifyAuthError('Invalid email or password');
      await authPage.verifyLoggedOut();
    });

    test('should show error with empty fields', async ({ page }) => {
      await authPage.login('', '');
      
      await authPage.verifyAuthError('Email and password are required');
    });

    test('should show error with invalid email format', async ({ page }) => {
      await authPage.login('invalid-email', testUsers.validUser.password);
      
      await authPage.verifyAuthError('Please enter a valid email address');
    });

    test('should handle network errors gracefully', async ({ page }) => {
      await mockAuthError(page, 'network-error');
      
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      
      await authPage.verifyAuthError('Network error. Please check your connection and try again.');
    });
  });

  test.describe('Registration', () => {
    test('should register with valid data', async ({ page }) => {
      const email = generateTestEmail();
      
      await authPage.register(
        email,
        testUsers.newUser.password,
        testUsers.newUser.password,
        testUsers.newUser.displayName
      );
      
      await authPage.verifySuccessMessage('Registration successful');
      await authPage.verifyLoggedIn(testUsers.newUser.displayName);
    });

    test('should show error when passwords do not match', async ({ page }) => {
      const email = generateTestEmail();
      
      await authPage.register(
        email,
        testUsers.newUser.password,
        'DifferentPassword123!',
        testUsers.newUser.displayName
      );
      
      await authPage.verifyAuthError('Passwords do not match');
    });

    test('should show error with weak password', async ({ page }) => {
      const email = generateTestEmail();
      
      await authPage.register(
        email,
        'weak',
        'weak',
        testUsers.newUser.displayName
      );
      
      await authPage.verifyAuthError('Password must be at least 8 characters long');
    });

    test('should show error with existing email', async ({ page }) => {
      await authPage.register(
        testUsers.validUser.email,
        testUsers.newUser.password,
        testUsers.newUser.password,
        testUsers.newUser.displayName
      );
      
      await authPage.verifyAuthError('Email already in use');
    });

    test('should show error with empty display name', async ({ page }) => {
      const email = generateTestEmail();
      
      await authPage.register(
        email,
        testUsers.newUser.password,
        testUsers.newUser.password,
        ''
      );
      
      await authPage.verifyAuthError('Display name is required');
    });
  });

  test.describe('Google Sign-In', () => {
    test('should login with Google successfully', async ({ page }) => {
      // Mock Google OAuth flow
      await page.addInitScript(() => {
        window.mockGoogleAuth = {
          signIn: () => Promise.resolve({
            user: {
              uid: 'google-user-123',
              email: 'google@test.com',
              displayName: 'Google User'
            }
          })
        };
      });

      await authPage.loginWithGoogle();
      
      await authPage.verifyLoggedIn('Google User');
      await authPage.verifySuccessMessage('Google sign-in successful');
    });

    test('should handle Google sign-in cancellation', async ({ page }) => {
      await page.addInitScript(() => {
        window.mockGoogleAuth = {
          signIn: () => Promise.reject(new Error('User cancelled'))
        };
      });

      await authPage.loginWithGoogle();
      
      await authPage.verifyLoggedOut();
      // Should not show error for user cancellation
    });

    test('should handle Google sign-in errors', async ({ page }) => {
      await page.addInitScript(() => {
        window.mockGoogleAuth = {
          signIn: () => Promise.reject(new Error('Google sign-in failed'))
        };
      });

      await authPage.loginWithGoogle();
      
      await authPage.verifyAuthError('Google sign-in failed');
      await authPage.verifyLoggedOut();
    });
  });

  test.describe('Password Reset', () => {
    test('should send password reset email', async ({ page }) => {
      await authPage.resetPassword(testUsers.validUser.email);
      
      await authPage.verifySuccessMessage('Password reset email sent');
    });

    test('should show error with invalid email', async ({ page }) => {
      await authPage.resetPassword('nonexistent@test.com');
      
      await authPage.verifyAuthError('No user found with this email address');
    });

    test('should show error with empty email', async ({ page }) => {
      await authPage.resetPassword('');
      
      await authPage.verifyAuthError('Email is required');
    });
  });

  test.describe('Profile Management', () => {
    test.beforeEach(async ({ page }) => {
      // Login first
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      await authPage.verifyLoggedIn(testUsers.validUser.displayName);
    });

    test('should update display name', async ({ page }) => {
      const newDisplayName = 'Updated Test User';
      
      await authPage.updateProfile(newDisplayName);
      
      await authPage.verifySuccessMessage('Profile updated successfully');
      await authPage.verifyLoggedIn(newDisplayName);
    });

    test('should show error with empty display name', async ({ page }) => {
      await authPage.updateProfile('');
      
      await authPage.verifyAuthError('Display name cannot be empty');
    });

    test('should change password successfully', async ({ page }) => {
      const newPassword = 'NewPassword123!';
      
      await authPage.changePassword(testUsers.validUser.password, newPassword);
      
      await authPage.verifySuccessMessage('Password changed successfully');
    });

    test('should show error with incorrect current password', async ({ page }) => {
      await authPage.changePassword('WrongPassword123!', 'NewPassword123!');
      
      await authPage.verifyAuthError('Current password is incorrect');
    });

    test('should show error with weak new password', async ({ page }) => {
      await authPage.changePassword(testUsers.validUser.password, 'weak');
      
      await authPage.verifyAuthError('New password must be at least 8 characters long');
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across page refreshes', async ({ page }) => {
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      await authPage.verifyLoggedIn(testUsers.validUser.displayName);
      
      await page.reload();
      await waitForPageLoad(page);
      
      await authPage.verifyLoggedIn(testUsers.validUser.displayName);
    });

    test('should logout successfully', async ({ page }) => {
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      await authPage.verifyLoggedIn(testUsers.validUser.displayName);
      
      await authPage.signOut();
      
      await authPage.verifyLoggedOut();
      await authPage.verifySuccessMessage('Logged out successfully');
    });

    test('should handle session expiration', async ({ page }) => {
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      await authPage.verifyLoggedIn(testUsers.validUser.displayName);
      
      // Simulate session expiration
      await page.addInitScript(() => {
        window.__SIMULATE_SESSION_EXPIRY__ = true;
      });
      
      await page.reload();
      await waitForPageLoad(page);
      
      await authPage.verifyLoggedOut();
      await authPage.verifyAuthError('Session expired. Please log in again.');
    });
  });

  test.describe('Modal Interactions', () => {
    test('should open and close auth modal', async ({ page }) => {
      await authPage.openAuthModal();
      
      await expect(page.locator('[data-testid="auth-modal"]')).toBeVisible();
      
      await authPage.closeAuthModal();
      
      await expect(page.locator('[data-testid="auth-modal"]')).not.toBeVisible();
    });

    test('should switch between tabs', async ({ page }) => {
      await authPage.openAuthModal();
      
      await authPage.switchToRegisterTab();
      await expect(page.locator('[data-testid="register-form"]')).toBeVisible();
      
      await authPage.switchToLoginTab();
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      
      await authPage.switchToForgotPasswordTab();
      await expect(page.locator('[data-testid="forgot-password-form"]')).toBeVisible();
    });

    test('should close modal on successful login', async ({ page }) => {
      await authPage.login(testUsers.validUser.email, testUsers.validUser.password);
      
      await expect(page.locator('[data-testid="auth-modal"]')).not.toBeVisible();
      await authPage.verifyLoggedIn(testUsers.validUser.displayName);
    });
  });
});
