import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { logger } from '../utils/logger';

// ─────────────────────────────────────────────────────────────────────────────
// PostgreSQL connection pool
// Uses nearme.is_service_role = 'true' so all application queries bypass RLS
// the same way the Cloud Function Admin SDK does in Firestore.
// Per-request user-scoped queries can use setCurrentUser() helper.
// ─────────────────────────────────────────────────────────────────────────────

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'nearme',
  user: process.env.DB_USER || 'nearme_app',
  password: process.env.DB_PASSWORD || '',
  min: parseInt(process.env.DB_POOL_MIN || '2', 10),
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
};

export const pool = new Pool(poolConfig);

pool.on('connect', (client) => {
  // Every new connection: set service role flag so RLS policies allow full access
  client.query("SET nearme.is_service_role = 'true'").catch((err) => {
    logger.error({ err }, 'Failed to set service role on new connection');
  });
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected PostgreSQL pool error');
});

// ── Typed query helpers ───────────────────────────────────────────────────────

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(sql, params);
    const duration = Date.now() - start;
    if (duration > 500) {
      logger.warn({ sql: sql.slice(0, 100), duration }, 'Slow query detected');
    }
    return result;
  } catch (err) {
    logger.error({ err, sql: sql.slice(0, 100) }, 'Database query error');
    throw err;
  }
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await query<T>(sql, params);
  return result.rows[0] ?? null;
}

// ── Transaction helper ────────────────────────────────────────────────────────

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Mark as service role inside transaction too
    await client.query("SET LOCAL nearme.is_service_role = 'true'");
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── User-scoped query (for RLS — used in service layer) ───────────────────────

export async function withUserContext<T>(
  userId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL nearme.is_service_role = 'true'");
    await client.query('SET LOCAL nearme.current_user_id = $1', [userId]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Health check ──────────────────────────────────────────────────────────────

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
