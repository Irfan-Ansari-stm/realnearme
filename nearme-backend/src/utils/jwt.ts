import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { JwtPayload, RefreshTokenPayload, UserRole } from '../types';
import { AppError } from './errors';

// ── Sign access token ─────────────────────────────────────────────────────────

export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: 'nearme-api',
    audience: 'nearme-client',
  } as jwt.SignOptions);
}

// ── Sign refresh token ────────────────────────────────────────────────────────

export function signRefreshToken(sub: string, family: string): string {
  return jwt.sign({ sub, family }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    issuer: 'nearme-api',
    audience: 'nearme-client',
  } as jwt.SignOptions);
}

// ── Verify access token ───────────────────────────────────────────────────────

export function verifyAccessToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET, {
      issuer: 'nearme-api',
      audience: 'nearme-client',
    }) as JwtPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized('Access token expired', 'TOKEN_EXPIRED');
    }
    throw AppError.unauthorized('Invalid access token', 'TOKEN_INVALID');
  }
}

// ── Verify refresh token ──────────────────────────────────────────────────────

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET, {
      issuer: 'nearme-api',
      audience: 'nearme-client',
    }) as RefreshTokenPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized('Refresh token expired', 'REFRESH_TOKEN_EXPIRED');
    }
    throw AppError.unauthorized('Invalid refresh token', 'REFRESH_TOKEN_INVALID');
  }
}

// ── Generate token family hash (SHA-256) ──────────────────────────────────────

export function generateTokenFamily(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashTokenFamily(family: string): string {
  return crypto.createHash('sha256').update(family).digest('hex');
}

// ── Extract bearer token from Authorization header ────────────────────────────

export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

// ── Build token pair ──────────────────────────────────────────────────────────

export function buildTokenPair(userId: string, uid: string, role: UserRole) {
  const family = generateTokenFamily();
  const familyHash = hashTokenFamily(family);
  const accessToken = signAccessToken({ sub: userId, uid, role });
  const refreshToken = signRefreshToken(userId, family);
  return { accessToken, refreshToken, familyHash };
}
