// risk: context/foundation/test-plan.md #6 — the complete workout logging loop persists
// seed: apps/web-app/e2e/seed.spec.ts
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

interface ApiResponse<T> {
  data: T;
}

interface SessionIdentity {
  id: string;
}

async function readAccessToken(page: Page): Promise<string> {
  const accessToken = await page.evaluate(() => {
    const rawSession = localStorage.getItem('instigi.auth');
    if (!rawSession) return null;
    const session = JSON.parse(rawSession) as { accessToken?: unknown };
    return typeof session.accessToken === 'string' ? session.accessToken : null;
  });
  if (!accessToken) {
    throw new Error('Authenticated storage state did not contain an access token');
  }
  return accessToken;
}

async function cleanupSession(
  request: APIRequestContext,
  accessToken: string,
  sessionId: string
): Promise<void> {
  const response = await request.delete(`/training/e2e/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual({ data: { id: sessionId } });
}

async function cleanupActiveSession(
  request: APIRequestContext,
  accessToken: string
): Promise<void> {
  const response = await request.get('/training/sessions/active', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as ApiResponse<SessionIdentity | null>;
  if (body.data) {
    await cleanupSession(request, accessToken, body.data.id);
  }
}

test.describe('Risk #6: critical workout logging loop', () => {
  test('finished workout and its logged set persist in history', async ({ page, request }) => {
    const workoutTitle = `E2E Workout ${Date.now()}`;
    let accessToken: string | undefined;
    let sessionId: string | undefined;

    // Start from an authenticated user with no leftover active workout.
    await page.goto('/workouts');
    accessToken = await readAccessToken(page);
    await cleanupActiveSession(request, accessToken);
    await page.reload();

    try {
      // Start and uniquely name a workout.
      await Promise.all([
        page.waitForURL(/\/workouts\/[^/]+$/),
        page.getByRole('button', { name: 'Start workout' }).click(),
      ]);
      sessionId = new URL(page.url()).pathname.split('/').at(-1);
      if (!sessionId) {
        throw new Error('The created workout URL did not contain a session id');
      }

      const titleUpdate = page.waitForResponse(
        (response) =>
          response.url().endsWith(`/training/sessions/${sessionId}`) &&
          response.request().method() === 'PATCH'
      );
      await page.getByLabel('Session title').fill(workoutTitle);
      await page.getByLabel('Session title').press('Enter');
      expect((await titleUpdate).ok()).toBe(true);

      // Add the seeded Bench Press exercise.
      await page.getByRole('button', { name: 'Add exercise' }).click();
      const addExerciseDialog = page.getByRole('dialog', {
        name: 'Add exercise',
      });
      await expect(addExerciseDialog).toBeVisible();
      const benchPressItem = addExerciseDialog
        .getByRole('listitem')
        .filter({ hasText: 'Bench Press' });
      const addExerciseResponse = page.waitForResponse(
        (response) =>
          response.url().endsWith(`/training/sessions/${sessionId}/exercises`) &&
          response.request().method() === 'POST'
      );
      await benchPressItem.getByRole('button', { name: 'Add', exact: true }).click();
      expect((await addExerciseResponse).ok()).toBe(true);
      await addExerciseDialog.getByRole('button', { name: 'Close' }).click();
      await expect(addExerciseDialog).not.toBeVisible();
      await expect(page.getByText('Bench Press', { exact: true })).toBeVisible();

      // Log one complete set and wait for its persisted representation.
      await page.getByRole('textbox', { name: 'Reps for Bench Press' }).fill('8');
      await page.getByRole('textbox', { name: 'Weight for Bench Press' }).fill('50');
      const logSetResponse = page.waitForResponse(
        (response) =>
          response.url().includes(`/training/sessions/${sessionId}/exercises/`) &&
          response.url().endsWith('/sets') &&
          response.request().method() === 'POST'
      );
      await page.getByRole('button', { name: 'Add set to Bench Press' }).click();
      expect((await logSetResponse).ok()).toBe(true);
      await expect(page.getByText('Reps 8 · Weight 50 kg')).toBeVisible();

      // Finish the workout and return to the workouts landing page.
      await page.getByRole('button', { name: 'Finish workout' }).click();
      const finishDialog = page.getByRole('dialog', {
        name: 'Finish workout?',
      });
      await expect(finishDialog).toBeVisible();
      const finishResponse = page.waitForResponse(
        (response) =>
          response.url().endsWith(`/training/sessions/${sessionId}/finish`) &&
          response.request().method() === 'POST'
      );
      await Promise.all([
        page.waitForURL(/\/workouts$/),
        finishDialog.getByRole('button', { name: 'Finish', exact: true }).click(),
      ]);
      expect((await finishResponse).ok()).toBe(true);

      // Find the unique finished workout in history.
      await Promise.all([
        page.waitForURL(/\/workouts\/history$/),
        page.getByRole('button', { name: 'View history' }).click(),
      ]);
      const historyItem = page.getByRole('listitem').filter({ hasText: workoutTitle });
      await expect(historyItem).toContainText('1 exercise');

      // Reopen it and verify the logged exercise and values survived.
      await historyItem.getByRole('button').click();
      await page.waitForURL(`/workouts/${sessionId}`);
      await expect(page.getByLabel('Session title')).toHaveValue(workoutTitle);
      await expect(page.getByText('Bench Press', { exact: true })).toBeVisible();
      await expect(page.getByText('Set 1', { exact: true })).toBeVisible();
      await expect(page.getByText('Reps 8 · Weight 50 kg')).toBeVisible();
    } finally {
      if (accessToken && sessionId) {
        await cleanupSession(request, accessToken, sessionId);
      }
    }
  });
});
