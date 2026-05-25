import request from 'supertest';
import { vi } from 'vitest';
import { app } from '../app.js';

vi.mock('../db.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const { prisma } = await import('../db.js');

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  password: '$2a$12$hashedpassword',
  role: 'USER' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('POST /api/auth/register', () => {
  it('returns 400 when body is invalid', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('returns 400 when password is too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', name: 'Test', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('returns 409 when email is already taken', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', name: 'Test', password: 'password123' });
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'EMAIL_TAKEN' });
  });

  it('returns 201 with user and tokens on success', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.user.create).mockResolvedValueOnce(mockUser);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@example.com', name: 'New User', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ email: 'test@example.com', name: 'Test User' });
    expect(res.body.data.tokens).toHaveProperty('accessToken');
    expect(res.body.data.tokens).toHaveProperty('refreshToken');
  });
});

describe('POST /api/auth/login', () => {
  it('returns 400 when body is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('returns 400 when email is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bad', password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('returns 401 when user does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });
});

describe('POST /api/auth/refresh', () => {
  it('returns 400 when refresh token is missing', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'MISSING_TOKEN' });
  });

  it('returns 401 when refresh token is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'invalid.token.value' });
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: 'INVALID_TOKEN' });
  });
});
