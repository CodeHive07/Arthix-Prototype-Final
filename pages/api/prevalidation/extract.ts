import type { NextApiRequest, NextApiResponse } from 'next';
import { dossierStatus, validateEntities, type ExtractedEntity } from '../../../lib/prevalidation';
import { bodyTooLarge, jsonError, requestId, secureApi } from '../../../lib/api-security';

function entity(value: string, normalizedValue: string | number, confidence: number, sourceDocument: string): ExtractedEntity { return { value, normalizedValue, confidence, sourceDocument, method: 'ocr' }; }
function extract(text: string, filename: string) {
  const source = filename || 'uploaded dossier';
  const premises = text.match(/(?:premises|site|plot|address)\s*[:\-]\s*([^\n,;]+)/i)?.[1]?.trim();
  const hpMatch = text.match(/(?:installed\s*hp|hp|horsepower)\s*[:\-]?\s*([\d,.]+)\s*(?:hp)?/i);
  const landMatch = text.match(/(?:land\s*area|plot\s*area|area)\s*[:\-]?\s*([\d,.]+)\s*(acres?|sq\.?\s*ft|sq\.?\s*m|sqm)?/i);
  const entities: Record<string, ExtractedEntity> = {};
  if (premises) entities.Premises = entity(premises, premises, .94, source);
  if (hpMatch) entities['Installed HP'] = entity(`${hpMatch[1]} HP`, Number(hpMatch[1].replace(/,/g, '')), .91, source);
  if (landMatch) entities['Land Area'] = entity(`${landMatch[1]} ${landMatch[2] || 'sq. m'}`, Number(landMatch[1].replace(/,/g, '')), .89, source);
  const discrepancies = validateEntities(entities);
  return { entities, discrepancies, dossierStatus: dossierStatus(discrepancies, entities), sourceDocument: source, extractedAt: new Date().toISOString() };
}
export default function handler(request: NextApiRequest, response: NextApiResponse) {
  const id = requestId(request); secureApi(response, id);
  if (request.method !== 'POST') return jsonError(response, 405, 'POST required', id);
  if (bodyTooLarge(request, 2_000_000)) return jsonError(response, 413, 'Request body is too large.', id);
  const text = typeof request.body?.text === 'string' ? request.body.text.slice(0, 1_500_000) : '';
  const filename = typeof request.body?.filename === 'string' ? request.body.filename : 'uploaded dossier';
  response.status(200).json(extract(text, filename));
}
