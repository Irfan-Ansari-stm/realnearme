import { Router, Request, Response } from 'express';
import { query } from '../../config/database';
import { sendSuccess, sendNoContent } from '../../utils/response';
import { asyncHandler, AppError } from '../../utils/errors';
import { authenticate } from '../../middleware/auth.middleware';
import { searchRateLimit } from '../../middleware/rateLimit.middleware';
import { validateUuidParam } from '../../middleware/validate.middleware';
import { env } from '../../config/env';
import { SearchHistory } from '../../types';

// ── Service ───────────────────────────────────────────────────────────────────

async function saveSearchHistory(userId: string, searchQuery: string): Promise<void> {
  await query(
    `INSERT INTO search_history (user_id, query) VALUES ($1, $2)`,
    [userId, searchQuery.trim().slice(0, 200)]
  );
  // Trim to max (e.g. 10) using stored procedure
  await query('CALL proc_trim_search_history($1)', [userId]).catch(() => {});
}

async function getSearchHistory(userId: string): Promise<SearchHistory[]> {
  const result = await query<SearchHistory>(
    `SELECT * FROM search_history WHERE user_id = $1
     ORDER BY searched_at DESC LIMIT $2`,
    [userId, env.SEARCH_HISTORY_MAX]
  );
  return result.rows;
}

async function deleteSearchHistoryItem(userId: string, id: string): Promise<void> {
  const result = await query(
    'DELETE FROM search_history WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  if ((result.rowCount ?? 0) === 0) throw AppError.notFound('Search history item');
}

async function clearSearchHistory(userId: string): Promise<void> {
  await query('DELETE FROM search_history WHERE user_id = $1', [userId]);
}

// Combined search across places + posts
async function globalSearch(searchQuery: string, userId: string) {
  const q = `%${searchQuery}%`;

  const [places, posts] = await Promise.all([
    query(
      `SELECT 'place' AS result_type, place_id AS id, name AS title,
              category, formatted_address AS subtitle, rating,
              photo_urls[1] AS thumbnail
       FROM places_cache
       WHERE name ILIKE $1 AND expires_at > now()
       ORDER BY similarity(name, $2) DESC, save_count DESC
       LIMIT 10`,
      [q, searchQuery]
    ),
    query(
      `SELECT 'post' AS result_type, p.id, p.caption AS title,
              p.category, p.place_id AS subtitle, p.storage_ref AS thumbnail,
              p.like_count
       FROM v_approved_posts p
       WHERE p.caption ILIKE $1
       ORDER BY p.created_at DESC
       LIMIT 10`,
      [q]
    ),
  ]);

  // Persist to search history (non-blocking)
  saveSearchHistory(userId, searchQuery).catch(() => {});

  return {
    places: places.rows,
    posts: posts.rows,
    query: searchQuery,
  };
}

// ── Controllers ───────────────────────────────────────────────────────────────

const search = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query.q as string;
  if (!q || q.trim().length < 2) {
    throw AppError.badRequest('Query parameter "q" must be at least 2 characters');
  }
  const result = await globalSearch(q.trim(), req.user!.id);
  sendSuccess(res, result);
});

const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const history = await getSearchHistory(req.user!.id);
  sendSuccess(res, history);
});

const deleteHistoryItem = asyncHandler(async (req: Request, res: Response) => {
  await deleteSearchHistoryItem(req.user!.id, req.params.id);
  sendNoContent(res);
});

const clearHistory = asyncHandler(async (req: Request, res: Response) => {
  await clearSearchHistory(req.user!.id);
  sendNoContent(res);
});

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router();

/** @route GET /api/v1/search?q=... — Global search */
router.get('/', authenticate, searchRateLimit, search);

/** @route GET /api/v1/search/history — Get recent searches */
router.get('/history', authenticate, getHistory);

/** @route DELETE /api/v1/search/history — Clear all search history */
router.delete('/history', authenticate, clearHistory);

/** @route DELETE /api/v1/search/history/:id — Delete one search history item */
router.delete('/history/:id', authenticate, validateUuidParam('id'), deleteHistoryItem);

export default router;
