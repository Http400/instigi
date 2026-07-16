import express, { type Express } from 'express';
import cors from 'cors';
import { exercisesRouter } from './routes/exercises.js';

export const app: Express = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'training-service' });
});

app.use('/api/exercises', exercisesRouter);
