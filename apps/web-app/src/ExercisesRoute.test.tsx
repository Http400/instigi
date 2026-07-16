import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';

vi.mock('./features/exercises/exercisesApi', () => ({
  useListExercisesQuery: () => ({
    data: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { User } from '@instigi/types';
import { authReducer, type AuthState } from './features/auth/authSlice';
import { authApi } from './features/auth/authApi';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import ExercisesPage from './pages/ExercisesPage';

function makeStore(auth: AuthState) {
  return configureStore({
    reducer: {
      auth: authReducer,
      [authApi.reducerPath]: authApi.reducer,
    },
    middleware: (gDM) => gDM().concat(authApi.middleware),
    preloadedState: { auth },
  });
}

const user: User = {
  id: 'u1',
  email: 'ada@instigi.dev',
  name: 'Ada Lovelace',
  role: 'user',
  createdAt: new Date('2020-01-01T00:00:00.000Z'),
  updatedAt: new Date('2020-01-01T00:00:00.000Z'),
};

const authedState: AuthState = {
  user,
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  status: 'idle',
};

const anonState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  status: 'idle',
};

function renderAt(
  store: ReturnType<typeof makeStore>,
  initialEntry: string
) {
  const router = createMemoryRouter(
    [
      { path: '/auth', element: <div>Auth Page</div> },
      {
        Component: ProtectedRoute,
        children: [
          {
            Component: AppLayout,
            children: [{ path: '/exercises', Component: ExercisesPage }],
          },
        ],
      },
    ],
    { initialEntries: [initialEntry] }
  );
  return render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('Exercises route shell', () => {
  it('renders the sidebar shell for an authenticated user', () => {
    const store = makeStore(authedState);
    renderAt(store, '/exercises');

    expect(
      screen.getAllByRole('button', { name: /exercises/i }).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByRole('button', { name: /workouts/i }).length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
  });

  it('renders the mobile bottom navigation for an authenticated user', () => {
    const store = makeStore(authedState);
    renderAt(store, '/exercises');

    // "More" is unique to the bottom navigation (not in the sidebar list).
    expect(
      screen.getByRole('button', { name: /more/i })
    ).toBeInTheDocument();
    // Exercises appears in both the sidebar and the bottom nav.
    expect(
      screen.getAllByRole('button', { name: /exercises/i }).length
    ).toBeGreaterThanOrEqual(2);
  });

  it('redirects an unauthenticated user to /auth', () => {
    const store = makeStore(anonState);
    renderAt(store, '/exercises');

    expect(screen.getByText('Auth Page')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /workouts/i })
    ).not.toBeInTheDocument();
  });
});
