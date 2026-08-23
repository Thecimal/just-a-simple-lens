// apps/api/src/server.js
//
// Entrypoint. Deployed to a VPS/Ubuntu box (Playwright + Chromium need a
// real OS process, not the Workers V8 isolate — see README for why the
// backend is NOT on Cloudflare Workers).

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { analyzeRouter } from './routes/analyze.js';

const app = express();
const PORT = process.env.PORT || 8787;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN?.split(',') || '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp());

// Crawling + LLM calls are expensive — rate-limit aggressively per IP.
app.use(
  '/api/',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', analyzeRouter);

app.use((err, req, res, _next) => {
  req.log?.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`GEO/SEO Analyzer API listening on :${PORT}`);
});
