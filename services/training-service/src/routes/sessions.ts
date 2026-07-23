import { Router, type Router as ExpressRouter } from 'express';
import { requireAuth } from '@instigi/utils';
import {
  createSession,
  getActiveSession,
  getSession,
  updateSession,
  addSessionExercise,
  removeSessionExercise,
} from '../controllers/sessions.js';

export const sessionsRouter: ExpressRouter = Router();

sessionsRouter.post('/', requireAuth, createSession);
sessionsRouter.get('/active', requireAuth, getActiveSession);
sessionsRouter.get('/:id', requireAuth, getSession);
sessionsRouter.patch('/:id', requireAuth, updateSession);
sessionsRouter.post('/:id/exercises', requireAuth, addSessionExercise);
sessionsRouter.delete('/:id/exercises/:sessionExerciseId', requireAuth, removeSessionExercise);
