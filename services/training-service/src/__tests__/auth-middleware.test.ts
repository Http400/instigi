import express, { type Express } from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { requireAuth, type AuthRequest } from '@instigi/utils';

process.env['JWT_SECRET'] = 'test-secret';

function buildProbeApp(): Express {
  const probe = express();
  probe.use(express.json());
  probe.get('/__probe', requireAuth, (req: AuthRequest, res) => {
    res.json({ data: { userId: req.user?.userId } });
  });
  return probe;
}

describe('requireAuth (shared from @instigi/utils)', () => {
  const probe = buildProbeApp();

  it('accepts a valid auth-service token and populates req.user', async () => {
    const token = jwt.sign(
      { userId: 'user-123', email: 'user@example.com', role: 'USER' },
      process.env['JWT_SECRET'] as string,
    );
    const res = await request(probe).get('/__probe').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { userId: 'user-123' } });
  });

  it('rejects a request with no Authorization header', async () => {
    const res = await request(probe).get('/__probe');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('rejects a malformed/invalid token', async () => {
    const res = await request(probe).get('/__probe').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });
});
