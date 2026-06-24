import ngeohash from 'ngeohash';

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export function parsePagination(
  queryPage: unknown,
  queryLimit: unknown,
  maxLimit = 100
): PaginationParams {
  const page = Math.max(1, parseInt(String(queryPage ?? 1), 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(String(queryLimit ?? 20), 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

export function buildMeta(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ── Geohash (GDPR-safe location anonymisation for analytics) ─────────────────

export function toGeohash6(lat: number, lng: number): string {
  return ngeohash.encode(lat, lng, 6); // ~1.2 km² cell — GDPR-safe
}

// ── Coordinate validation ─────────────────────────────────────────────────────

export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  const la = Number(lat);
  const lo = Number(lng);
  return (
    !isNaN(la) && !isNaN(lo) &&
    la >= -90 && la <= 90 &&
    lo >= -180 && lo <= 180
  );
}

// ── Safe object pick (strip undefined keys for PATCH) ─────────────────────────

export function pickDefined<T extends object>(obj: T, keys: (keyof T)[]): Partial<T> {
  return keys.reduce((acc, key) => {
    if (obj[key] !== undefined) (acc as Record<string, unknown>)[key as string] = obj[key];
    return acc;
  }, {} as Partial<T>);
}

// ── Enum value check helpers ──────────────────────────────────────────────────

export const PLACE_CATEGORIES = ['cafe','pub','park','restaurant','art','hidden_gem','beach','other'];
export const VIBE_TAGS = ['chill','party','date_night','family','cosy','hidden_gem','lively','scenic'];
export const PRICE_LEVELS = ['0','1','2','3','4'];
export const MEDIA_TYPES = ['image','video','gif'];
export const POST_STATUSES = ['pending_moderation','approved','rejected','deleted'];
export const NOTIFICATION_TYPES = ['like','comment','new_nearby','milestone','system'];
export const REPORT_REASONS = ['inappropriate','spam','violence','copyright','other'];
export const REPORT_STATUSES = ['pending','reviewed_approved','reviewed_removed'];
export const ADMIN_ACTIONS = ['approve_post','reject_post','ban_user','unban_user','feature_place','delete_post','resolve_report','rotate_secret'];
export const AUTH_PROVIDERS = ['email','google','apple'];
export const USER_ROLES = ['user','moderator','admin'];

export function isPlaceCategory(v: unknown): boolean { return PLACE_CATEGORIES.includes(v as never); }
export function isVibeTag(v: unknown): boolean { return VIBE_TAGS.includes(v as never); }
export function isPriceLevel(v: unknown): boolean { return PRICE_LEVELS.includes(v as never); }
export function isMediaType(v: unknown): boolean { return MEDIA_TYPES.includes(v as never); }
export function isReportReason(v: unknown): boolean { return REPORT_REASONS.includes(v as never); }
export function isAdminAction(v: unknown): boolean { return ADMIN_ACTIONS.includes(v as never); }
export function isNotificationType(v: unknown): boolean { return NOTIFICATION_TYPES.includes(v as never); }
