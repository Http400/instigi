import { Router, type Router as ExpressRouter } from 'express';
import { requireAuth } from '@instigi/utils';
import { cleanupSession } from '../controllers/e2e.js';

export const e2eRouter: ExpressRouter = Router();

e2eRouter.delete('/sessions/:id', requireAuth, cleanupSession);
