import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';

import { env } from './config/env';
import { logger } from './utils/logger';
import { attachRequestId } from './middleware/validate.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

// ── Module routers ─────────────────────────────────────────────────────────────
import healthRoutes       from './modules/health/health.routes';
import authRoutes         from './modules/auth/auth.routes';
import usersRoutes        from './modules/users/users.routes';
import feedRoutes         from './modules/feed/feed.routes';
import placesRoutes       from './modules/places/places.routes';
import savesRoutes        from './modules/saves/saves.routes';
import postsRoutes        from './modules/posts/posts.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import reportsRoutes      from './modules/reports/reports.routes';
import searchRoutes       from './modules/search/search.routes';
import sessionsRoutes     from './modules/sessions/sessions.routes';
import auditRoutes        from './modules/audit/audit.routes';
import adminRoutes        from './modules/admin/admin.routes';
import jobsRoutes         from './modules/admin/jobs.routes';
import algorithmRoutes    from './modules/algorithm/algorithm.routes';

export function createApp(): Application {
  const app = express();

  // ── Trust proxy (needed behind Docker/Nginx reverse proxy) ────────────────
  app.set('trust proxy', 1);

  // ── Security headers ──────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false, // allow media from Firebase Storage
    })
  );

  // ── CORS ──────────────────────────────────────────────────────────────────
  const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, curl)
        if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV === 'development') {
          callback(null, true);
        } else {
          callback(new Error(`CORS: Origin ${origin} not allowed`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    })
  );

  // ── HTTP Parameter Pollution protection ───────────────────────────────────
  app.use(hpp());

  // ── Compression ───────────────────────────────────────────────────────────
  app.use(compression());

  // ── Body parsers ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ── Request ID ────────────────────────────────────────────────────────────
  app.use(attachRequestId);

  // ── HTTP request logging ──────────────────────────────────────────────────
  app.use(
    pinoHttp({
      logger,
      customLogLevel: (_req, res) => {
        if (res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      customSuccessMessage: (req, res) =>
        `${req.method} ${req.url} → ${res.statusCode}`,
      redact: ['req.headers.authorization'],
    })
  );

  // ── Global rate limiter (express-rate-limit — IP-based, first layer) ──────
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX_REQUESTS,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: 'Too many requests, please try again later.' },
    })
  );

  // ── Health checks (no auth, no rate limit) ────────────────────────────────
  app.use('/health', healthRoutes);

  // ── API v1 routes ─────────────────────────────────────────────────────────
  const api = env.API_PREFIX;

  app.use(`${api}/auth`,          authRoutes);
  app.use(`${api}/users`,         usersRoutes);
  app.use(`${api}/feed`,          feedRoutes);
  app.use(`${api}/places`,        placesRoutes);
  app.use(`${api}/saves`,         savesRoutes);
  app.use(`${api}/posts`,         postsRoutes);
  app.use(`${api}/notifications`, notificationsRoutes);
  app.use(`${api}/reports`,       reportsRoutes);
  app.use(`${api}/search`,        searchRoutes);
  app.use(`${api}/sessions`,      sessionsRoutes);
  app.use(`${api}/audit`,         auditRoutes);
  app.use(`${api}/admin`,         adminRoutes);
  app.use(`${api}/admin/jobs`,    jobsRoutes);
  app.use(`${api}/algorithm`,     algorithmRoutes);

  // ── API index ─────────────────────────────────────────────────────────────
  app.get(api, (_req: Request, res: Response) => {
    res.json({
      name: 'NearMe API',
      version: '1.0.0',
      prefix: api,
      docs: `${api}/docs`,
      health: '/health',
      endpoints: [
        `${api}/auth`,
        `${api}/users`,
        `${api}/feed`,
        `${api}/places`,
        `${api}/saves`,
        `${api}/posts`,
        `${api}/notifications`,
        `${api}/reports`,
        `${api}/search`,
        `${api}/sessions`,
        `${api}/audit`,
        `${api}/admin`,
        `${api}/algorithm`,
      ],
    });
  });

  // ── 404 handler ───────────────────────────────────────────────────────────
  app.use(notFoundHandler);

  // ── Global error handler (MUST be last) ──────────────────────────────────
  app.use(
    (err: unknown, req: Request, res: Response, next: NextFunction) => {
      errorHandler(err, req, res, next);
    }
  );

  return app;
}
