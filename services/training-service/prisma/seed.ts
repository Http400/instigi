import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import type { Prisma } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import type { EntryType, ExerciseCategory, ExerciseMetric } from '@instigi/types';

interface SeedExercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  metrics: ExerciseMetric[];
  allowedEntryTypes: EntryType[];
  defaultEntryType: EntryType;
}

/**
 * Predefined, global exercise library (userId = null) from
 * context/foundation/data-model.md. Stable ids keep the upsert idempotent
 * regardless of Postgres NULL-in-unique semantics.
 */
const PREDEFINED_EXERCISES: SeedExercise[] = [
  {
    id: 'seed-bench-press',
    name: 'Bench Press',
    category: 'strength',
    metrics: [
      { key: 'reps', required: true },
      { key: 'load', required: true },
    ],
    allowedEntryTypes: ['set'],
    defaultEntryType: 'set',
  },
  {
    id: 'seed-squat',
    name: 'Squat',
    category: 'strength',
    metrics: [
      { key: 'reps', required: true },
      { key: 'load', required: true },
    ],
    allowedEntryTypes: ['set'],
    defaultEntryType: 'set',
  },
  {
    id: 'seed-deadlift',
    name: 'Deadlift',
    category: 'strength',
    metrics: [
      { key: 'reps', required: true },
      { key: 'load', required: true },
    ],
    allowedEntryTypes: ['set'],
    defaultEntryType: 'set',
  },
  {
    id: 'seed-pull-up',
    name: 'Pull-up',
    category: 'strength',
    metrics: [
      { key: 'reps', required: true },
      { key: 'load', required: false },
    ],
    allowedEntryTypes: ['set'],
    defaultEntryType: 'set',
  },
  {
    id: 'seed-plank',
    name: 'Plank',
    category: 'strength',
    metrics: [{ key: 'duration', required: true }],
    allowedEntryTypes: ['set'],
    defaultEntryType: 'set',
  },
  {
    id: 'seed-running',
    name: 'Running',
    category: 'cardio',
    metrics: [
      { key: 'distance', required: true },
      { key: 'duration', required: true },
    ],
    allowedEntryTypes: ['single', 'interval'],
    defaultEntryType: 'single',
  },
  {
    id: 'seed-cycling',
    name: 'Cycling',
    category: 'cardio',
    metrics: [
      { key: 'distance', required: true },
      { key: 'duration', required: true },
    ],
    allowedEntryTypes: ['single', 'interval'],
    defaultEntryType: 'single',
  },
  {
    id: 'seed-swimming',
    name: 'Swimming',
    category: 'cardio',
    metrics: [
      { key: 'distance', required: true },
      { key: 'duration', required: true },
    ],
    allowedEntryTypes: ['lap', 'interval', 'single'],
    defaultEntryType: 'lap',
  },
];

async function main(): Promise<void> {
  const connectionString =
    process.env['DATABASE_URL'] ?? 'postgresql://localhost:5432/instigi_db';
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    for (const exercise of PREDEFINED_EXERCISES) {
      const data = {
        userId: null,
        name: exercise.name,
        category: exercise.category,
        metrics: exercise.metrics as unknown as Prisma.InputJsonValue,
        allowedEntryTypes:
          exercise.allowedEntryTypes as unknown as Prisma.InputJsonValue,
        defaultEntryType: exercise.defaultEntryType,
        isArchived: false,
      };
      await prisma.exerciseDefinition.upsert({
        where: { id: exercise.id },
        update: data,
        create: { id: exercise.id, ...data },
      });
    }
    console.log(`Seeded ${PREDEFINED_EXERCISES.length} predefined exercises.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
