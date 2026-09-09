import type { RagCitation } from './rag-engine';

export type GroundedLlmRequest = { query: string; context: string; citations: RagCitation[] };
export type GroundedLlmResponse = { answer: string; citedSourceIds: string[]; confidence: 'high' | 'medium' | 'low' };

export type LlmProviderLabel = 'openai' | 'groq' | 'gemini' | 'ollama' | 'custom' | 'none';

export function llmProvider(): { label: LlmProviderLabel; baseUrl: string; apiKey: string } | null {
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions';
  let host = '';
  try { host = new URL(baseUrl).hostname.toLowerCase(); } catch { return null; }
  const local = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  const apiKey = process.env.OPENAI_API_KEY || (local ? 'ollama-local' : '');
  if (!apiKey) return null;
  const label: LlmProviderLabel = host.includes('groq') ? 'groq' : host.includes('generativelanguage.googleapis.com') ? 'gemini' : local ? 'ollama' : host.includes('openai.com') ? 'openai' : 'custom';
  return { label, baseUrl, apiKey };
}

export async function generateGroundedAnswer(request: GroundedLlmRequest): Promise<GroundedLlmResponse | null> {
  const provider = llmProvider();
  if (!provider) return null;
  try {
    const response = await fetch(provider.baseUrl, { signal: AbortSignal.timeout(15000), method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${provider.apiKey}` }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.1, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'You are the Arthix Compliance Assistant. Answer only from the supplied context, which contains indexed compliance rules and excerpts fetched live from official government pages. Do not invent statutory requirements, documents, timelines, eligibility or decisions. Every regulatory claim must cite one or more source IDs from the context, including the official page IDs when the claim comes from a page. If the context is insufficient, say so. Return JSON only: {"answer": string, "citedSourceIds": string[], "confidence": "high"|"medium"|"low"}.' }, { role: 'user', content: `Question: ${request.query}\n\nContext:\n${request.context}\n\nAllowed citations:\n${request.citations.map(citation => `${citation.id}: ${citation.title} | ${citation.authority} | ${citation.url} | ${citation.version}`).join('\n')}` }] }) });
    if (!response.ok) return null;
    const payload = await response.json() as { choices?: { message?: { content?: string } }[] };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as GroundedLlmResponse;
    const allowed = new Set(request.citations.map(citation => citation.id));
    const citedSourceIds = parsed.citedSourceIds.filter(id => allowed.has(id));
    if (!parsed.answer || !citedSourceIds.length) return null;
    return { answer: parsed.answer, citedSourceIds, confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'medium' };
  } catch { return null; }
}
