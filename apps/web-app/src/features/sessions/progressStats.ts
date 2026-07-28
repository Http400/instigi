import type { SessionSummary } from '@instigi/types';

export interface ProgressStats {
  totalWorkouts: number;
  last7Days: number;
  totalExercises: number;
  /** Up to 5 finished workouts, most-recent first. */
  recent: SessionSummary[];
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const RECENT_LIMIT = 5;

/**
 * Derive dashboard stats from the finished-workout history. `now` is injected so
 * the 7-day window is deterministic in tests. The input array is never mutated.
 */
export function computeProgressStats(
  history: SessionSummary[],
  now: Date
): ProgressStats {
  const nowMs = now.getTime();

  let last7Days = 0;
  let totalExercises = 0;

  for (const workout of history) {
    totalExercises += workout.exerciseCount;

    const endedMs = new Date(workout.endedAt).getTime();
    if (Number.isNaN(endedMs)) {
      continue;
    }
    const age = nowMs - endedMs;
    if (age >= 0 && age < SEVEN_DAYS_MS) {
      last7Days += 1;
    }
  }

  const recent = [...history]
    .sort(
      (a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime()
    )
    .slice(0, RECENT_LIMIT);

  return {
    totalWorkouts: history.length,
    last7Days,
    totalExercises,
    recent,
  };
}
