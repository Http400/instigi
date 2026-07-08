import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '../features/auth/authSlice';
import { authApi } from '../features/auth/authApi';
import AuthPage from './AuthPage';

function makeStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      [authApi.reducerPath]: authApi.reducer,
    },
    middleware: (gDM) => gDM().concat(authApi.middleware),
  });
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const user = {
  id: 'u1',
  email: 'a@b.com',
  name: 'Ada',
  role: 'user',
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
};
const tokens = { accessToken: 'access-1', refreshToken: 'refresh-1' };

function renderAuthPage(store: ReturnType<typeof makeStore>) {
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    </Provider>
  );
}

function submitLogin() {
  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: { value: 'a@b.com' },
  });
  fireEvent.change(screen.getByLabelText(/^password/i), {
    target: { value: 'password123' },
  });
  fireEvent.click(screen.getByRole('button', { name: /log in/i }));
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AuthPage', () => {
  it('drives the store to authenticated on successful login', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ data: { user, tokens } }, 200))
    );
    const store = makeStore();
    renderAuthPage(store);

    submitLogin();

    await waitFor(() => {
      expect(store.getState().auth.accessToken).toBe('access-1');
    });
    expect(store.getState().auth.user?.id).toBe('u1');
  });

  it('renders the friendly message on 401 INVALID_CREDENTIALS', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            message: 'Invalid credentials',
            code: 'INVALID_CREDENTIALS',
            statusCode: 401,
          },
          401
        )
      )
    );
    const store = makeStore();
    renderAuthPage(store);

    submitLogin();

    expect(
      await screen.findByText(/incorrect email or password\./i)
    ).toBeInTheDocument();
    expect(store.getState().auth.accessToken).toBeNull();
  });
});
