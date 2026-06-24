import { Router, Request, Response } from 'express';
import { query, queryOne } from '../../config/database';
import { AppError } from '../../utils/errors';
import { sendSuccess, sendNoContent } from '../../utils/response';
import { asyncHandler } from '../../utils/errors';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateUuidParam } from '../../middleware/validate.middleware';
import { parsePagination, buildMeta } from '../../utils/helpers';
import { UserSession } from '../../types';

// ── Service ───────────────────────────────────────────────────────────────────

async function getMySessions(userId: string): Promise<UserSession[]> {
  const result = await query<UserSession>(
    `SELECT id, device_info, is_revoked, created_at, last_used_at, expires_at
     FROM user_sessions
     WHERE user_id = $1 AND is_revoked = FALSE AND expires_at > now()
     ORDER BY last_used_at DESC`,
    [userId]
  );
  return result.rows;
}

async function revokeSession(userId: string, sessionId: string): Promise<void> {
  const result = await query(
    `UPDATE user_sessions
     SET is_revoked = TRUE, revoked_at = now()
     WHERE id = $1 AND user_id = $2 AND is_revoked = FALSE`,
    [sessionId, userId]
  );
  if ((result.rowCount ?? 0) === 0) throw AppError.notFound('Session');
}

async function revokeAllSessions(userId: string): Promise<number> {
  const result = await query(
    `UPDATE user_sessions
     SET is_revoked = TRUE, revoked_at = now()
     WHERE user_id = $1 AND is_revoked = FALSE`,
    [userId]
  );
  return result.rowCount ?? 0;
}

// Admin functions
async function adminGetUserSessions(targetUserId: string, page: unknown, limit: unknown) {
  const { limit: lim, offset, page: p } = parsePagination(page, limit);
  const [rows, countRow] = await Promise.all([
    query<UserSession>(
      `SELECT id, device_info, is_revoked, revoked_at, created_at, last_used_at, expires_at
       FROM user_sessions WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [targetUserId, lim, offset]
    ),
    queryOne<{ total: string }>(
      'SELECT COUNT(*) AS total FROM user_sessions WHERE user_id = $1',
      [targetUserId]
    ),
  ]);
  return { sessions: rows.rows, ...buildMeta(parseInt(countRow?.total ?? '0', 10), p, lim) };
}

async function adminRevokeUserAllSessions(targetUserId: string): Promise<number> {
  const result = await query(
    `UPDATE user_sessions SET is_revoked = TRUE, revoked_at = now()
     WHERE user_id = $1 AND is_revoked = FALSE`,
    [targetUserId]
  );
  return result.rowCount ?? 0;
}

async function adminListActiveSessions(page: unknown, limit: unknown) {
  const { limit: lim, offset, page: p } = parsePagination(page, limit, 100);
  const [rows, countRow] = await Promise.all([
    query(
      `SELECT s.id, s.user_id, u.handle, u.display_name,
              s.device_info, s.created_at, s.last_used_at, s.expires_at
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.is_revoked = FALSE AND s.expires_at > now()
       ORDER BY s.last_used_at DESC
       LIMIT $1 OFFSET $2`,
      [lim, offset]
    ),
    queryOne<{ total: string }>(
      `SELECT COUNT(*) AS total FROM user_sessions WHERE is_revoked = FALSE AND expires_at > now()`
    ),
  ]);
  return { sessions: rows.rows, ...buildMeta(parseInt(countRow?.total ?? '0', 10), p, lim) };
}

// ── Controllers ───────────────────────────────────────────────────────────────

const getMySess = asyncHandler(async (req: Request, res: Response) => {
  const sessions = await getMySessions(req.user!.id);
  sendSuccess(res, sessions);
});

const revokeOneSess = asyncHandler(async (req: Request, res: Response) => {
  await revokeSession(req.user!.id, req.params.sessionId);
  sendNoContent(res);
});

const revokeAllSess = asyncHandler(async (req: Request, res: Response) => {
  const count = await revokeAllSessions(req.user!.id);
  sendSuccess(res, { revoked: count });
});

const adminGetUserSess = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminGetUserSessions(req.params.userId, req.query.page, req.query.limit);
  sendSuccess(res, result);
});

const adminRevokeUserSess = asyncHandler(async (req: Request, res: Response) => {
  const count = await adminRevokeUserAllSessions(req.params.userId);
  sendSuccess(res, { revoked: count });
});

const adminListActive = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminListActiveSessions(req.query.page, req.query.limit);
  sendSuccess(res, result);
});

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router();

/** @route GET /api/v1/sessions/me — List own active sessions */
router.get('/me', authenticate, getMySess);

/** @route DELETE /api/v1/sessions/me — Revoke ALL own sessions */
router.delete('/me', authenticate, revokeAllSess);

/** @route DELETE /api/v1/sessions/me/:sessionId — Revoke one session */
router.delete('/me/:sessionId', authenticate, validateUuidParam('sessionId'), revokeOneSess);

/** @route GET /api/v1/sessions — Admin: list all active sessions */
router.get('/', authenticate, authorize('admin'), adminListActive);

/** @route GET /api/v1/sessions/user/:userId — Admin: get user sessions */
router.get('/user/:userId', authenticate, authorize('admin'), validateUuidParam('userId'), adminGetUserSess);

/** @route DELETE /api/v1/sessions/user/:userId — Admin: revoke all user sessions */
router.delete('/user/:userId', authenticate, authorize('admin'), validateUuidParam('userId'), adminRevokeUserSess);

export default router;
