import { z } from 'zod';
import type { Response } from 'express';
import type { AuthRequest } from '@instigi/utils';
import type {
  WorkoutSession,
  SessionExercise,
  ExerciseCategory,
  EntryType,
  ExerciseMetric,
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
}

interface SessionRow {
  id: string;
  title: string | null;
  startedAt: Date;
  endedAt: Date | null;
  exercises: SessionExerciseRow[];
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
    entries: [],
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
  exercises: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] },
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
