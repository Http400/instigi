import 'dotenv/config';
import express, { type Express } from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';

const app: Express = express();
const PORT = process.env['PORT'] ?? 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

app.use('/api/auth', authRouter);

app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
});

export { app };
