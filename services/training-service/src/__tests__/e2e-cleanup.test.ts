import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';

process.env['JWT_SECRET'] = 'test-secret';

vi.mock('../db.js', () => ({
  prisma: {
    workoutSession: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const { app } = await import('../app.js');
const { prisma } = await import('../db.js');

const sessionId = '11111111-1111-4111-8111-111111111111';

function signToken(userId = 'user-123'): string {
  return jwt.sign(
    { userId, email: 'user@example.com', role: 'USER' },
    process.env['JWT_SECRET'] as string
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DELETE /e2e/sessions/:id', () => {
  it('deletes an owned finished session', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce({
      id: sessionId,
    } as never);
    vi.mocked(prisma.workoutSession.delete).mockResolvedValueOnce({
      id: sessionId,
    } as never);

    const response = await request(app)
      .delete(`/e2e/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${signToken()}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { id: sessionId } });
    expect(prisma.workoutSession.findFirst).toHaveBeenCalledWith({
      where: { id: sessionId, userId: 'user-123' },
      select: { id: true },
    });
    expect(prisma.workoutSession.delete).toHaveBeenCalledWith({
      where: { id: sessionId },
    });
  });

  it('returns 404 without deleting a session the user does not own', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce(null as never);

    const response = await request(app)
      .delete(`/e2e/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${signToken()}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: 'Session not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    });
    expect(prisma.workoutSession.delete).not.toHaveBeenCalled();
  });

  it('rejects a malformed session id', async () => {
    const response = await request(app)
      .delete('/e2e/sessions/not-a-uuid')
      .set('Authorization', `Bearer ${signToken()}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: 'Invalid session id',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    });
    expect(prisma.workoutSession.findFirst).not.toHaveBeenCalled();
    expect(prisma.workoutSession.delete).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated request', async () => {
    const response = await request(app).delete(`/e2e/sessions/${sessionId}`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: 'Unauthorized',
      code: 'UNAUTHORIZED',
      statusCode: 401,
    });
    expect(prisma.workoutSession.findFirst).not.toHaveBeenCalled();
    expect(prisma.workoutSession.delete).not.toHaveBeenCalled();
  });
});
