import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { prisma } from '../db.js';
import { generateTokens, verifyRefreshToken } from '../jwt.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
});

export async function login(req: Request, res: Response): Promise<void> {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ message: 'Invalid input', code: 'VALIDATION_ERROR', statusCode: 400 });
    return;
  }

  const { email, password } = result.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ message: 'Invalid credentials', code: 'INVALID_CREDENTIALS', statusCode: 401 });
    return;
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    res.status(401).json({ message: 'Invalid credentials', code: 'INVALID_CREDENTIALS', statusCode: 401 });
    return;
  }

  const tokens = generateTokens({ userId: user.id, email: user.email, role: user.role });

  res.json({
    data: {
      user: { id: user.id, email: user.email, name: user.name, role: user.role.toLowerCase(), createdAt: user.createdAt, updatedAt: user.updatedAt },
      tokens,
    },
  });
}

export async function register(req: Request, res: Response): Promise<void> {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ message: 'Invalid input', code: 'VALIDATION_ERROR', statusCode: 400 });
    return;
  }

  const { email, name, password } = result.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ message: 'Email already in use', code: 'EMAIL_TAKEN', statusCode: 409 });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, name, password: hashedPassword },
  });

  const tokens = generateTokens({ userId: user.id, email: user.email, role: user.role });

  res.status(201).json({
    data: {
      user: { id: user.id, email: user.email, name: user.name, role: user.role.toLowerCase(), createdAt: user.createdAt, updatedAt: user.updatedAt },
      tokens,
    },
  });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) {
    res.status(400).json({ message: 'Refresh token required', code: 'MISSING_TOKEN', statusCode: 400 });
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const tokens = generateTokens({ userId: payload.userId, email: payload.email, role: payload.role });
    res.json({ data: { tokens } });
  } catch {
    res.status(401).json({ message: 'Invalid refresh token', code: 'INVALID_TOKEN', statusCode: 401 });
  }
}
