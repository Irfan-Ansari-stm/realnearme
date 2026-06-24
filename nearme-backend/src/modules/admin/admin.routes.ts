import { Router, Request, Response } from 'express';
import { query, queryOne } from '../../config/database';
import { sendSuccess } from '../../utils/response';
import { asyncHandler } from '../../utils/errors';
import { authenticate, authorize } from '../../middleware/auth.middleware';

// ── Service ───────────────────────────────────────────────────────────────────

async function getDashboardStats() {
  const [
    userStats,
    postStats,
    placeStats,
    saveStats,
    reportStats,
    sessionStats,
    notifStats,
    recentActivity,
  ] = await Promise.all([
    // User stats
    queryOne<Record<string, string>>(
      `SELECT
         COUNT(*) AS total_users,
         COUNT(*) FILTER (WHERE is_active = TRUE) AS active_users,
         COUNT(*) FILTER (WHERE is_active = FALSE) AS banned_users,
         COUNT(*) FILTER (WHERE role = 'admin') AS admin_count,
         COUNT(*) FILTER (WHERE role = 'moderator') AS moderator_count,
         COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '24 hours') AS new_today,
         COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '7 days') AS new_this_week,
         COUNT(*) FILTER (WHERE deletion_requested_at IS NOT NULL) AS pending_deletion
       FROM users`
    ),

    // Post stats
    queryOne<Record<string, string>>(
      `SELECT
         COUNT(*) AS total_posts,
         COUNT(*) FILTER (WHERE status = 'pending_moderation' AND deleted_at IS NULL) AS pending_moderation,
         COUNT(*) FILTER (WHERE status = 'approved' AND deleted_at IS NULL) AS approved_posts,
         COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_posts,
         COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) AS deleted_posts,
         COUNT(*) FILTER (WHERE status = 'approved' AND report_count >= 3 AND deleted_at IS NULL) AS flagged_posts,
         COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '24 hours') AS new_today
       FROM posts`
    ),

    // Place cache stats
    queryOne<Record<string, string>>(
      `SELECT
         COUNT(*) AS total_places,
         COUNT(*) FILTER (WHERE expires_at > now()) AS active_places,
         COUNT(*) FILTER (WHERE expires_at <= now()) AS expired_places,
         COUNT(*) FILTER (WHERE has_ugc_photo = TRUE) AS places_with_ugc,
         AVG(save_count)::NUMERIC(6,2) AS avg_saves_per_place
       FROM places_cache`
    ),

    // Save stats
    queryOne<Record<string, string>>(
      `SELECT
         COUNT(*) AS total_saves,
         COUNT(DISTINCT user_id) AS users_with_saves,
         COUNT(DISTINCT place_id) AS saved_places,
         COUNT(*) FILTER (WHERE saved_at > now() - INTERVAL '24 hours') AS saves_today
       FROM saves`
    ),

    // Report stats
    queryOne<Record<string, string>>(
      `SELECT
         COUNT(*) AS total_reports,
         COUNT(*) FILTER (WHERE status = 'pending') AS pending_reports,
         COUNT(*) FILTER (WHERE status = 'reviewed_removed') AS removed_posts,
         COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '24 hours') AS new_today
       FROM reports`
    ),

    // Session stats
    queryOne<Record<string, string>>(
      `SELECT
         COUNT(*) AS total_sessions,
         COUNT(*) FILTER (WHERE is_revoked = FALSE AND expires_at > now()) AS active_sessions,
         COUNT(*) FILTER (WHERE is_revoked = TRUE) AS revoked_sessions
       FROM user_sessions`
    ),

    // Notification stats
    queryOne<Record<string, string>>(
      `SELECT
         COUNT(*) AS total_notifications,
         COUNT(*) FILTER (WHERE is_read = FALSE) AS unread_notifications,
         COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '24 hours') AS sent_today
       FROM notifications`
    ),

    // Recent activity from audit log
    query(
      `SELECT al.action, al.target_type, al.target_id, al.created_at, u.handle AS admin_handle
       FROM audit_log al
       LEFT JOIN users u ON u.id = al.admin_id
       ORDER BY al.created_at DESC LIMIT 10`
    ),
  ]);

  return {
    users: userStats,
    posts: postStats,
    places: placeStats,
    saves: saveStats,
    reports: reportStats,
    sessions: sessionStats,
    notifications: notifStats,
    recent_activity: recentActivity.rows,
  };
}

async function getRateLimitStats() {
  const result = await query(
    `SELECT
       endpoint,
       COUNT(DISTINCT user_id) AS unique_users,
       SUM(count) AS total_requests,
       AVG(count)::NUMERIC(6,2) AS avg_requests_per_user,
       MAX(count) AS max_requests_per_user,
       COUNT(*) FILTER (WHERE window_end > now()) AS active_windows
     FROM rate_limit_counters
     GROUP BY endpoint
     ORDER BY total_requests DESC`
  );
  return result.rows;
}

async function getUserGrowth(days = 30) {
  const result = await query(
    `SELECT
       DATE_TRUNC('day', created_at) AS day,
       COUNT(*) AS new_users,
       SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('day', created_at)) AS cumulative_users
     FROM users
     WHERE created_at > now() - ($1 || ' days')::INTERVAL
     GROUP BY 1
     ORDER BY 1 DESC`,
    [days]
  );
  return result.rows;
}

async function getPostTrends(days = 30) {
  const result = await query(
    `SELECT
       DATE_TRUNC('day', created_at) AS day,
       COUNT(*) AS total_posts,
       COUNT(*) FILTER (WHERE status = 'approved') AS approved,
       COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
       COUNT(*) FILTER (WHERE status = 'pending_moderation') AS pending,
       array_agg(DISTINCT category) AS categories
     FROM posts
     WHERE created_at > now() - ($1 || ' days')::INTERVAL
       AND deleted_at IS NULL
     GROUP BY 1
     ORDER BY 1 DESC`,
    [days]
  );
  return result.rows;
}

async function getTopPlaces(limit = 10) {
  const result = await query(
    `SELECT
       pc.place_id, pc.name, pc.category,
       pc.save_count, pc.like_count, pc.rating, pc.rating_count,
       pc.has_ugc_photo,
       COUNT(DISTINCT p.id) AS post_count
     FROM places_cache pc
     LEFT JOIN posts p ON p.place_id = pc.place_id AND p.status = 'approved' AND p.deleted_at IS NULL
     WHERE pc.expires_at > now()
     GROUP BY pc.place_id, pc.name, pc.category, pc.save_count, pc.like_count,
              pc.rating, pc.rating_count, pc.has_ugc_photo
     ORDER BY pc.save_count DESC, pc.rating DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

async function getSearchTrends(limit = 20) {
  const result = await query(
    `SELECT
       query,
       COUNT(*) AS search_count,
       COUNT(DISTINCT user_id) AS unique_users,
       MAX(searched_at) AS last_searched
     FROM search_history
     WHERE searched_at > now() - INTERVAL '7 days'
     GROUP BY query
     ORDER BY search_count DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

// ── Controllers ───────────────────────────────────────────────────────────────

const getDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await getDashboardStats();
  sendSuccess(res, stats);
});

const getRateLimits = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await getRateLimitStats();
  sendSuccess(res, stats);
});

const getUserGrowthCtrl = asyncHandler(async (req: Request, res: Response) => {
  const days = Math.min(parseInt(req.query.days as string) || 30, 365);
  const data = await getUserGrowth(days);
  sendSuccess(res, data);
});

const getPostTrendsCtrl = asyncHandler(async (req: Request, res: Response) => {
  const days = Math.min(parseInt(req.query.days as string) || 30, 365);
  const data = await getPostTrends(days);
  sendSuccess(res, data);
});

const getTopPlacesCtrl = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const data = await getTopPlaces(limit);
  sendSuccess(res, data);
});

const getSearchTrendsCtrl = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const data = await getSearchTrends(limit);
  sendSuccess(res, data);
});

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router();

router.use(authenticate, authorize('admin', 'moderator'));

/** @route GET /api/v1/admin/dashboard — Aggregated stats across all tables */
router.get('/dashboard', getDashboard);

/** @route GET /api/v1/admin/rate-limits — Rate limit usage by endpoint */
router.get('/rate-limits', authorize('admin'), getRateLimits);

/** @route GET /api/v1/admin/analytics/users — User growth over time */
router.get('/analytics/users', authorize('admin'), getUserGrowthCtrl);

/** @route GET /api/v1/admin/analytics/posts — Post volume trends */
router.get('/analytics/posts', getPostTrendsCtrl);

/** @route GET /api/v1/admin/analytics/places — Top places by saves */
router.get('/analytics/places', getTopPlacesCtrl);

/** @route GET /api/v1/admin/analytics/search — Search query trends */
router.get('/analytics/search', getSearchTrendsCtrl);

export default router;
