import type { NextApiRequest, NextApiResponse } from 'next';
import { readSession } from '../../../lib/auth';

export default function handler(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== 'GET') return response.status(405).json({ authenticated: false, error: 'GET required.' });
  const session = readSession(request);
  if (!session) return response.status(401).json({ authenticated: false });
  return response.status(200).json({ authenticated: true, subject: session.subject, role: session.role, expiresAt: session.expiresAt });
}
