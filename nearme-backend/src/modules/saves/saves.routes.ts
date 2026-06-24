import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as SavesService from './saves.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/response';
import { asyncHandler } from '../../utils/errors';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { zodBody } from '../../middleware/validate.middleware';
import { savesRateLimit } from '../../middleware/rateLimit.middleware';
import { PLACE_CATEGORIES } from '../../utils/helpers';

const savePlaceSchema = z.object({
  place_id: z.string().min(1),
  name: z.string().min(1).max(200),
  category: z.enum(PLACE_CATEGORIES as [string, ...string[]]),
  photo_url: z.string().url().optional().nullable(),
  rating: z.number().min(0).max(5).optional().nullable(),
  distance_km: z.number().min(0).optional().nullable(),
});

// ── Controllers ───────────────────────────────────────────────────────────────

const savePlace = asyncHandler(async (req: Request, res: Response) => {
  const result = await SavesService.savePlace(req.user!.id, req.body);
  if (result.created) sendCreated(res, result.save);
  else sendSuccess(res, { message: 'Place already saved', already_saved: true });
});

const unsavePlace = asyncHandler(async (req: Request, res: Response) => {
  const deleted = await SavesService.unsavePlace(req.user!.id, req.params.placeId);
  if (!deleted) sendSuccess(res, { message: 'Save not found' });
  else sendNoContent(res);
});

const isSaved = asyncHandler(async (req: Request, res: Response) => {
  const saved = await SavesService.isSaved(req.user!.id, req.params.placeId);
  sendSuccess(res, { place_id: req.params.placeId, is_saved: saved });
});

const getMySaves = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, category } = req.query;
  const result = await SavesService.getMySaves(req.user!.id, page, limit, category as string);
  sendSuccess(res, result);
});

const getSave = asyncHandler(async (req: Request, res: Response) => {
  const save = await SavesService.getSave(req.user!.id, req.params.placeId);
  sendSuccess(res, save);
});

const getSavesAnalytics = asyncHandler(async (_req: Request, res: Response) => {
  const analytics = await SavesService.getSavesAnalytics();
  sendSuccess(res, analytics);
});

const getPlaceSaveCount = asyncHandler(async (req: Request, res: Response) => {
  const count = await SavesService.getPlaceSaveCount(req.params.placeId);
  sendSuccess(res, { place_id: req.params.placeId, save_count: count });
});

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router();

/** @route GET /api/v1/saves — Get current user's saved places */
router.get('/', authenticate, getMySaves);

/** @route POST /api/v1/saves — Save a place */
router.post('/', authenticate, savesRateLimit, zodBody(savePlaceSchema), savePlace);

/** @route GET /api/v1/saves/analytics — Admin: saves breakdown */
router.get('/analytics', authenticate, authorize('admin'), getSavesAnalytics);

/** @route GET /api/v1/saves/place/:placeId — Get a specific save */
router.get('/place/:placeId', authenticate, getSave);

/** @route GET /api/v1/saves/place/:placeId/check — Check if saved */
router.get('/place/:placeId/check', authenticate, isSaved);

/** @route GET /api/v1/saves/place/:placeId/count — Public save count */
router.get('/place/:placeId/count', authenticate, getPlaceSaveCount);

/** @route DELETE /api/v1/saves/place/:placeId — Remove a save */
router.delete('/place/:placeId', authenticate, savesRateLimit, unsavePlace);

export default router;
