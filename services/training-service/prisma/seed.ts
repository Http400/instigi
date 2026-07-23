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
 * context/foundation/data-model.md. Stable UUID ids keep the seed idempotent
 * and match the uuid format the API validates on write.
 */
const PREDEFINED_EXERCISES: SeedExercise[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
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
    id: '22222222-2222-4222-8222-222222222222',
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
    id: '33333333-3333-4333-8333-333333333333',
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
    id: '44444444-4444-4444-8444-444444444444',
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
    id: '55555555-5555-4555-8555-555555555555',
    name: 'Plank',
    category: 'strength',
    metrics: [{ key: 'duration', required: true }],
    allowedEntryTypes: ['set'],
    defaultEntryType: 'set',
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
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
    id: '77777777-7777-4777-8777-777777777777',
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
    id: '88888888-8888-4888-8888-888888888888',
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
    // Clear existing global (predefined) definitions so re-seeding with new ids
    // never leaves stale rows. userId IS NULL means user-created exercises are
    // untouched; session_exercises keep their snapshots (exerciseDefinitionId is
    // a soft ref, no FK).
    await prisma.exerciseDefinition.deleteMany({ where: { userId: null } });

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
