import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { env } from './env';

const schemaPath = path.resolve(
  process.cwd(),
  '..',
  '..',
  '2. db',
  'nearme_postgresql_v1_0.sql'
);

async function migrate(): Promise<void> {
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  const client = new Client({
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
  });

  await client.connect();
  try {
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(sql);
    console.log(`Database migration applied from ${schemaPath}`);
  } finally {
    await client.end();
  }
}

migrate().catch((err) => {
  console.error('Database migration failed:', err);
  process.exit(1);
});
