import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WorkoutSession } from '@instigi/types';
import WorkoutsPage from './WorkoutsPage';

const navigate = vi.fn();
vi.mock('react-router', () => ({
  useNavigate: () => navigate,
}));

const useGetActiveSessionQuery = vi.fn();
const createSession = vi.fn();
const useCreateSessionMutation = vi.fn();

vi.mock('../features/sessions/sessionsApi', () => ({
  useGetActiveSessionQuery: (...args: unknown[]) =>
    useGetActiveSessionQuery(...args),
  useCreateSessionMutation: (...args: unknown[]) =>
    useCreateSessionMutation(...args),
}));

const activeSession: WorkoutSession = {
  id: 'sess-1',
  title: 'Morning workout',
  startedAt: '2026-07-27T08:00:00.000Z',
  endedAt: null,
  exercises: [
    {
      id: 'se-1',
      sessionId: 'sess-1',
      exerciseDefinitionId: 'ex-bench',
      name: 'Bench Press',
      category: 'strength',
      metrics: [{ key: 'reps' }],
      allowedEntryTypes: ['set'],
      defaultEntryType: 'set',
      position: 0,
      entries: [],
    },
  ],
};

beforeEach(() => {
  useGetActiveSessionQuery.mockReset();
  createSession.mockReset();
  useCreateSessionMutation.mockReset();
  navigate.mockReset();
  useCreateSessionMutation.mockReturnValue([createSession, { isLoading: false }]);
});

describe('WorkoutsPage', () => {
  it('renders the loading state while checking for an active session', () => {
    useGetActiveSessionQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });

    render(<WorkoutsPage />);

    expect(screen.queryByRole('button', { name: /start workout/i })).toBeNull();
  });

  it('shows the start button and creates a session when none is active', async () => {
    useGetActiveSessionQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    createSession.mockReturnValue({
      unwrap: () => Promise.resolve({ ...activeSession, id: 'new-sess' }),
    });

    render(<WorkoutsPage />);

    fireEvent.click(screen.getByRole('button', { name: /start workout/i }));

    await waitFor(() => expect(createSession).toHaveBeenCalledWith({}));
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('/workouts/new-sess')
    );
  });

  it('shows the active session and continues to it', () => {
    useGetActiveSessionQuery.mockReturnValue({
      data: activeSession,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<WorkoutsPage />);

    expect(screen.getByText('Morning workout')).toBeInTheDocument();
    expect(screen.getByText('1 exercise')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(navigate).toHaveBeenCalledWith('/workouts/sess-1');
  });

  it('renders the error state and retries', () => {
    const refetch = vi.fn();
    useGetActiveSessionQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });

    render(<WorkoutsPage />);

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('navigates to history via the View history link', () => {
    useGetActiveSessionQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<WorkoutsPage />);

    fireEvent.click(screen.getByRole('button', { name: /view history/i }));
    expect(navigate).toHaveBeenCalledWith('/workouts/history');
  });
});
