import request from 'supertest';
import { vi } from 'vitest';
import jwt from 'jsonwebtoken';

process.env['JWT_SECRET'] = 'test-secret';

vi.mock('../db.js', () => ({
  prisma: {
    exerciseDefinition: {
      findMany: vi.fn(),
    },
  },
}));

const { app } = await import('../app.js');
const { prisma } = await import('../db.js');

function signToken(): string {
  return jwt.sign(
    { userId: 'user-123', email: 'user@example.com', role: 'USER' },
    process.env['JWT_SECRET'] as string,
  );
}

const benchPressRow = {
  id: 'seed-bench-press',
  userId: null,
  name: 'Bench Press',
  category: 'strength',
  metrics: [
    { key: 'reps', required: true },
    { key: 'load', required: true },
  ],
  allowedEntryTypes: ['set'],
  defaultEntryType: 'set',
  isArchived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const ownedRow = {
  ...benchPressRow,
  id: 'user-custom-1',
  userId: 'user-123',
  name: 'My Custom Lift',
  category: 'custom',
};

beforeEach(() => {
  vi.mocked(prisma.exerciseDefinition.findMany).mockReset();
});

describe('GET /api/exercises', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/exercises');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 with an invalid token', async () => {
    const res = await request(app)
      .get('/api/exercises')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('returns { data: [...] } shaped as the Exercise DTO without leaking userId', async () => {
    vi.mocked(prisma.exerciseDefinition.findMany).mockResolvedValueOnce([
      benchPressRow,
      ownedRow,
    ] as never);

    const res = await request(app).get('/api/exercises').set('Authorization', `Bearer ${signToken()}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toMatchObject({
      id: 'seed-bench-press',
      name: 'Bench Press',
      category: 'strength',
      isPredefined: true,
    });
    expect(res.body.data[1]).toMatchObject({ isPredefined: false });
    for (const item of res.body.data) {
      expect(item).not.toHaveProperty('userId');
    }
  });

  it('scopes the query to global + own exercises, non-archived', async () => {
    vi.mocked(prisma.exerciseDefinition.findMany).mockResolvedValueOnce([] as never);

    await request(app).get('/api/exercises').set('Authorization', `Bearer ${signToken()}`);

    const where = vi.mocked(prisma.exerciseDefinition.findMany).mock.calls[0]?.[0]?.where;
    expect(where).toMatchObject({
      isArchived: false,
      OR: [{ userId: null }, { userId: 'user-123' }],
    });
  });

  it('passes search into the Prisma where (case-insensitive contains)', async () => {
    vi.mocked(prisma.exerciseDefinition.findMany).mockResolvedValueOnce([] as never);

    await request(app)
      .get('/api/exercises?search=press')
      .set('Authorization', `Bearer ${signToken()}`);

    const where = vi.mocked(prisma.exerciseDefinition.findMany).mock.calls[0]?.[0]?.where;
    expect(where).toMatchObject({ name: { contains: 'press', mode: 'insensitive' } });
  });

  it('passes category into the Prisma where', async () => {
    vi.mocked(prisma.exerciseDefinition.findMany).mockResolvedValueOnce([] as never);

    await request(app)
      .get('/api/exercises?category=cardio')
      .set('Authorization', `Bearer ${signToken()}`);

    const where = vi.mocked(prisma.exerciseDefinition.findMany).mock.calls[0]?.[0]?.where;
    expect(where).toMatchObject({ category: 'cardio' });
  });

  it('returns VALIDATION_ERROR 400 for an invalid category', async () => {
    const res = await request(app)
      .get('/api/exercises?category=swimming')
      .set('Authorization', `Bearer ${signToken()}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(prisma.exerciseDefinition.findMany).not.toHaveBeenCalled();
  });
});
