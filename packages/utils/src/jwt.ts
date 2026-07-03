import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export function verifyAccessToken(token: string): TokenPayload {
  const secret = process.env['JWT_SECRET'] ?? 'change-me-in-production';
  return jwt.verify(token, secret) as TokenPayload;
}
