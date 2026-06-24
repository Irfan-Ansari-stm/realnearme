import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_PREFIX: z.string().default('/api/v1'),

  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string().default('nearme'),
  DB_USER: z.string().default('nearme_app'),
  DB_PASSWORD: z.string().default(''),
  DB_POOL_MIN: z.coerce.number().default(2),
  DB_POOL_MAX: z.coerce.number().default(20),
  DB_SSL: z.string().default('false'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('60d'),

  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(200),

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  CRON_ENABLED: z.string().default('true'),
  CRON_CLEANUP_CACHE: z.string().default('0 3 * * *'),
  CRON_CLEANUP_NOTIFICATIONS: z.string().default('0 4 * * *'),
  CRON_CLEANUP_RATE_LIMITS: z.string().default('*/30 * * * *'),
  CRON_GDPR_HARD_DELETE: z.string().default('0 2 * * *'),
  CRON_POST_TOMBSTONES: z.string().default('0 5 * * *'),
  CRON_OLD_REPORTS: z.string().default('0 6 1 * *'),
  CRON_FEED_LOG: z.string().default('0 6 * * *'),

  FEED_MAX_RESULTS: z.coerce.number().default(50),
  FEED_CACHE_TTL_HOURS: z.coerce.number().default(24),
  PLACE_DETAIL_CACHE_TTL_HOURS: z.coerce.number().default(6),
  SEARCH_HISTORY_MAX: z.coerce.number().default(10),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌  Invalid environment variables:');
    parsed.error.issues.forEach((issue) => {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }
  return parsed.data;
}

export const env = validateEnv();
export type Env = typeof env;
