import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchOgdResource } from '../../../services/government-data';
import { bodyTooLarge, jsonError, requestId, secureApi } from '../../../lib/api-security';

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  const id = requestId(request); secureApi(response, id);
  if (request.method !== 'POST') return jsonError(response, 405, 'POST required', id);
  if (bodyTooLarge(request, 32_000)) return jsonError(response, 413, 'Request body is too large.', id);
  const result = await fetchOgdResource(typeof request.body?.resourceId === 'string' ? request.body.resourceId : undefined);
  response.status(result.warning && result.source.state !== 'not-configured' ? 502 : 200).json(result);
}
