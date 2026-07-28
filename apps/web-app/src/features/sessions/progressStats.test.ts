import { describe, it, expect } from 'vitest';
import type { SessionSummary } from '@instigi/types';
import { computeProgressStats } from './progressStats';

const NOW = new Date('2026-07-28T12:00:00.000Z');

function workout(
  id: string,
  endedAt: string,
  exerciseCount: number
): SessionSummary {
  return { id, title: `Workout ${id}`, endedAt, exerciseCount };
}

describe('computeProgressStats', () => {
  it('sums totals across the whole history', () => {
    const history: SessionSummary[] = [
      workout('a', '2026-07-27T10:00:00.000Z', 3),
      workout('b', '2026-06-01T10:00:00.000Z', 2),
      workout('c', '2026-05-01T10:00:00.000Z', 5),
    ];

    const stats = computeProgressStats(history, NOW);

    expect(stats.totalWorkouts).toBe(3);
    expect(stats.totalExercises).toBe(10);
  });

  it('counts only workouts inside the 7-day window', () => {
    const history: SessionSummary[] = [
      workout('today', '2026-07-28T08:00:00.000Z', 1), // in
      workout('boundary', '2026-07-21T12:00:01.000Z', 1), // just inside 7d
      workout('eightDays', '2026-07-20T12:00:00.000Z', 1), // out (8 days)
      workout('future', '2026-07-29T12:00:00.000Z', 1), // out (future)
    ];

    const stats = computeProgressStats(history, NOW);

    expect(stats.last7Days).toBe(2);
  });

  it('returns recent workouts most-recent first, capped at 5', () => {
    const history: SessionSummary[] = [
      workout('1', '2026-07-01T10:00:00.000Z', 1),
      workout('2', '2026-07-02T10:00:00.000Z', 1),
      workout('3', '2026-07-03T10:00:00.000Z', 1),
      workout('4', '2026-07-04T10:00:00.000Z', 1),
      workout('5', '2026-07-05T10:00:00.000Z', 1),
      workout('6', '2026-07-06T10:00:00.000Z', 1),
    ];

    const stats = computeProgressStats(history, NOW);

    expect(stats.recent).toHaveLength(5);
    expect(stats.recent.map((w) => w.id)).toEqual(['6', '5', '4', '3', '2']);
  });

  it('does not mutate the input array', () => {
    const history: SessionSummary[] = [
      workout('1', '2026-07-01T10:00:00.000Z', 1),
      workout('2', '2026-07-05T10:00:00.000Z', 1),
    ];
    const snapshot = history.map((w) => w.id);

    computeProgressStats(history, NOW);

    expect(history.map((w) => w.id)).toEqual(snapshot);
  });

  it('returns zeros and an empty recent list for empty history', () => {
    const stats = computeProgressStats([], NOW);

    expect(stats).toEqual({
      totalWorkouts: 0,
      last7Days: 0,
      totalExercises: 0,
      recent: [],
    });
  });
});
