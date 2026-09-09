export type OfficialPage = { id: string; url: string; title: string; authority: string; text: string; fetchedAt: string; status: 'available' | 'error' | 'blocked'; warning?: string };

const ALLOWED_HOST_SUFFIXES = ['.gov.in', '.nic.in'];
const ALLOWED_HOSTS = new Set(['mahadiscom.in', 'www.mahadiscom.in', 'mahadish.in', 'www.mahadish.in']);
const KNOWN_AUTHORITIES: Record<string, string> = {
  'mpcb.gov.in': 'Maharashtra Pollution Control Board',
  'www.mpcb.gov.in': 'Maharashtra Pollution Control Board',
  'midc.maharashtra.gov.in': 'Maharashtra Industrial Development Corporation',
  'udyamregistration.gov.in': 'Ministry of MSME, Government of India',
  'mahafireservice.gov.in': 'Maharashtra Fire & Emergency Services',
  'mahadiscom.in': 'MSEDCL',
  'www.mahadiscom.in': 'MSEDCL',
  'mahadish.in': 'Directorate of Industrial Safety and Health, Maharashtra',
  'www.mahadish.in': 'Directorate of Industrial Safety and Health, Maharashtra',
  'data.gov.in': 'Government of India OGD Platform',
};

export function isAllowedOfficialUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    const host = url.hostname.toLowerCase();
    return ALLOWED_HOSTS.has(host) || ALLOWED_HOST_SUFFIXES.some(suffix => host.endsWith(suffix));
  } catch { return false; }
}

export function extractPageText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/&(mdash|ndash|rsquo|lsquo|rdquo|ldquo|hellip|copy|reg|trade);/gi, (entity, name: string) => ({ mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', copy: '©', reg: '®', trade: '™' } as Record<string, string>)[name.toLowerCase()] || entity)
    .replace(/&#(\d+);/g, (entity, code: string) => { const value = Number(code); return Number.isInteger(value) && value > 0 && value < 65536 ? String.fromCharCode(value) : entity; })
    .replace(/\s+/g, ' ')
    .trim();
}

export function pageTitle(html: string, fallback: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? extractPageText(match[1]).slice(0, 140) || fallback : fallback;
}

export function officialAuthority(url: string): string {
  try { return KNOWN_AUTHORITIES[new URL(url).hostname.toLowerCase()] || new URL(url).hostname; } catch { return 'Official government source'; }
}

type FetchLike = (url: string, init: { signal: AbortSignal; headers: Record<string, string> }) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;
const MAX_TEXT_CHARS = 6000;
const cache = new Map<string, { expires: number; page: OfficialPage }>();

function cached(url: string): OfficialPage | null {
  const hit = cache.get(url);
  if (!hit) return null;
  if (hit.expires <= Date.now()) { cache.delete(url); return null; }
  return hit.page;
}

function store(page: OfficialPage) {
  if (page.status !== 'available') return;
  if (cache.size >= MAX_CACHE_ENTRIES) { const oldest = cache.keys().next(); if (!oldest.done) cache.delete(oldest.value); }
  cache.set(page.url, { expires: Date.now() + CACHE_TTL_MS, page });
}

async function fetchPage(url: string, fetchImpl: FetchLike): Promise<OfficialPage> {
  const base = { id: `official-${new URL(url).hostname}`, url, authority: officialAuthority(url), fetchedAt: new Date().toISOString() };
  try {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(8000), headers: { accept: 'text/html,application/xhtml+xml' } });
    const html = await response.text();
    if (!response.ok) return { ...base, title: pageTitle(html, base.authority), text: '', status: 'error', warning: `Official page responded with ${response.status}.` };
    const text = extractPageText(html).slice(0, MAX_TEXT_CHARS);
    if (text.length < 80) return { ...base, title: pageTitle(html, base.authority), text: '', status: 'error', warning: 'Official page returned no readable content.' };
    return { ...base, title: pageTitle(html, base.authority), text, status: 'available' };
  } catch (error) {
    return { ...base, title: base.authority, text: '', status: 'error', warning: error instanceof Error ? error.message : 'Official page request failed.' };
  }
}

export async function retrieveOfficialPages(query: string, urls: string[], options?: { fetchImpl?: FetchLike; limit?: number }): Promise<OfficialPage[]> {
  const limit = options?.limit ?? 3;
  const fetchImpl = options?.fetchImpl || (globalThis.fetch as unknown as FetchLike);
  const seen = new Set<string>();
  const candidates = urls.filter(url => {
    if (!isAllowedOfficialUrl(url) || seen.has(url)) return false;
    seen.add(url);
    return true;
  }).slice(0, limit);
  if (!candidates.length) return [];
  const tokens = query.toLowerCase().split(/[^a-z0-9]+/).filter(token => token.length > 2);
  const pages = await Promise.all(candidates.map(async url => cached(url) || await fetchPage(url, fetchImpl).then(page => { store(page); return page; })));
  return pages.sort((a, b) => {
    const rank = (page: OfficialPage) => page.status === 'available' ? tokens.reduce((total, token) => total + (page.text.toLowerCase().includes(token) ? 1 : 0), 0) : -1;
    return rank(b) - rank(a);
  });
}