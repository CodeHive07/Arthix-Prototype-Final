import { analyzeWithRulesEngine, getRulesSnapshot } from './rules-engine';
import type { ProjectData } from './arthix-rules';
import { generateGroundedAnswer, llmProvider } from './llm-provider';
import { retrieveOfficialPages } from './official-sources';

export type RagCitation = { id: string; title: string; authority: string; url: string; version: string; relevance: number };
export type RagAnswer = { answer: string; confidence: 'high' | 'medium' | 'low'; citations: RagCitation[]; matchedRules: string[]; boundaries: string[]; provider: 'deterministic' | 'openai' | 'groq' | 'ollama' | 'custom' };
type Chunk = { id: string; text: string; title: string; authority: string; url: string; version: string; keywords: string[] };

function chunks(project: ProjectData): Chunk[] {
  const analysis = analyzeWithRulesEngine(project);
  return analysis.approvals.map(rule => { const result = analysis.applicability.find(item => item.ruleId === rule.id); const caveat = result?.decision === 'needs_confirmation' ? ` Confirmation is needed for: ${result.missingFacts.join(', ')}.` : ''; return { id: rule.id, text: `${rule.title}. ${rule.reason} Required documents: ${rule.documents.join(', ')}. Dependencies: ${rule.dependencies.join(', ') || 'none'}. Timeline: ${rule.timeline}.${caveat}`, title: rule.title, authority: rule.agency, url: rule.officialUrl, version: rule.version, keywords: `${rule.title} ${rule.agency} ${rule.serviceId} ${rule.documents.join(' ')} ${rule.reason} ${result?.missingFacts.join(' ') || ''}`.toLowerCase().split(/\s+/) }; });
}
function score(query: string, chunk: Chunk) { const tokens = query.toLowerCase().split(/[^a-z0-9]+/).filter(token => token.length > 2); return tokens.reduce((total, token) => total + (chunk.keywords.some(keyword => keyword.includes(token)) ? 1 : 0), 0); }
export async function answerComplianceQuery(query: string, project: ProjectData): Promise<RagAnswer> {
  const ranked = chunks(project).map(chunk => ({ chunk, score: score(query, chunk) })).sort((a, b) => b.score - a.score).filter(item => item.score > 0).slice(0, 3);
  const selected = ranked.length ? ranked : chunks(project).slice(0, 2).map(chunk => ({ chunk, score: 0 }));
  const first = selected[0]?.chunk;
  const highSignal = ranked[0]?.score >= 2;
  const pages = await retrieveOfficialPages(query, selected.map(item => item.chunk.url));
  const livePages = pages.filter(page => page.status === 'available');
  const pageNote = livePages.length ? ` Live official pages were consulted for this answer: ${livePages.map(page => `${page.title} (${page.authority})`).join('; ')}.` : '';
  const answer = first ? highSignal ? `${first.title} is the closest applicable route for this project profile. ${first.text} Review the cited authority guidance before taking action.${pageNote}` : `I found related guidance, but the query is not specific enough for a confident determination. The most relevant route is ${first.title}. ${first.text}${pageNote}` : `No applicable rule matched this project profile. Add more project details or review the official source registry.${pageNote}`;
  const citations: RagCitation[] = [
    ...selected.map(item => ({ id: item.chunk.id, title: item.chunk.title, authority: item.chunk.authority, url: item.chunk.url, version: item.chunk.version, relevance: item.score })),
    ...livePages.map(page => ({ id: page.id, title: page.title, authority: page.authority, url: page.url, version: `live · ${page.fetchedAt.slice(0, 10)}`, relevance: 1 })),
  ];
  const deterministic = { answer, confidence: highSignal ? 'high' as const : ranked.length ? 'medium' as const : 'low' as const, citations, matchedRules: ranked.map(item => item.chunk.id), boundaries: ['This is contextual guidance, not legal advice.', 'The responsible authority determines applicability, documentation and approval.', 'Current notifications or local conditions may supersede this indexed rule.', 'Request and inspect citations before acting.'], provider: 'deterministic' as const };
  const pageContext = livePages.map(page => `Official page ${page.id} — ${page.title} | ${page.authority} | ${page.url}:\n${page.text.slice(0, 2500)}`).join('\n\n');
  const llm = await generateGroundedAnswer({ query, context: `${selected.map(item => item.chunk.text).join('\n')}${pageContext ? `\n\n${pageContext}` : ''}`, citations });
  if (!llm) return deterministic;
  const label = llmProvider()?.label;
  return { ...deterministic, answer: llm.answer, confidence: llm.confidence, provider: label && label !== 'none' ? label : 'openai' };
}
export function ragHealth() { const snapshot = getRulesSnapshot(); const provider = llmProvider(); return { provider: provider ? `${provider.label}-grounded` : 'deterministic', llm: provider?.label ?? 'none', officialWebGrounding: true, engineVersion: snapshot.engineVersion, indexedRules: snapshot.rules.length, sourceCount: snapshot.sources.length }; }
