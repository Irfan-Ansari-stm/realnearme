import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ZodSchema, ZodError } from 'zod';
import { sendBadRequest } from '../utils/response';
import { v4 as uuidv4 } from 'uuid';

// ── Validate express-validator chains ─────────────────────────────────────────

export function validateRequest(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map((e) => ({ field: e.type, message: e.msg })),
    });
    return;
  }
  next();
}

// ── Zod body validator factory ────────────────────────────────────────────────

export function zodBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(err);
    }
  };
}

// ── Validate UUID param ───────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateUuidParam(...paramNames: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    for (const name of paramNames) {
      if (!UUID_REGEX.test(req.params[name] ?? '')) {
        sendBadRequest(res, `Invalid UUID for parameter: ${name}`);
        return;
      }
    }
    next();
  };
}

// ── Attach request ID ─────────────────────────────────────────────────────────

export function attachRequestId(req: Request, _res: Response, next: NextFunction): void {
  req.requestId = uuidv4();
  next();
}
