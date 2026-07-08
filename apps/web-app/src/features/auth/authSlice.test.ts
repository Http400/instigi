import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AuthTokens, User } from '@instigi/types';
import {
  authReducer,
  credentialsReceived,
  tokensRefreshed,
  loggedOut,
  type AuthState,
} from './authSlice';

const STORAGE_KEY = 'instigi.auth';

const user: User = {
  id: 'u1',
  email: 'a@b.com',
  name: 'Ada',
  role: 'user',
  createdAt: new Date('2020-01-01T00:00:00.000Z'),
  updatedAt: new Date('2020-01-01T00:00:00.000Z'),
};

const tokens: AuthTokens = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
};

const authedState: AuthState = {
  user,
  accessToken: tokens.accessToken,
  refreshToken: tokens.refreshToken,
  status: 'idle',
};

beforeEach(() => {
  localStorage.clear();
});

describe('authSlice reducers', () => {
  it('credentialsReceived sets user + tokens and writes localStorage', () => {
    const next = authReducer(
      undefined,
      credentialsReceived({ user, tokens })
    );
    expect(next.user).toEqual(user);
    expect(next.accessToken).toBe('access-1');
    expect(next.refreshToken).toBe('refresh-1');

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    expect(stored.accessToken).toBe('access-1');
    expect(stored.refreshToken).toBe('refresh-1');
    expect(stored.user.id).toBe('u1');
  });

  it('tokensRefreshed swaps tokens but preserves user', () => {
    const next = authReducer(
      authedState,
      tokensRefreshed({ accessToken: 'access-2', refreshToken: 'refresh-2' })
    );
    expect(next.user).toEqual(user);
    expect(next.accessToken).toBe('access-2');
    expect(next.refreshToken).toBe('refresh-2');

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    expect(stored.user.id).toBe('u1');
    expect(stored.accessToken).toBe('access-2');
  });

  it('loggedOut clears state and localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, ...tokens }));
    const next = authReducer(authedState, loggedOut());
    expect(next.user).toBeNull();
    expect(next.accessToken).toBeNull();
    expect(next.refreshToken).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe('authSlice initial state (rehydration)', () => {
  it('rehydrates from a pre-seeded localStorage', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user,
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
      })
    );
    vi.resetModules();
    const mod = await import('./authSlice');
    const state = mod.authReducer(undefined, { type: '@@INIT' });
    expect(state.accessToken).toBe('access-1');
    expect(state.user?.id).toBe('u1');
  });

  it('yields a clean unauthenticated state when localStorage is corrupt', async () => {
    localStorage.setItem(STORAGE_KEY, '{ not json');
    vi.resetModules();
    const mod = await import('./authSlice');
    const state = mod.authReducer(undefined, { type: '@@INIT' });
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
  });
});
