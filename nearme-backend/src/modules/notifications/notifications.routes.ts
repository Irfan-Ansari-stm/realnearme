import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../../config/database';
import { AppError } from '../../utils/errors';
import { sendSuccess, sendNoContent } from '../../utils/response';
import { asyncHandler } from '../../utils/errors';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { zodBody, validateUuidParam } from '../../middleware/validate.middleware';
import { parsePagination, buildMeta, NOTIFICATION_TYPES } from '../../utils/helpers';
import { Notification, NotificationType } from '../../types';

// ── Service ───────────────────────────────────────────────────────────────────

export async function getMyNotifications(userId: string, page: unknown, limit: unknown, unreadOnly?: boolean) {
  const { limit: lim, offset, page: p } = parsePagination(page, limit, 50);
  const unreadClause = unreadOnly ? 'AND is_read = FALSE' : '';

  const [rows, countRow, unreadCount] = await Promise.all([
    query<Notification>(
      `SELECT * FROM notifications
       WHERE recipient_id = $1 ${unreadClause}
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, lim, offset]
    ),
    queryOne<{ total: string }>(
      `SELECT COUNT(*) AS total FROM notifications WHERE recipient_id = $1 ${unreadClause}`,
      [userId]
    ),
    queryOne<{ count: string }>(
      `SELECT COUNT(*) AS count FROM notifications WHERE recipient_id = $1 AND is_read = FALSE`,
      [userId]
    ),
  ]);

  return {
    notifications: rows.rows,
    unread_count: parseInt((unreadCount as { count?: string } | null)?.count ?? '0', 10),
    ...buildMeta(parseInt(countRow?.total ?? '0', 10), p, lim),
  };
}

export async function markAllRead(userId: string): Promise<number> {
  const result = await query(
    'SELECT fn_mark_notifications_read($1)',
    [userId]
  );
  return result.rows[0]?.fn_mark_notifications_read ?? 0;
}

export async function markOneRead(userId: string, notifId: string): Promise<void> {
  const result = await query(
    `UPDATE notifications SET is_read = TRUE
     WHERE id = $1 AND recipient_id = $2`,
    [notifId, userId]
  );
  if ((result.rowCount ?? 0) === 0) throw AppError.notFound('Notification');
}

export async function deleteNotification(userId: string, notifId: string): Promise<void> {
  const result = await query(
    'DELETE FROM notifications WHERE id = $1 AND recipient_id = $2',
    [notifId, userId]
  );
  if ((result.rowCount ?? 0) === 0) throw AppError.notFound('Notification');
}

export async function clearAllNotifications(userId: string): Promise<number> {
  const result = await query(
    'DELETE FROM notifications WHERE recipient_id = $1',
    [userId]
  );
  return result.rowCount ?? 0;
}

// Admin: create system notification
export interface CreateNotificationInput {
  recipient_id: string;
  type: NotificationType;
  actor_id?: string;
  place_id?: string;
  post_id?: string;
  title: string;
  body: string;
}

export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
  let actorName: string | null = null;
  if (input.actor_id) {
    const actor = await queryOne<{ display_name: string }>('SELECT display_name FROM users WHERE id = $1', [input.actor_id]);
    actorName = actor?.display_name ?? null;
  }

  const result = await query<Notification>(
    `INSERT INTO notifications (recipient_id, type, actor_id, actor_name, place_id, post_id, title, body)
     VALUES ($1, $2::notification_type, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.recipient_id, input.type, input.actor_id ?? null, actorName,
      input.place_id ?? null, input.post_id ?? null, input.title, input.body,
    ]
  );
  return result.rows[0];
}

// ── Controllers ───────────────────────────────────────────────────────────────

const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, unread_only } = req.query;
  const result = await getMyNotifications(req.user!.id, page, limit, unread_only === 'true');
  sendSuccess(res, result);
});

const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const count = await markAllRead(req.user!.id);
  sendSuccess(res, { marked_read: count });
});

const markOneAsRead = asyncHandler(async (req: Request, res: Response) => {
  await markOneRead(req.user!.id, req.params.notifId);
  sendNoContent(res);
});

const deleteOneNotification = asyncHandler(async (req: Request, res: Response) => {
  await deleteNotification(req.user!.id, req.params.notifId);
  sendNoContent(res);
});

const clearAll = asyncHandler(async (req: Request, res: Response) => {
  const count = await clearAllNotifications(req.user!.id);
  sendSuccess(res, { deleted: count });
});

const adminCreateNotification = asyncHandler(async (req: Request, res: Response) => {
  const notif = await createNotification(req.body);
  sendSuccess(res, notif, 201);
});

// ── Router ────────────────────────────────────────────────────────────────────

const createNotifSchema = z.object({
  recipient_id: z.string().uuid(),
  type: z.enum(NOTIFICATION_TYPES as [string, ...string[]]),
  actor_id: z.string().uuid().optional(),
  place_id: z.string().optional(),
  post_id: z.string().uuid().optional(),
  title: z.string().min(1).max(80),
  body: z.string().min(1).max(200),
});

const router = Router();

/** @route GET /api/v1/notifications */
router.get('/', authenticate, getNotifications);

/** @route PATCH /api/v1/notifications/read-all */
router.patch('/read-all', authenticate, markAllAsRead);

/** @route DELETE /api/v1/notifications */
router.delete('/', authenticate, clearAll);

/** @route PATCH /api/v1/notifications/:notifId/read */
router.patch('/:notifId/read', authenticate, validateUuidParam('notifId'), markOneAsRead);

/** @route DELETE /api/v1/notifications/:notifId */
router.delete('/:notifId', authenticate, validateUuidParam('notifId'), deleteOneNotification);

/** @route POST /api/v1/notifications — Admin: push system notification */
router.post('/', authenticate, authorize('admin'), zodBody(createNotifSchema), adminCreateNotification);

export default router;
