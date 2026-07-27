import { Router, type Router as ExpressRouter } from 'express';
import { requireAuth } from '@instigi/utils';
import {
  createSession,
  getActiveSession,
  listHistory,
  getSession,
  updateSession,
  addSessionExercise,
  removeSessionExercise,
  logSet,
  updateSet,
  deleteSet,
  finishSession,
} from '../controllers/sessions.js';

export const sessionsRouter: ExpressRouter = Router();

sessionsRouter.post('/', requireAuth, createSession);
sessionsRouter.get('/active', requireAuth, getActiveSession);
sessionsRouter.get('/history', requireAuth, listHistory);
sessionsRouter.get('/:id', requireAuth, getSession);
sessionsRouter.patch('/:id', requireAuth, updateSession);
sessionsRouter.post('/:id/finish', requireAuth, finishSession);
sessionsRouter.post('/:id/exercises', requireAuth, addSessionExercise);
sessionsRouter.delete('/:id/exercises/:sessionExerciseId', requireAuth, removeSessionExercise);
sessionsRouter.post('/:id/exercises/:sessionExerciseId/sets', requireAuth, logSet);
sessionsRouter.patch('/:id/exercises/:sessionExerciseId/sets/:entryId', requireAuth, updateSet);
sessionsRouter.delete('/:id/exercises/:sessionExerciseId/sets/:entryId', requireAuth, deleteSet);
