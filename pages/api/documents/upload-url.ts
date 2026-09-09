import type { NextApiRequest, NextApiResponse } from 'next';
import { requireSession } from '../../../lib/auth';
import { createUploadUrl, validateUpload } from '../../../lib/object-storage';
import { bodyTooLarge, jsonError, requestId, secureApi } from '../../../lib/api-security';

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  const id = requestId(request); secureApi(response, id);
  if (request.method !== 'POST') return jsonError(response, 405, 'POST required', id);
  if (bodyTooLarge(request, 32_000)) return jsonError(response, 413, 'Request body is too large.', id);
  if (!requireSession(request, response, ['Applicant'])) return;
  const { caseId, filename, contentType, size } = request.body || {};
  const validationError = validateUpload({ filename, contentType, size });
  if (!caseId || typeof caseId !== 'string') return jsonError(response, 400, 'caseId is required.', id);
  if (validationError) return jsonError(response, 400, validationError, id);
  const upload = await createUploadUrl(caseId, filename, contentType, size);
  if (!upload) return jsonError(response, 503, 'Private object storage is not configured.', id);
  return response.status(200).json({ ...upload, expiresIn: 300 });
}
