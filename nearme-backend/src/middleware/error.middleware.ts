import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

// ── Global error handler — must be registered LAST ────────────────────────────

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Already-typed operational error
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId: req.requestId, path: req.path }, err.message);
    } else {
      logger.warn({ statusCode: err.statusCode, path: req.path, code: err.code }, err.message);
    }
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
    return;
  }

  // PostgreSQL errors
  const pgErr = err as { code?: string; constraint?: string; message?: string };
  if (pgErr.code && pgErr.code.length === 5) {
    logger.error({ pgCode: pgErr.code, constraint: pgErr.constraint, path: req.path }, pgErr.message);
    const statusMap: Record<string, number> = {
      '23505': 409,
      '23503': 400,
      '23514': 400,
      '22P02': 400,
      '02000': 404,
    };
    const status = statusMap[pgErr.code] ?? 500;
    res.status(status).json({
      success: false,
      error: status < 500 ? pgErr.message : 'Database error',
    });
    return;
  }

  // Unknown / programmer error — don't leak internals
  logger.error({ err, requestId: req.requestId, path: req.path }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && {
      detail: (err as Error).message,
      stack: (err as Error).stack,
    }),
  });
}

// ── 404 handler — register before errorHandler ────────────────────────────────

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
}
