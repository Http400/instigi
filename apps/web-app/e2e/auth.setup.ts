import { expect, test as setup } from '@playwright/test';
import path from 'node:path';

const authFile = path.join(import.meta.dirname, '../playwright/.auth/user.json');
const credentials = {
  email: 'e2e@instigi.test',
  name: 'E2E User',
  password: 'e2e-password-123',
};

setup('authenticate the E2E user', async ({ page, request }) => {
  const registration = await request.post('/auth/register', {
    data: credentials,
  });
  expect([201, 409]).toContain(registration.status());

  await page.goto('/');
  await page.getByLabel('Email address').fill(credentials.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(credentials.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL('**/workouts');

  await page.context().storageState({ path: authFile });
});
