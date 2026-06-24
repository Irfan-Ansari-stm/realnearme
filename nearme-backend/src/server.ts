import './config/env'; // validate env FIRST before anything else
import { createApp } from './app';
import { pool } from './config/database';
import { startCronJobs, stopCronJobs } from './jobs/cron';
import { env } from './config/env';
import { logger } from './utils/logger';

// ── Boot ──────────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  // Validate database connectivity before accepting traffic
  logger.info('Connecting to PostgreSQL...');
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT version(), PostGIS_Version()');
    const [pg] = result.rows;
    client.release();
    logger.info(
      { pg: pg.version?.split(' ').slice(0, 2).join(' '), postgis: pg.postgis_version },
      'PostgreSQL connected'
    );
  } catch (err) {
    logger.fatal({ err }, 'Cannot connect to PostgreSQL — aborting startup');
    process.exit(1);
  }

  // Start cron jobs
  startCronJobs();

  // Start HTTP server
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
        env: env.NODE_ENV,
        prefix: env.API_PREFIX,
        pid: process.pid,
      },
      `NearMe API running on port ${env.PORT}`
    );
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────────

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutdown signal received');

    // Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed');
      stopCronJobs();

      try {
        await pool.end();
        logger.info('PostgreSQL pool closed');
      } catch (err) {
        logger.error({ err }, 'Error closing PostgreSQL pool');
      }

      logger.info('Graceful shutdown complete');
      process.exit(0);
    });

    // Force shutdown after 15s if graceful fails
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 15_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  // Catch unhandled errors — log and exit so orchestrator can restart
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception — process will exit');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled promise rejection — process will exit');
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
