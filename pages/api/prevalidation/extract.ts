import type { NextApiRequest, NextApiResponse } from 'next';
import { extractEntities } from '../../../lib/prevalidation';
import { bodyTooLarge, jsonError, requestId, secureApi } from '../../../lib/api-security';

function optionalNumber(value: unknown): number | undefined { const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN; return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined; }

export default function handler(request: NextApiRequest, response: NextApiResponse) {
  const id = requestId(request); secureApi(response, id);
  if (request.method !== 'POST') return jsonError(response, 405, 'POST required', id);
  if (bodyTooLarge(request, 2_000_000)) return jsonError(response, 413, 'Request body is too large.', id);
  const text = typeof request.body?.text === 'string' ? request.body.text.slice(0, 1_500_000) : '';
  const filename = typeof request.body?.filename === 'string' ? request.body.filename : 'uploaded dossier';
  // Only positive numeric fields are taken from the client-supplied profile; they power cross-field checks.
  const profile = request.body?.project && typeof request.body.project === 'object'
    ? { landArea: optionalNumber(request.body.project.landArea), electricityLoadKw: optionalNumber(request.body.project.electricityLoadKw) }
    : undefined;
  response.status(200).json(extractEntities(text, filename, profile));
}
