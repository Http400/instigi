import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WorkoutSession } from '@instigi/types';
import SessionPage from './SessionPage';

vi.mock('react-router', () => ({
  useParams: () => ({ sessionId: 'sess-1' }),
  useNavigate: () => navigate,
}));

const useGetSessionQuery = vi.fn();
const updateSession = vi.fn();
const removeExercise = vi.fn();
const navigate = vi.fn();
const logSet = vi.fn();
const updateSet = vi.fn();
const deleteSet = vi.fn();
const finishSession = vi.fn();

vi.mock('../../features/sessions/sessionsApi', () => ({
  useGetSessionQuery: (...args: unknown[]) => useGetSessionQuery(...args),
  useUpdateSessionMutation: () => [updateSession, { isLoading: false }],
  useRemoveSessionExerciseMutation: () => [removeExercise, { isLoading: false }],
  useLogSetMutation: () => [logSet, { isLoading: false }],
  useUpdateSetMutation: () => [updateSet, { isLoading: false }],
  useDeleteSetMutation: () => [deleteSet, { isLoading: false }],
  useFinishSessionMutation: () => [finishSession, { isLoading: false }],
}));

vi.mock('./AddExerciseDialog', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div>Add exercise dialog</div> : null,
}));

const session: WorkoutSession = {
  id: 'sess-1',
  title: 'Leg day',
  startedAt: '2026-07-27T08:00:00.000Z',
  endedAt: null,
  exercises: [
    {
      id: 'se-2',
      sessionId: 'sess-1',
      exerciseDefinitionId: 'ex-squat',
      name: 'Squat',
      category: 'strength',
      metrics: [{ key: 'reps' }, { key: 'load' }],
      allowedEntryTypes: ['set'],
      defaultEntryType: 'set',
      position: 1,
      entries: [],
    },
    {
      id: 'se-1',
      sessionId: 'sess-1',
      exerciseDefinitionId: 'ex-run',
      name: 'Running',
      category: 'cardio',
      metrics: [{ key: 'distance' }],
      allowedEntryTypes: ['single'],
      defaultEntryType: 'single',
      position: 0,
      entries: [],
    },
  ],
};

const sessionWithSet: WorkoutSession = {
  ...session,
  exercises: session.exercises.map((exercise) =>
    exercise.id === 'se-2'
      ? {
          ...exercise,
          entries: [
            {
              id: 'entry-1',
              sessionExerciseId: 'se-2',
              position: 0,
              entryType: 'set',
              values: { reps: 8, load: 70 },
              isCompleted: true,
            },
          ],
        }
      : exercise
  ),
};

beforeEach(() => {
  useGetSessionQuery.mockReset();
  updateSession.mockReset();
  removeExercise.mockReset();
  navigate.mockReset();
  logSet.mockReset();
  updateSet.mockReset();
  deleteSet.mockReset();
  finishSession.mockReset();
  logSet.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  updateSet.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  finishSession.mockReturnValue({ unwrap: () => Promise.resolve({}) });
});

describe('SessionPage', () => {
  it('renders the title and exercises ordered by position', () => {
    useGetSessionQuery.mockReturnValue({
      data: session,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<SessionPage />);

    expect(screen.getByLabelText('Session title')).toHaveValue('Leg day');
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Running');
    expect(items[1]).toHaveTextContent('Squat');
  });

  it('renders the empty state when there are no exercises', () => {
    useGetSessionQuery.mockReturnValue({
      data: { ...session, exercises: [] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<SessionPage />);

    expect(screen.getByText('No exercises yet')).toBeInTheDocument();
  });

  it('removes an exercise via the mutation', () => {
    useGetSessionQuery.mockReturnValue({
      data: session,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<SessionPage />);

    fireEvent.click(screen.getByRole('button', { name: /remove running/i }));
    expect(removeExercise).toHaveBeenCalledWith({
      sessionId: 'sess-1',
      sessionExerciseId: 'se-1',
    });
  });

  it('commits a title change on blur', async () => {
    useGetSessionQuery.mockReturnValue({
      data: session,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<SessionPage />);

    const input = screen.getByLabelText('Session title');
    fireEvent.change(input, { target: { value: 'Upper body' } });
    fireEvent.blur(input);

    await waitFor(() =>
      expect(updateSession).toHaveBeenCalledWith({
        id: 'sess-1',
        title: 'Upper body',
      })
    );
  });

  it('opens the add-exercise dialog', () => {
    useGetSessionQuery.mockReturnValue({
      data: session,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<SessionPage />);

    expect(screen.queryByText('Add exercise dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /add exercise/i }));
    expect(screen.getByText('Add exercise dialog')).toBeInTheDocument();
  });

  it('logs a set with parsed metric values', () => {
    useGetSessionQuery.mockReturnValue({
      data: session,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<SessionPage />);

    fireEvent.change(screen.getByLabelText('Reps for Squat'), {
      target: { value: '8' },
    });
    fireEvent.change(screen.getByLabelText('Weight for Squat'), {
      target: { value: '70' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add set to Squat' }));

    expect(logSet).toHaveBeenCalledWith({
      sessionId: 'sess-1',
      sessionExerciseId: 'se-2',
      values: { reps: 8, load: 70 },
    });
  });

  it('parses a duration input into seconds when logging', () => {
    const durationSession: WorkoutSession = {
      ...session,
      exercises: [
        {
          id: 'se-3',
          sessionId: 'sess-1',
          exerciseDefinitionId: 'ex-plank',
          name: 'Plank',
          category: 'strength',
          metrics: [{ key: 'duration' }],
          allowedEntryTypes: ['single'],
          defaultEntryType: 'single',
          position: 0,
          entries: [],
        },
      ],
    };
    useGetSessionQuery.mockReturnValue({
      data: durationSession,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<SessionPage />);

    fireEvent.change(screen.getByLabelText('Duration for Plank'), {
      target: { value: '1:30' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add set to Plank' }));

    expect(logSet).toHaveBeenCalledWith({
      sessionId: 'sess-1',
      sessionExerciseId: 'se-3',
      values: { duration: 90 },
    });
  });

  it('disables Finish workout until at least one set is logged', () => {
    useGetSessionQuery.mockReturnValue({
      data: session,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<SessionPage />);

    expect(
      screen.getByRole('button', { name: 'Finish workout' })
    ).toBeDisabled();
  });

  it('enables Finish workout when a set exists', () => {
    useGetSessionQuery.mockReturnValue({
      data: sessionWithSet,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<SessionPage />);

    expect(
      screen.getByRole('button', { name: 'Finish workout' })
    ).toBeEnabled();
  });

  it('finishes the session and navigates on confirm', async () => {
    useGetSessionQuery.mockReturnValue({
      data: sessionWithSet,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<SessionPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Finish workout' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

    expect(finishSession).toHaveBeenCalledWith({ id: 'sess-1' });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/workouts'));
  });

  it('deletes a logged set via the mutation', () => {
    useGetSessionQuery.mockReturnValue({
      data: sessionWithSet,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<SessionPage />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Delete set 1 of Squat' })
    );

    expect(deleteSet).toHaveBeenCalledWith({
      sessionId: 'sess-1',
      sessionExerciseId: 'se-2',
      entryId: 'entry-1',
    });
  });

  it('hides mutating controls when the session is finished', () => {
    useGetSessionQuery.mockReturnValue({
      data: {
        ...sessionWithSet,
        endedAt: '2026-07-27T09:00:00.000Z',
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<SessionPage />);

    expect(screen.queryByRole('button', { name: /add exercise/i })).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Finish workout' })
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Add set to Squat' })
    ).toBeNull();
    expect(screen.getByLabelText('Session title')).toBeDisabled();
  });
});
