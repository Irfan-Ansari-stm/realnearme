import { Router, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { asyncHandler, AppError } from '../../utils/errors';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { triggerJobManually, jobNames } from '../../jobs/cron';

const router = Router();

router.use(authenticate, authorize('admin'));

/**
 * @route GET /api/v1/admin/jobs
 * @desc  List all registered cron job names
 */
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, { jobs: jobNames });
}));

/**
 * @route POST /api/v1/admin/jobs/:jobName/trigger
 * @desc  Manually trigger a maintenance job
 */
router.post('/:jobName/trigger', asyncHandler(async (req: Request, res: Response) => {
  const { jobName } = req.params;
  if (!jobNames.includes(jobName)) {
    throw AppError.notFound(`Job "${jobName}". Available: ${jobNames.join(', ')}`);
  }
  const result = await triggerJobManually(jobName);
  sendSuccess(res, { job: jobName, ...result });
}));

export default router;
