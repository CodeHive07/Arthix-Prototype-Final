import type { NextApiRequest, NextApiResponse } from 'next';
import { appendCaseEvent } from '../../../services/case-repository';
import { requireSession } from '../../../lib/auth';
import { bodyTooLarge, jsonError, requestId, secureApi } from '../../../lib/api-security';

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  const id = requestId(request); secureApi(response, id);
  if (request.method !== 'POST') return jsonError(response, 405, 'POST required', id);
  if (bodyTooLarge(request)) return jsonError(response, 413, 'Request body is too large.', id);
  const session = requireSession(request, response, ['Applicant']);
  if (!session) return;
  const caseId = typeof request.body?.caseId === 'string' ? request.body.caseId : '';
  const type = typeof request.body?.type === 'string' ? request.body.type : '';
  const role = session.role;
  if (!caseId || !type) return jsonError(response, 400, 'caseId and type are required.', id);
  const record = await appendCaseEvent(caseId, { role, type, payload: request.body?.payload });
  return record ? response.status(200).json(record) : jsonError(response, 404, 'Case not found.', id);
}
