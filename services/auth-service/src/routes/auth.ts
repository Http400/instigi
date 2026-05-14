import { Router, type Router as ExpressRouter } from 'express';
import { login, register, refresh } from '../controllers/auth.js';

export const authRouter: ExpressRouter = Router();

authRouter.post('/login', login);
authRouter.post('/register', register);
authRouter.post('/refresh', refresh);
