/** Credential-free browser release smoke. Authenticated collaboration is
 * exercised separately against staging because it requires real Supabase
 * users, private-channel RLS, and OAuth configuration. */
import { expect, test } from '@playwright/test';

test.describe('web release smoke', () => {
  test('loads the account-required login surface', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue with Discord' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
    await expect(page.getByText('Or sign in with email')).toBeVisible();
  });
});
