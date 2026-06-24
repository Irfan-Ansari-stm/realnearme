import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../../config/database';
import { pool } from '../../config/database';
import os from 'os';

const router = Router();

/**
 * @route  GET /health
 * @desc   Liveness check (used by Docker / load balancer)
 */
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', ts: new Date().toISOString() });
});

/**
 * @route  GET /health/ready
 * @desc   Readiness check — confirms DB is reachable before accepting traffic
 */
router.get('/ready', async (_req: Request, res: Response) => {
  const dbOk = await checkDatabaseHealth();

  if (!dbOk) {
    res.status(503).json({
      status: 'not_ready',
      db: 'unreachable',
      ts: new Date().toISOString(),
    });
    return;
  }

  res.status(200).json({
    status: 'ready',
    db: 'ok',
    ts: new Date().toISOString(),
  });
});

/**
 * @route  GET /health/detailed
 * @desc   Full diagnostics — DB pool, memory, uptime (internal/admin only)
 */
router.get('/detailed', async (_req: Request, res: Response) => {
  const dbOk = await checkDatabaseHealth();
  const used = process.memoryUsage();

  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'healthy' : 'degraded',
    uptime_seconds: process.uptime(),
    node_version: process.version,
    environment: process.env.NODE_ENV,
    db: {
      status: dbOk ? 'ok' : 'error',
      pool_total: pool.totalCount,
      pool_idle: pool.idleCount,
      pool_waiting: pool.waitingCount,
    },
    memory: {
      heap_used_mb: Math.round(used.heapUsed / 1024 / 1024),
      heap_total_mb: Math.round(used.heapTotal / 1024 / 1024),
      rss_mb: Math.round(used.rss / 1024 / 1024),
    },
    os: {
      free_mem_mb: Math.round(os.freemem() / 1024 / 1024),
      cpus: os.cpus().length,
      load_avg: os.loadavg(),
    },
    ts: new Date().toISOString(),
  });
});

export default router;
