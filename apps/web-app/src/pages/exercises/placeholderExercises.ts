export type ExerciseCategory =
  | 'Strength'
  | 'Cardio'
  | 'Swimming'
  | 'Mobility'
  | 'Custom';

export interface PlaceholderExercise {
  name: string;
  category: ExerciseCategory;
  metrics: string[];
  /** Icon hint used by the table to pick a leading glyph. */
  icon: 'strength' | 'cardio' | 'swimming' | 'mobility' | 'custom';
}

export const PLACEHOLDER_EXERCISES: PlaceholderExercise[] = [
  {
    name: 'Bench Press',
    category: 'Strength',
    metrics: ['Reps', 'Load'],
    icon: 'strength',
  },
  {
    name: 'Running',
    category: 'Cardio',
    metrics: ['Distance', 'Duration'],
    icon: 'cardio',
  },
  {
    name: 'Freestyle Swimming',
    category: 'Swimming',
    metrics: ['Distance', 'Duration'],
    icon: 'swimming',
  },
  {
    name: 'Plank',
    category: 'Mobility',
    metrics: ['Duration'],
    icon: 'mobility',
  },
  {
    name: 'Pull-ups',
    category: 'Strength',
    metrics: ['Reps'],
    icon: 'strength',
  },
];
