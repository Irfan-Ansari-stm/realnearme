import { query, queryOne } from '../../config/database';
import { AppError } from '../../utils/errors';
import { Save, PlaceCategory } from '../../types';
import { parsePagination, buildMeta } from '../../utils/helpers';

// ── Save (bookmark) a place ───────────────────────────────────────────────────

export interface SavePlaceInput {
  place_id: string;
  name: string;
  category: PlaceCategory;
  photo_url?: string;
  rating?: number;
  distance_km?: number;
}

export async function savePlace(
  userId: string,
  input: SavePlaceInput
): Promise<{ created: boolean; save?: Save }> {
  const result = await queryOne<{ fn_upsert_save: boolean }>(
    `SELECT fn_upsert_save($1, $2, $3, $4::place_category, $5, $6, $7) AS fn_upsert_save`,
    [
      userId,
      input.place_id,
      input.name,
      input.category,
      input.photo_url ?? null,
      input.rating ?? null,
      input.distance_km ?? null,
    ]
  );

  const created = result?.fn_upsert_save ?? false;

  if (!created) {
    return { created: false };
  }

  const save = await queryOne<Save>(
    'SELECT * FROM saves WHERE user_id = $1 AND place_id = $2',
    [userId, input.place_id]
  );

  return { created: true, save: save ?? undefined };
}

// ── Remove a save ─────────────────────────────────────────────────────────────

export async function unsavePlace(userId: string, placeId: string): Promise<boolean> {
  const result = await queryOne<{ fn_unsave: boolean }>(
    'SELECT fn_unsave($1, $2) AS fn_unsave',
    [userId, placeId]
  );
  return result?.fn_unsave ?? false;
}

// ── Check if saved ────────────────────────────────────────────────────────────

export async function isSaved(userId: string, placeId: string): Promise<boolean> {
  const result = await queryOne<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM saves WHERE user_id = $1 AND place_id = $2) AS exists',
    [userId, placeId]
  );
  return result?.exists ?? false;
}

// ── Get saved places (paginated) ──────────────────────────────────────────────

export async function getMySaves(
  userId: string,
  page: unknown,
  limit: unknown,
  category?: string
) {
  const { limit: lim, offset, page: p } = parsePagination(page, limit, 100);
  const params: unknown[] = [userId];
  let paramIdx = 2;
  let categoryClause = '';

  if (category) {
    categoryClause = `AND category = $${paramIdx}::place_category`;
    params.push(category); paramIdx++;
  }

  const [rows, countRow] = await Promise.all([
    query<Save>(
      `SELECT * FROM saves WHERE user_id = $1 ${categoryClause}
       ORDER BY saved_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, lim, offset]
    ),
    queryOne<{ total: string }>(
      `SELECT COUNT(*) AS total FROM saves WHERE user_id = $1 ${categoryClause}`,
      params
    ),
  ]);

  return {
    saves: rows.rows,
    ...buildMeta(parseInt(countRow?.total ?? '0', 10), p, lim),
  };
}

// ── Get a specific save ───────────────────────────────────────────────────────

export async function getSave(userId: string, placeId: string): Promise<Save> {
  const save = await queryOne<Save>(
    'SELECT * FROM saves WHERE user_id = $1 AND place_id = $2',
    [userId, placeId]
  );
  if (!save) throw AppError.notFound('Save');
  return save;
}

// ── Admin: saves analytics ────────────────────────────────────────────────────

export async function getSavesAnalytics() {
  const result = await query(
    `SELECT
       category,
       COUNT(*) AS total_saves,
       COUNT(DISTINCT user_id) AS unique_users,
       COUNT(DISTINCT place_id) AS unique_places
     FROM saves
     GROUP BY category
     ORDER BY total_saves DESC`
  );
  return result.rows;
}

// ── Get save count for a place ────────────────────────────────────────────────

export async function getPlaceSaveCount(placeId: string): Promise<number> {
  const result = await queryOne<{ count: string }>(
    'SELECT COUNT(*) AS count FROM saves WHERE place_id = $1',
    [placeId]
  );
  return parseInt(result?.count ?? '0', 10);
}
