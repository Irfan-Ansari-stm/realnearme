// ─────────────────────────────────────────────────────────────────────────────
// NearMe — Shared TypeScript Types
// Mirror every PostgreSQL ENUM and table shape from nearme_postgresql_v1_0.sql
// ─────────────────────────────────────────────────────────────────────────────

// ── Enums ─────────────────────────────────────────────────────────────────────

export type PlaceCategory = 'cafe' | 'pub' | 'park' | 'restaurant' | 'art' | 'hidden_gem' | 'beach' | 'other';
export type VibeTag = 'chill' | 'party' | 'date_night' | 'family' | 'cosy' | 'hidden_gem' | 'lively' | 'scenic';
export type PriceLevel = '0' | '1' | '2' | '3' | '4';
export type MediaType = 'image' | 'video' | 'gif';
export type PostStatus = 'pending_moderation' | 'approved' | 'rejected' | 'deleted';
export type NotificationType = 'like' | 'comment' | 'new_nearby' | 'milestone' | 'system';
export type ReportReason = 'inappropriate' | 'spam' | 'violence' | 'copyright' | 'other';
export type ReportStatus = 'pending' | 'reviewed_approved' | 'reviewed_removed';
export type AdminAction = 'approve_post' | 'reject_post' | 'ban_user' | 'unban_user' | 'feature_place' | 'delete_post' | 'resolve_report' | 'rotate_secret';
export type AuthProvider = 'email' | 'google' | 'apple';
export type UserRole = 'user' | 'moderator' | 'admin';
export type SafeSearchLikelihood = 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';

// ── User preferences (JSONB) ──────────────────────────────────────────────────

export interface UserPreferences {
  vibes: VibeTag[];
  categories: PlaceCategory[];
  distance_km: number;
  price_range: [number, number];
}

// ── Table row types ───────────────────────────────────────────────────────────

export interface User {
  id: string;
  uid: string;
  display_name: string;
  handle: string;
  email: string;
  photo_url: string | null;
  role: UserRole;
  preferences: UserPreferences;
  stat_saves: number;
  stat_posts: number;
  stat_following: number;
  onboarding_done: boolean;
  is_verified: boolean;
  is_active: boolean;
  auth_provider: AuthProvider;
  deletion_requested_at: string | null;
  deletion_deadline_at: string | null;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaceCache {
  id: string;
  place_id: string;
  name: string;
  category: PlaceCategory;
  vibes: VibeTag[];
  location: unknown; // PostGIS geography — returned as WKT or GeoJSON
  formatted_address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  rating_count: number;
  price_level: PriceLevel | null;
  open_now: boolean | null;
  opening_hours: unknown | null;
  photo_urls: string[];
  has_ugc_photo: boolean;
  save_count: number;
  like_count: number;
  source: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface Save {
  id: string;
  user_id: string;
  place_id: string;
  name: string;
  category: PlaceCategory;
  photo_url: string | null;
  rating: number | null;
  distance_km: number | null;
  saved_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  place_id: string;
  caption: string | null;
  category: PlaceCategory;
  vibes: VibeTag[];
  storage_ref: string | null;
  media_type: MediaType;
  status: PostStatus;
  safe_search_scores: Record<string, SafeSearchLikelihood> | null;
  moderated_at: string | null;
  moderated_by: string | null;
  like_count: number;
  save_count: number;
  report_count: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface Notification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  actor_id: string | null;
  actor_name: string | null;
  place_id: string | null;
  post_id: string | null;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  expires_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  post_id: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  reviewed_by: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface AuditLog {
  id: string;
  admin_id: string | null;
  action: AdminAction;
  target_type: 'post' | 'user' | 'place' | 'secret';
  target_id: string;
  reason: string | null;
  previous_value: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface SearchHistory {
  id: string;
  user_id: string;
  query: string;
  searched_at: string;
}

export interface RateLimitCounter {
  id: string;
  user_id: string;
  endpoint: string;
  window_start: string;
  window_end: string;
  count: number;
}

export interface UserSession {
  id: string;
  user_id: string;
  token_family_hash: string;
  device_info: Record<string, unknown> | null;
  is_revoked: boolean;
  revoked_at: string | null;
  created_at: string;
  last_used_at: string;
  expires_at: string;
}

export interface FeedRankingLog {
  id: string;
  user_id: string;
  query_geohash6: string;
  algorithm_version: string;
  cache_hit: boolean;
  place_count: number;
  scores_snapshot: unknown | null;
  generated_at: string;
}

export interface PlaceDetailCache {
  id: string;
  place_id: string;
  detail_payload: Record<string, unknown>;
  open_now: boolean | null;
  opening_hours: unknown | null;
  phone: string | null;
  website: string | null;
  expires_at: string;
  created_at: string;
}

export interface AlgorithmConfig {
  version: string;
  weights: {
    proximity: number;
    rating: number;
    vibe: number;
    category: number;
    recency: number;
    popularity: number;
  };
  is_active: boolean;
  deployed_at: string;
  deployed_by: string | null;
}

// ── Ranked feed result (from fn_get_ranked_feed) ──────────────────────────────

export interface RankedFeedItem {
  place_id: string;
  name: string;
  category: PlaceCategory;
  vibes: VibeTag[];
  distance_km: number;
  rating: number | null;
  rating_count: number;
  price_level: PriceLevel | null;
  open_now: boolean | null;
  photo_urls: string[];
  has_ugc_photo: boolean;
  save_count: number;
  score: number;
}

// ── API response envelope ─────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    cursor?: string | null;
  };
}

// ── JWT payload ───────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;      // user.id (UUID)
  uid: string;      // Firebase Auth UID
  role: UserRole;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  family: string;   // token family hash
  iat: number;
  exp: number;
}

// ── Express request augmentation ──────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        uid: string;
        role: UserRole;
      };
      requestId?: string;
    }
  }
}
