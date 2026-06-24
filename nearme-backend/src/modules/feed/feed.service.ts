import { query, queryOne } from '../../config/database';
import { AppError } from '../../utils/errors';
import { RankedFeedItem, VibeTag, PlaceCategory } from '../../types';
import { toGeohash6, isValidCoordinate } from '../../utils/helpers';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

// ── Get ranked feed ───────────────────────────────────────────────────────────

export interface FeedQuery {
  lat: number;
  lng: number;
  radius_km?: number;
  vibes?: VibeTag[];
  categories?: PlaceCategory[];
  price_min?: number;
  price_max?: number;
  limit?: number;
}

export async function getRankedFeed(
  userId: string,
  feedQuery: FeedQuery
): Promise<{ places: RankedFeedItem[]; cache_hit: boolean; algorithm_version: string }> {
  const {
    lat, lng,
    radius_km = 5,
    vibes = [],
    categories = [],
    price_min = 0,
    price_max = 4,
    limit = env.FEED_MAX_RESULTS,
  } = feedQuery;

  if (!isValidCoordinate(lat, lng)) {
    throw AppError.badRequest('Invalid coordinates');
  }

  // Build PostgreSQL arrays from JS arrays
  const vibesArray = vibes.length ? `{${vibes.join(',')}}` : '{}';
  const categoriesArray = categories.length ? `{${categories.join(',')}}` : '{}';
  const priceRange = [price_min, price_max];

  const start = Date.now();

  // Call the DB ranking function — lat/lng are EPHEMERAL, never persisted
  const result = await query<RankedFeedItem>(
    `SELECT * FROM fn_get_ranked_feed($1, $2, $3, $4::vibe_tag[], $5::place_category[], $6, $7)`,
    [lat, lng, radius_km, vibesArray, categoriesArray, priceRange, Math.min(limit, 100)]
  );

  const places = result.rows;
  const duration = Date.now() - start;
  const cacheHit = duration < 50; // heuristic: fast response = cache hit

  // Log to feed_ranking_log — geohash6 only (GDPR-safe)
  const geohash = toGeohash6(lat, lng);
  query(
    `INSERT INTO feed_ranking_log
       (user_id, query_geohash6, algorithm_version, cache_hit, place_count, scores_snapshot)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      userId,
      geohash,
      '1.0',
      cacheHit,
      places.length,
      places.length > 0 ? JSON.stringify(places.map(p => ({ place_id: p.place_id, score: p.score }))) : null,
    ]
  ).catch(err => logger.warn({ err }, 'Failed to write feed_ranking_log'));

  return { places, cache_hit: cacheHit, algorithm_version: '1.0' };
}

// ── Get active algorithm config ───────────────────────────────────────────────

export async function getAlgorithmConfig() {
  const config = await queryOne(
    'SELECT * FROM algorithm_config WHERE is_active = TRUE LIMIT 1'
  );
  if (!config) throw AppError.notFound('Algorithm config');
  return config;
}

// ── Admin: update algorithm weights ──────────────────────────────────────────

export async function updateAlgorithmConfig(
  version: string,
  weights: Record<string, number>,
  deployedBy: string
) {
  // Deactivate all existing
  await query('UPDATE algorithm_config SET is_active = FALSE');

  // Insert new version
  await query(
    `INSERT INTO algorithm_config (version, weights, is_active, deployed_by)
     VALUES ($1, $2, TRUE, $3)
     ON CONFLICT (version) DO UPDATE
       SET weights = EXCLUDED.weights,
           is_active = TRUE,
           deployed_at = now(),
           deployed_by = EXCLUDED.deployed_by`,
    [version, JSON.stringify(weights), deployedBy]
  );

  logger.info({ version, deployedBy }, 'Algorithm config updated');
  return getAlgorithmConfig();
}

// ── Get all algorithm versions ────────────────────────────────────────────────

export async function listAlgorithmVersions() {
  const result = await query(
    'SELECT * FROM algorithm_config ORDER BY deployed_at DESC'
  );
  return result.rows;
}

// ── Feed ranking log analytics (admin) ───────────────────────────────────────

export async function getFeedAnalytics(days = 7) {
  const result = await query(
    `SELECT
       DATE_TRUNC('day', generated_at) AS day,
       COUNT(*) AS feed_requests,
       AVG(place_count)::NUMERIC(6,2) AS avg_places,
       SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) AS cache_hits
     FROM feed_ranking_log
     WHERE generated_at > now() - ($1 || ' days')::INTERVAL
     GROUP BY 1
     ORDER BY 1 DESC`,
    [days]
  );
  return result.rows;
}
