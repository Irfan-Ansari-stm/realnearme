import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as PostsService from './posts.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/response';
import { asyncHandler } from '../../utils/errors';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { zodBody, validateUuidParam } from '../../middleware/validate.middleware';
import { postsWriteRateLimit } from '../../middleware/rateLimit.middleware';
import { PLACE_CATEGORIES, VIBE_TAGS, MEDIA_TYPES } from '../../utils/helpers';

// ── Schemas ───────────────────────────────────────────────────────────────────

const createPostSchema = z.object({
  place_id: z.string().min(1),
  caption: z.string().max(500).optional(),
  category: z.enum(PLACE_CATEGORIES as [string, ...string[]]),
  vibes: z.array(z.enum(VIBE_TAGS as [string, ...string[]])).max(3).optional(),
  storage_ref: z.string().min(1),
  media_type: z.enum(MEDIA_TYPES as [string, ...string[]]),
  safe_search_scores: z.record(z.string()).optional(),
});

const moderateSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().max(500).optional(),
});

// ── Controllers ───────────────────────────────────────────────────────────────

const createPost = asyncHandler(async (req: Request, res: Response) => {
  const post = await PostsService.createPost(req.user!.id, req.body);
  sendCreated(res, post);
});

const getPostById = asyncHandler(async (req: Request, res: Response) => {
  const post = await PostsService.getPostById(req.params.postId, req.user?.id);
  sendSuccess(res, post);
});

const getPostsForPlace = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query;
  const result = await PostsService.getPostsForPlace(req.params.placeId, page, limit);
  sendSuccess(res, result);
});

const getMyPosts = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, status } = req.query;
  const result = await PostsService.getMyPosts(req.user!.id, page, limit, status as string);
  sendSuccess(res, result);
});

const deletePost = asyncHandler(async (req: Request, res: Response) => {
  await PostsService.deletePost(req.params.postId, req.user!.id);
  sendNoContent(res);
});

const likePost = asyncHandler(async (req: Request, res: Response) => {
  const result = await PostsService.likePost(req.user!.id, req.params.postId);
  sendSuccess(res, result);
});

const unlikePost = asyncHandler(async (req: Request, res: Response) => {
  const result = await PostsService.unlikePost(req.user!.id, req.params.postId);
  sendSuccess(res, result);
});

const isLiked = asyncHandler(async (req: Request, res: Response) => {
  const liked = await PostsService.isLiked(req.user!.id, req.params.postId);
  sendSuccess(res, { post_id: req.params.postId, is_liked: liked });
});

const getPostLikes = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query;
  const result = await PostsService.getPostLikes(req.params.postId, page, limit);
  sendSuccess(res, result);
});

const moderatePost = asyncHandler(async (req: Request, res: Response) => {
  const { action, reason } = req.body as { action: 'approve' | 'reject'; reason?: string };
  const post = await PostsService.moderatePost(req.params.postId, req.user!.id, action, reason);
  sendSuccess(res, post);
});

const getModerationQueue = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query;
  const result = await PostsService.getModerationQueue(page, limit);
  sendSuccess(res, result);
});

const adminListPosts = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, status, place_id } = req.query;
  const result = await PostsService.adminListPosts(page, limit, status as string, place_id as string);
  sendSuccess(res, result);
});

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router();

/** @route GET /api/v1/posts — Admin: list all posts */
router.get('/', authenticate, authorize('admin', 'moderator'), adminListPosts);

/** @route GET /api/v1/posts/me — Own posts */
router.get('/me', authenticate, getMyPosts);

/** @route GET /api/v1/posts/moderation-queue */
router.get('/moderation-queue', authenticate, authorize('admin', 'moderator'), getModerationQueue);

/** @route POST /api/v1/posts */
router.post('/', authenticate, postsWriteRateLimit, zodBody(createPostSchema), createPost);

/** @route GET /api/v1/posts/:postId */
router.get('/:postId', authenticate, validateUuidParam('postId'), getPostById);

/** @route DELETE /api/v1/posts/:postId */
router.delete('/:postId', authenticate, validateUuidParam('postId'), deletePost);

/** @route GET /api/v1/posts/place/:placeId */
router.get('/place/:placeId', authenticate, getPostsForPlace);

/** @route POST /api/v1/posts/:postId/like */
router.post('/:postId/like', authenticate, validateUuidParam('postId'), likePost);

/** @route DELETE /api/v1/posts/:postId/like */
router.delete('/:postId/like', authenticate, validateUuidParam('postId'), unlikePost);

/** @route GET /api/v1/posts/:postId/like/check */
router.get('/:postId/like/check', authenticate, validateUuidParam('postId'), isLiked);

/** @route GET /api/v1/posts/:postId/likes */
router.get('/:postId/likes', authenticate, validateUuidParam('postId'), getPostLikes);

/** @route PATCH /api/v1/posts/:postId/moderate */
router.patch('/:postId/moderate', authenticate, authorize('admin', 'moderator'), validateUuidParam('postId'), zodBody(moderateSchema), moderatePost);

export default router;
