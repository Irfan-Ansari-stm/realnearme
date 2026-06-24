import { query, queryOne, withTransaction } from '../../config/database';
import { AppError } from '../../utils/errors';
import { User, UserPreferences } from '../../types';
import { parsePagination } from '../../utils/helpers';
import { logger } from '../../utils/logger';

// ── Get own profile ───────────────────────────────────────────────────────────

export async function getMyProfile(userId: string): Promise<User> {
  const user = await queryOne<User>(
    `SELECT id, uid, display_name, handle, photo_url, role, preferences,
            stat_saves, stat_posts, stat_following, onboarding_done,
            is_verified, is_active, auth_provider, last_active_at, created_at, updated_at
     FROM users WHERE id = $1`,
    [userId]
  );
  if (!user) throw AppError.notFound('User');
  return user;
}

// ── Get public profile by handle or ID ───────────────────────────────────────

export async function getPublicProfile(handleOrId: string): Promise<Partial<User>> {
  const isUuid = /^[0-9a-f-]{36}$/i.test(handleOrId);
  const user = await queryOne<Partial<User>>(
    `SELECT id, display_name, handle, photo_url, role,
            stat_saves, stat_posts, stat_following, created_at
     FROM v_user_profile_public
     WHERE ${isUuid ? 'id = $1' : 'handle = $1'}`,
    [handleOrId]
  );
  if (!user) throw AppError.notFound('User');
  return user;
}

// ── Update own profile (PATCH — partial) ──────────────────────────────────────

export interface UpdateProfileInput {
  display_name?: string;
  handle?: string;
  photo_url?: string;
  onboarding_done?: boolean;
  preferences?: Partial<UserPreferences>;
}

export async function updateMyProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<User> {
  if (input.handle) {
    const conflict = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE handle = $1 AND id <> $2',
      [input.handle.toLowerCase(), userId]
    );
    if (conflict) throw AppError.conflict('Handle is already taken');
  }

  // Use DB stored procedure for safe merge
  await query(
    `SELECT fn_update_user_preferences($1, $2, $3, $4, $5)`,
    [
      userId,
      input.display_name ?? null,
      input.handle ? input.handle.toLowerCase() : null,
      input.photo_url ?? null,
      input.preferences ? JSON.stringify(input.preferences) : null,
    ]
  );

  if (input.onboarding_done !== undefined) {
    await query('UPDATE users SET onboarding_done = $1 WHERE id = $2', [
      input.onboarding_done,
      userId,
    ]);
  }

  return getMyProfile(userId);
}

// ── Check handle availability ─────────────────────────────────────────────────

export async function checkHandle(handle: string, excludeUserId?: string): Promise<boolean> {
  const result = await queryOne<{ available: boolean }>(
    'SELECT fn_is_handle_available($1, $2) AS available',
    [handle.toLowerCase(), excludeUserId ?? null]
  );
  return result?.available ?? false;
}

// ── GDPR: request account deletion ───────────────────────────────────────────

export async function requestDeletion(userId: string): Promise<{ deadline: string }> {
  const result = await queryOne<{ fn_request_account_deletion: string }>(
    'SELECT fn_request_account_deletion($1)',
    [userId]
  );
  logger.info({ userId }, 'GDPR deletion requested');
  return { deadline: result!.fn_request_account_deletion };
}

// ── GDPR: cancel deletion (within 30-day window) ─────────────────────────────

export async function cancelDeletion(userId: string): Promise<void> {
  const result = await query(
    `UPDATE users
     SET deletion_requested_at = NULL,
         deletion_deadline_at = NULL,
         is_active = TRUE,
         updated_at = now()
     WHERE id = $1 AND deletion_requested_at IS NOT NULL`,
    [userId]
  );
  if (result.rowCount === 0) {
    throw AppError.badRequest('No pending deletion request found');
  }
}

// ── Admin: list users (paginated + search) ────────────────────────────────────

export async function adminListUsers(
  page: unknown,
  limit: unknown,
  search?: string,
  role?: string,
  isActive?: string
) {
  const { limit: lim, offset } = parsePagination(page, limit, 100);

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (search) {
    conditions.push(`(display_name ILIKE $${paramIdx} OR handle ILIKE $${paramIdx} OR email ILIKE $${paramIdx})`);
    params.push(`%${search}%`);
    paramIdx++;
  }
  if (role) {
    conditions.push(`role = $${paramIdx}::user_role`);
    params.push(role); paramIdx++;
  }
  if (isActive !== undefined) {
    conditions.push(`is_active = $${paramIdx}`);
    params.push(isActive === 'true'); paramIdx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows, countRow] = await Promise.all([
    query<User>(
      `SELECT id, uid, display_name, handle, email, role, is_active, is_verified,
              stat_saves, stat_posts, auth_provider, last_active_at, created_at
       FROM users ${where}
       ORDER BY created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, lim, offset]
    ),
    queryOne<{ total: string }>(
      `SELECT COUNT(*) AS total FROM users ${where}`,
      params
    ),
  ]);

  return {
    users: rows.rows,
    total: parseInt(countRow?.total ?? '0', 10),
  };
}

// ── Admin: get full user record (including email) ─────────────────────────────

export async function adminGetUser(userId: string): Promise<User> {
  const user = await queryOne<User>(
    `SELECT * FROM users WHERE id = $1`,
    [userId]
  );
  if (!user) throw AppError.notFound('User');
  return user;
}

// ── Admin: ban / unban user ───────────────────────────────────────────────────

export async function setBanStatus(
  targetUserId: string,
  ban: boolean,
  adminId: string,
  reason?: string
): Promise<void> {
  await withTransaction(async (client) => {
    const user = await queryOne<{ id: string; is_active: boolean }>(
      'SELECT id, is_active FROM users WHERE id = $1',
      [targetUserId]
    );
    if (!user) throw AppError.notFound('User');

    await client.query(
      'UPDATE users SET is_active = $1, updated_at = now() WHERE id = $2',
      [!ban, targetUserId]
    );

    if (ban) {
      // Revoke all sessions
      await client.query(
        'UPDATE user_sessions SET is_revoked = TRUE, revoked_at = now() WHERE user_id = $1',
        [targetUserId]
      );
    }

    // Audit log
    await client.query(
      `INSERT INTO audit_log (admin_id, action, target_type, target_id, reason)
       VALUES ($1, $2, 'user', $3, $4)`,
      [adminId, ban ? 'ban_user' : 'unban_user', targetUserId, reason ?? null]
    );
  });

  logger.info({ targetUserId, ban, adminId }, ban ? 'User banned' : 'User unbanned');
}

// ── Admin: update user role ───────────────────────────────────────────────────

export async function setUserRole(
  targetUserId: string,
  role: string,
  adminId: string
): Promise<void> {
  await withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE users SET role = $1::user_role, updated_at = now() WHERE id = $2`,
      [role, targetUserId]
    );
    if (result.rowCount === 0) throw AppError.notFound('User');

    await client.query(
      `INSERT INTO audit_log (admin_id, action, target_type, target_id, reason)
       VALUES ($1, 'ban_user', 'user', $2, $3)`,
      [adminId, targetUserId, `Role changed to ${role}`]
    );
  });
}
