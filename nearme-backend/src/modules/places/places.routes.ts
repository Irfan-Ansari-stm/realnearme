import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as PlacesService from './places.service';
import { sendSuccess, sendCreated } from '../../utils/response';
import { asyncHandler, AppError } from '../../utils/errors';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { zodBody } from '../../middleware/validate.middleware';
import { PLACE_CATEGORIES, VIBE_TAGS, isValidCoordinate } from '../../utils/helpers';

// ── Schemas ───────────────────────────────────────────────────────────────────

const upsertPlaceSchema = z.object({
  place_id: z.string().min(1),
  name: z.string().min(1).max(200),
  category: z.enum(PLACE_CATEGORIES as [string, ...string[]]),
  vibes: z.array(z.enum(VIBE_TAGS as [string, ...string[]])).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  formatted_address: z.string().max(500).optional(),
  phone: z.string().max(30).optional(),
  website: z.string().url().optional(),
  rating: z.number().min(0).max(5).optional(),
  rating_count: z.number().int().min(0).optional(),
  price_level: z.enum(['0','1','2','3','4'] as [string, ...string[]]).optional(),
  open_now: z.boolean().optional(),
  opening_hours: z.unknown().optional(),
  photo_urls: z.array(z.string().url()).optional(),
  source: z.enum(['google_places', 'overpass', 'mixed']).optional(),
});

// ── Controllers ───────────────────────────────────────────────────────────────

const upsertPlace = asyncHandler(async (req: Request, res: Response) => {
  const place = await PlacesService.upsertPlace(req.body);
  sendCreated(res, place);
});

const getPlaceById = asyncHandler(async (req: Request, res: Response) => {
  const place = await PlacesService.getPlaceById(req.params.placeId);
  sendSuccess(res, place);
});

const searchPlaces = asyncHandler(async (req: Request, res: Response) => {
  const { q, page, limit, category, vibes } = req.query;
  if (!q || typeof q !== 'string' || q.trim().length < 2) {
    throw AppError.badRequest('Query parameter "q" must be at least 2 characters');
  }
  const result = await PlacesService.searchPlaces(q.trim(), page, limit, category as string, vibes as string);
  sendSuccess(res, result);
});

const getPlacesNearby = asyncHandler(async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  if (!isValidCoordinate(lat, lng)) throw AppError.badRequest('Valid lat and lng required');
  const radius = parseFloat(req.query.radius_km as string) || 5;
  const limit = parseInt(req.query.limit as string) || 20;
  const { category } = req.query;
  const places = await PlacesService.getPlacesNearby(lat, lng, radius, category as string, limit);
  sendSuccess(res, places);
});

const getPlaceDetail = asyncHandler(async (req: Request, res: Response) => {
  const detail = await PlacesService.getPlaceDetail(req.params.placeId);
  sendSuccess(res, detail);
});

const upsertPlaceDetail = asyncHandler(async (req: Request, res: Response) => {
  const detail = await PlacesService.upsertPlaceDetail(req.params.placeId, req.body);
  sendSuccess(res, detail);
});

const featurePlace = asyncHandler(async (req: Request, res: Response) => {
  await PlacesService.featurePlace(req.params.placeId, req.user!.id);
  sendSuccess(res, { message: 'Place featured' });
});

const adminListPlaces = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, category } = req.query;
  const result = await PlacesService.adminListPlaces(page, limit, category as string);
  sendSuccess(res, result);
});

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router();

/** @route GET /api/v1/places/search */
router.get('/search', authenticate, searchPlaces);

/** @route GET /api/v1/places/nearby */
router.get('/nearby', authenticate, getPlacesNearby);

/** @route GET /api/v1/places/:placeId */
router.get('/:placeId', authenticate, getPlaceById);

/** @route GET /api/v1/places/:placeId/detail */
router.get('/:placeId/detail', authenticate, getPlaceDetail);

/** @route POST /api/v1/places — Upsert into cache (service/admin only) */
router.post('/', authenticate, authorize('admin'), zodBody(upsertPlaceSchema), upsertPlace);

/** @route PUT /api/v1/places/:placeId/detail — Upsert detail cache (service/admin) */
router.put('/:placeId/detail', authenticate, authorize('admin'), upsertPlaceDetail);

/** @route POST /api/v1/places/:placeId/feature — Admin: feature a place */
router.post('/:placeId/feature', authenticate, authorize('admin'), featurePlace);

/** @route GET /api/v1/places — Admin: list all cached places */
router.get('/', authenticate, authorize('admin', 'moderator'), adminListPlaces);

export default router;
