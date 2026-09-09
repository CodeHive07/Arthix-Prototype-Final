import type { State } from '../lib/udyog';
import { getDatabasePool } from '../lib/database';

type CaseEvent = { role: string; type: string; payload?: unknown };
type CaseRecord = { state: State; updatedAt: string };
const memoryCases = new Map<string, CaseRecord>();

export async function getCase(caseId: string) {
  const database = getDatabasePool();
  if (!database) return memoryCases.get(caseId) || null;
  const result = await database.query<{ state: State; updated_at: string }>('SELECT state, updated_at FROM cases WHERE case_id = $1', [caseId]);
  const row = result.rows[0];
  return row ? { state: row.state, updatedAt: row.updated_at } : null;
}

export async function saveCase(state: State) {
  const updatedAt = new Date().toISOString();
  const database = getDatabasePool();
  if (!database) {
    const record = { state, updatedAt };
    memoryCases.set(state.project.caseId, record);
    return record;
  }
  await database.query(
    'INSERT INTO cases (case_id, state, updated_at) VALUES ($1, $2, $3) ON CONFLICT (case_id) DO UPDATE SET state = EXCLUDED.state, updated_at = EXCLUDED.updated_at',
    [state.project.caseId, state, updatedAt],
  );
  return { state, updatedAt };
}

export async function appendCaseEvent(caseId: string, event: CaseEvent) {
  const current = await getCase(caseId);
  if (!current) return null;
  current.state.activity.unshift({ id: crypto.randomUUID(), at: new Date().toISOString(), role: event.role as State['activity'][number]['role'], text: `${event.type}: ${JSON.stringify(event.payload || {})}` });
  return saveCase(current.state);
}
