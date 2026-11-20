import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import routes from './routes/index.js';
import { helmetMiddleware, corsMiddleware } from './config/security.js';
import { authenticate } from './middleware/auth.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Behind a host's proxy (Render, Railway…), the real visitor IP arrives in a
// header. "1" means: trust exactly one proxy hop. Leave unset when running locally.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));

app.use(helmetMiddleware);                  // 1. security headers on every response
app.use(corsMiddleware);                    // 2. who may call us from a browser
app.use(express.json({ limit: '10kb' }));   // 3. parse JSON; reject huge bodies

// Before the limiter, so uptime monitors never use up anyone's quota.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Favorita API is running' });
});

app.use('/api', apiLimiter, authenticate, routes);   // 4. limit, 5. identify, 6. route
app.use('/api', notFound);

// Development only: also serve the frontend files.
app.use(express.static(path.join(__dirname, '../../frontend')));

app.use(errorHandler);                      // MUST be last

export default app;