import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthTokens, User } from '@instigi/types';
import { clearSession, loadSession, saveSession } from './authStorage';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  status: 'idle' | 'loading';
}

function createInitialState(): AuthState {
  const session = loadSession();
  if (session) {
    return {
      user: session.user,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      status: 'idle',
    };
  }
  return {
    user: null,
    accessToken: null,
    refreshToken: null,
    status: 'idle',
  };
}

const authSlice = createSlice({
  name: 'auth',
  initialState: createInitialState(),
  reducers: {
    credentialsReceived(
      state,
      action: PayloadAction<{ user: User; tokens: AuthTokens }>
    ) {
      const { user, tokens } = action.payload;
      state.user = user;
      state.accessToken = tokens.accessToken;
      state.refreshToken = tokens.refreshToken;
      state.status = 'idle';
      saveSession({
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    },
    tokensRefreshed(state, action: PayloadAction<AuthTokens>) {
      const tokens = action.payload;
      state.accessToken = tokens.accessToken;
      state.refreshToken = tokens.refreshToken;
      if (state.user) {
        saveSession({
          user: state.user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });
      }
    },
    loggedOut(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.status = 'idle';
      clearSession();
    },
  },
});

export const { credentialsReceived, tokensRefreshed, loggedOut } =
  authSlice.actions;

export const authReducer = authSlice.reducer;

interface HasAuthState {
  auth: AuthState;
}

export const selectIsAuthenticated = (state: HasAuthState): boolean =>
  state.auth.accessToken != null;

export const selectCurrentUser = (state: HasAuthState): User | null =>
  state.auth.user;
