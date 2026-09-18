import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { API_VERSION, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS } from './config/api.js';
import { apiV1Router } from './routes/api-v1.js';
import { errorHandler, notFoundHandler } from './lib/errors.js';

export const app = express();

app.use(express.json());
app.use(cors());
app.use(rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  limit: RATE_LIMIT_REQUESTS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_request, response) => {
    response.status(429).json({ error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } });
  },
}));

app.use(`/api/${API_VERSION}`, apiV1Router);
app.use(notFoundHandler);
app.use(errorHandler);
