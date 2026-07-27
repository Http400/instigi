import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WorkoutSession } from '@instigi/types';
import SessionPage from './SessionPage';

vi.mock('react-router', () => ({
  useParams: () => ({ sessionId: 'sess-1' }),
}));

const useGetSessionQuery = vi.fn();
const updateSession = vi.fn();
const removeExercise = vi.fn();

vi.mock('../../features/sessions/sessionsApi', () => ({
  useGetSessionQuery: (...args: unknown[]) => useGetSessionQuery(...args),
  useUpdateSessionMutation: () => [updateSession, { isLoading: false }],
  useRemoveSessionExerciseMutation: () => [removeExercise, { isLoading: false }],
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
    },
  ],
};

beforeEach(() => {
  useGetSessionQuery.mockReset();
  updateSession.mockReset();
  removeExercise.mockReset();
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
});
