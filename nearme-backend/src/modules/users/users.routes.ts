import { Router } from 'express';
import { z } from 'zod';
import * as UsersController from './users.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { zodBody, validateUuidParam } from '../../middleware/validate.middleware';
import { VIBE_TAGS, PLACE_CATEGORIES } from '../../utils/helpers';

const router = Router();

const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(50).optional(),
  handle: z.string().regex(/^[a-z0-9_]{3,30}$/).optional(),
  photo_url: z.string().url().optional().nullable(),
  onboarding_done: z.boolean().optional(),
  preferences: z.object({
    vibes: z.array(z.enum(VIBE_TAGS as [string, ...string[]])).optional(),
    categories: z.array(z.enum(PLACE_CATEGORIES as [string, ...string[]])).optional(),
    distance_km: z.number().min(1).max(100).optional(),
    price_range: z.tuple([z.number().min(0), z.number().max(4)]).optional(),
  }).optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'At least one field required' });

// ── Own profile ────────────────────────────────────────────────────────────────
/**
 * @route  GET /api/v1/users/me
 * @desc   Get authenticated user's full profile
 */
router.get('/me', authenticate, UsersController.getMe);

/**
 * @route  PATCH /api/v1/users/me
 * @desc   Update own display_name, handle, photo, preferences
 */
router.patch('/me', authenticate, zodBody(updateProfileSchema), UsersController.updateMe);

/**
 * @route  DELETE /api/v1/users/me
 * @desc   Request GDPR account deletion (30-day window)
 */
router.delete('/me', authenticate, UsersController.requestDeletion);

/**
 * @route  POST /api/v1/users/me/cancel-deletion
 * @desc   Cancel pending GDPR deletion within 30-day window
 */
router.post('/me/cancel-deletion', authenticate, UsersController.cancelDeletion);

// ── Public profile ─────────────────────────────────────────────────────────────
/**
 * @route  GET /api/v1/users/:handleOrId
 * @desc   Get public profile by handle or UUID
 */
router.get('/:handleOrId', authenticate, UsersController.getPublicProfile);

/**
 * @route  GET /api/v1/users/handle/:handle/available
 * @desc   Check if a handle is available
 */
router.get('/handle/:handle/available', authenticate, UsersController.checkHandle);

// ── Admin routes ───────────────────────────────────────────────────────────────
/**
 * @route  GET /api/v1/users
 * @desc   Admin: list all users (paginated)
 */
router.get('/', authenticate, authorize('admin', 'moderator'), UsersController.adminListUsers);

/**
 * @route  GET /api/v1/users/admin/:userId
 * @desc   Admin: get full user record including email
 */
router.get('/admin/:userId', authenticate, authorize('admin'), validateUuidParam('userId'), UsersController.adminGetUser);

/**
 * @route  POST /api/v1/users/:userId/ban
 * @desc   Admin: ban user (revokes all sessions)
 */
router.post('/:userId/ban', authenticate, authorize('admin', 'moderator'), validateUuidParam('userId'), UsersController.banUser);

/**
 * @route  POST /api/v1/users/:userId/unban
 * @desc   Admin: unban user
 */
router.post('/:userId/unban', authenticate, authorize('admin'), validateUuidParam('userId'), UsersController.unbanUser);

/**
 * @route  PATCH /api/v1/users/:userId/role
 * @desc   Admin: change user role
 */
router.patch('/:userId/role', authenticate, authorize('admin'), validateUuidParam('userId'), UsersController.setUserRole);

export default router;
