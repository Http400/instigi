import { z } from 'zod';
import type { Response } from 'express';
import type { AuthRequest } from '@instigi/utils';
import type {
  WorkoutSession,
  SessionExercise,
  ExerciseCategory,
  EntryType,
  ExerciseMetric,
  ExerciseEntry,
  ExerciseEntryValues,
} from '@instigi/types';
import { prisma } from '../db.js';
import type { Prisma } from '../generated/prisma/client.js';

const createSessionSchema = z.object({
  title: z.string().trim().max(160).optional(),
});

const updateSessionSchema = z.object({
  title: z.string().trim().min(1).max(160),
});

const addExerciseSchema = z.object({
  exerciseDefinitionId: z.string().uuid(),
});

const entryTypeSchema = z.enum(['set', 'single', 'lap', 'interval']);

const metricValuesSchema = z.object({
  reps: z.number().nonnegative().optional(),
  load: z.number().nonnegative().optional(),
  distance: z.number().nonnegative().optional(),
  duration: z.number().nonnegative().optional(),
});

const logSetSchema = z.object({
  entryType: entryTypeSchema.optional(),
  values: metricValuesSchema,
});

const updateSetSchema = z.object({
  values: metricValuesSchema,
});

interface EntryRow {
  id: string;
  sessionExerciseId: string;
  entryType: string;
  values: unknown;
  isCompleted: boolean;
  position: number;
}

interface SessionExerciseRow {
  id: string;
  sessionId: string;
  exerciseDefinitionId: string | null;
  exerciseNameSnapshot: string;
  categorySnapshot: string;
  metricsSnapshot: unknown;
  allowedEntryTypesSnapshot: unknown;
  defaultEntryTypeSnapshot: string;
  position: number;
  entries: EntryRow[];
}

interface SessionRow {
  id: string;
  title: string | null;
  startedAt: Date;
  endedAt: Date | null;
  exercises: SessionExerciseRow[];
}

function toEntryDto(row: EntryRow): ExerciseEntry {
  return {
    id: row.id,
    sessionExerciseId: row.sessionExerciseId,
    entryType: row.entryType as EntryType,
    values: (row.values ?? {}) as ExerciseEntryValues,
    isCompleted: row.isCompleted,
    position: row.position,
  };
}

function toSessionExerciseDto(row: SessionExerciseRow): SessionExercise {
  return {
    id: row.id,
    sessionId: row.sessionId,
    exerciseDefinitionId: row.exerciseDefinitionId,
    name: row.exerciseNameSnapshot,
    category: row.categorySnapshot as ExerciseCategory,
    metrics: row.metricsSnapshot as ExerciseMetric[],
    allowedEntryTypes: row.allowedEntryTypesSnapshot as EntryType[],
    defaultEntryType: row.defaultEntryTypeSnapshot as EntryType,
    entries: row.entries.map(toEntryDto),
    position: row.position,
  };
}

function toSessionDto(row: SessionRow): WorkoutSession {
  return {
    id: row.id,
    title: row.title ?? '',
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    exercises: row.exercises.map(toSessionExerciseDto),
  };
}

function defaultTitle(date: Date): string {
  const label = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
  return `${label} workout`;
}

const exercisesInclude = {
  exercises: {
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    include: {
      entries: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] },
    },
  },
} satisfies Prisma.WorkoutSessionInclude;

export async function createSession(req: AuthRequest, res: Response): Promise<void> {
  const result = createSessionSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ message: 'Invalid session', code: 'VALIDATION_ERROR', statusCode: 400 });
    return;
  }

  const userId = req.user!.userId;

  const active = await prisma.workoutSession.findFirst({
    where: { userId, endedAt: null },
    select: { id: true },
  });
  if (active) {
    res.status(409).json({
      message: 'An active session already exists',
      code: 'ACTIVE_SESSION_EXISTS',
      statusCode: 409,
    });
    return;
  }

  const now = new Date();
  const session = await prisma.workoutSession.create({
    data: {
      userId,
      title: result.data.title ?? defaultTitle(now),
      startedAt: now,
    },
    include: exercisesInclude,
  });

  res.status(201).json({ data: toSessionDto(session) });
}

export async function getActiveSession(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;

  const session = await prisma.workoutSession.findFirst({
    where: { userId, endedAt: null },
    include: exercisesInclude,
  });

  res.json({ data: session ? toSessionDto(session) : null });
}

export async function getSession(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const id = req.params['id'] as string;

  const session = await prisma.workoutSession.findFirst({
    where: { id, userId },
    include: exercisesInclude,
  });
  if (!session) {
    res.status(404).json({ message: 'Session not found', code: 'NOT_FOUND', statusCode: 404 });
    return;
  }

  res.json({ data: toSessionDto(session) });
}

export async function updateSession(req: AuthRequest, res: Response): Promise<void> {
  const result = updateSessionSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ message: 'Invalid session', code: 'VALIDATION_ERROR', statusCode: 400 });
    return;
  }

  const userId = req.user!.userId;
  const id = req.params['id'] as string;

  const existing = await prisma.workoutSession.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) {
    res.status(404).json({ message: 'Session not found', code: 'NOT_FOUND', statusCode: 404 });
    return;
  }

  const session = await prisma.workoutSession.update({
    where: { id },
    data: { title: result.data.title },
    include: exercisesInclude,
  });

  res.json({ data: toSessionDto(session) });
}

export async function addSessionExercise(req: AuthRequest, res: Response): Promise<void> {
  const result = addExerciseSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ message: 'Invalid exercise', code: 'VALIDATION_ERROR', statusCode: 400 });
    return;
  }

  const userId = req.user!.userId;
  const id = req.params['id'] as string;

  const session = await prisma.workoutSession.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!session) {
    res.status(404).json({ message: 'Session not found', code: 'NOT_FOUND', statusCode: 404 });
    return;
  }

  const ownership: Prisma.ExerciseDefinitionWhereInput[] = [{ userId: null }, { userId }];
  const definition = await prisma.exerciseDefinition.findFirst({
    where: {
      id: result.data.exerciseDefinitionId,
      isArchived: false,
      OR: ownership,
    },
  });
  if (!definition) {
    res.status(404).json({
      message: 'Exercise not found',
      code: 'EXERCISE_NOT_FOUND',
      statusCode: 404,
    });
    return;
  }

  const last = await prisma.sessionExercise.findFirst({
    where: { sessionId: id },
    orderBy: { position: 'desc' },
    select: { position: true },
  });
  const position = (last?.position ?? 0) + 1;

  const created = await prisma.sessionExercise.create({
    data: {
      sessionId: id,
      exerciseDefinitionId: definition.id,
      exerciseNameSnapshot: definition.name,
      categorySnapshot: definition.category,
      metricsSnapshot: definition.metrics as Prisma.InputJsonValue,
      allowedEntryTypesSnapshot: definition.allowedEntryTypes as Prisma.InputJsonValue,
      defaultEntryTypeSnapshot: definition.defaultEntryType,
      position,
    },
    include: { entries: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] } },
  });

  res.status(201).json({ data: toSessionExerciseDto(created) });
}

export async function removeSessionExercise(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const id = req.params['id'] as string;
  const sessionExerciseId = req.params['sessionExerciseId'] as string;

  const row = await prisma.sessionExercise.findFirst({
    where: { id: sessionExerciseId, session: { id, userId } },
    select: { id: true },
  });
  if (!row) {
    res.status(404).json({
      message: 'Session exercise not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    });
    return;
  }

  await prisma.sessionExercise.delete({ where: { id: sessionExerciseId } });

  res.json({ data: { id: sessionExerciseId } });
}

/** Verify metric values against an exercise's snapshot: no unexpected keys, all required present & positive. */
function validateEntryValues(values: ExerciseEntryValues, metrics: ExerciseMetric[]): boolean {
  const allowed = new Set(metrics.map((m) => m.key));
  for (const key of Object.keys(values)) {
    if (!allowed.has(key as ExerciseMetric['key'])) {
      return false;
    }
  }
  for (const metric of metrics) {
    if (metric.required === false) {
      continue;
    }
    const value = values[metric.key];
    if (value === undefined || value <= 0) {
      return false;
    }
  }
  return true;
}

interface WritableSessionExercise {
  metricsSnapshot: unknown;
  defaultEntryTypeSnapshot: string;
  allowedEntryTypesSnapshot: unknown;
}

/**
 * Resolve an owned, still-active session and one of its exercises for a set write.
 * Responds with the appropriate error and returns null when any check fails.
 */
async function resolveWritableExercise(
  req: AuthRequest,
  res: Response,
): Promise<WritableSessionExercise | null> {
  const userId = req.user!.userId;
  const id = req.params['id'] as string;
  const sessionExerciseId = req.params['sessionExerciseId'] as string;

  const session = await prisma.workoutSession.findFirst({
    where: { id, userId },
    select: { id: true, endedAt: true },
  });
  if (!session) {
    res.status(404).json({ message: 'Session not found', code: 'NOT_FOUND', statusCode: 404 });
    return null;
  }
  if (session.endedAt !== null) {
    res.status(409).json({
      message: 'Session is finished',
      code: 'SESSION_FINISHED',
      statusCode: 409,
    });
    return null;
  }

  const exercise = await prisma.sessionExercise.findFirst({
    where: { id: sessionExerciseId, sessionId: id },
    select: {
      metricsSnapshot: true,
      defaultEntryTypeSnapshot: true,
      allowedEntryTypesSnapshot: true,
    },
  });
  if (!exercise) {
    res.status(404).json({
      message: 'Session exercise not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    });
    return null;
  }

  return exercise;
}

export async function logSet(req: AuthRequest, res: Response): Promise<void> {
  const result = logSetSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ message: 'Invalid set', code: 'VALIDATION_ERROR', statusCode: 400 });
    return;
  }

  const exercise = await resolveWritableExercise(req, res);
  if (!exercise) {
    return;
  }

  const metrics = exercise.metricsSnapshot as ExerciseMetric[];
  const values = result.data.values as ExerciseEntryValues;
  if (!validateEntryValues(values, metrics)) {
    res.status(400).json({ message: 'Invalid set', code: 'VALIDATION_ERROR', statusCode: 400 });
    return;
  }

  const allowed = exercise.allowedEntryTypesSnapshot as EntryType[];
  const entryType = result.data.entryType ?? (exercise.defaultEntryTypeSnapshot as EntryType);
  if (result.data.entryType && !allowed.includes(entryType)) {
    res.status(400).json({ message: 'Invalid set', code: 'VALIDATION_ERROR', statusCode: 400 });
    return;
  }

  const sessionExerciseId = req.params['sessionExerciseId'] as string;
  const last = await prisma.exerciseEntry.findFirst({
    where: { sessionExerciseId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });
  const position = (last?.position ?? 0) + 1;

  const created = await prisma.exerciseEntry.create({
    data: {
      sessionExerciseId,
      entryType,
      values: values as Prisma.InputJsonValue,
      position,
    },
  });

  res.status(201).json({ data: toEntryDto(created) });
}

export async function updateSet(req: AuthRequest, res: Response): Promise<void> {
  const result = updateSetSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ message: 'Invalid set', code: 'VALIDATION_ERROR', statusCode: 400 });
    return;
  }

  const exercise = await resolveWritableExercise(req, res);
  if (!exercise) {
    return;
  }

  const metrics = exercise.metricsSnapshot as ExerciseMetric[];
  const values = result.data.values as ExerciseEntryValues;
  if (!validateEntryValues(values, metrics)) {
    res.status(400).json({ message: 'Invalid set', code: 'VALIDATION_ERROR', statusCode: 400 });
    return;
  }

  const sessionExerciseId = req.params['sessionExerciseId'] as string;
  const entryId = req.params['entryId'] as string;

  const entry = await prisma.exerciseEntry.findFirst({
    where: { id: entryId, sessionExerciseId },
    select: { id: true },
  });
  if (!entry) {
    res.status(404).json({ message: 'Set not found', code: 'NOT_FOUND', statusCode: 404 });
    return;
  }

  const updated = await prisma.exerciseEntry.update({
    where: { id: entryId },
    data: { values: values as Prisma.InputJsonValue },
  });

  res.json({ data: toEntryDto(updated) });
}

export async function deleteSet(req: AuthRequest, res: Response): Promise<void> {
  const exercise = await resolveWritableExercise(req, res);
  if (!exercise) {
    return;
  }

  const sessionExerciseId = req.params['sessionExerciseId'] as string;
  const entryId = req.params['entryId'] as string;

  const entry = await prisma.exerciseEntry.findFirst({
    where: { id: entryId, sessionExerciseId },
    select: { id: true },
  });
  if (!entry) {
    res.status(404).json({ message: 'Set not found', code: 'NOT_FOUND', statusCode: 404 });
    return;
  }

  await prisma.exerciseEntry.delete({ where: { id: entryId } });

  res.json({ data: { id: entryId } });
}

export async function finishSession(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const id = req.params['id'] as string;

  const session = await prisma.workoutSession.findFirst({
    where: { id, userId },
    select: { id: true, endedAt: true },
  });
  if (!session) {
    res.status(404).json({ message: 'Session not found', code: 'NOT_FOUND', statusCode: 404 });
    return;
  }
  if (session.endedAt !== null) {
    res.status(409).json({
      message: 'Session is already finished',
      code: 'SESSION_ALREADY_FINISHED',
      statusCode: 409,
    });
    return;
  }

  const exerciseCount = await prisma.sessionExercise.count({ where: { sessionId: id } });
  const entryCount = await prisma.exerciseEntry.count({
    where: { sessionExercise: { sessionId: id } },
  });
  if (exerciseCount < 1 || entryCount < 1) {
    res.status(422).json({
      message: 'Cannot finish an empty session',
      code: 'SESSION_EMPTY',
      statusCode: 422,
    });
    return;
  }

  const finished = await prisma.workoutSession.update({
    where: { id },
    data: { endedAt: new Date() },
    include: exercisesInclude,
  });

  res.json({ data: toSessionDto(finished) });
}
