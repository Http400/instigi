import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SessionSummary } from '@instigi/types';
import HistoryPage from './HistoryPage';

const navigate = vi.fn();
vi.mock('react-router', () => ({
  useNavigate: () => navigate,
}));

const useGetHistoryQuery = vi.fn();
vi.mock('../../features/sessions/sessionsApi', () => ({
  useGetHistoryQuery: (...args: unknown[]) => useGetHistoryQuery(...args),
}));

const history: SessionSummary[] = [
  {
    id: 'sess-2',
    title: 'Leg day',
    endedAt: '2026-07-20T11:00:00.000Z',
    exerciseCount: 3,
  },
  {
    id: 'sess-1',
    title: 'Push day',
    endedAt: '2026-07-16T11:00:00.000Z',
    exerciseCount: 1,
  },
];

beforeEach(() => {
  useGetHistoryQuery.mockReset();
  navigate.mockReset();
});

describe('HistoryPage', () => {
  it('renders finished workouts in the order returned', () => {
    useGetHistoryQuery.mockReturnValue({
      data: history,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<HistoryPage />);

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Leg day');
    expect(items[0]).toHaveTextContent('3 exercises');
    expect(items[1]).toHaveTextContent('Push day');
    expect(items[1]).toHaveTextContent('1 exercise');
  });

  it('navigates to the read-only session when a row is clicked', () => {
    useGetHistoryQuery.mockReturnValue({
      data: history,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<HistoryPage />);

    fireEvent.click(screen.getByText('Leg day'));
    expect(navigate).toHaveBeenCalledWith('/workouts/sess-2');
  });

  it('shows the empty state when there are no finished workouts', () => {
    useGetHistoryQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<HistoryPage />);

    expect(screen.getByText('No finished workouts yet')).toBeInTheDocument();
  });

  it('renders the error state and retries', () => {
    const refetch = vi.fn();
    useGetHistoryQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });

    render(<HistoryPage />);

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
