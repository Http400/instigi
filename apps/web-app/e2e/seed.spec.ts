// Risk: a saved authenticated session must grant access to protected app routes.
// Seed: model future E2E specs on this test's locators, state waits, and outcome assertion.
import { expect, test } from '@playwright/test';

test('saved authentication grants access to the workouts route', async ({ page }) => {
  await page.goto('/workouts');

  await expect(page).toHaveURL(/\/workouts$/);
  await expect(page.getByRole('heading', { name: 'Workouts', level: 4 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
});
