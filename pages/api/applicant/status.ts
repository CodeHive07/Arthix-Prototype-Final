import type { NextApiRequest, NextApiResponse } from 'next';
import { requireSession } from '../../../lib/auth';
import { requestId, secureApi } from '../../../lib/api-security';

export default function handler(request: NextApiRequest, response: NextApiResponse) {
  const id = requestId(request);
  secureApi(response, id);
  if (request.method !== 'GET') return response.status(405).json({ error: 'GET required.', requestId: id });
  const session = requireSession(request, response, ['Applicant']);
  if (!session) return;
  return response.status(200).json({ authenticated: true, scope: 'applicant', subject: session.subject, role: session.role, requestId: id });
}
