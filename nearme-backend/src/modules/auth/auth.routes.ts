import { Router } from 'express';
import { z } from 'zod';
import * as AuthController from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { zodBody } from '../../middleware/validate.middleware';
import { AUTH_PROVIDERS } from '../../utils/helpers';

const router = Router();

const registerSchema = z.object({
  uid: z.string().min(1, 'Firebase UID required'),
  display_name: z.string().min(1).max(50),
  handle: z.string().regex(/^[a-z0-9_]{3,30}$/, 'Handle must be 3-30 lowercase alphanumeric or underscore'),
  email: z.string().email(),
  password: z.string().min(8).max(128).optional(),
  photo_url: z.string().url().optional(),
  auth_provider: z.enum(AUTH_PROVIDERS as [string, ...string[]]),
  device_info: z.record(z.unknown()).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  device_info: z.record(z.unknown()).optional(),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

/**
 * @route  POST /api/v1/auth/register
 * @desc   Create new user account + issue tokens
 * @access Public
 */
router.post('/register', zodBody(registerSchema), AuthController.register);

/**
 * @route  POST /api/v1/auth/login
 * @desc   Authenticate with email + password
 * @access Public
 */
router.post('/login', zodBody(loginSchema), AuthController.login);

/**
 * @route  POST /api/v1/auth/refresh
 * @desc   Rotate refresh token and issue new access token
 * @access Public (with valid refresh token)
 */
router.post('/refresh', zodBody(refreshSchema), AuthController.refresh);

/**
 * @route  POST /api/v1/auth/logout
 * @desc   Revoke current session
 * @access Private
 */
router.post('/logout', authenticate, AuthController.logout);

/**
 * @route  POST /api/v1/auth/logout-all
 * @desc   Revoke ALL sessions for the current user
 * @access Private
 */
router.post('/logout-all', authenticate, AuthController.logoutAll);

export default router;
