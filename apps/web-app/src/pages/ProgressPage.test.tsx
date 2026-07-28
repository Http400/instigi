import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SessionSummary } from '@instigi/types';
import ProgressPage from './ProgressPage';

const navigate = vi.fn();
vi.mock('react-router', () => ({
  useNavigate: () => navigate,
}));

const useGetHistoryQuery = vi.fn();
vi.mock('../features/sessions/sessionsApi', () => ({
  useGetHistoryQuery: (...args: unknown[]) => useGetHistoryQuery(...args),
}));

function workout(
  id: string,
  endedAt: string,
  exerciseCount: number
): SessionSummary {
  return { id, title: `Workout ${id}`, endedAt, exerciseCount };
}

const history: SessionSummary[] = [
  workout('a', '2026-07-20T11:00:00.000Z', 3),
  workout('b', '2026-07-16T11:00:00.000Z', 2),
];

beforeEach(() => {
  useGetHistoryQuery.mockReset();
  navigate.mockReset();
});

describe('ProgressPage', () => {
  it('renders stat cards derived from history', () => {
    useGetHistoryQuery.mockReturnValue({
      data: history,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<ProgressPage />);

    expect(screen.getByText('Total workouts')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // total workouts
    expect(screen.getByText('5')).toBeInTheDocument(); // total exercises
  });

  it('renders recent rows and navigates to a workout detail on click', () => {
    useGetHistoryQuery.mockReturnValue({
      data: history,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<ProgressPage />);

    fireEvent.click(screen.getByText('Workout a'));
    expect(navigate).toHaveBeenCalledWith('/workouts/a');
  });

  it('navigates to full history from the view-all link', () => {
    useGetHistoryQuery.mockReturnValue({
      data: history,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<ProgressPage />);

    fireEvent.click(screen.getByRole('button', { name: /view all history/i }));
    expect(navigate).toHaveBeenCalledWith('/workouts/history');
  });

  it('shows the empty state and starts a workout', () => {
    useGetHistoryQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<ProgressPage />);

    expect(screen.getByText('No workouts yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /start a workout/i }));
    expect(navigate).toHaveBeenCalledWith('/workouts');
  });

  it('renders the loading state', () => {
    useGetHistoryQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });

    render(<ProgressPage />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders the error state and retries', () => {
    const refetch = vi.fn();
    useGetHistoryQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });

    render(<ProgressPage />);

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
