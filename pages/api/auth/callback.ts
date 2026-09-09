import type { NextApiRequest, NextApiResponse } from 'next';
import { clearOidcTransactionCookie, exchangeOidcCode, oidcConfigured, oidcDiscovery, readOidcTransaction, sessionCookie } from '../../../lib/auth';

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'GET required.' });
  const transaction = readOidcTransaction(request);
  const state = typeof request.query.state === 'string' ? request.query.state : '';
  const code = typeof request.query.code === 'string' ? request.query.code : '';
  if (!oidcConfigured() || !transaction || !state || state !== transaction.state || !code) return response.status(400).json({ error: 'Invalid or expired sign-in transaction.' });
  try {
    const identity = await exchangeOidcCode(await oidcDiscovery(), code, transaction.verifier, transaction.nonce);
    if (!identity.subject) return response.status(400).json({ error: 'The identity provider did not return a subject.' });
    response.setHeader('Set-Cookie', [sessionCookie({ subject: identity.subject, role: 'Applicant', expiresAt: Date.now() + 8 * 60 * 60 * 1000 }), clearOidcTransactionCookie()]);
    return response.redirect('/dashboard');
  } catch (error) {
    response.setHeader('Set-Cookie', clearOidcTransactionCookie());
    return response.status(502).json({ error: error instanceof Error ? error.message : 'Sign-in verification failed.' });
  }
}
