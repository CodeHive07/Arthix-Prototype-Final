import type { NextApiRequest, NextApiResponse } from 'next';
import { bodyTooLarge, jsonError, requestId, secureApi } from '../../../lib/api-security';
import { requireSession } from '../../../lib/auth';
import { validState, type State } from '../../../lib/udyog';
import { getCase, saveCase } from '../../../services/case-repository';

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  const id = requestId(request);
  secureApi(response, id);
  if (!['GET', 'PUT'].includes(request.method || '')) return jsonError(response, 405, 'GET or PUT required.', id);
  if (bodyTooLarge(request, 2_000_000)) return jsonError(response, 413, 'Request body is too large.', id);
  if (!requireSession(request, response, ['Applicant'])) return;

  const caseId = typeof request.query.caseId === 'string' ? request.query.caseId : typeof request.body?.caseId === 'string' ? request.body.caseId : '';
  if (!caseId || !/^[A-Za-z0-9_-]{3,80}$/.test(caseId)) return jsonError(response, 400, 'A valid caseId is required.', id);

  if (request.method === 'GET') {
    const record = await getCase(caseId);
    return record ? response.status(200).json(record) : jsonError(response, 404, 'Case not found.', id);
  }

  const state = request.body?.state as State;
  if (!validState(state) || state.project.caseId !== caseId) return jsonError(response, 400, 'A valid state matching caseId is required.', id);
  return response.status(200).json(await saveCase(state));
}
