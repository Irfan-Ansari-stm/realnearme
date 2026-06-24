import { Request, Response, NextFunction } from 'express';
import { extractBearerToken, verifyAccessToken } from '../utils/jwt';
import { sendUnauthorized, sendForbidden } from '../utils/response';
import { UserRole } from '../types';
import { query } from '../config/database';
import { logger } from '../utils/logger';

// ── Authenticate: parse JWT + load live user status ───────────────────────────

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    sendUnauthorized(res, 'No access token provided');
    return;
  }

  try {
    const payload = verifyAccessToken(token);

    // Verify user is still active (banned users have tokens revoked in DB)
    const row = await query<{ is_active: boolean; role: UserRole }>(
      'SELECT is_active, role FROM users WHERE id = $1',
      [payload.sub]
    );

    const user = row.rows[0];
    if (!user) {
      sendUnauthorized(res, 'User account not found');
      return;
    }
    if (!user.is_active) {
      sendForbidden(res, 'Account has been suspended');
      return;
    }

    req.user = { id: payload.sub, uid: payload.uid, role: user.role };

    // Touch last_active_at (fire and forget — non-blocking)
    query('UPDATE users SET last_active_at = now() WHERE id = $1', [payload.sub]).catch(
      (err) => logger.warn({ err }, 'Failed to update last_active_at')
    );

    next();
  } catch (err) {
    next(err);
  }
}

// ── Optional authenticate: attaches user if token present, but doesn't fail ───

export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) { next(); return; }

  try {
    const payload = verifyAccessToken(token);
    const row = await query<{ is_active: boolean; role: UserRole }>(
      'SELECT is_active, role FROM users WHERE id = $1',
      [payload.sub]
    );
    const user = row.rows[0];
    if (user?.is_active) {
      req.user = { id: payload.sub, uid: payload.uid, role: user.role };
    }
  } catch {
    // silently ignore invalid tokens for optional auth
  }
  next();
}

// ── Authorize: role guard factory ─────────────────────────────────────────────

export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }
    if (!roles.includes(req.user.role)) {
      sendForbidden(res, `Requires role: ${roles.join(' or ')}`);
      return;
    }
    next();
  };
}

// ── Self or admin: allow if acting on own resource OR is admin/moderator ───────

export function selfOrAdmin(userIdParam = 'userId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) { sendUnauthorized(res); return; }
    const targetId = req.params[userIdParam];
    const isSelf = req.user.id === targetId;
    const isPrivileged = ['admin', 'moderator'].includes(req.user.role);
    if (!isSelf && !isPrivileged) {
      sendForbidden(res, 'You may only access your own resources');
      return;
    }
    next();
  };
}
