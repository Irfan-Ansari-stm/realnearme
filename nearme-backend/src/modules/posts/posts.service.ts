import { query, queryOne, withTransaction } from '../../config/database';
import { AppError } from '../../utils/errors';
import { Post, PostStatus, PlaceCategory, VibeTag, MediaType } from '../../types';
import { parsePagination, buildMeta } from '../../utils/helpers';
import { logger } from '../../utils/logger';

// ── Create post ───────────────────────────────────────────────────────────────

export interface CreatePostInput {
  place_id: string;
  caption?: string;
  category: PlaceCategory;
  vibes?: VibeTag[];
  storage_ref: string;
  media_type: MediaType;
  safe_search_scores?: Record<string, string>;
}

export async function createPost(userId: string, input: CreatePostInput): Promise<Post> {
  // Validate place exists in cache
  const placeExists = await queryOne<{ place_id: string }>(
    'SELECT place_id FROM places_cache WHERE place_id = $1',
    [input.place_id]
  );
  if (!placeExists) throw AppError.badRequest('Place not found in cache. Upsert the place first.');

  const vibesArray = input.vibes?.length ? `{${input.vibes.join(',')}}` : '{}';

  // Determine initial status — auto-pass if safe search scores are clean
  let status: PostStatus = 'pending_moderation';
  if (input.safe_search_scores) {
    const unsafe = ['LIKELY', 'VERY_LIKELY'];
    const isClean = !Object.values(input.safe_search_scores).some(v => unsafe.includes(v));
    if (isClean) status = 'approved';
  }

  const result = await query<Post>(
    `INSERT INTO posts
       (user_id, place_id, caption, category, vibes, storage_ref, media_type, status, safe_search_scores)
     VALUES ($1, $2, $3, $4::place_category, $5::vibe_tag[], $6, $7::media_type, $8::post_status, $9)
     RETURNING *`,
    [
      userId,
      input.place_id,
      input.caption ?? null,
      input.category,
      vibesArray,
      input.storage_ref,
      input.media_type,
      status,
      input.safe_search_scores ? JSON.stringify(input.safe_search_scores) : null,
    ]
  );

  logger.info({ postId: result.rows[0].id, userId, status }, 'Post created');
  return result.rows[0];
}

// ── Get post by ID ────────────────────────────────────────────────────────────

export async function getPostById(postId: string, requestingUserId?: string): Promise<Post> {
  const post = await queryOne<Post>(
    `SELECT p.*, u.display_name AS author_name, u.handle AS author_handle, u.photo_url AS author_photo
     FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE p.id = $1
       AND p.deleted_at IS NULL
       AND (p.status = 'approved' OR p.user_id = $2)`,
    [postId, requestingUserId ?? null]
  );
  if (!post) throw AppError.notFound('Post');
  return post;
}

// ── Get posts for a place ─────────────────────────────────────────────────────

export async function getPostsForPlace(placeId: string, page: unknown, limit: unknown) {
  const { limit: lim, offset, page: p } = parsePagination(page, limit);

  const [rows, countRow] = await Promise.all([
    query<Post>(
      `SELECT p.id, p.place_id, p.caption, p.category, p.vibes, p.storage_ref,
              p.media_type, p.like_count, p.created_at,
              u.display_name AS author_name, u.handle AS author_handle, u.photo_url AS author_photo
       FROM v_approved_posts p
       JOIN users u ON u.id = p.author_id
       WHERE p.place_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [placeId, lim, offset]
    ),
    queryOne<{ total: string }>(
      `SELECT COUNT(*) AS total FROM posts WHERE place_id = $1 AND status = 'approved' AND deleted_at IS NULL`,
      [placeId]
    ),
  ]);

  return { posts: rows.rows, ...buildMeta(parseInt(countRow?.total ?? '0', 10), p, lim) };
}

// ── Get own posts ─────────────────────────────────────────────────────────────

export async function getMyPosts(userId: string, page: unknown, limit: unknown, status?: string) {
  const { limit: lim, offset, page: p } = parsePagination(page, limit);
  const params: unknown[] = [userId];
  let statusClause = '';
  if (status) {
    statusClause = `AND status = $2::post_status`;
    params.push(status);
  }

  const [rows, countRow] = await Promise.all([
    query<Post>(
      `SELECT * FROM posts
       WHERE user_id = $1 ${statusClause} AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, lim, offset]
    ),
    queryOne<{ total: string }>(
      `SELECT COUNT(*) AS total FROM posts WHERE user_id = $1 ${statusClause} AND deleted_at IS NULL`,
      params
    ),
  ]);

  return { posts: rows.rows, ...buildMeta(parseInt(countRow?.total ?? '0', 10), p, lim) };
}

// ── Soft delete post ──────────────────────────────────────────────────────────

export async function deletePost(postId: string, requestingUserId: string): Promise<void> {
  await query('SELECT fn_soft_delete_post($1, $2)', [postId, requestingUserId]);
}

// ── Like a post ───────────────────────────────────────────────────────────────

export async function likePost(userId: string, postId: string): Promise<{ liked: boolean }> {
  // Check post exists
  const post = await queryOne<{ id: string }>(
    `SELECT id FROM posts WHERE id = $1 AND status = 'approved' AND deleted_at IS NULL`,
    [postId]
  );
  if (!post) throw AppError.notFound('Post');

  try {
    await query(
      'INSERT INTO post_likes (user_id, post_id) VALUES ($1, $2)',
      [userId, postId]
    );

    // Create notification for post author
    await createLikeNotification(userId, postId).catch(err =>
      logger.warn({ err }, 'Failed to create like notification')
    );

    return { liked: true };
  } catch (err) {
    const pgErr = err as { code?: string };
    if (pgErr.code === '23505') {
      // Already liked
      return { liked: false };
    }
    throw err;
  }
}

// ── Unlike a post ─────────────────────────────────────────────────────────────

export async function unlikePost(userId: string, postId: string): Promise<{ unliked: boolean }> {
  const result = await query(
    'DELETE FROM post_likes WHERE user_id = $1 AND post_id = $2',
    [userId, postId]
  );
  return { unliked: (result.rowCount ?? 0) > 0 };
}

// ── Check if liked ────────────────────────────────────────────────────────────

export async function isLiked(userId: string, postId: string): Promise<boolean> {
  const result = await queryOne<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM post_likes WHERE user_id = $1 AND post_id = $2) AS exists',
    [userId, postId]
  );
  return result?.exists ?? false;
}

// ── Get post likes (who liked) ────────────────────────────────────────────────

export async function getPostLikes(postId: string, page: unknown, limit: unknown) {
  const { limit: lim, offset, page: p } = parsePagination(page, limit);

  const [rows, countRow] = await Promise.all([
    query(
      `SELECT pl.id, pl.created_at, u.id AS user_id, u.display_name, u.handle, u.photo_url
       FROM post_likes pl
       JOIN users u ON u.id = pl.user_id
       WHERE pl.post_id = $1
       ORDER BY pl.created_at DESC
       LIMIT $2 OFFSET $3`,
      [postId, lim, offset]
    ),
    queryOne<{ total: string }>(
      'SELECT COUNT(*) AS total FROM post_likes WHERE post_id = $1',
      [postId]
    ),
  ]);

  return { likes: rows.rows, ...buildMeta(parseInt(countRow?.total ?? '0', 10), p, lim) };
}

// ── Moderation: approve/reject post ──────────────────────────────────────────

export async function moderatePost(
  postId: string,
  moderatorId: string,
  action: 'approve' | 'reject',
  reason?: string
): Promise<Post> {
  const newStatus: PostStatus = action === 'approve' ? 'approved' : 'rejected';

  return withTransaction(async (client) => {
    const post = await queryOne<Post>(
      `SELECT * FROM posts WHERE id = $1 AND deleted_at IS NULL`,
      [postId]
    );
    if (!post) throw AppError.notFound('Post');

    const updated = await client.query<Post>(
      `UPDATE posts SET status = $1::post_status, moderated_at = now(), moderated_by = $2, updated_at = now()
       WHERE id = $3 RETURNING *`,
      [newStatus, moderatorId, postId]
    );

    // Audit log
    await client.query(
      `INSERT INTO audit_log (admin_id, action, target_type, target_id, reason, previous_value)
       VALUES ($1, $2, 'post', $3, $4, $5)`,
      [
        moderatorId,
        action === 'approve' ? 'approve_post' : 'reject_post',
        postId,
        reason ?? null,
        JSON.stringify({ status: post.status }),
      ]
    );

    logger.info({ postId, moderatorId, action }, 'Post moderated');
    return updated.rows[0];
  });
}

// ── Admin: moderation queue ───────────────────────────────────────────────────

export async function getModerationQueue(page: unknown, limit: unknown) {
  const { limit: lim, offset, page: p } = parsePagination(page, limit, 50);

  const [rows, countRow] = await Promise.all([
    query(
      `SELECT * FROM v_moderation_queue LIMIT $1 OFFSET $2`,
      [lim, offset]
    ),
    queryOne<{ total: string }>(
      `SELECT COUNT(*) AS total FROM posts
       WHERE (status = 'pending_moderation' OR (status = 'approved' AND report_count >= 3))
         AND deleted_at IS NULL`
    ),
  ]);

  return { posts: rows.rows, ...buildMeta(parseInt(countRow?.total ?? '0', 10), p, lim) };
}

// ── Admin: list all posts ─────────────────────────────────────────────────────

export async function adminListPosts(page: unknown, limit: unknown, status?: string, placeId?: string) {
  const { limit: lim, offset, page: p } = parsePagination(page, limit, 100);
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  let idx = 1;

  if (status) { conditions.push(`status = $${idx}::post_status`); params.push(status); idx++; }
  if (placeId) { conditions.push(`place_id = $${idx}`); params.push(placeId); idx++; }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [rows, countRow] = await Promise.all([
    query(
      `SELECT p.*, u.handle AS author_handle FROM posts p
       JOIN users u ON u.id = p.user_id
       ${where} ORDER BY p.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, lim, offset]
    ),
    queryOne<{ total: string }>(`SELECT COUNT(*) AS total FROM posts ${where}`, params),
  ]);

  return { posts: rows.rows, ...buildMeta(parseInt(countRow?.total ?? '0', 10), p, lim) };
}

// ── Internal: create like notification ────────────────────────────────────────

async function createLikeNotification(likerId: string, postId: string): Promise<void> {
  const data = await queryOne<{ user_id: string; display_name: string }>(
    `SELECT p.user_id, u.display_name
     FROM posts p JOIN users u ON u.id = $1
     WHERE p.id = $2 AND p.user_id != $1`,
    [likerId, postId]
  );
  if (!data) return;

  await query(
    `INSERT INTO notifications (recipient_id, type, actor_id, actor_name, post_id, title, body)
     VALUES ($1, 'like', $2, $3, $4, 'New Like', $5)`,
    [
      data.user_id, likerId, data.display_name, postId,
      `${data.display_name} liked your post`,
    ]
  );
}
