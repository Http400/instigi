import jwt from 'jsonwebtoken';
import type { AuthTokens } from '@instigi/types';
import type { TokenPayload } from '@instigi/utils';

const JWT_SECRET = process.env['JWT_SECRET'] ?? 'change-me-in-production';
const JWT_REFRESH_SECRET = process.env['JWT_REFRESH_SECRET'] ?? 'change-me-refresh-in-production';
const JWT_EXPIRES_IN = process.env['JWT_EXPIRES_IN'] ?? '15m';
const JWT_REFRESH_EXPIRES_IN = process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d';

export function generateTokens(payload: TokenPayload): AuthTokens {
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
  return { accessToken, refreshToken };
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
}
