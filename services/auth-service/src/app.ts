import express, { type Express } from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';

export const app: Express = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

app.use('/api/auth', authRouter);
