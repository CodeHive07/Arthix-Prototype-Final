import type { NextApiRequest, NextApiResponse } from 'next';
import { oidcConfigured, oidcDiscovery, oidcPkce, oidcTransactionCookie } from '../../../lib/auth';

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'GET required.' });
  if (!oidcConfigured()) return response.status(503).json({ error: 'Applicant sign-in is not configured.' });
  try {
    const discovery = await oidcDiscovery();
    const { verifier, challenge, state, nonce } = oidcPkce();
    const url = new URL(discovery.authorization_endpoint);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', process.env.OIDC_CLIENT_ID || '');
    url.searchParams.set('redirect_uri', process.env.OIDC_REDIRECT_URI || `${process.env.APP_URL}/api/auth/callback`);
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('nonce', nonce);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    response.setHeader('Set-Cookie', oidcTransactionCookie(state, verifier, nonce));
    return response.redirect(url.toString());
  } catch (error) {
    return response.status(502).json({ error: error instanceof Error ? error.message : 'Unable to start sign-in.' });
  }
}
