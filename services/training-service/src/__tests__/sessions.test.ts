import request from 'supertest';
import { vi } from 'vitest';
import jwt from 'jsonwebtoken';

process.env['JWT_SECRET'] = 'test-secret';

vi.mock('../db.js', () => ({
  prisma: {
    workoutSession: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    sessionExercise: {
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    exerciseDefinition: {
      findFirst: vi.fn(),
    },
  },
}));

const { app } = await import('../app.js');
const { prisma } = await import('../db.js');

function signToken(userId = 'user-123'): string {
  return jwt.sign(
    { userId, email: 'user@example.com', role: 'USER' },
    process.env['JWT_SECRET'] as string,
  );
}

const emptySessionRow = {
  id: 'session-1',
  title: 'Jul 16 workout',
  startedAt: new Date('2026-07-16T10:00:00.000Z'),
  endedAt: null,
  exercises: [],
};

const definitionRow = {
  id: '11111111-1111-4111-8111-111111111111',
  userId: null,
  name: 'Bench Press',
  category: 'strength',
  metrics: [{ key: 'reps', required: true }],
  allowedEntryTypes: ['set'],
  defaultEntryType: 'set',
  isArchived: false,
};

const sessionExerciseRow = {
  id: 'se-1',
  sessionId: 'session-1',
  exerciseDefinitionId: definitionRow.id,
  exerciseNameSnapshot: 'Bench Press',
  categorySnapshot: 'strength',
  metricsSnapshot: [{ key: 'reps', required: true }],
  allowedEntryTypesSnapshot: ['set'],
  defaultEntryTypeSnapshot: 'set',
  position: 3,
};

beforeEach(() => {
  vi.mocked(prisma.workoutSession.findFirst).mockReset();
  vi.mocked(prisma.workoutSession.create).mockReset();
  vi.mocked(prisma.workoutSession.update).mockReset();
  vi.mocked(prisma.sessionExercise.findFirst).mockReset();
  vi.mocked(prisma.sessionExercise.create).mockReset();
  vi.mocked(prisma.sessionExercise.delete).mockReset();
  vi.mocked(prisma.exerciseDefinition.findFirst).mockReset();
});

describe('POST /api/sessions', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).post('/api/sessions').send({});
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 with an invalid token', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', 'Bearer not-a-real-token')
      .send({});
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('creates a session with a default title and no leaked userId', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce(null as never);
    vi.mocked(prisma.workoutSession.create).mockResolvedValueOnce(emptySessionRow as never);

    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${signToken()}`)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ id: 'session-1', exercises: [] });
    expect(typeof res.body.data.title).toBe('string');
    expect(res.body.data.title.length).toBeGreaterThan(0);
    expect(res.body.data).not.toHaveProperty('userId');

    const data = vi.mocked(prisma.workoutSession.create).mock.calls[0]?.[0]?.data;
    expect(data).toMatchObject({ userId: 'user-123' });
    expect(typeof (data as { title?: unknown }).title).toBe('string');
  });

  it('returns 409 ACTIVE_SESSION_EXISTS when an active session exists', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce({ id: 'active' } as never);

    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${signToken()}`)
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ACTIVE_SESSION_EXISTS');
    expect(prisma.workoutSession.create).not.toHaveBeenCalled();
  });
});

describe('GET /api/sessions/active', () => {
  it('returns { data: null } when no active session exists', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce(null as never);

    const res = await request(app)
      .get('/api/sessions/active')
      .set('Authorization', `Bearer ${signToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it('scopes the active lookup to the user with endedAt null', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce(emptySessionRow as never);

    await request(app)
      .get('/api/sessions/active')
      .set('Authorization', `Bearer ${signToken()}`);

    const where = vi.mocked(prisma.workoutSession.findFirst).mock.calls[0]?.[0]?.where;
    expect(where).toMatchObject({ userId: 'user-123', endedAt: null });
  });
});

describe('GET /api/sessions/:id', () => {
  it('returns 404 for a session the user does not own', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce(null as never);

    const res = await request(app)
      .get('/api/sessions/session-x')
      .set('Authorization', `Bearer ${signToken()}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('PATCH /api/sessions/:id', () => {
  it('returns VALIDATION_ERROR 400 for an empty title', async () => {
    const res = await request(app)
      .patch('/api/sessions/session-1')
      .set('Authorization', `Bearer ${signToken()}`)
      .send({ title: '' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(prisma.workoutSession.update).not.toHaveBeenCalled();
  });
});

describe('POST /api/sessions/:id/exercises', () => {
  it('snapshots the definition and appends the next position', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce({ id: 'session-1' } as never);
    vi.mocked(prisma.exerciseDefinition.findFirst).mockResolvedValueOnce(definitionRow as never);
    vi.mocked(prisma.sessionExercise.findFirst).mockResolvedValueOnce({ position: 2 } as never);
    vi.mocked(prisma.sessionExercise.create).mockResolvedValueOnce(sessionExerciseRow as never);

    const res = await request(app)
      .post('/api/sessions/session-1/exercises')
      .set('Authorization', `Bearer ${signToken()}`)
      .send({ exerciseDefinitionId: definitionRow.id });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      id: 'se-1',
      name: 'Bench Press',
      category: 'strength',
      position: 3,
    });

    const data = vi.mocked(prisma.sessionExercise.create).mock.calls[0]?.[0]?.data;
    expect(data).toMatchObject({
      sessionId: 'session-1',
      exerciseDefinitionId: definitionRow.id,
      exerciseNameSnapshot: 'Bench Press',
      position: 3,
    });
  });

  it('returns 404 EXERCISE_NOT_FOUND for an unknown definition', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce({ id: 'session-1' } as never);
    vi.mocked(prisma.exerciseDefinition.findFirst).mockResolvedValueOnce(null as never);

    const res = await request(app)
      .post('/api/sessions/session-1/exercises')
      .set('Authorization', `Bearer ${signToken()}`)
      .send({ exerciseDefinitionId: definitionRow.id });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('EXERCISE_NOT_FOUND');
    expect(prisma.sessionExercise.create).not.toHaveBeenCalled();
  });

  it('returns 404 NOT_FOUND when the session is not owned', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce(null as never);

    const res = await request(app)
      .post('/api/sessions/session-x/exercises')
      .set('Authorization', `Bearer ${signToken()}`)
      .send({ exerciseDefinitionId: definitionRow.id });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('returns VALIDATION_ERROR 400 for a non-uuid definition id', async () => {
    const res = await request(app)
      .post('/api/sessions/session-1/exercises')
      .set('Authorization', `Bearer ${signToken()}`)
      .send({ exerciseDefinitionId: 'not-a-uuid' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});

describe('DELETE /api/sessions/:id/exercises/:sessionExerciseId', () => {
  it('returns 404 for a session exercise on a session the user does not own', async () => {
    vi.mocked(prisma.sessionExercise.findFirst).mockResolvedValueOnce(null as never);

    const res = await request(app)
      .delete('/api/sessions/session-1/exercises/se-x')
      .set('Authorization', `Bearer ${signToken()}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
    expect(prisma.sessionExercise.delete).not.toHaveBeenCalled();
  });

  it('deletes an owned session exercise and echoes its id', async () => {
    vi.mocked(prisma.sessionExercise.findFirst).mockResolvedValueOnce({ id: 'se-1' } as never);
    vi.mocked(prisma.sessionExercise.delete).mockResolvedValueOnce({ id: 'se-1' } as never);

    const res = await request(app)
      .delete('/api/sessions/session-1/exercises/se-1')
      .set('Authorization', `Bearer ${signToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ id: 'se-1' });
  });
});
