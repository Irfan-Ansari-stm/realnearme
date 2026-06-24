import { query, queryOne, withTransaction } from '../../config/database';
import { AppError } from '../../utils/errors';
import { PlaceCache, PlaceDetailCache, PlaceCategory, VibeTag, PriceLevel } from '../../types';
import { parsePagination, buildMeta } from '../../utils/helpers';
import { env } from '../../config/env';

// ── Upsert place into cache ───────────────────────────────────────────────────

export interface UpsertPlaceInput {
  place_id: string;
  name: string;
  category: PlaceCategory;
  vibes?: VibeTag[];
  lat: number;
  lng: number;
  formatted_address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  rating_count?: number;
  price_level?: PriceLevel;
  open_now?: boolean;
  opening_hours?: unknown;
  photo_urls?: string[];
  source?: string;
}

export async function upsertPlace(input: UpsertPlaceInput): Promise<PlaceCache> {
  const expiresAt = new Date(
    Date.now() + env.FEED_CACHE_TTL_HOURS * 60 * 60 * 1000
  ).toISOString();

  const vibesArray = input.vibes?.length ? `{${input.vibes.join(',')}}` : '{}';
  const photoUrlsArray = input.photo_urls?.length
    ? `{${input.photo_urls.map(u => `"${u.replace(/"/g, '\\"')}"`).join(',')}}`
    : '{}';

  const result = await query<PlaceCache>(
    `INSERT INTO places_cache (
       place_id, name, category, vibes, location,
       formatted_address, phone, website, rating, rating_count,
       price_level, open_now, opening_hours, photo_urls, source, expires_at
     ) VALUES (
       $1, $2, $3::place_category, $4::vibe_tag[], ST_SetSRID(ST_MakePoint($5, $6), 4326)::GEOGRAPHY,
       $7, $8, $9, $10, $11, $12::price_level, $13, $14, $15, $16, $17
     )
     ON CONFLICT (place_id) DO UPDATE SET
       name             = EXCLUDED.name,
       category         = EXCLUDED.category,
       vibes            = EXCLUDED.vibes,
       location         = EXCLUDED.location,
       formatted_address= EXCLUDED.formatted_address,
       phone            = EXCLUDED.phone,
       website          = EXCLUDED.website,
       rating           = EXCLUDED.rating,
       rating_count     = EXCLUDED.rating_count,
       price_level      = EXCLUDED.price_level,
       open_now         = EXCLUDED.open_now,
       opening_hours    = EXCLUDED.opening_hours,
       photo_urls       = EXCLUDED.photo_urls,
       source           = EXCLUDED.source,
       expires_at       = EXCLUDED.expires_at,
       updated_at       = now()
     RETURNING *`,
    [
      input.place_id, input.name, input.category,
      vibesArray, input.lng, input.lat,
      input.formatted_address ?? null, input.phone ?? null, input.website ?? null,
      input.rating ?? null, input.rating_count ?? 0,
      input.price_level ?? null, input.open_now ?? null,
      input.opening_hours ? JSON.stringify(input.opening_hours) : null,
      photoUrlsArray,
      input.source ?? 'google_places',
      expiresAt,
    ]
  );

  return result.rows[0];
}

// ── Get place by place_id ─────────────────────────────────────────────────────

export async function getPlaceById(placeId: string): Promise<PlaceCache> {
  const place = await queryOne<PlaceCache>(
    `SELECT *,
       ST_Y(location::geometry) AS lat,
       ST_X(location::geometry) AS lng
     FROM places_cache
     WHERE place_id = $1`,
    [placeId]
  );
  if (!place) throw AppError.notFound('Place');
  return place;
}

// ── Search places (full-text trigram search) ──────────────────────────────────

export async function searchPlaces(
  searchQuery: string,
  page: unknown,
  limit: unknown,
  category?: string,
  vibes?: string
) {
  const { limit: lim, offset, page: p } = parsePagination(page, limit, 50);

  const conditions = ["name ILIKE $1", "expires_at > now()"];
  const params: unknown[] = [`%${searchQuery}%`];
  let paramIdx = 2;

  if (category) {
    conditions.push(`category = $${paramIdx}::place_category`);
    params.push(category); paramIdx++;
  }
  if (vibes) {
    const vibeArr = vibes.split(',').filter(Boolean);
    if (vibeArr.length) {
      conditions.push(`vibes @> $${paramIdx}::vibe_tag[]`);
      params.push(`{${vibeArr.join(',')}}`); paramIdx++;
    }
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [rows, countRow] = await Promise.all([
    query<PlaceCache>(
      `SELECT id, place_id, name, category, vibes, formatted_address,
              rating, rating_count, price_level, open_now, photo_urls,
              has_ugc_photo, save_count,
              ST_Y(location::geometry) AS lat,
              ST_X(location::geometry) AS lng
       FROM places_cache ${where}
       ORDER BY similarity(name, $1) DESC, save_count DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, lim, offset]
    ),
    queryOne<{ total: string }>(
      `SELECT COUNT(*) AS total FROM places_cache ${where}`,
      params
    ),
  ]);

  return {
    places: rows.rows,
    ...buildMeta(parseInt(countRow?.total ?? '0', 10), p, lim),
  };
}

// ── Get places nearby (raw proximity query, no ranking) ───────────────────────

export async function getPlacesNearby(
  lat: number, lng: number, radiusKm: number,
  category?: string, limit = 20
) {
  const params: unknown[] = [lng, lat, radiusKm * 1000, Math.min(limit, 100)];
  const paramIdx = 5;
  let categoryClause = '';
  if (category) {
    categoryClause = `AND category = $${paramIdx}::place_category`;
    params.push(category);
  }

  const result = await query<PlaceCache & { distance_km: number }>(
    `SELECT id, place_id, name, category, vibes, formatted_address,
            rating, rating_count, price_level, open_now, photo_urls, has_ugc_photo,
            save_count, like_count,
            ST_Y(location::geometry) AS lat,
            ST_X(location::geometry) AS lng,
            ROUND((ST_Distance(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY) / 1000.0)::NUMERIC, 3) AS distance_km
     FROM places_cache
     WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY, $3)
       AND expires_at > now()
       ${categoryClause}
     ORDER BY distance_km ASC
     LIMIT $4`,
    params
  );

  return result.rows;
}

// ── Upsert place detail cache ─────────────────────────────────────────────────

export async function upsertPlaceDetail(
  placeId: string,
  payload: Record<string, unknown>
): Promise<PlaceDetailCache> {
  const expiresAt = new Date(
    Date.now() + env.PLACE_DETAIL_CACHE_TTL_HOURS * 60 * 60 * 1000
  ).toISOString();

  const result = await query<PlaceDetailCache>(
    `INSERT INTO place_detail_cache (place_id, detail_payload, open_now, opening_hours, phone, website, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (place_id) DO UPDATE SET
       detail_payload = EXCLUDED.detail_payload,
       open_now       = EXCLUDED.open_now,
       opening_hours  = EXCLUDED.opening_hours,
       phone          = EXCLUDED.phone,
       website        = EXCLUDED.website,
       expires_at     = EXCLUDED.expires_at
     RETURNING *`,
    [
      placeId,
      JSON.stringify(payload),
      (payload.open_now as boolean) ?? null,
      payload.opening_hours ? JSON.stringify(payload.opening_hours) : null,
      (payload.phone as string) ?? null,
      (payload.website as string) ?? null,
      expiresAt,
    ]
  );
  return result.rows[0];
}

// ── Get place detail cache ────────────────────────────────────────────────────

export async function getPlaceDetail(placeId: string): Promise<PlaceDetailCache | null> {
  return queryOne<PlaceDetailCache>(
    `SELECT * FROM place_detail_cache WHERE place_id = $1 AND expires_at > now()`,
    [placeId]
  );
}

// ── Delete expired places (admin / maintenance) ───────────────────────────────

export async function deleteExpiredPlaces(): Promise<number> {
  const result = await query('DELETE FROM places_cache WHERE expires_at < now()');
  return result.rowCount ?? 0;
}

// ── Admin: list all cached places (paginated) ─────────────────────────────────

export async function adminListPlaces(page: unknown, limit: unknown, category?: string) {
  const { limit: lim, offset, page: p } = parsePagination(page, limit, 100);
  const params: unknown[] = [];
  let categoryClause = '';
  if (category) { categoryClause = 'WHERE category = $1::place_category'; params.push(category); }

  const [rows, countRow] = await Promise.all([
    query(
      `SELECT id, place_id, name, category, vibes, rating, save_count,
              has_ugc_photo, source, expires_at, created_at
       FROM places_cache ${categoryClause}
       ORDER BY save_count DESC, created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, lim, offset]
    ),
    queryOne<{ total: string }>(`SELECT COUNT(*) AS total FROM places_cache ${categoryClause}`, params),
  ]);

  return {
    places: rows.rows,
    ...buildMeta(parseInt(countRow?.total ?? '0', 10), p, lim),
  };
}

// ── Feature a place (admin audit log) ────────────────────────────────────────

export async function featurePlace(placeId: string, adminId: string): Promise<void> {
  await withTransaction(async (client) => {
    const place = await queryOne<{ id: string }>('SELECT id FROM places_cache WHERE place_id = $1', [placeId]);
    if (!place) throw AppError.notFound('Place');

    await client.query(
      `INSERT INTO audit_log (admin_id, action, target_type, target_id, reason)
       VALUES ($1, 'feature_place', 'place', $2, 'admin_featured')`,
      [adminId, placeId]
    );
  });
}
