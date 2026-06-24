import { Request, Response, NextFunction } from 'express';

// ── Typed application error ───────────────────────────────────────────────────

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(message: string, statusCode = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg: string, code?: string) {
    return new AppError(msg, 400, code);
  }
  static unauthorized(msg = 'Unauthorized', code?: string) {
    return new AppError(msg, 401, code);
  }
  static forbidden(msg = 'Forbidden', code?: string) {
    return new AppError(msg, 403, code);
  }
  static notFound(msg = 'Resource not found', code?: string) {
    return new AppError(msg, 404, code);
  }
  static conflict(msg: string, code?: string) {
    return new AppError(msg, 409, code);
  }
  static unprocessable(msg: string, code?: string) {
    return new AppError(msg, 422, code);
  }
  static tooManyRequests(msg = 'Too many requests', code?: string) {
    return new AppError(msg, 429, code);
  }
}

// ── Async route handler wrapper — eliminates try/catch boilerplate ────────────

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// ── Map PostgreSQL error codes to AppError ────────────────────────────────────

export function mapDbError(err: unknown): AppError {
  const e = err as { code?: string; constraint?: string; message?: string };
  switch (e.code) {
    case '23505': // unique_violation
      return AppError.conflict(
        e.constraint
          ? `Duplicate value violates unique constraint: ${e.constraint}`
          : 'Duplicate entry'
      );
    case '23503': // foreign_key_violation
      return AppError.badRequest('Referenced resource does not exist');
    case '23514': // check_violation
      return AppError.badRequest(`Constraint violation: ${e.constraint ?? 'unknown'}`);
    case '22P02': // invalid_text_representation (bad UUID, bad enum)
      return AppError.badRequest('Invalid value format');
    case '02000': // no_data_found (raised by stored procs)
      return AppError.notFound();
    case '28000': // invalid_authorization_specification
    case '28P01':
      return AppError.unauthorized('Database authentication failed');
    default:
      return new AppError(e.message ?? 'Database error', 500);
  }
}
