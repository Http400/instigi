import { z } from 'zod';
import type { Response } from 'express';
import type { AuthRequest } from '@instigi/utils';
import type { Exercise, EntryType, ExerciseMetric } from '@instigi/types';
import { prisma } from '../db.js';
import type { Prisma } from '../generated/prisma/client.js';

const listQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  category: z.enum(['strength', 'cardio', 'mobility', 'custom']).optional(),
});

interface ExerciseRow {
  id: string;
  userId: string | null;
  name: string;
  category: string;
  metrics: unknown;
  allowedEntryTypes: unknown;
  defaultEntryType: string;
}

function toExerciseDto(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    category: row.category as Exercise['category'],
    metrics: row.metrics as ExerciseMetric[],
    allowedEntryTypes: row.allowedEntryTypes as EntryType[],
    defaultEntryType: row.defaultEntryType as EntryType,
    isPredefined: row.userId === null,
  };
}

export async function listExercises(req: AuthRequest, res: Response): Promise<void> {
  const result = listQuerySchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ message: 'Invalid query', code: 'VALIDATION_ERROR', statusCode: 400 });
    return;
  }

  const { search, category } = result.data;
  const userId = req.user?.userId;

  const ownership: Prisma.ExerciseDefinitionWhereInput[] = [{ userId: null }];
  if (userId) {
    ownership.push({ userId });
  }

  const where: Prisma.ExerciseDefinitionWhereInput = {
    isArchived: false,
    OR: ownership,
    ...(category && { category }),
    ...(search && { name: { contains: search, mode: 'insensitive' } }),
  };

  const rows = await prisma.exerciseDefinition.findMany({
    where,
    orderBy: { name: 'asc' },
  });

  res.json({ data: rows.map(toExerciseDto) });
}
