import type { RagCitation } from './rag-engine';

export type GroundedLlmRequest = { query: string; context: string; citations: RagCitation[] };
export type GroundedLlmResponse = { answer: string; citedSourceIds: string[]; confidence: 'high' | 'medium' | 'low' };

export async function generateGroundedAnswer(request: GroundedLlmRequest): Promise<GroundedLlmResponse | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const response = await fetch(process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.1, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'You are the Arthix Compliance Assistant. Answer only from the supplied context. Do not invent statutory requirements, documents, timelines, eligibility or decisions. Every regulatory claim must cite one or more source IDs from the context. If the context is insufficient, say so. Return JSON only: {"answer": string, "citedSourceIds": string[], "confidence": "high"|"medium"|"low"}.' }, { role: 'user', content: `Question: ${request.query}\n\nContext:\n${request.context}\n\nAllowed citations:\n${request.citations.map(citation => `${citation.id}: ${citation.title} | ${citation.authority} | ${citation.url} | rule ${citation.version}`).join('\n')}` }] }) });
  if (!response.ok) return null;
  const payload = await response.json() as { choices?: { message?: { content?: string } }[] };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return null;
  try { const parsed = JSON.parse(content) as GroundedLlmResponse; const allowed = new Set(request.citations.map(citation => citation.id)); const citedSourceIds = parsed.citedSourceIds.filter(id => allowed.has(id)); if (!parsed.answer || !citedSourceIds.length) return null; return { answer: parsed.answer, citedSourceIds, confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'medium' }; } catch { return null; }
}
