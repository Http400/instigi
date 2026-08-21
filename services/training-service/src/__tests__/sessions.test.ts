import request from 'supertest';
import { vi } from 'vitest';
import jwt from 'jsonwebtoken';

process.env['JWT_SECRET'] = 'test-secret';

vi.mock('../db.js', () => ({
  prisma: {
    workoutSession: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    sessionExercise: {
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    exerciseDefinition: {
      findFirst: vi.fn(),
    },
    exerciseEntry: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
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
  entries: [],
};

const benchExerciseSnapshot = {
  metricsSnapshot: [
    { key: 'reps', required: true },
    { key: 'load', required: true },
  ],
  defaultEntryTypeSnapshot: 'set',
  allowedEntryTypesSnapshot: ['set'],
};

const pullUpExerciseSnapshot = {
  metricsSnapshot: [
    { key: 'reps', required: true },
    { key: 'load', required: false },
  ],
  defaultEntryTypeSnapshot: 'set',
  allowedEntryTypesSnapshot: ['set'],
};

// Exercise that declares a single metric — used to prove an undeclared metric key is rejected.
const repsOnlyExerciseSnapshot = {
  metricsSnapshot: [{ key: 'reps', required: true }],
  defaultEntryTypeSnapshot: 'set',
  allowedEntryTypesSnapshot: ['set'],
};

// Deliberately malformed snapshot: defaultEntryType is NOT in allowedEntryTypes.
// Pins the current (unchecked) behavior of the defaulted entry-type path.
const inconsistentDefaultExerciseSnapshot = {
  metricsSnapshot: [{ key: 'reps', required: true }],
  defaultEntryTypeSnapshot: 'lap',
  allowedEntryTypesSnapshot: ['set'],
};

const entryRow = {
  id: 'entry-1',
  sessionExerciseId: 'se-1',
  entryType: 'set',
  values: { reps: 8, load: 70 },
  isCompleted: true,
  position: 1,
};

const finishedSessionRow = {
  id: 'session-1',
  title: 'Jul 16 workout',
  startedAt: new Date('2026-07-16T10:00:00.000Z'),
  endedAt: new Date('2026-07-16T11:00:00.000Z'),
  exercises: [],
};

beforeEach(() => {
  vi.mocked(prisma.workoutSession.findFirst).mockReset();
  vi.mocked(prisma.workoutSession.findMany).mockReset();
  vi.mocked(prisma.workoutSession.create).mockReset();
  vi.mocked(prisma.workoutSession.update).mockReset();
  vi.mocked(prisma.workoutSession.delete).mockReset();
  vi.mocked(prisma.sessionExercise.findFirst).mockReset();
  vi.mocked(prisma.sessionExercise.create).mockReset();
  vi.mocked(prisma.sessionExercise.delete).mockReset();
  vi.mocked(prisma.sessionExercise.count).mockReset();
  vi.mocked(prisma.exerciseDefinition.findFirst).mockReset();
  vi.mocked(prisma.exerciseEntry.findFirst).mockReset();
  vi.mocked(prisma.exerciseEntry.create).mockReset();
  vi.mocked(prisma.exerciseEntry.update).mockReset();
  vi.mocked(prisma.exerciseEntry.delete).mockReset();
  vi.mocked(prisma.exerciseEntry.count).mockReset();
});

describe('POST /sessions', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).post('/sessions').send({});
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 with an invalid token', async () => {
    const res = await request(app)
      .post('/sessions')
      .set('Authorization', 'Bearer not-a-real-token')
      .send({});
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('creates a session with a default title and no leaked userId', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce(null as never);
    vi.mocked(prisma.workoutSession.create).mockResolvedValueOnce(emptySessionRow as never);

    const res = await request(app)
      .post('/sessions')
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
      .post('/sessions')
      .set('Authorization', `Bearer ${signToken()}`)
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ACTIVE_SESSION_EXISTS');
    expect(prisma.workoutSession.create).not.toHaveBeenCalled();
  });
});

describe('GET /sessions/active', () => {
  it('returns { data: null } when no active session exists', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce(null as never);

    const res = await request(app)
      .get('/sessions/active')
      .set('Authorization', `Bearer ${signToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it('scopes the active lookup to the user with endedAt null', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce(emptySessionRow as never);

    await request(app)
      .get('/sessions/active')
      .set('Authorization', `Bearer ${signToken()}`);

    const where = vi.mocked(prisma.workoutSession.findFirst).mock.calls[0]?.[0]?.where;
    expect(where).toMatchObject({ userId: 'user-123', endedAt: null });
  });
});

describe('GET /sessions/:id', () => {
  it('returns 404 for a session the user does not own', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce(null as never);

    const res = await request(app)
      .get('/sessions/session-x')
      .set('Authorization', `Bearer ${signToken()}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('PATCH /sessions/:id', () => {
  it('returns VALIDATION_ERROR 400 for an empty title', async () => {
    const res = await request(app)
      .patch('/sessions/session-1')
      .set('Authorization', `Bearer ${signToken()}`)
      .send({ title: '' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(prisma.workoutSession.update).not.toHaveBeenCalled();
  });
});

describe('POST /sessions/:id/exercises', () => {
  it('snapshots the definition and appends the next position', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce({ id: 'session-1' } as never);
    vi.mocked(prisma.exerciseDefinition.findFirst).mockResolvedValueOnce(definitionRow as never);
    vi.mocked(prisma.sessionExercise.findFirst).mockResolvedValueOnce({ position: 2 } as never);
    vi.mocked(prisma.sessionExercise.create).mockResolvedValueOnce(sessionExerciseRow as never);

    const res = await request(app)
      .post('/sessions/session-1/exercises')
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
      .post('/sessions/session-1/exercises')
      .set('Authorization', `Bearer ${signToken()}`)
      .send({ exerciseDefinitionId: definitionRow.id });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('EXERCISE_NOT_FOUND');
    expect(prisma.sessionExercise.create).not.toHaveBeenCalled();
  });

  it('returns 404 NOT_FOUND when the session is not owned', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce(null as never);

    const res = await request(app)
      .post('/sessions/session-x/exercises')
      .set('Authorization', `Bearer ${signToken()}`)
      .send({ exerciseDefinitionId: definitionRow.id });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('returns VALIDATION_ERROR 400 for a non-uuid definition id', async () => {
    const res = await request(app)
      .post('/sessions/session-1/exercises')
      .set('Authorization', `Bearer ${signToken()}`)
      .send({ exerciseDefinitionId: 'not-a-uuid' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});

describe('DELETE /sessions/:id/exercises/:sessionExerciseId', () => {
  it('returns 404 for a session exercise on a session the user does not own', async () => {
    vi.mocked(prisma.sessionExercise.findFirst).mockResolvedValueOnce(null as never);

    const res = await request(app)
      .delete('/sessions/session-1/exercises/se-x')
      .set('Authorization', `Bearer ${signToken()}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
    expect(prisma.sessionExercise.delete).not.toHaveBeenCalled();
  });

  it('deletes an owned session exercise and echoes its id', async () => {
    vi.mocked(prisma.sessionExercise.findFirst).mockResolvedValueOnce({ id: 'se-1' } as never);
    vi.mocked(prisma.sessionExercise.delete).mockResolvedValueOnce({ id: 'se-1' } as never);

    const res = await request(app)
      .delete('/sessions/session-1/exercises/se-1')
      .set('Authorization', `Bearer ${signToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ id: 'se-1' });
  });
});

describe('POST /sessions/:id/exercises/:sessionExerciseId/sets', () => {
  it('logs a valid set and appends the next position', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce({
      id: 'session-1',
      endedAt: null,
    } as never);
    vi.mocked(prisma.sessionExercise.findFirst).mockResolvedValueOnce(benchExerciseSnapshot as never);
    vi.mocked(prisma.exerciseEntry.findFirst).mockResolvedValueOnce({ position: 2 } as never);
    vi.mocked(prisma.exerciseEntry.create).mockResolvedValueOnce({
      ...entryRow,
      position: 3,
    } as never);

    const res = await request(app)
      .post('/sessions/session-1/exercises/se-1/sets')
      .set('Authorization', `Bearer ${signToken()}`)
      .send({ values: { reps: 8, load: 70 } });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      id: 'entry-1',
      entryType: 'set',
      values: { reps: 8, load: 70 },
      position: 3,
    });

    const data = vi.mocked(prisma.exerciseEntry.create).mock.calls[0]?.[0]?.data;
    expect(data).toMatchObject({ sessionExerciseId: 'se-1', entryType: 'set', position: 3 });
  });

  it('rejects a set missing a required metric with 400', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce({
      id: 'session-1',
      endedAt: null,
    } as never);
    vi.mocked(prisma.sessionExercise.findFirst).mockResolvedValueOnce(benchExerciseSnapshot as never);

    const res = await request(app)
      .post('/sessions/session-1/exercises/se-1/sets')
      .set('Authorization', `Bearer ${signToken()}`)
      .send({ values: { reps: 8 } });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(prisma.exerciseEntry.create).not.toHaveBeenCalled();
  });

  it('accepts a set that omits an optional metric (pull-up load)', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce({
      id: 'session-1',
      endedAt: null,
    } as never);
    vi.mocked(prisma.sessionExercise.findFirst).mockResolvedValueOnce(pullUpExerciseSnapshot as never);
    vi.mocked(prisma.exerciseEntry.findFirst).mockResolvedValueOnce(null as never);
    vi.mocked(prisma.exerciseEntry.create).mockResolvedValueOnce({
      id: 'entry-2',
      sessionExerciseId: 'se-1',
      entryType: 'set',
      values: { reps: 10 },
      isCompleted: true,
      position: 1,
    } as never);

    const res = await request(app)
      .post('/sessions/session-1/exercises/se-1/sets')
      .set('Authorization', `Bearer ${signToken()}`)
      .send({ values: { reps: 10 } });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ id: 'entry-2', values: { reps: 10 }, position: 1 });
  });

  it('rejects a set write on a finished session with 409 SESSION_FINISHED', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce({
      id: 'session-1',
      endedAt: new Date('2026-07-16T11:00:00.000Z'),
    } as never);

    const res = await request(app)
      .post('/sessions/session-1/exercises/se-1/sets')
      .set('Authorization', `Bearer ${signToken()}`)
      .send({ values: { reps: 8, load: 70 } });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SESSION_FINISHED');
    expect(prisma.exerciseEntry.create).not.toHaveBeenCalled();
  });

  it('rejects a set carrying an undeclared metric with 400', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce({
      id: 'session-1',
      endedAt: null,
    } as never);
    vi.mocked(prisma.sessionExercise.findFirst).mockResolvedValueOnce(
      repsOnlyExerciseSnapshot as never,
    );

    // Exercise declares only `reps`; `load` is a valid MetricKey but undeclared here.
    const res = await request(app)
      .post('/sessions/session-1/exercises/se-1/sets')
      .set('Authorization', `Bearer ${signToken()}`)
      .send({ values: { reps: 8, load: 70 } });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(prisma.exerciseEntry.create).not.toHaveBeenCalled();
  });

  it('rejects a set whose supplied entryType is not allowed with 400', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce({
      id: 'session-1',
      endedAt: null,
    } as never);
    vi.mocked(prisma.sessionExercise.findFirst).mockResolvedValueOnce(benchExerciseSnapshot as never);

    // Bench allows only 'set'; 'lap' is a valid EntryType but disallowed for this exercise.
    const res = await request(app)
      .post('/sessions/session-1/exercises/se-1/sets')
      .set('Authorization', `Bearer ${signToken()}`)
      .send({ entryType: 'lap', values: { reps: 8, load: 70 } });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(prisma.exerciseEntry.create).not.toHaveBeenCalled();
  });

  it('rejects a set whose required metric is zero with 400', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce({
      id: 'session-1',
      endedAt: null,
    } as never);
    vi.mocked(prisma.sessionExercise.findFirst).mockResolvedValueOnce(benchExerciseSnapshot as never);

    // Zod allows 0 (nonnegative); the domain rule requires required metrics to be > 0.
    const res = await request(app)
      .post('/sessions/session-1/exercises/se-1/sets')
      .set('Authorization', `Bearer ${signToken()}`)
      .send({ values: { reps: 0, load: 70 } });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(prisma.exerciseEntry.create).not.toHaveBeenCalled();
  });

  it('defaults entryType to the exercise default when omitted', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce({
      id: 'session-1',
      endedAt: null,
    } as never);
    vi.mocked(prisma.sessionExercise.findFirst).mockResolvedValueOnce(benchExerciseSnapshot as never);
    vi.mocked(prisma.exerciseEntry.findFirst).mockResolvedValueOnce(null as never);
    vi.mocked(prisma.exerciseEntry.create).mockResolvedValueOnce({
      ...entryRow,
      entryType: 'set',
      position: 1,
    } as never);

    const res = await request(app)
      .post('/sessions/session-1/exercises/se-1/sets')
      .set('Authorization', `Bearer ${signToken()}`)
      .send({ values: { reps: 8, load: 70 } });

    expect(res.status).toBe(201);
    const data = vi.mocked(prisma.exerciseEntry.create).mock.calls[0]?.[0]?.data;
    expect(data).toMatchObject({ entryType: benchExerciseSnapshot.defaultEntryTypeSnapshot });
  });

  // KNOWN GAP (research Open Question #1): a defaulted entryType is trusted unchecked — it is
  // NOT re-validated against allowedEntryTypes. This pins current behavior; if the server is
  // later hardened to validate the default, flip this expectation to 400.
  it('accepts a defaulted entryType even when it is not in allowedEntryTypes (current behavior)', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce({
      id: 'session-1',
      endedAt: null,
    } as never);
    vi.mocked(prisma.sessionExercise.findFirst).mockResolvedValueOnce(
      inconsistentDefaultExerciseSnapshot as never,
    );
    vi.mocked(prisma.exerciseEntry.findFirst).mockResolvedValueOnce(null as never);
    vi.mocked(prisma.exerciseEntry.create).mockResolvedValueOnce({
      ...entryRow,
      entryType: 'lap',
      values: { reps: 8 },
      position: 1,
    } as never);

    const res = await request(app)
      .post('/sessions/session-1/exercises/se-1/sets')
      .set('Authorization', `Bearer ${signToken()}`)
      .send({ values: { reps: 8 } });

    expect(res.status).toBe(201);
    const data = vi.mocked(prisma.exerciseEntry.create).mock.calls[0]?.[0]?.data;
    expect(data).toMatchObject({ entryType: 'lap' });
  });
});

describe('PATCH /sessions/:id/exercises/:sessionExerciseId/sets/:entryId', () => {
  it('updates an owned set', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce({
      id: 'session-1',
      endedAt: null,
    } as never);
    vi.mocked(prisma.sessionExercise.findFirst).mockResolvedValueOnce(benchExerciseSnapshot as never);
    vi.mocked(prisma.exerciseEntry.findFirst).mockResolvedValueOnce({ id: 'entry-1' } as never);
    vi.mocked(prisma.exerciseEntry.update).mockResolvedValueOnce({
      ...entryRow,
      values: { reps: 10, load: 72 },
    } as never);

    const res = await request(app)
      .patch('/sessions/session-1/exercises/se-1/sets/entry-1')
      .set('Authorization', `Bearer ${signToken()}`)
      .send({ values: { reps: 10, load: 72 } });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 'entry-1', values: { reps: 10, load: 72 } });
  });

  it('rejects an update that drops a required metric with 400', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce({
      id: 'session-1',
      endedAt: null,
    } as never);
    vi.mocked(prisma.sessionExercise.findFirst).mockResolvedValueOnce(benchExerciseSnapshot as never);

    // Bench requires reps + load; an update to reps-only must be rejected, not persisted.
    const res = await request(app)
      .patch('/sessions/session-1/exercises/se-1/sets/entry-1')
      .set('Authorization', `Bearer ${signToken()}`)
      .send({ values: { reps: 8 } });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(prisma.exerciseEntry.update).not.toHaveBeenCalled();
  });
});

describe('DELETE /sessions/:id/exercises/:sessionExerciseId/sets/:entryId', () => {
  it('deletes an owned set and echoes its id', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce({
      id: 'session-1',
      endedAt: null,
    } as never);
    vi.mocked(prisma.sessionExercise.findFirst).mockResolvedValueOnce(benchExerciseSnapshot as never);
    vi.mocked(prisma.exerciseEntry.findFirst).mockResolvedValueOnce({ id: 'entry-1' } as never);
    vi.mocked(prisma.exerciseEntry.delete).mockResolvedValueOnce({ id: 'entry-1' } as never);

    const res = await request(app)
      .delete('/sessions/session-1/exercises/se-1/sets/entry-1')
      .set('Authorization', `Bearer ${signToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ id: 'entry-1' });
  });
});

describe('POST /sessions/:id/finish', () => {
  it('finishes a session with content and stamps endedAt', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce({
      id: 'session-1',
      endedAt: null,
    } as never);
    vi.mocked(prisma.sessionExercise.count).mockResolvedValueOnce(1 as never);
    vi.mocked(prisma.exerciseEntry.count).mockResolvedValueOnce(2 as never);
    vi.mocked(prisma.workoutSession.update).mockResolvedValueOnce(finishedSessionRow as never);

    const res = await request(app)
      .post('/sessions/session-1/finish')
      .set('Authorization', `Bearer ${signToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.endedAt).not.toBeNull();
    expect(res.body.data).not.toHaveProperty('userId');
  });

  it('rejects finishing an empty session with 422 SESSION_EMPTY', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce({
      id: 'session-1',
      endedAt: null,
    } as never);
    vi.mocked(prisma.sessionExercise.count).mockResolvedValueOnce(0 as never);
    vi.mocked(prisma.exerciseEntry.count).mockResolvedValueOnce(0 as never);

    const res = await request(app)
      .post('/sessions/session-1/finish')
      .set('Authorization', `Bearer ${signToken()}`);

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('SESSION_EMPTY');
    expect(prisma.workoutSession.update).not.toHaveBeenCalled();
  });

  it('rejects finishing an already-finished session with 409', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce({
      id: 'session-1',
      endedAt: new Date('2026-07-16T11:00:00.000Z'),
    } as never);

    const res = await request(app)
      .post('/sessions/session-1/finish')
      .set('Authorization', `Bearer ${signToken()}`);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SESSION_ALREADY_FINISHED');
    expect(prisma.workoutSession.update).not.toHaveBeenCalled();
  });
});

describe('GET /sessions/history', () => {
  it('returns finished sessions as summaries in the order Prisma yields', async () => {
    vi.mocked(prisma.workoutSession.findMany).mockResolvedValueOnce([
      {
        id: 'session-2',
        title: 'Jul 20 workout',
        endedAt: new Date('2026-07-20T11:00:00.000Z'),
        _count: { exercises: 3 },
      },
      {
        id: 'session-1',
        title: null,
        endedAt: new Date('2026-07-16T11:00:00.000Z'),
        _count: { exercises: 1 },
      },
    ] as never);

    const res = await request(app)
      .get('/sessions/history')
      .set('Authorization', `Bearer ${signToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      {
        id: 'session-2',
        title: 'Jul 20 workout',
        endedAt: '2026-07-20T11:00:00.000Z',
        exerciseCount: 3,
      },
      {
        id: 'session-1',
        title: '',
        endedAt: '2026-07-16T11:00:00.000Z',
        exerciseCount: 1,
      },
    ]);
  });

  it('scopes the query to the user, finished-only, newest-first', async () => {
    vi.mocked(prisma.workoutSession.findMany).mockResolvedValueOnce([] as never);

    await request(app)
      .get('/sessions/history')
      .set('Authorization', `Bearer ${signToken()}`);

    const args = vi.mocked(prisma.workoutSession.findMany).mock.calls[0]?.[0];
    expect(args?.where).toMatchObject({ userId: 'user-123', endedAt: { not: null } });
    expect(args?.orderBy).toMatchObject({ endedAt: 'desc' });
  });

  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).get('/sessions/history');

    expect(res.status).toBe(401);
    expect(prisma.workoutSession.findMany).not.toHaveBeenCalled();
  });
});

describe('DELETE /sessions/:id', () => {
  it('discards an in-progress owned session', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce({
      id: 'session-1',
      endedAt: null,
    } as never);
    vi.mocked(prisma.workoutSession.delete).mockResolvedValueOnce({ id: 'session-1' } as never);

    const res = await request(app)
      .delete('/sessions/session-1')
      .set('Authorization', `Bearer ${signToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { id: 'session-1' } });
    expect(prisma.workoutSession.delete).toHaveBeenCalledWith({ where: { id: 'session-1' } });
  });

  it('rejects discarding a finished session with 409', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce({
      id: 'session-1',
      endedAt: new Date('2026-07-16T11:00:00.000Z'),
    } as never);

    const res = await request(app)
      .delete('/sessions/session-1')
      .set('Authorization', `Bearer ${signToken()}`);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SESSION_ALREADY_FINISHED');
    expect(prisma.workoutSession.delete).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown or non-owned session', async () => {
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValueOnce(null as never);

    const res = await request(app)
      .delete('/sessions/session-x')
      .set('Authorization', `Bearer ${signToken()}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
    expect(prisma.workoutSession.delete).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).delete('/sessions/session-1');

    expect(res.status).toBe(401);
    expect(prisma.workoutSession.delete).not.toHaveBeenCalled();
  });
});
