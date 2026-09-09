import { analyzeArthixProject, regulatoryRules, type ArthixAnalysis, type ProjectData, type RegulatoryRule } from './arthix-rules';

export const RULES_ENGINE_VERSION = 'arthix-rules-maharashtra-v1.1.0';
export const RULES_ENGINE_UPDATED_AT = '2026-09-08';

export type SourceKey = 'arthix-rulebook' | 'data-gov-in' | 'mpcb' | 'midc' | 'udyam';
export type SourceState = 'configured' | 'available' | 'not-configured' | 'reference-only' | 'error';
export type RuleSource = { key: SourceKey; name: string; authority: string; kind: 'rulebook' | 'open-data' | 'official-reference'; url: string; state: SourceState; resourceId?: string; lastChecked: string; note: string };
export type RulesSnapshot = { engineVersion: string; generatedAt: string; status: 'ready' | 'partial'; rules: RegulatoryRule[]; sources: RuleSource[]; warnings: string[]; audit: { event: string; at: string; version: string; note: string }[] };

export const ruleSources: RuleSource[] = [
  { key: 'arthix-rulebook', name: 'Arthix Maharashtra rulebook', authority: 'Arthix policy team', kind: 'rulebook', url: 'https://www.mpcb.gov.in/en/consentmgt/water-and-air-act', state: 'available', lastChecked: RULES_ENGINE_UPDATED_AT, note: 'Versioned deterministic rules with official provenance links.' },
  { key: 'data-gov-in', name: 'Open Government Data API', authority: 'Government of India OGD Platform', kind: 'open-data', url: 'https://data.gov.in/apis', resourceId: process.env.DATA_GOV_IN_RESOURCE_ID, state: process.env.DATA_GOV_IN_API_KEY && process.env.DATA_GOV_IN_RESOURCE_ID ? 'configured' : 'not-configured', lastChecked: RULES_ENGINE_UPDATED_AT, note: 'Requires a server-side API key and dataset resource ID.' },
  { key: 'mpcb', name: 'MPCB consent guidance', authority: 'Maharashtra Pollution Control Board', kind: 'official-reference', url: 'https://www.mpcb.gov.in/en/consentmgt/water-and-air-act', state: 'reference-only', lastChecked: RULES_ENGINE_UPDATED_AT, note: 'Official reference page; no public API was assumed.' },
  { key: 'midc', name: 'MIDC investor and land services', authority: 'Maharashtra Industrial Development Corporation', kind: 'official-reference', url: 'https://midc.maharashtra.gov.in/en/investors/', state: 'reference-only', lastChecked: RULES_ENGINE_UPDATED_AT, note: 'Official service reference; land availability remains authority-controlled.' },
  { key: 'udyam', name: 'Udyam registration', authority: 'Ministry of MSME', kind: 'official-reference', url: 'https://udyamregistration.gov.in/', state: 'reference-only', lastChecked: RULES_ENGINE_UPDATED_AT, note: 'Official registration reference; eligibility is not inferred from workforce alone.' },
];

export function getRulesSnapshot(): RulesSnapshot {
  const configured = ruleSources.some(source => source.state === 'configured');
  return { engineVersion: RULES_ENGINE_VERSION, generatedAt: new Date().toISOString(), status: configured ? 'ready' : 'partial', rules: regulatoryRules, sources: ruleSources, warnings: configured ? [] : ['Open Government Data API is not configured. Deterministic rulebook and official reference links remain available.'], audit: [{ event: 'rulebook_published', at: RULES_ENGINE_UPDATED_AT, version: RULES_ENGINE_VERSION, note: 'Versioned Maharashtra rules and official source references.' }] };
}

export function analyzeWithRulesEngine(project: ProjectData): ArthixAnalysis & { engineVersion: string; sourceKeys: SourceKey[] } {
  const analysis = analyzeArthixProject(project);
  return { ...analysis, engineVersion: RULES_ENGINE_VERSION, sourceKeys: ['arthix-rulebook', ...analysis.approvals.map(item => item.serviceId === 'mpcb' ? 'mpcb' : item.serviceId === 'power' ? 'midc' : 'arthix-rulebook')] };
}

export function normalizeOgdRows(rows: unknown[]): { id: string; label: string; value: string; source: SourceKey }[] {
  return rows.flatMap((row, index) => {
    if (!row || typeof row !== 'object') return [];
    const record = row as Record<string, unknown>;
    const values = Object.entries(record).filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '');
    return values.slice(0, 4).map(([label, value]) => ({ id: `ogd-${index}-${label}`, label, value: String(value), source: 'data-gov-in' as const }));
  });
}
