import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne, withTransaction } from '../../config/database';
import { AppError } from '../../utils/errors';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/response';
import { asyncHandler } from '../../utils/errors';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { zodBody, validateUuidParam } from '../../middleware/validate.middleware';
import { reportsRateLimit } from '../../middleware/rateLimit.middleware';
import { parsePagination, buildMeta, REPORT_REASONS } from '../../utils/helpers';
import { Report } from '../../types';

// ── Service ───────────────────────────────────────────────────────────────────

export async function submitReport(
  reporterId: string,
  postId: string,
  reason: string,
  description?: string
): Promise<{ report_id: string }> {
  const result = await queryOne<{ fn_submit_report: string }>(
    `SELECT fn_submit_report($1, $2, $3::report_reason, $4) AS fn_submit_report`,
    [reporterId, postId, reason, description ?? null]
  );
  return { report_id: result!.fn_submit_report };
}

export async function getMyReports(userId: string, page: unknown, limit: unknown) {
  const { limit: lim, offset, page: p } = parsePagination(page, limit);
  const [rows, countRow] = await Promise.all([
    query<Report>(
      `SELECT r.*, p.caption, p.media_type FROM reports r
       JOIN posts p ON p.id = r.post_id
       WHERE r.reporter_id = $1
       ORDER BY r.created_at DESC LIMIT $2 OFFSET $3`,
      [userId, lim, offset]
    ),
    queryOne<{ total: string }>('SELECT COUNT(*) AS total FROM reports WHERE reporter_id = $1', [userId]),
  ]);
  return { reports: rows.rows, ...buildMeta(parseInt(countRow?.total ?? '0', 10), p, lim) };
}

export async function adminListReports(page: unknown, limit: unknown, status?: string) {
  const { limit: lim, offset, page: p } = parsePagination(page, limit, 50);
  const params: unknown[] = [];
  let statusClause = '';
  if (status) { statusClause = 'WHERE r.status = $1::report_status'; params.push(status); }

  const [rows, countRow] = await Promise.all([
    query(
      `SELECT r.*, u.handle AS reporter_handle, p.caption, p.storage_ref
       FROM reports r
       JOIN users u ON u.id = r.reporter_id
       JOIN posts p ON p.id = r.post_id
       ${statusClause}
       ORDER BY r.created_at ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, lim, offset]
    ),
    queryOne<{ total: string }>(
      `SELECT COUNT(*) AS total FROM reports r ${statusClause}`,
      params
    ),
  ]);
  return { reports: rows.rows, ...buildMeta(parseInt(countRow?.total ?? '0', 10), p, lim) };
}

export async function resolveReport(
  reportId: string,
  reviewerId: string,
  action: 'reviewed_approved' | 'reviewed_removed',
  reason?: string
): Promise<void> {
  await withTransaction(async (client) => {
    const report = await queryOne<Report>(
      'SELECT * FROM reports WHERE id = $1 AND status = $2',
      [reportId, 'pending']
    );
    if (!report) throw AppError.notFound('Report or already resolved');

    await client.query(
      `UPDATE reports
       SET status = $1::report_status, reviewed_by = $2, reviewed_at = now()
       WHERE id = $3`,
      [action, reviewerId, reportId]
    );

    // If removing: soft-delete the post
    if (action === 'reviewed_removed') {
      await client.query('SELECT fn_soft_delete_post($1, $2)', [report.post_id, reviewerId]);
    }

    await client.query(
      `INSERT INTO audit_log (admin_id, action, target_type, target_id, reason)
       VALUES ($1, 'resolve_report', 'post', $2, $3)`,
      [reviewerId, report.post_id, reason ?? action]
    );
  });
}

// ── Controllers ───────────────────────────────────────────────────────────────

const submitReportCtrl = asyncHandler(async (req: Request, res: Response) => {
  const { post_id, reason, description } = req.body as { post_id: string; reason: string; description?: string };
  const result = await submitReport(req.user!.id, post_id, reason, description);
  sendCreated(res, result);
});

const getMyReportsCtrl = asyncHandler(async (req: Request, res: Response) => {
  const result = await getMyReports(req.user!.id, req.query.page, req.query.limit);
  sendSuccess(res, result);
});

const adminListReportsCtrl = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminListReports(req.query.page, req.query.limit, req.query.status as string);
  sendSuccess(res, result);
});

const resolveReportCtrl = asyncHandler(async (req: Request, res: Response) => {
  const { action, reason } = req.body as { action: 'reviewed_approved' | 'reviewed_removed'; reason?: string };
  await resolveReport(req.params.reportId, req.user!.id, action, reason);
  sendNoContent(res);
});

// ── Router ────────────────────────────────────────────────────────────────────

const reportSchema = z.object({
  post_id: z.string().uuid(),
  reason: z.enum(REPORT_REASONS as [string, ...string[]]),
  description: z.string().max(500).optional(),
});

const resolveSchema = z.object({
  action: z.enum(['reviewed_approved', 'reviewed_removed']),
  reason: z.string().max(500).optional(),
});

const router = Router();

/** @route POST /api/v1/reports */
router.post('/', authenticate, reportsRateLimit, zodBody(reportSchema), submitReportCtrl);

/** @route GET /api/v1/reports/me */
router.get('/me', authenticate, getMyReportsCtrl);

/** @route GET /api/v1/reports — Admin: list all */
router.get('/', authenticate, authorize('admin', 'moderator'), adminListReportsCtrl);

/** @route PATCH /api/v1/reports/:reportId/resolve */
router.patch(
  '/:reportId/resolve',
  authenticate,
  authorize('admin', 'moderator'),
  validateUuidParam('reportId'),
  zodBody(resolveSchema),
  resolveReportCtrl
);

export default router;
