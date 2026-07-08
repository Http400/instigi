import type { AuthTokens, User } from '@instigi/types';

const STORAGE_KEY = 'instigi.auth';

export interface PersistedSession {
  user: User;
  accessToken: string;
  refreshToken: string;
}

/**
 * Single choke point for reading the persisted session.
 * Returns null on missing or corrupt data.
 */
export function loadSession(): PersistedSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw == null) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedSession>;
    if (
      parsed &&
      parsed.user != null &&
      typeof parsed.accessToken === 'string' &&
      typeof parsed.refreshToken === 'string'
    ) {
      return {
        user: parsed.user,
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSession(session: PersistedSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export type { AuthTokens, User };
