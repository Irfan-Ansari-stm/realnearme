// ── API response envelope ──────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: { total?: number; page?: number; limit?: number; totalPages?: number };
}

// ── Domain types ──────────────────────────────────────────────────────────────
export type PlaceCategory = 'cafe'|'pub'|'park'|'restaurant'|'art'|'hidden_gem'|'beach'|'other';
export type VibeTag = 'chill'|'party'|'date_night'|'family'|'cosy'|'hidden_gem'|'lively'|'scenic';
export type PriceLevel = '0'|'1'|'2'|'3'|'4';
export type MediaType = 'image'|'video'|'gif';
export type PostStatus = 'pending_moderation'|'approved'|'rejected'|'deleted';
export type NotificationType = 'like'|'comment'|'new_nearby'|'milestone'|'system';
export type ReportReason = 'inappropriate'|'spam'|'violence'|'copyright'|'other';
export type UserRole = 'user'|'moderator'|'admin';

export interface RankedPlace {
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

export interface Place {
  id: string;
  place_id: string;
  name: string;
  category: PlaceCategory;
  vibes: VibeTag[];
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
  lat?: number;
  lng?: number;
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
  like_count: number;
  save_count: number;
  report_count: number;
  created_at: string;
  author_name?: string;
  author_handle?: string;
  author_photo?: string;
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
  status: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  admin_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  created_at: string;
  admin_handle?: string;
}

export interface Session {
  id: string;
  user_id: string;
  device_info: Record<string, string> | null;
  is_revoked: boolean;
  created_at: string;
  last_used_at: string;
  expires_at: string;
}
