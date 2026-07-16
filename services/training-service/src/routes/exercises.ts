import { Router, type Router as ExpressRouter } from 'express';
import { requireAuth } from '@instigi/utils';
import { listExercises } from '../controllers/exercises.js';

export const exercisesRouter: ExpressRouter = Router();

exercisesRouter.get('/', requireAuth, listExercises);
