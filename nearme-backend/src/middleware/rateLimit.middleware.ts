import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

// ── Rate limit config per endpoint (mirrors DB schema comment) ─────────────────
// /api/v1/feed    : 60 / hour
// /api/v1/search  : 30 / minute
// /api/v1/posts   : 10 / hour  (write operations)
// /api/v1/reports : 5  / hour
// /api/v1/saves   : 100 / hour

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // in milliseconds
  endpointKey: string;
}

// ── In-DB rate limiter factory ────────────────────────────────────────────────

export function dbRateLimit(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) { next(); return; } // unauthenticated — handled by express-rate-limit globally

    const userId = req.user.id;
    const windowMs = config.windowMs;
    const now = new Date();
    const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
    const windowEnd = new Date(windowStart.getTime() + windowMs);

    try {
      // Upsert counter for this (user, endpoint, window) bucket
      const result = await query<{ count: number }>(
        `INSERT INTO rate_limit_counters (user_id, endpoint, window_start, window_end, count)
         VALUES ($1, $2, $3, $4, 1)
         ON CONFLICT (user_id, endpoint, window_start)
         DO UPDATE SET count = rate_limit_counters.count + 1
         RETURNING count`,
        [userId, config.endpointKey, windowStart.toISOString(), windowEnd.toISOString()]
      );

      const currentCount = result.rows[0]?.count ?? 1;

      // Set standard rate limit headers
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - currentCount));
      res.setHeader('X-RateLimit-Reset', Math.ceil(windowEnd.getTime() / 1000));

      if (currentCount > config.maxRequests) {
        res.setHeader('Retry-After', Math.ceil((windowEnd.getTime() - now.getTime()) / 1000));
        next(AppError.tooManyRequests(`Rate limit exceeded for ${config.endpointKey}. Retry after ${new Date(windowEnd).toISOString()}`));
        return;
      }

      next();
    } catch (err) {
      // Rate limit DB failure — fail open (don't block the request)
      logger.warn({ err, userId, endpoint: config.endpointKey }, 'Rate limit DB check failed; failing open');
      next();
    }
  };
}

// ── Pre-configured limiters ───────────────────────────────────────────────────

export const feedRateLimit = dbRateLimit({
  maxRequests: 60,
  windowMs: 60 * 60 * 1000, // 1 hour
  endpointKey: '/api/v1/feed',
});

export const searchRateLimit = dbRateLimit({
  maxRequests: 30,
  windowMs: 60 * 1000, // 1 minute
  endpointKey: '/api/v1/search',
});

export const postsWriteRateLimit = dbRateLimit({
  maxRequests: 10,
  windowMs: 60 * 60 * 1000,
  endpointKey: '/api/v1/posts/write',
});

export const reportsRateLimit = dbRateLimit({
  maxRequests: 5,
  windowMs: 60 * 60 * 1000,
  endpointKey: '/api/v1/reports',
});

export const savesRateLimit = dbRateLimit({
  maxRequests: 100,
  windowMs: 60 * 60 * 1000,
  endpointKey: '/api/v1/saves',
});
