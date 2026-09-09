import { Pool } from 'pg';

let pool: Pool | undefined;

export function getDatabasePool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined });
  }
  return pool;
}

export async function checkDatabase() {
  const database = getDatabasePool();
  if (!database) return { configured: false, reachable: false };
  const client = await database.connect();
  try {
    await client.query('SELECT 1');
    return { configured: true, reachable: true };
  } finally {
    client.release();
  }
}
