import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../../config/database';
import { sendSuccess } from '../../utils/response';
import { asyncHandler } from '../../utils/errors';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { zodBody } from '../../middleware/validate.middleware';
import { parsePagination, buildMeta, ADMIN_ACTIONS } from '../../utils/helpers';
import { AuditLog } from '../../types';

// ── Service ───────────────────────────────────────────────────────────────────

async function listAuditLog(opts: {
  page: unknown; limit: unknown;
  adminId?: string; targetId?: string;
  action?: string; targetType?: string;
  dateFrom?: string; dateTo?: string;
}) {
  const { limit: lim, offset, page: p } = parsePagination(opts.page, opts.limit, 100);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (opts.adminId)    { conditions.push(`al.admin_id = $${idx++}`);              params.push(opts.adminId); }
  if (opts.targetId)   { conditions.push(`al.target_id = $${idx++}`);             params.push(opts.targetId); }
  if (opts.action)     { conditions.push(`al.action = $${idx++}::admin_action`);  params.push(opts.action); }
  if (opts.targetType) { conditions.push(`al.target_type = $${idx++}`);           params.push(opts.targetType); }
  if (opts.dateFrom)   { conditions.push(`al.created_at >= $${idx++}`);           params.push(opts.dateFrom); }
  if (opts.dateTo)     { conditions.push(`al.created_at <= $${idx++}`);           params.push(opts.dateTo); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows, countRow] = await Promise.all([
    query<AuditLog>(
      `SELECT al.*, u.handle AS admin_handle
       FROM audit_log al
       LEFT JOIN users u ON u.id = al.admin_id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, lim, offset]
    ),
    queryOne<{ total: string }>(
      `SELECT COUNT(*) AS total FROM audit_log al ${where}`,
      params
    ),
  ]);

  return { logs: rows.rows, ...buildMeta(parseInt(countRow?.total ?? '0', 10), p, lim) };
}

async function getAuditLogById(logId: string): Promise<AuditLog> {
  const log = await queryOne<AuditLog>(
    `SELECT al.*, u.handle AS admin_handle
     FROM audit_log al LEFT JOIN users u ON u.id = al.admin_id
     WHERE al.id = $1`,
    [logId]
  );
  if (!log) throw new Error('Audit log entry not found');
  return log;
}

// Admin can manually append audit entries (e.g. for rotate_secret actions)
async function appendAuditEntry(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  reason?: string,
  previousValue?: Record<string, unknown>,
  metadata?: Record<string, unknown>
): Promise<AuditLog> {
  const result = await query<AuditLog>(
    `INSERT INTO audit_log (admin_id, action, target_type, target_id, reason, previous_value, metadata)
     VALUES ($1, $2::admin_action, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      adminId, action, targetType, targetId,
      reason ?? null,
      previousValue ? JSON.stringify(previousValue) : null,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );
  return result.rows[0];
}

async function getAuditSummary() {
  const result = await query(
    `SELECT
       action,
       COUNT(*) AS count,
       COUNT(DISTINCT admin_id) AS unique_admins,
       MAX(created_at) AS last_occurrence
     FROM audit_log
     GROUP BY action
     ORDER BY count DESC`
  );
  return result.rows;
}

// ── Controllers ───────────────────────────────────────────────────────────────

const listLogs = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, admin_id, target_id, action, target_type, date_from, date_to } = req.query;
  const result = await listAuditLog({
    page, limit,
    adminId: admin_id as string,
    targetId: target_id as string,
    action: action as string,
    targetType: target_type as string,
    dateFrom: date_from as string,
    dateTo: date_to as string,
  });
  sendSuccess(res, result);
});

const getLog = asyncHandler(async (req: Request, res: Response) => {
  const log = await getAuditLogById(req.params.logId);
  sendSuccess(res, log);
});

const appendLog = asyncHandler(async (req: Request, res: Response) => {
  const { action, target_type, target_id, reason, previous_value, metadata } = req.body as {
    action: string; target_type: string; target_id: string;
    reason?: string; previous_value?: Record<string, unknown>; metadata?: Record<string, unknown>;
  };
  const log = await appendAuditEntry(
    req.user!.id, action, target_type, target_id, reason, previous_value, metadata
  );
  sendSuccess(res, log, 201);
});

const getSummary = asyncHandler(async (_req: Request, res: Response) => {
  const summary = await getAuditSummary();
  sendSuccess(res, summary);
});

// ── Schema ────────────────────────────────────────────────────────────────────

const appendSchema = z.object({
  action: z.enum(ADMIN_ACTIONS as [string, ...string[]]),
  target_type: z.enum(['post', 'user', 'place', 'secret']),
  target_id: z.string().min(1),
  reason: z.string().max(500).optional(),
  previous_value: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router();

// All audit routes: admin only
router.use(authenticate, authorize('admin'));

/** @route GET /api/v1/audit — List audit log entries (filterable) */
router.get('/', listLogs);

/** @route GET /api/v1/audit/summary — Action counts summary */
router.get('/summary', getSummary);

/** @route GET /api/v1/audit/:logId */
router.get('/:logId', getLog);

/** @route POST /api/v1/audit — Manually append audit entry */
router.post('/', zodBody(appendSchema), appendLog);

export default router;
