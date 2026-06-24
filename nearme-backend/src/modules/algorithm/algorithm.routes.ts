import { Router, Request, Response } from 'express';
import { query, queryOne } from '../../config/database';
import { sendSuccess } from '../../utils/response';
import { asyncHandler, AppError } from '../../utils/errors';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { zodBody } from '../../middleware/validate.middleware';
import { z } from 'zod';

// ── Service ───────────────────────────────────────────────────────────────────

const weightSchema = z.object({
  version: z.string().regex(/^\d+\.\d+$/, 'Version must be in format X.Y'),
  weights: z.object({
    proximity: z.number().min(0).max(1),
    rating: z.number().min(0).max(1),
    vibe: z.number().min(0).max(1),
    category: z.number().min(0).max(1),
    recency: z.number().min(0).max(1),
    popularity: z.number().min(0).max(1),
  }).refine(
    w => Math.abs(Object.values(w).reduce((a, b) => a + b, 0) - 1.0) < 0.001,
    { message: 'Weights must sum to 1.0' }
  ),
  deployed_by: z.string().optional(),
});

async function listVersions() {
  const result = await query(
    'SELECT * FROM algorithm_config ORDER BY deployed_at DESC'
  );
  return result.rows;
}

async function getActiveConfig() {
  const config = await queryOne(
    'SELECT * FROM algorithm_config WHERE is_active = TRUE LIMIT 1'
  );
  if (!config) throw AppError.notFound('Active algorithm config');
  return config;
}

async function activateVersion(version: string, adminId: string) {
  // Check version exists
  const exists = await queryOne<{ version: string }>(
    'SELECT version FROM algorithm_config WHERE version = $1',
    [version]
  );
  if (!exists) throw AppError.notFound(`Algorithm version ${version}`);

  await query('UPDATE algorithm_config SET is_active = FALSE');
  await query(
    'UPDATE algorithm_config SET is_active = TRUE, deployed_at = now(), deployed_by = $1 WHERE version = $2',
    [adminId, version]
  );

  await query(
    `INSERT INTO audit_log (admin_id, action, target_type, target_id, reason)
     VALUES ($1, 'rotate_secret', 'place', $2, 'algorithm_version_activated')`,
    [adminId, version]
  );

  return getActiveConfig();
}

async function deployVersion(
  version: string,
  weights: Record<string, number>,
  adminId: string
) {
  // Deactivate all
  await query('UPDATE algorithm_config SET is_active = FALSE');

  await query(
    `INSERT INTO algorithm_config (version, weights, is_active, deployed_by)
     VALUES ($1, $2, TRUE, $3)
     ON CONFLICT (version) DO UPDATE
       SET weights = EXCLUDED.weights,
           is_active = TRUE,
           deployed_at = now(),
           deployed_by = EXCLUDED.deployed_by`,
    [version, JSON.stringify(weights), adminId]
  );

  await query(
    `INSERT INTO audit_log (admin_id, action, target_type, target_id, reason)
     VALUES ($1, 'rotate_secret', 'place', $2, $3)`,
    [adminId, version, `Algorithm v${version} deployed`]
  );

  return getActiveConfig();
}

async function deleteVersion(version: string) {
  // Cannot delete active version
  const config = await queryOne<{ is_active: boolean }>(
    'SELECT is_active FROM algorithm_config WHERE version = $1',
    [version]
  );
  if (!config) throw AppError.notFound(`Algorithm version ${version}`);
  if (config.is_active) throw AppError.conflict('Cannot delete the currently active version');

  await query('DELETE FROM algorithm_config WHERE version = $1', [version]);
}

// ── Controllers ───────────────────────────────────────────────────────────────

const listVersionsCtrl = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await listVersions());
});

const getActiveCtrl = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await getActiveConfig());
});

const deployCtrl = asyncHandler(async (req: Request, res: Response) => {
  const { version, weights } = req.body as { version: string; weights: Record<string, number> };
  const config = await deployVersion(version, weights, req.user!.id);
  sendSuccess(res, config, 201);
});

const activateCtrl = asyncHandler(async (req: Request, res: Response) => {
  const config = await activateVersion(req.params.version, req.user!.id);
  sendSuccess(res, config);
});

const deleteCtrl = asyncHandler(async (req: Request, res: Response) => {
  await deleteVersion(req.params.version);
  sendSuccess(res, { message: `Version ${req.params.version} deleted` });
});

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router();

router.use(authenticate, authorize('admin'));

/** @route GET /api/v1/algorithm — List all versions */
router.get('/', listVersionsCtrl);

/** @route GET /api/v1/algorithm/active — Get currently active config */
router.get('/active', getActiveCtrl);

/** @route POST /api/v1/algorithm — Deploy new version */
router.post('/', zodBody(weightSchema), deployCtrl);

/** @route PATCH /api/v1/algorithm/:version/activate — Activate existing version */
router.patch('/:version/activate', activateCtrl);

/** @route DELETE /api/v1/algorithm/:version — Delete non-active version */
router.delete('/:version', deleteCtrl);

export default router;
