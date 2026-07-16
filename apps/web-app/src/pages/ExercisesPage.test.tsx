import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Exercise } from '@instigi/types';
import ExercisesPage from './ExercisesPage';

const useListExercisesQuery = vi.fn();

vi.mock('../features/exercises/exercisesApi', () => ({
  useListExercisesQuery: (...args: unknown[]) =>
    useListExercisesQuery(...args),
}));

const benchPress: Exercise = {
  id: 'ex-bench',
  name: 'Bench Press',
  category: 'strength',
  metrics: [{ key: 'reps' }, { key: 'load' }],
  allowedEntryTypes: ['set'],
  defaultEntryType: 'set',
  isPredefined: true,
};

const running: Exercise = {
  id: 'ex-run',
  name: 'Running',
  category: 'cardio',
  metrics: [{ key: 'distance' }, { key: 'duration' }],
  allowedEntryTypes: ['single'],
  defaultEntryType: 'single',
  isPredefined: true,
};

beforeEach(() => {
  useListExercisesQuery.mockReset();
});

describe('ExercisesPage', () => {
  it('renders the loading state while fetching', () => {
    useListExercisesQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });

    render(<ExercisesPage />);

    expect(
      screen.getByPlaceholderText(/search exercises/i)
    ).toBeInTheDocument();
    expect(screen.queryByText('Bench Press')).not.toBeInTheDocument();
  });

  it('renders the table with data and count footer', () => {
    useListExercisesQuery.mockReturnValue({
      data: [benchPress, running],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<ExercisesPage />);

    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Reps, Weight')).toBeInTheDocument();
    expect(screen.getByText('2 exercises')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('renders the empty state when there are no exercises', () => {
    useListExercisesQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<ExercisesPage />);

    expect(screen.getByText('0 exercises')).toBeInTheDocument();
    expect(screen.queryByText('Bench Press')).not.toBeInTheDocument();
  });

  it('renders the error state and retries on click', async () => {
    const refetch = vi.fn();
    useListExercisesQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });

    render(<ExercisesPage />);

    const retry = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retry);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('debounces the search term before passing it to the query', async () => {
    useListExercisesQuery.mockReturnValue({
      data: [benchPress],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<ExercisesPage />);

    // Initial render queries with no search term.
    expect(useListExercisesQuery).toHaveBeenCalledWith({});

    fireEvent.change(screen.getByPlaceholderText(/search exercises/i), {
      target: { value: 'bench' },
    });

    await waitFor(() =>
      expect(useListExercisesQuery).toHaveBeenLastCalledWith({
        search: 'bench',
      })
    );
  });

  it('passes the selected category to the query', async () => {
    useListExercisesQuery.mockReturnValue({
      data: [running],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<ExercisesPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Cardio' }));

    await waitFor(() =>
      expect(useListExercisesQuery).toHaveBeenLastCalledWith({
        category: 'cardio',
      })
    );
  });
});
