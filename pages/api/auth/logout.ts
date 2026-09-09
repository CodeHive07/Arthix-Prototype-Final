import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'POST required.' });
  response.setHeader('Set-Cookie', 'arthix_session=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0');
  return response.status(204).end();
}
