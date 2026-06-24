import cron from 'node-cron';
import { query } from '../config/database';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// ── Helper: run a stored procedure with logging ────────────────────────────────

async function runProcedure(name: string, args: unknown[] = []): Promise<void> {
  const start = Date.now();
  try {
    const placeholders = args.map((_, i) => `$${i + 1}`).join(', ');
    await query(`CALL ${name}(${placeholders})`, args);
    logger.info({ procedure: name, duration: Date.now() - start }, `Cron: ${name} completed`);
  } catch (err) {
    logger.error({ err, procedure: name }, `Cron: ${name} FAILED`);
  }
}

// ── Job definitions ───────────────────────────────────────────────────────────

const jobs: Array<{ name: string; schedule: string; fn: () => Promise<void> }> = [
  {
    name: 'cleanup_expired_cache',
    schedule: env.CRON_CLEANUP_CACHE,
    fn: () => runProcedure('proc_cleanup_expired_cache'),
  },
  {
    name: 'cleanup_expired_notifications',
    schedule: env.CRON_CLEANUP_NOTIFICATIONS,
    fn: () => runProcedure('proc_cleanup_expired_notifications'),
  },
  {
    name: 'cleanup_expired_rate_limits',
    schedule: env.CRON_CLEANUP_RATE_LIMITS,
    fn: () => runProcedure('proc_cleanup_expired_rate_limits'),
  },
  {
    name: 'gdpr_hard_delete',
    schedule: env.CRON_GDPR_HARD_DELETE,
    fn: () => runProcedure('proc_hard_delete_gdpr_users'),
  },
  {
    name: 'cleanup_post_tombstones',
    schedule: env.CRON_POST_TOMBSTONES,
    fn: () => runProcedure('proc_cleanup_post_tombstones'),
  },
  {
    name: 'cleanup_old_reports',
    schedule: env.CRON_OLD_REPORTS,
    fn: () => runProcedure('proc_cleanup_old_reports'),
  },
  {
    name: 'cleanup_feed_ranking_log',
    schedule: env.CRON_FEED_LOG,
    fn: () => runProcedure('proc_cleanup_feed_ranking_log'),
  },
];

// ── Lifecycle ─────────────────────────────────────────────────────────────────

let scheduledTasks: cron.ScheduledTask[] = [];

export function startCronJobs(): void {
  if (env.CRON_ENABLED !== 'true') {
    logger.info('Cron jobs disabled (CRON_ENABLED=false)');
    return;
  }

  jobs.forEach(({ name, schedule, fn }) => {
    if (!cron.validate(schedule)) {
      logger.warn({ name, schedule }, 'Invalid cron expression — job skipped');
      return;
    }

    const task = cron.schedule(schedule, async () => {
      logger.info({ name, schedule }, `Cron: starting ${name}`);
      await fn();
    });

    scheduledTasks.push(task);
    logger.info({ name, schedule }, `Cron job registered`);
  });

  logger.info(`${scheduledTasks.length} cron job(s) active`);
}

export function stopCronJobs(): void {
  scheduledTasks.forEach(t => t.stop());
  scheduledTasks = [];
  logger.info('All cron jobs stopped');
}

// ── Manual trigger (admin API) ────────────────────────────────────────────────

export async function triggerJobManually(jobName: string): Promise<{ ran: boolean }> {
  const job = jobs.find(j => j.name === jobName);
  if (!job) return { ran: false };
  await job.fn();
  return { ran: true };
}

export const jobNames = jobs.map(j => j.name);
