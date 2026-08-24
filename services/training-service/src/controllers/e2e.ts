import { z } from 'zod';
import type { Response } from 'express';
import type { AuthRequest } from '@instigi/utils';
import { prisma } from '../db.js';

const cleanupSessionParamsSchema = z.object({
  id: z.string().uuid(),
});

export async function cleanupSession(req: AuthRequest, res: Response): Promise<void> {
  const result = cleanupSessionParamsSchema.safeParse(req.params);
  if (!result.success) {
    res.status(400).json({
      message: 'Invalid session id',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    });
    return;
  }

  const userId = req.user!.userId;
  const { id } = result.data;
  const session = await prisma.workoutSession.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!session) {
    res.status(404).json({
      message: 'Session not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    });
    return;
  }

  await prisma.workoutSession.delete({ where: { id } });

  res.json({ data: { id } });
}
