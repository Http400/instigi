import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Exercise } from '@instigi/types';
import AddExerciseDialog from './AddExerciseDialog';

const useListExercisesQuery = vi.fn();
const addExercise = vi.fn();

vi.mock('../../features/exercises/exercisesApi', () => ({
  useListExercisesQuery: (...args: unknown[]) =>
    useListExercisesQuery(...args),
}));

vi.mock('../../features/sessions/sessionsApi', () => ({
  useAddSessionExerciseMutation: () => [addExercise, { isLoading: false }],
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
  metrics: [{ key: 'distance' }],
  allowedEntryTypes: ['single'],
  defaultEntryType: 'single',
  isPredefined: true,
};

beforeEach(() => {
  useListExercisesQuery.mockReset();
  addExercise.mockReset();
  addExercise.mockReturnValue({ unwrap: () => Promise.resolve({ id: 'se-x' }) });
});

describe('AddExerciseDialog', () => {
  it('lists the library exercises', () => {
    useListExercisesQuery.mockReturnValue({
      data: [benchPress, running],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<AddExerciseDialog sessionId="sess-1" open onClose={vi.fn()} />);

    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('adds an exercise with the right ids', async () => {
    useListExercisesQuery.mockReturnValue({
      data: [benchPress, running],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<AddExerciseDialog sessionId="sess-1" open onClose={vi.fn()} />);

    const addButtons = screen.getAllByRole('button', { name: 'Add' });
    fireEvent.click(addButtons[0]!);

    await waitFor(() =>
      expect(addExercise).toHaveBeenCalledWith({
        sessionId: 'sess-1',
        exerciseDefinitionId: 'ex-bench',
      })
    );
  });

  it('renders the empty state when no exercises match', () => {
    useListExercisesQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<AddExerciseDialog sessionId="sess-1" open onClose={vi.fn()} />);

    expect(screen.getByText(/no exercises found/i)).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    useListExercisesQuery.mockReturnValue({
      data: [benchPress],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(
      <AddExerciseDialog sessionId="sess-1" open={false} onClose={vi.fn()} />
    );

    expect(screen.queryByText('Bench Press')).toBeNull();
  });
});
