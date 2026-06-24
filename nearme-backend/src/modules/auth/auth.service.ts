import bcrypt from 'bcryptjs';
import { PoolClient } from 'pg';
import { query, queryOne, withTransaction } from '../../config/database';
import { AppError } from '../../utils/errors';
import { buildTokenPair, verifyRefreshToken, hashTokenFamily } from '../../utils/jwt';
import { env } from '../../config/env';
import { User, AuthProvider } from '../../types';
import { logger } from '../../utils/logger';

// ── Register ──────────────────────────────────────────────────────────────────

export interface RegisterInput {
  uid: string;
  display_name: string;
  handle: string;
  email: string;
  password?: string;
  photo_url?: string;
  auth_provider: AuthProvider;
  device_info?: Record<string, unknown>;
}

export async function register(input: RegisterInput) {
  return withTransaction(async (client: PoolClient) => {
    // Check handle availability
    const handleCheck = await client.query(
      'SELECT id FROM users WHERE handle = $1',
      [input.handle.toLowerCase()]
    );
    if (handleCheck.rows.length > 0) {
      throw AppError.conflict('Handle is already taken');
    }

    // Check email uniqueness
    const emailCheck = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [input.email.toLowerCase()]
    );
    if (emailCheck.rows.length > 0) {
      throw AppError.conflict('Email is already registered');
    }

    // Hash password if provided (reserved for self-hosted auth mode)
    const passwordHash = input.password
      ? await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS)
      : null;

    // Insert user
    const userResult = await client.query<User>(
      `INSERT INTO users (uid, display_name, handle, email, password_hash, photo_url, auth_provider)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, uid, display_name, handle, photo_url, role, preferences,
                 stat_saves, stat_posts, stat_following, onboarding_done,
                 is_verified, is_active, auth_provider, created_at`,
      [
        input.uid,
        input.display_name,
        input.handle.toLowerCase(),
        input.email.toLowerCase(),
        passwordHash,
        input.photo_url ?? null,
        input.auth_provider,
      ]
    );

    const user = userResult.rows[0];

    // Create session
    const { accessToken, refreshToken, familyHash } = buildTokenPair(
      user.id, user.uid, user.role
    );

    const sessionExpires = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days

    await client.query(
      `INSERT INTO user_sessions (user_id, token_family_hash, device_info, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, familyHash, input.device_info ?? null, sessionExpires.toISOString()]
    );

    logger.info({ userId: user.id, provider: input.auth_provider }, 'User registered');

    return { user: sanitizeUser(user), accessToken, refreshToken };
  });
}

// ── Login ─────────────────────────────────────────────────────────────────────

export interface LoginInput {
  email: string;
  password: string;
  device_info?: Record<string, unknown>;
}

export async function login(input: LoginInput) {
  const user = await queryOne<User & { password_hash?: string }>(
    `SELECT id, uid, display_name, handle, photo_url, role, preferences,
            stat_saves, stat_posts, stat_following, onboarding_done,
            is_verified, is_active, auth_provider, created_at, password_hash
     FROM users
     WHERE email = $1`,
    [input.email.toLowerCase()]
  );

  if (!user) {
    throw AppError.unauthorized('Invalid email or password');
  }
  if (!user.is_active) {
    throw AppError.forbidden('Account has been suspended');
  }

  // For OAuth users trying email login
  if (user.auth_provider !== 'email') {
    throw AppError.badRequest(`Please sign in with ${user.auth_provider}`);
  }
  if (!user.password_hash) {
    throw AppError.unauthorized('Invalid email or password');
  }
  const passwordOk = await bcrypt.compare(input.password, user.password_hash);
  if (!passwordOk) {
    throw AppError.unauthorized('Invalid email or password');
  }

  // Create session & tokens
  const { accessToken, refreshToken, familyHash } = buildTokenPair(
    user.id, user.uid, user.role
  );

  const sessionExpires = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO user_sessions (user_id, token_family_hash, device_info, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [user.id, familyHash, input.device_info ?? null, sessionExpires.toISOString()]
  );

  logger.info({ userId: user.id }, 'User logged in');

  return { user: sanitizeUser(user), accessToken, refreshToken };
}

// ── Refresh tokens ────────────────────────────────────────────────────────────

export async function refreshTokens(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  const familyHash = hashTokenFamily(payload.family);

  return withTransaction(async (client: PoolClient) => {
    // Find and validate session
    const sessionResult = await client.query<{ id: string; user_id: string; is_revoked: boolean }>(
      `SELECT id, user_id, is_revoked FROM user_sessions
       WHERE token_family_hash = $1 AND expires_at > now()`,
      [familyHash]
    );

    const session = sessionResult.rows[0];
    if (!session) {
      throw AppError.unauthorized('Session not found or expired', 'SESSION_INVALID');
    }
    if (session.is_revoked) {
      // Possible token reuse attack — revoke ALL sessions for this user
      await client.query(
        'UPDATE user_sessions SET is_revoked = TRUE, revoked_at = now() WHERE user_id = $1',
        [session.user_id]
      );
      logger.warn({ userId: session.user_id }, 'Token reuse detected — all sessions revoked');
      throw AppError.unauthorized('Token reuse detected. Please log in again.', 'TOKEN_REUSE');
    }

    // Revoke old session (token rotation)
    await client.query(
      'UPDATE user_sessions SET is_revoked = TRUE, revoked_at = now() WHERE id = $1',
      [session.id]
    );

    // Load user
    const userResult = await client.query<User>(
      'SELECT id, uid, role, is_active FROM users WHERE id = $1',
      [session.user_id]
    );
    const user = userResult.rows[0];
    if (!user || !user.is_active) {
      throw AppError.forbidden('Account is not active');
    }

    // Issue new token pair
    const tokens = buildTokenPair(user.id, user.uid, user.role);
    const sessionExpires = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    await client.query(
      `INSERT INTO user_sessions (user_id, token_family_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokens.familyHash, sessionExpires.toISOString()]
    );

    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  });
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logout(userId: string, refreshToken?: string) {
  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      const familyHash = hashTokenFamily(payload.family);
      await query(
        'UPDATE user_sessions SET is_revoked = TRUE, revoked_at = now() WHERE token_family_hash = $1 AND user_id = $2',
        [familyHash, userId]
      );
    } catch {
      // Even if token is invalid, proceed with logout
    }
  }
  logger.info({ userId }, 'User logged out');
}

// ── Logout all devices ────────────────────────────────────────────────────────

export async function logoutAll(userId: string) {
  await query(
    'UPDATE user_sessions SET is_revoked = TRUE, revoked_at = now() WHERE user_id = $1 AND is_revoked = FALSE',
    [userId]
  );
  logger.info({ userId }, 'All sessions revoked');
}

// ── Strip sensitive fields ────────────────────────────────────────────────────

function sanitizeUser(user: Partial<User>) {
  const { ...safe } = user;
  delete (safe as Record<string, unknown>).email;
  delete (safe as Record<string, unknown>).deletion_requested_at;
  delete (safe as Record<string, unknown>).deletion_deadline_at;
  return safe;
}
