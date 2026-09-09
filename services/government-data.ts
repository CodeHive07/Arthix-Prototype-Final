import { normalizeOgdRows, type RuleSource } from '../lib/rules-engine';

type OgdResponse = { records?: unknown[]; result?: { records?: unknown[] } };
export type OgdFetchResult = { rows: ReturnType<typeof normalizeOgdRows>; source: RuleSource; fetchedAt: string; warning?: string };

export async function fetchOgdResource(resourceId = process.env.DATA_GOV_IN_RESOURCE_ID): Promise<OgdFetchResult> {
  const source: RuleSource = { key: 'data-gov-in', name: 'Open Government Data API', authority: 'Government of India OGD Platform', kind: 'open-data', url: 'https://data.gov.in/apis', resourceId, state: process.env.DATA_GOV_IN_API_KEY && resourceId ? 'configured' : 'not-configured', lastChecked: new Date().toISOString(), note: 'Server-side adapter. The API key is never returned to the client.' };
  if (!process.env.DATA_GOV_IN_API_KEY || !resourceId) return { rows: [], source, fetchedAt: new Date().toISOString(), warning: 'DATA_GOV_IN_API_KEY and DATA_GOV_IN_RESOURCE_ID are required for live OGD ingestion.' };
  const url = new URL(`https://api.data.gov.in/resource/${resourceId}`);
  url.searchParams.set('api-key', process.env.DATA_GOV_IN_API_KEY);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '100');
  try {
    const response = await fetch(url, { headers: { accept: 'application/json' }, next: { revalidate: 3600 } });
    if (!response.ok) throw new Error(`OGD responded with ${response.status}`);
    const payload = await response.json() as OgdResponse;
    return { rows: normalizeOgdRows(payload.records || payload.result?.records || []), source: { ...source, state: 'available' }, fetchedAt: new Date().toISOString() };
  } catch (error) {
    return { rows: [], source: { ...source, state: 'error' }, fetchedAt: new Date().toISOString(), warning: error instanceof Error ? error.message : 'OGD request failed.' };
  }
}
