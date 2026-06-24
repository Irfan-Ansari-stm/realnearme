import { Router, Request, Response } from 'express';
import * as FeedService from './feed.service';
import { sendSuccess } from '../../utils/response';
import { asyncHandler, AppError } from '../../utils/errors';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { feedRateLimit } from '../../middleware/rateLimit.middleware';
import { isValidCoordinate, VIBE_TAGS, PLACE_CATEGORIES } from '../../utils/helpers';

// ── Controller ────────────────────────────────────────────────────────────────

const getFeed = asyncHandler(async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (!isValidCoordinate(lat, lng)) {
    throw AppError.badRequest('Valid lat and lng query parameters are required');
  }

  const radius_km = parseFloat(req.query.radius_km as string) || 5;
  const vibes = req.query.vibes
    ? (req.query.vibes as string).split(',').filter(v => VIBE_TAGS.includes(v as never))
    : [];
  const categories = req.query.categories
    ? (req.query.categories as string).split(',').filter(c => PLACE_CATEGORIES.includes(c as never))
    : [];
  const price_min = parseInt(req.query.price_min as string) || 0;
  const price_max = parseInt(req.query.price_max as string) || 4;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

  const result = await FeedService.getRankedFeed(req.user!.id, {
    lat, lng, radius_km,
    vibes: vibes as never,
    categories: categories as never,
    price_min, price_max, limit,
  });

  sendSuccess(res, result);
});

const getAlgorithmConfig = asyncHandler(async (_req: Request, res: Response) => {
  const config = await FeedService.getAlgorithmConfig();
  sendSuccess(res, config);
});

const listAlgorithmVersions = asyncHandler(async (_req: Request, res: Response) => {
  const versions = await FeedService.listAlgorithmVersions();
  sendSuccess(res, versions);
});

const updateAlgorithmConfig = asyncHandler(async (req: Request, res: Response) => {
  const { version, weights } = req.body as { version: string; weights: Record<string, number> };
  if (!version || !weights) throw AppError.badRequest('version and weights are required');
  const config = await FeedService.updateAlgorithmConfig(version, weights, req.user!.id);
  sendSuccess(res, config);
});

const getFeedAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 7;
  const analytics = await FeedService.getFeedAnalytics(days);
  sendSuccess(res, analytics);
});

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router();

/**
 * @route  GET /api/v1/feed
 * @desc   Get ranked nearby places feed
 * @query  lat, lng, radius_km, vibes, categories, price_min, price_max, limit
 */
router.get('/', authenticate, feedRateLimit, getFeed);

/**
 * @route  GET /api/v1/feed/algorithm
 * @desc   Get active ranking algorithm config
 */
router.get('/algorithm', authenticate, getAlgorithmConfig);

/**
 * @route  GET /api/v1/feed/algorithm/versions
 * @desc   Admin: list all algorithm versions
 */
router.get('/algorithm/versions', authenticate, authorize('admin'), listAlgorithmVersions);

/**
 * @route  PUT /api/v1/feed/algorithm
 * @desc   Admin: deploy new algorithm weights
 */
router.put('/algorithm', authenticate, authorize('admin'), updateAlgorithmConfig);

/**
 * @route  GET /api/v1/feed/analytics
 * @desc   Admin: feed usage analytics (last N days)
 */
router.get('/analytics', authenticate, authorize('admin'), getFeedAnalytics);

export default router;
