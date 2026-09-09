import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { getDatabasePool } from '../lib/database';

async function migrate() {
  const database = getDatabasePool();
  if (!database) throw new Error('DATABASE_URL is required to run migrations.');
  await database.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  const directory = path.join(process.cwd(), 'db');
  const files = (await readdir(directory)).filter(file => /^\d+_.+\.sql$/.test(file)).sort();
  for (const file of files) {
    const existing = await database.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file]);
    if (existing.rowCount) continue;
    const sql = await readFile(path.join(directory, file), 'utf8');
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`Applied ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  await database.end();
}

migrate().catch(error => { console.error(error); process.exitCode = 1; });
