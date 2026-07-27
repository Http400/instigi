import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import type { WorkoutSession } from '@instigi/types';
import WorkoutSummary from './WorkoutSummary';

const base: WorkoutSession = {
  id: 'sess-1',
  title: 'Leg day',
  startedAt: '2026-07-27T08:00:00.000Z',
  endedAt: '2026-07-27T09:23:00.000Z',
  exercises: [
    {
      id: 'se-1',
      sessionId: 'sess-1',
      exerciseDefinitionId: 'ex-squat',
      name: 'Squat',
      category: 'strength',
      metrics: [{ key: 'reps' }, { key: 'load' }],
      allowedEntryTypes: ['set'],
      defaultEntryType: 'set',
      position: 0,
      entries: [
        {
          id: 'entry-1',
          sessionExerciseId: 'se-1',
          position: 0,
          entryType: 'set',
          values: { reps: 8, load: 70 },
          isCompleted: true,
        },
        {
          id: 'entry-2',
          sessionExerciseId: 'se-1',
          position: 1,
          entryType: 'set',
          values: { reps: 8, load: 72 },
          isCompleted: true,
        },
      ],
    },
    {
      id: 'se-2',
      sessionId: 'sess-1',
      exerciseDefinitionId: 'ex-run',
      name: 'Running',
      category: 'cardio',
      metrics: [{ key: 'distance' }],
      allowedEntryTypes: ['single'],
      defaultEntryType: 'single',
      position: 1,
      entries: [
        {
          id: 'entry-3',
          sessionExerciseId: 'se-2',
          position: 0,
          entryType: 'single',
          values: { distance: 5000 },
          isCompleted: true,
        },
      ],
    },
  ],
};

describe('WorkoutSummary', () => {
  it('renders finished date, counts, and an Xh Ym duration', () => {
    render(<WorkoutSummary session={base} />);

    expect(screen.getByText(/^Finished /)).toBeInTheDocument();
    expect(
      screen.getByText('2 exercises · 3 sets · 1h 23m')
    ).toBeInTheDocument();
  });

  it('uses singular units and a sub-hour Ym duration', () => {
    const single: WorkoutSession = {
      ...base,
      startedAt: '2026-07-27T08:00:00.000Z',
      endedAt: '2026-07-27T08:45:00.000Z',
      exercises: [
        {
          ...base.exercises[0]!,
          entries: [base.exercises[0]!.entries[0]!],
        },
      ],
    };

    render(<WorkoutSummary session={single} />);

    expect(screen.getByText('1 exercise · 1 set · 45m')).toBeInTheDocument();
  });

  it('renders <1m for a zero-length session', () => {
    const instant: WorkoutSession = {
      ...base,
      startedAt: '2026-07-27T08:00:00.000Z',
      endedAt: '2026-07-27T08:00:30.000Z',
    };

    render(<WorkoutSummary session={instant} />);

    expect(screen.getByText(/· <1m$/)).toBeInTheDocument();
  });

  it('renders nothing when the session is not finished', () => {
    const { container } = render(
      <WorkoutSummary session={{ ...base, endedAt: null }} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
